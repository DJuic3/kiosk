# Physical vending-sdk config (ARAK)

Copy to the machine:

```bash
sudo cp deploy/vending-sdk-config.json /opt/vending-sdk/config.json
sudo systemctl restart vending-sdk
sudo systemctl status vending-sdk
journalctl -u vending-sdk -n 50
```

## Important

- `HOST` must be the hostname only — **no** `https://` or `wss://`.
- The SDK uses **plain TCP MQTT** (`HOST` + `PORT`), not WebSocket.

So `PORT: 2052` only works if the reverse proxy on
`yamurailearnx.econet.co.zw:2052` is nginx **`stream {}`** forwarding to
Mosquitto `192.168.55.248:1883`.

If `:2052` is **HTTPS / WSS only** (browser path `/mqtt`), the SDK cannot use
that port. Options:

1. Add a public **stream** MQTT port (e.g. 1883 or 8883) → Mosquitto `:1883`, or
2. Use LAN/VPN config below.

## LAN / VPN alternative (direct to Mosquitto host)

```json
"MQTT": {
  "HOST": "192.168.55.248",
  "PORT": 1883
}
```

## Smoke test from your Mac (after SDK is online)

```bash
mosquitto_pub -d -L 'wss://yamurailearnx.econet.co.zw:2052/mqtt' --insecure \
  -t 'vmc/MACHINE001/commands/ping' -m '{}'
```

Expect a `responses/ping` with `"message":"pong"` if the machine is on the same broker.
