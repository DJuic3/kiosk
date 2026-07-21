import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { MachineService } from '../../core/services/machine.service';
import { OpsDataService } from '../../core/services/ops-data.service';
import { GrvRecord } from '../../core/models/ops.model';
import { MOCK_PRODUCTS } from '../../core/data/mock-catalog';
import { TouchButtonComponent } from '../../shared/components/touch-button/touch-button.component';

const STAFF_PIN = '1234';

@Component({
  selector: 'app-attendant',
  standalone: true,
  imports: [FormsModule, AsyncPipe, RouterLink, TouchButtonComponent],
  template: `
    <section class="attendant page">
      @if (!authenticated()) {
        <div class="attendant__login">
          <img class="attendant__logo" src="images/EconetLogo.png" alt="Econet Wireless" />
          <h1>Staff Console</h1>
          <p>Enter your PIN to access machine management.</p>
          <input
            type="password"
            inputmode="numeric"
            maxlength="6"
            [(ngModel)]="pin"
            placeholder="PIN"
            (keyup.enter)="login()"
          />
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <app-touch-button variant="primary" [block]="true" (pressed)="login()">Unlock</app-touch-button>
          <a routerLink="/">Back to kiosk</a>
        </div>
      } @else {
        <div class="page__header">
          <div>
            <h1>Attendant Console</h1>
            <p>{{ (machine$ | async)?.name }} — {{ (machine$ | async)?.location }}</p>
          </div>
          <app-touch-button variant="secondary" (pressed)="logout()">Lock</app-touch-button>
        </div>

        @if (actionMessage()) {
          <p class="banner" [attr.data-tone]="actionTone()">{{ actionMessage() }}</p>
        }

        <div class="attendant__grid">
          <article class="panel">
            <h2>Machine health</h2>
            @if (health$ | async; as health) {
              <ul>
                <li [class.ok]="health.online">Network: {{ health.online ? 'Online' : 'Offline' }}</li>
                <li [class.ok]="health.printerOk">Printer: {{ health.printerOk ? 'OK' : 'Fault' }}</li>
                <li [class.ok]="!maintenance() && health.dispenserOk">
                  Dispenser:
                  {{ maintenance() ? 'Maintenance' : health.dispenserOk ? 'OK' : 'Fault' }}
                </li>
                <li [class.ok]="health.cashAcceptorOk">Cash acceptor: {{ health.cashAcceptorOk ? 'OK' : 'N/A' }}</li>
              </ul>
            }
          </article>

          <article class="panel">
            <h2>Stock overview</h2>
            <div class="stock-list">
              @for (product of products; track product.id) {
                <div class="stock-row" [class.low]="product.stockAvailable <= 3">
                  <span>{{ product.slotCode }}</span>
                  <strong>{{ product.name }}</strong>
                  <em>{{ product.stockAvailable }}</em>
                </div>
              }
            </div>
          </article>

          <article class="panel">
            <h2>Quick actions</h2>
            <div class="actions">
              <app-touch-button variant="secondary" [block]="true" (pressed)="runSelfTest()">
                Run self-test
              </app-touch-button>
              <app-touch-button variant="secondary" [block]="true" (pressed)="clearJam()">
                Clear jam
              </app-touch-button>
              <app-touch-button variant="secondary" [block]="true" (pressed)="startGrv()">
                Start restock (GRV)
              </app-touch-button>
              <app-touch-button variant="danger" [block]="true" (pressed)="toggleMaintenance()">
                {{ maintenance() ? 'Exit maintenance' : 'Put machine in maintenance' }}
              </app-touch-button>
            </div>
          </article>
        </div>

        @if (grv(); as draft) {
          <article class="panel grv">
            <div class="grv__head">
              <div>
                <h2>Goods Received Voucher</h2>
                <p>{{ draft.id }} · Dispatch {{ draft.dispatchRef }}</p>
              </div>
              <app-touch-button variant="ghost" (pressed)="cancelGrv()">Cancel</app-touch-button>
            </div>

            <div class="grv__lines">
              @for (line of draft.lines; track line.sku; let i = $index) {
                <div class="grv-line">
                  <div>
                    <strong>{{ line.name }}</strong>
                    <small>{{ line.sku }} · Slot {{ line.slotCode }} · Expected {{ line.expectedQty }}</small>
                  </div>
                  <label>
                    Accepted
                    <input
                      type="number"
                      min="0"
                      [ngModel]="line.acceptedQty"
                      (ngModelChange)="updateLine(i, 'acceptedQty', $event)"
                    />
                  </label>
                  <label>
                    Damaged
                    <input
                      type="number"
                      min="0"
                      [ngModel]="line.damagedQty"
                      (ngModelChange)="updateLine(i, 'damagedQty', $event)"
                    />
                  </label>
                </div>
              }
            </div>

            <label class="notes">
              Notes
              <textarea [(ngModel)]="draft.notes" rows="2" placeholder="Shortages, damaged packaging…"></textarea>
            </label>

            <app-touch-button
              variant="primary"
              [block]="true"
              [disabled]="posting()"
              (pressed)="postGrv()"
            >
              {{ posting() ? 'Posting GRV…' : 'Post GRV & update stock' }}
            </app-touch-button>
          </article>
        }
      }
    </section>
  `,
  styles: `
    .attendant__login {
      max-width: 420px;
      margin: 80px auto;
      display: grid;
      gap: 16px;
      padding: 32px;
      border-radius: 20px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .attendant__logo {
      width: 180px;
      height: auto;
      margin: 0 auto 4px;
      object-fit: contain;
    }

    input[type='password'],
    input[type='number'],
    textarea {
      min-height: 48px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
    }

    textarea {
      padding: 12px 14px;
      min-height: 72px;
      resize: vertical;
    }

    .error {
      color: #c62828;
      font-weight: 600;
    }

    .banner {
      margin: 0 0 16px;
      padding: 12px 16px;
      border-radius: 12px;
      font-weight: 700;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .banner[data-tone='warn'] {
      background: #fff4e0;
      color: #9a6700;
    }

    .banner[data-tone='danger'] {
      background: #ffebee;
      color: #c62828;
    }

    .attendant__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .panel {
      padding: 24px;
      border-radius: 18px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }

    .panel h2 {
      margin: 0 0 16px;
      font-size: 1.1rem;
    }

    .panel ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
    }

    .panel li {
      padding: 10px 12px;
      border-radius: 10px;
      background: #ffebee;
    }

    .panel li.ok {
      background: var(--primary-soft);
    }

    .stock-list {
      display: grid;
      gap: 8px;
      max-height: 360px;
      overflow: auto;
    }

    .stock-row {
      display: grid;
      grid-template-columns: 48px 1fr 40px;
      gap: 8px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg);
      font-size: 0.9rem;
    }

    .stock-row.low {
      background: #fff8e1;
    }

    .stock-row em {
      font-style: normal;
      font-weight: 700;
      text-align: right;
    }

    .actions {
      display: grid;
      gap: 10px;
    }

    .grv {
      margin-top: 20px;
      display: grid;
      gap: 16px;
    }

    .grv__head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .grv__head h2 {
      margin: 0 0 4px;
    }

    .grv__head p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .grv__lines {
      display: grid;
      gap: 10px;
    }

    .grv-line {
      display: grid;
      grid-template-columns: 1.4fr 120px 120px;
      gap: 12px;
      align-items: end;
      padding: 12px;
      border-radius: 12px;
      background: var(--bg);
    }

    .grv-line small {
      display: block;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .grv-line label,
    .notes {
      display: grid;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    a {
      color: var(--primary-dark);
    }

    @media (max-width: 860px) {
      .grv-line {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AttendantComponent {
  private readonly machine = inject(MachineService);
  private readonly ops = inject(OpsDataService);
  private readonly router = inject(Router);

  readonly machine$ = this.machine.getMachineInfo();
  readonly health$ = this.machine.getHealth();
  readonly products = MOCK_PRODUCTS;
  readonly authenticated = signal(false);
  readonly error = signal('');
  readonly maintenance = signal(false);
  readonly grv = signal<GrvRecord | null>(null);
  readonly posting = signal(false);
  readonly actionMessage = signal('');
  readonly actionTone = signal<'ok' | 'warn' | 'danger'>('ok');

  pin = '';

  login(): void {
    if (this.pin === STAFF_PIN) {
      this.authenticated.set(true);
      this.error.set('');
      return;
    }
    this.error.set('Invalid PIN. Try 1234 for demo.');
  }

  logout(): void {
    this.authenticated.set(false);
    this.pin = '';
    this.grv.set(null);
    void this.router.navigate(['/']);
  }

  runSelfTest(): void {
    this.flash('Self-test passed · network, printer, dispenser OK', 'ok');
  }

  clearJam(): void {
    this.flash('Jam cleared · dispenser cycle reset', 'ok');
  }

  toggleMaintenance(): void {
    const next = !this.maintenance();
    this.maintenance.set(next);
    this.flash(
      next ? 'Machine in maintenance — customer sales paused' : 'Machine returned to service',
      next ? 'warn' : 'ok',
    );
  }

  startGrv(): void {
    this.grv.set(this.ops.draftGrv());
    this.flash('GRV draft opened — count accepted / damaged units', 'ok');
  }

  cancelGrv(): void {
    this.grv.set(null);
  }

  updateLine(index: number, field: 'acceptedQty' | 'damagedQty', value: number): void {
    const current = this.grv();
    if (!current) return;
    const lines = current.lines.map((line, i) =>
      i === index ? { ...line, [field]: Number(value) || 0 } : line,
    );
    this.grv.set({ ...current, lines });
  }

  postGrv(): void {
    const draft = this.grv();
    if (!draft || this.posting()) return;
    this.posting.set(true);
    this.ops.postGrv(draft).subscribe({
      next: (posted) => {
        this.posting.set(false);
        this.grv.set(null);
        this.flash(`${posted.id} posted · stock replenished from accepted quantities`, 'ok');
      },
      error: () => {
        this.posting.set(false);
        this.flash('Could not post GRV — try again', 'danger');
      },
    });
  }

  private flash(message: string, tone: 'ok' | 'warn' | 'danger'): void {
    this.actionMessage.set(message);
    this.actionTone.set(tone);
  }
}
