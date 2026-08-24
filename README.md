# Self-Service Vending Kiosk — Frontend

Angular touchscreen UI for self-service vending machines selling SIM cards, gadgets, accessories, and vouchers.

Runs entirely on **mock data** for now — no backend required.

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200)

For Docker/MQTT, Machine control, admin links, and physical SDK setup, see **[SETUP.md](./SETUP.md)**.

## Customer journey

1. **Attract** — idle screen with featured products  
2. **Browse** — categories and product grid  
3. **Product detail** — quantity, add to cart / buy now  
4. **Cart** — review items  
5. **Checkout** — EcoCash, QR, or card  
6. **Payment** — demo auto-confirms after a few seconds  
7. **Dispensing** — animated drop sequence  
8. **Collect** — confirmation and receipt  

Idle sessions time out after **2 minutes** of inactivity and return to the attract screen.

## Staff console

- Open `/attendant` or tap **Staff access** on the attract screen  
- Demo PIN: `1234`

## Project structure

```
src/app/
  core/              # Models, services, mock catalogue
  features/kiosk/    # Customer purchase flow
  features/attendant/# Staff console
  shared/            # Touch buttons, product cards, pipes
```

## Build for kiosk deployment

```bash
npm run build
```

Serve `dist/vending-kiosk/browser` in a fullscreen browser / WebView on the Android kiosk tablet.
