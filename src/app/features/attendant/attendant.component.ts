import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { MachineService } from '../../core/services/machine.service';
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

        <div class="attendant__grid">
          <article class="panel">
            <h2>Machine health</h2>
            @if (health$ | async; as health) {
              <ul>
                <li [class.ok]="health.online">Network: {{ health.online ? 'Online' : 'Offline' }}</li>
                <li [class.ok]="health.printerOk">Printer: {{ health.printerOk ? 'OK' : 'Fault' }}</li>
                <li [class.ok]="health.dispenserOk">Dispenser: {{ health.dispenserOk ? 'OK' : 'Fault' }}</li>
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
              <app-touch-button variant="secondary" [block]="true">Run self-test</app-touch-button>
              <app-touch-button variant="secondary" [block]="true">Clear jam</app-touch-button>
              <app-touch-button variant="secondary" [block]="true">Start restock</app-touch-button>
              <app-touch-button variant="danger" [block]="true">Put machine in maintenance</app-touch-button>
            </div>
          </article>
        </div>
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

    input {
      min-height: 56px;
      padding: 0 16px;
      border: 2px solid var(--border);
      border-radius: 14px;
      font-size: 1.2rem;
      text-align: center;
    }

    .error {
      color: #c62828;
      font-weight: 600;
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

    a {
      color: var(--primary-dark);
    }
  `,
})
export class AttendantComponent {
  private readonly machine = inject(MachineService);
  private readonly router = inject(Router);

  readonly machine$ = this.machine.getMachineInfo();
  readonly health$ = this.machine.getHealth();
  readonly products = MOCK_PRODUCTS;
  readonly authenticated = signal(false);
  readonly error = signal('');

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
    void this.router.navigate(['/']);
  }
}
