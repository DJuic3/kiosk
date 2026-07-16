import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { ChartPoint } from '../../../core/models/admin.model';
import { AdminSalesPanelComponent } from '../admin-sales-panel/admin-sales-panel.component';
import { AdminInventoryPanelComponent } from '../admin-inventory-panel/admin-inventory-panel.component';
import { AdminFinancePanelComponent } from '../admin-finance-panel/admin-finance-panel.component';
import { AdminUsersPanelComponent } from '../admin-users-panel/admin-users-panel.component';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type AdminTab =
  | 'overview'
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'users'
  | 'malfunctions'
  | 'security'
  | 'history';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    UpperCasePipe,
    RouterLink,
    TouchButtonComponent,
    AdminSalesPanelComponent,
    AdminInventoryPanelComponent,
    AdminFinancePanelComponent,
    AdminUsersPanelComponent,
  ],
  template: `
    <div class="admin">
      <header class="admin__header">
        <div class="brand">
          <img src="images/EconetLogo.png" alt="Econet" />
          <div>
            <strong>Admin Console</strong>
            @if (selectedKiosk$ | async; as kiosk) {
              <small>{{ kiosk.id }} · {{ kiosk.location }}</small>
            }
          </div>
        </div>

        <div class="kiosk-switcher">
          <label for="kiosk-select">Working on</label>
          <select
            id="kiosk-select"
            [value]="(selectedKioskId$ | async) ?? ''"
            (change)="onKioskChange($event)"
          >
            @for (kiosk of kiosks$ | async; track kiosk.id) {
              <option [value]="kiosk.id">
                {{ kiosk.name }} — {{ kiosk.location }}
                {{ kiosk.status === 'maintenance' ? '(maintenance)' : '' }}
              </option>
            }
          </select>
          @if (selectedKiosk$ | async; as kiosk) {
            <span class="kiosk-status" [attr.data-status]="kiosk.status">{{ kiosk.status }}</span>
          }
        </div>

        <div class="header-actions">
          <a routerLink="/" class="link">Customer kiosk</a>
          <app-touch-button variant="secondary" (pressed)="logout()">Sign out</app-touch-button>
        </div>
      </header>

      <nav class="admin__nav">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="nav-btn"
            [class.active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </nav>

      <main class="admin__main">
        @switch (activeTab()) {
          @case ('overview') {
            @if (dashboard$ | async; as dash) {
              <section class="overview">
                <div class="overview__head">
                  <div>
                    <h1>Dashboard analytics</h1>
                    <p class="sub">
                      {{ dash.machineId }} · {{ dash.location }} · Updated
                      {{ dash.generatedAt | date: 'dd MMM yyyy HH:mm' }}
                    </p>
                  </div>
                  <div class="health-pills">
                    <span>Uptime {{ dash.health.uptimePercent }}%</span>
                    <span>Dispense {{ dash.health.dispenseSuccessPercent }}%</span>
                    <span>Payments {{ dash.health.paymentSuccessPercent }}%</span>
                    <span>Avg {{ dash.health.avgTransactionSeconds }}s</span>
                  </div>
                </div>

                <div class="kpi-grid">
                  @for (kpi of dash.kpis; track kpi.label) {
                    <article class="kpi" [attr.data-tone]="kpi.tone || 'default'">
                      <span>{{ kpi.label }}</span>
                      <strong>{{ kpi.value }}</strong>
                      <em [attr.data-trend]="kpi.trend">{{ kpi.delta }}</em>
                    </article>
                  }
                </div>

                <div class="alert-strip">
                  @for (alert of dash.alerts; track alert.text) {
                    <div class="alert" [attr.data-level]="alert.level">{{ alert.text }}</div>
                  }
                </div>

                <div class="charts">
                  <article class="panel">
                    <div class="panel__head">
                      <h2>Sales by hour (today)</h2>
                      <span>Units sold</span>
                    </div>
                    <div class="bars">
                      @for (point of dash.hourlySales; track point.label) {
                        <div class="bar">
                          <div
                            class="bar__fill"
                            [style.height.%]="barHeight(point.value, maxHourly(dash.hourlySales))"
                          ></div>
                          <strong>{{ point.value }}</strong>
                          <span>{{ point.label }}</span>
                        </div>
                      }
                    </div>
                  </article>

                  <article class="panel">
                    <div class="panel__head">
                      <h2>Revenue this week</h2>
                      <span>{{ dash.currency }}</span>
                    </div>
                    <div class="bars bars--wide">
                      @for (point of dash.weeklyRevenue; track point.label) {
                        <div class="bar">
                          <div
                            class="bar__fill bar__fill--alt"
                            [style.height.%]="barHeight(point.value, maxHourly(dash.weeklyRevenue))"
                          ></div>
                          <strong>{{ point.value | number: '1.0-0' }}</strong>
                          <span>{{ point.label }}</span>
                        </div>
                      }
                    </div>
                  </article>
                </div>

                <div class="split">
                  <article class="panel">
                    <div class="panel__head">
                      <h2>Payment mix</h2>
                      <span>Share of sales</span>
                    </div>
                    <div class="mix-list">
                      @for (item of dash.paymentMix; track item.label) {
                        <div class="mix-row">
                          <div class="mix-row__label">
                            <i [style.background]="item.color"></i>
                            <span>{{ item.label }}</span>
                            <b>{{ item.percent }}%</b>
                          </div>
                          <div class="track">
                            <div class="track__fill" [style.width.%]="item.percent" [style.background]="item.color"></div>
                          </div>
                          <small>{{ item.value }} transactions</small>
                        </div>
                      }
                    </div>
                  </article>

                  <article class="panel">
                    <div class="panel__head">
                      <h2>Category mix</h2>
                      <span>Units by category</span>
                    </div>
                    <div class="mix-list">
                      @for (item of dash.categoryMix; track item.label) {
                        <div class="mix-row">
                          <div class="mix-row__label">
                            <i [style.background]="item.color"></i>
                            <span>{{ item.label }}</span>
                            <b>{{ item.percent }}%</b>
                          </div>
                          <div class="track">
                            <div class="track__fill" [style.width.%]="item.percent" [style.background]="item.color"></div>
                          </div>
                          <small>{{ item.value }} units</small>
                        </div>
                      }
                    </div>
                  </article>

                  <article class="panel">
                    <div class="panel__head">
                      <h2>Top products</h2>
                      <span>By revenue today</span>
                    </div>
                    <div class="top-list">
                      @for (product of dash.topProducts; track product.name; let i = $index) {
                        <div class="top-row">
                          <span class="rank">{{ i + 1 }}</span>
                          <div class="top-row__body">
                            <strong>{{ product.name }}</strong>
                            <div class="track">
                              <div class="track__fill" [style.width.%]="product.share"></div>
                            </div>
                            <small>{{ product.units }} sold · {{ product.revenue | currency: dash.currency }}</small>
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                </div>
              </section>
            }
          }

          @case ('sales') {
            @for (kioskId of [selectedKioskId()]; track kioskId) {
              <app-admin-sales-panel />
            }
          }

          @case ('inventory') {
            @for (kioskId of [selectedKioskId()]; track kioskId) {
              <app-admin-inventory-panel />
            }
          }

          @case ('finance') {
            @for (kioskId of [selectedKioskId()]; track kioskId) {
              <app-admin-finance-panel />
            }
          }

          @case ('users') {
            <app-admin-users-panel />
          }

          @case ('malfunctions') {
            <section>
              <h1>Malfunctions</h1>
              <p class="sub">Hardware and peripheral faults.</p>
              <div class="card-list">
                @for (fault of malfunctions$ | async; track fault.id) {
                  <article class="event-card" [attr.data-severity]="fault.severity">
                    <div class="event-card__top">
                      <strong>{{ fault.type }}</strong>
                      <span class="pill" [attr.data-status]="fault.status">{{ fault.status }}</span>
                    </div>
                    <p>{{ fault.message }}</p>
                    <div class="event-card__meta">
                      <span>{{ fault.severity | uppercase }}</span>
                      @if (fault.slotCode) {
                        <span>Slot {{ fault.slotCode }}</span>
                      }
                      <span>{{ fault.reportedAt | date: 'dd MMM yyyy HH:mm' }}</span>
                    </div>
                  </article>
                }
              </div>
            </section>
          }

          @case ('security') {
            <section>
              <h1>Malicious / security activity</h1>
              <p class="sub">Tamper, fraud patterns and access anomalies.</p>
              <div class="card-list">
                @for (event of security$ | async; track event.id) {
                  <article class="event-card" [attr.data-severity]="event.severity">
                    <div class="event-card__top">
                      <strong>{{ event.type }}</strong>
                      <span class="pill" [attr.data-status]="event.status">{{ event.status }}</span>
                    </div>
                    <p>{{ event.description }}</p>
                    <div class="event-card__meta">
                      <span>{{ event.severity | uppercase }}</span>
                      <span>{{ event.source }}</span>
                      <span>{{ event.reportedAt | date: 'dd MMM yyyy HH:mm' }}</span>
                    </div>
                  </article>
                }
              </div>
            </section>
          }

          @case ('history') {
            <section>
              <h1>Activity history</h1>
              <p class="sub">Chronological log across sales, stock, faults and security.</p>
              <div class="timeline">
                @for (event of history$ | async; track event.id) {
                  <article class="timeline__item">
                    <span class="timeline__cat">{{ event.category }}</span>
                    <div>
                      <strong>{{ event.summary }}</strong>
                      <p>{{ event.detail }}</p>
                      <small>{{ event.at | date: 'dd MMM yyyy HH:mm' }}</small>
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        }
      </main>
    </div>
  `,
  styles: `
    .admin {
      min-height: 100vh;
      background: var(--bg);
    }

    .admin__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 24px;
      background: #fff;
      border-bottom: 1px solid var(--border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand img {
      height: 36px;
      width: auto;
      padding: 6px 10px;
      border-radius: 8px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .brand strong {
      display: block;
      font-weight: 800;
    }

    .brand small {
      color: var(--text-muted);
    }

    .kiosk-switcher {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      justify-content: center;
      min-width: 0;
    }

    .kiosk-switcher label {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .kiosk-switcher select {
      min-width: min(320px, 100%);
      max-width: 420px;
      min-height: 44px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      font: inherit;
      font-weight: 700;
      color: var(--text);
      cursor: pointer;
    }

    .kiosk-switcher select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .kiosk-status {
      padding: 6px 10px;
      border-radius: 999px;
      background: #e8f5ee;
      color: var(--success);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .kiosk-status[data-status='maintenance'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .kiosk-status[data-status='offline'] {
      background: #ffebee;
      color: #c62828;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .link {
      color: var(--primary);
      font-weight: 700;
      text-decoration: none;
    }

    .admin__nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 14px 24px;
      background: #fff;
      border-bottom: 1px solid var(--border);
    }

    .nav-btn {
      min-height: 42px;
      padding: 0 16px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .nav-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .admin__main {
      padding: 24px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 0 0 20px;
      color: var(--text-muted);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
    }

    .kpi {
      padding: 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .kpi span {
      display: block;
      margin-bottom: 8px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .kpi strong {
      display: block;
      font-size: 1.7rem;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: -0.02em;
    }

    .kpi em {
      display: block;
      margin-top: 8px;
      font-style: normal;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--success);
    }

    .kpi em[data-trend='down'] { color: #c62828; }
    .kpi em[data-trend='flat'] { color: var(--text-muted); }

    .kpi[data-tone='warn'] strong { color: var(--warning); }
    .kpi[data-tone='danger'] strong { color: #c62828; }
    .kpi[data-tone='success'] strong { color: var(--success); }

    .overview__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }

    .health-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .health-pills span {
      padding: 7px 12px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.78rem;
      font-weight: 800;
    }

    .alert-strip {
      display: grid;
      gap: 8px;
      margin: 18px 0 20px;
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

    .charts {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .split {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .panel__head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .panel__head span {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      min-height: 180px;
      padding-top: 12px;
    }

    .bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .bar__fill {
      width: 100%;
      max-width: 28px;
      min-height: 4px;
      border-radius: 8px 8px 4px 4px;
      background: linear-gradient(180deg, #4c6ef5, var(--primary));
    }

    .bar__fill--alt {
      background: linear-gradient(180deg, #e30613, #9b0410);
      max-width: 40px;
    }

    .bar strong {
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .bar span {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 700;
    }

    .mix-list,
    .top-list {
      display: grid;
      gap: 14px;
    }

    .mix-row__label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 0.9rem;
      font-weight: 700;
    }

    .mix-row__label i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .mix-row__label b {
      margin-left: auto;
      color: var(--primary-dark);
    }

    .mix-row small,
    .top-row small {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .track {
      height: 8px;
      border-radius: 999px;
      background: #eef1f8;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .track__fill {
      height: 100%;
      border-radius: 999px;
      background: var(--primary);
    }

    .top-row {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 10px;
      align-items: start;
    }

    .rank {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.8rem;
      font-weight: 800;
    }

    .top-row__body strong {
      display: block;
      margin-bottom: 6px;
      font-size: 0.9rem;
    }

    @media (max-width: 1100px) {
      .charts,
      .split {
        grid-template-columns: 1fr;
      }
    }

    .kpi.warn strong { color: var(--warning); }
    .kpi.danger strong { color: #c62828; }

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

    th, td {
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

    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pill[data-status='completed'],
    .pill[data-status='ok'],
    .pill[data-status='resolved'],
    .pill[data-status='reviewed'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .pill[data-status='low'],
    .pill[data-status='partial'],
    .pill[data-status='investigating'],
    .pill[data-status='warning'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .pill[data-status='out'],
    .pill[data-status='voided'],
    .pill[data-status='open'],
    .pill[data-status='escalated'],
    .pill[data-status='critical'] {
      background: #ffebee;
      color: #c62828;
    }

    .card-list {
      display: grid;
      gap: 12px;
    }

    .event-card {
      padding: 16px 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
    }

    .event-card[data-severity='critical'],
    .event-card[data-severity='high'] {
      border-left-color: #c62828;
    }

    .event-card[data-severity='medium'],
    .event-card[data-severity='warning'] {
      border-left-color: var(--warning);
    }

    .event-card__top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .event-card p {
      margin: 0 0 10px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .event-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .timeline {
      display: grid;
      gap: 12px;
    }

    .timeline__item {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .timeline__cat {
      height: fit-content;
      padding: 4px 8px;
      border-radius: 8px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
    }

    .timeline__item p {
      margin: 4px 0;
      color: var(--text-muted);
    }

    .timeline__item small {
      color: var(--text-muted);
    }

    @media (max-width: 900px) {
      .admin__header {
        flex-direction: column;
        align-items: stretch;
      }

      .kiosk-switcher {
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .kiosk-switcher select {
        min-width: 0;
        flex: 1;
      }

      .timeline__item {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminDashboardComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly data = inject(AdminDataService);
  private readonly router = inject(Router);

  readonly activeTab = signal<AdminTab>('overview');
  readonly kiosks$ = this.data.getKiosks();
  readonly selectedKiosk$ = this.data.getSelectedKiosk();
  readonly selectedKioskId$ = this.data.getSelectedKioskId();
  readonly selectedKioskId = toSignal(this.data.getSelectedKioskId(), {
    initialValue: 'KIOSK-001',
  });
  readonly summary$ = this.data.getSummary();
  readonly dashboard$ = this.data.getDashboardAnalytics();
  readonly malfunctions$ = this.data.getMalfunctions();
  readonly security$ = this.data.getSecurityEvents();
  readonly history$ = this.data.getHistory();

  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'finance', label: 'Finance' },
    { id: 'users', label: 'Users' },
    { id: 'malfunctions', label: 'Malfunctions' },
    { id: 'security', label: 'Security' },
    { id: 'history', label: 'History' },
  ];

  onKioskChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.data.selectKiosk(value);
    this.activeTab.set('overview');
  }

  maxHourly(points: ChartPoint[]): number {
    return Math.max(...points.map((p) => p.value), 1);
  }

  barHeight(value: number, max: number): number {
    return Math.max(8, Math.round((value / max) * 100));
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/admin/login']);
  }
}
