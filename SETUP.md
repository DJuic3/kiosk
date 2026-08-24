# Vending Kiosk — Setup Guide

Guide for running the **Angular kiosk UI**, the local **MQTT broker**, and connecting a physical machine that runs the **ARAK vending-sdk**.

No Java backend is required for local development (`useMockData: true`).

---

## Quick links (after `npm start`)

| Screen | URL |
|--------|-----|
| **Customer kiosk (home)** | http://localhost:4200/ |
| **Browse products** | http://localhost:4200/browse |
| **Voucher collect** | http://localhost:4200/voucher |
| **Machine control (dev / MQTT)** | http://localhost:4200/dev/machine |
| **Attendant (staff)** | http://localhost:4200/attendant |
| **Admin login** | http://localhost:4200/admin/login |
| **Admin overview** | http://localhost:4200/admin/overview |
| **Admin operations** | http://localhost:4200/admin/operations |

Also available from the attract screen footer: **Staff**, **Machine control**, **Admin login**.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20 LTS or 22 LTS | Prefer even LTS releases |
| **npm** | Bundled with Node | |
| **Docker Desktop** | Latest | Required for MQTT / physical machines |
| **mosquitto-clients** (optional) | Homebrew: `brew install mosquitto` | For `mosquitto_pub` / `mosquitto_sub` in Terminal |
| **Git** | Any recent | |

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
npm install
```

---

## 2. Start everything

### Terminal A — MQTT broker

```bash
cd vending_machine
docker compose up -d
docker compose ps
```

Broker ports:

| Port | Use |
|------|-----|
| **1883** | Plain MQTT (vending-sdk / `mosquitto_pub`) |
| **9001** | WebSocket MQTT (browser Machine control + kiosk dispense) |

Stop broker:

```bash
docker compose down
```

### Terminal B — Angular app

```bash
cd vending_machine
npm start
```

Open **http://localhost:4200/**

---

## 3. App URLs and demo credentials

### Customer kiosk

- Home: http://localhost:4200/
- Flow: Attract → Browse → Product → Cart → Checkout → Payment → Fiscal → Dispensing → Collect
- With `useMqttDispense: true`, dispensing publishes MQTT to the same broker as Machine control

**Demo vouchers:** `VCH-48291`, `VCH-77310`, `VCH-11902` (expired)

### Machine control (dev)

- http://localhost:4200/dev/machine  
- Connect to broker, set **Machine ID**, send dispense commands without Terminal  
- Settings are saved in the browser (`localStorage`)

### Attendant

- http://localhost:4200/attendant  
- PIN: **`1234`**

### Admin

- Login: http://localhost:4200/admin/login  
- Username: **`admin`**  
- Password: **`Admin@123`**

Admin sections (after login):

| Page | URL |
|------|-----|
| Overview | http://localhost:4200/admin/overview |
| Sales | http://localhost:4200/admin/sales |
| Inventory | http://localhost:4200/admin/inventory |
| Finance | http://localhost:4200/admin/finance |
| Operations | http://localhost:4200/admin/operations |
| Users | http://localhost:4200/admin/users |
| Malfunctions | http://localhost:4200/admin/malfunctions |
| Security | http://localhost:4200/admin/security |
| History | http://localhost:4200/admin/history |

---

## 4. Configuration

Edit `src/environments/environment.ts` (dev) and `environment.prod.ts` (production):

| Key | Meaning |
|-----|---------|
| `useMockData` | Catalogue / admin data from mocks |
| `useMqttDispense` | Kiosk dispense uses MQTT (Machine control path) |
| `mqttHost` | LAN IP of the Mac running Docker Mosquitto |
| `mqttPort` | `1883` for machines |
| `mqttWsUrl` | e.g. `ws://10.251.82.155:9001` for the browser |
| `mqttMachineId` | e.g. `MACHINE002` — must match SDK `MACHINE_ID` |

Find your Mac LAN IP:

```bash
ipconfig getifaddr en0
```

Update `mqttHost` / `mqttWsUrl` when your IP changes (office Wi‑Fi DHCP).

---

## 5. Connect a physical machine (ARAK vending-sdk)

The Angular app does **not** include the SDK. On the vending PC:

1. Install `vending-sdk_*.deb` (ARAK package).
2. Confirm service:

```bash
systemctl status vending-sdk
```

3. Point the SDK at **your Mac’s broker** in `/opt/vending-sdk/config.json`:

```json
{
  "MACHINE_ID": "MACHINE002",
  "SERIAL": {
    "PORT": "/dev/ttyVending",
    "BAUDRATE": 57600
  },
  "MQTT": {
    "HOST": "10.251.82.155",
    "PORT": 1883
  }
}
```

Replace `10.251.82.155` with your current Mac IP and `MACHINE002` with that unit’s ID.

4. Restart:

```bash
sudo systemctl restart vending-sdk
```

5. On the Mac, confirm a **LAN** client appears (not only Docker/`172.19.0.1`):

```bash
docker logs -f vending-mqtt
```

6. Smoke test:

```bash
mosquitto_sub -h 10.251.82.155 -p 1883 -t 'vmc/MACHINE002/#' -v

mosquitto_pub -h 10.251.82.155 -p 1883 \
  -t 'vmc/MACHINE002/commands/ping' \
  -m '{}'
```

Expect `responses/ping` with `"message": "pong"`.

### Useful MQTT commands

**Dispense (one or more selections):**

```bash
mosquitto_pub -h 10.251.82.155 -p 1883 \
  -t 'vmc/MACHINE002/commands/dispense' \
  -m '{"selections":[4,5]}'
```

**Set price:**

```bash
mosquitto_pub -h 10.251.82.155 -p 1883 \
  -t 'vmc/MACHINE002/commands/set_price' \
  -m '{"selections":[4,5],"price":150}'
```

**Clear dispense queue / cancel:**

```bash
mosquitto_pub -h 10.251.82.155 -p 1883 \
  -t 'vmc/MACHINE002/commands/cancel' \
  -m '{}'
```

**Status:**

```bash
mosquitto_pub -h 10.251.82.155 -p 1883 \
  -t 'vmc/MACHINE002/commands/status' \
  -m '{}'
```

Topic pattern: `vmc/{MACHINE_ID}/commands/...`  
Responses: `vmc/{MACHINE_ID}/responses/#`  
Events: `vmc/{MACHINE_ID}/events/#`

Official integration details: ARAK **VENDING SDK Integration Guide** (PDF) and the `vending-sdk_*.deb` installer.

---

## 6. Project layout

```
vending_machine/
├── docker-compose.yml              # Mosquitto broker
├── docker/mosquitto/config/        # mosquitto.conf
├── SETUP.md                        # This guide
├── README.md                       # Short overview
├── src/app/
│   ├── features/kiosk/             # Customer UI
│   ├── features/attendant/         # Staff console
│   ├── features/admin/             # Admin console
│   ├── features/dev/machine-control/  # MQTT UI
│   └── core/services/              # Order, MQTT, mocks
└── src/environments/               # mqttHost, mqttMachineId, flags
```

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Dispense publish OK but machine does nothing | SDK still on `localhost` broker | Set `MQTT.HOST` to Mac LAN IP; restart `vending-sdk` |
| No `responses/ping` | Machine not connected to Mac broker | `docker logs -f vending-mqtt` — need a real LAN IP client |
| `machine_busy` | Previous vend still running | Publish `commands/cancel` |
| `selection_jammed` | Hardware / empty coil | Check spiral & sensors; motor may retry once |
| Machine control won’t connect | Wrong WS URL/port | Use `ws://<mac-ip>:9001` (not `1883`) |
| Port 4200 in use | Another `ng serve` | `npx ng serve --port 4201` |
| Old machine ID in UI | Cached settings | Update fields on `/dev/machine` and Connect, or clear site data |

**Important:** Browsers use **WebSocket port 9001**. Physical SDK uses **plain MQTT port 1883**. Same broker, different ports.

---

## 8. Onboarding checklist

- [ ] `npm install` completed  
- [ ] `docker compose up -d` — ports 1883 and 9001 open  
- [ ] `npm start` — http://localhost:4200/ loads  
- [ ] Open http://localhost:4200/dev/machine and Connect  
- [ ] Attendant PIN `1234` works  
- [ ] Admin `admin` / `Admin@123` works  
- [ ] (Optional) Physical SDK `MACHINE_ID` + `MQTT.HOST` pointed at this Mac  
- [ ] (Optional) `ping` → `pong` on `vmc/<MACHINE_ID>/responses/ping`  
- [ ] (Optional) Test dispense + cancel  

---

## 9. Related docs

- [README.md](./README.md) — project overview and customer journey  
- ARAK VENDING SDK Integration Guide (PDF provided with the SDK)  
- Config on device: `/opt/vending-sdk/config.json`  
- Device logs: `journalctl -u vending-sdk -n 50` and `/var/log/vending-sdk/`
