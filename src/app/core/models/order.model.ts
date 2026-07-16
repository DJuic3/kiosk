import { CartLine } from './cart.model';
import { PaymentMethod } from './payment.model';

export type OrderStatus =
  | 'draft'
  | 'reserved'
  | 'paying'
  | 'paid'
  | 'dispensing'
  | 'completed'
  | 'failed'
  | 'voided';

export type DispenseStatus = 'pending' | 'success' | 'failed' | 'partial';

export interface DispenseResult {
  slotCode: string;
  productName: string;
  status: DispenseStatus;
  message?: string;
}

export interface Order {
  id: string;
  machineId: string;
  lines: CartLine[];
  total: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  dispenseResults?: DispenseResult[];
  receiptNumber?: string;
}
