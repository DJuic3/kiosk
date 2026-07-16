import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { MachineService } from '../../../core/services/machine.service';
import { OrderService } from '../../../core/services/order.service';
import { ReceiptService } from '../../../core/services/receipt.service';
import { SessionService } from '../../../core/services/session.service';
import { MachineInfo } from '../../../core/models/machine.model';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-collect',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="collect page">
      <div class="collect__layout">
        <div class="collect__panel">
          <div class="collect__icon">📦</div>
          <h1>Collect your items</h1>
          <p>Please take your items from the collection bin below.</p>

          @if (order(); as currentOrder) {
            <div class="collect__items">
              @for (result of currentOrder.dispenseResults ?? []; track $index) {
                <div class="collect__item" [class.failed]="result.status === 'failed'">
                  <span>{{ result.status === 'success' ? '✓' : '✕' }}</span>
                  <div>
                    <strong>{{ result.productName }}</strong>
                    <small>Slot {{ result.slotCode }}</small>
                  </div>
                </div>
              }
            </div>
          }

          <p class="collect__note">
            @if (downloadStatus() === 'done') {
              Receipt downloaded · Screen resets shortly
            } @else if (downloadStatus() === 'error') {
              Receipt ready on screen · Download failed — tap Download again
            } @else {
              Preparing your receipt…
            }
          </p>

          <div class="collect__actions">
            <app-touch-button variant="secondary" [block]="true" (pressed)="downloadAgain()">
              Download receipt
            </app-touch-button>
            <app-touch-button variant="primary" [block]="true" (pressed)="finish()">
              Done
            </app-touch-button>
          </div>
        </div>

        @if (order(); as currentOrder) {
          <aside class="receipt" aria-label="Purchase receipt">
            <div class="receipt__paper">
              <div class="receipt__brand">
                <img src="images/EconetLogo.png" alt="Econet Wireless" />
                <h2>Self-Service Kiosk</h2>
                @if (machine(); as m) {
                  <p>{{ m.name }}</p>
                  <p>{{ m.location }}</p>
                }
              </div>

              <div class="receipt__cut"></div>

              <div class="receipt__meta">
                <div><span>Receipt No</span><strong>{{ receiptNumber }}</strong></div>
                <div><span>Order ID</span><strong>{{ currentOrder.id }}</strong></div>
                <div><span>Machine ID</span><strong>{{ machine()?.id ?? currentOrder.machineId }}</strong></div>
                <div><span>Location</span><strong>{{ machine()?.location ?? '—' }}</strong></div>
                <div>
                  <span>Date</span>
                  <strong>{{ currentOrder.createdAt | date: 'dd MMM yyyy' }}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{{ currentOrder.createdAt | date: 'HH:mm:ss' }}</strong>
                </div>
              </div>

              <div class="receipt__cut"></div>

              <table class="receipt__table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of currentOrder.lines; track line.product.id) {
                    <tr>
                      <td>
                        <strong>{{ line.product.name }}</strong>
                        <small>SKU {{ line.product.sku }} · Slot {{ line.product.slotCode }}</small>
                      </td>
                      <td>{{ line.quantity }}</td>
                      <td>{{ line.unitPrice | currencyFormat: currentOrder.currency }}</td>
                      <td>{{ line.unitPrice * line.quantity | currencyFormat: currentOrder.currency }}</td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="receipt__cut"></div>

              <div class="receipt__totals">
                <div><span>Subtotal</span><span>{{ currentOrder.total | currencyFormat: currentOrder.currency }}</span></div>
                <div><span>Tax</span><span>Included</span></div>
                <div class="grand">
                  <span>TOTAL</span>
                  <span>{{ currentOrder.total | currencyFormat: currentOrder.currency }}</span>
                </div>
              </div>

              <div class="receipt__cut"></div>

              <div class="receipt__meta">
                <div>
                  <span>Payment</span>
                  <strong>{{ (payment()?.method || currentOrder.paymentMethod || '—') | uppercase }}</strong>
                </div>
                <div>
                  <span>Reference</span>
                  <strong>{{ payment()?.reference || '—' }}</strong>
                </div>
                <div><span>Status</span><strong>PAID</strong></div>
              </div>

              <p class="receipt__thanks">Thank you for shopping with Econet</p>
              <div class="receipt__barcode" aria-hidden="true"></div>
              <p class="receipt__footer">
                Keep this receipt for your records<br />
                Goods dispensed from {{ machine()?.id ?? currentOrder.machineId }}
              </p>
            </div>
          </aside>
        }
      </div>
    </section>
  `,
  styles: `
    .collect {
      display: grid;
      place-items: start center;
      padding-top: 24px;
      padding-bottom: 40px;
    }

    .collect__layout {
      width: min(980px, 100%);
      display: grid;
      grid-template-columns: 1fr minmax(300px, 360px);
      gap: 28px;
      align-items: start;
    }

    .collect__panel {
      display: grid;
      gap: 16px;
      padding: 32px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .collect__icon {
      font-size: 3.4rem;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .collect__panel > p {
      margin: 0;
      color: var(--text-muted);
    }

    .collect__items {
      display: grid;
      gap: 10px;
      text-align: left;
    }

    .collect__item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--primary-soft);
    }

    .collect__item.failed {
      background: #ffebee;
    }

    .collect__item span {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--success);
      color: #fff;
      font-weight: 800;
    }

    .collect__item.failed span {
      background: #c62828;
    }

    .collect__item small {
      display: block;
      color: var(--text-muted);
    }

    .collect__note {
      font-weight: 600;
      color: var(--primary-dark) !important;
    }

    .collect__actions {
      display: grid;
      gap: 10px;
    }

    .receipt {
      position: sticky;
      top: 16px;
    }

    .receipt__paper {
      padding: 22px 18px 28px;
      background:
        linear-gradient(180deg, #fffef8 0%, #fff 40%),
        #fff;
      color: #1a1a1a;
      font-family: 'Courier New', Courier, monospace;
      border-radius: 4px;
      box-shadow:
        0 12px 32px rgba(18, 38, 120, 0.14),
        inset 0 0 0 1px rgba(0, 0, 0, 0.04);
    }

    .receipt__brand {
      text-align: center;
    }

    .receipt__brand img {
      width: 160px;
      height: auto;
      margin: 0 auto 10px;
    }

    .receipt__brand h2 {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .receipt__brand p {
      margin: 0;
      font-size: 11px;
      color: #444;
      line-height: 1.4;
    }

    .receipt__cut {
      height: 0;
      margin: 14px 0;
      border-top: 1px dashed #999;
    }

    .receipt__meta {
      display: grid;
      gap: 6px;
      font-size: 11px;
    }

    .receipt__meta > div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .receipt__meta span {
      color: #555;
    }

    .receipt__meta strong {
      text-align: right;
      font-weight: 700;
      word-break: break-all;
    }

    .receipt__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .receipt__table th {
      text-align: left;
      padding-bottom: 6px;
      border-bottom: 1px dashed #999;
      font-size: 10px;
      text-transform: uppercase;
    }

    .receipt__table th:not(:first-child),
    .receipt__table td:not(:first-child) {
      text-align: right;
    }

    .receipt__table td {
      padding: 8px 0 0;
      vertical-align: top;
    }

    .receipt__table td strong {
      display: block;
      font-size: 11px;
    }

    .receipt__table td small {
      display: block;
      color: #666;
      font-size: 9px;
    }

    .receipt__totals {
      display: grid;
      gap: 4px;
      font-size: 12px;
    }

    .receipt__totals > div {
      display: flex;
      justify-content: space-between;
    }

    .receipt__totals .grand {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 2px solid #111;
      font-size: 14px;
      font-weight: 700;
    }

    .receipt__thanks {
      margin: 14px 0 0;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
    }

    .receipt__barcode {
      width: 170px;
      height: 34px;
      margin: 12px auto 0;
      background: repeating-linear-gradient(
        90deg,
        #111 0,
        #111 2px,
        transparent 2px,
        transparent 4px
      );
    }

    .receipt__footer {
      margin: 10px 0 0;
      text-align: center;
      font-size: 10px;
      color: #555;
      line-height: 1.45;
    }

    @media (max-width: 860px) {
      .collect__layout {
        grid-template-columns: 1fr;
      }

      .receipt {
        position: static;
        order: -1;
      }
    }
  `,
})
export class CollectComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly machines = inject(MachineService);
  private readonly receipts = inject(ReceiptService);
  readonly session = inject(SessionService);

  readonly order = this.session.activeOrder;
  readonly payment = this.session.paymentIntent;
  readonly machine = signal<MachineInfo | null>(null);
  readonly downloadStatus = signal<'pending' | 'done' | 'error'>('pending');

  receiptNumber = `RCP-${Date.now()}`;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private downloaded = false;

  ngOnInit(): void {
    if (!this.order()) {
      void this.router.navigate(['/']);
      return;
    }

    this.machines.getMachineInfo().subscribe({
      next: (info) => {
        this.machine.set(info);
        void this.autoDownload();
      },
      error: () => {
        void this.autoDownload();
      },
    });

    const order = this.order()!;
    this.orders.completeOrder(order.id).subscribe({
      next: (completed) => {
        this.receiptNumber = completed.receiptNumber ?? this.receiptNumber;
        if (!this.downloaded) {
          void this.autoDownload();
        }
      },
    });

    this.resetTimer = setTimeout(() => this.finish(), 20000);
  }

  ngOnDestroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  async downloadAgain(): Promise<void> {
    await this.autoDownload(true);
  }

  finish(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.cart.clear();
    this.session.endSession();
    void this.router.navigate(['/']);
  }

  private async autoDownload(force = false): Promise<void> {
    const order = this.order();
    if (!order || (this.downloaded && !force)) {
      return;
    }

    const machine =
      this.machine() ??
      ({
        id: order.machineId,
        name: 'Shop Kiosk',
        location: 'Unknown',
        status: 'online' as const,
        supportedPayments: [],
      });

    try {
      await this.receipts.downloadReceipt({
        order,
        machine,
        receiptNumber: this.receiptNumber,
        payment: this.payment(),
      });
      this.downloaded = true;
      this.downloadStatus.set('done');
    } catch {
      this.downloadStatus.set('error');
    }
  }
}
