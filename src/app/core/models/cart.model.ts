import { Product } from './product.model';

export interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}
