import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../../core/services/admin-data.service';
import {
  FinanceAccount,
  FinanceLedgerEntry,
  FinanceSettlement,
  NamedShare,
} from '../../../core/models/admin.model';

type FinanceSection = 'overview' | 'accounts' | 'ledger' | 'settlements' | 'reconciliation';
type LedgerTypeFilter = 'all' | FinanceLedgerEntry['type'];
type SettlementStatusFilter = 'all' | FinanceSettlement['status'];

@Component({
  selector: 'app-admin-finance-panel',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, UpperCasePipe, FormsModule],
  template: `
    @if (fin(); as fin) {
      <section class="fin">
        <header class="page-head">
          <div>
            <p class="eyebrow">Treasury</p>
            <h1>Accounting &amp; finance</h1>
            <p class="sub">{{ fin.machineId }} · {{ fin.location }} · {{ fin.periodLabel }}</p>
          </div>
          <time>{{ fin.generatedAt | date: 'dd MMM yyyy · HH:mm' }}</time>
        </header>

        <div class="hero">
          <div class="hero__main">
            <div class="hero__kicker">
              <span>Net operating revenue</span>
              <span>{{ fin.periodLabel }}</span>
            </div>
            <p class="hero__value">{{ fin.summary.netRevenue | currency: fin.currency }}</p>
            <p class="hero__delta">
              Gross {{ fin.summary.grossRevenue | currency: fin.currency }}
              <span>− refunds {{ fin.summary.refundsVoids | currency: fin.currency }}</span>
              <span>− fees {{ fin.summary.paymentFees | currency: fin.currency }}</span>
            </p>
            <div class="hero__stats">
              <button type="button" (click)="go('settlements')">
                <span>Settled to date</span>
                <strong>{{ fin.summary.settledToDate | currency: fin.currency }}</strong>
              </button>
              <button type="button" (click)="go('settlements')">
                <span>In transit</span>
                <strong>{{ fin.summary.pendingSettlements | currency: fin.currency }}</strong>
              </button>
              <button type="button" (click)="go('accounts')">
                <span>Cash on hand</span>
                <strong>{{ fin.summary.cashOnHand | currency: fin.currency }}</strong>
              </button>
              <button type="button" (click)="go('overview')">
                <span>VAT collected</span>
                <strong>{{ fin.summary.taxCollected | currency: fin.currency }}</strong>
              </button>
            </div>
          </div>
          <div class="hero__alerts">
            <div class="hero__kicker"><span>Attention</span><span>{{ fin.alerts.length }} items</span></div>
            @for (alert of fin.alerts; track alert.text) {
              <div class="alert" [attr.data-level]="alert.level">
                <span>{{ alert.level }}</span>
                <p>{{ alert.text }}</p>
              </div>
            }
          </div>
        </div>

        <nav class="tabs">
          @for (tab of sections; track tab.id) {
            <button type="button" [class.active]="section() === tab.id" (click)="go(tab.id)">
              {{ tab.label }}
              <em>{{ tabCount(tab.id) }}</em>
            </button>
          }
        </nav>

        @if (section() === 'overview') {
          <div class="mid">
            <article class="panel">
              <div class="panel__head">
                <div>
                  <h2>P&amp;L waterfall</h2>
                  <p>How gross becomes net this period</p>
                </div>
              </div>
              <div class="waterfall">
                @for (row of pnlRows(); track row.label) {
                  <div class="wf" [attr.data-tone]="row.tone">
                    <span>{{ row.label }}</span>
                    <div class="wf__track">
                      <i [style.width.%]="row.width"></i>
                    </div>
                    <b>{{ row.signed | currency: fin.currency }}</b>
                  </div>
                }
              </div>
            </article>

            <article class="panel">
              <div class="panel__head">
                <div>
                  <h2>Payment rails</h2>
                  <p>Share of gross recognised</p>
                </div>
              </div>
              <div class="mix">
                @let payTop = topShare(fin.channelMix);
                <div class="donut" [style.background]="conic(fin.channelMix)">
                  <div class="donut__hole">
                    <b>{{ payTop.percent }}%</b>
                    <span>{{ payTop.label }}</span>
                  </div>
                </div>
                <div class="legend">
                  @for (ch of fin.channelMix; track ch.label) {
                    <div class="legend__row">
                      <i [style.background]="ch.color"></i>
                      <span>{{ ch.label }}</span>
                      <b>{{ ch.value | currency: fin.currency }}</b>
                      <small>{{ ch.percent }}% of gross</small>
                    </div>
                  }
                </div>
              </div>
            </article>
          </div>

          <article class="panel">
            <div class="panel__head">
              <div>
                <h2>Account balances</h2>
                <p>{{ fin.accounts.length }} books on this kiosk</p>
              </div>
              <button type="button" class="text-btn" (click)="go('accounts')">Open accounts</button>
            </div>
            <div class="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Balance</th>
                    <th>Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (acc of fin.accounts; track acc.id) {
                    <tr class="clickable" (click)="openAccount(acc)">
                      <td>
                        <strong>{{ acc.name }}</strong>
                        <small>{{ acc.provider }}</small>
                      </td>
                      <td>{{ accountTypeLabel(acc.type) }}</td>
                      <td [class.neg-text]="acc.balance < 0">{{ acc.balance | currency: acc.currency }}</td>
                      <td>{{ acc.pending | currency: acc.currency }}</td>
                      <td><span class="pill" [attr.data-status]="acc.status">{{ acc.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>
        }

        @if (section() === 'accounts') {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Balance</th>
                  <th>Pending</th>
                  <th>Last movement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (acc of fin.accounts; track acc.id) {
                  <tr class="clickable" [attr.data-status]="acc.status" (click)="openAccount(acc)">
                    <td>
                      <strong>{{ acc.name }}</strong>
                      <small>{{ acc.id }}</small>
                    </td>
                    <td>{{ accountTypeLabel(acc.type) }}</td>
                    <td>{{ acc.provider }}</td>
                    <td [class.neg-text]="acc.balance < 0">{{ acc.balance | currency: acc.currency }}</td>
                    <td>{{ acc.pending | currency: acc.currency }}</td>
                    <td>{{ acc.lastMovementAt | date: 'dd MMM HH:mm' }}</td>
                    <td><span class="pill" [attr.data-status]="acc.status">{{ acc.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (section() === 'ledger') {
          <div class="toolbar">
            <label class="filter-field search-field">
              Search
              <input
                type="search"
                [ngModel]="ledgerQuery()"
                (ngModelChange)="ledgerQuery.set($event)"
                placeholder="Reference, description, account…"
              />
            </label>
            <label class="filter-field">
              Type
              <select [ngModel]="ledgerType()" (ngModelChange)="ledgerType.set($event)">
                <option value="all">All types</option>
                @for (type of ledgerTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>
            <p class="result-count">{{ filteredLedger().length }} entries</p>
          </div>
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
                @for (row of filteredLedger(); track row.id) {
                  <tr class="clickable" (click)="openLedger(row)">
                    <td>{{ row.at | date: 'dd MMM HH:mm' }}</td>
                    <td><span class="type-pill" [attr.data-type]="row.type">{{ row.type }}</span></td>
                    <td>{{ row.reference }}</td>
                    <td>{{ row.description }}</td>
                    <td>{{ row.account }}</td>
                    <td class="num">{{ row.debit ? (row.debit | currency: fin.currency) : '—' }}</td>
                    <td class="num">{{ row.credit ? (row.credit | currency: fin.currency) : '—' }}</td>
                    <td><span class="pill" [attr.data-status]="row.status">{{ row.status }}</span></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty">No ledger entries match these filters.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (section() === 'settlements') {
          <div class="toolbar">
            <label class="filter-field">
              Status
              <select [ngModel]="settlementStatus()" (ngModelChange)="settlementStatus.set($event)">
                <option value="all">All statuses</option>
                <option value="settled">Settled</option>
                <option value="in_transit">In transit</option>
                <option value="scheduled">Scheduled</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <p class="result-count">{{ filteredSettlements().length }} batches</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Channel</th>
                  <th>Gross</th>
                  <th>Fees</th>
                  <th>Net</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (set of filteredSettlements(); track set.id) {
                  <tr class="clickable" [attr.data-status]="set.status" (click)="openSettlement(set)">
                    <td>
                      <strong>{{ set.periodLabel }}</strong>
                      <small>{{ set.id }}</small>
                    </td>
                    <td>{{ set.channel }}</td>
                    <td class="num">{{ set.gross | currency: fin.currency }}</td>
                    <td class="num">{{ set.fees | currency: fin.currency }}</td>
                    <td class="num"><strong>{{ set.net | currency: fin.currency }}</strong></td>
                    <td>
                      @if (set.settledAt) {
                        Settled {{ set.settledAt | date: 'dd MMM HH:mm' }}
                      } @else if (set.expectedAt) {
                        Expected {{ set.expectedAt | date: 'dd MMM HH:mm' }}
                      } @else {
                        —
                      }
                    </td>
                    <td>
                      <span class="pill" [attr.data-status]="set.status">{{ settlementLabel(set.status) }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty">No settlement batches match this status.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (section() === 'reconciliation') {
          <div class="recon-note">
            <span>{{ unmatchedCount() }} day(s) still open</span>
            <span>Variance total {{ reconVariance() | currency: fin.currency }}</span>
          </div>
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
                    <td class="num">{{ day.grossSales | currency: fin.currency }}</td>
                    <td class="num">{{ day.voidsRefunds | currency: fin.currency }}</td>
                    <td class="num">{{ day.fees | currency: fin.currency }}</td>
                    <td class="num"><strong>{{ day.netRecognised | currency: fin.currency }}</strong></td>
                    <td>
                      <span class="pill" [attr.data-status]="day.matched ? 'healthy' : 'blocked'">
                        {{ day.matched ? 'Matched' : 'Open' }}
                      </span>
                    </td>
                    <td class="num" [class.neg-text]="day.variance !== 0">
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
    :host { display: block; user-select: text; }

    .fin { display: grid; gap: 16px; }

    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }

    .eyebrow {
      margin: 0 0 4px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--primary);
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .sub, time {
      margin: 0;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.88rem;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 16px;
      padding: 22px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 100% 0%, rgba(227, 6, 19, 0.18), transparent 42%),
        linear-gradient(160deg, #162a86 0%, #0f1f66 58%, #0c184f 100%);
      color: #fff;
    }

    .hero__kicker {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.62);
    }

    .hero__value {
      margin: 0;
      font-size: clamp(2.2rem, 4vw, 3.2rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .hero__delta {
      margin: 10px 0 18px;
      font-size: 0.88rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.78);
    }

    .hero__delta span { color: #ffb4b4; }

    .hero__stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .hero__stats button {
      padding: 10px 12px;
      border: none;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      text-align: left;
      cursor: pointer;
    }

    .hero__stats span {
      display: block;
      margin-bottom: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
    }

    .hero__stats strong {
      font-size: 0.98rem;
      font-weight: 800;
    }

    .hero__alerts { display: grid; gap: 8px; align-content: start; }

    .alert {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      border-left: 4px solid #9db4ff;
    }

    .alert span {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9db4ff;
    }

    .alert p {
      margin: 4px 0 0;
      font-size: 0.85rem;
      font-weight: 600;
      line-height: 1.35;
    }

    .alert[data-level='warn'] { border-left-color: #ffd089; }
    .alert[data-level='warn'] span { color: #ffd089; }
    .alert[data-level='critical'] { border-left-color: #ffb4b4; background: rgba(227, 6, 19, 0.18); }
    .alert[data-level='critical'] span { color: #ffb4b4; }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tabs button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .tabs button em {
      font-style: normal;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--bg);
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--text-muted);
    }

    .tabs button.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .tabs button.active em {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }

    .mid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 16px;
    }

    .panel {
      padding: 18px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .panel__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .panel__head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .panel__head p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .text-btn {
      border: none;
      background: none;
      color: var(--primary);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    .waterfall { display: grid; gap: 10px; }

    .wf {
      display: grid;
      grid-template-columns: 150px 1fr 110px;
      gap: 12px;
      align-items: center;
    }

    .wf span {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .wf b {
      text-align: right;
      font-size: 0.92rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .wf__track {
      height: 10px;
      border-radius: 999px;
      background: #eef1f8;
      overflow: hidden;
    }

    .wf__track i {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: var(--primary);
    }

    .wf[data-tone='neg'] b { color: #c62828; }
    .wf[data-tone='neg'] .wf__track i { background: var(--accent); }
    .wf[data-tone='net'] b { color: var(--success); }
    .wf[data-tone='net'] .wf__track i { background: var(--success); }

    .mix {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 16px;
      align-items: center;
    }

    .donut {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }

    .donut__hole {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: #fff;
      display: grid;
      place-content: center;
      text-align: center;
    }

    .donut__hole b { font-size: 1.05rem; font-weight: 800; line-height: 1; }
    .donut__hole span {
      margin-top: 4px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .legend { display: grid; gap: 10px; }

    .legend__row {
      display: grid;
      grid-template-columns: 10px 1fr auto;
      grid-template-rows: auto auto;
      column-gap: 8px;
      align-items: center;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .legend__row i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      grid-row: 1 / span 2;
    }

    .legend__row b { color: var(--primary-dark); }
    .legend__row small {
      grid-column: 2;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
    }

    .filter-field {
      display: grid;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .search-field { flex: 1; min-width: min(280px, 100%); }

    .filter-field input,
    .filter-field select {
      min-height: 44px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: #fff;
      font: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text);
      text-transform: none;
      letter-spacing: normal;
    }

    .filter-field select { min-width: 160px; cursor: pointer; }

    .result-count {
      margin: 0 0 8px auto;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .recon-note {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .table-wrap {
      overflow: auto;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .table-wrap.compact { border: none; border-radius: 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
    }

    th, td {
      padding: 11px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
      vertical-align: middle;
    }

    th {
      position: sticky;
      top: 0;
      background: #f7f8fc;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    td strong { display: block; }
    td small { display: block; color: var(--text-muted); font-size: 0.75rem; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    th:has(+ th.num), td.num { font-variant-numeric: tabular-nums; }

    tr.clickable { cursor: pointer; }
    tr.clickable:hover { background: #f7f8fc; }
    tr.unmatched, tr[data-status='failed'], tr[data-status='blocked'] { background: #fff8f0; }
    tr[data-status='attention'], tr[data-status='in_transit'], tr[data-status='scheduled'] { background: #fffaf0; }

    .empty {
      text-align: center;
      color: var(--text-muted);
      padding: 36px 12px;
    }

    .neg-text, .balance.neg { color: #c62828; }

    .balance {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .pill, .type-pill {
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
    .pill[data-status='posted'] {
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
    .type-pill[data-type='tax'],
    .type-pill[data-type='payout'] {
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

    .drawer-meta { display: grid; gap: 10px; margin-top: 20px; }

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
      .hero, .mid, .hero__stats { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 800px) {
      .hero, .mid, .hero__stats, .mix, .wf { grid-template-columns: 1fr; }
      .wf b { text-align: left; }
    }
  `,
})
export class AdminFinancePanelComponent {
  private readonly data = inject(AdminDataService);

  readonly fin = toSignal(this.data.getFinance());
  readonly section = signal<FinanceSection>('overview');
  readonly selectedAccount = signal<FinanceAccount | null>(null);
  readonly selectedLedger = signal<FinanceLedgerEntry | null>(null);
  readonly selectedSettlement = signal<FinanceSettlement | null>(null);
  readonly ledgerQuery = signal('');
  readonly ledgerType = signal<LedgerTypeFilter>('all');
  readonly settlementStatus = signal<SettlementStatusFilter>('all');

  readonly ledgerTypes: FinanceLedgerEntry['type'][] = [
    'sale',
    'settlement',
    'refund',
    'void',
    'fee',
    'payout',
    'tax',
  ];

  readonly sections: { id: FinanceSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'settlements', label: 'Settlements' },
    { id: 'reconciliation', label: 'Reconciliation' },
  ];

  readonly filteredLedger = computed(() => {
    const fin = this.fin();
    if (!fin) {
      return [];
    }
    const query = this.ledgerQuery().trim().toLowerCase();
    const type = this.ledgerType();
    return fin.ledger.filter((row) => {
      if (type !== 'all' && row.type !== type) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        row.reference.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.account.toLowerCase().includes(query)
      );
    });
  });

  readonly filteredSettlements = computed(() => {
    const fin = this.fin();
    if (!fin) {
      return [];
    }
    const status = this.settlementStatus();
    if (status === 'all') {
      return fin.settlements;
    }
    return fin.settlements.filter((set) => set.status === status);
  });

  readonly unmatchedCount = computed(
    () => (this.fin()?.reconciliation ?? []).filter((day) => !day.matched).length,
  );

  readonly reconVariance = computed(() =>
    (this.fin()?.reconciliation ?? []).reduce((sum, day) => sum + day.variance, 0),
  );

  readonly pnlRows = computed(() => {
    const summary = this.fin()?.summary;
    if (!summary) {
      return [];
    }
    const gross = Math.max(summary.grossRevenue, 1);
    return [
      { label: 'Gross sales', signed: summary.grossRevenue, width: 100, tone: 'base' },
      {
        label: 'Refunds / voids',
        signed: -summary.refundsVoids,
        width: Math.max(8, (summary.refundsVoids / gross) * 100),
        tone: 'neg',
      },
      {
        label: 'Payment fees',
        signed: -summary.paymentFees,
        width: Math.max(8, (summary.paymentFees / gross) * 100),
        tone: 'neg',
      },
      {
        label: 'Net operating',
        signed: summary.netRevenue,
        width: Math.max(12, (summary.netRevenue / gross) * 100),
        tone: 'net',
      },
      {
        label: 'VAT collected',
        signed: summary.taxCollected,
        width: Math.max(8, (summary.taxCollected / gross) * 100),
        tone: 'base',
      },
    ];
  });

  tabCount(id: FinanceSection): number {
    const fin = this.fin();
    if (!fin) {
      return 0;
    }
    switch (id) {
      case 'accounts':
        return fin.accounts.length;
      case 'ledger':
        return fin.ledger.length;
      case 'settlements':
        return fin.settlements.length;
      case 'reconciliation':
        return fin.reconciliation.length;
      default:
        return fin.alerts.length;
    }
  }

  go(id: FinanceSection): void {
    this.section.set(id);
  }

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

  topShare(items: NamedShare[]): NamedShare {
    return items.reduce((best, item) => (item.percent > best.percent ? item : best));
  }

  conic(items: NamedShare[]): string {
    let acc = 0;
    const stops = items.map((item) => {
      const from = acc;
      acc += item.percent;
      return `${item.color} ${from}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
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
