import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';
import { CartLine, CartSummary } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly lines = signal<CartLine[]>([]);

  readonly cartLines = this.lines.asReadonly();

  readonly summary = computed<CartSummary>(() => {
    const lines = this.lines();
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const tax = 0; // prices are tax-inclusive per spec
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      lines,
      itemCount,
      subtotal,
      tax,
      total: subtotal + tax,
      currency: lines[0]?.product.currency ?? 'USD',
    };
  });

  readonly isEmpty = computed(() => this.lines().length === 0);

  addProduct(product: Product, quantity = 1): void {
    const existing = this.lines().find((line) => line.product.id === product.id);

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stockAvailable);
      this.updateQuantity(product.id, newQty);
      return;
    }

    this.lines.update((lines) => [
      ...lines,
      { product, quantity: Math.min(quantity, product.stockAvailable), unitPrice: product.price },
    ]);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    this.lines.update((lines) =>
      lines.map((line) =>
        line.product.id === productId
          ? { ...line, quantity: Math.min(quantity, line.product.stockAvailable) }
          : line,
      ),
    );
  }

  removeProduct(productId: string): void {
    this.lines.update((lines) => lines.filter((line) => line.product.id !== productId));
  }

  clear(): void {
    this.lines.set([]);
  }
}
