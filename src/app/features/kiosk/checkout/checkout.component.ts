import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { MachineService } from '../../../core/services/machine.service';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';
import { PaymentMethod, PaymentMethodInfo } from '../../../core/models/payment.model';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AsyncPipe, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="checkout page">
      <div class="page__header">
        <div>
          <h1>Checkout</h1>
          <p>Choose how you would like to pay.</p>
        </div>
      </div>

      <div class="checkout__summary">
        <strong>{{ cart.summary().total | currencyFormat: cart.summary().currency }}</strong>
        <span>{{ cart.summary().itemCount }} item(s)</span>
      </div>

      <div class="checkout__methods">
        @for (method of methods$ | async; track method.id) {
          <button
            type="button"
            class="payment-method"
            [class.selected]="selectedMethod?.id === method.id"
            (click)="selectMethod(method)"
          >
            <span class="payment-method__icon">{{ method.icon }}</span>
            <div>
              <strong>{{ method.label }}</strong>
              <small>{{ method.description }}</small>
            </div>
          </button>
        }
      </div>

      <div class="page__actions">
        <app-touch-button variant="ghost" (pressed)="back()">Back to cart</app-touch-button>
        <app-touch-button
          variant="primary"
          [disabled]="!selectedMethod || processing"
          (pressed)="pay()"
        >
          {{ processing ? 'Processing...' : 'Pay now' }}
        </app-touch-button>
      </div>
    </section>
  `,
  styles: `
    .checkout__summary {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 24px;
      padding: 24px;
      border-radius: 16px;
      background: var(--primary-soft);
    }

    .checkout__summary strong {
      font-size: 2rem;
      color: var(--primary-dark);
    }

    .checkout__methods {
      display: grid;
      gap: 14px;
      margin-bottom: 24px;
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: 88px;
      padding: 20px 24px;
      border: 2px solid var(--border);
      border-radius: 18px;
      background: var(--surface);
      text-align: left;
      cursor: pointer;
    }

    .payment-method.selected {
      border-color: var(--primary);
      background: #eef1fb;
      box-shadow: 0 0 0 3px rgba(26, 53, 163, 0.12);
    }

    .payment-method__icon {
      font-size: 2rem;
    }

    strong {
      display: block;
      font-size: 1.1rem;
    }

    small {
      color: var(--text-muted);
    }
  `,
})
export class CheckoutComponent {
  private readonly router = inject(Router);
  private readonly machine = inject(MachineService);
  private readonly orders = inject(OrderService);
  private readonly session = inject(SessionService);
  readonly cart = inject(CartService);

  readonly methods$ = this.machine.getPaymentMethods();
  selectedMethod: PaymentMethodInfo | null = null;
  processing = false;

  selectMethod(method: PaymentMethodInfo): void {
    this.selectedMethod = method;
    this.session.resetTimeout();
  }

  back(): void {
    void this.router.navigate(['/cart']);
  }

  pay(): void {
    if (!this.selectedMethod || this.processing) {
      return;
    }

    this.processing = true;
    const summary = this.cart.summary();

    this.orders.createOrder(summary).subscribe({
      next: (order) => {
        this.session.setOrder({
          ...order,
          paymentMethod: this.selectedMethod!.id as PaymentMethod,
        });
        this.orders
          .initiatePayment(order.id, this.selectedMethod!.id as PaymentMethod, summary.total)
          .subscribe({
            next: (intent) => {
              this.session.setPaymentIntent(intent);
              this.session.setStep('payment');
              void this.router.navigate(['/payment']);
            },
            error: () => {
              this.processing = false;
            },
          });
      },
      error: () => {
        this.processing = false;
      },
    });
  }
}
