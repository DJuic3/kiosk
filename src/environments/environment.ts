export const environment = {
  production: false,
  /** Reserved for a future Java API — unused while useMockData is true */
  apiBaseUrl: 'http://localhost:8080/api/v1',
  edgeApiUrl: 'http://localhost:8090/api/v1',
  /** Frontend-only mode: all data comes from local mock catalogue */
  useMockData: true,
  /** When true, kiosk dispense uses the same MQTT path as /dev/machine */
  useMqttDispense: true,
  machineId: 'KIOSK-001',
  sessionTimeoutSeconds: 120,
  /** Browser / cabinet — Yamurai reverse proxy (WSS, no VPN) */
  mqttWsUrl: 'wss://yamurailearnx.econet.co.zw:2052/mqtt',
  mqttMachineId: 'MACHINE001',
  /**
   * Machine SDK uses plain TCP MQTT.
   * Only works if nginx stream{} proxies :2052 → mosquitto :1883.
   * If :2052 is HTTPS/WSS only, SDK needs a separate stream port or WS support.
   */
  mqttHost: 'yamurailearnx.econet.co.zw',
  mqttPort: 2052,
};
