#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h postgres -p 5432 > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

echo "Running database migrations..."
alembic upgrade head

echo "Seeding database..."
python seed.py || echo "Database already seeded or seeding failed (continuing...)"

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
