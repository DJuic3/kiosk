import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartPoint, NamedShare } from '../../../core/models/admin.model';
import { AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: `
    @if (dash(); as dash) {
      <section class="overview">
        <header class="page-head">
          <div>
            <p class="eyebrow">Command centre</p>
            <h1>Overview</h1>
            <p class="sub">
              Live snapshot for this kiosk — trading, health, and what needs a person.
            </p>
          </div>
          <div class="page-head__meta">
            <span class="live">
              <i></i>
              Live
            </span>
            <time>{{ dash.generatedAt | date: 'dd MMM yyyy · HH:mm' }}</time>
          </div>
        </header>

        <div class="hero">
          <div class="hero__trade">
            <div class="hero__kicker">
              <span>Today’s trading</span>
              @if (kiosk(); as kiosk) {
                <span class="status" [attr.data-status]="kiosk.status">{{ kiosk.status }}</span>
              }
            </div>
            <p class="hero__value">{{ revenueKpi()?.value }}</p>
            <p class="hero__delta" [attr.data-trend]="revenueKpi()?.trend">
              {{ revenueKpi()?.delta }}
              <span>· {{ dash.currency }}</span>
            </p>
            <div class="hero__stats">
              @for (kpi of tradeKpis(); track kpi.label) {
                <div>
                  <span>{{ kpi.label }}</span>
                  <strong>{{ kpi.value }}</strong>
                </div>
              }
              <div>
                <span>Week so far</span>
                <strong>{{ weekTotal() | number: '1.0-0' }}</strong>
              </div>
            </div>
            <svg class="spark" viewBox="0 0 320 72" preserveAspectRatio="none" aria-hidden="true">
              <path class="spark__area" [attr.d]="hourlySpark().area" />
              <path class="spark__line" [attr.d]="hourlySpark().line" />
            </svg>
            <p class="spark-caption">
              Units by hour
              @if (peakHour(); as peak) {
                <span>Peak {{ peak.label }}:00 · {{ peak.value }} sales</span>
              }
            </p>
          </div>

          <div class="hero__health">
            <div class="hero__kicker">
              <span>Machine health</span>
              <span>{{ dash.machineId }}</span>
            </div>
            <p class="hero__location">{{ kiosk()?.name ?? dash.machineId }} · {{ dash.location }}</p>
            <div class="rings">
              <div class="ring-card">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="ring-track" cx="50" cy="50" r="42" />
                  <circle
                    class="ring-value ring-value--ok"
                    cx="50"
                    cy="50"
                    r="42"
                    [attr.stroke-dasharray]="ringDash(dash.health.uptimePercent)"
                  />
                </svg>
                <b>{{ dash.health.uptimePercent }}%</b>
                <span>Uptime 7d</span>
              </div>
              <div class="ring-card">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="ring-track" cx="50" cy="50" r="42" />
                  <circle
                    class="ring-value"
                    cx="50"
                    cy="50"
                    r="42"
                    [attr.stroke-dasharray]="ringDash(dash.health.dispenseSuccessPercent)"
                  />
                </svg>
                <b>{{ dash.health.dispenseSuccessPercent }}%</b>
                <span>Dispense</span>
              </div>
              <div class="ring-card">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="ring-track" cx="50" cy="50" r="42" />
                  <circle
                    class="ring-value ring-value--pay"
                    cx="50"
                    cy="50"
                    r="42"
                    [attr.stroke-dasharray]="ringDash(dash.health.paymentSuccessPercent)"
                  />
                </svg>
                <b>{{ dash.health.paymentSuccessPercent }}%</b>
                <span>Payments</span>
              </div>
              <div class="ring-card ring-card--time">
                <strong>{{ dash.health.avgTransactionSeconds }}s</strong>
                <span>Avg transaction</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ops-grid">
          @for (kpi of opsKpis(); track kpi.label) {
            <a
              class="ops-tile"
              [attr.data-tone]="kpi.tone || 'default'"
              [routerLink]="linkFor(kpi.label)"
            >
              <div class="ops-tile__icon" aria-hidden="true">
                @switch (kpi.label) {
                  @case ('Low stock') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
                      <path d="M3.3 7.1 12 12l8.7-4.9M12 22V12" />
                    </svg>
                  }
                  @case ('Open faults') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  }
                  @case ('Security alerts') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                  @default {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  }
                }
              </div>
              <div class="ops-tile__body">
                <span>{{ kpi.label }}</span>
                <strong>{{ kpi.value }}</strong>
                <em [attr.data-trend]="kpi.trend">{{ kpi.delta }}</em>
              </div>
              <span class="ops-tile__go">Open</span>
            </a>
          }
        </div>

        <div class="mid">
          <article class="panel chart-panel">
            <div class="panel__head">
              <div>
                <h2>Sales by hour</h2>
                <p>Units sold today · {{ hourTotal() }} total</p>
              </div>
              @if (peakHour(); as peak) {
                <span class="chip">Peak {{ peak.label }}:00</span>
              }
            </div>
            <svg class="hour-chart" viewBox="0 0 640 220" role="img" [attr.aria-label]="'Hourly sales, peak ' + (peakHour()?.value ?? 0)">
              @for (line of hourlyChart().grid; track line.value) {
                <line class="grid-line" [attr.x1]="36" [attr.x2]="628" [attr.y1]="line.y" [attr.y2]="line.y" />
                <text class="grid-label" [attr.x]="0" [attr.y]="line.y + 4">{{ line.value }}</text>
              }
              <path class="hour-area" [attr.d]="hourlyChart().area" />
              <path class="hour-line" [attr.d]="hourlyChart().line" />
              @for (dot of hourlyChart().dots; track dot.label) {
                <circle
                  class="hour-dot"
                  [class.hour-dot--peak]="dot.peak"
                  [attr.cx]="dot.x"
                  [attr.cy]="dot.y"
                  [attr.r]="dot.peak ? 5.5 : 3.5"
                />
                <text class="x-label" [attr.x]="dot.x" y="214">{{ dot.label }}</text>
              }
            </svg>
          </article>

          <article class="panel alerts-panel">
            <div class="panel__head">
              <div>
                <h2>Needs attention</h2>
                <p>{{ dash.alerts.length }} open items</p>
              </div>
              <span class="chip chip--warn">{{ criticalCount() }} critical</span>
            </div>
            <div class="alerts">
              @for (alert of dash.alerts; track alert.text) {
                <div class="alert" [attr.data-level]="alert.level">
                  <span class="alert__level">{{ alert.level }}</span>
                  <p>{{ alert.text }}</p>
                </div>
              }
            </div>
          </article>
        </div>

        <article class="panel week-panel">
          <div class="panel__head">
            <div>
              <h2>Revenue this week</h2>
              <p>{{ dash.currency }} · {{ weekTotal() | number: '1.0-0' }} recognised</p>
            </div>
          </div>
          <div class="week-bars">
            @for (point of dash.weeklyRevenue; track point.label; let last = $last) {
              <div class="week-bar" [class.week-bar--today]="last">
                <span class="week-bar__value">{{ point.value | number: '1.0-0' }}</span>
                <div class="week-bar__track">
                  <div
                    class="week-bar__fill"
                    [style.height.%]="barHeight(point.value, weekMax())"
                  ></div>
                </div>
                <span class="week-bar__label">{{ last ? 'Today' : point.label }}</span>
              </div>
            }
          </div>
        </article>

        <div class="bottom">
          <article class="panel">
            <div class="panel__head">
              <div>
                <h2>Payment mix</h2>
                <p>Share of sales today</p>
              </div>
            </div>
            <div class="mix">
              @let payTop = topShare(dash.paymentMix);
              <div class="donut" [style.background]="conic(dash.paymentMix)">
                <div class="donut__hole">
                  <b>{{ payTop.percent }}%</b>
                  <span>{{ payTop.label }}</span>
                </div>
              </div>
              <div class="legend">
                @for (item of dash.paymentMix; track item.label) {
                  <div class="legend__row">
                    <i [style.background]="item.color"></i>
                    <span>{{ item.label }}</span>
                    <b>{{ item.percent }}%</b>
                    <small>{{ item.value }} txns</small>
                  </div>
                }
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel__head">
              <div>
                <h2>Category mix</h2>
                <p>Units by category</p>
              </div>
            </div>
            <div class="mix">
              @let catTop = topShare(dash.categoryMix);
              <div class="donut" [style.background]="conic(dash.categoryMix)">
                <div class="donut__hole">
                  <b>{{ catTop.percent }}%</b>
                  <span>{{ catTop.label }}</span>
                </div>
              </div>
              <div class="legend">
                @for (item of dash.categoryMix; track item.label) {
                  <div class="legend__row">
                    <i [style.background]="item.color"></i>
                    <span>{{ item.label }}</span>
                    <b>{{ item.percent }}%</b>
                    <small>{{ item.value }} units</small>
                  </div>
                }
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel__head">
              <div>
                <h2>Top products</h2>
                <p>By revenue today</p>
              </div>
            </div>
            <div class="tops">
              @for (product of dash.topProducts; track product.name; let i = $index) {
                <div class="top">
                  <span class="rank" [attr.data-rank]="i + 1">{{ i + 1 }}</span>
                  <div class="top__body">
                    <div class="top__name">
                      <strong>{{ product.name }}</strong>
                      <b>{{ product.revenue | number: '1.0-0' }} {{ dash.currency }}</b>
                    </div>
                    <div class="track">
                      <div class="track__fill" [style.width.%]="product.share"></div>
                    </div>
                    <small>{{ product.units }} sold</small>
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
    :host {
      display: block;
      user-select: text;
    }

    .overview {
      display: grid;
      gap: 18px;
    }

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

    .sub {
      margin: 0;
      color: var(--text-muted);
      max-width: 46ch;
    }

    .page-head__meta {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: #e8f5ee;
      color: var(--success);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .live i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 0 0 rgba(27, 122, 61, 0.55);
      animation: pulse 1.8s ease-out infinite;
    }

    @keyframes pulse {
      70% { box-shadow: 0 0 0 8px rgba(27, 122, 61, 0); }
      100% { box-shadow: 0 0 0 0 rgba(27, 122, 61, 0); }
    }

    .hero {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 16px;
      padding: 22px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 100% 0%, rgba(227, 6, 19, 0.22), transparent 42%),
        linear-gradient(160deg, #162a86 0%, #0f1f66 58%, #0c184f 100%);
      color: #fff;
    }

    .hero__kicker {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.62);
    }

    .status {
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(61, 206, 122, 0.18);
      color: #8be3ad;
      letter-spacing: 0.04em;
    }

    .status[data-status='maintenance'] {
      background: rgba(255, 184, 77, 0.18);
      color: #ffd089;
    }

    .status[data-status='offline'] {
      background: rgba(255, 120, 120, 0.2);
      color: #ffb4b4;
    }

    .hero__value {
      margin: 0;
      font-size: clamp(2.4rem, 4vw, 3.4rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .hero__delta {
      margin: 10px 0 18px;
      font-size: 0.92rem;
      font-weight: 700;
      color: #8be3ad;
    }

    .hero__delta[data-trend='down'] { color: #ffb4b4; }
    .hero__delta[data-trend='flat'] { color: rgba(255, 255, 255, 0.7); }

    .hero__delta span {
      color: rgba(255, 255, 255, 0.55);
      font-weight: 600;
    }

    .hero__stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .hero__stats span {
      display: block;
      margin-bottom: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
    }

    .hero__stats strong {
      font-size: 1.05rem;
      font-weight: 800;
    }

    .spark {
      display: block;
      width: 100%;
      height: 72px;
    }

    .spark__area { fill: rgba(157, 180, 255, 0.22); }
    .spark__line {
      fill: none;
      stroke: #c3d0ff;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .spark-caption {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 8px 0 0;
      font-size: 0.75rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.5);
    }

    .hero__location {
      margin: 0 0 18px;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .rings {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .ring-card {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 10px 6px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.07);
      text-align: center;
    }

    .ring-card svg {
      width: 72px;
      height: 72px;
    }

    .ring-track {
      fill: none;
      stroke: rgba(255, 255, 255, 0.14);
      stroke-width: 8;
    }

    .ring-value {
      fill: none;
      stroke: #9db4ff;
      stroke-width: 8;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
    }

    .ring-value--ok { stroke: #8be3ad; }
    .ring-value--pay { stroke: #ffb4b8; }

    .ring-card b {
      font-size: 0.95rem;
      font-weight: 800;
    }

    .ring-card span {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }

    .ring-card--time {
      align-content: center;
      min-height: 132px;
    }

    .ring-card--time strong {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .ops-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .ops-tile {
      display: grid;
      grid-template-columns: 44px 1fr auto;
      align-items: center;
      gap: 12px;
      min-height: 92px;
      padding: 14px 16px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }

    .ops-tile:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .ops-tile__icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .ops-tile__icon svg { width: 20px; height: 20px; }

    .ops-tile[data-tone='warn'] .ops-tile__icon {
      background: #fff4e0;
      color: var(--warning);
    }

    .ops-tile[data-tone='danger'] .ops-tile__icon {
      background: #ffebee;
      color: #c62828;
    }

    .ops-tile[data-tone='success'] .ops-tile__icon {
      background: #e8f5ee;
      color: var(--success);
    }

    .ops-tile__body span {
      display: block;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .ops-tile__body strong {
      display: block;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    .ops-tile__body em {
      display: block;
      margin-top: 2px;
      font-style: normal;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--success);
    }

    .ops-tile__body em[data-trend='down'] { color: #c62828; }
    .ops-tile__body em[data-trend='flat'] { color: var(--text-muted); }

    .ops-tile__go {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }

    .mid,
    .bottom {
      display: grid;
      gap: 16px;
    }

    .mid { grid-template-columns: 1.45fr 1fr; }
    .bottom { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .panel {
      padding: 18px 18px 16px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .panel__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
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

    .chip {
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .chip--warn {
      background: #ffebee;
      color: #c62828;
    }

    .hour-chart {
      display: block;
      width: 100%;
      height: 220px;
    }

    .grid-line {
      stroke: #eef1f8;
      stroke-width: 1;
    }

    .grid-label,
    .x-label {
      fill: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      font-family: inherit;
    }

    .x-label { text-anchor: middle; }

    .hour-area { fill: rgba(26, 53, 163, 0.1); }
    .hour-line {
      fill: none;
      stroke: var(--primary);
      stroke-width: 2.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .hour-dot { fill: var(--primary); }
    .hour-dot--peak { fill: var(--accent); }

    .alerts {
      display: grid;
      gap: 8px;
    }

    .alert {
      display: grid;
      gap: 4px;
      padding: 12px 12px 12px 14px;
      border-radius: 12px;
      background: #eef1f8;
      border-left: 4px solid var(--primary);
    }

    .alert[data-level='warn'] {
      background: #fff8ec;
      border-left-color: var(--warning);
    }

    .alert[data-level='critical'] {
      background: #fff1f2;
      border-left-color: #c62828;
    }

    .alert__level {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--primary);
    }

    .alert[data-level='warn'] .alert__level { color: var(--warning); }
    .alert[data-level='critical'] .alert__level { color: #c62828; }

    .alert p {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 600;
      line-height: 1.4;
    }

    .week-bars {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      align-items: end;
      gap: 10px;
      min-height: 180px;
    }

    .week-bar {
      display: grid;
      justify-items: center;
      gap: 8px;
    }

    .week-bar__value {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .week-bar__track {
      display: flex;
      align-items: flex-end;
      width: 100%;
      max-width: 42px;
      height: 140px;
      border-radius: 12px;
      background: #eef1f8;
      overflow: hidden;
    }

    .week-bar__fill {
      width: 100%;
      min-height: 8px;
      border-radius: 12px;
      background: linear-gradient(180deg, #4c6ef5, var(--primary));
    }

    .week-bar--today .week-bar__fill {
      background: linear-gradient(180deg, #ff4d57, var(--accent));
    }

    .week-bar__label {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--text-muted);
    }

    .week-bar--today .week-bar__label { color: var(--accent); }

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

    .donut__hole b {
      font-size: 1.05rem;
      font-weight: 800;
      line-height: 1;
    }

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

    .tops { display: grid; gap: 12px; }

    .top {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 10px;
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

    .rank[data-rank='1'] { background: var(--primary); color: #fff; }
    .rank[data-rank='2'] { background: #4c6ef5; color: #fff; }
    .rank[data-rank='3'] { background: var(--accent); color: #fff; }

    .top__name {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .top__name strong {
      font-size: 0.88rem;
      font-weight: 800;
    }

    .top__name b {
      font-size: 0.8rem;
      color: var(--primary-dark);
      white-space: nowrap;
    }

    .top small {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .track {
      height: 7px;
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

    @media (max-width: 1180px) {
      .hero,
      .mid,
      .bottom,
      .ops-grid,
      .hero__stats,
      .rings {
        grid-template-columns: 1fr 1fr;
      }

      .ops-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 760px) {
      .page-head,
      .hero,
      .mid,
      .bottom,
      .ops-grid,
      .hero__stats,
      .rings,
      .mix,
      .week-bars {
        grid-template-columns: 1fr;
      }

      .page-head { align-items: flex-start; }
      .rings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .week-bars { grid-template-columns: repeat(7, minmax(0, 1fr)); }
    }
  `,
})
export class AdminOverviewComponent {
  private readonly data = inject(AdminDataService);

  readonly dash = toSignal(this.data.getDashboardAnalytics());
  readonly kiosk = toSignal(this.data.getSelectedKiosk());

  readonly revenueKpi = computed(
    () => this.dash()?.kpis.find((kpi) => kpi.label === 'Revenue today') ?? null,
  );

  readonly tradeKpis = computed(() => {
    const labels = new Set(['Sales today', 'Avg basket', 'Conversion']);
    return (this.dash()?.kpis ?? []).filter((kpi) => labels.has(kpi.label));
  });

  readonly opsKpis = computed(() => {
    const labels = new Set(['Low stock', 'Open faults', 'Security alerts', 'Uptime (7d)']);
    return (this.dash()?.kpis ?? []).filter((kpi) => labels.has(kpi.label));
  });

  readonly peakHour = computed(() => {
    const points = this.dash()?.hourlySales ?? [];
    return points.reduce<ChartPoint | null>(
      (best, point) => (!best || point.value > best.value ? point : best),
      null,
    );
  });

  readonly weekTotal = computed(() =>
    (this.dash()?.weeklyRevenue ?? []).reduce((sum, point) => sum + point.value, 0),
  );

  readonly weekMax = computed(() =>
    Math.max(...(this.dash()?.weeklyRevenue ?? []).map((point) => point.value), 1),
  );

  readonly hourTotal = computed(() =>
    (this.dash()?.hourlySales ?? []).reduce((sum, point) => sum + point.value, 0),
  );

  readonly criticalCount = computed(
    () => (this.dash()?.alerts ?? []).filter((alert) => alert.level === 'critical').length,
  );

  readonly hourlySpark = computed(() => this.chartPath(this.dash()?.hourlySales ?? [], 320, 72, 0));

  readonly hourlyChart = computed(() => {
    const points = this.dash()?.hourlySales ?? [];
    const peak = this.peakHour()?.label;
    const geom = this.chartPath(points, 640, 220, 36, 28, 16, 12);
    const max = Math.max(...points.map((point) => point.value), 1);
    const innerHeight = 220 - 16 - 28;
    return {
      ...geom,
      dots: geom.dots.map((dot) => ({ ...dot, peak: dot.label === peak })),
      grid: [0, 0.5, 1].map((ratio) => ({
        value: Math.round(max * (1 - ratio)),
        y: 16 + innerHeight * ratio,
      })),
    };
  });

  linkFor(label: string): string {
    switch (label) {
      case 'Low stock':
        return '/admin/inventory';
      case 'Open faults':
        return '/admin/malfunctions';
      case 'Security alerts':
        return '/admin/security';
      case 'Uptime (7d)':
        return '/admin/history';
      default:
        return '/admin/sales';
    }
  }

  ringDash(percent: number): string {
    const circumference = 2 * Math.PI * 42;
    return `${(Math.min(100, Math.max(0, percent)) / 100) * circumference} ${circumference}`;
  }

  barHeight(value: number, max: number): number {
    return Math.max(8, Math.round((value / max) * 100));
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

  private chartPath(
    points: ChartPoint[],
    width: number,
    height: number,
    padLeft = 0,
    padBottom = 0,
    padTop = 4,
    padRight = 0,
  ): { line: string; area: string; dots: { x: number; y: number; label: string; value: number }[] } {
    if (!points.length) {
      return { line: '', area: '', dots: [] };
    }

    const innerWidth = width - padLeft - padRight;
    const innerHeight = height - padTop - padBottom;
    const max = Math.max(...points.map((point) => point.value), 1);
    const dots = points.map((point, index) => {
      const x = padLeft + (index / Math.max(points.length - 1, 1)) * innerWidth;
      const y = padTop + innerHeight - (point.value / max) * innerHeight;
      return { x, y, label: point.label, value: point.value };
    });
    const line = dots
      .map((dot, index) => `${index === 0 ? 'M' : 'L'}${dot.x.toFixed(1)} ${dot.y.toFixed(1)}`)
      .join(' ');
    const last = dots[dots.length - 1];
    const area = `${line} L${last.x.toFixed(1)} ${height - padBottom} L${padLeft} ${height - padBottom} Z`;
    return { line, area, dots };
  }
}
