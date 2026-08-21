import { Injectable, inject } from '@angular/core';
import { Observable, of, take, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DispenseResult, Order } from '../models/order.model';
import { Product } from '../models/product.model';
import { MqttMessage, MqttWsService } from './mqtt-ws.service';

export interface MachineControlSettings {
  brokerUrl: string;
  brokerHost: string;
  brokerPort: number;
  brokerProtocol: 'ws' | 'wss';
  machineId: string;
}

const STORAGE_KEY = 'vending_machine_control_settings';
/** Native MQTT port — browsers must use WebSocket on 9001 instead. */
const MQTT_TCP_PORT = 1883;
const MQTT_WS_PORT = 9001;

@Injectable({ providedIn: 'root' })
export class MachineControlService {
  readonly mqtt = inject(MqttWsService);

  loadSettings(): MachineControlSettings {
    const defaults: MachineControlSettings = {
      brokerUrl: environment.mqttWsUrl,
      brokerHost: environment.mqttHost,
      brokerPort: MQTT_WS_PORT,
      brokerProtocol: 'ws',
      machineId: environment.mqttMachineId,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }
      const saved = JSON.parse(raw) as Partial<MachineControlSettings>;
      return this.normalizeSettings({ ...defaults, ...saved });
    } catch {
      return defaults;
    }
  }

  /** Browsers speak MQTT over WebSocket (9001), not plain TCP MQTT (1883). */
  normalizeSettings(settings: MachineControlSettings): MachineControlSettings {
    let { brokerUrl, brokerHost, brokerPort, brokerProtocol, machineId } = settings;

    try {
      const parsed = new URL(brokerUrl.trim());
      const isWs = parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
      if (isWs && Number(parsed.port || brokerPort) === MQTT_TCP_PORT) {
        parsed.port = String(MQTT_WS_PORT);
        brokerUrl = parsed.toString().replace(/\/$/, '');
        brokerPort = MQTT_WS_PORT;
      } else if (isWs) {
        brokerHost = parsed.hostname;
        brokerPort = parsed.port ? Number(parsed.port) : MQTT_WS_PORT;
        brokerProtocol = parsed.protocol === 'wss:' ? 'wss' : 'ws';
      }
    } catch {
      // keep field values below
    }

    if (brokerPort === MQTT_TCP_PORT) {
      brokerPort = MQTT_WS_PORT;
      brokerUrl = `${brokerProtocol}://${brokerHost.trim()}:${MQTT_WS_PORT}`;
    }

    const normalized: MachineControlSettings = {
      brokerUrl,
      brokerHost,
      brokerPort,
      brokerProtocol,
      machineId,
    };

    if (
      settings.brokerUrl !== normalized.brokerUrl ||
      settings.brokerPort !== normalized.brokerPort
    ) {
      this.saveSettings(normalized);
    }

    return normalized;
  }

  saveSettings(settings: MachineControlSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  dispenseTopic(machineId: string): string {
    return `vmc/${machineId.trim()}/commands/dispense`;
  }

  buildDispensePayload(selections: number[]): string {
    return JSON.stringify({ selections });
  }

  selectionForProduct(product: Product): number {
    if (product.mqttSelection != null) {
      return product.mqttSelection;
    }
    const digits = product.slotCode.replace(/\D/g, '');
    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  }

  selectionsForOrder(order: Order): number[] {
    return order.lines.flatMap((line) =>
      Array.from({ length: line.quantity }, () => this.selectionForProduct(line.product)),
    );
  }

  connect(settings = this.loadSettings()): Observable<void> {
    settings = this.normalizeSettings(settings);

    if (this.mqtt.state() === 'connected') {
      return of(undefined);
    }

    return new Observable((subscriber) => {
      let done = false;
      const finish = (err?: Error) => {
        if (done) return;
        done = true;
        connSub.unsubscribe();
        timeoutSub.unsubscribe();
        if (err) {
          subscriber.error(err);
        } else {
          subscriber.next();
          subscriber.complete();
        }
      };

      const connSub = this.mqtt.connected$.pipe(take(1)).subscribe(() => finish());
      const timeoutSub = timer(8000).subscribe(() =>
        finish(new Error(this.mqtt.error() || 'MQTT connection timed out')),
      );

      this.mqtt.connect(settings.brokerUrl.trim(), `kiosk-${Date.now()}`);
    });
  }

  disconnect(): void {
    this.mqtt.disconnect();
  }

  /** Same publish path used by the Machine control page. */
  sendDispenseCommand(selections: number[], machineId?: string): Observable<MqttMessage> {
    const settings = this.loadSettings();
    const id = (machineId ?? settings.machineId).trim();
    const topic = this.dispenseTopic(id);
    const payload = this.buildDispensePayload(selections);

    return new Observable((subscriber) => {
      this.connect(settings).subscribe({
        next: () => {
          this.mqtt.subscribe(`vmc/${id}/#`);
          let settled = false;

          const sub = this.mqtt.messages$.subscribe((msg) => {
            if (settled) return;
            if (msg.topic.startsWith(`vmc/${id}/`) && this.isDispenseResponse(msg)) {
              settled = true;
              sub.unsubscribe();
              timeoutSub.unsubscribe();
              subscriber.next(msg);
              subscriber.complete();
            }
          });

          const timeoutSub = timer(4500).subscribe(() => {
            if (settled) return;
            settled = true;
            sub.unsubscribe();
            subscriber.next({ topic, payload, at: new Date().toISOString() });
            subscriber.complete();
          });

          this.mqtt.publish(topic, payload);
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  /** Kiosk dispense — publishes to the machine then builds UI results. */
  dispenseOrder(order: Order, attempt = 1): Observable<DispenseResult[]> {
    const selections = this.selectionsForOrder(order);

    return new Observable((subscriber) => {
      this.sendDispenseCommand(selections).subscribe({
        next: (msg) => {
          subscriber.next(this.parseResults(msg, order, attempt));
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  private isDispenseResponse(msg: MqttMessage): boolean {
    const topic = msg.topic.toLowerCase();
    return (
      topic.includes('status') ||
      topic.includes('event') ||
      topic.includes('response') ||
      topic.includes('dispense')
    );
  }

  private parseResults(msg: MqttMessage, order: Order, attempt: number): DispenseResult[] {
    let machineFailed = false;
    try {
      const body = JSON.parse(msg.payload) as { status?: string; success?: boolean; error?: string };
      machineFailed =
        body.success === false ||
        body.status === 'failed' ||
        body.status === 'error' ||
        !!body.error;
    } catch {
      const lower = msg.payload.toLowerCase();
      machineFailed = lower.includes('fail') || lower.includes('error') || lower.includes('jam');
    }

    const units = order.lines.flatMap((line) =>
      Array.from({ length: line.quantity }, () => ({
        slotCode: line.product.slotCode,
        productName: line.product.name,
        selection: this.selectionForProduct(line.product),
      })),
    );

    return units.map((unit, index) => {
      const failThis = machineFailed && attempt === 1 && index === units.length - 1;
      return {
        slotCode: unit.slotCode,
        productName: unit.productName,
        attempts: attempt,
        status: failThis ? ('failed' as const) : ('success' as const),
        message: failThis
          ? 'Machine reported dispense failure — retry available'
          : `MQTT dispense sent (selection ${unit.selection})`,
      };
    });
  }
}
