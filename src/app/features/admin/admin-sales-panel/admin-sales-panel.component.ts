import { AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AdminSale } from '../../../core/models/admin.model';
import { AdminDataService, AdminSaleInput } from '../../../core/services/admin-data.service';
import { MOCK_PRODUCTS } from '../../../core/data/mock-catalog';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type SalesMode = 'index' | 'view' | 'create';

@Component({
  selector: 'app-admin-sales-panel',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe, FormsModule, TouchButtonComponent],
  template: `
    <section class="sales-panel">
      @if (mode() === 'index') {
        <div class="sales-panel__head">
          <div>
            <h1>Sales</h1>
            <p class="sub">Index of transactions — view or create records.</p>
          </div>
          <app-touch-button variant="primary" (pressed)="openCreate()">+ New sale</app-touch-button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Receipt</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sale of sales$ | async; track sale.id) {
                <tr>
                  <td>{{ sale.soldAt | date: 'dd MMM HH:mm' }}</td>
                  <td>{{ sale.receiptNumber }}</td>
                  <td>
                    <strong>{{ sale.productName }}</strong>
                    <small>{{ sale.sku }}</small>
                  </td>
                  <td>{{ sale.quantity }}</td>
                  <td>{{ sale.total | currency: 'USD' }}</td>
                  <td>{{ sale.paymentMethod | uppercase }}</td>
                  <td>
                    <span class="pill" [attr.data-status]="sale.status">{{ sale.status }}</span>
                  </td>
                  <td class="actions">
                    <button type="button" (click)="openView(sale)">View</button>
                    <button type="button" class="danger" (click)="remove(sale)">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty">No sales yet. Create the first record.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (mode() === 'view' && selected(); as sale) {
        <div class="sales-panel__head">
          <div>
            <button type="button" class="back-link" (click)="backToIndex()">← Back to sales</button>
            <h1>Sale details</h1>
            <p class="sub">Transaction record for {{ sale.receiptNumber }}</p>
          </div>
          <div class="head-actions">
            <app-touch-button variant="danger" (pressed)="remove(sale)">Delete</app-touch-button>
          </div>
        </div>

        <div class="view-layout">
          <div class="view-main">
            <article class="view-hero" [attr.data-status]="sale.status">
              <div class="view-hero__top">
                <span class="pill" [attr.data-status]="sale.status">{{ sale.status }}</span>
                <span class="view-hero__id">{{ sale.id }}</span>
              </div>
              <div class="view-hero__body">
                @if (productImage(sale.sku); as imageUrl) {
                  <img [src]="imageUrl" [alt]="sale.productName" />
                }
                <div>
                  <h2>{{ sale.productName }}</h2>
                  <p>{{ sale.sku }}</p>
                  <div class="view-hero__price">
                    <strong>{{ sale.total | currency: 'USD' }}</strong>
                    <small>
                      {{ sale.quantity }} × {{ sale.unitPrice | currency: 'USD' }}
                    </small>
                  </div>
                </div>
              </div>
            </article>

            <article class="view-section">
              <h3>Line item</h3>
              <table class="view-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{{ sale.productName }}</td>
                    <td>{{ sale.sku }}</td>
                    <td>{{ sale.quantity }}</td>
                    <td>{{ sale.unitPrice | currency: 'USD' }}</td>
                    <td><strong>{{ sale.total | currency: 'USD' }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </article>

            <article class="view-section">
              <h3>Payment</h3>
              <div class="payment-card">
                <div>
                  <span>Method</span>
                  <strong>{{ paymentLabel(sale.paymentMethod) }}</strong>
                </div>
                <div>
                  <span>Amount charged</span>
                  <strong>{{ sale.total | currency: 'USD' }}</strong>
                </div>
                <div>
                  <span>Settlement</span>
                  <strong>{{ sale.status === 'voided' ? 'Refunded / voided' : 'Captured' }}</strong>
                </div>
              </div>
            </article>
          </div>

          <aside class="view-side">
            <article class="view-section">
              <h3>Receipt</h3>
              <div class="meta-list">
                <div><span>Receipt no.</span><strong>{{ sale.receiptNumber }}</strong></div>
                <div><span>Sale ID</span><strong>{{ sale.id }}</strong></div>
                <div>
                  <span>Sold at</span>
                  <strong>{{ sale.soldAt | date: 'EEEE, dd MMM yyyy' }}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{{ sale.soldAt | date: 'HH:mm:ss' }}</strong>
                </div>
              </div>
            </article>

            <article class="view-section">
              <h3>Machine</h3>
              <div class="meta-list">
                <div><span>Machine ID</span><strong>{{ machineId() }}</strong></div>
                <div><span>Location</span><strong>Harare CBD</strong></div>
                <div><span>Channel</span><strong>Self-service kiosk</strong></div>
              </div>
            </article>

            <article class="view-section totals">
              <h3>Totals</h3>
              <div class="totals-rows">
                <div><span>Subtotal</span><span>{{ sale.total | currency: 'USD' }}</span></div>
                <div><span>Tax</span><span>Included</span></div>
                <div class="grand">
                  <span>Grand total</span>
                  <strong>{{ sale.total | currency: 'USD' }}</strong>
                </div>
              </div>
            </article>
          </aside>
        </div>
      }

      @if (mode() === 'create') {
        <div class="sales-panel__head">
          <div>
            <h1>Create sale</h1>
            <p class="sub">Add a manual sale / adjustment record.</p>
          </div>
          <app-touch-button variant="ghost" (pressed)="backToIndex()">Cancel</app-touch-button>
        </div>

        <form class="sale-form" (ngSubmit)="save()">
          <label>
            Product
            <select [(ngModel)]="form.sku" name="sku" required (ngModelChange)="onProductChange($event)">
              <option value="" disabled>Select product</option>
              @for (product of products; track product.id) {
                <option [value]="product.sku">{{ product.name }} ({{ product.sku }})</option>
              }
            </select>
          </label>

          <label>
            Receipt number
            <input [(ngModel)]="form.receiptNumber" name="receiptNumber" required />
          </label>

          <label>
            Quantity
            <input type="number" min="1" [(ngModel)]="form.quantity" name="quantity" required />
          </label>

          <label>
            Unit price (USD)
            <input type="number" min="0" step="0.01" [(ngModel)]="form.unitPrice" name="unitPrice" required />
          </label>

          <label>
            Payment method
            <select [(ngModel)]="form.paymentMethod" name="paymentMethod" required>
              <option value="ecocash">EcoCash</option>
              <option value="card">Card</option>
              <option value="qr">QR</option>
              <option value="cash">Cash</option>
            </select>
          </label>

          <label>
            Status
            <select [(ngModel)]="form.status" name="status" required>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="voided">Voided</option>
            </select>
          </label>

          <label>
            Sold at
            <input type="datetime-local" [(ngModel)]="form.soldAtLocal" name="soldAtLocal" required />
          </label>

          <div class="sale-form__total">
            Line total:
            <strong>{{ form.quantity * form.unitPrice | currency: 'USD' }}</strong>
          </div>

          @if (formError()) {
            <p class="form-error">{{ formError() }}</p>
          }

          <div class="sale-form__actions">
            <app-touch-button variant="secondary" (pressed)="backToIndex()">Cancel</app-touch-button>
            <app-touch-button variant="primary" (pressed)="save()">Create sale</app-touch-button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .sales-panel__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.7rem;
      font-weight: 800;
    }

    .sub {
      margin: 0;
      color: var(--text-muted);
    }

    .head-actions {
      display: flex;
      gap: 10px;
    }

    .table-wrap {
      overflow: auto;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }

    th,
    td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th {
      background: #f7f8fc;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    td strong {
      display: block;
    }

    td small {
      color: var(--text-muted);
    }

    .empty {
      text-align: center;
      color: var(--text-muted);
      padding: 32px !important;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      white-space: nowrap;
    }

    .actions button {
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    .actions button.danger {
      color: #c62828;
      border-color: #f5c2c7;
    }

    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pill[data-status='completed'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .pill[data-status='partial'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .pill[data-status='voided'] {
      background: #ffebee;
      color: #c62828;
    }

    .detail-card,
    .sale-form {
      padding: 22px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .detail-grid span {
      display: block;
      margin-bottom: 4px;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .detail-grid strong {
      font-size: 1rem;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 8px;
      padding: 0;
      border: none;
      background: none;
      color: var(--primary);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .view-layout {
      display: grid;
      grid-template-columns: 1.4fr 0.9fr;
      gap: 16px;
      align-items: start;
    }

    .view-main,
    .view-side {
      display: grid;
      gap: 16px;
    }

    .view-hero,
    .view-section {
      padding: 20px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .view-hero {
      border-left: 5px solid var(--success);
      background:
        linear-gradient(135deg, rgba(26, 53, 163, 0.04), transparent 50%),
        #fff;
    }

    .view-hero[data-status='partial'] {
      border-left-color: var(--warning);
    }

    .view-hero[data-status='voided'] {
      border-left-color: #c62828;
    }

    .view-hero__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .view-hero__id {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .view-hero__body {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: 16px;
      align-items: center;
    }

    .view-hero__body img {
      width: 96px;
      height: 96px;
      object-fit: contain;
      border-radius: 14px;
      background: var(--bg);
      border: 1px solid var(--border);
    }

    .view-hero__body h2 {
      margin: 0 0 4px;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .view-hero__body p {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .view-hero__price strong {
      display: block;
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: -0.03em;
    }

    .view-hero__price small {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .view-section h3 {
      margin: 0 0 14px;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .view-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }

    .view-table th,
    .view-table td {
      padding: 10px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .view-table th {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .payment-card {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .payment-card > div,
    .meta-list > div {
      padding: 12px;
      border-radius: 12px;
      background: var(--bg);
    }

    .payment-card span,
    .meta-list span {
      display: block;
      margin-bottom: 4px;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .payment-card strong,
    .meta-list strong {
      font-size: 0.98rem;
      word-break: break-word;
    }

    .meta-list {
      display: grid;
      gap: 8px;
    }

    .totals {
      background: linear-gradient(180deg, #f7f8fc, #fff);
    }

    .totals-rows {
      display: grid;
      gap: 10px;
    }

    .totals-rows > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-weight: 600;
    }

    .totals-rows .grand {
      margin-top: 4px;
      padding-top: 12px;
      border-top: 2px solid var(--border);
      font-size: 1.15rem;
      color: var(--primary-dark);
    }

    @media (max-width: 900px) {
      .view-layout,
      .view-hero__body,
      .payment-card {
        grid-template-columns: 1fr;
      }
    }

    .sale-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      max-width: 820px;
    }

    .sale-form label {
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .sale-form input,
    .sale-form select {
      min-height: 48px;
      padding: 0 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
    }

    .sale-form__total,
    .sale-form__actions,
    .form-error {
      grid-column: 1 / -1;
    }

    .sale-form__total {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--primary-soft);
      font-weight: 700;
    }

    .sale-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .form-error {
      margin: 0;
      color: #c62828;
      font-weight: 700;
    }

    @media (max-width: 700px) {
      .sale-form {
        grid-template-columns: 1fr;
      }

      .sales-panel__head {
        flex-direction: column;
      }
    }
  `,
})
export class AdminSalesPanelComponent {
  private readonly data = inject(AdminDataService);

  readonly sales$ = this.data.getSales();
  readonly products = MOCK_PRODUCTS;
  readonly machineId = toSignal(this.data.getSelectedKioskId(), { initialValue: 'KIOSK-001' });
  readonly mode = signal<SalesMode>('index');
  readonly selected = signal<AdminSale | null>(null);
  readonly formError = signal('');

  form = this.blankForm();

  productImage(sku: string): string | null {
    return this.products.find((p) => p.sku === sku)?.imageUrl ?? null;
  }

  paymentLabel(method: string): string {
    const map: Record<string, string> = {
      ecocash: 'EcoCash',
      card: 'Card',
      qr: 'Scan to Pay (QR)',
      cash: 'Cash',
    };
    return map[method] ?? method.toUpperCase();
  }

  openCreate(): void {
    this.form = this.blankForm();
    this.formError.set('');
    this.selected.set(null);
    this.mode.set('create');
  }

  openView(sale: AdminSale): void {
    this.selected.set(sale);
    this.mode.set('view');
  }

  backToIndex(): void {
    this.mode.set('index');
    this.selected.set(null);
    this.formError.set('');
  }

  onProductChange(sku: string): void {
    const product = this.products.find((p) => p.sku === sku);
    if (!product) {
      return;
    }
    this.form.productName = product.name;
    this.form.unitPrice = product.price;
  }

  save(): void {
    if (!this.form.sku || !this.form.receiptNumber || !this.form.soldAtLocal) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    if (this.form.quantity < 1 || this.form.unitPrice < 0) {
      this.formError.set('Quantity and price must be valid.');
      return;
    }

    const payload: AdminSaleInput = {
      productName: this.form.productName,
      sku: this.form.sku,
      receiptNumber: this.form.receiptNumber.trim(),
      quantity: Number(this.form.quantity),
      unitPrice: Number(this.form.unitPrice),
      paymentMethod: this.form.paymentMethod,
      status: this.form.status,
      soldAt: new Date(this.form.soldAtLocal).toISOString(),
    };

    this.data.createSale(payload).subscribe({
      next: () => this.backToIndex(),
    });
  }

  remove(sale: AdminSale): void {
    if (!confirm(`Delete sale ${sale.receiptNumber}?`)) {
      return;
    }
    this.data.deleteSale(sale.id).subscribe({
      next: () => this.backToIndex(),
    });
  }

  private blankForm() {
    const now = new Date();
    now.setSeconds(0, 0);
    return {
      productName: '',
      sku: '',
      receiptNumber: `RCP-${Math.floor(10000 + Math.random() * 89999)}`,
      quantity: 1,
      unitPrice: 0,
      paymentMethod: 'ecocash',
      status: 'completed' as AdminSale['status'],
      soldAtLocal: this.toLocalInput(now.toISOString()),
    };
  }

  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
