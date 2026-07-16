import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';
import { PaymentIntent } from '../models/payment.model';

export type KioskStep =
  | 'idle'
  | 'browse'
  | 'cart'
  | 'checkout'
  | 'payment'
  | 'dispensing'
  | 'collect';

/** Steps that should not idle-timeout mid-transaction */
const PROTECTED_STEPS: KioskStep[] = ['payment', 'dispensing', 'collect'];

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _activeOrder = signal<Order | null>(null);
  private readonly _paymentIntent = signal<PaymentIntent | null>(null);
  private readonly _step = signal<KioskStep>('idle');
  private readonly sessionEnded$ = new Subject<void>();
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  readonly activeOrder = this._activeOrder.asReadonly();
  readonly paymentIntent = this._paymentIntent.asReadonly();
  readonly step = this._step.asReadonly();
  readonly onSessionEnded = this.sessionEnded$.asObservable();

  startSession(): void {
    this._step.set('browse');
    this.resetTimeout();
  }

  setStep(step: KioskStep): void {
    this._step.set(step);
    if (step === 'idle' || PROTECTED_STEPS.includes(step)) {
      this.clearTimeout();
    } else {
      this.resetTimeout();
    }
  }

  setOrder(order: Order): void {
    this._activeOrder.set(order);
  }

  setPaymentIntent(intent: PaymentIntent): void {
    this._paymentIntent.set(intent);
  }

  /** Call on any user touch/click during an active session */
  touch(): void {
    if (this._step() !== 'idle' && !PROTECTED_STEPS.includes(this._step())) {
      this.resetTimeout();
    }
  }

  endSession(): void {
    const wasActive = this._step() !== 'idle';
    this._activeOrder.set(null);
    this._paymentIntent.set(null);
    this._step.set('idle');
    this.clearTimeout();
    if (wasActive) {
      this.sessionEnded$.next();
    }
  }

  resetTimeout(timeoutMs = environment.sessionTimeoutSeconds * 1000): void {
    this.clearTimeout();
    if (PROTECTED_STEPS.includes(this._step())) {
      return;
    }
    this.timeoutHandle = setTimeout(() => this.endSession(), timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}
