# Vending Kiosk — Setup Guide

This guide walks a new developer through running the **vending-kiosk** frontend locally and optionally starting the **MQTT broker** used to talk to physical vending machines.

The Angular app runs in **mock-data mode** by default. No Java backend is required for local development.

---

## What you get

| Component | Purpose |
|-----------|---------|
| **Customer kiosk UI** | Touchscreen purchase flow (browse → pay → dispense → collect) |
| **Attendant console** | Staff PIN login, GRV restock, maintenance actions |
| **Admin console** | Sales, inventory, finance, operations, users |
| **Docker / Mosquitto** | Local MQTT broker simulating the company server |

---

## Prerequisites

Install these before you begin:

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20 LTS or 22 LTS | Avoid odd-numbered Node versions for production builds |
| **npm** | Comes with Node | Used for dependencies and scripts |
| **Docker Desktop** | Latest | Required only if you need MQTT / machine integration |
| **Git** | Any recent | To clone the repository |

Verify installations:

```bash
node -v
npm -v
docker --version
docker compose version
```

---

## 1. Get the code

```bash
git clone <repository-url>
cd vending_machine
```

If you already have the repo, pull the latest changes and install dependencies:

```bash
npm install
```

---

## 2. Start the frontend (required)

```bash
npm start
```

This runs `ng serve` and opens the app at:

**http://localhost:4200**

The dev server reloads automatically when you change source files.

### Production build (optional)

```bash
npm run build
```

Output is written to `dist/vending-kiosk/browser`. Serve that folder in a fullscreen browser or WebView on a kiosk tablet.

---

## 3. Start Docker / MQTT (optional)

Docker runs a **Mosquitto** broker so a real vending PC can connect over the LAN. The Angular UI does **not** use MQTT directly — only the machine SDK does.

From the project root:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Stop when finished:

```bash
docker compose down
```

### Broker details

| Setting | Value |
|---------|-------|
| Container name | `vending-mqtt` |
| Port | `1883` (plain MQTT) |
| Config | `docker/mosquitto/config/mosquitto.conf` |
| Auth | Anonymous (dev only) |

### Find your Mac’s LAN IP

Machines on the network must connect to your host IP, not `localhost`:

```bash
ipconfig getifaddr en0
```

Example: `10.251.82.27` → machines use **`10.251.82.27:1883`**.

### Test MQTT locally

**Option A — Browser UI (recommended)**

Open **http://localhost:4200/dev/machine**, click **Connect**, then **Send dispense**. No terminal commands needed for publish/subscribe.

**Option B — Terminal**

Subscribe (leave running in one terminal):

```bash
docker exec -it vending-mqtt mosquitto_sub -t 'vmc/MACHINE001/#' -v
```

Publish a test dispense command (another terminal):

```bash
docker exec -it vending-mqtt mosquitto_pub \
  -t 'vmc/MACHINE001/commands/dispense' \
  -m '{"selections":[12]}'
```

You should see the message on the subscriber. If the physical machine does nothing, the machine is not connected to your broker yet — see [MQTT troubleshooting](#mqtt-troubleshooting) below.

### Watch for machine connections

```bash
docker logs -f vending-mqtt
```

A successful machine connection looks like:

```text
New connection from 10.251.82.XX on port 1883.
New client connected from 10.251.82.XX as ...
```

Until you see a LAN IP (not only `127.0.0.1` or `192.168.65.1`), publishes from your Mac will not reach the machine.

---

## 4. Configuration

Environment settings live in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',   // future Java API
  edgeApiUrl: 'http://localhost:8090/api/v1',   // future edge service
  useMockData: true,                             // all data from mocks
  machineId: 'KIOSK-001',
  sessionTimeoutSeconds: 120,
};
```

| Flag | Default | Meaning |
|------|---------|---------|
| `useMockData` | `true` | Catalogue, orders, admin data come from in-app mocks |
| `machineId` | `KIOSK-001` | Shown on receipts and ops records |
| `sessionTimeoutSeconds` | `120` | Idle timeout before returning to attract screen |

When a real backend is available, set `useMockData: false` and point `apiBaseUrl` / `edgeApiUrl` at your services.

---

## 5. Access URLs and demo credentials

### Customer kiosk

| URL | Description |
|-----|-------------|
| http://localhost:4200 | Attract / home screen |
| http://localhost:4200/browse | Product catalogue |
| http://localhost:4200/voucher | Collect with voucher code |

**Customer flow:** Attract → Browse → Product → Cart → Checkout → Payment → Fiscal receipt → Dispensing → Collect (or Refund on failure).

**Demo voucher codes:** `VCH-48291`, `VCH-77310`, `VCH-11902` (expired).

### Attendant (staff)

| URL | http://localhost:4200/attendant |
| PIN | `1234` |

Features: machine health, stock overview, self-test, clear jam, GRV restock, maintenance mode.

Also reachable from **Staff** on the attract screen footer.

### Admin

| URL | http://localhost:4200/admin/login |
| Username | `admin` |
| Password | `Admin@123` |

After login, sidebar sections include Overview, Sales, Inventory, Finance, **Operations** (credit notes, reservations, GRV history), Users, Malfunctions, Security, History.

---

## 6. Project structure

```
vending_machine/
├── docker/
│   └── mosquitto/config/mosquitto.conf   # MQTT broker config
├── docker-compose.yml                    # Mosquitto service
├── public/images/                        # Logos and product images
├── src/
│   ├── app/
│   │   ├── core/                         # Models, services, mock data
│   │   ├── features/
│   │   │   ├── kiosk/                    # Customer UI
│   │   │   ├── attendant/                # Staff console
│   │   │   └── admin/                    # Admin console
│   │   ├── shared/                       # Buttons, pipes, Yamurai assistant
│   │   └── app.routes.ts
│   └── environments/                     # environment.ts / environment.prod.ts
├── package.json
└── SETUP.md                              # This file
```

---

## 7. Common npm scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build to `dist/` |
| `npm run watch` | Dev build with file watching |
| `npm test` | Unit tests (Karma) |

---

## 8. Troubleshooting

### `npm install` or `npm start` fails

- Use Node 20 or 22 LTS.
- Delete `node_modules` and reinstall:

  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Port 4200 already in use

```bash
npx ng serve --port 4201
```

### Docker container won’t start

- Ensure Docker Desktop is running.
- Check if port 1883 is taken:

  ```bash
  lsof -nP -iTCP:1883 -sTCP:LISTEN
  ```

- Restart the stack:

  ```bash
  docker compose down
  docker compose up -d
  ```

### MQTT troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `mosquitto_pub` succeeds but machine idle | No machine subscribed | Configure machine broker host to your LAN IP + port 1883 |
| No LAN IP in `docker logs vending-mqtt` | Machine not reaching broker | Same Wi‑Fi/VLAN; test `nc -zv <mac-ip> 1883` from machine |
| Connection refused from machine | Firewall or wrong IP | Mac firewall off or allow 1883; use `ipconfig getifaddr en0` |
| Wrong machine id in topic | Topic mismatch | Use `vmc/<MACHINE_ID>/commands/dispense` matching machine config |

**Important:** Publishing from inside the Docker container only proves Mosquitto works on your Mac. The vending PC must maintain its own MQTT client connection.

### App redirects to home unexpectedly

Customer sessions idle out after **2 minutes** (configurable via `sessionTimeoutSeconds`). Active payment, dispense, and collect steps are protected from timeout.

### Admin login fails

Credentials are hard-coded for demo: `admin` / `Admin@123`. Clear session storage in the browser if a stale session causes issues.

---

## 9. Full local stack (quick reference)

Run these in **two terminals**:

**Terminal 1 — MQTT (optional):**

```bash
cd vending_machine
docker compose up -d
```

**Terminal 2 — Frontend:**

```bash
cd vending_machine
npm install   # first time only
npm start
```

Open http://localhost:4200 and verify the attract screen loads.

---

## 10. What is not included yet

This repository is **frontend-only** with mock data. These require separate backend / hardware integration:

- Java API (`localhost:8080`) and edge service (`localhost:8090`)
- ZIMRA fiscal device / live fiscalisation
- ERP / IMS stock sync
- Super App voucher API
- Physical dispense camera and UPS monitoring

The UI includes demo flows for fiscal receipts, dispense retry, refunds, vouchers, GRV, and Yamurai assistant so product and ops journeys can be tested without live integrations.

---

## Support checklist for new team members

- [ ] Node.js and npm installed
- [ ] `npm install` completed without errors
- [ ] `npm start` → http://localhost:4200 loads
- [ ] Completed a test purchase through to Collect
- [ ] Logged into Attendant with PIN `1234`
- [ ] Logged into Admin with `admin` / `Admin@123`
- [ ] (Optional) `docker compose up -d` and broker shows on port 1883
- [ ] (Optional) Machine connects and appears in `docker logs vending-mqtt`

For day-to-day usage after setup, see [README.md](./README.md).
