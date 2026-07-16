# RigPro — Deployment Approval Request
### For: Kevin
### Subject: Cost Approval to Deploy RigPro Safety Management Platform on Azure

---

## What I Am Asking For

Approval to deploy the RigPro digital safety management platform on Microsoft Azure cloud.

- **Annual cost: ~$556/year** to start (~$46/month)
- **One-time setup cost: $0** (no licensing fees, no upfront payment)
- **Time to deploy: 1 day** (infrastructure is already built and tested)

---

## What the Platform Does

RigPro replaces paper-based safety processes with a digital system that covers:

- Job Safety Assessments (JSA) — digital forms with automatic hazard detection
- Equipment inspections — scored automatically, issues flagged and escalated instantly
- Issue and corrective action tracking — nothing gets forgotten
- Real-time dashboard for management visibility
- Full audit trail — every action timestamped and signed
- Works offline on vessels and rigs — syncs when internet reconnects

The system is fully built and currently running on a free test server. This request is to move it to a production environment on Microsoft Azure.

---

## Why RigPro — Not an Off-the-Shelf Product

| Reason | Detail |
|---|---|
| **No per-user fee** | Every competing platform (SafetyCulture, Intelex, Cority) charges per user per month. RigPro has a flat hosting cost — adding 10 or 100 users costs nothing extra. |
| **Built for our operations** | Designed specifically for vessel and rig environments — offline-first so field workers on boats with no internet can still complete inspections and JSAs and sync when back in range. |
| **Already built and owned** | The platform is fully developed and tested. There is no additional development cost to deploy. We own the code — no vendor can increase prices, change features, or discontinue the product. |
| **Customisable** | Inspection templates, hazard questions, and escalation rules can be changed by our team at any time without paying a vendor for customisation work. |
| **No lock-in** | The app runs on standard open-source technology (Python, PostgreSQL, Docker). It can be moved to any cloud provider or hosted on-premise at any time. |

---

## Current Situation (The Cost of Doing Nothing)

Without a digital system, every day the team faces:

| Risk | Business Impact |
|---|---|
| No audit trail when incidents occur | Legal exposure — cannot prove compliance |
| Inspections done inconsistently on paper | Hazards missed, no escalation path |
| Issues raised on-site get forgotten | Risks recur, no documented resolution |
| Management gets paper summaries, not live data | Cannot act in real time |

One undetected hazard leading to a workplace incident costs **$50,000–$200,000** in legal, compensation, and downtime costs. The entire platform pays for itself if it prevents a single incident.

---

## Cost Comparison

### Option A — Buy an Off-the-Shelf Solution (SafetyCulture iAuditor)

SafetyCulture is the industry standard SaaS platform. It charges **per user, per month**.

| Users | SafetyCulture Cost | RigPro on Azure |
|---|---|---|
| 35 users (today) | **$10,500 / year** | **$556 / year** |
| 100 users (growth target) | **$30,000 / year** | **$730 / year** |
| 200 users (long term) | **$60,000 / year** | **$1,450 / year** |

RigPro has **no per-user fee**. Adding 65 more people to the team costs nothing extra.

### Option B — Deploy RigPro on Azure (Recommended)

**App Service tier — recommending B2 over the entry-level B1:**

| Basic Service Plan | Cores | RAM | Storage | Monthly Cost |
|---|---|---|---|---|
| B1 | 1 | 1.75 GB | 10 GB | $13.14 |
| **B2 (Recommended)** | **2** | **3.50 GB** | **10 GB** | **$25.55** |
| B3 | 4 | 7 GB | 10 GB | $51.10 |

B1's single core is fine for light, steady traffic, but it queues requests when several vessels sync offline data at the same time or when a PDF inspection report is being generated while other users are working — exactly the moments a safety tool can't afford to feel slow. B2 doubles the cores and RAM for about **$12/month (~$150/year) more**, which is cheap insurance against that. B3 is more capacity than we need at 35–100 users and can be considered later if we grow well past the 200-user long-term target.

| Cost Item | Monthly | Annual |
|---|---|---|
| Azure App Service (B2 — runs the application) | ~$25.55 | ~$307 |
| Azure PostgreSQL (database) | ~$12 | ~$144 |
| Azure Blob Storage (PDFs and files) | ~$0.50 | ~$6 |
| Backup (extended 35-day retention for audit/compliance) | ~$2 | ~$24 |
| Domain name (custom domain, e.g. rigpro.northsails.com) | ~$1.25 | ~$15 |
| Maintenance & monitoring (Azure Monitor / alerting) | ~$5 | ~$60 |
| Azure account setup | $0 | $0 |
| Software license | $0 | $0 |
| **Total** | **~$46** | **~$556** |

Notes:
- **Backup:** Azure PostgreSQL includes 7 days of automatic backups free. The extra ~$24/year buys extended 35-day retention, which matters for a safety system — if an incident is investigated weeks later, we want the inspection/JSA history available.
- **Domain:** using a subdomain of an existing company domain (e.g. `rigpro.northsails.com`) costs $0. A standalone domain (e.g. `rigpro-safety.com`) runs ~$15/year through a registrar. SSL is free either way via Azure's managed certificates.
- **Maintenance:** day-to-day upkeep (deploying code updates, applying patches) is done in-house by our own developer at no extra cost — that's the same "one command" upgrade path already described below. The ~$60/year here is just for Azure Monitor/alerting so we get notified automatically if something goes down, rather than finding out from a user.

---

## Cost Over Time — Your Specific Numbers

Based on the current team of 35 users and expected growth to 100+:

| Timeframe | Users | Inspections/Day | Annual Cost |
|---|---|---|---|
| Now | 35 | 1–5 | **~$560** |
| 6–18 months | 50–100 | 5–10 | **~$730** |
| 2–3 years | 100+ | 10–20 | **~$1,450** |

Costs only increase when the number of **simultaneous users** grows — not when inspection volume increases. Going from 1 inspection/day to 10 inspections/day adds less than $12/year.

---

## 3-Year Cost Comparison

| | SafetyCulture (35 → 100 users) | RigPro on Azure |
|---|---|---|
| Year 1 | ~$15,000 | **~$610** |
| Year 2 | ~$24,000 | **~$730** |
| Year 3 | ~$30,000 | **~$850** |
| **3-Year Total** | **~$69,000** | **~$2,190** |

**Estimated 3-year saving: ~$66,800**

---

## Risk and Reliability

| Concern | Answer |
|---|---|
| What if Azure goes down? | Azure SLA guarantees 99.95% uptime (~4 hours downtime/year). Field workers can continue offline and sync when back online. |
| Who maintains it? | Azure manages all server infrastructure. Code updates are one command by an internal developer. |
| Is data backed up? | Yes — automatic daily backups. 7-day retention is included free; we're budgeting ~$24/year to extend that to 35 days for audit/investigation purposes. |
| Can we move away from Azure later? | Yes. The app runs on standard Docker containers and works on any cloud platform or on-premise server. No vendor lock-in. |
| What if the team grows faster than expected? | Upgrading the server tier is one command — takes 2 minutes, no downtime. |

---

## What I Need From You

- [ ] Approval to spend **~$556/year** (~$46/month) on Azure services starting from deployment date, including the B2 App Service tier, extended backups, domain, and monitoring
- [ ] Confirmation that the budget can scale to **~$730/year** (~$61/month) when the team reaches 100 users
- [ ] Approval to create an Azure subscription under the company account (or confirmation of which existing account to use)

---

## Next Step

Once cost approval is received, I will proceed to get technical approval from Malishini and schedule the deployment for a low-activity period.

**Prepared by:** Vinuki Thiranya
**Date:** July 2026
