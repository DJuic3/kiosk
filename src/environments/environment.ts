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
  /** Browser MQTT (WebSocket) — company broker (machines use plain MQTT :1883) */
  mqttWsUrl: 'ws://yamurailearnx.econet.co.zw:9001',
  mqttMachineId: 'MACHINE001',
  /** Machines / mosquitto_pub use this host:port (plain MQTT) */
  mqttHost: 'yamurailearnx.econet.co.zw',
  mqttPort: 1883,
};
