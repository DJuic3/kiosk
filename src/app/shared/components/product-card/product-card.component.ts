import { Component, input, output } from '@angular/core';
import { Product } from '../../../core/models/product.model';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { getCategoryLabel } from '../../../core/data/mock-catalog';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyFormatPipe],
  template: `
    <button type="button" class="product-card" (click)="selected.emit(product())">
      <div class="product-card__visual">
        <img
          class="product-card__image"
          [src]="product().imageUrl"
          [alt]="product().name"
          loading="lazy"
        />
        @if (product().badge) {
          <span class="product-card__badge">{{ product().badge }}</span>
        }
        <span class="product-card__stock-chip" [class.low]="product().stockAvailable <= 3">
          {{ product().stockAvailable <= 3 ? 'Low stock' : 'In stock' }}
        </span>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">{{ categoryLabel() }}</span>
        <h3>{{ product().name }}</h3>
        <p class="tagline">{{ product().tagline }}</p>
        <p class="desc">{{ product().description }}</p>
        <div class="product-card__footer">
          <div>
            <strong>{{ product().price | currencyFormat: product().currency }}</strong>
            <small>Tax incl.</small>
          </div>
          <span class="cta">View →</span>
        </div>
      </div>
    </button>
  `,
  styles: `
    .product-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 360px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: var(--surface);
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(18, 38, 120, 0.04);
    }

    .product-card:active {
      transform: scale(0.985);
    }

    .product-card:hover,
    .product-card:focus-visible {
      border-color: var(--primary);
      box-shadow: var(--shadow);
      outline: none;
      transform: translateY(-3px);
    }

    .product-card__visual {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 170px;
      padding: 18px;
      background:
        radial-gradient(circle at 30% 20%, rgba(26, 53, 163, 0.08), transparent 55%),
        linear-gradient(180deg, #f5f7fc, #eef1f8);
    }

    .product-card__image {
      width: 100%;
      max-width: 150px;
      height: 130px;
      object-fit: contain;
      border-radius: 16px;
    }

    .product-card__badge {
      position: absolute;
      top: 14px;
      left: 14px;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .product-card__stock-chip {
      position: absolute;
      top: 14px;
      right: 14px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(27, 122, 61, 0.12);
      color: var(--success);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .product-card__stock-chip.low {
      background: rgba(184, 110, 0, 0.12);
      color: var(--warning);
    }

    .product-card__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 6px;
      padding: 18px;
    }

    .product-card__category {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--primary);
    }

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    .tagline {
      margin: 0;
      color: var(--text);
      font-size: 0.92rem;
      font-weight: 600;
    }

    .desc {
      margin: 0;
      flex: 1;
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-card__footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    strong {
      display: block;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    small {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .cta {
      color: var(--primary);
      font-size: 0.9rem;
      font-weight: 700;
    }
  `,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly selected = output<Product>();

  categoryLabel(): string {
    return getCategoryLabel(this.product().category);
  }
}
