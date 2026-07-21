import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GrvRecord, VoucherReservation } from '../models/ops.model';
import { CreditNote } from '../models/order.model';
import { MOCK_PRODUCTS } from '../data/mock-catalog';

@Injectable({ providedIn: 'root' })
export class OpsDataService {
  private readonly vouchersSubject = new BehaviorSubject<VoucherReservation[]>([
    {
      code: 'VCH-48291',
      orderId: 'ORD-REMOTE-1001',
      productName: 'USB-C Fast Charger',
      sku: 'GAD-USB-C-01',
      slotCode: 'R1',
      kioskId: environment.machineId,
      buyerName: 'Tendai M.',
      recipientHint: 'Gift · Super App',
      status: 'reserved',
      expiresAt: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
      createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    },
    {
      code: 'VCH-77310',
      orderId: 'ORD-REMOTE-1002',
      productName: 'Econet Starter SIM',
      sku: 'SIM-ECONET-01',
      slotCode: 'R2',
      kioskId: environment.machineId,
      buyerName: 'Chipo N.',
      recipientHint: 'Courier collection',
      status: 'reserved',
      expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
    },
    {
      code: 'VCH-11902',
      orderId: 'ORD-REMOTE-0990',
      productName: 'Power Bank 10,000mAh',
      sku: 'GAD-PB-01',
      slotCode: 'R1',
      kioskId: environment.machineId,
      buyerName: 'Farai D.',
      recipientHint: 'Expired demo',
      status: 'expired',
      expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 24 * 3600_000).toISOString(),
    },
  ]);

  private readonly creditNotesSubject = new BehaviorSubject<CreditNote[]>([
    {
      id: 'CN-DEMO-01',
      orderId: 'ORD-DEMO-8841',
      receiptNumber: 'RCP-8841',
      amount: 24.99,
      currency: 'USD',
      reason: 'Dispense failure after retries',
      status: 'fiscalised',
      createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    },
  ]);
  private readonly grvSubject = new BehaviorSubject<GrvRecord[]>([]);

  getVouchers(): Observable<VoucherReservation[]> {
    return this.vouchersSubject.asObservable();
  }

  getCreditNotes(): Observable<CreditNote[]> {
    return this.creditNotesSubject.asObservable();
  }

  getGrvs(): Observable<GrvRecord[]> {
    return this.grvSubject.asObservable();
  }

  validateVoucher(code: string): Observable<VoucherReservation | null> {
    const normalised = code.trim().toUpperCase();
    const found = this.vouchersSubject.value.find((v) => v.code === normalised) ?? null;
    if (!found) {
      return of(null).pipe(delay(400));
    }
    if (found.status === 'expired' || new Date(found.expiresAt).getTime() < Date.now()) {
      return of({ ...found, status: 'expired' as const }).pipe(delay(400));
    }
    if (found.status === 'collected') {
      return of(found).pipe(delay(400));
    }
    return of(found).pipe(delay(400));
  }

  collectVoucher(code: string): Observable<VoucherReservation | null> {
    const list = this.vouchersSubject.value;
    const index = list.findIndex((v) => v.code === code.trim().toUpperCase());
    if (index < 0) {
      return of(null);
    }
    const current = list[index];
    if (current.status !== 'reserved') {
      return of(current).pipe(delay(500));
    }
    const updated: VoucherReservation = { ...current, status: 'collected' };
    const next = [...list];
    next[index] = updated;
    this.vouchersSubject.next(next);
    return of(updated).pipe(delay(1200));
  }

  addCreditNote(note: CreditNote | Omit<CreditNote, 'id' | 'createdAt'>): Observable<CreditNote> {
    const created: CreditNote =
      'id' in note && 'createdAt' in note
        ? note
        : {
            ...(note as Omit<CreditNote, 'id' | 'createdAt'>),
            id: `CN-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
    this.creditNotesSubject.next([created, ...this.creditNotesSubject.value]);
    return of(created).pipe(delay(600));
  }

  draftGrv(): GrvRecord {
    const lines = MOCK_PRODUCTS.slice(0, 5).map((p, i) => ({
      sku: p.sku,
      name: p.name,
      slotCode: p.slotCode,
      expectedQty: 8 + (i % 4),
      acceptedQty: 8 + (i % 4),
      damagedQty: 0,
    }));
    return {
      id: `GRV-${Date.now()}`,
      kioskId: environment.machineId,
      dispatchRef: `DSP-${Math.floor(10000 + Math.random() * 89999)}`,
      lines,
      notes: '',
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
  }

  postGrv(record: GrvRecord): Observable<GrvRecord> {
    const posted: GrvRecord = { ...record, status: 'posted', createdAt: new Date().toISOString() };
    this.grvSubject.next([posted, ...this.grvSubject.value]);
    return of(posted).pipe(delay(700));
  }
}
