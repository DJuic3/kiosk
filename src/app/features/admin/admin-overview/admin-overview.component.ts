import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ChartPoint } from '../../../core/models/admin.model';
import { AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
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
  `,
  styles: `
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
  `,
})
export class AdminOverviewComponent {
  private readonly data = inject(AdminDataService);

  readonly dashboard$ = this.data.getDashboardAnalytics();

  maxHourly(points: ChartPoint[]): number {
    return Math.max(...points.map((p) => p.value), 1);
  }

  barHeight(value: number, max: number): number {
    return Math.max(8, Math.round((value / max) * 100));
  }
}
