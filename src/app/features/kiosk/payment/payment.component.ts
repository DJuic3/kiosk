import { UpperCasePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [UpperCasePipe, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="payment page">
      <div class="payment__card">
        <div class="payment__status" [class.confirmed]="status() === 'confirmed'">
          @switch (status()) {
            @case ('processing') {
              <div class="spinner"></div>
              <h1>Processing payment</h1>
              <p>{{ intent()?.instructions }}</p>
            }
            @case ('confirmed') {
              <div class="success-icon">✓</div>
              <h1>Payment confirmed</h1>
              <p>Preparing your items...</p>
            }
            @case ('declined') {
              <div class="error-icon">✕</div>
              <h1>Payment declined</h1>
              <p>Please try another payment method.</p>
            }
          }
        </div>

        @if (intent(); as payment) {
          <div class="payment__details">
            <div><span>Amount</span><strong>{{ payment.amount | currencyFormat: payment.currency }}</strong></div>
            <div><span>Reference</span><strong>{{ payment.reference }}</strong></div>
            <div><span>Method</span><strong>{{ payment.method | uppercase }}</strong></div>
          </div>
        }

        @if (status() === 'processing') {
          <div class="payment__timer">Time remaining: {{ secondsLeft() }}s</div>
          <app-touch-button variant="secondary" [block]="true" (pressed)="simulateApproval()">
            Simulate approval (demo)
          </app-touch-button>
        }

        @if (status() === 'declined') {
          <app-touch-button variant="primary" [block]="true" (pressed)="retry()">Try again</app-touch-button>
        }
      </div>
    </section>
  `,
  styles: `
    .payment {
      display: grid;
      place-items: center;
    }

    .payment__card {
      width: min(640px, 100%);
      display: grid;
      gap: 24px;
      padding: 40px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .payment__status h1 {
      margin: 16px 0 8px;
      font-size: 2rem;
    }

    .payment__status p {
      margin: 0;
      color: var(--text-muted);
      font-size: 1.05rem;
    }

    .spinner {
      width: 72px;
      height: 72px;
      margin: 0 auto;
      border: 6px solid #e0e0e0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .success-icon,
    .error-icon {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin: 0 auto;
      border-radius: 50%;
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
    }

    .success-icon {
      background: var(--success);
    }

    .error-icon {
      background: #c62828;
    }

    .payment__details {
      display: grid;
      gap: 12px;
      padding: 20px;
      border-radius: 16px;
      background: var(--bg);
      text-align: left;
    }

    .payment__details > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .payment__details span {
      color: var(--text-muted);
    }

    .payment__timer {
      font-weight: 700;
      color: var(--primary-dark);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class PaymentComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  readonly session = inject(SessionService);

  readonly intent = this.session.paymentIntent;
  readonly status = signal<'processing' | 'confirmed' | 'declined'>('processing');
  readonly secondsLeft = signal(120);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.intent()) {
      void this.router.navigate(['/checkout']);
      return;
    }

    this.timer = setInterval(() => {
      const next = this.secondsLeft() - 1;
      this.secondsLeft.set(next);
      if (next <= 0) {
        this.status.set('declined');
        this.clearTimer();
      }
    }, 1000);

    // Auto-confirm in demo after short delay
    setTimeout(() => this.simulateApproval(), 3000);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  simulateApproval(): void {
    const intent = this.intent();
    if (!intent || this.status() !== 'processing') {
      return;
    }

    this.orders.confirmPayment(intent.id).subscribe({
      next: () => {
        this.status.set('confirmed');
        this.clearTimer();
        setTimeout(() => {
          this.session.setStep('dispensing');
          void this.router.navigate(['/dispensing']);
        }, 1200);
      },
      error: () => this.status.set('declined'),
    });
  }

  retry(): void {
    void this.router.navigate(['/checkout']);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
