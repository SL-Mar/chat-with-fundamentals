#!/usr/bin/env python3
"""
Database Management CLI

Usage:
    python manage_db.py init              # Initialize database with schema
    python manage_db.py test              # Test database connections
    python manage_db.py seed              # Seed initial data
    python manage_db.py reset             # Drop and recreate all tables (DANGER!)
    python manage_db.py health            # Check database health
"""

import sys
import logging
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.config import (
    check_database_health,
    initialize_database,
    test_database_connection,
    test_redis_connection,
    test_timescaledb_extension
)
from database.models.base import Base, engine, drop_db
from database.models.company import Exchange, Sector, Industry, Company

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def cmd_init():
    """Initialize database with schema"""
    logger.info("🚀 Initializing database...")

    if not test_database_connection():
        logger.error("❌ Cannot connect to database. Please check docker-compose is running.")
        return False

    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")

        # Check TimescaleDB
        if test_timescaledb_extension():
            logger.info("✅ TimescaleDB extension is active")
        else:
            logger.warning("⚠️  TimescaleDB extension not found - time-series features may not work")

        return True
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False


def cmd_test():
    """Test all database connections"""
    logger.info("🧪 Testing database connections...")

    results = check_database_health()

    print("\n" + "=" * 50)
    print("DATABASE HEALTH CHECK")
    print("=" * 50)

    for service, status in results.items():
        emoji = "✅" if status else "❌"
        print(f"{emoji} {service.upper()}: {'CONNECTED' if status else 'FAILED'}")

    print("=" * 50 + "\n")

    all_healthy = all(results.values())
    if all_healthy:
        logger.info("✅ All services are healthy")
    else:
        logger.error("❌ Some services are unhealthy")

    return all_healthy


def cmd_seed():
    """Seed initial data (exchanges, sectors)"""
    logger.info("🌱 Seeding initial data...")

    if not test_database_connection():
        logger.error("❌ Cannot connect to database")
        return False

    try:
        from sqlalchemy.orm import Session

        with Session(engine) as session:
            # Seed exchanges
            exchanges = [
                {'code': 'US', 'name': 'New York Stock Exchange', 'country': 'United States', 'timezone': 'America/New_York'},
                {'code': 'NASDAQ', 'name': 'NASDAQ Stock Exchange', 'country': 'United States', 'timezone': 'America/New_York'},
                {'code': 'LSE', 'name': 'London Stock Exchange', 'country': 'United Kingdom', 'timezone': 'Europe/London'},
                {'code': 'JPX', 'name': 'Japan Exchange Group', 'country': 'Japan', 'timezone': 'Asia/Tokyo'},
            ]

            for ex_data in exchanges:
                existing = session.query(Exchange).filter_by(code=ex_data['code']).first()
                if not existing:
                    exchange = Exchange(**ex_data)
                    session.add(exchange)
                    logger.info(f"  ✓ Added exchange: {ex_data['code']}")

            session.commit()
            logger.info("✅ Exchanges seeded")

            # Seed sectors
            sectors = [
                {'name': 'Technology', 'description': 'Information technology and software companies'},
                {'name': 'Healthcare', 'description': 'Healthcare and pharmaceutical companies'},
                {'name': 'Financials', 'description': 'Banks, insurance, and financial services'},
                {'name': 'Consumer Cyclical', 'description': 'Consumer discretionary goods and services'},
                {'name': 'Consumer Defensive', 'description': 'Consumer staples and non-cyclical goods'},
                {'name': 'Industrials', 'description': 'Industrial and manufacturing companies'},
                {'name': 'Energy', 'description': 'Energy production and services'},
                {'name': 'Utilities', 'description': 'Utility companies'},
                {'name': 'Real Estate', 'description': 'Real estate investment trusts and property'},
                {'name': 'Basic Materials', 'description': 'Mining, chemicals, and basic materials'},
                {'name': 'Communication Services', 'description': 'Telecommunications and media'},
            ]

            for sector_data in sectors:
                existing = session.query(Sector).filter_by(name=sector_data['name']).first()
                if not existing:
                    sector = Sector(**sector_data)
                    session.add(sector)
                    logger.info(f"  ✓ Added sector: {sector_data['name']}")

            session.commit()
            logger.info("✅ Sectors seeded")

            # Add sample company (AAPL)
            existing_aapl = session.query(Company).filter_by(ticker='AAPL.US').first()
            if not existing_aapl:
                nasdaq = session.query(Exchange).filter_by(code='NASDAQ').first()
                tech_sector = session.query(Sector).filter_by(name='Technology').first()

                aapl = Company(
                    ticker='AAPL.US',
                    name='Apple Inc.',
                    exchange_id=nasdaq.id if nasdaq else None,
                    sector_id=tech_sector.id if tech_sector else None,
                    currency='USD',
                    description='Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
                    website='https://www.apple.com',
                    is_active=True
                )
                session.add(aapl)
                session.commit()
                logger.info("  ✓ Added sample company: AAPL.US")

        logger.info("✅ Initial data seeded successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}")
        return False


def cmd_reset():
    """Drop and recreate all tables (DANGER!)"""
    logger.warning("⚠️  WARNING: This will delete ALL data in the database!")
    response = input("Type 'YES' to confirm: ")

    if response != 'YES':
        logger.info("❌ Reset cancelled")
        return False

    logger.info("🗑️  Dropping all tables...")
    try:
        drop_db()
        logger.info("✅ All tables dropped")

        logger.info("🚀 Recreating tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tables recreated")

        return True
    except Exception as e:
        logger.error(f"❌ Reset failed: {e}")
        return False


def cmd_health():
    """Check database health and show statistics"""
    logger.info("🏥 Checking database health...")

    results = check_database_health()

    print("\n" + "=" * 60)
    print("DATABASE HEALTH STATUS")
    print("=" * 60)

    for service, status in results.items():
        emoji = "✅" if status else "❌"
        status_text = "HEALTHY" if status else "UNHEALTHY"
        print(f"{emoji} {service.upper():<20} {status_text}")

    print("=" * 60)

    # Show table counts if database is healthy
    if results.get('database'):
        try:
            from sqlalchemy.orm import Session
            with Session(engine) as session:
                print("\nTABLE STATISTICS:")
                print("-" * 60)

                tables = [
                    ('companies', Company),
                    ('exchanges', Exchange),
                    ('sectors', Sector),
                ]

                for table_name, model in tables:
                    count = session.query(model).count()
                    print(f"  {table_name:<20} {count:>8} records")

                print("-" * 60)
        except Exception as e:
            logger.error(f"Could not fetch statistics: {e}")

    print()
    return all(results.values())


def main():
    """Main CLI entry point"""
    commands = {
        'init': cmd_init,
        'test': cmd_test,
        'seed': cmd_seed,
        'reset': cmd_reset,
        'health': cmd_health,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        print(__doc__)
        print("\nAvailable commands:")
        for cmd in commands.keys():
            print(f"  - {cmd}")
        sys.exit(1)

    command = sys.argv[1]
    success = commands[command]()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
