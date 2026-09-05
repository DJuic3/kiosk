import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MachineControlService } from '../../../core/services/machine-control.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

interface SlotState {
  id: number;
  phase: 'idle' | 'running' | 'success' | 'cancelled' | 'error';
}

interface DropAnim {
  id: number;
  selection: number;
}

@Component({
  selector: 'app-virtual-cabinet',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TouchButtonComponent],
  template: `
    <section class="viz page">
      <header class="viz__head">
        <div>
          <a routerLink="/dev/machine" class="back">← Machine control</a>
          <h1>Virtual cabinet</h1>
          <p>
            Live MQTT view for {{ machineId }}. Use <strong>Yamurai</strong> for the company broker, or
            Local Docker for offline testing with <code>npm run virtual-machine</code>.
          </p>
        </div>
        <span class="status" [attr.data-state]="brokerState()">{{ brokerLabel() }}</span>
      </header>

      @if (control.mqtt.error()) {
        <p class="banner error">{{ control.mqtt.error() }}</p>
      }

      <div class="layout">
        <aside class="panel controls">
          <h2>Connection</h2>
          <label>
            WebSocket URL
            <input [(ngModel)]="brokerUrl" (ngModelChange)="persist()" />
          </label>
          <label>
            Machine ID
            <input [(ngModel)]="machineId" (ngModelChange)="persist()" />
          </label>
          <div class="row">
            @if (control.mqtt.state() === 'connected') {
              <app-touch-button variant="secondary" (pressed)="disconnect()">Disconnect</app-touch-button>
            } @else {
              <app-touch-button variant="primary" (pressed)="connect()">Connect</app-touch-button>
            }
          </div>
          <div class="row">
            <app-touch-button variant="primary" (pressed)="useYamuraiBroker()">Yamurai</app-touch-button>
            <app-touch-button variant="ghost" (pressed)="useLocalBroker()">Local Docker</app-touch-button>
          </div>
          <p class="hint mono">Machine TCP reference: mqtt://{{ mqttHost }}:{{ mqttPort }}</p>

          <h2>Test controls</h2>
          <div class="row">
            <app-touch-button
              variant="secondary"
              [disabled]="control.mqtt.state() !== 'connected'"
              (pressed)="ping()"
            >
              Ping
            </app-touch-button>
            <app-touch-button
              variant="danger"
              [disabled]="control.mqtt.state() !== 'connected'"
              (pressed)="cancel()"
            >
              Clear queue
            </app-touch-button>
          </div>
          <p class="hint">Tap a coil on the cabinet to dispense that selection.</p>

          <div class="meta">
            <div>
              <span>Machine</span>
              <strong [class.online]="machineOnline()">{{ machineOnline() ? 'Online' : 'Silent' }}</strong>
            </div>
            <div>
              <span>Busy</span>
              <strong>{{ machineBusy() ? 'Vend in progress' : 'Idle' }}</strong>
            </div>
            <div>
              <span>Last event</span>
              <strong>{{ lastEvent() || '—' }}</strong>
            </div>
          </div>

          <div class="feed">
            <h2>Activity</h2>
            @for (line of activity(); track line.id) {
              <div class="feed__row">
                <time>{{ line.at | date: 'HH:mm:ss' }}</time>
                <span>{{ line.text }}</span>
              </div>
            } @empty {
              <p class="empty">Connect, then run the virtual machine or send a ping.</p>
            }
          </div>
        </aside>

        <div class="cabinet-wrap">
          <div class="cabinet" [class.cabinet--busy]="machineBusy()" [class.cabinet--online]="machineOnline()">
            <div class="cabinet__top">
              <div class="brand">ECONET</div>
              <div class="leds">
                <span class="led" [class.on]="machineOnline()" title="Online"></span>
                <span class="led led--warn" [class.on]="machineBusy()" title="Busy"></span>
              </div>
            </div>

            <div class="glass">
              <div class="coils">
                @for (slot of slots(); track slot.id) {
                  <button
                    type="button"
                    class="coil"
                    [class.coil--running]="slot.phase === 'running'"
                    [class.coil--success]="slot.phase === 'success'"
                    [class.coil--error]="slot.phase === 'error' || slot.phase === 'cancelled'"
                    [disabled]="control.mqtt.state() !== 'connected'"
                    (click)="dispenseSlot(slot.id)"
                  >
                    <span class="coil__spiral"></span>
                    <span class="coil__pack"></span>
                    <span class="coil__num">{{ slot.id }}</span>
                  </button>
                }
              </div>

              @for (drop of drops(); track drop.id) {
                <div class="drop" [style.--col]="columnOf(drop.selection)">
                  <div class="drop__item"></div>
                </div>
              }
            </div>

            <div class="cabinet__chute">
              <div class="chute__label">Collect here</div>
              <div class="chute__mouth" [class.chute__mouth--flash]="chuteFlash()">
                @if (lastDropped() !== null) {
                  <span class="chute__tag">Slot {{ lastDropped() }}</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .viz {
      max-width: 1200px;
      margin: 0 auto;
    }

    .viz__head {
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

    .viz__head p {
      margin: 0;
      color: var(--text-muted);
      max-width: 52ch;
    }

    .viz__head code {
      font-family: ui-monospace, monospace;
      font-size: 0.85em;
    }

    .status {
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      background: #eef1f8;
      color: var(--text-muted);
      white-space: nowrap;
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

    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 360px) 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
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
      margin: 8px 0 0;
      font-size: 1.05rem;
    }

    .panel h2:first-child {
      margin-top: 0;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    input {
      padding: 10px 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .hint.mono {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
    }

    .meta {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: 14px;
      background: var(--bg);
    }

    .meta div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.9rem;
    }

    .meta span {
      color: var(--text-muted);
      font-weight: 600;
    }

    .meta strong.online {
      color: var(--success);
    }

    .feed {
      max-height: 240px;
      overflow: auto;
      display: grid;
      gap: 6px;
    }

    .feed__row {
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 8px;
      font-size: 0.82rem;
      padding: 6px 8px;
      border-radius: 8px;
      background: var(--bg);
    }

    .feed__row time {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .empty {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .cabinet-wrap {
      display: flex;
      justify-content: center;
      padding: 8px;
    }

    .cabinet {
      width: min(100%, 520px);
      border-radius: 28px;
      background: linear-gradient(165deg, #1a2744 0%, #0f1628 55%, #0a1020 100%);
      padding: 18px 18px 22px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 24px 48px rgba(10, 16, 32, 0.35);
      transition: box-shadow 0.3s ease;
    }

    .cabinet--online {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 0 0 2px rgba(27, 122, 61, 0.35),
        0 24px 48px rgba(10, 16, 32, 0.35);
    }

    .cabinet--busy {
      animation: pulse-cabinet 1.4s ease-in-out infinite;
    }

    @keyframes pulse-cabinet {
      0%,
      100% {
        filter: brightness(1);
      }
      50% {
        filter: brightness(1.06);
      }
    }

    .cabinet__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding: 0 6px;
    }

    .brand {
      font-weight: 900;
      letter-spacing: 0.18em;
      color: #f2f5ff;
      font-size: 0.95rem;
    }

    .leds {
      display: flex;
      gap: 8px;
    }

    .led {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #2a3348;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
    }

    .led.on {
      background: #2ecc71;
      box-shadow: 0 0 12px rgba(46, 204, 113, 0.7);
    }

    .led--warn.on {
      background: #f0a202;
      box-shadow: 0 0 12px rgba(240, 162, 2, 0.7);
    }

    .glass {
      position: relative;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(180, 210, 255, 0.12), transparent 30%),
        #121a2e;
      border: 2px solid rgba(255, 255, 255, 0.08);
      padding: 14px;
      overflow: hidden;
      min-height: 420px;
    }

    .coils {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .coil {
      position: relative;
      aspect-ratio: 1;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(180deg, #243049, #182033);
      cursor: pointer;
      overflow: hidden;
      transition: transform 0.15s ease, background 0.2s ease;
    }

    .coil:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .coil:not(:disabled):hover {
      transform: translateY(-2px);
    }

    .coil__spiral {
      position: absolute;
      inset: 18% 22% 28%;
      border-radius: 50%;
      border: 2px dashed rgba(255, 255, 255, 0.18);
      animation: none;
    }

    .coil--running .coil__spiral {
      animation: spin 0.55s linear infinite;
      border-color: rgba(240, 162, 2, 0.7);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .coil__pack {
      position: absolute;
      left: 50%;
      top: 42%;
      width: 42%;
      height: 28%;
      transform: translate(-50%, -50%);
      border-radius: 6px;
      background: linear-gradient(135deg, #4f6fff, #1a35a3);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
      transition: transform 0.35s ease, opacity 0.35s ease;
    }

    .coil--running .coil__pack {
      transform: translate(-50%, -40%) rotate(12deg);
    }

    .coil--success .coil__pack {
      opacity: 0;
      transform: translate(-50%, 80%);
    }

    .coil__num {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 6px;
      text-align: center;
      font-size: 0.72rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.7);
    }

    .coil--success {
      background: linear-gradient(180deg, #1f4a32, #182033);
    }

    .coil--error {
      background: linear-gradient(180deg, #4a1f1f, #182033);
    }

    .drop {
      position: absolute;
      top: 12%;
      left: calc(12.5% + (var(--col) - 1) * 25%);
      width: 25%;
      height: 70%;
      pointer-events: none;
      display: flex;
      justify-content: center;
    }

    .drop__item {
      width: 28px;
      height: 36px;
      border-radius: 6px;
      background: linear-gradient(135deg, #7b93ff, #1a35a3);
      animation: fall 0.85s cubic-bezier(0.4, 0.05, 0.6, 1) forwards;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
    }

    @keyframes fall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        transform: translateY(280px) rotate(28deg);
        opacity: 0;
      }
    }

    .cabinet__chute {
      margin-top: 14px;
      padding: 10px 12px 12px;
      border-radius: 14px;
      background: #0c1220;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .chute__label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 8px;
    }

    .chute__mouth {
      height: 64px;
      border-radius: 10px;
      background: linear-gradient(180deg, #05080f, #1a2236);
      border: 2px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.25s ease;
    }

    .chute__mouth--flash {
      box-shadow: inset 0 0 24px rgba(46, 204, 113, 0.35);
    }

    .chute__tag {
      color: #dff5e8;
      font-weight: 800;
      font-size: 0.95rem;
    }
  `,
})
export class VirtualCabinetComponent implements OnInit, OnDestroy {
  readonly control = inject(MachineControlService);

  brokerUrl = environment.mqttWsUrl;
  machineId = environment.mqttMachineId;
  readonly mqttHost = environment.mqttHost;
  readonly mqttPort = environment.mqttPort;

  readonly slots = signal<SlotState[]>(
    Array.from({ length: 24 }, (_, i) => ({ id: i + 1, phase: 'idle' as const })),
  );
  readonly drops = signal<DropAnim[]>([]);
  readonly activity = signal<{ id: string; at: string; text: string }[]>([]);
  readonly machineOnline = signal(false);
  readonly machineBusy = signal(false);
  readonly lastEvent = signal('');
  readonly lastDropped = signal<number | null>(null);
  readonly chuteFlash = signal(false);
  readonly brokerState = signal(this.control.mqtt.state());

  private connectSub: Subscription | null = null;
  private msgSub: Subscription | null = null;
  private stateTimer: ReturnType<typeof setInterval> | null = null;
  private dropSeq = 0;
  private onlineTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const saved = this.control.loadSettings();
    this.brokerUrl = environment.mqttWsUrl;
    this.machineId = saved.machineId || environment.mqttMachineId;
    this.stateTimer = setInterval(() => this.brokerState.set(this.control.mqtt.state()), 300);
    this.msgSub = this.control.mqtt.messages$.subscribe((msg) => this.onMessage(msg.topic, msg.payload));
    this.useYamuraiBroker();
  }

  ngOnDestroy(): void {
    this.connectSub?.unsubscribe();
    this.msgSub?.unsubscribe();
    if (this.stateTimer) {
      clearInterval(this.stateTimer);
    }
    if (this.onlineTimer) {
      clearTimeout(this.onlineTimer);
    }
  }

  brokerLabel(): string {
    switch (this.brokerState()) {
      case 'connected':
        return 'Broker connected';
      case 'connecting':
        return 'Connecting…';
      case 'error':
        return 'Broker error';
      default:
        return 'Broker offline';
    }
  }

  useLocalBroker(): void {
    this.brokerUrl = 'ws://127.0.0.1:9001';
    this.persist();
    this.connect();
  }

  useYamuraiBroker(): void {
    this.brokerUrl = environment.mqttWsUrl;
    this.machineId = environment.mqttMachineId;
    this.persist();
    this.connect();
  }

  persist(): void {
    try {
      const u = new URL(this.brokerUrl.trim().replace(/^http/, 'ws'));
      this.control.saveSettings({
        brokerUrl: this.brokerUrl.trim(),
        brokerHost: u.hostname,
        brokerPort: u.port ? Number(u.port) : 9001,
        brokerProtocol: u.protocol === 'wss:' ? 'wss' : 'ws',
        machineId: this.machineId.trim(),
      });
    } catch {
      this.control.saveSettings({
        ...this.control.loadSettings(),
        brokerUrl: this.brokerUrl.trim(),
        machineId: this.machineId.trim(),
      });
    }
  }

  connect(): void {
    this.persist();
    this.connectSub?.unsubscribe();
    this.connectSub = this.control
      .connect({
        ...this.control.loadSettings(),
        brokerUrl: this.brokerUrl.trim(),
        machineId: this.machineId.trim(),
      })
      .subscribe({
        next: () => {
          this.control.mqtt.subscribe(`vmc/${this.machineId.trim()}/#`);
          this.pushActivity('Subscribed to machine topics');
          this.ping();
        },
      });
  }

  disconnect(): void {
    this.control.disconnect();
    this.machineOnline.set(false);
    this.machineBusy.set(false);
  }

  ping(): void {
    const id = this.machineId.trim();
    this.control.mqtt.publish(`vmc/${id}/commands/ping`, '{}');
    this.pushActivity('Sent ping');
  }

  cancel(): void {
    this.control.sendCancelCommand(this.machineId.trim()).subscribe();
    this.pushActivity('Sent cancel / clear queue');
  }

  dispenseSlot(selection: number): void {
    this.control.sendDispenseCommand([selection], this.machineId.trim()).subscribe();
    this.pushActivity(`Sent dispense [${selection}]`);
  }

  columnOf(selection: number): number {
    return ((selection - 1) % 4) + 1;
  }

  private onMessage(topic: string, payload: string): void {
    const id = this.machineId.trim();
    if (!topic.startsWith(`vmc/${id}/`)) {
      return;
    }

    this.markOnline();

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      body = {};
    }

    if (topic.includes('/responses/ping')) {
      this.pushActivity('Pong received — machine reachable');
      this.lastEvent.set('pong');
      return;
    }

    if (topic.includes('/events/online') || topic.includes('/responses/status')) {
      this.pushActivity(body['virtual'] ? 'Virtual machine online' : 'Machine status update');
      this.lastEvent.set('online');
      if (typeof body['busy'] === 'boolean') {
        this.machineBusy.set(body['busy']);
      }
      return;
    }

    if (topic.includes('/events/dispense_started') || (topic.includes('/responses/dispense') && body['status'] === 'accepted')) {
      this.machineBusy.set(true);
      this.lastEvent.set('dispense started');
      this.pushActivity(`Dispense started ${JSON.stringify(body['selections'] ?? [])}`);
      return;
    }

    if (topic.includes('/events/vend')) {
      const selection = Number(body['selection']);
      const status = String(body['status'] ?? '');
      if (!Number.isFinite(selection)) {
        return;
      }
      if (status === 'motor_running') {
        this.setSlot(selection, 'running');
        this.lastEvent.set(`motor ${selection}`);
        this.pushActivity(`Coil ${selection} running`);
      } else if (status === 'success') {
        this.setSlot(selection, 'success');
        this.spawnDrop(selection);
        this.lastEvent.set(`vend ${selection}`);
        this.pushActivity(`Coil ${selection} dispensed`);
        setTimeout(() => this.setSlot(selection, 'idle'), 1600);
      } else if (status === 'cancelled') {
        this.setSlot(selection, 'cancelled');
        setTimeout(() => this.setSlot(selection, 'idle'), 1600);
      }
      return;
    }

    if (topic.includes('/events/dispense_finished') || (topic.includes('/responses/dispense') && body['status'] === 'success')) {
      this.machineBusy.set(false);
      this.lastEvent.set('dispense finished');
      this.pushActivity('Dispense finished');
      return;
    }

    if (topic.includes('/responses/dispense') && (body['error'] === 'machine_busy' || body['status'] === 'machine_busy')) {
      this.pushActivity('Machine busy');
      this.lastEvent.set('busy');
      return;
    }

    if (topic.includes('/events/queue_cleared') || topic.includes('/responses/cancel')) {
      this.machineBusy.set(false);
      this.slots.update((rows) => rows.map((s) => ({ ...s, phase: 'idle' })));
      this.pushActivity('Queue cleared');
      this.lastEvent.set('cancel');
    }
  }

  private markOnline(): void {
    this.machineOnline.set(true);
    if (this.onlineTimer) {
      clearTimeout(this.onlineTimer);
    }
    this.onlineTimer = setTimeout(() => this.machineOnline.set(false), 45_000);
  }

  private setSlot(id: number, phase: SlotState['phase']): void {
    this.slots.update((rows) => rows.map((s) => (s.id === id ? { ...s, phase } : s)));
  }

  private spawnDrop(selection: number): void {
    const id = ++this.dropSeq;
    this.drops.update((rows) => [...rows, { id, selection }]);
    this.lastDropped.set(selection);
    this.chuteFlash.set(true);
    setTimeout(() => {
      this.drops.update((rows) => rows.filter((d) => d.id !== id));
      this.chuteFlash.set(false);
    }, 900);
  }

  private pushActivity(text: string): void {
    const entry = { id: `${Date.now()}-${Math.random()}`, at: new Date().toISOString(), text };
    this.activity.update((rows) => [entry, ...rows].slice(0, 40));
  }
}
