import { CartLine } from './cart.model';
import { PaymentMethod } from './payment.model';

export type OrderStatus =
  | 'draft'
  | 'reserved'
  | 'paying'
  | 'paid'
  | 'fiscalised'
  | 'dispensing'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'refunded'
  | 'voided';

export type DispenseStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface DispenseResult {
  slotCode: string;
  productName: string;
  status: DispenseStatus;
  message?: string;
  attempts?: number;
}

export interface FiscalReceipt {
  fiscalNumber: string;
  issuedAt: string;
  provider: string;
  qrPayload: string;
}

export interface CreditNote {
  id: string;
  orderId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'fiscalised' | 'refunded';
  createdAt: string;
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
  fiscalReceipt?: FiscalReceipt;
  creditNote?: CreditNote;
  surveyScore?: number;
}
