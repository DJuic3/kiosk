import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-fiscal-receipt',
  standalone: true,
  imports: [DatePipe, CurrencyFormatPipe],
  template: `
    <section class="fiscal page">
      <div class="fiscal__card">
        @if (phase() === 'issuing') {
          <div class="spinner"></div>
          <h1>Issuing fiscal receipt</h1>
          <p>Your payment is confirmed. Fiscalising with ZIMRA before dispense…</p>
        } @else if (order()) {
          <div class="badge">Fiscalised</div>
          <h1>Proof of payment</h1>
          <p>Keep this receipt — dispensing starts next.</p>
          <div class="fiscal__details">
            <div><span>Fiscal no.</span><strong>{{ order()!.fiscalReceipt?.fiscalNumber }}</strong></div>
            <div><span>Receipt</span><strong>{{ order()!.receiptNumber }}</strong></div>
            <div><span>Order</span><strong>{{ order()!.id }}</strong></div>
            <div><span>Amount</span><strong>{{ order()!.total | currencyFormat: order()!.currency }}</strong></div>
            <div>
              <span>Issued</span>
              <strong>{{ order()!.fiscalReceipt?.issuedAt | date: 'dd MMM yyyy HH:mm:ss' }}</strong>
            </div>
            <div><span>Provider</span><strong>{{ order()!.fiscalReceipt?.provider }}</strong></div>
          </div>
          <p class="hint">Dispensing will begin automatically…</p>
        }
      </div>
    </section>
  `,
  styles: `
    .fiscal { display: grid; place-items: center; }
    .fiscal__card {
      width: min(560px, 100%);
      display: grid;
      gap: 14px;
      padding: 40px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }
    .badge {
      justify-self: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #e8f5ee;
      color: var(--success);
      font-weight: 800;
      font-size: 0.78rem;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: 1.9rem; }
    p { margin: 0; color: var(--text-muted); }
    .fiscal__details {
      display: grid;
      gap: 10px;
      padding: 16px;
      border-radius: 16px;
      background: var(--bg);
      text-align: left;
    }
    .fiscal__details > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .fiscal__details span { color: var(--text-muted); font-weight: 600; }
    .hint { font-weight: 700; color: var(--primary-dark); }
    .spinner {
      width: 64px;
      height: 64px;
      margin: 0 auto;
      border: 5px solid #e0e0e0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class FiscalReceiptComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly session = inject(SessionService);

  readonly order = this.session.activeOrder;
  readonly phase = signal<'issuing' | 'ready'>('issuing');

  ngOnInit(): void {
    const order = this.session.activeOrder();
    if (!order) {
      void this.router.navigate(['/']);
      return;
    }
    this.session.setStep('fiscal');
    this.orders.fiscaliseOrder(order).subscribe({
      next: (fiscalised) => {
        this.session.setOrder(fiscalised);
        this.phase.set('ready');
        setTimeout(() => {
          this.session.setStep('dispensing');
          void this.router.navigate(['/dispensing']);
        }, 2200);
      },
      error: () => void this.router.navigate(['/dispensing']),
    });
  }
}
