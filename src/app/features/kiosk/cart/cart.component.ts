import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { SessionService } from '../../../core/services/session.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="cart page">
      <div class="page__header">
        <div>
          <h1>Your cart</h1>
          <p>Review your items before checkout.</p>
        </div>
      </div>

      @if (cart.isEmpty()) {
        <div class="cart__empty">
          <p>Your cart is empty.</p>
          <app-touch-button variant="primary" (pressed)="browse()">Browse items</app-touch-button>
        </div>
      } @else {
        <div class="cart__lines">
          @for (line of cart.summary().lines; track line.product.id) {
            <article class="cart-line">
              <img class="cart-line__image" [src]="line.product.imageUrl" [alt]="line.product.name" />
              <div class="cart-line__info">
                <strong>{{ line.product.name }}</strong>
                <span>{{ line.unitPrice | currencyFormat: line.product.currency }} each</span>
              </div>
              <div class="cart-line__controls">
                <button type="button" (click)="decrease(line.product.id, line.quantity)">−</button>
                <span>{{ line.quantity }}</span>
                <button
                  type="button"
                  (click)="increase(line.product.id, line.quantity, line.product.stockAvailable)"
                >
                  +
                </button>
                <button type="button" class="remove" (click)="remove(line.product.id)">Remove</button>
              </div>
              <strong class="cart-line__total">
                {{ line.unitPrice * line.quantity | currencyFormat: line.product.currency }}
              </strong>
            </article>
          }
        </div>

        <div class="cart__summary">
          <div><span>Items</span><strong>{{ cart.summary().itemCount }}</strong></div>
          <div><span>Subtotal</span><strong>{{ cart.summary().subtotal | currencyFormat: cart.summary().currency }}</strong></div>
          <div class="cart__total">
            <span>Total</span>
            <strong>{{ cart.summary().total | currencyFormat: cart.summary().currency }}</strong>
          </div>
        </div>

        <div class="page__actions">
          <app-touch-button variant="ghost" (pressed)="browse()">Continue shopping</app-touch-button>
          <app-touch-button variant="primary" (pressed)="checkout()">Proceed to checkout</app-touch-button>
        </div>
      }
    </section>
  `,
  styles: `
    .cart__empty {
      display: grid;
      gap: 16px;
      place-items: center;
      padding: 64px;
      border-radius: 20px;
      background: var(--surface);
      text-align: center;
    }

    .cart__lines {
      display: grid;
      gap: 12px;
      margin-bottom: 24px;
    }

    .cart-line {
      display: grid;
      grid-template-columns: 64px 1fr auto auto;
      gap: 16px;
      align-items: center;
      padding: 20px;
      border-radius: 16px;
      background: var(--surface);
    }

    .cart-line__image {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: contain;
      background: #f7faf8;
    }

    .cart-line__info {
      display: grid;
      gap: 4px;
    }

    .cart-line__info span {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .cart-line__controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cart-line__controls button {
      min-width: 44px;
      min-height: 44px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: #fff;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .cart-line__controls .remove {
      min-width: auto;
      padding: 0 14px;
      font-size: 0.9rem;
      color: #c62828;
    }

    .cart-line__total {
      font-size: 1.1rem;
      color: var(--primary-dark);
    }

    .cart__summary {
      display: grid;
      gap: 12px;
      padding: 24px;
      border-radius: 16px;
      background: var(--primary-soft);
    }

    .cart__summary > div {
      display: flex;
      justify-content: space-between;
    }

    .cart__total {
      padding-top: 12px;
      border-top: 2px solid rgba(0, 0, 0, 0.08);
      font-size: 1.3rem;
    }

    @media (max-width: 900px) {
      .cart-line {
        grid-template-columns: 64px 1fr;
      }

      .cart-line__controls,
      .cart-line__total {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class CartComponent {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  readonly cart = inject(CartService);

  browse(): void {
    void this.router.navigate(['/browse']);
  }

  checkout(): void {
    this.session.setStep('checkout');
    void this.router.navigate(['/checkout']);
  }

  increase(productId: string, current: number, max: number): void {
    if (current < max) {
      this.cart.updateQuantity(productId, current + 1);
    }
  }

  decrease(productId: string, current: number): void {
    this.cart.updateQuantity(productId, current - 1);
  }

  remove(productId: string): void {
    this.cart.removeProduct(productId);
  }
}
