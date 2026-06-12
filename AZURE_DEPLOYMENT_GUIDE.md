# RigPro — Azure Deployment Guide

---

## Quick Summary

| | Detail |
|---|---|
| **Recommended option** | Azure Container Apps + Azure PostgreSQL |
| **Minimum monthly cost** | ~$15–20 / month (small team) |
| **One-command local run** | `docker compose up --build` |
| **One-command redeploy** | `az acr build ... && az containerapp update ...` |
| **Time to deploy** | ~45 minutes first time |

---

## Part 1 — How Much Does It Cost?

### Option A — Cheapest (Recommended for small teams)

Uses **Azure Container Apps** which only charges when your app is actually receiving requests.
For an internal safety app with moderate usage, this is the lowest-cost path.

| Service | Purpose | Cost/month |
|---|---|---|
| Azure Container Apps (Consumption) | Runs your Docker container | ~$3–8 |
| Azure Database for PostgreSQL B1ms | Your database | ~$12 |
| Docker Hub (free account) | Stores your Docker image | $0 |
| Azure Blob Storage (50 GB) | PDFs, documents, uploads | ~$1 |
| **Total** | | **~$16–21 / month** |

> The Container Apps free allowance is 180,000 vCPU-seconds and 360,000 GB-seconds per month.
> For an internal app used by a small team during business hours, most months will hit little or no charge beyond the database.

---

### Option B — Simple & Stable (Recommended once the team grows past ~15 people)

Uses **Azure App Service B1** which runs 24/7 regardless of traffic. More predictable billing.

| Service | Purpose | Cost/month |
|---|---|---|
| Azure App Service B1 (Linux) | Runs your Docker container | ~$13 |
| Azure Database for PostgreSQL B1ms | Your database | ~$12 |
| Azure Container Registry Basic | Stores your Docker image | ~$5 |
| Azure Files (32 GB) | PDFs, documents, uploads | ~$2 |
| **Total** | | **~$32 / month** |

---

### Option C — Ultra Cheap Single VM (Not recommended for production)

Runs everything on one Azure virtual machine using your existing `docker-compose.yml`.
Cheapest possible, but if the VM crashes, everything goes down.

| Service | Purpose | Cost/month |
|---|---|---|
| Azure VM B2s (2 vCPU, 4 GB) | Runs Docker + PostgreSQL together | ~$35 |
| Azure Blob Storage (50 GB) | PDFs, documents, uploads | ~$1 |
| **Total** | | **~$36 / month** |

> This is only worth it if you want complete control and are comfortable managing a Linux VM.

---

## Part 2 — How Costs Change as Your Team Grows

Unlike SafetyCulture ($25/user/month), **RigPro has no per-user fee**.
Costs only increase when traffic or data storage grows — not when you add people.

| Team Size | Recommended Setup | Estimated Cost/month |
|---|---|---|
| **1–10 people** | Container Apps (Consumption) + PostgreSQL B1ms | ~$16–21 |
| **10–30 people** | App Service B1 + PostgreSQL B1ms | ~$32 |
| **30–80 people** | App Service B2 + PostgreSQL B2ms | ~$65 |
| **80–200 people** | App Service P1v3 + PostgreSQL D2ds | ~$150 |
| **200+ people** | App Service P2v3 (×2 instances) + PostgreSQL D4ds + CDN | ~$300 |

### Comparison vs SafetyCulture

| Team Size | SafetyCulture | RigPro on Azure |
|---|---|---|
| 10 users | $250/month | $21/month |
| 30 users | $750/month | $32/month |
| 80 users | $2,000/month | $65/month |
| 200 users | $5,000/month | $150/month |

---

## Part 3 — Before You Start

You need these installed on your machine:

1. **Azure CLI** — download from `https://aka.ms/installazurecliwindows`
2. **Docker Desktop** — download from `https://www.docker.com/products/docker-desktop`
3. **Azure account** — create free at `https://portal.azure.com` ($200 free credit for 30 days)
4. **Docker Hub account** — create free at `https://hub.docker.com`

Check everything is installed — open PowerShell and run:

```powershell
az --version
docker --version
```

Both should print version numbers. If not, install them first.

---

## Part 4 — Full Deployment Steps (Option A — Recommended)

> Run all commands in PowerShell from your project folder:
> `cd c:\Users\vinukiT\Downloads\JAS`

---

### Step 1 — Login to Azure

```powershell
az login
```

A browser window opens. Sign in with your Azure account. Come back to the terminal when done.

---

### Step 2 — Create a Resource Group

A resource group is a folder that holds all your Azure services together.

```powershell
az group create --name rigpro-rg --location australiaeast
```

> Change `australiaeast` to the region closest to your team.
> Other options: `eastus`, `westeurope`, `southeastasia`, `uksouth`

---

### Step 3 — Push Your Docker Image to Docker Hub

Docker Hub stores your image so Azure can pull it.

```powershell
# Login to Docker Hub (enter your Docker Hub username and password when prompted)
docker login

# Build the image (this builds both React frontend + FastAPI backend into one image)
# Replace "yourdockerhubusername" with your actual Docker Hub username
docker build -t yourdockerhubusername/rigpro:latest .

# Push to Docker Hub
docker push yourdockerhubusername/rigpro:latest
```

> The build takes 3–5 minutes the first time. It builds the React frontend and bundles it with the Python backend into one container.

---

### Step 4 — Create the PostgreSQL Database

```powershell
# Create the PostgreSQL server
# IMPORTANT: Change "MySecurePassword123!" to your own strong password
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

> This takes 3–5 minutes. Wait for it to finish before moving on.

```powershell
# Create the database inside the server
az postgres flexible-server db create `
  --resource-group rigpro-rg `
  --server-name rigpro-db-server `
  --database-name rigpro_jsa

# Allow Azure services to connect to the database
az postgres flexible-server firewall-rule create `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

---

### Step 5 — Create Blob Storage for PDFs and Uploads

Without this, every time your container restarts, all uploaded PDFs and documents are lost.

```powershell
# Create a storage account (name must be lowercase, no hyphens, globally unique)
az storage account create `
  --name rigprostorage `
  --resource-group rigpro-rg `
  --location australiaeast `
  --sku Standard_LRS

# Create a container inside the storage account
az storage container create `
  --name rigpro-files `
  --account-name rigprostorage `
  --public-access off
```

---

### Step 6 — Create the Container App Environment

Container Apps need an "environment" to run inside — think of it as the hosting space.

```powershell
# Install the Container Apps extension for Azure CLI (first time only)
az extension add --name containerapp --upgrade

# Create the environment
az containerapp env create `
  --name rigpro-env `
  --resource-group rigpro-rg `
  --location australiaeast
```

---

### Step 7 — Deploy the App

Now deploy your Docker image as a Container App.

Replace the following before running:
- `yourdockerhubusername` → your Docker Hub username
- `MySecurePassword123!` → the password you set in Step 4

```powershell
az containerapp create `
  --name rigpro-app `
  --resource-group rigpro-rg `
  --environment rigpro-env `
  --image yourdockerhubusername/rigpro:latest `
  --target-port 8000 `
  --ingress external `
  --min-replicas 0 `
  --max-replicas 3 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --env-vars DATABASE_URL="postgresql+psycopg2://rigpro:MySecurePassword123!@rigpro-db-server.postgres.database.azure.com:5432/rigpro_jsa?sslmode=require"
```

> `--min-replicas 0` means the app scales to zero when not in use — this is what keeps costs low.

---

### Step 8 — Get Your Live URL

```powershell
az containerapp show `
  --name rigpro-app `
  --resource-group rigpro-rg `
  --query properties.configuration.ingress.fqdn `
  --output tsv
```

This prints your live URL — something like:
```
rigpro-app.nicename-abc123.australiaeast.azurecontainerapps.io
```

Open that URL in your browser. Your app is live.

---

### Step 9 — Verify It Works

Open the URL in your browser and log in with these default accounts (seeded automatically):

| Email | Password | Role |
|---|---|---|
| admin@rigpro.com | admin123 | Admin |
| supervisor@rigpro.com | super123 | Supervisor |
| tech@rigpro.com | tech123 | Technician |

Also check the API docs are working:
```
https://your-url/docs
```

Also check the health endpoint:
```
https://your-url/health
```

Should return: `{"status": "ok"}`

---

### Step 10 — Change the Default Passwords

The seed passwords (`admin123`, `tech123`, `super123`) are public — change them immediately.

Go to `https://your-url/docs`, find the `PUT /api/auth/change-password` endpoint, and update each account's password.

---

## Part 5 — Deploying Updates (After First Deploy)

Every time you change code and want to push an update:

```powershell
# 1. Rebuild and push the new image
docker build -t yourdockerhubusername/rigpro:latest .
docker push yourdockerhubusername/rigpro:latest

# 2. Tell Azure to pull the new image
az containerapp update `
  --name rigpro-app `
  --resource-group rigpro-rg `
  --image yourdockerhubusername/rigpro:latest
```

---

## Part 6 — Upgrading When Your Team Grows

When your team reaches 15–30 people and the app needs to always be running (no cold starts), switch from Container Apps to App Service:

```powershell
# Create App Service Plan (B1 = always-on, ~$13/month)
az appservice plan create `
  --name rigpro-plan `
  --resource-group rigpro-rg `
  --is-linux `
  --sku B1

# Create Web App from your Docker image
az webapp create `
  --resource-group rigpro-rg `
  --plan rigpro-plan `
  --name rigpro-webapp `
  --deployment-container-image-name yourdockerhubusername/rigpro:latest

# Set the database connection
az webapp config appsettings set `
  --resource-group rigpro-rg `
  --name rigpro-webapp `
  --settings DATABASE_URL="postgresql+psycopg2://rigpro:MySecurePassword123!@rigpro-db-server.postgres.database.azure.com:5432/rigpro_jsa?sslmode=require"
```

When the database becomes a bottleneck (slow queries, large data), upgrade the PostgreSQL tier:

```powershell
az postgres flexible-server update `
  --resource-group rigpro-rg `
  --name rigpro-db-server `
  --sku-name Standard_D2ds_v4 `
  --tier GeneralPurpose
```

---

## Part 7 — Monitor Costs

Check your live spend at any time:

```powershell
az consumption usage list `
  --billing-period-name $(az billing period list --query "[0].name" -o tsv) `
  --query "[?contains(instanceName,'rigpro')].[instanceName,pretaxCost,currency]" `
  --output table
```

Or go to **portal.azure.com → Cost Management + Billing → Cost Analysis** and filter by resource group `rigpro-rg`.

Set a **budget alert** so you get an email if spend goes above a threshold:

```powershell
az consumption budget create `
  --resource-group rigpro-rg `
  --budget-name rigpro-budget `
  --amount 50 `
  --time-grain Monthly `
  --start-date 2026-06-01 `
  --end-date 2027-06-01 `
  --category Cost
```

---

## Part 8 — Shut Everything Down (Stop All Billing)

One command deletes everything in the resource group and stops all charges:

```powershell
az group delete --name rigpro-rg --yes --no-wait
```

> `--no-wait` means it runs in the background. Takes ~5 minutes to fully delete.

---

## Part 9 — Architecture Diagram

```
Internet
    │
    ▼
Azure Container Apps  (rigpro-app)
    │  Docker image: yourdockerhubusername/rigpro:latest
    │  FastAPI backend + React frontend (bundled)
    │  Port 8000
    │
    ├──► Azure Database for PostgreSQL  (rigpro-db-server)
    │       Database: rigpro_jsa
    │       Tables: users, jsa_records, inspection_records,
    │               issues, actions, templates, ...
    │
    └──► Azure Blob Storage  (rigprostorage)
             Container: rigpro-files
             Stores: PDF reports, uploaded documents, photos

Docker Hub (free)
    └──► Stores the Docker image that Azure pulls from
```

---

## Part 10 — Troubleshooting

**App won't start — shows "Application Error"**
```powershell
# View the startup logs
az containerapp logs show --name rigpro-app --resource-group rigpro-rg --follow
```
Look for the error message. Most common cause: wrong DATABASE_URL.

**Database connection refused**
- Check the firewall rule was created in Step 4
- Check the DATABASE_URL contains `?sslmode=require` at the end
- Check the password has no special characters that need URL encoding (avoid `@`, `#`, `%`)

**App is slow on first load (cold start)**
- This is normal for Container Apps with `--min-replicas 0`
- First request after inactivity takes 10–15 seconds to start the container
- Fix: set `--min-replicas 1` (keeps one instance always running, adds ~$3–5/month)

**PDF downloads not working after restart**
- Storage volume is not mounted — check Step 5 was completed
- PDFs stored inside the container are lost on restart

---

## Summary Checklist

- [ ] Azure CLI installed and `az login` done
- [ ] Docker Desktop installed
- [ ] Docker Hub account created
- [ ] Resource group created (`rigpro-rg`)
- [ ] Docker image built and pushed to Docker Hub
- [ ] PostgreSQL server and database created
- [ ] Firewall rule added for Azure services
- [ ] Blob storage created
- [ ] Container App environment created
- [ ] Container App deployed with DATABASE_URL set
- [ ] Live URL retrieved and app opens in browser
- [ ] Login tested with all 3 default accounts
- [ ] Default passwords changed
- [ ] Budget alert set
