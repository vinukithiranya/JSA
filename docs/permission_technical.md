# RigPro — Technical Deployment Approval Request
### For: Malishini
### Subject: Technical Sign-Off to Deploy RigPro on Microsoft Azure

---

## What I Am Asking For

Technical approval to deploy the RigPro digital safety management platform to a production environment on Microsoft Azure.

Business cost approval is being sought separately from Kevin.
This document covers the technical architecture, security, data handling, and operational requirements.

---

## System Overview

RigPro is a web application built with industry-standard technologies:

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Modern, type-safe UI |
| Backend API | FastAPI (Python 3.11) | High-performance, auto-documented REST API |
| Database | PostgreSQL 15 | Enterprise-grade relational database |
| Deployment | Docker + Docker Compose | Containerised, runs on any cloud or on-premise |
| PDF Generation | ReportLab (Python) | Server-side, no third-party dependency |

The application is fully containerised. The entire stack starts with one command: `docker compose up`.

---

## Proposed Azure Architecture

```
Users (browser / mobile)
        │  HTTPS only
        ▼
Azure App Service (B1 Linux)
  └─ Docker container: rigpro:latest
     ├─ React frontend (served as static files)
     └─ FastAPI backend (REST API on /api/...)
         │                     │
         ▼                     ▼
Azure PostgreSQL          Azure Blob Storage
Flexible Server           (PDFs, documents,
(B1ms tier)               uploaded photos)
```

All services are deployed inside a single **Azure Resource Group** — isolated from other systems.

---

## Security Implementation

### Authentication
- JWT (JSON Web Token) based authentication
- Tokens stored in browser localStorage, sent in `Authorization: Bearer` header on every request
- No session cookies — stateless authentication
- Passwords hashed using bcrypt — plain-text passwords are never stored

### Authorisation (Role-Based Access Control)
- 4 roles enforced server-side on every API endpoint: `admin`, `supervisor`, `technician`, `view_only`
- Role checks are in `backend/app/services/rbac.py` — not client-controlled
- A `view_only` user physically cannot call write endpoints — the server returns HTTP 403

### Data in Transit
- Azure App Service enforces HTTPS by default — all traffic encrypted with TLS 1.2+
- HTTP requests are automatically redirected to HTTPS
- Azure PostgreSQL connection requires `sslmode=require` — database traffic is encrypted

### Data at Rest
- Azure PostgreSQL: data encrypted at rest using AES-256 (Azure managed)
- Azure Blob Storage: data encrypted at rest (Azure managed)
- No sensitive data stored in environment variables beyond the database password

### API Security
- All request bodies validated by Pydantic schemas — malformed requests rejected before reaching business logic
- SQLAlchemy ORM used throughout — no raw SQL queries, no SQL injection risk
- CORS configured (currently open — recommend restricting to your domain before production)
- No secrets hardcoded in source code — configuration via environment variables only

### Audit Trail
- `audit_logs` database table exists and is ready to record every mutation with user ID and timestamp
- Full activation of audit logging is recommended as a post-deployment task

---

## Data Handling

### What Data Is Stored

| Data Type | Where | Sensitivity |
|---|---|---|
| User accounts (email, hashed password, role) | PostgreSQL | Medium |
| JSA records (job details, hazard answers) | PostgreSQL | Medium |
| Inspection records (answers, scores, flags) | PostgreSQL | Medium |
| Issues, actions, investigations | PostgreSQL | Medium |
| Supervisor digital signatures | PostgreSQL (base64 text) | Medium |
| PDF reports | Azure Blob Storage | Medium |
| Uploaded photos and documents | Azure Blob Storage | Low–Medium |

No financial data, no personal health data, no government identifiers are stored.

### Data Residency
Azure region selected: **Australia East** (Sydney)
All data remains within Australia by default. Can be changed to any Azure region.

### Backup and Recovery

| Item | Backup Policy | Retention | Recovery Time |
|---|---|---|---|
| PostgreSQL database | Automatic daily backup (Azure managed) | 7 days | ~15 minutes |
| Blob Storage (PDFs/files) | Azure LRS (3 copies in same datacenter) | Continuous | Immediate |
| Docker image | Stored on Docker Hub | Indefinite | ~5 minutes |

**Point-in-time restore:** Azure PostgreSQL supports restoring to any point within the 7-day retention window.

### Data Isolation
- The application runs in its own Azure Resource Group, isolated from any other systems
- No connection to Active Directory or internal network in initial deployment
- Can be integrated with Azure Active Directory (SSO) in a future phase if required

---

## Access and Permissions

### Who Has Access to Azure

| Person | Azure Access Level | What They Can Do |
|---|---|---|
| Deployment admin | Resource Group Contributor | Deploy updates, view logs, manage services |
| (Recommended) IT admin | Resource Group Reader | View costs, monitor health |

### Who Has Access to the Application

| Role | Created by | Access Level |
|---|---|---|
| Admin | Deployment team (seeded) | Full system — manage users, approve everything |
| Supervisor | Admin creates via app | Approve JSAs/inspections, receive critical alerts |
| Technician | Admin creates via app | Create JSAs, conduct inspections, report issues |
| View Only | Admin creates via app | Read-only — no write access |

No external parties have access unless an account is explicitly created by an admin.

---

## Network and Connectivity

### Inbound Traffic
- Port 443 (HTTPS) only — Azure App Service handles SSL termination
- Port 80 redirects to 443 automatically
- No other ports exposed

### Outbound Traffic
- App Service to PostgreSQL: internal Azure network (not public internet)
- App Service to Blob Storage: internal Azure network
- No outbound calls to third-party APIs — the system is self-contained

### Offline Operation
- Field workers can use the app with no internet connection
- Data is stored locally in the browser's IndexedDB
- Automatically syncs to the server when connectivity is restored
- No VPN required

---

## Deployment Process

### Initial Deployment
1. Build Docker image from source code
2. Push image to Docker Hub
3. Create Azure resources (PostgreSQL, App Service, Blob Storage)
4. Set `DATABASE_URL` environment variable
5. Deploy — Azure pulls image and starts the container
6. Database tables and default users created automatically on first start

**Estimated time: 45 minutes**
**Downtime during initial deploy: none** (new deployment, no existing users)

### Future Updates
1. Build new Docker image
2. Push to Docker Hub
3. `az webapp restart` — Azure pulls new image
4. **Downtime during update: ~10 seconds**

Updates do not affect data. The database and stored files are never touched by a code update.

---

## Monitoring and Alerting

| What | How | Where to View |
|---|---|---|
| Application health | `/health` endpoint returns `{"status":"ok"}` | Azure App Service → Health Check |
| CPU and memory usage | Azure Monitor metrics | Azure Portal → App Service → Metrics |
| Database performance | Azure Monitor metrics | Azure Portal → PostgreSQL → Metrics |
| Error logs | Application logs via Azure Log Stream | Azure Portal → App Service → Log Stream |
| Spending | Azure Cost Management | Azure Portal → Cost Management |

A budget alert at $480/year ($40/month) will be configured to email if spend exceeds the expected threshold.

---

## Compliance Considerations

| Area | Current Status | Recommendation |
|---|---|---|
| HTTPS / TLS | Enforced by Azure | Done at deploy |
| Password storage | bcrypt hashed | Done |
| Data encryption at rest | Azure managed AES-256 | Done |
| Audit logging | Table exists, not fully wired | Activate post-deployment |
| CORS restriction | Currently open (`*`) | Restrict to company domain |
| Session timeout | JWT does not expire currently | Add expiry in future phase |
| Penetration testing | Not yet performed | Recommended before external access |

---

## What Happens if Something Goes Wrong

| Scenario | Impact | Recovery |
|---|---|---|
| App container crashes | App unavailable | Azure auto-restarts container — ~30 seconds |
| Database crashes | App unavailable | Azure auto-restarts — ~2 minutes |
| Accidental data deletion | Data loss limited to deletion window | Restore from Azure backup — ~15 minutes |
| Azure region outage | App unavailable | Redeploy to another region — ~45 minutes |
| Bad code deployment | App errors | Roll back to previous Docker image — ~5 minutes |

---

## What I Need From You

- [ ] Technical approval to deploy on Microsoft Azure (Australia East region)
- [ ] Confirmation that cloud deployment to Azure is permitted under company IT policy
- [ ] Guidance on whether the Azure subscription should sit under an existing company tenant or a new one
- [ ] Confirmation of any internal security review requirements before go-live
- [ ] Advice on whether integration with company Active Directory / SSO is needed now or later

---

## Items I Will Action Before Go-Live

- [ ] Restrict CORS to company domain (currently open for testing)
- [ ] Set JWT token expiry
- [ ] Change all seeded default passwords
- [ ] Activate full audit logging
- [ ] Configure Azure budget alert

---

## Supporting Documents Available

- Full deployment steps and commands: `AZURE_DEPLOYMENT_GUIDE.md`
- Full technical architecture: available on request
- API documentation: auto-generated at `/docs` endpoint

**Prepared by:** Vinuki Thiranya
**Date:** June 2026
