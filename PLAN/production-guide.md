# WorkspaceOps — Production Readiness Guide

> Reference document covering Docker, CI/CD, Testing, Load Testing, and Scaling.
> Answers all doubts. Includes a 24-hour implementation TODO at the bottom.

---

## The Big Picture — Recommended Order

```
✅ 1. Docker          → Package app into a portable container
🔜 2. Manual Deploy  → Backend → EC2 (SSH + Docker + Nginx), Frontend → Vercel
🔜 3. CI/CD          → Automate what you just did manually
🔜 4. Rate Limiting  → Protect API from abuse (3 lines of code)
🔜 5. Understand Tests → Read + write tests yourself, don't just rely on AI
🔜 6. Load Testing   → Simulate 100–1000 users, find your breaking point
🔜 7. Scale          → Fix bottlenecks found in step 6 (PM2 cluster or multi-container)
```

**Rule:** Deploy manually first. CI/CD just automates what you already know how to do. Never scale before you load test.

---

## DONE — Docker Summary

Three files created:

| File | Purpose |
|------|---------|
| `Dockerfile` | 2-stage build: compile TS → production image |
| `docker-compose.yml` | Easy run management (`docker compose up`) |
| `.dockerignore` | Keeps `.env`, `node_modules`, `dist` out of image |

Key commands:
```bash
docker compose up --build    # first time
docker compose up -d         # background (detached)
docker compose down          # stop
docker compose logs -f       # follow logs
```

---

## NEXT — Manual Deploy (Backend → EC2 via SSH, Frontend → Vercel)

> Do this before CI/CD. CI/CD just automates these same steps.

### Your EC2 situation
- Already running: e-commerce project, managed by PM2, Nginx in front
- Goal: add workspaceops-backend in a **separate folder**, run it with Docker on port 4000, add a new Nginx block for it
- SSH access: `ssh -i permission.pem ec2-user@your-ec2-ip` (same as always)

### EC2 folder layout after this
```
/home/ec2-user/
  ├── ecommerce/               ← existing project (PM2, untouched)
  └── workspaceops-backend/   ← new project (Docker)
```

---

### Part A — Deploy Backend to EC2

#### Step 1: SSH in (same as you always do)
```bash
ssh -i permission.pem ec2-user@YOUR-EC2-IP
```

#### Step 2: Install Docker on EC2

Check if already installed:
```bash
docker --version
```

If not — **Amazon Linux 2** (most common free tier):
```bash
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
exit   # must log out for group change to take effect
```

SSH back in, then install Docker Compose plugin:
```bash
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
docker compose version   # should print version
```

#### Step 3: Clone repo into its own folder
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/workspaceops-backend.git
cd workspaceops-backend
```

#### Step 4: Create `.env`
```bash
nano .env
```
Paste all your production env vars:
```
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=https://your-app.vercel.app   ← fill in after Vercel deploy
```
Save: `Ctrl+X` → `Y` → `Enter`

#### Step 5: Create a backend-only `docker-compose.yml`

> Your LOCAL docker-compose.yml has a frontend service with a local absolute path
> that doesn't exist on EC2. Create a clean backend-only file on the server.

```bash
nano docker-compose.yml
```

```yaml
services:
  backend:
    build: .
    image: workspaceops-backend:latest
    container_name: workspaceops-backend
    ports:
      - "4000:4000"
    env_file:
      - .env
    volumes:
      - uploads_data:/app/uploads
    restart: unless-stopped

volumes:
  uploads_data:
```

#### Step 6: Build and start
```bash
docker compose up -d --build
```
First build takes ~2-3 minutes (compiles TypeScript inside Docker).

Verify:
```bash
docker compose logs -f            # watch startup logs (Ctrl+C to exit)
curl http://localhost:4000/health  # should return {"status":"ok"}
```

---

### Part B — Configure Nginx + Domain + HTTPS

Your domain: **`workspaceops.ashwinv.me`** → backend API URL.
Frontend is already on Vercel with a placeholder `NEXT_PUBLIC_API_URL` — update it after SSL is up.

No conflicts with the e-commerce site since Nginx routes by `server_name` (different domain).

#### Step 1: Point DNS to your EC2 AND Vercel

In your DNS provider (wherever `ashwinv.me` is managed), add **two records**:

**Record 1 — frontend (Vercel):**
```
Type:   CNAME
Name:   workspaceops
Value:  cname.vercel-dns.com
TTL:    300
```

**Record 2 — backend API (EC2):**
```
Type:   A
Name:   api
Value:  YOUR-EC2-PUBLIC-IP
TTL:    300
```

Result:
- `workspaceops.ashwinv.me` → Vercel (your frontend — what users see)
- `api.ashwinv.me` → your EC2 (your backend — called silently by the frontend)

Test after 1-5 min:
```bash
ping api.ashwinv.me   # should resolve to your EC2 IP
```

#### Step 2: Create Nginx config for the backend API (HTTP first, Certbot adds HTTPS next)
```bash
sudo nano /etc/nginx/conf.d/workspaceops-api.conf
```

```nginx
server {
    listen 80;
    server_name api.ashwinv.me;

    location / {
        proxy_pass http://localhost:4000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # REQUIRED for Socket.io / WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        # Keep WebSocket connections alive
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
curl http://api.ashwinv.me/health   # {"status":"ok"}
```

#### Step 3: Add HTTPS with Let's Encrypt (Certbot)

```bash
# Install Certbot (Amazon Linux 2)
sudo amazon-linux-extras install epel -y
sudo yum install -y certbot python-certbot-nginx

# Get SSL cert + auto-configure Nginx
sudo certbot --nginx -d api.ashwinv.me
```

When asked about redirect: choose **2 (Yes, redirect HTTP → HTTPS)**.

Certbot auto-edits your Nginx config to add SSL and sets up auto-renewal (certs last 90 days).

```bash
curl https://api.ashwinv.me/health   # HTTPS confirmed
```

Ensure ports **80** and **443** are open in AWS Security Group.

---

### Part C — Connect Custom Domain on Vercel + Update API URL

#### Step 1: Add your custom domain to Vercel

1. **vercel.com** → your project → **Settings** → **Domains**
2. Type `workspaceops.ashwinv.me` → Add
3. Vercel verifies the CNAME you added — turns green within a few minutes

#### Step 2: Update API URL env var in Vercel

1. **vercel.com** → your project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_API_URL` → Edit:
   ```
   https://api.ashwinv.me
   ```
3. Save → **Deployments** → **Redeploy** (or push any commit)

#### Step 3: Update backend CORS to allow your real frontend URL
```bash
ssh -i permission.pem ec2-user@YOUR-EC2-IP
cd ~/workspaceops-backend
nano .env
# Set: FRONTEND_URL=https://workspaceops.ashwinv.me
docker compose up -d
```

---

### Verification Checklist

- [ ] `curl https://api.ashwinv.me/health` → `{"status":"ok"}`
- [ ] `https://workspaceops.ashwinv.me` loads the frontend (custom domain on Vercel)
- [ ] HTTPS works on both — no browser SSL warnings
- [ ] Frontend calls `https://api.ashwinv.me` — visible in browser DevTools → Network tab
- [ ] Login works end-to-end
- [ ] Real-time features work — Socket.io connects over `wss://api.ashwinv.me`

**If CORS errors:** `FRONTEND_URL` in `.env` on EC2 must exactly match `https://workspaceops.ashwinv.me` (no trailing slash).
**If WebSocket fails after HTTPS:** Socket.io auto-upgrades to `wss://` when the page is on `https://` — works automatically if `NEXT_PUBLIC_API_URL` is `https://api.ashwinv.me`.

---

### Architecture After This Step

```
User types: workspaceops.ashwinv.me
  │
  ├── HTTPS → Vercel CDN → Next.js frontend
  │              (auto-deploys on push, free SSL, global CDN)
  │
  │   Frontend JS makes API calls to: api.ashwinv.me
  │
  └── HTTPS + WSS → api.ashwinv.me:443
                         │
                       Nginx (SSL termination by Certbot)
                         │
                ┌────────┴────────┐
                │                 │
         workspaceops-backend   e-commerce
         (Docker, port 4000)    (PM2, port 3000)
                │
          MongoDB Atlas
```

**Key insight:** Users only ever see `workspaceops.ashwinv.me`. The `api.ashwinv.me` subdomain is invisible to users — it's called silently by the frontend JavaScript in the browser.

---

## How GitHub Actions SSHes Into EC2 Without the .pem File

**Short answer:** You paste the full content of `permission.pem` into a GitHub Secret. GitHub Actions uses it as the private key — exactly like your SSH client uses the file locally.

### How it works

Your `.pem` IS a private key. AWS put its matching public key into `~/.ssh/authorized_keys` on the EC2 when you created the instance. When you SSH in, your machine proves ownership of the private key without ever sending it over the network.

GitHub Actions does the same — it just reads the key from a Secret instead of a local file.

### What to put in the secret

```
Secret name:  EC2_SSH_KEY
Secret value: (full contents of permission.pem — copy the ENTIRE file including header/footer)
```

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1234...
...abcd1234
-----END RSA PRIVATE KEY-----
```

### All GitHub Secrets needed (repo → Settings → Secrets → Actions)

| Secret | Value |
|--------|-------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub Access Token (create in Docker Hub → Account → Security — NOT your login password) |
| `EC2_HOST` | `api.ashwinv.me` (or your EC2 IP directly) |
| `EC2_SSH_KEY` | Full contents of `permission.pem` |

---

## CI/CD — What It Is and How It Works

### The Concept

Right now your deploy workflow is manual:
```
write code → push to GitHub → SSH into EC2 → git pull → npm run build → restart
```

That's 5 manual steps every single deploy. CI/CD automates all of it:
```
git push → GitHub runs a robot → tests pass → image built → EC2 updated automatically
```

**CI = Continuous Integration**
Every time you push code, a robot automatically:
- Installs dependencies
- Runs TypeScript type check
- Runs your tests
- Builds the Docker image
→ If anything fails, it tells you immediately. Code never reaches the server broken.

**CD = Continuous Delivery/Deployment**
After CI passes, another step automatically:
- Pushes the Docker image to Docker Hub (a registry)
- SSHs into your EC2
- Pulls the new image
- Restarts the container

**Tool: GitHub Actions** — free, lives inside your GitHub repo as a `.yml` file. No extra service needed.

### The Full Pipeline (what you'll build)

```
git push to main
    │
    ▼
GitHub Actions triggers
    │
    ├── Step 1: npm ci
    ├── Step 2: npx tsc --noEmit       (TypeScript check)
    ├── Step 3: docker build            (build the image)
    ├── Step 4: docker push → Docker Hub (store the image)
    │
    ▼
SSH into EC2
    ├── Step 5: docker pull             (download new image)
    └── Step 6: docker compose up -d   (restart with new image)
```

### The YAML File Structure (GitHub Actions)

Lives at: `.github/workflows/deploy.yml` in your repo.

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]          # triggers only on push to main

jobs:
  deploy:
    runs-on: ubuntu-latest    # GitHub provides a fresh Ubuntu VM for free

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: yourdockerhubusername/workspaceops-backend:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ec2-user/workspaceops-backend
            docker compose pull
            docker compose up -d
```

**Secrets** (`${{ secrets.X }}`) are environment variables stored securely in GitHub (Settings → Secrets). Never in code.

---

## DOUBT 1 — Separate GitHub Repos: How Does CI/CD Work?

You have two separate repos:
- `github.com/you/workspaceops-backend`
- `github.com/you/workspaceops-frontend`

**Each repo gets its own independent CI/CD pipeline.** They don't know about each other.

```
backend repo push  →  backend GitHub Actions  →  builds backend image  →  deploys backend
frontend repo push →  frontend GitHub Actions →  builds frontend image →  deploys frontend
```

The `Dockerfile` in each repo only deals with its own code:
- Backend `Dockerfile`: `COPY . .` copies only the backend repo (that's the context)
- Frontend `Dockerfile`: `COPY . .` copies only the frontend repo

**The `docker-compose.yml` with `context: /home/ashwin/Projects/workspaceops-frontend` is for LOCAL development only.**
On the server, each app runs from its own directory with its own compose file.

### The local docker-compose.yml vs production

| Situation | How it works |
|-----------|-------------|
| **Local dev** | One `docker-compose.yml` that references both local folders by absolute path |
| **Production (EC2)** | Backend EC2 has its own `docker-compose.yml`. Frontend has its own. They talk to each other via URLs, not filesystem paths. |

On EC2, your backend `docker-compose.yml` has NO reference to the frontend at all. The frontend calls the backend via `NEXT_PUBLIC_API_URL=http://your-ec2-ip:4000`.

---

## DOUBT 2 — Where Should You Deploy?

### Recommended Architecture

```
Frontend → Vercel (free, zero config for Next.js)
Backend  → Your existing EC2 (free tier, already have it)
Database → MongoDB Atlas (already there)
```

**Why Vercel for frontend?**
- Next.js is made by the same company as Vercel — zero-config deploy
- Free tier is generous
- Just connect your GitHub repo — it auto-deploys on every push
- No Docker needed for frontend at all (Vercel handles it)
- SSL, CDN, edge caching — all automatic

**Why EC2 for backend?**
- You already have it running
- Docker works perfectly on EC2
- Full control over the environment
- Free tier (t2.micro or t3.micro)

### The Communication

```
Browser → Vercel (frontend: Next.js)
              │
              │ API calls to http://your-ec2-ip:4000
              ▼
        EC2 (backend: Express.js in Docker)
              │
              │ MongoDB Atlas connection string
              ▼
        MongoDB Atlas (cloud DB)
```

---

## DOUBT 3 — Docker vs PM2 on EC2

### What PM2 does
PM2 is a **process manager for Node.js**. It:
- Keeps your Node process alive (restarts on crash)
- Can run multiple processes using all CPU cores (cluster mode)
- Logs management
- Starts on server reboot

### What Docker replaces
Docker with `restart: unless-stopped` and `systemctl enable docker`:
- Keeps your container alive (restarts on crash) — **replaces PM2 crash recovery**
- Starts on server reboot — **replaces PM2 startup**
- Isolated environment

### The answer: Don't mix them for the same app

| Scenario | What to use |
|----------|------------|
| **e-commerce (existing, non-Docker)** | Keep using PM2, don't touch it |
| **workspaceops-backend (new, Docker)** | Use Docker. No PM2 for this app. |

They coexist fine on the same EC2 — PM2 manages the old app, Docker manages the new app.

### Yes, `docker compose up -d` is how you run it on EC2

```bash
# On EC2 — that's it
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Update to new version (after CI/CD pushes new image)
docker compose pull && docker compose up -d
```

The `-d` flag = detached = runs in background. Your SSH session can close and the container keeps running. This is the Docker equivalent of `pm2 start`.

### Make Docker start automatically on server reboot

```bash
# On EC2 — run once
sudo systemctl enable docker
```

After this: if EC2 reboots, Docker starts → `restart: unless-stopped` in compose → container starts. Nothing else needed.

---

## DOUBT 4 — Vercel + Socket.io Client

The frontend is only the **Socket.io client**. The socket server lives on the backend (EC2).

```
Browser loads Next.js from Vercel
    │
    │  browser JS connects to:
    │  socket.connect("http://your-ec2-ip:4000")
    ▼
EC2 Backend (Socket.io SERVER) ← the persistent connection lives here
```

Vercel never holds the WebSocket connection — the **browser** does. Vercel just delivers the JS files.

**Free tier: Yes, works fine.**

**One thing to update:** backend CORS must allow the Vercel domain.
Change in `.env` when deploying:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## Testing — What AI Wrote vs What You Should Learn

### What the existing tests are

The 29 HLR tests are **integration tests** — they:
- Start the real Express app
- Make real HTTP requests (using Supertest)
- Hit the real MongoDB database
- Assert on the response (status code, body shape)

These are valuable, but **you didn't write them** — so you don't fully understand them yet.

### Testing Types — Full Picture

| Type | What it checks | Tool | When |
|------|---------------|------|------|
| **Unit test** | One function in isolation, dependencies mocked | Jest | During development |
| **Integration test** | Multiple layers together (controller + service + DB) | Jest + Supertest | During development |
| **E2E (End-to-End)** | Full user journey from browser click to DB write | Playwright / Cypress | Before release |
| **Load test** | "Can it handle 500 concurrent users?" | k6 / Artillery | Before production |
| **Stress test** | Push past the limit — find where it breaks | k6 | Before production |
| **Spike test** | Sudden burst: 0 → 10,000 users instantly | k6 | Before production |
| **Soak test** | Steady load for hours — find memory leaks | k6 | Before production |

Your existing tests are integration tests. You're missing load tests entirely.

### What to learn to truly understand testing

**Step 1: Jest basics** (1 hour)
- `describe()` — groups related tests
- `it()` / `test()` — a single test case
- `expect()` — the assertion (what you check)
- `beforeAll()` / `afterAll()` — setup/teardown once per file
- `beforeEach()` / `afterEach()` — setup/teardown before each test
- Matchers: `.toBe()`, `.toEqual()`, `.toContain()`, `.toHaveBeenCalled()`

**Step 2: Read your own test files** (1 hour)
- Open any test file in your project
- Trace each test: what endpoint does it call? What does it assert?
- Find the `beforeAll` — how does it set up the DB? How does it authenticate?

**Step 3: Write a test yourself** (1 hour)
- Pick one endpoint that has NO test yet, or write a new test for an existing one
- Write it from scratch without copying
- This is the only way to truly understand it

**Step 4: k6 for load testing** (2 hours)
- Install k6 (`sudo pacman -S k6`)
- Understand virtual users (VUs) and duration
- Write a basic script
- Understand the output metrics (p95, p99, req/s, error rate)

### What AI-written tests miss that you should know

1. **They don't test edge cases you haven't thought of** — AI writes tests based on what you described. Real bugs live in unspecified behavior.
2. **You can't debug them if they fail** — if a test breaks 6 months later, you need to understand it to fix it.
3. **No load tests** — AI wrote correctness tests. Performance is untested.

---

## Load Testing with k6

### Install
```bash
# Arch Linux
sudo pacman -S k6
```

### Basic test structure
```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up to 10 users over 30s
    { duration: '1m',  target: 100 },  // ramp up to 100 users over 1 min
    { duration: '30s', target: 0 },    // ramp down
  ],
}

export default function () {
  const res = http.get('http://localhost:4000/health')
  check(res, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
```

Run: `k6 run load-test.js`

### What the output means
```
http_req_duration  avg=45ms  p95=120ms  p99=350ms   ← response times (p95 = 95% of requests took < 120ms)
http_reqs          823/s                             ← throughput (requests per second)
http_req_failed    0.5%                              ← error rate (should be 0% ideally)
```

**Start small:** 10 users → 100 → 1000. Find where errors start appearing. That's your current limit.

---

## 24-Hour Learning & Implementation TODO

> Realistic breakdown. Each block includes learning + doing.
> Don't skip the learning parts — reading docs for 30 min before coding saves 3 hours of debugging.

---

### Block 1 — CI/CD Setup (6 hours)

- [ ] **[30 min]** Read: https://docs.github.com/en/actions/writing-workflows/quickstart
  - Understand: triggers (`on`), jobs, steps, `uses` vs `run`
- [ ] **[30 min]** Create Docker Hub account → create a repository named `workspaceops-backend`
  - Create an Access Token (Account Settings → Security → Access Tokens)
- [ ] **[30 min]** Add GitHub Secrets to backend repo (Settings → Secrets → Actions):
  - `DOCKER_USERNAME`
  - `DOCKER_PASSWORD` (the Docker Hub token, not your password)
  - `EC2_HOST` (your EC2 public IP)
  - `EC2_SSH_KEY` (your `.pem` file contents)
- [ ] **[1 hr]** Create `.github/workflows/deploy.yml` in backend repo (see YAML above)
- [ ] **[1 hr]** On EC2: install Docker, `systemctl enable docker`, create `docker-compose.yml` that pulls from Docker Hub (not builds locally)
- [ ] **[2 hrs]** Push to main, watch GitHub Actions run, debug any failures
  - Common issues: wrong secret names, EC2 security group not allowing port 4000, SSH key format

---

### Block 2 — Rate Limiting (1 hour)

- [ ] **[15 min]** Read: https://www.npmjs.com/package/express-rate-limit
- [ ] **[30 min]** Install and add to `src/server.ts` or `src/app.ts`:
  ```bash
  npm install express-rate-limit
  ```
- [ ] **[15 min]** Test it: hit an endpoint 10 times quickly, verify you get 429 response

---

### Block 3 — Understand Your Tests (3 hours)

- [ ] **[1 hr]** Read Jest docs: https://jestjs.io/docs/getting-started (only "Getting Started" + "Using Matchers")
- [ ] **[1 hr]** Open your test files. For each one:
  - What does `beforeAll` do?
  - What endpoint is being tested?
  - What are the assertions checking?
  - Could the test be fooled by a bug?
- [ ] **[1 hr]** Write 2 new tests yourself from scratch for any 2 endpoints
  - Don't copy-paste. Type it out. This forces understanding.

---

### Block 4 — Load Testing (4 hours)

- [ ] **[30 min]** Install k6: `sudo pacman -S k6`
- [ ] **[30 min]** Read k6 docs intro: https://grafana.com/docs/k6/latest/get-started/running-k6/
- [ ] **[1 hr]** Write 3 load test scripts:
  - Test 1: GET /health (baseline — no auth needed)
  - Test 2: POST /auth/login (auth flow)
  - Test 3: GET a protected resource (with Bearer token)
- [ ] **[1 hr]** Run tests at: 10 VUs → 100 VUs → 500 VUs
  - Record: avg response time, p95, error rate at each level
- [ ] **[1 hr]** Document results in a table — this tells you if/what to scale

---

### Block 5 — Scale if Needed (2 hours, conditional)

**Only do this if load test shows errors at your expected traffic level.**

- [ ] **[30 min]** Check what's the bottleneck from load test results:
  - High CPU? → PM2 cluster mode (multiple Node processes)
  - High response time? → Check slow MongoDB queries
  - Memory? → Check for memory leaks
- [ ] **[1.5 hrs]** Fix the bottleneck:
  - For CPU: add `--cluster` flag or use multiple Docker replicas with Nginx
  - For DB: add indexes to MongoDB collections

---

### Buffer — 8 hours

For sleep, breaks, unexpected issues, debugging CI/CD pipeline failures (they always happen the first time).

---

## Quick Reference — Commands Cheatsheet

```bash
# Docker (local)
docker compose up --build      # build + start
docker compose up -d           # background
docker compose down            # stop
docker compose logs -f         # logs
docker exec -it workspaceops-backend sh  # shell into container

# Docker (EC2)
docker compose pull            # pull latest image from Docker Hub
docker compose up -d           # start/restart
docker system prune            # clean old images

# k6
k6 run load-test.js            # run load test

# GitHub Actions
# Triggered automatically on git push to main
# View runs at: github.com/you/repo/actions
```
