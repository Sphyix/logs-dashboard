# Logs Dashboard

A log management system with real-time analytics. Think of it as a central place to collect, search, and analyze logs from your applications.

## What it does

Built this as a full-stack app for managing log entries. You can browse logs, search through them, filter by severity/source/date, and see analytics dashboards with charts showing trends and distributions. There's also real-time updates via SSE so you don't have to keep refreshing.

Authentication is pretty straightforward - logged-in users can create/edit/delete logs, while guests can view everything but can't modify anything.

## Stack

**Backend:**
- FastAPI for the API (chose it for the auto-generated docs and speed)
- PostgreSQL with the pg_trgm extension for fuzzy text search
- SQLAlchemy 2.0 as ORM
- JWT tokens for auth

**Frontend:**
- React 18
- Material-UI for components
- TanStack Query for data fetching
- Chart.js for the graphs
- Axios for API calls

**Deployment:**
- Docker Compose setup included
- Nginx serves the frontend
- Uvicorn runs the backend

## Quick start

Easiest way is Docker:

```bash
# Clone and start everything
git clone <repository-url>
cd logs-dashboard
docker compose up -d
```

Then visit:
- http://localhost - main app
- http://localhost:8000/docs - API documentation

Default login: `admin@example.com` / `password123`

The seed script creates 100000 sample logs spanning 5 days so you have data to play with. There's also a continuous logger service running in Docker that adds a new log every few seconds to simulate a real environment.
When using the continuous logger, logs that are older than 7 days will be deleted.

The seeding and continuous logger tools are managed by the entrypoint.sh file, they can be disabled from there.

## Development setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit .env file
cp .env.example .env

# Initialize database and add sample data
python seed.py

# Run dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

## Features

**Log Management:**
- Full CRUD on log entries
- Search with PostgreSQL fuzzy matching
- Filter by severity, source, date range
- Pagination (50 per page by default, max 100)

**Analytics Dashboard:**
- Live stats (total logs, error count, warning count)
- Line chart showing log volume over time
- Bar/pie charts for severity distribution
- All the charts update in real-time via Server-Sent Events

**Auth & Permissions:**
- Register/login with JWT tokens (7 day expiry)
- Authenticated users: full access
- Guests: read-only (can browse and see analytics but can't modify)

**Real-time Updates:**
- SSE endpoints for live log counts and analytics
- Configurable update interval (1-60 seconds)
- Auto-reconnection if connection drops

## API overview

All endpoints are under `/api`. Full docs at http://localhost:8000/docs

**Auth:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Get current user info (requires auth)

**Logs:**
- `GET /api/logs` - List with filtering/pagination (public)
- `GET /api/logs/{id}` - Single log (public)
- `POST /api/logs` - Create (requires auth)
- `PUT /api/logs/{id}` - Update (requires auth)
- `DELETE /api/logs/{id}` - Delete (requires auth)

**Analytics:**
- `GET /api/analytics/aggregated` - Total/error/warning counts (public)
- `GET /api/analytics/trend` - Time-series data (public)
- `GET /api/analytics/distribution` - Severity breakdown (public)

**SSE (Real-time):**
- `GET /api/sse/logs/count` - Live log count updates
- `GET /api/sse/analytics/aggregated` - Live aggregated stats
- `GET /api/sse/analytics/trend` - Live trend data
- `GET /api/sse/analytics/distribution` - Live distribution data

All SSE endpoints take an `interval` param (seconds) plus the usual filters.

### Query params for logs

- `severity` - Filter by severity level
- `source` - Filter by log source
- `start_date`, `end_date` - Date range (ISO 8601)
- `search` - Full-text search in messages
- `sort_by` - timestamp/severity/source
- `sort_order` - asc/desc
- `page`, `page_size` - Pagination

## Database

**Users:**
- UUID primary key
- Email (unique, indexed)
- Name (optional)
- Bcrypt hashed password

**Logs:**
- UUID primary key
- Timestamp (indexed)
- Message (text, GIN indexed for full-text search)
- Severity enum: DEBUG/INFO/WARNING/ERROR/CRITICAL (indexed)
- Source string (indexed)

The pg_trgm extension handles fuzzy matching so searches like "databse" will still find "database".

## Docker notes

```bash
# Start everything
docker compose up -d

# Start everything and rebuild
docker compose up -d --build

# Stop and clean up data
docker compose down -v

```

Ports: 80 (frontend), 8000 (backend), 5432 (postgres). If you need to change them, edit the `docker-compose.yml`.

## Some design choices

- Went with FastAPI because the auto-generated OpenAPI docs are super useful, and it's fast
- PostgreSQL pg_trgm extension for full-text search - works well and doesn't need Elasticsearch
- Kept RBAC simple (authenticated vs guest) since complex permissions weren't needed
- SSE instead of WebSockets for real-time updates - simpler to implement and data is needed only one way
- TanStack Query on frontend handles all the caching/refetching logic so components stay simple
- Material-UI gave us a decent looking UI without much custom CSS

## Future ideas

Some features that could be added:

- **Settings page**: Admin panel to enable/disable new registrations, manage users, configure retention policies
- **API tokens**: Generate tokens for different apps/services to send logs programmatically instead of using user credentials
- **Client SDKs**: Code examples and lightweight libraries for Python/Node/etc. to simplify sending logs to the API
- **Multi-tenant support**: Separate logs per application with filtering, so you can run this for multiple projects and keep their logs isolated
- **Scale optimizations**: Table partitioning, log archiving, and query optimizations for handling 250k+ logs efficiently

Other potential additions: email alerts for critical errors, webhook integrations, retention policies with auto-cleanup, anomaly detection.

## Troubleshooting

**Port conflicts:**
Edit `docker-compose.yml` and change the port mappings if 80/8000/5432 are taken.

**Database issues:**
```bash
docker compose logs postgres  # Check what's happening
docker compose down -v         # Nuclear option - wipes data
docker compose up -d
```

**Frontend not loading:**
```bash
docker compose build frontend
docker compose restart frontend
```

**Full-text search slow:**
Make sure the pg_trgm extension is installed if using an external database.
When using the included Docker script, it is handled automatically via the postgres-setup service.

## Environment variables

Backend needs a `.env` file (see `.env.example`):
Frontend uses `VITE_API_URL` but defaults to `/api` 

---

MIT License. Feel free to use this however you want.
