import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VoucherReservation } from '../../../core/models/ops.model';
import { OpsDataService } from '../../../core/services/ops-data.service';
import { SessionService } from '../../../core/services/session.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

@Component({
  selector: 'app-voucher-collect',
  standalone: true,
  imports: [FormsModule, RouterLink, TouchButtonComponent],
  template: `
    <section class="voucher page">
      <div class="voucher__card">
        <a routerLink="/" class="back">← Back</a>
        <h1>Collect with voucher</h1>
        <p>Enter the collection code from Super App, gift, or courier SMS.</p>

        @if (phase() === 'entry') {
          <input
            [(ngModel)]="code"
            placeholder="e.g. VCH-48291"
            maxlength="16"
            (keyup.enter)="validate()"
          />
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <app-touch-button variant="primary" [block]="true" (pressed)="validate()">
            Validate voucher
          </app-touch-button>
          <p class="hint">Demo codes: VCH-48291 · VCH-77310 · VCH-11902 (expired)</p>
        }

        @if (phase() === 'ready' && voucher(); as v) {
          <div class="ready">
            <strong>{{ v.productName }}</strong>
            <span>{{ v.recipientHint }} · Slot {{ v.slotCode }}</span>
            <span>Reserved for {{ v.buyerName }}</span>
          </div>
          <app-touch-button variant="primary" [block]="true" (pressed)="collect()">
            Dispense from reservation tray
          </app-touch-button>
        }

        @if (phase() === 'dispensing') {
          <div class="spinner"></div>
          <p>Dispensing from reservation tray…</p>
        }

        @if (phase() === 'done') {
          <div class="ok">✓</div>
          <h2>Collected</h2>
          <p>Please take your item from the collection bin.</p>
          <app-touch-button variant="primary" [block]="true" (pressed)="finish()">Done</app-touch-button>
        }

        @if (phase() === 'expired') {
          <div class="warn">!</div>
          <h2>Voucher expired</h2>
          <p>Reservation released. Buyer will be refunded via credit note. Ask Yamurai for help.</p>
          <app-touch-button variant="secondary" [block]="true" (pressed)="reset()">Try another</app-touch-button>
        }
      </div>
    </section>
  `,
  styles: `
    .voucher { display: grid; place-items: center; }
    .voucher__card {
      width: min(520px, 100%);
      display: grid;
      gap: 14px;
      padding: 32px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .back { color: var(--primary); font-weight: 700; text-decoration: none; }
    h1, h2 { margin: 0; }
    p { margin: 0; color: var(--text-muted); }
    input {
      min-height: 52px; padding: 0 14px; border: 2px solid var(--border);
      border-radius: 12px; font: inherit; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .error { color: #c62828; font-weight: 700; }
    .hint { font-size: 0.85rem; }
    .ready {
      display: grid; gap: 4px; padding: 14px; border-radius: 14px; background: var(--bg);
    }
    .ready strong { font-size: 1.15rem; }
    .ok, .warn {
      width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center;
      margin: 0 auto; font-size: 1.4rem; font-weight: 800; color: #fff;
    }
    .ok { background: var(--success); }
    .warn { background: var(--warning); }
    .spinner {
      width: 56px; height: 56px; margin: 0 auto; border: 5px solid #e0e0e0;
      border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class VoucherCollectComponent {
  private readonly ops = inject(OpsDataService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  code = '';
  readonly phase = signal<'entry' | 'ready' | 'dispensing' | 'done' | 'expired'>('entry');
  readonly voucher = signal<VoucherReservation | null>(null);
  readonly error = signal('');

  constructor() {
    this.session.setStep('voucher');
  }

  validate(): void {
    this.error.set('');
    if (!this.code.trim()) {
      this.error.set('Enter a voucher code.');
      return;
    }
    this.ops.validateVoucher(this.code).subscribe({
      next: (v) => {
        if (!v) {
          this.error.set('Voucher not found. Check the code or ask Yamurai.');
          return;
        }
        if (v.status === 'expired') {
          this.voucher.set(v);
          this.phase.set('expired');
          return;
        }
        if (v.status === 'collected') {
          this.error.set('This voucher was already collected.');
          return;
        }
        this.voucher.set(v);
        this.phase.set('ready');
      },
    });
  }

  collect(): void {
    const v = this.voucher();
    if (!v) return;
    this.phase.set('dispensing');
    this.ops.collectVoucher(v.code).subscribe({
      next: () => this.phase.set('done'),
    });
  }

  reset(): void {
    this.code = '';
    this.voucher.set(null);
    this.phase.set('entry');
  }

  finish(): void {
    this.session.endSession();
    void this.router.navigate(['/']);
  }
}
