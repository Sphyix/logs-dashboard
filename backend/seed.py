"""
Database seeding script
Generates sample log data for testing and development
"""
import random
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, init_db
from app.models.log import Log, SeverityEnum
from app.models.user import User
from app.core.security import get_password_hash

# Sample log messages by severity
LOG_MESSAGES = {
    SeverityEnum.DEBUG: [
        "Database connection pool initialized",
        "Cache hit for key: user_session_123",
        "Starting background job processor",
        "Request processing time: 45ms",
        "Memory usage: 256MB",
    ],
    SeverityEnum.INFO: [
        "User logged in successfully",
        "New record created in database",
        "API request completed successfully",
        "File uploaded: document.pdf",
        "Email sent to user@example.com",
        "Background task completed",
        "Configuration loaded from file",
    ],
    SeverityEnum.WARNING: [
        "High memory usage detected: 85%",
        "Slow query detected: 2.5s",
        "API rate limit approaching",
        "Deprecated function called",
        "Cache miss rate high: 45%",
        "Connection pool near capacity",
    ],
    SeverityEnum.ERROR: [
        "Failed to connect to external API",
        "Database query timeout",
        "File not found: config.yml",
        "Invalid input received from user",
        "Payment processing failed",
        "Failed to send notification email",
        "Authentication failed for user",
    ],
    SeverityEnum.CRITICAL: [
        "Database connection lost",
        "Disk space critically low: 95% full",
        "Service crashed and restarted",
        "Security breach detected",
        "Data corruption detected in table users",
        "System out of memory",
    ],
}

# Sample sources
SOURCES = [
    "web-server",
    "api-gateway",
    "database",
    "auth-service",
    "payment-service",
    "email-service",
    "background-worker",
    "cache-service",
]

def check_sample_user(db):
    """Check if sample user exists"""
    return db.query(User).filter(User.email == "admin@example.com").first() is not None


def create_sample_user(db):
    """Create a sample user for testing"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == "admin@example.com").first()
    if existing_user:
        print("Sample user already exists")
        return existing_user

    user = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password=get_password_hash("password123")
    )
    db.add(user)
    db.commit()
    print(f"Created user: {user.email}")
    return user


def generate_logs(db, count=100000, days=5):
    """Generate historical log entries spread over specified days"""
    print(f"Generating {count} log entries over the last {days} days...")

    logs_created = 0
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    for _ in range(count):
        # Random timestamp within the date range
        random_seconds = random.randint(0, int((end_date - start_date).total_seconds()))
        timestamp = start_date + timedelta(seconds=random_seconds)

        # Random severity with weighted probabilities
        severity = random.choices(
            list(SeverityEnum),
            weights=[10, 40, 20, 10, 5],  # DEBUG, INFO, WARNING, ERROR, CRITICAL
            k=1
        )[0]

        # Random message for the severity
        message = random.choice(LOG_MESSAGES[severity])

        # Random source
        source = random.choice(SOURCES)

        # Create log entry
        log = Log(
            timestamp=timestamp,
            message=message,
            severity=severity,
            source=source
        )
        db.add(log)
        logs_created += 1

        # Commit in batches of 100 for performance
        if logs_created % 100 == 0:
            db.commit()
            print(f"Created {logs_created}/{count} logs...")

    # Final commit
    db.commit()
    print(f"Successfully created {logs_created} log entries!")


def seed_database():
    """Main seeding function"""
    db = SessionLocal()

    if check_sample_user(db):
        print("Database already seeded. Exiting.")
        db.close()
        return
    
    try:
        print("=== Starting Database Seeding ===")
        init_db()

        # Create sample user
        create_sample_user(db)

        # Generate sample logs
        generate_logs(db, count=100000, days=5)

        print("=== Database Seeding Completed Successfully ===")
        print("\nSample credentials:")
        print("  Email: admin@example.com")
        print("  Password: password123")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
