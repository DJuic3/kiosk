import { AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminDataService } from '../../../core/services/admin-data.service';
import {
  FinanceAccount,
  FinanceLedgerEntry,
  FinanceSettlement,
} from '../../../core/models/admin.model';

type FinanceSection = 'overview' | 'accounts' | 'ledger' | 'settlements' | 'reconciliation';

@Component({
  selector: 'app-admin-finance-panel',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, UpperCasePipe],
  template: `
    @if (finance$ | async; as fin) {
      <section class="fin">
        <div class="fin__head">
          <div>
            <h1>Accounting &amp; finance</h1>
            <p class="sub">
              {{ fin.machineId }} · {{ fin.location }} · {{ fin.periodLabel }} · Updated
              {{ fin.generatedAt | date: 'dd MMM yyyy HH:mm' }}
            </p>
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

        <div class="alert-strip">
          @for (alert of fin.alerts; track alert.text) {
            <div class="alert" [attr.data-level]="alert.level">{{ alert.text }}</div>
          }
        </div>

        @if (section() === 'overview') {
          <div class="kpi-grid">
            <article class="kpi">
              <span>Gross revenue</span>
              <strong>{{ fin.summary.grossRevenue | currency: fin.currency }}</strong>
              <em>Before fees &amp; refunds</em>
            </article>
            <article class="kpi warn">
              <span>Refunds / voids</span>
              <strong>{{ fin.summary.refundsVoids | currency: fin.currency }}</strong>
              <em>Reversed turnover</em>
            </article>
            <article class="kpi warn">
              <span>Payment fees</span>
              <strong>{{ fin.summary.paymentFees | currency: fin.currency }}</strong>
              <em>Acquiring &amp; scheme</em>
            </article>
            <article class="kpi">
              <span>Tax collected</span>
              <strong>{{ fin.summary.taxCollected | currency: fin.currency }}</strong>
              <em>VAT recognised</em>
            </article>
            <article class="kpi success">
              <span>Net revenue</span>
              <strong>{{ fin.summary.netRevenue | currency: fin.currency }}</strong>
              <em>After fees &amp; refunds</em>
            </article>
            <article class="kpi">
              <span>Settled to date</span>
              <strong>{{ fin.summary.settledToDate | currency: fin.currency }}</strong>
              <em>Cleared to treasury</em>
            </article>
            <article class="kpi warn">
              <span>Pending settlements</span>
              <strong>{{ fin.summary.pendingSettlements | currency: fin.currency }}</strong>
              <em>In transit</em>
            </article>
            <article class="kpi">
              <span>Cash on hand</span>
              <strong>{{ fin.summary.cashOnHand | currency: fin.currency }}</strong>
              <em>Machine float</em>
            </article>
          </div>

          <div class="two-col">
            <article class="panel">
              <div class="panel__head">
                <h2>Payment channel mix</h2>
                <span>Gross recognised</span>
              </div>
              <div class="mix-list">
                @for (ch of fin.channelMix; track ch.label) {
                  <div class="mix-row">
                    <div class="mix-row__top">
                      <strong>{{ ch.label }}</strong>
                      <b>{{ ch.value | currency: fin.currency }}</b>
                    </div>
                    <div class="track">
                      <div
                        class="track__fill"
                        [style.width.%]="ch.percent"
                        [style.background]="ch.color"
                      ></div>
                    </div>
                    <small>{{ ch.percent }}% of gross</small>
                  </div>
                }
              </div>
            </article>

            <article class="panel">
              <div class="panel__head">
                <h2>P&amp;L snapshot</h2>
                <span>{{ fin.periodLabel }}</span>
              </div>
              <div class="pl">
                <div><span>Gross sales</span><strong>{{ fin.summary.grossRevenue | currency: fin.currency }}</strong></div>
                <div class="neg"><span>Less refunds / voids</span><strong>−{{ fin.summary.refundsVoids | currency: fin.currency }}</strong></div>
                <div class="neg"><span>Less payment fees</span><strong>−{{ fin.summary.paymentFees | currency: fin.currency }}</strong></div>
                <div class="total"><span>Net operating revenue</span><strong>{{ fin.summary.netRevenue | currency: fin.currency }}</strong></div>
                <div><span>Tax / VAT collected</span><strong>{{ fin.summary.taxCollected | currency: fin.currency }}</strong></div>
                <div><span>Cash float</span><strong>{{ fin.summary.cashOnHand | currency: fin.currency }}</strong></div>
              </div>
            </article>
          </div>

          <article class="panel">
            <div class="panel__head">
              <h2>Account balances</h2>
              <button type="button" class="text-btn" (click)="section.set('accounts')">View all</button>
            </div>
            <div class="account-grid">
              @for (acc of fin.accounts.slice(0, 4); track acc.id) {
                <button type="button" class="account-card" (click)="openAccount(acc)">
                  <small>{{ acc.provider }}</small>
                  <strong>{{ acc.name }}</strong>
                  <em>{{ acc.balance | currency: acc.currency }}</em>
                  <span class="pill" [attr.data-status]="acc.status">{{ acc.status }}</span>
                </button>
              }
            </div>
          </article>
        }

        @if (section() === 'accounts') {
          <div class="account-grid full">
            @for (acc of fin.accounts; track acc.id) {
              <article class="account-card static" [attr.data-status]="acc.status">
                <div class="account-card__top">
                  <small>{{ accountTypeLabel(acc.type) }} · {{ acc.provider }}</small>
                  <span class="pill" [attr.data-status]="acc.status">{{ acc.status }}</span>
                </div>
                <h3>{{ acc.name }}</h3>
                <p class="balance" [class.neg]="acc.balance < 0">
                  {{ acc.balance | currency: acc.currency }}
                </p>
                <div class="meta-row">
                  <div>
                    <span>Pending</span>
                    <strong>{{ acc.pending | currency: acc.currency }}</strong>
                  </div>
                  <div>
                    <span>Last movement</span>
                    <strong>{{ acc.lastMovementAt | date: 'dd MMM HH:mm' }}</strong>
                  </div>
                </div>
              </article>
            }
          </div>
        }

        @if (section() === 'ledger') {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of fin.ledger; track row.id) {
                  <tr (click)="openLedger(row)" class="clickable">
                    <td>{{ row.at | date: 'dd MMM HH:mm' }}</td>
                    <td><span class="type-pill" [attr.data-type]="row.type">{{ row.type }}</span></td>
                    <td>{{ row.reference }}</td>
                    <td>{{ row.description }}</td>
                    <td>{{ row.account }}</td>
                    <td>{{ row.debit ? (row.debit | currency: fin.currency) : '—' }}</td>
                    <td>{{ row.credit ? (row.credit | currency: fin.currency) : '—' }}</td>
                    <td><span class="pill" [attr.data-status]="row.status">{{ row.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (section() === 'settlements') {
          <div class="settle-grid">
            @for (set of fin.settlements; track set.id) {
              <article class="settle-card" [attr.data-status]="set.status" (click)="openSettlement(set)">
                <div class="settle-card__top">
                  <strong>{{ set.channel }}</strong>
                  <span class="pill" [attr.data-status]="set.status">{{ settlementLabel(set.status) }}</span>
                </div>
                <p>{{ set.periodLabel }}</p>
                <div class="settle-figures">
                  <div><span>Gross</span><strong>{{ set.gross | currency: fin.currency }}</strong></div>
                  <div><span>Fees</span><strong>{{ set.fees | currency: fin.currency }}</strong></div>
                  <div><span>Net</span><strong>{{ set.net | currency: fin.currency }}</strong></div>
                </div>
                <small>
                  @if (set.settledAt) {
                    Settled {{ set.settledAt | date: 'dd MMM yyyy HH:mm' }}
                  } @else if (set.expectedAt) {
                    Expected {{ set.expectedAt | date: 'dd MMM yyyy HH:mm' }}
                  } @else {
                    Awaiting status
                  }
                </small>
              </article>
            }
          </div>
        }

        @if (section() === 'reconciliation') {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Gross</th>
                  <th>Voids / refunds</th>
                  <th>Fees</th>
                  <th>Net recognised</th>
                  <th>Match</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                @for (day of fin.reconciliation; track day.date) {
                  <tr [class.unmatched]="!day.matched">
                    <td>{{ day.date | date: 'EEE dd MMM' }}</td>
                    <td>{{ day.salesCount }}</td>
                    <td>{{ day.grossSales | currency: fin.currency }}</td>
                    <td>{{ day.voidsRefunds | currency: fin.currency }}</td>
                    <td>{{ day.fees | currency: fin.currency }}</td>
                    <td><strong>{{ day.netRecognised | currency: fin.currency }}</strong></td>
                    <td>
                      <span class="pill" [attr.data-status]="day.matched ? 'healthy' : 'blocked'">
                        {{ day.matched ? 'Matched' : 'Open' }}
                      </span>
                    </td>
                    <td [class.neg-text]="day.variance !== 0">
                      {{ day.variance | currency: fin.currency }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (selectedAccount(); as acc) {
          <div class="drawer-backdrop" (click)="selectedAccount.set(null)"></div>
          <aside class="drawer">
            <button type="button" class="drawer__close" (click)="selectedAccount.set(null)">×</button>
            <small>{{ accountTypeLabel(acc.type) }}</small>
            <h2>{{ acc.name }}</h2>
            <p class="balance" [class.neg]="acc.balance < 0">{{ acc.balance | currency: acc.currency }}</p>
            <div class="drawer-meta">
              <div><span>Provider</span><strong>{{ acc.provider }}</strong></div>
              <div><span>Pending</span><strong>{{ acc.pending | currency: acc.currency }}</strong></div>
              <div><span>Status</span><strong>{{ acc.status | uppercase }}</strong></div>
              <div><span>Last movement</span><strong>{{ acc.lastMovementAt | date: 'dd MMM yyyy HH:mm' }}</strong></div>
              <div><span>Account ID</span><strong>{{ acc.id }}</strong></div>
            </div>
          </aside>
        }

        @if (selectedLedger(); as row) {
          <div class="drawer-backdrop" (click)="selectedLedger.set(null)"></div>
          <aside class="drawer">
            <button type="button" class="drawer__close" (click)="selectedLedger.set(null)">×</button>
            <small>{{ row.type | uppercase }}</small>
            <h2>{{ row.reference }}</h2>
            <p>{{ row.description }}</p>
            <div class="drawer-meta">
              <div><span>Account</span><strong>{{ row.account }}</strong></div>
              <div><span>Debit</span><strong>{{ row.debit | currency: fin.currency }}</strong></div>
              <div><span>Credit</span><strong>{{ row.credit | currency: fin.currency }}</strong></div>
              <div><span>Balance after</span><strong>{{ row.balanceAfter | currency: fin.currency }}</strong></div>
              <div><span>Status</span><strong>{{ row.status | uppercase }}</strong></div>
              <div><span>Posted</span><strong>{{ row.at | date: 'dd MMM yyyy HH:mm' }}</strong></div>
            </div>
          </aside>
        }

        @if (selectedSettlement(); as set) {
          <div class="drawer-backdrop" (click)="selectedSettlement.set(null)"></div>
          <aside class="drawer">
            <button type="button" class="drawer__close" (click)="selectedSettlement.set(null)">×</button>
            <small>{{ set.channel }} settlement</small>
            <h2>{{ set.periodLabel }}</h2>
            <div class="drawer-meta">
              <div><span>Gross</span><strong>{{ set.gross | currency: fin.currency }}</strong></div>
              <div><span>Fees</span><strong>{{ set.fees | currency: fin.currency }}</strong></div>
              <div><span>Net</span><strong>{{ set.net | currency: fin.currency }}</strong></div>
              <div><span>Status</span><strong>{{ settlementLabel(set.status) }}</strong></div>
              @if (set.settledAt) {
                <div><span>Settled at</span><strong>{{ set.settledAt | date: 'dd MMM yyyy HH:mm' }}</strong></div>
              }
              @if (set.expectedAt) {
                <div><span>Expected</span><strong>{{ set.expectedAt | date: 'dd MMM yyyy HH:mm' }}</strong></div>
              }
              <div><span>Batch ID</span><strong>{{ set.id }}</strong></div>
            </div>
          </aside>
        }
      </section>
    }
  `,
  styles: `
    .fin__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
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

    .section-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .section-tabs button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .section-tabs button.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .alert-strip {
      display: grid;
      gap: 8px;
      margin-bottom: 18px;
    }

    .alert {
      padding: 12px 14px;
      border-radius: 12px;
      background: #eef1f8;
      border-left: 4px solid var(--primary);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .alert[data-level='warn'] {
      background: #fff4e0;
      border-left-color: var(--warning);
    }

    .alert[data-level='critical'] {
      background: #ffebee;
      border-left-color: #c62828;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .kpi {
      padding: 16px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .kpi span {
      display: block;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .kpi strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .kpi em {
      font-style: normal;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .kpi.warn strong { color: var(--warning); }
    .kpi.success strong { color: var(--success); }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }

    .panel {
      padding: 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      margin-bottom: 14px;
    }

    .panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .panel__head h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
    }

    .panel__head span {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .text-btn {
      border: none;
      background: none;
      color: var(--primary);
      font-weight: 800;
      cursor: pointer;
    }

    .mix-list,
    .pl {
      display: grid;
      gap: 12px;
    }

    .mix-row__top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .track {
      height: 8px;
      border-radius: 999px;
      background: #eef1f8;
      overflow: hidden;
    }

    .track__fill {
      height: 100%;
      border-radius: 999px;
      background: var(--primary);
    }

    .mix-row small {
      color: var(--text-muted);
      font-weight: 600;
    }

    .pl > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg);
    }

    .pl span {
      color: var(--text-muted);
      font-weight: 600;
    }

    .pl .neg strong { color: #c62828; }
    .pl .total {
      background: var(--primary-soft);
    }
    .pl .total strong {
      color: var(--primary-dark);
      font-size: 1.1rem;
    }

    .account-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .account-grid.full {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .account-card {
      position: relative;
      text-align: left;
      padding: 16px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      cursor: pointer;
    }

    .account-card.static {
      cursor: default;
    }

    .account-card small {
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    .account-card strong,
    .account-card h3 {
      display: block;
      margin: 6px 0;
      font-size: 1rem;
      font-weight: 800;
    }

    .account-card em,
    .balance {
      display: block;
      font-style: normal;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .balance.neg,
    .neg-text {
      color: #c62828;
    }

    .account-card .pill {
      position: absolute;
      top: 14px;
      right: 14px;
    }

    .account-card__top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 14px;
    }

    .meta-row span {
      display: block;
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .meta-row strong {
      font-size: 0.9rem;
    }

    .settle-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .settle-card {
      padding: 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 5px solid var(--success);
      cursor: pointer;
    }

    .settle-card[data-status='in_transit'],
    .settle-card[data-status='scheduled'] {
      border-left-color: var(--warning);
    }

    .settle-card[data-status='failed'] {
      border-left-color: #c62828;
    }

    .settle-card__top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .settle-card p {
      margin: 0 0 14px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .settle-figures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .settle-figures span {
      display: block;
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .settle-card small {
      color: var(--text-muted);
      font-weight: 600;
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
      min-width: 760px;
    }

    th,
    td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }

    th {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--bg);
    }

    tr.clickable {
      cursor: pointer;
    }

    tr.clickable:hover,
    tr.unmatched {
      background: #f8f9fd;
    }

    tr.unmatched {
      background: #fff8f0;
    }

    .pill,
    .type-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pill[data-status='healthy'],
    .pill[data-status='settled'],
    .pill[data-status='posted'],
    .pill[data-status='matched'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .pill[data-status='attention'],
    .pill[data-status='in_transit'],
    .pill[data-status='scheduled'],
    .pill[data-status='pending'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .pill[data-status='blocked'],
    .pill[data-status='failed'] {
      background: #ffebee;
      color: #c62828;
    }

    .type-pill[data-type='sale'],
    .type-pill[data-type='settlement'] {
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .type-pill[data-type='fee'],
    .type-pill[data-type='tax'] {
      background: #eef1f8;
      color: var(--text-muted);
    }

    .type-pill[data-type='refund'],
    .type-pill[data-type='void'] {
      background: #ffebee;
      color: #c62828;
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      z-index: 40;
    }

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: min(400px, 100%);
      height: 100%;
      padding: 28px 24px;
      background: #fff;
      border-left: 1px solid var(--border);
      z-index: 50;
      overflow: auto;
      box-shadow: -12px 0 40px rgba(15, 23, 42, 0.12);
    }

    .drawer__close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      font-size: 1.4rem;
      cursor: pointer;
    }

    .drawer small {
      color: var(--text-muted);
      font-weight: 800;
      text-transform: uppercase;
      font-size: 0.72rem;
    }

    .drawer h2 {
      margin: 8px 0 10px;
      font-size: 1.35rem;
      font-weight: 800;
    }

    .drawer > p {
      color: var(--text-muted);
      font-weight: 600;
    }

    .drawer-meta {
      display: grid;
      gap: 10px;
      margin-top: 20px;
    }

    .drawer-meta > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: var(--bg);
    }

    .drawer-meta span {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.85rem;
    }

    @media (max-width: 1100px) {
      .kpi-grid,
      .account-grid,
      .account-grid.full {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 800px) {
      .two-col,
      .settle-grid,
      .kpi-grid,
      .account-grid,
      .account-grid.full {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminFinancePanelComponent {
  private readonly data = inject(AdminDataService);

  readonly finance$ = this.data.getFinance();
  readonly section = signal<FinanceSection>('overview');
  readonly selectedAccount = signal<FinanceAccount | null>(null);
  readonly selectedLedger = signal<FinanceLedgerEntry | null>(null);
  readonly selectedSettlement = signal<FinanceSettlement | null>(null);

  readonly sections: { id: FinanceSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'settlements', label: 'Settlements' },
    { id: 'reconciliation', label: 'Reconciliation' },
  ];

  accountTypeLabel(type: FinanceAccount['type']): string {
    const map: Record<FinanceAccount['type'], string> = {
      settlement: 'Settlement',
      cash: 'Cash',
      clearing: 'Clearing',
      fee: 'Fees',
      tax: 'Tax',
    };
    return map[type];
  }

  settlementLabel(status: FinanceSettlement['status']): string {
    const map: Record<FinanceSettlement['status'], string> = {
      settled: 'Settled',
      in_transit: 'In transit',
      failed: 'Failed',
      scheduled: 'Scheduled',
    };
    return map[status];
  }

  openAccount(acc: FinanceAccount): void {
    this.selectedLedger.set(null);
    this.selectedSettlement.set(null);
    this.selectedAccount.set(acc);
  }

  openLedger(row: FinanceLedgerEntry): void {
    this.selectedAccount.set(null);
    this.selectedSettlement.set(null);
    this.selectedLedger.set(row);
  }

  openSettlement(set: FinanceSettlement): void {
    this.selectedAccount.set(null);
    this.selectedLedger.set(null);
    this.selectedSettlement.set(set);
  }
}
