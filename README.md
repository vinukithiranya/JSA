# RigPro JSA Application

Full-stack light-theme Job Safety Assessment app with React frontend and FastAPI backend.

## Quick Start

### Option 1: Docker

```bash
docker compose up --build
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000/docs

### Option 2: Local run

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Demo Credentials

- tech@rigpro.com / tech123
- supervisor@rigpro.com / super123
- admin@rigpro.com / admin123

## Implemented Core Flows

- Login
- Dashboard KPIs
- Create JSA (job details -> work steps -> 25-question checklist)
- Hazard analysis engine
- Review hazards and PPE
- Submit to supervisor
- Supervisor queue and approval
- PDF report endpoint
- PostgreSQL-ready schema in db/schema.sql
- JSA summary export endpoint (`/api/jsa/{id}/summary`)
- Batch analytics endpoint (`/api/jsa/analytics`)

## Added Extended Modules

- Persistent storage via SQLAlchemy (SQLite default, PostgreSQL via DATABASE_URL)
- Admin Form Builder page and API (`/api/forms`)
- Document Library with file upload/list (`/api/documents`)
- Offline queue + batch sync endpoint (`/api/sync/jsa-batch`)
- Static document/report serving from `/storage`
- Summary JSON/CSV export files attached to JSA records
- Batch analytics script for hazard counts and average risk by hazard

## Environment

Backend respects `DATABASE_URL`. If not set, it uses local sqlite database (`rigpro.db`).
