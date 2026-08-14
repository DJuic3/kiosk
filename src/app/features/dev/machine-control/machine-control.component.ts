import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MqttMessage } from '../../../core/services/mqtt-ws.service';
import { MachineControlService } from '../../../core/services/machine-control.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

@Component({
  selector: 'app-machine-control',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TouchButtonComponent],
  template: `
    <section class="control page">
      <header class="control__head">
        <div>
          <a routerLink="/" class="back">← Kiosk</a>
          <h1>Machine control</h1>
        </div>
        <span class="status" [attr.data-state]="control.mqtt.state()">{{ stateLabel() }}</span>
      </header>

      @if (control.mqtt.error()) {
        <p class="banner error">{{ control.mqtt.error() }}</p>
      }

      <div class="grid">
        <article class="panel">
          <h2>Connection</h2>
          <label>
            Broker host
            <input [(ngModel)]="brokerHost" (ngModelChange)="onBrokerChange()" placeholder="localhost" />
          </label>
          <div class="split">
            <label>
              WebSocket port
              <input
                type="number"
                min="1"
                [(ngModel)]="brokerPort"
                (ngModelChange)="onBrokerChange()"
                placeholder="9001"
              />
            </label>
            <label>
              Protocol
              <select [(ngModel)]="brokerProtocol" (ngModelChange)="onBrokerChange()">
                <option value="ws">ws:// (local dev)</option>
                <option value="wss">wss:// (TLS)</option>
              </select>
            </label>
          </div>
          <label>
            WebSocket URL (used to connect)
            <input [(ngModel)]="brokerUrl" (ngModelChange)="onUrlEdited()" placeholder="ws://localhost:9001" />
          </label>
          <label>
            Machine ID
            <input [(ngModel)]="machineId" (ngModelChange)="persistSettings()" placeholder="MACHINE001" />
          </label>
          <div class="row">
            @if (control.mqtt.state() === 'connected') {
              <app-touch-button variant="secondary" (pressed)="disconnect()">Disconnect</app-touch-button>
              <app-touch-button variant="primary" (pressed)="reconnect()">Reconnect</app-touch-button>
            } @else {
              <app-touch-button variant="primary" (pressed)="connect()">Connect</app-touch-button>
            }
          </div>
          <p class="hint">
            Edit host/port above, then click <strong>Connect</strong> (or <strong>Reconnect</strong> if already connected).
            Physical vending PCs use plain MQTT on port <strong>1883</strong> — this page uses WebSocket
            (<strong>{{ brokerPort }}</strong>) to talk from the browser.
          </p>
          <p class="hint mono">Machine MQTT reference: mqtt://{{ brokerHost }}:1883</p>
        </article>

        <article class="panel">
          <h2>Dispense command</h2>
          <label>
            Slot / selection
            <input type="number" min="1" [(ngModel)]="selection" />
          </label>
          <label>
            Topic (auto)
            <input [value]="dispenseTopic()" readonly />
          </label>
          <label>
            JSON payload (editable)
            <textarea [(ngModel)]="payloadJson" rows="3"></textarea>
          </label>
          <app-touch-button
            variant="primary"
            [block]="true"
            [disabled]="control.mqtt.state() !== 'connected'"
            (pressed)="sendDispense()"
          >
            Send dispense
          </app-touch-button>
          <div class="quick">
            @for (slot of quickSlots; track slot) {
              <button type="button" (click)="setSlot(slot)">Slot {{ slot }}</button>
            }
          </div>
        </article>
      </div>

      <article class="panel log">
        <div class="log__head">
          <h2>Live messages</h2>
          <app-touch-button variant="ghost" (pressed)="clearLog()">Clear</app-touch-button>
        </div>
        <div class="log__list">
          @for (msg of log(); track msg.at + msg.topic + msg.payload) {
            <div class="log__row" [class.outgoing]="msg.outgoing">
              <time>{{ msg.at | date: 'HH:mm:ss' }}</time>
              <strong>{{ msg.topic }}</strong>
              <code>{{ msg.payload }}</code>
            </div>
          } @empty {
            <p class="empty">Connect and send a command — incoming MQTT traffic appears here.</p>
          }
        </div>
      </article>
    </section>
  `,
  styles: `
    .control {
      max-width: 1100px;
      margin: 0 auto;
    }

    .control__head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .back {
      display: inline-block;
      margin-bottom: 8px;
      color: var(--primary);
      font-weight: 700;
      text-decoration: none;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 1.8rem;
    }

    .control__head p {
      margin: 0;
      color: var(--text-muted);
      max-width: 52ch;
    }

    .status {
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      background: #eef1f8;
      color: var(--text-muted);
    }

    .status[data-state='connected'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .status[data-state='connecting'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .status[data-state='error'] {
      background: #ffebee;
      color: #c62828;
    }

    .banner.error {
      padding: 12px 16px;
      border-radius: 12px;
      background: #ffebee;
      color: #c62828;
      font-weight: 600;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .panel {
      padding: 20px;
      border-radius: 18px;
      background: var(--surface);
      box-shadow: var(--shadow);
      display: grid;
      gap: 12px;
    }

    .panel h2 {
      margin: 0;
      font-size: 1.05rem;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    input,
    textarea,
    select {
      padding: 10px 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
    }

    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .hint.mono {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
    }

    textarea {
      resize: vertical;
      font-family: ui-monospace, monospace;
      font-size: 0.9rem;
    }

    .row {
      display: flex;
      gap: 10px;
    }

    .hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .quick {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quick button {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .log__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .log__list {
      max-height: 320px;
      overflow: auto;
      display: grid;
      gap: 8px;
    }

    .log__row {
      display: grid;
      gap: 4px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg);
      font-size: 0.88rem;
    }

    .log__row.outgoing {
      background: var(--primary-soft);
    }

    .log__row time {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .log__row code {
      word-break: break-all;
      font-size: 0.82rem;
    }

    .empty {
      margin: 0;
      color: var(--text-muted);
      text-align: center;
      padding: 24px;
    }
  `,
})
export class MachineControlComponent implements OnInit, OnDestroy {
  readonly control = inject(MachineControlService);

  brokerHost = 'localhost';
  brokerPort = 9001;
  brokerProtocol: 'ws' | 'wss' = 'ws';
  brokerUrl = environment.mqttWsUrl;
  machineId = environment.mqttMachineId;
  selection = 12;
  payloadJson = '';
  readonly quickSlots = [1, 6, 12, 18, 24];

  readonly log = signal<(MqttMessage & { outgoing?: boolean })[]>([]);

  private sub: Subscription | null = null;
  private connectSub: Subscription | null = null;
  private urlEditedManually = false;

  ngOnInit(): void {
    this.loadSettings();
    this.syncPayload();
    this.sub = this.control.mqtt.messages$.subscribe((msg) => {
      this.log.update((rows) => [msg, ...rows].slice(0, 100));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.connectSub?.unsubscribe();
    this.control.disconnect();
  }

  stateLabel(): string {
    switch (this.control.mqtt.state()) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'error':
        return 'Error';
      case 'closed':
        return 'Disconnected';
      default:
        return 'Not connected';
    }
  }

  dispenseTopic(): string {
    return this.control.dispenseTopic(this.machineId);
  }

  connect(): void {
    this.brokerUrl = this.brokerUrl.trim();
    this.persistSettings();
    this.connectSub?.unsubscribe();
    this.connectSub = this.control.connect(this.settings()).subscribe({
      next: () => this.control.mqtt.subscribe(`vmc/${this.machineId.trim()}/#`),
    });
  }

  reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 200);
  }

  disconnect(): void {
    this.control.disconnect();
  }

  onBrokerChange(): void {
    if (!this.urlEditedManually) {
      this.brokerUrl = `${this.brokerProtocol}://${this.brokerHost.trim()}:${this.brokerPort}`;
    }
    this.persistSettings();
  }

  onUrlEdited(): void {
    this.urlEditedManually = true;
    this.parseUrlIntoFields(this.brokerUrl);
    this.persistSettings();
  }

  setSlot(slot: number): void {
    this.selection = slot;
    this.syncPayload();
  }

  sendDispense(): void {
    let selections = [this.selection];
    try {
      const parsed = JSON.parse(this.payloadJson) as { selections?: number[] };
      selections = parsed.selections ?? selections;
    } catch {
      this.syncPayload();
      selections = [this.selection];
    }

    this.control.sendDispenseCommand(selections, this.machineId).subscribe({
      next: (msg) => {
        this.log.update((rows) => [
          {
            topic: msg.topic,
            payload: msg.payload,
            at: msg.at,
            outgoing: true,
          },
          ...rows,
        ].slice(0, 100));
      },
    });
  }

  clearLog(): void {
    this.log.set([]);
  }

  private syncPayload(): void {
    this.payloadJson = this.control.buildDispensePayload([this.selection]);
  }

  private settings() {
    return {
      brokerUrl: this.brokerUrl,
      brokerHost: this.brokerHost,
      brokerPort: this.brokerPort,
      brokerProtocol: this.brokerProtocol,
      machineId: this.machineId,
    };
  }

  private loadSettings(): void {
    const saved = this.control.loadSettings();
    this.brokerUrl = saved.brokerUrl;
    this.brokerHost = saved.brokerHost;
    this.brokerPort = saved.brokerPort;
    this.brokerProtocol = saved.brokerProtocol;
    this.machineId = saved.machineId;
    this.parseUrlIntoFields(this.brokerUrl);
  }

  persistSettings(): void {
    this.control.saveSettings(this.settings());
  }

  private parseUrlIntoFields(url: string): void {
    try {
      const parsed = new URL(url.trim());
      this.brokerProtocol = parsed.protocol === 'wss:' ? 'wss' : 'ws';
      this.brokerHost = parsed.hostname;
      this.brokerPort = parsed.port ? Number(parsed.port) : this.brokerProtocol === 'wss' ? 443 : 9001;
      this.urlEditedManually = false;
    } catch {
      // keep current field values
    }
  }
}
