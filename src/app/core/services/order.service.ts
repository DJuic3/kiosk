import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CartSummary } from '../models/cart.model';
import { CreditNote, DispenseResult, FiscalReceipt, Order } from '../models/order.model';
import { PaymentIntent, PaymentMethod } from '../models/payment.model';
import { MachineControlService } from './machine-control.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly machineControl = inject(MachineControlService);
  private failOnceForDemo = true;

  createOrder(cart: CartSummary): Observable<Order> {
    const payload = {
      machineId: environment.machineId,
      lines: cart.lines.map((line) => ({
        productId: line.product.id,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        slotCode: line.product.slotCode,
      })),
      total: cart.total,
      currency: cart.currency,
    };

    if (environment.useMockData) {
      const order: Order = {
        id: `ORD-${Date.now()}`,
        machineId: environment.machineId,
        lines: cart.lines,
        total: cart.total,
        currency: cart.currency,
        status: 'reserved',
        createdAt: new Date().toISOString(),
        receiptNumber: `RCP-${Math.floor(10000 + Math.random() * 89999)}`,
      };
      return of(order).pipe(delay(400));
    }

    return this.http
      .post<ApiResponse<Order>>(`${environment.apiBaseUrl}/orders`, payload)
      .pipe(map((res) => res.data));
  }

  initiatePayment(orderId: string, method: PaymentMethod, amount: number): Observable<PaymentIntent> {
    if (environment.useMockData) {
      const intent: PaymentIntent = {
        id: `PAY-${Date.now()}`,
        orderId,
        method,
        amount,
        currency: 'USD',
        status: 'processing',
        reference: `REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
        instructions: this.getPaymentInstructions(method),
      };
      return of(intent).pipe(delay(600));
    }

    return this.http
      .post<ApiResponse<PaymentIntent>>(`${environment.apiBaseUrl}/orders/${orderId}/payment`, {
        method,
        amount,
      })
      .pipe(map((res) => res.data));
  }

  confirmPayment(intentId: string): Observable<PaymentIntent> {
    if (environment.useMockData) {
      const intent: PaymentIntent = {
        id: intentId,
        orderId: '',
        method: 'ecocash',
        amount: 0,
        currency: 'USD',
        status: 'confirmed',
        reference: intentId,
        expiresAt: new Date().toISOString(),
      };
      return of(intent).pipe(delay(1500));
    }

    return this.http
      .post<ApiResponse<PaymentIntent>>(
        `${environment.apiBaseUrl}/payments/${intentId}/confirm`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  /** Fiscalise order immediately after payment — before any dispense. */
  fiscaliseOrder(order: Order): Observable<Order> {
    if (environment.useMockData) {
      const fiscal: FiscalReceipt = {
        fiscalNumber: `FD-${Math.floor(1e8 + Math.random() * 9e8)}`,
        issuedAt: new Date().toISOString(),
        provider: 'ZIMRA Virtual Fiscal Gateway (demo)',
        qrPayload: `ZIMRA|${order.id}|${order.total}|${order.currency}`,
      };
      return of({
        ...order,
        status: 'fiscalised' as const,
        receiptNumber: order.receiptNumber ?? `RCP-${Date.now()}`,
        fiscalReceipt: fiscal,
      }).pipe(delay(900));
    }

    return this.http
      .post<ApiResponse<Order>>(`${environment.apiBaseUrl}/orders/${order.id}/fiscalise`, {})
      .pipe(map((res) => res.data));
  }

  /**
   * Dispense with camera/sensor verification.
   * Demo: first attempt fails the last unit once, then retries succeed.
   */
  dispenseOrder(order: Order, attempt = 1): Observable<DispenseResult[]> {
    if (environment.useMqttDispense) {
      return this.machineControl.dispenseOrder(order, attempt);
    }

    if (environment.useMockData) {
      return this.mockDispenseOrder(order, attempt);
    }

    return this.http
      .post<ApiResponse<DispenseResult[]>>(`${environment.edgeApiUrl}/dispense`, {
        orderId: order.id,
        attempt,
      })
      .pipe(map((res) => res.data));
  }

  private mockDispenseOrder(order: Order, attempt = 1): Observable<DispenseResult[]> {
      const units = order.lines.flatMap((line) =>
        Array.from({ length: line.quantity }, () => ({
          slotCode: line.product.slotCode,
          productName: line.product.name,
        })),
      );

      const shouldFailDemo = this.failOnceForDemo && attempt === 1 && units.length > 0;
      if (shouldFailDemo) {
        this.failOnceForDemo = false;
      }

      const results: DispenseResult[] = units.map((unit, index) => {
        const failThis = shouldFailDemo && index === units.length - 1;
        return {
          ...unit,
          attempts: attempt,
          status: failThis ? ('failed' as const) : ('success' as const),
          message: failThis
            ? 'Camera: empty tray — product did not drop'
            : 'Camera: product detected in tray',
        };
      });

      return of(results).pipe(delay(attempt === 1 ? 2200 : 1800));
  }

  createCreditNote(order: Order, reason: string, amount?: number): Observable<CreditNote> {
    const note: CreditNote = {
      id: `CN-${Date.now()}`,
      orderId: order.id,
      receiptNumber: order.receiptNumber ?? order.id,
      amount: amount ?? order.total,
      currency: order.currency,
      reason,
      status: 'refunded',
      createdAt: new Date().toISOString(),
    };
    return of(note).pipe(delay(800));
  }

  completeOrder(orderId: string): Observable<Order> {
    if (environment.useMockData) {
      return of({
        id: orderId,
        machineId: environment.machineId,
        lines: [],
        total: 0,
        currency: 'USD',
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        receiptNumber: `RCP-${Date.now()}`,
      }).pipe(delay(300));
    }

    return this.http
      .post<ApiResponse<Order>>(`${environment.apiBaseUrl}/orders/${orderId}/complete`, {})
      .pipe(map((res) => res.data));
  }

  private getPaymentInstructions(method: PaymentMethod): string {
    switch (method) {
      case 'ecocash':
        return 'Enter your EcoCash number and approve the payment on your phone.';
      case 'qr':
        return 'Scan the QR code with your banking or wallet app.';
      case 'card':
        return 'Present your card to the terminal below the screen.';
      case 'cash':
        return 'Insert notes into the acceptor. Exact amount only.';
      default:
        return 'Follow the on-screen instructions.';
    }
  }
}
