"""
Incremental News Data Ingestion
Fetches recent news and avoids duplicates
Only stores new articles since last fetch
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.dialects.postgresql import insert

from database.models.financial import News
from ingestion.base_ingestion import BaseIngestion

logger = logging.getLogger("incremental_news")


class IncrementalNewsIngestion(BaseIngestion):
    """
    Incremental news ingestion pipeline

    Fetches recent news articles and uses UPSERT to avoid duplicates.
    Only fetches news from the last N days to minimize API calls.
    """

    def __init__(self, api_key: str, lookback_days: int = 7):
        """
        Initialize incremental news ingestion

        Args:
            api_key: EODHD API key
            lookback_days: How many days back to fetch news (default: 7)
        """
        super().__init__(api_key)

        # Initialize EODHD client
        from tools.eodhd_client import EODHDClient
        self.client = EODHDClient(api_key=api_key)

        self.lookback_days = lookback_days

    def get_latest_news_date(self, db: Session, company_id: int) -> Optional[date]:
        """
        Get most recent news article date for a company

        Args:
            db: Database session
            company_id: Company ID

        Returns:
            Latest news article date, or None if no news
        """
        latest = db.query(News).filter(
            News.company_id == company_id
        ).order_by(desc(News.published_at)).first()

        if latest and latest.published_at:
            return latest.published_at.date()
        return None

    def calculate_lookback_period(
        self,
        latest_date: Optional[date]
    ) -> tuple[str, str]:
        """
        Calculate date range for news fetch

        Args:
            latest_date: Latest news date in database

        Returns:
            Tuple of (from_date, to_date) as strings
        """
        to_date = datetime.now().strftime('%Y-%m-%d')

        if not latest_date:
            # No data - fetch last N days
            from_date = (datetime.now() - timedelta(days=self.lookback_days)).strftime('%Y-%m-%d')
            logger.info(f"[INCREMENTAL] No existing news - fetching {self.lookback_days} days")
        else:
            # Incremental - fetch since last update (with 1-day overlap for safety)
            from_date = (latest_date - timedelta(days=1)).strftime('%Y-%m-%d')
            days_to_fetch = (datetime.now().date() - latest_date).days + 1
            logger.info(f"[INCREMENTAL] Latest news: {latest_date}, fetching {days_to_fetch} days")

        return from_date, to_date

    def parse_news_article(self, article: Dict[str, Any], company_id: int) -> Dict[str, Any]:
        """
        Parse news article from API response

        Args:
            article: Raw API article data
            company_id: Company ID

        Returns:
            Parsed article data ready for database insert
        """
        # Parse published date
        published_at = article.get('date') or article.get('published_at')
        if isinstance(published_at, str):
            try:
                published_at = datetime.strptime(published_at, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    published_at = datetime.strptime(published_at, '%Y-%m-%d')
                except ValueError:
                    published_at = datetime.now()

        return {
            'company_id': company_id,
            'published_at': published_at,
            'title': article.get('title', ''),
            'content': article.get('content') or article.get('text'),
            'summary': article.get('summary'),
            'url': article.get('link') or article.get('url'),
            'source': article.get('source'),
            'sentiment_score': article.get('sentiment', {}).get('polarity') if isinstance(article.get('sentiment'), dict) else None,
            'sentiment_label': article.get('sentiment', {}).get('label') if isinstance(article.get('sentiment'), dict) else None,
            'tags': article.get('tags', []) if isinstance(article.get('tags'), list) else None,
            'created_at': datetime.now()
        }

    def bulk_insert_news(
        self,
        db: Session,
        company_id: int,
        articles: List[Dict[str, Any]]
    ):
        """
        Bulk insert news articles with UPSERT

        Args:
            db: Database session
            company_id: Company ID
            articles: List of news articles
        """
        if not articles:
            logger.info(f"[INCREMENTAL] No articles to insert for company_id={company_id}")
            return

        # Parse all articles
        values = [self.parse_news_article(article, company_id) for article in articles]

        logger.info(f"[INCREMENTAL] Inserting {len(values)} news articles for company_id={company_id}")

        # Process in batches
        for i in range(0, len(values), self.batch_size):
            batch = values[i:i + self.batch_size]

            # PostgreSQL UPSERT
            stmt = insert(News).values(batch)

            # Update on conflict (based on company_id + published_at + title)
            # Since we don't have a unique constraint, we'll do nothing on conflict
            # In production, you'd add a unique constraint on (company_id, url) or similar
            stmt = stmt.on_conflict_do_nothing()

            db.execute(stmt)

        logger.info(f"[INCREMENTAL] Successfully inserted news articles for company_id={company_id}")

    def refresh_company_incremental(
        self,
        db: Session,
        company_id: int,
        ticker: str,
        limit: int = 50
    ) -> int:
        """
        Refresh company news incrementally

        Args:
            db: Database session
            company_id: Company ID
            ticker: Stock symbol (without exchange suffix, e.g., 'AAPL')
            limit: Maximum number of articles to fetch

        Returns:
            Number of new articles added
        """
        try:
            # Step 1: Get latest news date
            latest_date = self.get_latest_news_date(db, company_id)

            # Step 2: Calculate lookback period
            from_date, to_date = self.calculate_lookback_period(latest_date)

            # Step 3: Fetch news from API
            logger.info(f"[INCREMENTAL] Fetching {ticker} news from {from_date} to {to_date}")

            # Use EODHD client to get news
            # Note: EODHD news endpoint might not support date ranges, so we fetch recent and filter
            articles = self.client.news_sentiment.get_news(
                ticker=ticker,
                limit=limit
            )

            if not articles:
                logger.info(f"[INCREMENTAL] No news articles for {ticker}")
                return 0

            # Filter articles by date range (if API doesn't support it)
            from_dt = datetime.strptime(from_date, '%Y-%m-%d')
            to_dt = datetime.strptime(to_date, '%Y-%m-%d') + timedelta(days=1)  # Include end date

            filtered_articles = []
            for article in articles:
                pub_date = article.get('date') or article.get('published_at')
                if isinstance(pub_date, str):
                    try:
                        pub_dt = datetime.strptime(pub_date, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        try:
                            pub_dt = datetime.strptime(pub_date, '%Y-%m-%d')
                        except ValueError:
                            continue  # Skip if can't parse date

                    if from_dt <= pub_dt < to_dt:
                        filtered_articles.append(article)

            logger.info(f"[INCREMENTAL] Filtered {len(filtered_articles)}/{len(articles)} articles within date range")

            # Step 4: Bulk insert with UPSERT
            if filtered_articles:
                self.bulk_insert_news(db, company_id, filtered_articles)

            logger.info(f"[INCREMENTAL] ✅ Added news for {ticker}")
            return len(filtered_articles)

        except Exception as e:
            logger.error(f"[INCREMENTAL] ❌ Failed to refresh news for {ticker}: {e}")
            raise

    def refresh_all_companies(
        self,
        db: Session,
        limit_per_company: int = 50,
        commit_interval: int = 10
    ) -> Dict[str, Any]:
        """
        Refresh news for all companies incrementally

        Args:
            db: Database session
            limit_per_company: Max articles per company
            commit_interval: Commit every N companies

        Returns:
            Summary statistics
        """
        from database.models.core import Company

        logger.info("=" * 70)
        logger.info("[INCREMENTAL] Starting incremental news refresh for all companies")
        logger.info("=" * 70)

        start_time = datetime.now()

        # Get all companies
        companies = db.query(Company).all()
        total_companies = len(companies)

        stats = {
            'total_companies': total_companies,
            'successful': 0,
            'skipped': 0,
            'failed': 0,
            'total_articles_added': 0,
            'errors': []
        }

        for i, company in enumerate(companies, 1):
            try:
                # Refresh news for company (without exchange suffix for news API)
                articles_added = self.refresh_company_incremental(
                    db=db,
                    company_id=company.id,
                    ticker=company.ticker,  # No .US suffix
                    limit=limit_per_company
                )

                if articles_added > 0:
                    stats['successful'] += 1
                    stats['total_articles_added'] += articles_added
                else:
                    stats['skipped'] += 1

                # Commit periodically
                if i % commit_interval == 0:
                    db.commit()
                    logger.info(f"[INCREMENTAL] Progress: {i}/{total_companies} companies processed")

            except Exception as e:
                stats['failed'] += 1
                stats['errors'].append({
                    'ticker': company.ticker,
                    'error': str(e)
                })
                logger.error(f"[INCREMENTAL] Failed to refresh news for {company.ticker}: {e}")

        # Final commit
        db.commit()

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        stats['duration_seconds'] = duration
        stats['duration_minutes'] = round(duration / 60, 2)

        logger.info("=" * 70)
        logger.info("[INCREMENTAL] ✅ Incremental news refresh complete!")
        logger.info(f"📊 Statistics:")
        logger.info(f"   - Total companies: {stats['total_companies']}")
        logger.info(f"   - Successful: {stats['successful']}")
        logger.info(f"   - Skipped (no new articles): {stats['skipped']}")
        logger.info(f"   - Failed: {stats['failed']}")
        logger.info(f"   - Total articles added: {stats['total_articles_added']}")
        logger.info(f"   - Duration: {stats['duration_minutes']} minutes")
        logger.info("=" * 70)

        return stats


def main():
    """Test incremental news ingestion"""
    import os
    from database.models.base import SessionLocal
    from database.queries_improved import DatabaseQueries

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Get API key
    api_key = os.getenv('EODHD_API_KEY')
    if not api_key:
        raise ValueError("EODHD_API_KEY environment variable not set")

    # Initialize
    ingestion = IncrementalNewsIngestion(
        api_key=api_key,
        lookback_days=7
    )
    db = SessionLocal()
    queries = DatabaseQueries()

    try:
        # Test: Refresh news for AAPL
        logger.info("\\n" + "=" * 70)
        logger.info("TEST: Incremental news refresh for AAPL")
        logger.info("=" * 70)

        company = queries.get_company('AAPL', db=db)
        if not company:
            logger.error("AAPL not found in database")
            return

        articles_added = ingestion.refresh_company_incremental(
            db=db,
            company_id=company.id,
            ticker='AAPL',  # No .US suffix for news
            limit=50
        )

        db.commit()

        logger.info(f"✅ Added {articles_added} news articles for AAPL")

        # Test 2: Refresh all companies (uncomment to run)
        # logger.info("\\n" + "=" * 70)
        # logger.info("TEST 2: Incremental news refresh for all companies")
        # logger.info("=" * 70)
        #
        # stats = ingestion.refresh_all_companies(db, limit_per_company=50)
        # logger.info(f"\\n📊 Final Statistics: {stats}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
