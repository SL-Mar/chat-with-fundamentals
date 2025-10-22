#!/usr/bin/env python3
"""
Pre-populate Database with Company Data
Fetches S&P 500 companies and stores in database
"""

import os
import sys
import logging
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models.base import SessionLocal
from database.models.core import Exchange, Sector, Industry, Company
from tools.eodhd_client import EODHDClient
from sqlalchemy import insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("populate_companies")


class CompanyPopulator:
    """Pre-populate database with company data"""

    def __init__(self):
        self.api_key = os.getenv("EODHD_API_KEY")
        if not self.api_key:
            raise ValueError("EODHD_API_KEY environment variable not set")

        self.client = EODHDClient(api_key=self.api_key)
        self.db = SessionLocal()

    def populate_exchanges(self):
        """Populate exchanges table"""
        logger.info("=" * 70)
        logger.info("STEP 1: Populating Exchanges")
        logger.info("=" * 70)

        try:
            # Fetch exchanges from EODHD
            exchanges_data = self.client.exchange.get_exchanges()

            logger.info(f"Fetched {len(exchanges_data)} exchanges from EODHD API")

            # Filter to major US exchanges
            major_exchanges = {
                'US': 'US Stocks',
                'NYSE': 'New York Stock Exchange',
                'NASDAQ': 'NASDAQ',
                'AMEX': 'American Stock Exchange',
                'BATS': 'BATS Global Markets'
            }

            inserted = 0
            for code, name in major_exchanges.items():
                # UPSERT exchange
                stmt = pg_insert(Exchange).values(
                    code=code,
                    name=name,
                    country='USA',
                    timezone='America/New_York',
                    operating_mic=code
                ).on_conflict_do_update(
                    index_elements=['code'],
                    set_={'name': name, 'updated_at': datetime.now()}
                )

                self.db.execute(stmt)
                inserted += 1

            self.db.commit()
            logger.info(f"✅ Inserted/Updated {inserted} exchanges")

            # Show exchanges in database
            exchanges = self.db.query(Exchange).all()
            logger.info(f"📊 Total exchanges in database: {len(exchanges)}")
            for ex in exchanges[:5]:
                logger.info(f"   - {ex.code}: {ex.name}")

        except Exception as e:
            logger.error(f"❌ Failed to populate exchanges: {e}")
            self.db.rollback()
            raise

    def populate_sectors_industries(self):
        """Populate sectors and industries tables with common values"""
        logger.info("=" * 70)
        logger.info("STEP 2: Populating Sectors & Industries")
        logger.info("=" * 70)

        # GICS Sectors (11 standard sectors)
        sectors = [
            'Energy',
            'Materials',
            'Industrials',
            'Consumer Discretionary',
            'Consumer Staples',
            'Health Care',
            'Financials',
            'Information Technology',
            'Communication Services',
            'Utilities',
            'Real Estate'
        ]

        # Common industries (subset)
        industries = [
            'Oil & Gas Exploration & Production',
            'Pharmaceuticals',
            'Software - Application',
            'Software - Infrastructure',
            'Banks - Regional',
            'Credit Services',
            'Auto Manufacturers',
            'Semiconductors',
            'Consumer Electronics',
            'Retail - Apparel & Specialty',
            'Aerospace & Defense',
            'Biotechnology',
            'Internet Content & Information',
            'Insurance - Property & Casualty',
            'REITs - Residential',
            'Utilities - Regulated Electric'
        ]

        try:
            # Insert sectors
            inserted_sectors = 0
            for sector_name in sectors:
                stmt = pg_insert(Sector).values(
                    name=sector_name
                ).on_conflict_do_update(
                    index_elements=['name'],
                    set_={'updated_at': datetime.now()}
                )
                self.db.execute(stmt)
                inserted_sectors += 1

            logger.info(f"✅ Inserted/Updated {inserted_sectors} sectors")

            # Insert industries
            inserted_industries = 0
            for industry_name in industries:
                stmt = pg_insert(Industry).values(
                    name=industry_name
                ).on_conflict_do_update(
                    index_elements=['name'],
                    set_={'updated_at': datetime.now()}
                )
                self.db.execute(stmt)
                inserted_industries += 1

            self.db.commit()
            logger.info(f"✅ Inserted/Updated {inserted_industries} industries")

            # Show summary
            total_sectors = self.db.query(Sector).count()
            total_industries = self.db.query(Industry).count()
            logger.info(f"📊 Total sectors in database: {total_sectors}")
            logger.info(f"📊 Total industries in database: {total_industries}")

        except Exception as e:
            logger.error(f"❌ Failed to populate sectors/industries: {e}")
            self.db.rollback()
            raise

    def populate_sp500_companies(self):
        """Populate companies table with S&P 500 stocks"""
        logger.info("=" * 70)
        logger.info("STEP 3: Populating S&P 500 Companies")
        logger.info("=" * 70)

        try:
            # Fetch S&P 500 list from EODHD
            logger.info("Fetching S&P 500 constituents...")
            sp500_data = self.client.exchange.get_exchange_symbols('US')

            # Filter to actual stocks (exclude ETFs, funds)
            stocks = [
                s for s in sp500_data
                if s.get('Type') == 'Common Stock'
                and '.' not in s.get('Code', '')  # Exclude preferred shares
                and len(s.get('Code', '')) <= 5  # Typical stock ticker length
            ]

            logger.info(f"Found {len(stocks)} US common stocks")

            # Get default exchange, sector, industry
            us_exchange = self.db.query(Exchange).filter(Exchange.code == 'US').first()
            default_sector = self.db.query(Sector).filter(Sector.name == 'Information Technology').first()
            default_industry = self.db.query(Industry).filter(Industry.name == 'Software - Application').first()

            if not us_exchange:
                raise ValueError("US exchange not found. Run populate_exchanges first.")

            # Limit to top 100 for faster population (you can increase later)
            stocks_to_process = stocks[:100]
            logger.info(f"Processing top {len(stocks_to_process)} stocks...")

            inserted = 0
            updated = 0
            errors = 0

            for i, stock in enumerate(stocks_to_process, 1):
                ticker = stock.get('Code')
                name = stock.get('Name')

                if not ticker or not name:
                    continue

                try:
                    # Check if company already exists
                    existing = self.db.query(Company).filter(Company.ticker == ticker).first()

                    if existing:
                        # Update existing
                        existing.name = name
                        existing.updated_at = datetime.now()
                        updated += 1
                    else:
                        # Insert new
                        company = Company(
                            ticker=ticker,
                            name=name,
                            exchange_id=us_exchange.id,
                            sector_id=default_sector.id if default_sector else None,
                            industry_id=default_industry.id if default_industry else None,
                            is_active=True
                        )
                        self.db.add(company)
                        inserted += 1

                    # Commit every 10 companies
                    if i % 10 == 0:
                        self.db.commit()
                        logger.info(f"   Progress: {i}/{len(stocks_to_process)} processed...")

                except Exception as e:
                    logger.warning(f"   ⚠️  Error processing {ticker}: {e}")
                    errors += 1
                    self.db.rollback()
                    continue

            # Final commit
            self.db.commit()

            logger.info("=" * 70)
            logger.info("✅ RESULTS:")
            logger.info(f"   Inserted: {inserted} new companies")
            logger.info(f"   Updated: {updated} existing companies")
            logger.info(f"   Errors: {errors} companies failed")
            logger.info("=" * 70)

            # Show sample companies
            total_companies = self.db.query(Company).count()
            logger.info(f"📊 Total companies in database: {total_companies}")

            sample_companies = self.db.query(Company).limit(10).all()
            logger.info("📋 Sample companies:")
            for comp in sample_companies:
                logger.info(f"   {comp.ticker}: {comp.name}")

        except Exception as e:
            logger.error(f"❌ Failed to populate companies: {e}")
            self.db.rollback()
            raise

    def enrich_company_metadata(self):
        """Enrich company data with fundamentals (sector, industry, description)"""
        logger.info("=" * 70)
        logger.info("STEP 4: Enriching Company Metadata (Optional - Slow)")
        logger.info("=" * 70)

        logger.info("⚠️  This step fetches fundamentals for each company (slow)")
        logger.info("⚠️  Skip for now - can run later with: --enrich flag")
        logger.info("=" * 70)

        # TODO: Implement metadata enrichment
        # This would fetch fundamentals for each company to get:
        # - Correct sector/industry
        # - Company description
        # - Market cap, country, etc.
        #
        # Example:
        # for company in companies:
        #     fundamentals = client.fundamental.get_fundamentals(f"{company.ticker}.US")
        #     # Update company with sector, industry, etc.

    def run_all(self, enrich=False):
        """Run all population steps"""
        logger.info("\n")
        logger.info("🚀 STARTING DATABASE POPULATION")
        logger.info("=" * 70)

        start_time = datetime.now()

        try:
            # Step 1: Exchanges
            self.populate_exchanges()

            # Step 2: Sectors & Industries
            self.populate_sectors_industries()

            # Step 3: S&P 500 Companies
            self.populate_sp500_companies()

            # Step 4: Enrich metadata (optional)
            if enrich:
                self.enrich_company_metadata()

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            logger.info("\n")
            logger.info("=" * 70)
            logger.info("✅ DATABASE POPULATION COMPLETE!")
            logger.info("=" * 70)
            logger.info(f"⏱️  Total time: {duration:.2f} seconds")
            logger.info("=" * 70)

            # Final statistics
            exchanges_count = self.db.query(Exchange).count()
            sectors_count = self.db.query(Sector).count()
            industries_count = self.db.query(Industry).count()
            companies_count = self.db.query(Company).count()

            logger.info("\n📊 DATABASE STATISTICS:")
            logger.info(f"   Exchanges: {exchanges_count}")
            logger.info(f"   Sectors: {sectors_count}")
            logger.info(f"   Industries: {industries_count}")
            logger.info(f"   Companies: {companies_count}")
            logger.info("=" * 70)

        except Exception as e:
            logger.error(f"\n❌ POPULATION FAILED: {e}")
            raise
        finally:
            self.db.close()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Pre-populate database with company data")
    parser.add_argument(
        '--enrich',
        action='store_true',
        help='Enrich company metadata with fundamentals (slow)'
    )
    parser.add_argument(
        '--step',
        choices=['exchanges', 'sectors', 'companies', 'all'],
        default='all',
        help='Run specific step or all steps'
    )

    args = parser.parse_args()

    populator = CompanyPopulator()

    if args.step == 'exchanges':
        populator.populate_exchanges()
    elif args.step == 'sectors':
        populator.populate_sectors_industries()
    elif args.step == 'companies':
        populator.populate_sp500_companies()
    else:  # all
        populator.run_all(enrich=args.enrich)


if __name__ == "__main__":
    main()
