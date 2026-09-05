import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
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
          <p><a routerLink="/dev/cabinet">Open virtual cabinet →</a></p>
        </div>
        <span class="status" [attr.data-state]="control.mqtt.state()">{{ stateLabel() }}</span>
      </header>

      @if (control.mqtt.error()) {
        <p class="banner error">{{ control.mqtt.error() }}</p>
      }
      @if (brokerPort === 1883) {
        <p class="banner warn">
          Port <strong>1883</strong> is for physical machines (plain MQTT). This page needs WebSocket port
          <strong>9001</strong> — change the port above, then click Connect.
        </p>
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
            <strong>Connect</strong> joins the MQTT broker over <strong>WebSocket</strong>, not the
            vending machine. Machines use plain MQTT on port <strong>{{ machineMqttPort }}</strong>. If the machine is
            offline, this page can still connect — dispense commands wait on the broker.
          </p>
          <p class="hint mono">Machine MQTT reference: mqtt://{{ brokerHost }}:{{ machineMqttPort }}</p>
        </article>

        <article class="panel">
          <h2>Dispense command</h2>
          <label>
            Add slot / selection
            <div class="add-row">
              <input
                type="number"
                min="1"
                [(ngModel)]="selectionDraft"
                (keydown.enter)="$event.preventDefault(); addSelection()"
              />
              <app-touch-button variant="secondary" (pressed)="addSelection()">Add</app-touch-button>
            </div>
          </label>
          <div class="selections">
            <div class="selections__head">
              <span>Selections ({{ selections.length }})</span>
              @if (selections.length) {
                <button type="button" class="linkish" (click)="clearSelections()">Clear</button>
              }
            </div>
            <div class="chips">
              @for (slot of selections; track $index) {
                <span class="chip">
                  {{ slot }}
                  <button type="button" (click)="removeSelection($index)" aria-label="Remove selection">×</button>
                </span>
              } @empty {
                <p class="empty-inline">No slots yet — add one or use a quick slot.</p>
              }
            </div>
          </div>
          <div class="quick">
            @for (slot of quickSlots; track slot) {
              <button type="button" (click)="addQuickSlot(slot)">+ {{ slot }}</button>
            }
          </div>
          <label>
            Topic (auto)
            <input [value]="dispenseTopic()" readonly />
          </label>
          <label>
            JSON payload (editable)
            <textarea
              [(ngModel)]="payloadJson"
              rows="3"
              (ngModelChange)="onPayloadEdited()"
            ></textarea>
          </label>
          <div class="actions">
            <app-touch-button
              variant="primary"
              [block]="true"
              [disabled]="control.mqtt.state() !== 'connected' || selections.length === 0"
              (pressed)="sendDispense()"
            >
              Send dispense ({{ selections.length }})
            </app-touch-button>
            <app-touch-button
              variant="danger"
              [block]="true"
              [disabled]="control.mqtt.state() !== 'connected'"
              (pressed)="clearQueue()"
            >
              Clear queue
            </app-touch-button>
          </div>
          <p class="hint">
            Clear queue publishes <code>commands/cancel</code> — stops pending dispenses on the
            machine (same as when it reports <code>machine_busy</code>).
          </p>
        </article>
      </div>

      <article class="panel log">
        <div class="log__head">
          <h2>Live messages</h2>
          <span class="log__count">{{ control.sessionLogs().length }} this visit</span>
          <app-touch-button variant="ghost" (pressed)="clearLog()">Clear</app-touch-button>
        </div>
        <p class="hint">This visit only. Leave the page and these reset; history is kept in All logs.</p>
        <div class="log__list">
          @for (msg of control.sessionLogs(); track msg.id) {
            <div class="log__row" [class.outgoing]="msg.outgoing" [class.system]="msg.source === 'system'">
              <div class="log__meta">
                <time>{{ msg.at | date: 'HH:mm:ss' }}</time>
                <span class="log__dir">{{ msg.source === 'system' ? 'sys' : msg.outgoing ? 'out' : 'in' }}</span>
              </div>
              <strong>{{ msg.topic }}</strong>
              <code>{{ msg.payload }}</code>
            </div>
          } @empty {
            <p class="empty">Connect and send a command — incoming MQTT traffic appears here.</p>
          }
        </div>
      </article>

      <article class="panel log log--all">
        <div class="log__head">
          <h2>All logs</h2>
          <span class="log__count">{{ control.allLogs().length }} stored</span>
          <app-touch-button variant="ghost" (pressed)="clearAllLogs()">Clear all</app-touch-button>
        </div>
        <p class="hint">
          Saved in this browser (up to 500). Stays after you leave this page or refresh. MQTT stays
          connected in the background so traffic is still recorded.
        </p>
        <div class="log__list log__list--tall">
          @for (msg of control.allLogs(); track msg.id) {
            <div class="log__row" [class.outgoing]="msg.outgoing" [class.system]="msg.source === 'system'">
              <div class="log__meta">
                <time>{{ msg.at | date: 'yyyy-MM-dd HH:mm:ss' }}</time>
                <span class="log__dir">{{ msg.source === 'system' ? 'sys' : msg.outgoing ? 'out' : 'in' }}</span>
              </div>
              <strong>{{ msg.topic }}</strong>
              <code>{{ msg.payload }}</code>
            </div>
          } @empty {
            <p class="empty">No stored logs yet. Connect or send a dispense — history appears here.</p>
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

    .banner.warn {
      padding: 12px 16px;
      border-radius: 12px;
      background: #fff4e0;
      color: #8a6100;
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

    .add-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: stretch;
    }

    .selections {
      display: grid;
      gap: 8px;
    }

    .selections__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .linkish {
      border: 0;
      background: none;
      color: var(--primary);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 36px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px 6px 12px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 800;
      font-size: 0.9rem;
    }

    .chip button {
      width: 22px;
      height: 22px;
      border: 0;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font: inherit;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
    }

    .empty-inline {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .actions {
      display: grid;
      gap: 10px;
    }

    .hint code {
      font-family: ui-monospace, monospace;
      font-size: 0.82em;
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
      gap: 10px;
    }

    .log__count {
      margin-left: auto;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .log__list {
      max-height: 320px;
      overflow: auto;
      display: grid;
      gap: 8px;
    }

    .log__list--tall {
      max-height: 520px;
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

    .log__row.system {
      background: #eef1f8;
    }

    .log__meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .log__dir {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 6px;
      background: #dce3f0;
      color: var(--text-muted);
    }

    .log__row.outgoing .log__dir {
      background: var(--primary);
      color: #fff;
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
  readonly machineMqttPort = environment.mqttPort;
  /** Draft value for the “Add slot” field */
  selectionDraft = 4;
  /** Ordered coil/selection numbers sent in the dispense payload */
  selections: number[] = [4];
  payloadJson = '';
  readonly quickSlots = [1, 6, 12, 18, 24];

  private connectSub: Subscription | null = null;
  private urlEditedManually = false;
  private syncingPayload = false;

  ngOnInit(): void {
    this.loadSettings();
    this.syncPayload();
    this.control.startSession();
  }

  ngOnDestroy(): void {
    this.connectSub?.unsubscribe();
  }

  stateLabel(): string {
    switch (this.control.mqtt.state()) {
      case 'connected':
        return 'Broker connected';
      case 'connecting':
        return 'Connecting to broker…';
      case 'error':
        return 'Broker error';
      case 'closed':
        return 'Broker disconnected';
      default:
        return 'Broker not connected';
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
    if (this.brokerPort === 1883) {
      this.brokerPort = 9001;
    }
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

  addSelection(): void {
    const slot = Number(this.selectionDraft);
    if (!Number.isFinite(slot) || slot < 1) {
      return;
    }
    this.selections = [...this.selections, Math.floor(slot)];
    this.syncPayload();
  }

  addQuickSlot(slot: number): void {
    this.selections = [...this.selections, slot];
    this.selectionDraft = slot;
    this.syncPayload();
  }

  removeSelection(index: number): void {
    this.selections = this.selections.filter((_, i) => i !== index);
    this.syncPayload();
  }

  clearSelections(): void {
    this.selections = [];
    this.syncPayload();
  }

  onPayloadEdited(): void {
    if (this.syncingPayload) {
      return;
    }
    try {
      const parsed = JSON.parse(this.payloadJson) as { selections?: unknown };
      if (!Array.isArray(parsed.selections)) {
        return;
      }
      const next = parsed.selections
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 1)
        .map((value) => Math.floor(value));
      this.selections = next;
    } catch {
      // keep typing invalid JSON until Send / next sync
    }
  }

  sendDispense(): void {
    let selections = [...this.selections];
    try {
      const parsed = JSON.parse(this.payloadJson) as { selections?: number[] };
      if (Array.isArray(parsed.selections) && parsed.selections.length > 0) {
        selections = parsed.selections
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value >= 1)
          .map((value) => Math.floor(value));
        this.selections = selections;
      }
    } catch {
      this.syncPayload();
      selections = [...this.selections];
    }

    if (selections.length === 0) {
      return;
    }

    this.control.sendDispenseCommand(selections, this.machineId).subscribe();
  }

  clearQueue(): void {
    this.control.sendCancelCommand(this.machineId).subscribe();
  }

  clearLog(): void {
    this.control.clearSessionLogs();
  }

  clearAllLogs(): void {
    this.control.clearAllLogs();
  }

  private syncPayload(): void {
    this.syncingPayload = true;
    this.payloadJson = this.control.buildDispensePayload(this.selections);
    this.syncingPayload = false;
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
      let raw = url.trim();
      if (/^https:\/\//i.test(raw)) {
        raw = raw.replace(/^https:\/\//i, 'wss://');
      } else if (/^http:\/\//i.test(raw)) {
        raw = raw.replace(/^http:\/\//i, 'ws://');
      }
      const parsed = new URL(raw);
      this.brokerProtocol = parsed.protocol === 'wss:' ? 'wss' : 'ws';
      this.brokerHost = parsed.hostname;
      let port = parsed.port ? Number(parsed.port) : this.brokerProtocol === 'wss' ? 443 : 9001;
      if (port === 1883) {
        port = 9001;
      }
      this.brokerPort = port;
      this.brokerUrl = `${this.brokerProtocol}://${this.brokerHost}:${port}`;
      this.urlEditedManually = false;
    } catch {
      // keep current field values
    }
  }
}
