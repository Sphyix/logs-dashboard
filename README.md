# Logs Dashboard

A full-stack web application for managing and analyzing log data with real-time analytics and visualizations.

## Overview

The Logs Dashboard is a comprehensive log management system that allows users to create, read, update, and delete log entries, as well as view powerful analytics and insights through interactive charts and dashboards. The application features JWT-based authentication with simple RBAC (authenticated vs guest users), full-text search, advanced filtering, and CSV export capabilities.

## Features

### Core Features
- **Log Management (CRUD)**
  - Create, read, update, and delete log entries
  - Full-text search in log messages
  - Advanced filtering (severity, source, date range)
  - Sorting and pagination
  - CSV export with filter support

- **Analytics Dashboard**
  - Real-time statistics (total logs, errors, warnings)
  - Interactive charts:
    - Line chart: Log count trend over time
    - Bar chart: Severity distribution
    - Pie chart: Severity distribution visualization
  - Configurable time ranges and filters

- **Authentication & Authorization**
  - User registration and login (JWT-based)
  - Simple RBAC:
    - **Authenticated users**: Full CRUD access to logs
    - **Guest users**: Read-only access to logs and analytics
  - Protected routes for create/update/delete operations

### Bonus Features
- CSV export functionality
- Severity distribution histogram
- Advanced full-text search (PostgreSQL pg_trgm)
- Standalone database seeder tool
- Docker-ready with docker-compose
- Auto-generated API documentation (Swagger/OpenAPI)
- Responsive Material-UI interface

## Tech Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **SQLAlchemy 2.0** - SQL toolkit and ORM
- **PostgreSQL 15** - Relational database
- **Pydantic v2** - Data validation
- **python-jose** - JWT tokens
- **passlib** - Password hashing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Material-UI (MUI)** - Component library
- **TanStack Query** - Data fetching and caching
- **Chart.js** - Data visualization
- **React Router** - Navigation
- **Axios** - HTTP client

### DevOps
- **Docker & Docker Compose** - Containerization
- **Nginx** - Web server (frontend)
- **Uvicorn** - ASGI server (backend)

## Project Structure

```
logs-dashboard/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── logs.py        # Log CRUD endpoints
│   │   │   └── analytics.py   # Analytics endpoints
│   │   ├── core/              # Core utilities
│   │   │   ├── config.py      # Settings
│   │   │   ├── security.py    # JWT & password hashing
│   │   │   └── dependencies.py # FastAPI dependencies
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   └── log.py
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── log.py
│   │   │   └── analytics.py
│   │   ├── crud/              # Database operations
│   │   │   ├── user.py
│   │   │   └── log.py
│   │   ├── database.py        # Database connection
│   │   └── main.py            # FastAPI app
│   ├── seed.py                # Database seeding script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── LogListPage.tsx
│   │   │   ├── LogDetailPage.tsx
│   │   │   ├── LogCreatePage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── components/        # Shared components
│   │   │   └── Layout.tsx
│   │   ├── context/           # React context
│   │   │   └── AuthContext.tsx
│   │   ├── services/          # API client
│   │   │   └── api.ts
│   │   ├── types/             # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── tools/
│   └── seeder/                # Standalone log generator
│       ├── generate_logs.py
│       ├── requirements.txt
│       └── README.md
├── docker-compose.yml
└── README.md
```

## Quick Start with Docker

### Prerequisites
- Docker Desktop or Docker Engine with Docker Compose
- Git

### Setup and Run

1. **Clone the repository**
```bash
git clone <repository-url>
cd logs-dashboard
```

2. **Start the application**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- FastAPI backend (port 8000)
- React frontend (port 80)

3. **Access the application**
- Frontend: http://localhost
- API Documentation: http://localhost:8000/docs
- Alternative API Docs: http://localhost:8000/redoc

4. **Default credentials** (created by seed script)
```
Email: admin@example.com
Password: password123
```

### Stop the application
```bash
docker-compose down
```

### Stop and remove all data
```bash
docker-compose down -v
```

## Development Setup

### Backend Development

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Initialize and seed the database**
```bash
python seed.py
```

6. **Run the development server**
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Development

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

4. **Build for production**
```bash
npm run build
```

## API Documentation

The API documentation is automatically generated and available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (protected)

#### Logs
- `GET /api/logs` - List logs (public, with pagination/filtering)
- `GET /api/logs/{id}` - Get single log (public)
- `POST /api/logs` - Create log (protected)
- `PUT /api/logs/{id}` - Update log (protected)
- `DELETE /api/logs/{id}` - Delete log (protected)
- `GET /api/logs/export` - Export logs to CSV (public)

#### Analytics
- `GET /api/analytics/aggregated` - Get aggregated statistics (public)
- `GET /api/analytics/trend` - Get time-series trend data (public)
- `GET /api/analytics/distribution` - Get severity distribution (public)

### Query Parameters (Logs List)

- `severity`: Filter by severity (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `source`: Filter by source
- `start_date`: Filter logs after this date (ISO 8601)
- `end_date`: Filter logs before this date (ISO 8601)
- `search`: Full-text search in messages
- `sort_by`: Sort field (timestamp, severity, source)
- `sort_order`: Sort order (asc, desc)
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 50, max: 100)

## Database Schema

### Users Table
- `id` (UUID, PK)
- `email` (String, Unique)
- `name` (String, Optional)
- `hashed_password` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Logs Table
- `id` (UUID, PK)
- `timestamp` (DateTime, Indexed)
- `message` (Text, Full-text indexed)
- `severity` (Enum: DEBUG, INFO, WARNING, ERROR, CRITICAL, Indexed)
- `source` (String, Indexed)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## Standalone Seeder Tool

Generate realistic log data independently:

```bash
cd tools/seeder
pip install -r requirements.txt

# Generate 5000 logs over 60 days
python generate_logs.py --count 5000 --days 60

# Use custom database URL
python generate_logs.py --count 1000 --db-url "postgresql://..."
```

See `tools/seeder/README.md` for more details.

## Design Decisions

### Backend
- **FastAPI**: Chosen for auto-generated documentation, async support, and modern Python features
- **SQLAlchemy**: Industry-standard ORM with excellent PostgreSQL support
- **JWT Authentication**: Stateless authentication suitable for REST APIs
- **PostgreSQL pg_trgm**: Full-text search with fuzzy matching for log messages
- **Pydantic v2**: Automatic request/response validation and OpenAPI schema generation

### Frontend
- **Material-UI**: Comprehensive component library with professional design
- **TanStack Query**: Powerful data fetching with automatic caching and refetching
- **TypeScript**: Type safety across the entire frontend
- **Chart.js**: Popular, performant charting library with good React integration
- **React Router**: Standard routing solution for React applications

### Architecture
- **Separation of Concerns**: Clear separation between API, business logic, and data layers
- **RBAC Simplicity**: Simple authenticated vs guest model keeps permissions clear
- **Public Analytics**: Analytics endpoints are public to allow anonymous monitoring
- **Full-text Search**: PostgreSQL native full-text search for efficient message searching
- **Pagination**: Cursor-based pagination prevents performance issues with large datasets

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
API_V1_STR=/api
PROJECT_NAME=Logs Dashboard API
BACKEND_CORS_ORIGINS=["http://localhost", "http://localhost:5173"]
```

### Frontend
Environment variables are configured in `vite.config.ts` and docker-compose.yml

## Future Enhancements

### Potential Features
- Email notifications for critical errors
- Webhook integrations
- Advanced analytics (ML-based anomaly detection)
- Log retention policies
- Bulk operations (bulk delete, bulk edit)
- Real-time log streaming (WebSockets)
- Multi-tenancy support
- Advanced RBAC with roles and permissions
- Audit logging
- Log aggregation from multiple sources

### Technical Improvements
- Performance monitoring and APM integration
- Caching layer (Redis)
- Rate limiting
- API versioning
- GraphQL alternative endpoint
- Horizontal scaling setup
- CDN integration for frontend assets

## Troubleshooting

### Port Already in Use
If ports 80, 5432, or 8000 are already in use:
```bash
# Edit docker-compose.yml and change port mappings
ports:
  - "8080:80"  # Change frontend port
  - "5433:5432"  # Change postgres port
  - "8001:8000"  # Change backend port
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend Not Loading
```bash
# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

## License

MIT License - Feel free to use this project for learning and development.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with FastAPI, React, and PostgreSQL.
