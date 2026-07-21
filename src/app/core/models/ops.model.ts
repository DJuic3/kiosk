export interface VoucherReservation {
  code: string;
  orderId: string;
  productName: string;
  sku: string;
  slotCode: string;
  kioskId: string;
  buyerName: string;
  recipientHint: string;
  status: 'reserved' | 'collected' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface GrvLine {
  sku: string;
  name: string;
  slotCode: string;
  expectedQty: number;
  acceptedQty: number;
  damagedQty: number;
}

export interface GrvRecord {
  id: string;
  kioskId: string;
  dispatchRef: string;
  lines: GrvLine[];
  notes: string;
  createdAt: string;
  status: 'draft' | 'posted';
}
