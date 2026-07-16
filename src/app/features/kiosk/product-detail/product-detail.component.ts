import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { SessionService } from '../../../core/services/session.service';
import { Product } from '../../../core/models/product.model';
import { getCategoryLabel } from '../../../core/data/mock-catalog';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { Observable, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [AsyncPipe, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    @if (product$ | async; as product) {
      <section class="product-detail page">
        <div class="product-detail__layout">
          <div class="product-detail__visual">
            <img [src]="product.imageUrl" [alt]="product.name" />
            @if (product.badge) {
              <span class="badge">{{ product.badge }}</span>
            }
          </div>

          <div class="product-detail__info">
            <span class="category">{{ categoryLabel(product.category) }}</span>
            <h1>{{ product.name }}</h1>
            <p class="tagline">{{ product.tagline }}</p>
            <p class="desc">{{ product.description }}</p>

            <div class="price-row">
              <div>
                <strong>{{ product.price | currencyFormat: product.currency }}</strong>
                <small>Price includes tax</small>
              </div>
              <div class="stock" [class.low]="product.stockAvailable <= 3">
                {{ product.stockAvailable }} available · Slot {{ product.slotCode }}
              </div>
            </div>

            <div class="panels">
              <div class="panel">
                <h2>Key features</h2>
                <ul>
                  @for (feature of product.features; track feature) {
                    <li>{{ feature }}</li>
                  }
                </ul>
              </div>
              <div class="panel">
                <h2>What’s included</h2>
                <ul>
                  @for (item of product.includes; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
              </div>
            </div>

            <div class="qty-bar">
              <div>
                <span class="qty-label">Quantity</span>
                <div class="qty-controls">
                  <button type="button" (click)="decrease()" [disabled]="quantity <= 1">−</button>
                  <strong>{{ quantity }}</strong>
                  <button
                    type="button"
                    (click)="increase()"
                    [disabled]="quantity >= product.stockAvailable"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="line-total">
                <span>Line total</span>
                <b>{{ product.price * quantity | currencyFormat: product.currency }}</b>
              </div>
            </div>

            <div class="page__actions product-detail__actions">
              <app-touch-button variant="ghost" (pressed)="back()">Back</app-touch-button>
              <app-touch-button variant="secondary" (pressed)="addToCart(product)">
                Add to Cart
              </app-touch-button>
              <app-touch-button variant="primary" (pressed)="buyNow(product)">
                Buy Now
              </app-touch-button>
            </div>
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .product-detail__layout {
      display: grid;
      grid-template-columns: minmax(280px, 380px) 1fr;
      gap: 36px;
      align-items: start;
    }

    .product-detail__visual {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 360px;
      padding: 28px;
      border-radius: 28px;
      background:
        radial-gradient(circle at 40% 30%, rgba(26, 53, 163, 0.1), transparent 55%),
        linear-gradient(165deg, #fff, #eef1f8);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }

    .product-detail__visual img {
      width: 100%;
      max-width: 260px;
      height: auto;
      border-radius: 18px;
    }

    .badge {
      position: absolute;
      top: 18px;
      left: 18px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .category {
      display: inline-block;
      margin-bottom: 8px;
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 3vw, 2.6rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .tagline {
      margin: 0 0 12px;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text);
    }

    .desc {
      margin: 0 0 20px;
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.55;
      max-width: 52ch;
    }

    .price-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 22px;
      padding: 18px 20px;
      border-radius: 18px;
      background: var(--primary-soft);
    }

    .price-row strong {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .price-row small {
      color: var(--text-muted);
    }

    .stock {
      padding: 8px 12px;
      border-radius: 999px;
      background: #fff;
      color: var(--success);
      font-size: 0.88rem;
      font-weight: 700;
    }

    .stock.low {
      color: var(--warning);
    }

    .panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 22px;
    }

    .panel {
      padding: 18px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .panel h2 {
      margin: 0 0 12px;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .panel ul {
      margin: 0;
      padding: 0 0 0 18px;
      display: grid;
      gap: 8px;
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .qty-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .qty-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .qty-controls {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .qty-controls button {
      width: 52px;
      height: 52px;
      border: 2px solid var(--border);
      border-radius: 14px;
      background: #fff;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .qty-controls button:disabled {
      opacity: 0.4;
    }

    .qty-controls strong {
      min-width: 28px;
      text-align: center;
      font-size: 1.35rem;
    }

    .line-total {
      text-align: right;
    }

    .line-total span {
      display: block;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .line-total b {
      font-size: 1.4rem;
      color: var(--primary-dark);
    }

    .product-detail__actions {
      margin-top: 20px;
    }

    @media (max-width: 900px) {
      .product-detail__layout,
      .panels {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly session = inject(SessionService);

  quantity = 1;
  product$!: Observable<Product | undefined>;

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap((params) => this.catalog.getProductById(params.get('id') ?? '')),
      tap(() => {
        this.quantity = 1;
        this.session.resetTimeout();
      }),
    );
  }

  categoryLabel(category: string): string {
    return getCategoryLabel(category as Product['category']);
  }

  increase(): void {
    this.quantity += 1;
  }

  decrease(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  addToCart(product: Product): void {
    this.cart.addProduct(product, this.quantity);
    void this.router.navigate(['/browse']);
  }

  buyNow(product: Product): void {
    this.cart.clear();
    this.cart.addProduct(product, this.quantity);
    void this.router.navigate(['/cart']);
  }

  back(): void {
    void this.router.navigate(['/browse']);
  }
}
