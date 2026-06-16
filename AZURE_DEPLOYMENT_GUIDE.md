# RigPro — Azure Deployment Guide

---

## Your Setup at a Glance

| | Today | Coming Years |
|---|---|---|
| **Users** | ~35 | 100+ |
| **Inspections per day** | 1 (expected minimum) | 10+ (if system is well adopted) |
| **PDFs generated per year** | ~365 | ~3,650+ |
| **Database size per year** | ~200 MB | ~2 GB |
| **Recommended Azure tier** | App Service B1 | App Service B2 → P1v3 |

---

## Part 1 — Cost Right Now (35 Users, 1–10 Inspections/Day)

| Azure Service | What It Does | Size | Cost/Month |
|---|---|---|---|
| App Service (B1 Linux) | Runs your Docker container 24/7 | 1 vCPU, 1.75 GB RAM | ~$13 |
| Azure Database for PostgreSQL | Your database | B1ms — 1 vCore, 2 GB RAM | ~$12 |
| Azure Blob Storage | Stores PDFs, photos, documents | 10 GB (enough for ~2 years) | ~$0.50 |
| Docker Hub (free account) | Stores your Docker image | Free tier | $0 |
| **Total** | | | **~$26 / month** |

> **No setup fee.** Azure charges by the day from the moment services are created.
> Your first month costs the same as every month after — there is no one-time deployment charge.

---

## Part 2 — How Costs Change as You Grow

### What drives cost up

- **More users = more simultaneous API requests** → needs more CPU and RAM on the app server
- **More inspections = more database queries and more PDF files stored**
- **More data stored = slightly more storage cost** (but storage is very cheap — negligible)

The database size growth for your usage:
- Each inspection record in PostgreSQL: ~50 KB of data
- 10 inspections/day × 365 days = 3,650 records/year = **~180 MB/year** — tiny
- Each inspection PDF file: ~1–2 MB
- 10 PDFs/day × 365 days = **~3–7 GB of PDFs per year**

Storage cost for 7 GB on Azure Blob = **~$0.13/month** — essentially free.
The cost that grows is the **compute tier** as concurrent users increase.

---

### Cost Over Time — Your Specific Numbers

| Phase | When | Users | Inspections/Day | App Service | PostgreSQL | Storage | **Total/Month** |
|---|---|---|---|---|---|---|---|
| **Now** | Today | 35 | 1–5 | B1 — $13 | B1ms — $12 | 10 GB — $0.50 | **~$26** |
| **Near Future** | 6–18 months | 50–100 | 5–10 | B2 — $26 | B1ms — $12 | 50 GB — $1 | **~$39** |
| **Growth** | 2–3 years | 100+ | 10–20 | P1v3 — $73 | B2ms — $25 | 100 GB — $2 | **~$100** |
| **At Scale** | 3+ years | 200+ | 20+ | P2v3 — $146 | D2ds — $110 | 200 GB — $4 | **~$260** |

> Upgrades are one command — no downtime, no redeploy needed.
> You only upgrade when Azure Monitor shows CPU consistently above 70% — not before.

---

### Compared to SafetyCulture (No Per-User Fee on RigPro)

| Users | SafetyCulture ($25/user/month) | RigPro on Azure |
|---|---|---|
| 35 users | $875/month | **$26/month** |
| 100 users | $2,500/month | **$39/month** |
| 200 users | $5,000/month | **$100/month** |

RigPro has **no per-user fee**. Adding 65 more users costs you $0 extra until traffic forces a compute upgrade.

---

## Part 3 — When to Upgrade (Simple Rule)

You do not need to upgrade proactively. Upgrade only when you see these signs:

| Sign | What to Upgrade | Cost Increase |
|---|---|---|
| App feels slow during work hours / requests timing out | App Service: B1 → B2 | +$13/month |
| Database queries taking >2 seconds | PostgreSQL: B1ms → B2ms | +$12/month |
| PDF storage folder getting large (check monthly) | Blob Storage tier | +$1–2/month |
| 100+ users all active at the same time | App Service: B2 → P1v3 | +$47/month |

Check CPU usage in Azure Portal → App Service → Metrics → CPU Percentage.
If it stays above 70% during business hours for more than a week, upgrade.

---

## Part 4 — Before You Start

Install these on your Windows machine:

1. **Azure CLI** — download from `https://aka.ms/installazurecliwindows`
2. **Docker Desktop** — download from `https://www.docker.com/products/docker-desktop`
3. **Azure account** — sign up free at `https://portal.azure.com` (comes with $200 credit for 30 days)
4. **Docker Hub account** — sign up free at `https://hub.docker.com`

Verify they are installed — open PowerShell and run:

```powershell
az --version
docker --version
```

Both should print version numbers without errors.

---

## Part 5 — Full Deployment Steps

> Open PowerShell and navigate to your project folder first:
> ```powershell
> cd "c:\Users\vinukiT\Downloads\JAS"
> ```

---

### Step 1 — Login to Azure

```powershell
az login
```

A browser window opens. Sign in with your Azure account. Return to PowerShell when done.

---

### Step 2 — Create a Resource Group

A resource group is like a folder that holds all your Azure services together. Deleting the folder deletes everything inside it.

```powershell
az group create --name rigpro-rg --location australiaeast
```

> Change `australiaeast` to the region closest to your team.
> Options: `eastus`, `westeurope`, `southeastasia`, `uksouth`, `australiaeast`

---

### Step 3 — Build and Push Your Docker Image

Docker Hub stores your image so Azure can pull it when it starts.

```powershell
# Login to Docker Hub (enter your username and password when prompted)
docker login

# Build the Docker image
# IMPORTANT: Replace "yourdockerhubusername" with your actual Docker Hub username
docker build -t yourdockerhubusername/rigpro:latest .

# Push to Docker Hub
docker push yourdockerhubusername/rigpro:latest
```

> The build takes 3–5 minutes the first time. It compiles the React frontend and bundles it together with the FastAPI backend into one container image.

---

### Step 4 — Create the PostgreSQL Database

```powershell
# Create the database server
# IMPORTANT: Replace "MySecurePassword123!" with your own strong password
# Write this password down — you will need it in Step 7
az postgres flexible-server create `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --location australiaeast `
  --admin-user rigpro `
  --admin-password MySecurePassword123! `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --version 15 `
  --storage-size 32 `
  --yes
```

> This takes 3–5 minutes. Do not close PowerShell. Wait for the command to finish.

```powershell
# Create the database inside the server
az postgres flexible-server db create `
  --resource-group rigpro-rg `
  --server-name rigpro-db-server `
  --database-name rigpro_jsa

# Allow the App Service to connect to the database
az postgres flexible-server firewall-rule create `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

---

### Step 5 — Create Storage for PDFs and Uploads

Without this step, every time your container restarts all PDFs and uploaded documents are permanently deleted.

```powershell
# Create the storage account
# Name must be lowercase letters and numbers only, globally unique, max 24 characters
az storage account create `
  --name rigprostorage `
  --resource-group rigpro-rg `
  --location australiaeast `
  --sku Standard_LRS

# Get the storage account key — copy and save this value
az storage account keys list `
  --resource-group rigpro-rg `
  --account-name rigprostorage `
  --query "[0].value" `
  --output tsv

# Create a file share inside the storage account
az storage share create `
  --name rigpro-files `
  --account-name rigprostorage
```

---

### Step 6 — Create the App Service Plan

The App Service Plan is the server your app runs on. B1 handles 35 users and daily inspections comfortably.

```powershell
az appservice plan create `
  --name rigpro-plan `
  --resource-group rigpro-rg `
  --is-linux `
  --sku B1
```

---

### Step 7 — Deploy the App

```powershell
# Create the Web App from your Docker image
# Replace "yourdockerhubusername" with your Docker Hub username
az webapp create `
  --resource-group rigpro-rg `
  --plan rigpro-plan `
  --name rigpro-app `
  --deployment-container-image-name yourdockerhubusername/rigpro:latest
```

> The `--name rigpro-app` becomes your URL: `https://rigpro-app.azurewebsites.net`
> If that name is taken, change it to something unique like `rigpro-northsails`.

Set the database connection — replace `MySecurePassword123!` with your password from Step 4:

```powershell
az webapp config appsettings set `
  --resource-group rigpro-rg `
  --name rigpro-app `
  --settings DATABASE_URL="postgresql+psycopg2://rigpro:MySecurePassword123!@rigpro-db-server.postgres.database.azure.com:5432/rigpro_jsa?sslmode=require"
```

---

### Step 8 — Mount Persistent Storage for PDFs

Replace `<YOUR_STORAGE_KEY>` with the key you copied in Step 5:

```powershell
az webapp config storage-account add `
  --resource-group rigpro-rg `
  --name rigpro-app `
  --custom-id rigpro-storage `
  --storage-type AzureFiles `
  --share-name rigpro-files `
  --account-name rigprostorage `
  --access-key <YOUR_STORAGE_KEY> `
  --mount-path /app/storage
```

---

### Step 9 — Start the App and Get Your URL

```powershell
# Restart to apply all settings
az webapp restart --resource-group rigpro-rg --name rigpro-app

# View the live URL
az webapp show `
  --resource-group rigpro-rg `
  --name rigpro-app `
  --query defaultHostName `
  --output tsv
```

Your app is live at the URL printed — something like:
```
https://rigpro-app.azurewebsites.net
```

---

### Step 10 — Verify Everything Works

Open the URL in your browser and test:

| Test | What to Check |
|---|---|
| Home page loads | No blank screen or error |
| Login works | Use `admin@rigpro.com` / `admin123` |
| API docs accessible | Go to `https://your-url/docs` |
| Health check | Go to `https://your-url/health` — should show `{"status":"ok"}` |

**Immediately after login — change all default passwords:**

The seed passwords (`admin123`, `tech123`, `super123`) are public knowledge.
Go to the user settings in the app and update all 3 accounts before inviting your team.

---

### Step 11 — Watch the Startup Logs (if something goes wrong)

```powershell
az webapp log tail --resource-group rigpro-rg --name rigpro-app
```

Look for `Application startup complete` — that confirms the app started correctly.
The most common error is a wrong DATABASE_URL — double-check the password has no special characters like `@` or `#`.

---

## Part 6 — Deploying Code Updates

Every time you change code and want to push the update to Azure:

```powershell
# Step 1 — Rebuild the Docker image with your changes
docker build -t yourdockerhubusername/rigpro:latest .

# Step 2 — Push to Docker Hub
docker push yourdockerhubusername/rigpro:latest

# Step 3 — Tell Azure to pull the new image (causes ~10 second restart)
az webapp restart --resource-group rigpro-rg --name rigpro-app
```

> Your data is never affected by updates. Only the app code changes. The database and uploaded files remain untouched.

---

## Part 7 — How to Upgrade When You Need More Power

### Upgrade App Service (when app is slow during peak hours)

```powershell
# B1 → B2 (~35 to ~100 users)
az appservice plan update `
  --name rigpro-plan `
  --resource-group rigpro-rg `
  --sku B2

# B2 → P1v3 (~100 to ~200 users)
az appservice plan update `
  --name rigpro-plan `
  --resource-group rigpro-rg `
  --sku P1V3
```

No redeployment needed. The app keeps running — Azure migrates it automatically with a brief restart.

### Upgrade PostgreSQL (when database queries become slow)

```powershell
# B1ms → B2ms (handles more concurrent connections)
az postgres flexible-server update `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --sku-name Standard_B2ms

# B2ms → D2ds_v4 (General Purpose — for heavy analytics queries)
az postgres flexible-server update `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --sku-name Standard_D2ds_v4 `
  --tier GeneralPurpose
```

> PostgreSQL upgrades cause 30–60 seconds of downtime. Run during off-peak hours (e.g., midnight).

---

## Part 8 — Set a Budget Alert (So You Are Never Surprised)

This sends you an email if your Azure bill goes above $40 in any month:

```powershell
az consumption budget create `
  --resource-group rigpro-rg `
  --budget-name rigpro-budget `
  --amount 40 `
  --time-grain Monthly `
  --start-date 2026-07-01 `
  --end-date 2029-07-01 `
  --category Cost
```

Change `--amount 40` to whatever limit you want. You will receive an email warning before the limit is reached.

---

## Part 9 — Shut Everything Down (Stop All Billing)

If you ever want to stop the app and all Azure charges:

```powershell
az group delete --name rigpro-rg --yes --no-wait
```

This deletes every service inside `rigpro-rg` and stops billing completely.
Takes ~5 minutes to fully remove. Docker Hub image is not deleted.

---

## Part 10 — Architecture Overview

```
Your Team (35 → 100+ users)
         │
         ▼  HTTPS
Azure App Service  ──── rigpro-app.azurewebsites.net
(App Service B1)
  └─ Docker container:  yourdockerhubusername/rigpro:latest
     ├─ React frontend  (served as static files on /)
     └─ FastAPI backend (API on /api/...)
         │                        │
         ▼                        ▼
Azure PostgreSQL B1ms       Azure Files Share
(rigpro-db-server)          (rigpro-files)
  └─ Database: rigpro_jsa     └─ /app/storage
     All tables, records,         PDFs, photos,
     users, inspections           documents
     issues, actions...

Docker Hub (free)
  └─ Stores image between deploys
```

---

## Part 11 — Cost Summary for Your Numbers

| | **Today** | **If 10 inspections/day** | **At 100+ users** |
|---|---|---|---|
| Users | 35 | 35–50 | 100+ |
| Inspections/day | 1 | 10 | 10–20 |
| PDFs stored per year | ~365 | ~3,650 | ~7,000+ |
| App Service | B1 — $13 | B1 — $13 | B2 — $26 |
| PostgreSQL | B1ms — $12 | B1ms — $12 | B1ms — $12 |
| Storage | $0.50 | $1 | $2 |
| **Total/month** | **~$26** | **~$26** | **~$40** |

> Going from 1 to 10 inspections per day does **not** increase cost at all.
> The database and storage cost of 10× more inspections is less than $1/month extra.
> Cost only goes up meaningfully when you add more concurrent users hitting the app at the same time.

---

## Deployment Checklist

- [ ] Azure CLI installed — `az --version` works
- [ ] Docker Desktop installed — `docker --version` works
- [ ] Azure account created and `az login` done
- [ ] Docker Hub account created and `docker login` done
- [ ] Resource group created (`rigpro-rg`)
- [ ] Docker image built and pushed to Docker Hub
- [ ] PostgreSQL server created and database `rigpro_jsa` created
- [ ] Firewall rule added for Azure services
- [ ] Storage account and file share created
- [ ] App Service Plan B1 created
- [ ] Web App deployed with Docker image
- [ ] DATABASE_URL environment variable set
- [ ] Persistent storage mounted to `/app/storage`
- [ ] App restarted and URL retrieved
- [ ] Login tested with admin account
- [ ] Default passwords changed on all 3 accounts
- [ ] Budget alert set at $40/month
