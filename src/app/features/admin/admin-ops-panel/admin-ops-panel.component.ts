import { AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { OpsDataService } from '../../../core/services/ops-data.service';

type OpsSection = 'credit-notes' | 'reservations' | 'replenishment';

@Component({
  selector: 'app-admin-ops-panel',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe],
  template: `
    <section class="ops">
      <div class="ops__head">
        <div>
          <h1>Operations</h1>
          <p class="sub">Credit notes, voucher reservations, and GRV replenishment.</p>
        </div>
        <div class="section-tabs">
          @for (tab of sections; track tab.id) {
            <button
              type="button"
              [class.active]="section() === tab.id"
              (click)="section.set(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      @if (summary$ | async; as summary) {
        <div class="kpi-grid">
          <article class="kpi">
            <span>Open credit notes</span>
            <strong>{{ summary.openNotes }}</strong>
          </article>
          <article class="kpi">
            <span>Active reservations</span>
            <strong>{{ summary.activeVouchers }}</strong>
          </article>
          <article class="kpi">
            <span>GRVs posted</span>
            <strong>{{ summary.grvs }}</strong>
          </article>
          <article class="kpi">
            <span>Refund exposure</span>
            <strong>{{ summary.refundTotal | currency: 'USD' }}</strong>
          </article>
        </div>
      }

      @if (section() === 'credit-notes') {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Credit note</th>
                <th>Order</th>
                <th>Receipt</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (note of creditNotes$ | async; track note.id) {
                <tr>
                  <td><strong>{{ note.id }}</strong></td>
                  <td>{{ note.orderId }}</td>
                  <td>{{ note.receiptNumber }}</td>
                  <td>{{ note.amount | currency: note.currency }}</td>
                  <td>{{ note.reason }}</td>
                  <td><span class="pill" [attr.data-status]="note.status">{{ note.status | uppercase }}</span></td>
                  <td>{{ note.createdAt | date: 'dd MMM HH:mm' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty">No credit notes yet — failed dispenses create them on the kiosk.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (section() === 'reservations') {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Buyer</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              @for (v of vouchers$ | async; track v.code) {
                <tr>
                  <td><strong>{{ v.code }}</strong></td>
                  <td>{{ v.productName }}</td>
                  <td>{{ v.buyerName }} · {{ v.recipientHint }}</td>
                  <td>{{ v.slotCode }}</td>
                  <td><span class="pill" [attr.data-status]="v.status">{{ v.status | uppercase }}</span></td>
                  <td>{{ v.expiresAt | date: 'dd MMM yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (section() === 'replenishment') {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>GRV</th>
                <th>Dispatch</th>
                <th>Lines</th>
                <th>Accepted</th>
                <th>Damaged</th>
                <th>Status</th>
                <th>Posted</th>
              </tr>
            </thead>
            <tbody>
              @for (g of grvs$ | async; track g.id) {
                <tr>
                  <td><strong>{{ g.id }}</strong></td>
                  <td>{{ g.dispatchRef }}</td>
                  <td>{{ g.lines.length }}</td>
                  <td>{{ accepted(g) }}</td>
                  <td>{{ damaged(g) }}</td>
                  <td><span class="pill" [attr.data-status]="g.status">{{ g.status | uppercase }}</span></td>
                  <td>{{ g.createdAt | date: 'dd MMM HH:mm' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty">No GRVs yet — post one from the attendant console.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .ops__head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 0;
      color: var(--text-muted);
    }

    .section-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .section-tabs button {
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .section-tabs button.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .kpi {
      padding: 16px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--border);
      display: grid;
      gap: 6px;
    }

    .kpi span {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .kpi strong {
      font-size: 1.4rem;
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #fff;
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
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      background: #f7f8fc;
    }

    .empty {
      text-align: center;
      color: var(--text-muted);
      padding: 28px !important;
    }

    .pill {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 800;
      background: #eef1f8;
      color: var(--primary-dark);
    }

    .pill[data-status='refunded'],
    .pill[data-status='fiscalised'],
    .pill[data-status='collected'],
    .pill[data-status='posted'] {
      background: #e8f5ee;
      color: #1b7a45;
    }

    .pill[data-status='expired'],
    .pill[data-status='pending'] {
      background: #fff4e0;
      color: #9a6700;
    }

    @media (max-width: 980px) {
      .kpi-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class AdminOpsPanelComponent {
  private readonly ops = inject(OpsDataService);

  readonly section = signal<OpsSection>('credit-notes');
  readonly sections: { id: OpsSection; label: string }[] = [
    { id: 'credit-notes', label: 'Credit notes' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'replenishment', label: 'Replenishment' },
  ];

  readonly creditNotes$ = this.ops.getCreditNotes();
  readonly vouchers$ = this.ops.getVouchers();
  readonly grvs$ = this.ops.getGrvs();

  readonly summary$ = combineLatest([this.creditNotes$, this.vouchers$, this.grvs$]).pipe(
    map(([notes, vouchers, grvs]) => ({
      openNotes: notes.filter((n) => n.status !== 'refunded').length,
      activeVouchers: vouchers.filter((v) => v.status === 'reserved').length,
      grvs: grvs.length,
      refundTotal: notes.reduce((sum, n) => sum + n.amount, 0),
    })),
  );

  accepted(g: { lines: { acceptedQty: number }[] }): number {
    return g.lines.reduce((sum, line) => sum + line.acceptedQty, 0);
  }

  damaged(g: { lines: { damagedQty: number }[] }): number {
    return g.lines.reduce((sum, line) => sum + line.damagedQty, 0);
  }
}
