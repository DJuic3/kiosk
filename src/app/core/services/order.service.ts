import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CartSummary } from '../models/cart.model';
import { DispenseResult, Order } from '../models/order.model';
import { PaymentIntent, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

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

  dispense(orderId: string): Observable<DispenseResult[]> {
    if (environment.useMockData) {
      return of([
        { slotCode: 'A1', productName: 'Item', status: 'success' as const },
      ]).pipe(delay(2000));
    }

    return this.http
      .post<ApiResponse<DispenseResult[]>>(
        `${environment.edgeApiUrl}/dispense`,
        { orderId },
      )
      .pipe(map((res) => res.data));
  }

  dispenseOrder(order: Order): Observable<DispenseResult[]> {
    if (environment.useMockData) {
      const results: DispenseResult[] = order.lines.flatMap((line) =>
        Array.from({ length: line.quantity }, () => ({
          slotCode: line.product.slotCode,
          productName: line.product.name,
          status: 'success' as const,
        })),
      );
      return of(results).pipe(delay(2500));
    }

    return this.dispense(order.id);
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
