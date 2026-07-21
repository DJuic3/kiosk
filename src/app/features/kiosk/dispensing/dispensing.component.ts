import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DispenseResult } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

const MAX_ATTEMPTS = 2;

@Component({
  selector: 'app-dispensing',
  standalone: true,
  imports: [TouchButtonComponent],
  template: `
    <section class="dispensing page">
      <div class="dispensing__card">
        <div class="dispensing__visual" aria-hidden="true">
          <div class="dispensing__slot"></div>
          <div class="dispensing__item"></div>
        </div>
        <h1>{{ headline() }}</h1>
        <p>{{ subtitle() }}</p>

        @if (results().length) {
          <div class="results">
            @for (row of results(); track $index) {
              <div class="row" [attr.data-status]="row.status">
                <span>{{ row.status === 'success' ? '✓' : row.status === 'retrying' ? '↻' : '✕' }}</span>
                <div>
                  <strong>{{ row.productName }}</strong>
                  <small>{{ row.message || ('Slot ' + row.slotCode) }}</small>
                </div>
              </div>
            }
          </div>
        }

        @if (phase() === 'working') {
          <div class="progress"><div class="progress__bar"></div></div>
        }

        @if (phase() === 'retry') {
          <app-touch-button variant="primary" [block]="true" (pressed)="retry()">
            Retry dispense (camera retry {{ attempt() }}/{{ maxAttempts }})
          </app-touch-button>
        }
      </div>
    </section>
  `,
  styles: `
    .dispensing { display: grid; place-items: center; }
    .dispensing__card {
      width: min(560px, 100%);
      display: grid;
      gap: 16px;
      padding: 40px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }
    .dispensing__visual { position: relative; height: 120px; margin: 0 auto 8px; width: 160px; }
    .dispensing__slot {
      position: absolute; inset: 0 20px auto; height: 28px; border-radius: 8px; background: #1a3d2a;
    }
    .dispensing__item {
      position: absolute; left: 50%; top: 20px; width: 48px; height: 48px; margin-left: -24px;
      border-radius: 12px; background: linear-gradient(145deg, #1a35a3, #122678);
      animation: drop 1.4s ease-in-out infinite; box-shadow: 0 8px 16px rgba(0,0,0,.2);
    }
    h1 { margin: 0; font-size: 1.7rem; }
    p { margin: 0; color: var(--text-muted); }
    .results { display: grid; gap: 8px; text-align: left; }
    .row {
      display: grid; grid-template-columns: 28px 1fr; gap: 10px; align-items: center;
      padding: 10px 12px; border-radius: 12px; background: var(--bg);
    }
    .row[data-status='failed'] { background: #ffebee; }
    .row[data-status='retrying'] { background: #fff4e0; }
    .row small { display: block; color: var(--text-muted); }
    .progress { height: 8px; border-radius: 999px; background: #e8eee9; overflow: hidden; }
    .progress__bar {
      height: 100%; width: 40%; border-radius: 999px; background: var(--primary);
      animation: slide 1.2s ease-in-out infinite;
    }
    @keyframes drop {
      0% { transform: translateY(0); opacity: 1; }
      70% { transform: translateY(70px); opacity: 1; }
      100% { transform: translateY(70px); opacity: 0; }
    }
    @keyframes slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(280%); }
    }
  `,
})
export class DispensingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly session = inject(SessionService);

  readonly maxAttempts = MAX_ATTEMPTS;
  readonly attempt = signal(1);
  readonly phase = signal<'working' | 'retry' | 'done'>('working');
  readonly results = signal<DispenseResult[]>([]);
  readonly headline = signal('Dispensing your items');
  readonly subtitle = signal('Please wait — camera will confirm each drop.');

  ngOnInit(): void {
    const order = this.session.activeOrder();
    if (!order) {
      void this.router.navigate(['/']);
      return;
    }
    this.session.setStep('dispensing');
    this.runAttempt(1);
  }

  retry(): void {
    const next = this.attempt() + 1;
    this.attempt.set(next);
    this.runAttempt(next);
  }

  private runAttempt(attempt: number): void {
    const order = this.session.activeOrder();
    if (!order) return;

    this.phase.set('working');
    this.headline.set(attempt === 1 ? 'Dispensing your items' : 'Retrying failed slots');
    this.subtitle.set('Camera / sensor verifying the collection tray…');

    this.orders.dispenseOrder(order, attempt).subscribe({
      next: (results) => {
        this.results.set(results);
        const failed = results.filter((r) => r.status === 'failed');
        if (failed.length && attempt < MAX_ATTEMPTS) {
          this.phase.set('retry');
          this.headline.set('Empty tray detected');
          this.subtitle.set('Product did not drop. The kiosk will retry automatically or tap Retry.');
          this.results.set(
            results.map((r) =>
              r.status === 'failed' ? { ...r, status: 'retrying' as const } : r,
            ),
          );
          setTimeout(() => {
            if (this.phase() === 'retry') {
              this.retry();
            }
          }, 2500);
          return;
        }

        if (failed.length) {
          this.session.setOrder({
            ...order,
            dispenseResults: results,
            status: 'partial',
          });
          this.phase.set('done');
          this.headline.set('Dispense incomplete');
          this.subtitle.set('Opening refund / credit note…');
          setTimeout(() => {
            this.session.setStep('refund');
            void this.router.navigate(['/refund']);
          }, 1600);
          return;
        }

        this.session.setOrder({
          ...order,
          dispenseResults: results,
          status: 'completed',
        });
        this.phase.set('done');
        this.headline.set('Items dispensed');
        this.subtitle.set('Please collect from the bin.');
        setTimeout(() => {
          this.session.setStep('collect');
          void this.router.navigate(['/collect']);
        }, 1200);
      },
      error: () => {
        void this.router.navigate(['/refund']);
      },
    });
  }
}
