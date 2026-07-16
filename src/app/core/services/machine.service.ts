import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { MachineHealth, MachineInfo } from '../models/machine.model';
import { PaymentMethodInfo } from '../models/payment.model';

const MOCK_MACHINE: MachineInfo = {
  id: environment.machineId,
  name: 'Shop Kiosk — Main Street',
  location: 'Harare CBD',
  status: 'online',
  supportedPayments: ['ecocash', 'card', 'qr'],
};

const MOCK_HEALTH: MachineHealth = {
  online: true,
  printerOk: true,
  dispenserOk: true,
  cashAcceptorOk: false,
  lastHeartbeat: new Date().toISOString(),
};

const MOCK_PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'ecocash',
    label: 'EcoCash',
    description: 'Pay with your mobile wallet',
    icon: '📲',
    enabled: true,
  },
  {
    id: 'qr',
    label: 'Scan to Pay',
    description: 'Scan QR with your banking app',
    icon: '📷',
    enabled: true,
  },
  {
    id: 'card',
    label: 'Card',
    description: 'Tap, chip or swipe',
    icon: '💳',
    enabled: true,
  },
  {
    id: 'cash',
    label: 'Cash',
    description: 'Insert notes — exact change only',
    icon: '💵',
    enabled: false,
  },
];

@Injectable({ providedIn: 'root' })
export class MachineService {
  private readonly http = inject(HttpClient);

  getMachineInfo(): Observable<MachineInfo> {
    if (environment.useMockData) {
      return of(MOCK_MACHINE).pipe(delay(100));
    }

    return this.http
      .get<ApiResponse<MachineInfo>>(`${environment.edgeApiUrl}/machine`)
      .pipe(map((res) => res.data));
  }

  getHealth(): Observable<MachineHealth> {
    if (environment.useMockData) {
      return of(MOCK_HEALTH).pipe(delay(100));
    }

    return this.http
      .get<ApiResponse<MachineHealth>>(`${environment.edgeApiUrl}/machine/health`)
      .pipe(map((res) => res.data));
  }

  getPaymentMethods(): Observable<PaymentMethodInfo[]> {
    if (environment.useMockData) {
      return of(MOCK_PAYMENT_METHODS.filter((m) => m.enabled)).pipe(delay(100));
    }

    return this.http
      .get<ApiResponse<PaymentMethodInfo[]>>(
        `${environment.edgeApiUrl}/machine/payment-methods`,
      )
      .pipe(map((res) => res.data.filter((m) => m.enabled)));
  }
}
