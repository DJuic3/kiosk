import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OpsDataService } from '../../../core/services/ops-data.service';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';
import { CartService } from '../../../core/services/cart.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-refund',
  standalone: true,
  imports: [TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="refund page">
      <div class="refund__card">
        @if (phase() === 'processing') {
          <div class="spinner"></div>
          <h1>Creating credit note</h1>
          <p>Failed dispense after retries. Fiscalising a refund against your receipt…</p>
        } @else {
          <div class="ok">✓</div>
          <h1>Refund issued</h1>
          <p>A fiscalised credit note has been raised. Your original receipt is proof of payment.</p>
          @if (order(); as current) {
            <div class="details">
              <div><span>Credit note</span><strong>{{ current.creditNote?.id }}</strong></div>
              <div><span>Original order</span><strong>{{ current.id }}</strong></div>
              <div><span>Amount</span><strong>{{ current.creditNote!.amount | currencyFormat: current.currency }}</strong></div>
              <div><span>Reason</span><strong>{{ current.creditNote?.reason }}</strong></div>
            </div>
          }
          <p class="help">Need help? Ask Yamurai on this screen.</p>
          <app-touch-button variant="primary" [block]="true" (pressed)="done()">Done</app-touch-button>
        }
      </div>
    </section>
  `,
  styles: `
    .refund { display: grid; place-items: center; }
    .refund__card {
      width: min(560px, 100%);
      display: grid;
      gap: 14px;
      padding: 40px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }
    .ok {
      width: 64px; height: 64px; margin: 0 auto; border-radius: 50%;
      display: grid; place-items: center; background: var(--success); color: #fff; font-size: 1.6rem; font-weight: 800;
    }
    h1 { margin: 0; }
    p { margin: 0; color: var(--text-muted); }
    .details {
      display: grid; gap: 10px; padding: 14px; border-radius: 14px; background: var(--bg); text-align: left;
    }
    .details > div { display: flex; justify-content: space-between; gap: 10px; }
    .details span { color: var(--text-muted); font-weight: 600; }
    .help { font-weight: 700; color: var(--primary-dark); }
    .spinner {
      width: 64px; height: 64px; margin: 0 auto; border: 5px solid #e0e0e0;
      border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class RefundComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly ops = inject(OpsDataService);
  private readonly session = inject(SessionService);
  private readonly cart = inject(CartService);

  readonly order = this.session.activeOrder;
  readonly phase = signal<'processing' | 'done'>('processing');

  ngOnInit(): void {
    const order = this.session.activeOrder();
    if (!order) {
      void this.router.navigate(['/']);
      return;
    }
    this.session.setStep('refund');
    const failed = (order.dispenseResults ?? []).filter((r) => r.status === 'failed');
    const reason =
      failed.length > 0
        ? `Failed dispense after retries (${failed.map((f) => f.productName).join(', ')})`
        : 'Failed dispense after retries';

    this.orders.createCreditNote(order, reason).subscribe({
      next: (note) => {
        this.ops.addCreditNote(note).subscribe();
        this.session.setOrder({ ...order, creditNote: note, status: 'refunded' });
        this.phase.set('done');
      },
    });
  }

  done(): void {
    this.cart.clear();
    this.session.endSession();
    void this.router.navigate(['/']);
  }
}
