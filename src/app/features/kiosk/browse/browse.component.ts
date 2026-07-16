import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { SessionService } from '../../../core/services/session.service';
import { ProductCategory } from '../../../core/models/product.model';
import { CATEGORIES } from '../../../core/data/mock-catalog';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [AsyncPipe, ProductCardComponent, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="browse page">
      <div class="page__header">
        <div>
          <h1>Choose what you need</h1>
          <p>Browse by category or scroll all items currently stocked in this machine.</p>
        </div>
        <app-touch-button
          variant="primary"
          [disabled]="cart.isEmpty()"
          (pressed)="goToCart()"
        >
          Cart · {{ cart.summary().itemCount }}
          @if (!cart.isEmpty()) {
            <span class="cart-total">{{ cart.summary().total | currencyFormat: cart.summary().currency }}</span>
          }
        </app-touch-button>
      </div>

      <div class="browse__categories">
        <button
          type="button"
          class="category-tile"
          [class.active]="selectedCategory() === null"
          (click)="selectCategory(null)"
        >
          <span class="category-tile__icon">✦</span>
          <strong>All items</strong>
          <small>Everything available</small>
        </button>
        @for (category of categories; track category.id) {
          <button
            type="button"
            class="category-tile"
            [class.active]="selectedCategory() === category.id"
            (click)="selectCategory(category.id)"
          >
            <span class="category-tile__icon">{{ category.icon }}</span>
            <strong>{{ category.label }}</strong>
            <small>{{ category.description }}</small>
          </button>
        }
      </div>

      <div class="browse__meta">
        <h2>{{ sectionTitle() }}</h2>
        <span>Tap a product for details</span>
      </div>

      <div class="browse__grid">
        @for (product of products$ | async; track product.id) {
          <app-product-card [product]="product" (selected)="openProduct($event.id)" />
        } @empty {
          <div class="browse__empty">
            <strong>Nothing here right now</strong>
            <p>This category is out of stock at this machine. Try another category.</p>
          </div>
        }
      </div>

      <div class="page__actions">
        <app-touch-button variant="ghost" (pressed)="cancel()">End session</app-touch-button>
      </div>
    </section>
  `,
  styles: `
    .cart-total {
      margin-left: 8px;
      padding-left: 8px;
      border-left: 1px solid rgba(255, 255, 255, 0.35);
      font-weight: 600;
      opacity: 0.95;
    }

    .browse__categories {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }

    .category-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-height: 108px;
      padding: 16px;
      border: 2px solid var(--border);
      border-radius: 18px;
      background: var(--surface);
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }

    .category-tile:hover {
      border-color: #a8b4e0;
    }

    .category-tile.active {
      border-color: var(--primary);
      background: var(--primary-soft);
      box-shadow: 0 0 0 3px rgba(26, 53, 163, 0.12);
    }

    .category-tile__icon {
      font-size: 1.4rem;
      margin-bottom: 4px;
    }

    .category-tile strong {
      font-size: 1rem;
      font-weight: 800;
    }

    .category-tile small {
      color: var(--text-muted);
      font-size: 0.8rem;
      line-height: 1.3;
    }

    .browse__meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .browse__meta h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
    }

    .browse__meta span {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .browse__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 20px;
    }

    .browse__empty {
      grid-column: 1 / -1;
      padding: 56px 32px;
      border-radius: 22px;
      background: var(--surface);
      border: 1px dashed var(--border);
      text-align: center;
    }

    .browse__empty strong {
      display: block;
      margin-bottom: 8px;
      font-size: 1.2rem;
    }

    .browse__empty p {
      margin: 0;
      color: var(--text-muted);
    }

    @media (max-width: 1100px) {
      .browse__categories {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .browse__categories {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class BrowseComponent {
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(SessionService);
  readonly cart = inject(CartService);

  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<ProductCategory | null>(null);
  products$ = this.catalog.getProducts();

  sectionTitle(): string {
    const id = this.selectedCategory();
    if (!id) {
      return 'All available products';
    }
    return CATEGORIES.find((c) => c.id === id)?.label ?? 'Products';
  }

  selectCategory(category: ProductCategory | null): void {
    this.selectedCategory.set(category);
    this.products$ = this.catalog.getProducts(category ?? undefined);
    this.session.resetTimeout();
  }

  openProduct(id: string): void {
    void this.router.navigate(['/product', id]);
  }

  goToCart(): void {
    void this.router.navigate(['/cart']);
  }

  cancel(): void {
    this.cart.clear();
    this.session.endSession();
    void this.router.navigate(['/']);
  }
}
