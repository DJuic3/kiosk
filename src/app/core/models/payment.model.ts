export type PaymentMethod =
  | 'ecocash'
  | 'card'
  | 'qr'
  | 'cash';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'declined'
  | 'expired'
  | 'indeterminate';

export interface PaymentIntent {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  expiresAt: string;
  instructions?: string;
}

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}
