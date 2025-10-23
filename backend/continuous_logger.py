"""
Continuous log generator
Generates new logs every 1-5 seconds and cleans up old logs hourly
"""
import random
import time
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal
from app.models.log import Log, SeverityEnum

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


def generate_single_log(db):
    """Generate a single log entry with current timestamp"""
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

    # Create log entry with current timestamp
    log = Log(
        timestamp=datetime.now(timezone.utc),
        message=message,
        severity=severity,
        source=source
    )
    db.add(log)
    db.commit()


def clear_old_logs(db, days=7):
    """Clear logs older than specified days"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    deleted = db.query(Log).filter(Log.timestamp < cutoff_date).delete()
    db.commit()
    if deleted > 0:
        print(f"Cleared {deleted} logs older than {days} days.")


if __name__ == "__main__":
    db = SessionLocal()
    last_cleared = time.time()

    print("=== Starting continuous log generation ===")
    print("New log every 1-5 seconds, cleanup every hour")

    try:
        while True:
            try:
                generate_single_log(db)
                time.sleep(random.randint(1, 5))

                # Cleanup old logs every hour
                if time.time() - last_cleared >= 3600:
                    clear_old_logs(db, days=7)
                    last_cleared = time.time()
            except Exception as e:
                print(f"Error generating log: {e}")
                db.rollback()
                time.sleep(1)  # Brief pause before retrying
    except KeyboardInterrupt:
        print("\n=== Stopping continuous log generation ===")
    finally:
        db.close()
