#!/usr/bin/env node
/**
 * Virtual ARAK-style vending machine (MQTT).
 *
 * Speaks the same topic layout as the physical SDK:
 *   subscribe  vmc/{MACHINE_ID}/commands/#
 *   publish    vmc/{MACHINE_ID}/responses/{cmd}
 *   publish    vmc/{MACHINE_ID}/events/{name}
 *
 * Usage (local Docker broker):
 *   npm run virtual-machine
 *
 * Yamurai via reverse-proxy WSS (no VPN):
 *   npm run virtual-machine:yamurai
 *
 * Plain TCP (LAN / VPN to Mosquitto host):
 *   MQTT_HOST=192.168.55.248 MQTT_PORT=1883 npm run virtual-machine
 */

import mqtt from 'mqtt';

const MACHINE_ID = process.env.MACHINE_ID ?? 'MACHINE001';
const DISPENSE_MS = Number(process.env.DISPENSE_MS ?? 2500);
/** Full URL wins, e.g. wss://yamurailearnx.econet.co.zw:2052/mqtt */
const MQTT_URL = process.env.MQTT_URL?.trim() || '';
const HOST = process.env.MQTT_HOST ?? '127.0.0.1';
const PORT = Number(process.env.MQTT_PORT ?? 1883);

const base = `vmc/${MACHINE_ID}`;
const commandsTopic = `${base}/commands/#`;

let busy = false;
let queue = [];
let cancelRequested = false;

const connectOpts = {
  clientId: `virtual-${MACHINE_ID}-${process.pid}`,
  reconnectPeriod: 2000,
  connectTimeout: 15_000,
  rejectUnauthorized: process.env.MQTT_TLS_INSECURE === '0',
};

const client = MQTT_URL
  ? mqtt.connect(MQTT_URL, {
      ...connectOpts,
      // Corporate reverse proxies often use custom/private CAs in test.
      rejectUnauthorized: false,
    })
  : mqtt.connect({
      ...connectOpts,
      host: HOST,
      port: PORT,
      protocol: 'mqtt',
    });

function brokerLabel() {
  return MQTT_URL || `mqtt://${HOST}:${PORT}`;
}

function log(msg, detail) {
  const ts = new Date().toISOString().slice(11, 19);
  if (detail !== undefined) {
    console.log(`[${ts}] ${msg}`, typeof detail === 'string' ? detail : JSON.stringify(detail));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

function publish(kind, name, payload) {
  const topic = `${base}/${kind}/${name}`;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  client.publish(topic, body, { qos: 0 }, (err) => {
    if (err) {
      log(`publish failed ${topic}`, err.message);
      return;
    }
    log(`→ ${topic}`, body);
  });
}

function respond(command, payload) {
  publish('responses', command, payload);
}

function event(name, payload) {
  publish('events', name, payload);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function runDispense(selections) {
  busy = true;
  cancelRequested = false;
  event('dispense_started', { selections, status: 'busy' });
  respond('dispense', { status: 'accepted', selections, message: 'dispense started' });

  const results = [];
  for (const selection of selections) {
    if (cancelRequested) {
      results.push({ selection, status: 'cancelled' });
      break;
    }
    log(`dispensing selection ${selection}…`);
    event('vend', { selection, status: 'motor_running' });
    await sleep(DISPENSE_MS);
    if (cancelRequested) {
      results.push({ selection, status: 'cancelled' });
      break;
    }
    results.push({ selection, status: 'success' });
    event('vend', { selection, status: 'success' });
  }

  const cancelled = results.some((r) => r.status === 'cancelled');
  respond('dispense', {
    status: cancelled ? 'cancelled' : 'success',
    success: !cancelled,
    selections,
    results,
    message: cancelled ? 'dispense cancelled' : 'dispense complete',
  });
  event('dispense_finished', { status: cancelled ? 'cancelled' : 'success', results });
  busy = false;
  cancelRequested = false;

  if (queue.length) {
    const next = queue.shift();
    void runDispense(next);
  }
}

function handleCommand(command, raw) {
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    respond(command, { status: 'error', success: false, error: 'invalid_json' });
    return;
  }

  log(`← commands/${command}`, body);

  switch (command) {
    case 'ping':
      respond('ping', { message: 'pong', machineId: MACHINE_ID, at: new Date().toISOString() });
      break;

    case 'status':
      respond('status', {
        machineId: MACHINE_ID,
        busy,
        queueLength: queue.length,
        online: true,
        virtual: true,
      });
      break;

    case 'cancel':
      cancelRequested = true;
      queue = [];
      respond('cancel', { status: 'ok', message: 'queue cleared' });
      event('queue_cleared', { message: 'cancel received' });
      break;

    case 'set_price': {
      const selections = Array.isArray(body.selections) ? body.selections : [];
      const price = body.price;
      respond('set_price', { status: 'ok', selections, price });
      break;
    }

    case 'dispense': {
      const selections = Array.isArray(body.selections)
        ? body.selections.map(Number).filter((n) => Number.isFinite(n) && n >= 1)
        : [];
      if (!selections.length) {
        respond('dispense', { status: 'error', success: false, error: 'no_selections' });
        return;
      }
      if (busy) {
        respond('dispense', {
          status: 'machine_busy',
          success: false,
          error: 'machine_busy',
          message: 'Previous vend still running — send cancel or wait',
        });
        return;
      }
      void runDispense(selections);
      break;
    }

    default:
      respond(command, { status: 'error', success: false, error: 'unknown_command' });
  }
}

client.on('connect', () => {
  log(`Virtual machine ONLINE as ${MACHINE_ID}`);
  log(`Broker ${brokerLabel()}`);
  log(`Listening on ${commandsTopic}`);
  client.subscribe(commandsTopic, { qos: 0 }, (err) => {
    if (err) {
      log('subscribe failed', err.message);
      return;
    }
    event('online', { machineId: MACHINE_ID, virtual: true, at: new Date().toISOString() });
    respond('status', { machineId: MACHINE_ID, busy: false, online: true, virtual: true });
  });
});

client.on('message', (topic, payload) => {
  const prefix = `${base}/commands/`;
  if (!topic.startsWith(prefix)) {
    return;
  }
  const command = topic.slice(prefix.length).split('/')[0];
  if (!command) {
    return;
  }
  handleCommand(command, payload.toString('utf8'));
});

client.on('reconnect', () => log('reconnecting…'));
client.on('close', () => log('connection closed'));
client.on('error', (err) => log('MQTT error', err.message));

process.on('SIGINT', () => {
  log('shutting down');
  event('offline', { machineId: MACHINE_ID, virtual: true });
  client.end(false, {}, () => process.exit(0));
});
