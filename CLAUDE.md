# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack log management dashboard with real-time analytics. FastAPI backend with PostgreSQL, React/TypeScript frontend with Material-UI. Features JWT authentication with simple RBAC (authenticated users get full CRUD, guests get read-only), full-text search using PostgreSQL pg_trgm, and interactive data visualizations with Chart.js.

## Development Commands

### Backend (FastAPI/Python)

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Development
uvicorn app.main:app --reload --port 8000

# Database
alembic upgrade head              # Run migrations
alembic revision --autogenerate -m "description"  # Create migration
python seed.py                    # Seed database with sample data

# Testing
pytest                            # Run all tests
pytest -v                         # Verbose
pytest --cov=app                  # With coverage
pytest tests/test_specific.py     # Run specific test file
```

### Frontend (React/TypeScript)

```bash
cd frontend

# Setup
npm install

# Development
npm run dev                       # Dev server (http://localhost:5173)
npm run build                     # Production build
npm run preview                   # Preview production build
npm run lint                      # Run ESLint
```

### Docker

```bash
# Full stack
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes/data
docker-compose logs -f [service]  # View logs
docker-compose build [service]    # Rebuild specific service

# Individual services
docker-compose up -d postgres     # Start only database
docker-compose restart backend    # Restart backend
```

## Architecture

### Backend Structure

- **API Layer** (`app/api/`): FastAPI routers for auth, logs, analytics endpoints
- **Core** (`app/core/`): Configuration (pydantic-settings), JWT security (python-jose), FastAPI dependencies
- **Models** (`app/models/`): SQLAlchemy 2.0 ORM models (User, Log with SeverityEnum)
- **Schemas** (`app/schemas/`): Pydantic v2 request/response validation models
- **CRUD** (`app/crud/`): Database operations abstraction layer
- **Database** (`app/database.py`): SQLAlchemy engine, SessionLocal factory, `init_db()` function

The backend follows a layered architecture: API routes → dependencies/auth → CRUD operations → SQLAlchemy models → PostgreSQL. All database operations go through CRUD functions, never direct model manipulation in routes.

**Database Initialization**: The `init_db()` function in `app/database.py` creates all tables using SQLAlchemy metadata. This is called by the seed script and can be used for testing. The Docker setup includes a `postgres-setup` service that automatically installs the pg_trgm extension via `backend/db/setup/setup.sql` before the backend starts.

### Frontend Structure

- **Pages** (`src/pages/`): Top-level route components (Login, Register, LogList, LogDetail, LogCreate, Dashboard)
- **Components** (`src/components/`): Shared components (Layout with navigation)
- **Context** (`src/context/`): React Context for global state (AuthContext for user/token)
- **Services** (`src/services/api.ts`): Axios API client with interceptors for JWT tokens
- **Types** (`src/types/`): TypeScript interfaces matching backend Pydantic schemas

Uses TanStack Query for data fetching with automatic caching and invalidation. Auth token stored in localStorage and added to requests via axios interceptor.

### Authentication & Authorization

- **JWT-based**: Token expires in 7 days (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- **RBAC Model**:
  - **Authenticated users**: Full CRUD on logs (require_user dependency)
  - **Guest users**: Read-only access to logs and analytics (no auth required)
- **Protected Routes**: POST/PUT/DELETE operations require authentication
- **Public Routes**: GET logs, analytics, export CSV available to all users

Implementation: `get_current_user` dependency validates JWT token, `require_user` dependency enforces authentication requirement. Routes use `Depends(require_user)` for protected operations.

### Database Design

**Logs Table**:
- Indexed on: `timestamp`, `severity`, `source`
- Full-text search index on `message` using PostgreSQL GIN index with pg_trgm extension
- UUIDs for primary keys (not auto-incrementing integers)

**Users Table**:
- Passwords hashed with bcrypt via passlib
- Email unique and indexed
- UUIDs for primary keys

**Key Patterns**:
- All models have `created_at` and `updated_at` timestamps
- Use SQLAlchemy 2.0 style (not legacy 1.x patterns)
- Alembic migrations for schema changes (never modify models without creating migration)

### API Patterns

**Filtering & Pagination**:
- All list endpoints use `LogFilter` schema for consistent query parameters
- Pagination: `page` (1-indexed), `page_size` (max 100)
- Full-text search: `search` parameter uses PostgreSQL `ILIKE` with trigram similarity
- Date filtering: `start_date`, `end_date` (ISO 8601 format)
- CSV export: Same filter params, max 10k records

**Analytics Endpoints**:
- `/analytics/aggregated`: Total counts, error counts, warning counts
- `/analytics/trend`: Time-series data for line charts
- `/analytics/distribution`: Severity distribution for bar/pie charts
- All accept filter parameters (severity, source, date range) but not pagination params

## Key Implementation Details

### Backend Dependencies

The `app/core/dependencies.py` file contains critical FastAPI dependencies:
- `get_db()`: Database session management with proper cleanup
- `get_current_user(token)`: Validates JWT, returns User or raises 401
- `require_user()`: Enforces authentication (raises 401 if not authenticated)

### Frontend API Client

`src/services/api.ts` exports three API modules:
- `authAPI`: register, login, me
- `logsAPI`: getList, getById, create, update, delete, exportCSV
- `analyticsAPI`: getAggregated, getTrend, getDistribution

The axios instance automatically adds `Bearer {token}` header from localStorage.

### Full-Text Search

Logs support fuzzy full-text search via PostgreSQL pg_trgm extension. The `idx_log_message_gin` index must exist for performance. Search is case-insensitive and matches partial words.

### Seeding & Test Data

`backend/seed.py` creates:
- Admin user: admin@example.com / password123
- 1000 sample logs spanning 30 days with realistic messages
- Weighted severity distribution (40% INFO, 30% WARNING, 15% ERROR, etc.)

The seed script calls `init_db()` from `app.database` to ensure tables exist before seeding. Run after migrations: `alembic upgrade head && python seed.py`. In Docker, this runs automatically via `entrypoint.sh`.

## Environment Configuration

Backend requires `.env` file (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key (change in production!)
- `BACKEND_CORS_ORIGINS`: JSON array of allowed origins

Frontend uses Vite environment variables:
- `VITE_API_URL`: Backend API URL (defaults to `/api` for reverse proxy setup)

Docker Compose sets these automatically for containerized deployment.

## Testing Guidelines

Backend tests should:
- Use pytest fixtures for test database and client
- Test both authenticated and unauthenticated scenarios
- Verify RBAC behavior (guests cannot POST/PUT/DELETE)
- Test filter combinations and edge cases
- Use `httpx.AsyncClient` for async FastAPI testing

Frontend (when adding tests):
- Test components with React Testing Library
- Mock TanStack Query hooks
- Test auth flows and protected route behavior

## Common Patterns

### Adding a New API Endpoint

1. Create Pydantic schema in `app/schemas/`
2. Add CRUD function in `app/crud/` (use existing session patterns)
3. Add route in appropriate `app/api/` router file
4. Use `Depends(require_user)` if authentication needed
5. Update frontend `services/api.ts` with new API function
6. Add TypeScript type in `frontend/src/types/`

### Database Schema Changes

1. Modify SQLAlchemy model in `app/models/`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration in `backend/alembic/versions/`
4. Apply migration: `alembic upgrade head`
5. Update seed script if needed

Never skip migrations - docker-compose automatically runs them via `entrypoint.sh`.

### Adding Authentication to a Route

Change from:
```python
@router.get("/endpoint")
def endpoint(db: Session = Depends(get_db)):
```

To:
```python
@router.get("/endpoint")
def endpoint(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
```

The `current_user` parameter provides access to the authenticated user object.

## Troubleshooting

**Database connection issues**: Ensure PostgreSQL is running and DATABASE_URL is correct. Docker users: wait for healthcheck to pass before backend starts.

**Frontend can't reach backend**: Check CORS settings in `backend/.env`. Development: frontend runs on :5173, backend on :8000. Add both to BACKEND_CORS_ORIGINS.

**Alembic migrations fail**: Check `alembic.ini` has correct database URL (or use DATABASE_URL env var). Ensure models are imported in `alembic/env.py`.

**Full-text search slow**: Verify pg_trgm extension is installed and GIN index exists on logs.message. Docker setup automatically installs the extension via the `postgres-setup` service. For local development, manually run: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

**JWT token expired**: Tokens last 7 days by default. Clear localStorage and re-login, or adjust ACCESS_TOKEN_EXPIRE_MINUTES.
