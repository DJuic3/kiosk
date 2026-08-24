import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, map, switchMap } from 'rxjs';
import { MOCK_PRODUCTS } from '../data/mock-catalog';
import {
  AdminDashboardAnalytics,
  AdminFinanceSnapshot,
  AdminHistoryEvent,
  AdminInventoryItem,
  AdminKiosk,
  AdminMalfunction,
  AdminSale,
  AdminSecurityEvent,
  AdminSystemUser,
  InventoryActivityEvent,
} from '../models/admin.model';
import { environment } from '../../../environments/environment';

export type AdminSaleInput = Omit<AdminSale, 'id' | 'total'> & { id?: string };
export type AdminInventoryInput = Omit<AdminInventoryItem, 'status'>;
export type AdminUserInput = Omit<AdminSystemUser, 'id' | 'createdAt'> & { id?: string };

interface KioskRuntimeState {
  sales: AdminSale[];
  inventory: AdminInventoryItem[];
}

function deriveInventoryStatus(
  stock: number,
  parLevel: number,
): AdminInventoryItem['status'] {
  if (stock <= 0) return 'out';
  if (stock <= parLevel) return 'low';
  return 'ok';
}

function activityForSku(sku: string, item?: AdminInventoryItem): InventoryActivityEvent[] {
  const name = item?.name ?? 'Product';
  const slot = item?.slotCode ?? '—';
  const price = item?.price ?? 0;
  const stock = item?.stock ?? 0;
  const baseSku = sku.replace(/-[A-Z]\d+$/, '');

  if (baseSku === 'GAD-ADAPTER-01') {
    return [
      {
        id: `${sku}-a12`,
        sku,
        type: 'sale',
        at: '2026-08-16T13:42:00',
        summary: `Sold 1 × ${name}`,
        detail: 'EcoCash · completed · coil B4 dispensed OK',
        qtyDelta: -1,
        stockAfter: stock,
        amount: price,
        reference: 'RCP-90211',
        actor: 'Kiosk customer',
      },
      {
        id: `${sku}-a11`,
        sku,
        type: 'sale',
        at: '2026-08-16T11:18:00',
        summary: `Sold 1 × ${name}`,
        detail: 'Card · completed',
        qtyDelta: -1,
        stockAfter: stock + 1,
        amount: price,
        reference: 'RCP-90188',
        actor: 'Kiosk customer',
      },
      {
        id: `${sku}-a10`,
        sku,
        type: 'adjustment',
        at: '2026-08-16T09:04:00',
        summary: 'Cycle-count variance',
        detail: `Slot ${slot} counted short vs expected on-hand. Written off as shrinkage.`,
        qtyDelta: -1,
        stockAfter: stock + 2,
        amount: null,
        reference: 'ADJ-4418',
        actor: 'Attendant T. Moyo',
      },
      {
        id: `${sku}-a09`,
        sku,
        type: 'fault',
        at: '2026-08-15T18:22:00',
        summary: 'Jam cleared — unit returned to coil',
        detail: 'Motor stall on slot B4. Attendant cleared jam; product not taken.',
        qtyDelta: 1,
        stockAfter: stock + 3,
        amount: null,
        reference: 'FLT-2291',
        actor: 'Attendant T. Moyo',
      },
      {
        id: `${sku}-a08`,
        sku,
        type: 'refund',
        at: '2026-08-15T18:21:00',
        summary: 'Refund after failed dispense',
        detail: 'Partial sale reversed to card. Stock restored when jam was cleared.',
        qtyDelta: null,
        stockAfter: stock + 2,
        amount: price,
        reference: 'RCP-90140',
        actor: 'System',
      },
      {
        id: `${sku}-a07`,
        sku,
        type: 'sale',
        at: '2026-08-15T18:20:00',
        summary: `Sale attempt — 1 × ${name}`,
        detail: 'Card authorised, then coil jam. Marked partial.',
        qtyDelta: -1,
        stockAfter: stock + 2,
        amount: price,
        reference: 'RCP-90140',
        actor: 'Kiosk customer',
      },
      {
        id: `${sku}-a06`,
        sku,
        type: 'sale',
        at: '2026-08-15T14:05:00',
        summary: `Sold 1 × ${name}`,
        detail: 'QR / Scan to Pay · completed',
        qtyDelta: -1,
        stockAfter: stock + 3,
        amount: price,
        reference: 'RCP-90112',
        actor: 'Kiosk customer',
      },
      {
        id: `${sku}-a05`,
        sku,
        type: 'restock',
        at: '2026-08-15T08:10:00',
        summary: 'GRV restock +8',
        detail: 'Warehouse Harare CBD · GRV accepted, 0 damaged.',
        qtyDelta: 8,
        stockAfter: stock + 4,
        amount: null,
        reference: 'GRV-4412',
        actor: 'Attendant N. Dube',
      },
      {
        id: `${sku}-a04`,
        sku,
        type: 'system',
        at: '2026-08-14T19:02:00',
        summary: 'Slot hit par level',
        detail: `On-hand fell to par. Refill recommended for ${slot}.`,
        qtyDelta: null,
        stockAfter: stock - 4 < 0 ? 1 : stock - 4,
        amount: null,
        reference: 'SYS-PAR',
        actor: 'Machine',
      },
      {
        id: `${sku}-a03`,
        sku,
        type: 'sale',
        at: '2026-08-14T16:48:00',
        summary: `Sold 2 × ${name}`,
        detail: 'EcoCash · completed · two consecutive vends',
        qtyDelta: -2,
        stockAfter: 2,
        amount: price * 2,
        reference: 'RCP-90077',
        actor: 'Kiosk customer',
      },
      {
        id: `${sku}-a02`,
        sku,
        type: 'price',
        at: '2026-08-14T12:11:00',
        summary: 'Price updated $5.50 → $6.00',
        detail: 'Admin price list sync. Tax-inclusive USD.',
        qtyDelta: null,
        stockAfter: 4,
        amount: 6,
        reference: 'PRC-118',
        actor: 'Admin R. Chikore',
      },
      {
        id: `${sku}-a01`,
        sku,
        type: 'adjustment',
        at: '2026-08-13T10:30:00',
        summary: 'Damaged unit written off',
        detail: 'Packaging crushed in coil. Removed from saleable stock.',
        qtyDelta: -1,
        stockAfter: 4,
        amount: 5.5,
        reference: 'ADJ-4388',
        actor: 'Attendant T. Moyo',
      },
      {
        id: `${sku}-a00`,
        sku,
        type: 'restock',
        at: '2026-08-12T07:55:00',
        summary: 'Opening GRV +12',
        detail: `Slot ${slot} loaded from tote GAD-12. Capacity set.`,
        qtyDelta: 12,
        stockAfter: 12,
        amount: null,
        reference: 'GRV-4390',
        actor: 'Attendant N. Dube',
      },
    ];
  }

  const seed = sku.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const sold = 1 + (seed % 3);
  return [
    {
      id: `${sku}-g4`,
      sku,
      type: 'sale',
      at: '2026-08-16T10:20:00',
      summary: `Sold ${sold} × ${name}`,
      detail: 'EcoCash · completed',
      qtyDelta: -sold,
      stockAfter: stock,
      amount: price * sold,
      reference: `RCP-${80000 + (seed % 999)}`,
      actor: 'Kiosk customer',
    },
    {
      id: `${sku}-g3`,
      sku,
      type: 'adjustment',
      at: '2026-08-15T15:40:00',
      summary: 'Manual stock correction',
      detail: `Attendant aligned on-hand to coil count for ${slot}.`,
      qtyDelta: seed % 2 === 0 ? -1 : 1,
      stockAfter: stock + sold,
      amount: null,
      reference: `ADJ-${4000 + (seed % 80)}`,
      actor: 'Attendant T. Moyo',
    },
    {
      id: `${sku}-g2`,
      sku,
      type: 'restock',
      at: '2026-08-14T08:05:00',
      summary: `GRV restock +${6 + (seed % 5)}`,
      detail: 'Warehouse refill · 0 damaged',
      qtyDelta: 6 + (seed % 5),
      stockAfter: Math.min(item?.capacity ?? 12, stock + sold + 6),
      amount: null,
      reference: `GRV-${4300 + (seed % 50)}`,
      actor: 'Attendant N. Dube',
    },
    {
      id: `${sku}-g1`,
      sku,
      type: 'price',
      at: '2026-08-12T11:00:00',
      summary: `Price set to $${price.toFixed(2)}`,
      detail: 'Catalogue sync',
      qtyDelta: null,
      stockAfter: null,
      amount: price,
      reference: `PRC-${100 + (seed % 40)}`,
      actor: 'Admin R. Chikore',
    },
  ];
}

function buildInventoryForKiosk(seed: number): AdminInventoryItem[] {
  const trays = ['A', 'B', 'C', 'D', 'E', 'F'];
  const columns = 8;
  const items: AdminInventoryItem[] = [];

  for (const tray of trays) {
    for (let col = 1; col <= columns; col++) {
      const index = items.length;
      const product = MOCK_PRODUCTS[index % MOCK_PRODUCTS.length];
      const slotCode = `${tray}${col}`;
      const sku = index < MOCK_PRODUCTS.length ? product.sku : `${product.sku}-${slotCode}`;
      const capacity = 8 + ((seed + index) % 13);
      const parLevel = Math.max(1, Math.ceil(capacity * 0.25));
      let stock = Math.max(
        0,
        Math.min(capacity, product.stockAvailable + ((seed + index) % 7) - 3),
      );
      if ((index + seed) % 11 === 0) {
        stock = 0;
      } else if ((index + seed) % 7 === 0) {
        stock = Math.min(stock, parLevel);
      }
      items.push({
        sku,
        name: product.name,
        category: product.category,
        slotCode,
        price: product.price,
        stock,
        capacity,
        parLevel,
        imageUrl: product.imageUrl,
        status: deriveInventoryStatus(stock, parLevel),
      });
    }
  }

  return items;
}

function buildSalesForKiosk(kioskId: string, seed: number): AdminSale[] {
  const prefix = kioskId.replace(/\D/g, '').slice(-2) || '00';
  return INITIAL_SALES.map((sale, i) => ({
    ...sale,
    id: `S-${prefix}${1001 + i}`,
    receiptNumber: `RCP-${prefix}${88421 + i}`,
    quantity: Math.max(1, sale.quantity + ((seed + i) % 2)),
    total: Number(
      (Math.max(1, sale.quantity + ((seed + i) % 2)) * sale.unitPrice).toFixed(2),
    ),
    status: i === (seed % INITIAL_SALES.length) ? 'partial' : sale.status,
  }));
}

function buildStateForKiosk(kiosk: AdminKiosk, index: number): KioskRuntimeState {
  return {
    sales: buildSalesForKiosk(kiosk.id, index),
    inventory: buildInventoryForKiosk(index + 1),
  };
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly selectedKioskId = new BehaviorSubject<string>(
    MOCK_KIOSKS.find((k) => k.id === environment.machineId)?.id ?? MOCK_KIOSKS[0].id,
  );

  private readonly states = new Map<string, KioskRuntimeState>(
    MOCK_KIOSKS.map((kiosk, index) => [kiosk.id, buildStateForKiosk(kiosk, index)]),
  );

  private readonly salesSubject = new BehaviorSubject<AdminSale[]>(
    this.currentState().sales,
  );
  readonly sales$ = this.salesSubject.asObservable();

  private readonly inventorySubject = new BehaviorSubject<AdminInventoryItem[]>(
    this.currentState().inventory,
  );
  readonly inventory$ = this.inventorySubject.asObservable();

  private readonly usersSubject = new BehaviorSubject<AdminSystemUser[]>([...INITIAL_USERS]);
  readonly users$ = this.usersSubject.asObservable();

  getKiosks(): Observable<AdminKiosk[]> {
    return of(MOCK_KIOSKS);
  }

  getSelectedKioskId(): Observable<string> {
    return this.selectedKioskId.asObservable();
  }

  getSelectedKiosk(): Observable<AdminKiosk> {
    return this.selectedKioskId.pipe(
      map((id) => MOCK_KIOSKS.find((k) => k.id === id) ?? MOCK_KIOSKS[0]),
    );
  }

  selectKiosk(kioskId: string): void {
    if (!this.states.has(kioskId) || this.selectedKioskId.value === kioskId) {
      return;
    }
    this.selectedKioskId.next(kioskId);
    const state = this.states.get(kioskId)!;
    this.salesSubject.next(state.sales);
    this.inventorySubject.next(state.inventory);
  }

  getSales(): Observable<AdminSale[]> {
    return this.sales$;
  }

  getSaleById(id: string): Observable<AdminSale | undefined> {
    return this.sales$.pipe(map((sales) => sales.find((s) => s.id === id)));
  }

  createSale(input: AdminSaleInput): Observable<AdminSale> {
    const sale: AdminSale = {
      id: `S-${Date.now()}`,
      receiptNumber: input.receiptNumber,
      productName: input.productName,
      sku: input.sku,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      total: Number((input.quantity * input.unitPrice).toFixed(2)),
      paymentMethod: input.paymentMethod,
      soldAt: input.soldAt,
      status: input.status,
    };
    this.patchCurrentState((state) => {
      state.sales = [sale, ...state.sales];
    });
    return of(sale).pipe(delay(120));
  }

  updateSale(id: string, input: AdminSaleInput): Observable<AdminSale | null> {
    const current = this.currentState().sales;
    const index = current.findIndex((s) => s.id === id);
    if (index < 0) {
      return of(null);
    }

    const updated: AdminSale = {
      ...current[index],
      ...input,
      id,
      total: Number((input.quantity * input.unitPrice).toFixed(2)),
    };
    this.patchCurrentState((state) => {
      const next = [...state.sales];
      next[index] = updated;
      state.sales = next;
    });
    return of(updated).pipe(delay(120));
  }

  /** Sales are immutable records — never removed. Use status `voided` instead. */
  deleteSale(_id: string): Observable<boolean> {
    return of(false);
  }

  getInventory(): Observable<AdminInventoryItem[]> {
    return this.inventory$;
  }

  getInventoryActivity(sku: string): Observable<InventoryActivityEvent[]> {
    return this.selectedKioskId.pipe(
      switchMap((id) => {
        const item = this.states.get(id)?.inventory.find((row) => row.sku === sku);
        return of(activityForSku(sku, item)).pipe(delay(80));
      }),
    );
  }

  createInventoryItem(input: AdminInventoryInput): Observable<AdminInventoryItem | null> {
    if (this.currentState().inventory.some((i) => i.sku === input.sku)) {
      return of(null);
    }
    const item: AdminInventoryItem = {
      ...input,
      status: deriveInventoryStatus(input.stock, input.parLevel),
    };
    this.patchCurrentState((state) => {
      state.inventory = [...state.inventory, item].sort((a, b) =>
        a.slotCode.localeCompare(b.slotCode),
      );
    });
    return of(item).pipe(delay(120));
  }

  updateInventoryItem(
    sku: string,
    input: AdminInventoryInput,
  ): Observable<AdminInventoryItem | null> {
    const current = this.currentState().inventory;
    const index = current.findIndex((i) => i.sku === sku);
    if (index < 0) {
      return of(null);
    }

    if (input.sku !== sku && current.some((i) => i.sku === input.sku)) {
      return of(null);
    }

    const updated: AdminInventoryItem = {
      ...input,
      status: deriveInventoryStatus(input.stock, input.parLevel),
    };
    this.patchCurrentState((state) => {
      const next = [...state.inventory];
      next[index] = updated;
      state.inventory = next.sort((a, b) => a.slotCode.localeCompare(b.slotCode));
    });
    return of(updated).pipe(delay(120));
  }

  deleteInventoryItem(sku: string): Observable<boolean> {
    const before = this.currentState().inventory.length;
    this.patchCurrentState((state) => {
      state.inventory = state.inventory.filter((i) => i.sku !== sku);
    });
    return of(this.currentState().inventory.length !== before).pipe(delay(80));
  }

  getMalfunctions(): Observable<AdminMalfunction[]> {
    return this.selectedKioskId.pipe(
      switchMap((id) => of(malfunctionsFor(id)).pipe(delay(150))),
    );
  }

  getSecurityEvents(): Observable<AdminSecurityEvent[]> {
    return this.selectedKioskId.pipe(
      switchMap((id) => of(securityFor(id)).pipe(delay(150))),
    );
  }

  getHistory(): Observable<AdminHistoryEvent[]> {
    return this.selectedKioskId.pipe(
      switchMap((id) => of(historyFor(id)).pipe(delay(150))),
    );
  }

  getSummary() {
    return this.selectedKioskId.pipe(
      switchMap((id) => {
        const kiosk = MOCK_KIOSKS.find((k) => k.id === id) ?? MOCK_KIOSKS[0];
        const inventory = this.states.get(id)?.inventory ?? [];
        const sales = this.states.get(id)?.sales ?? [];
        const completed = sales.filter((s) => s.status === 'completed');
        return of({
          machineId: kiosk.id,
          location: kiosk.location,
          salesToday: completed.length,
          revenueToday: Number(
            completed.reduce((sum, s) => sum + s.total, 0).toFixed(2),
          ),
          lowStockItems: inventory.filter((i) => i.status === 'low' || i.status === 'out')
            .length,
          openFaults: malfunctionsFor(id).filter((f) => f.status !== 'resolved').length,
          openSecurity: securityFor(id).filter((s) => s.status === 'open').length,
          currency: 'USD',
        }).pipe(delay(100));
      }),
    );
  }

  getDashboardAnalytics(): Observable<AdminDashboardAnalytics> {
    return this.selectedKioskId.pipe(
      switchMap((id) => of(dashboardFor(id)).pipe(delay(120))),
    );
  }

  getFinance(): Observable<AdminFinanceSnapshot> {
    return this.selectedKioskId.pipe(
      switchMap((id) => {
        const sales = this.states.get(id)?.sales ?? [];
        return of(financeFor(id, sales)).pipe(delay(120));
      }),
    );
  }

  getUsers(): Observable<AdminSystemUser[]> {
    return this.users$;
  }

  createUser(input: AdminUserInput): Observable<AdminSystemUser | null> {
    if (this.usersSubject.value.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      return of(null);
    }
    const user: AdminSystemUser = {
      id: `U-${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      department: input.department.trim(),
      status: input.status,
      kioskAccess: [...input.kioskAccess],
      lastLoginAt: input.lastLoginAt,
      createdAt: new Date().toISOString(),
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
    this.usersSubject.next([user, ...this.usersSubject.value]);
    return of(user).pipe(delay(120));
  }

  updateUser(id: string, input: AdminUserInput): Observable<AdminSystemUser | null> {
    const current = this.usersSubject.value;
    const index = current.findIndex((u) => u.id === id);
    if (index < 0) {
      return of(null);
    }
    if (
      current.some(
        (u) => u.id !== id && u.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
    ) {
      return of(null);
    }
    const updated: AdminSystemUser = {
      ...current[index],
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      department: input.department.trim(),
      status: input.status,
      kioskAccess: [...input.kioskAccess],
      lastLoginAt: input.lastLoginAt,
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
    const next = [...current];
    next[index] = updated;
    this.usersSubject.next(next);
    return of(updated).pipe(delay(120));
  }

  deleteUser(id: string): Observable<boolean> {
    const next = this.usersSubject.value.filter((u) => u.id !== id);
    const changed = next.length !== this.usersSubject.value.length;
    if (changed) {
      this.usersSubject.next(next);
    }
    return of(changed).pipe(delay(80));
  }

  private currentState(): KioskRuntimeState {
    return this.states.get(this.selectedKioskId.value)!;
  }

  private patchCurrentState(mutate: (state: KioskRuntimeState) => void): void {
    const state = this.currentState();
    mutate(state);
    this.salesSubject.next(state.sales);
    this.inventorySubject.next(state.inventory);
  }
}

export const MOCK_KIOSKS: AdminKiosk[] = [
  {
    id: 'KIOSK-001',
    name: 'CBD Flagship',
    location: 'Harare CBD',
    status: 'online',
  },
  {
    id: 'KIOSK-002',
    name: 'Airport Terminal',
    location: 'R.G. Mugabe Airport',
    status: 'online',
  },
  {
    id: 'KIOSK-003',
    name: 'Sam Levy Village',
    location: 'Borrowdale',
    status: 'online',
  },
  {
    id: 'KIOSK-004',
    name: 'Eastgate Mall',
    location: 'Harare East',
    status: 'maintenance',
  },
  {
    id: 'KIOSK-005',
    name: 'Bulawayo Centre',
    location: 'Bulawayo CBD',
    status: 'online',
  },
];

function malfunctionsFor(kioskId: string): AdminMalfunction[] {
  if (kioskId === 'KIOSK-004') {
    return [
      {
        id: 'F-401',
        type: 'Scheduled maintenance',
        severity: 'medium',
        message: 'Machine offline for planned tray calibration.',
        reportedAt: '2026-07-16T06:00:00',
        status: 'investigating',
      },
      ...MOCK_MALFUNCTIONS.slice(1, 3),
    ];
  }
  if (kioskId === 'KIOSK-002') {
    return [
      {
        id: 'F-221',
        type: 'Network latency',
        severity: 'low',
        message: 'Edge bridge latency above 800ms during peak boarding.',
        reportedAt: '2026-07-16T09:20:00',
        status: 'open',
      },
      ...MOCK_MALFUNCTIONS.slice(0, 2),
    ];
  }
  return MOCK_MALFUNCTIONS.map((f) => ({ ...f, id: `${f.id}-${kioskId.slice(-1)}` }));
}

function securityFor(kioskId: string): AdminSecurityEvent[] {
  if (kioskId === 'KIOSK-005') {
    return MOCK_SECURITY.filter((s) => s.severity !== 'critical');
  }
  return MOCK_SECURITY.map((s) => ({ ...s, id: `${s.id}-${kioskId.slice(-1)}` }));
}

function historyFor(kioskId: string): AdminHistoryEvent[] {
  const kiosk = MOCK_KIOSKS.find((k) => k.id === kioskId);
  return [
    {
      id: `H-0-${kioskId}`,
      category: 'system',
      summary: `Context loaded — ${kiosk?.name ?? kioskId}`,
      detail: `${kioskId} · ${kiosk?.location ?? ''}`,
      at: new Date().toISOString(),
    },
    ...MOCK_HISTORY.map((h) => ({ ...h, id: `${h.id}-${kioskId.slice(-1)}` })),
  ];
}

function dashboardFor(kioskId: string): AdminDashboardAnalytics {
  const kiosk = MOCK_KIOSKS.find((k) => k.id === kioskId) ?? MOCK_KIOSKS[0];
  const seed = Number(kioskId.replace(/\D/g, '').slice(-1) || '1');
  const salesToday = 18 + seed * 3;
  const revenue = Number((140 + seed * 22.5).toFixed(2));
  const lowStock = 2 + (seed % 3);
  const openFaults = kiosk.status === 'maintenance' ? 3 : 1 + (seed % 2);

  return {
    ...MOCK_DASHBOARD,
    machineId: kiosk.id,
    location: kiosk.location,
    generatedAt: new Date().toISOString(),
    kpis: [
      {
        label: 'Sales today',
        value: String(salesToday),
        delta: seed % 2 === 0 ? '+18% vs yesterday' : '+6% vs yesterday',
        trend: 'up',
      },
      {
        label: 'Revenue today',
        value: `$${revenue.toFixed(2)}`,
        delta: '+12% vs yesterday',
        trend: 'up',
        tone: 'success',
      },
      {
        label: 'Avg basket',
        value: `$${(revenue / salesToday).toFixed(2)}`,
        delta: '+$0.40',
        trend: 'up',
      },
      {
        label: 'Conversion',
        value: `${55 + seed}%`,
        delta: 'Browse → pay',
        trend: 'flat',
      },
      {
        label: 'Low stock',
        value: String(lowStock),
        delta: 'Needs refill',
        trend: 'down',
        tone: 'warn',
      },
      {
        label: 'Open faults',
        value: String(openFaults),
        delta: kiosk.status === 'maintenance' ? 'In maintenance' : '1 high severity',
        trend: 'down',
        tone: 'danger',
      },
      {
        label: 'Security alerts',
        value: String(seed === 5 ? 0 : 1),
        delta: seed === 5 ? 'Clear' : 'Tamper open',
        trend: seed === 5 ? 'up' : 'down',
        tone: seed === 5 ? 'success' : 'danger',
      },
      {
        label: 'Uptime (7d)',
        value: kiosk.status === 'maintenance' ? '91.0%' : `${(98.5 + seed * 0.1).toFixed(1)}%`,
        delta: kiosk.status === 'maintenance' ? 'Maintenance window' : 'Stable',
        trend: kiosk.status === 'maintenance' ? 'down' : 'up',
        tone: kiosk.status === 'maintenance' ? 'warn' : 'success',
      },
    ],
    hourlySales: MOCK_DASHBOARD.hourlySales.map((p, i) => ({
      ...p,
      value: Math.max(0, p.value + ((seed + i) % 3) - 1),
    })),
    weeklyRevenue: MOCK_DASHBOARD.weeklyRevenue.map((p, i) => ({
      ...p,
      value: Number((p.value * (0.85 + seed * 0.04) + i).toFixed(1)),
    })),
    alerts:
      kiosk.status === 'maintenance'
        ? [
            { level: 'warn' as const, text: `${kiosk.name} is in maintenance — trading paused.` },
            ...MOCK_DASHBOARD.alerts.slice(1),
          ]
        : MOCK_DASHBOARD.alerts.map((a) => ({
            ...a,
            text: a.text.replace('this machine', kiosk.name),
          })),
    health: {
      ...MOCK_DASHBOARD.health,
      uptimePercent: kiosk.status === 'maintenance' ? 91 : Number((98.5 + seed * 0.1).toFixed(1)),
    },
  };
}

function financeFor(kioskId: string, sales: AdminSale[]): AdminFinanceSnapshot {
  const kiosk = MOCK_KIOSKS.find((k) => k.id === kioskId) ?? MOCK_KIOSKS[0];
  const seed = Number(kioskId.replace(/\D/g, '').slice(-1) || '1');
  const completed = sales.filter((s) => s.status === 'completed');
  const voided = sales.filter((s) => s.status === 'voided' || s.status === 'partial');

  const grossFromSales = completed.reduce((sum, s) => sum + s.total, 0);
  const refundsFromSales = voided.reduce((sum, s) => sum + s.total * 0.6, 0);
  const grossRevenue = Number((grossFromSales + 120 + seed * 28).toFixed(2));
  const refundsVoids = Number((refundsFromSales + 4 + seed).toFixed(2));
  const paymentFees = Number((grossRevenue * 0.018 + seed * 0.4).toFixed(2));
  const taxCollected = Number((grossRevenue * 0.15).toFixed(2));
  const netRevenue = Number((grossRevenue - refundsVoids - paymentFees).toFixed(2));
  const pendingSettlements = Number((18 + seed * 4.5).toFixed(2));
  const settledToDate = Number((netRevenue - pendingSettlements - taxCollected * 0.2).toFixed(2));
  const cashOnHand = Number((12 + seed * 3.25).toFixed(2));

  const ecocash = Number((grossRevenue * 0.46).toFixed(2));
  const card = Number((grossRevenue * 0.33).toFixed(2));
  const qr = Number((grossRevenue * 0.21).toFixed(2));

  return {
    machineId: kiosk.id,
    location: kiosk.location,
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    periodLabel: `Today · ${new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    summary: {
      grossRevenue,
      refundsVoids,
      paymentFees,
      taxCollected,
      netRevenue,
      cashOnHand,
      pendingSettlements,
      settledToDate,
    },
    accounts: [
      {
        id: `ACC-ECO-${seed}`,
        name: 'EcoCash settlement',
        type: 'settlement',
        provider: 'EcoCash',
        balance: Number((ecocash * 0.72).toFixed(2)),
        pending: Number((ecocash * 0.18).toFixed(2)),
        currency: 'USD',
        lastMovementAt: '2026-07-16T12:40:00',
        status: 'healthy',
      },
      {
        id: `ACC-CARD-${seed}`,
        name: 'Card acquiring',
        type: 'clearing',
        provider: 'Visa / Mastercard',
        balance: Number((card * 0.55).toFixed(2)),
        pending: Number((card * 0.3).toFixed(2)),
        currency: 'USD',
        lastMovementAt: '2026-07-16T11:15:00',
        status: seed === 4 ? 'attention' : 'healthy',
      },
      {
        id: `ACC-QR-${seed}`,
        name: 'QR / Scan to Pay',
        type: 'settlement',
        provider: 'Econet Pay',
        balance: Number((qr * 0.8).toFixed(2)),
        pending: Number((qr * 0.12).toFixed(2)),
        currency: 'USD',
        lastMovementAt: '2026-07-16T13:02:00',
        status: 'healthy',
      },
      {
        id: `ACC-CASH-${seed}`,
        name: 'Cash float',
        type: 'cash',
        provider: 'On-machine',
        balance: cashOnHand,
        pending: 0,
        currency: 'USD',
        lastMovementAt: '2026-07-16T08:00:00',
        status: cashOnHand > 25 ? 'attention' : 'healthy',
      },
      {
        id: `ACC-FEE-${seed}`,
        name: 'Payment fees payable',
        type: 'fee',
        provider: 'Acquirers',
        balance: -paymentFees,
        pending: 0,
        currency: 'USD',
        lastMovementAt: '2026-07-16T13:00:00',
        status: 'healthy',
      },
      {
        id: `ACC-VAT-${seed}`,
        name: 'VAT / tax collected',
        type: 'tax',
        provider: 'ZIMRA',
        balance: taxCollected,
        pending: Number((taxCollected * 0.15).toFixed(2)),
        currency: 'USD',
        lastMovementAt: '2026-07-16T13:00:00',
        status: 'healthy',
      },
    ],
    ledger: [
      {
        id: `L-${seed}-1`,
        at: '2026-07-16T13:01:00',
        type: 'sale',
        reference: completed[0]?.receiptNumber ?? 'RCP-00001',
        description: 'Retail sale posted',
        account: 'EcoCash settlement',
        debit: 0,
        credit: completed[0]?.total ?? 5,
        balanceAfter: Number((ecocash * 0.72).toFixed(2)),
        status: 'posted',
      },
      {
        id: `L-${seed}-2`,
        at: '2026-07-16T12:22:00',
        type: 'sale',
        reference: completed[1]?.receiptNumber ?? 'RCP-00002',
        description: 'Retail sale posted',
        account: 'QR / Scan to Pay',
        debit: 0,
        credit: completed[1]?.total ?? 4,
        balanceAfter: Number((qr * 0.8).toFixed(2)),
        status: 'posted',
      },
      {
        id: `L-${seed}-3`,
        at: '2026-07-16T11:47:00',
        type: 'void',
        reference: voided[0]?.receiptNumber ?? 'RCP-VOID',
        description: 'Sale voided — refund queued',
        account: 'EcoCash settlement',
        debit: voided[0]?.total ?? 3,
        credit: 0,
        balanceAfter: Number((ecocash * 0.7).toFixed(2)),
        status: 'pending',
      },
      {
        id: `L-${seed}-4`,
        at: '2026-07-16T10:30:00',
        type: 'fee',
        reference: `FEE-${kioskId}-0716`,
        description: 'Card scheme + acquiring fee',
        account: 'Payment fees payable',
        debit: Number((paymentFees * 0.4).toFixed(2)),
        credit: 0,
        balanceAfter: -paymentFees,
        status: 'posted',
      },
      {
        id: `L-${seed}-5`,
        at: '2026-07-16T09:00:00',
        type: 'settlement',
        reference: `SET-${kioskId}-A`,
        description: 'Overnight EcoCash batch settled',
        account: 'EcoCash settlement',
        debit: Number((42 + seed * 5).toFixed(2)),
        credit: 0,
        balanceAfter: Number((ecocash * 0.65).toFixed(2)),
        status: 'posted',
      },
      {
        id: `L-${seed}-6`,
        at: '2026-07-16T08:15:00',
        type: 'tax',
        reference: `VAT-${kioskId}-0715`,
        description: 'VAT recognised on prior day sales',
        account: 'VAT / tax collected',
        debit: 0,
        credit: Number((taxCollected * 0.2).toFixed(2)),
        balanceAfter: taxCollected,
        status: 'posted',
      },
      {
        id: `L-${seed}-7`,
        at: '2026-07-15T18:00:00',
        type: 'payout',
        reference: `PAY-${kioskId}-14`,
        description: 'Treasury sweep to operating account',
        account: 'Card acquiring',
        debit: Number((55 + seed * 8).toFixed(2)),
        credit: 0,
        balanceAfter: Number((card * 0.4).toFixed(2)),
        status: kiosk.status === 'maintenance' ? 'failed' : 'posted',
      },
      {
        id: `L-${seed}-8`,
        at: '2026-07-15T16:20:00',
        type: 'refund',
        reference: 'RCP-88390',
        description: 'Customer refund — failed dispense',
        account: 'Card acquiring',
        debit: 8.5,
        credit: 0,
        balanceAfter: Number((card * 0.38).toFixed(2)),
        status: 'posted',
      },
    ],
    settlements: [
      {
        id: `SET-${seed}-1`,
        periodLabel: '15 Jul overnight',
        channel: 'EcoCash',
        gross: Number((48 + seed * 6).toFixed(2)),
        fees: Number((0.9 + seed * 0.1).toFixed(2)),
        net: Number((47.1 + seed * 5.9).toFixed(2)),
        status: 'settled',
        settledAt: '2026-07-16T09:00:00',
      },
      {
        id: `SET-${seed}-2`,
        periodLabel: '16 Jul morning',
        channel: 'Card',
        gross: Number((36 + seed * 4).toFixed(2)),
        fees: Number((1.1 + seed * 0.15).toFixed(2)),
        net: Number((34.9 + seed * 3.85).toFixed(2)),
        status: 'in_transit',
        expectedAt: '2026-07-17T10:00:00',
      },
      {
        id: `SET-${seed}-3`,
        periodLabel: '16 Jul midday',
        channel: 'QR',
        gross: Number((22 + seed * 3).toFixed(2)),
        fees: Number((0.4 + seed * 0.05).toFixed(2)),
        net: Number((21.6 + seed * 2.95).toFixed(2)),
        status: 'scheduled',
        expectedAt: '2026-07-17T08:00:00',
      },
      {
        id: `SET-${seed}-4`,
        periodLabel: '14 Jul card batch',
        channel: 'Card',
        gross: Number((61 + seed * 2).toFixed(2)),
        fees: Number((1.8 + seed * 0.1).toFixed(2)),
        net: Number((59.2 + seed * 1.9).toFixed(2)),
        status: kiosk.status === 'maintenance' ? 'failed' : 'settled',
        settledAt: kiosk.status === 'maintenance' ? undefined : '2026-07-15T11:20:00',
      },
    ],
    reconciliation: [
      {
        date: '2026-07-16',
        salesCount: completed.length || 6 + seed,
        grossSales: Number((grossRevenue * 0.55).toFixed(2)),
        voidsRefunds: Number((refundsVoids * 0.4).toFixed(2)),
        fees: Number((paymentFees * 0.45).toFixed(2)),
        netRecognised: Number((grossRevenue * 0.55 - refundsVoids * 0.4 - paymentFees * 0.45).toFixed(2)),
        matched: true,
        variance: 0,
      },
      {
        date: '2026-07-15',
        salesCount: 22 + seed,
        grossSales: Number((168 + seed * 12).toFixed(2)),
        voidsRefunds: Number((6 + seed).toFixed(2)),
        fees: Number((3.1 + seed * 0.2).toFixed(2)),
        netRecognised: Number((158.9 + seed * 10.8).toFixed(2)),
        matched: true,
        variance: 0,
      },
      {
        date: '2026-07-14',
        salesCount: 19 + seed,
        grossSales: Number((142 + seed * 9).toFixed(2)),
        voidsRefunds: Number((2.5 + seed * 0.5).toFixed(2)),
        fees: Number((2.6 + seed * 0.15).toFixed(2)),
        netRecognised: Number((136.9 + seed * 8.35).toFixed(2)),
        matched: seed !== 4,
        variance: seed === 4 ? 1.25 : 0,
      },
      {
        date: '2026-07-13',
        salesCount: 17 + seed,
        grossSales: Number((131 + seed * 7).toFixed(2)),
        voidsRefunds: 1.5,
        fees: Number((2.2 + seed * 0.1).toFixed(2)),
        netRecognised: Number((127.3 + seed * 6.9).toFixed(2)),
        matched: true,
        variance: 0,
      },
    ],
    channelMix: [
      { label: 'EcoCash', value: ecocash, percent: 46, color: '#1a35a3' },
      { label: 'Card', value: card, percent: 33, color: '#e30613' },
      { label: 'QR', value: qr, percent: 21, color: '#4c6ef5' },
    ],
    alerts: [
      ...(kiosk.status === 'maintenance'
        ? [
            {
              level: 'warn' as const,
              text: `${kiosk.name} is in maintenance — settlements may delay.`,
            },
          ]
        : []),
      ...(pendingSettlements > 30
        ? [
            {
              level: 'warn' as const,
              text: `$${pendingSettlements.toFixed(2)} still in transit across payment rails.`,
            },
          ]
        : []),
      ...(seed === 4
        ? [
            {
              level: 'critical' as const,
              text: 'Card batch 14 Jul failed reconciliation — variance $1.25.',
            },
          ]
        : [
            {
              level: 'info' as const,
              text: 'Books balanced for yesterday — no open variances.',
            },
          ]),
      {
        level: 'info' as const,
        text: `VAT collected to date on this machine: $${taxCollected.toFixed(2)}.`,
      },
    ],
  };
}

const INITIAL_SALES: AdminSale[] = [
  {
    id: 'S-1001',
    receiptNumber: 'RCP-88421',
    productName: 'Econet Starter SIM',
    sku: 'SIM-ECONET-01',
    quantity: 1,
    unitPrice: 1,
    total: 1,
    paymentMethod: 'ecocash',
    soldAt: '2026-07-16T08:14:00',
    status: 'completed',
  },
  {
    id: 'S-1002',
    receiptNumber: 'RCP-88422',
    productName: 'USB-C Fast Charger',
    sku: 'GAD-USB-C-01',
    quantity: 1,
    unitPrice: 8.5,
    total: 8.5,
    paymentMethod: 'card',
    soldAt: '2026-07-16T09:02:00',
    status: 'completed',
  },
  {
    id: 'S-1003',
    receiptNumber: 'RCP-88423',
    productName: 'Power Bank 10,000mAh',
    sku: 'GAD-PB-01',
    quantity: 1,
    unitPrice: 15,
    total: 15,
    paymentMethod: 'qr',
    soldAt: '2026-07-16T09:41:00',
    status: 'completed',
  },
  {
    id: 'S-1004',
    receiptNumber: 'RCP-88424',
    productName: '$5 Airtime Voucher',
    sku: 'VCH-AIR-5',
    quantity: 2,
    unitPrice: 5,
    total: 10,
    paymentMethod: 'ecocash',
    soldAt: '2026-07-16T10:18:00',
    status: 'completed',
  },
  {
    id: 'S-1005',
    receiptNumber: 'RCP-88425',
    productName: 'Wired Earbuds',
    sku: 'ACC-EARBUD-01',
    quantity: 1,
    unitPrice: 3.5,
    total: 3.5,
    paymentMethod: 'card',
    soldAt: '2026-07-16T11:05:00',
    status: 'partial',
  },
  {
    id: 'S-1006',
    receiptNumber: 'RCP-88426',
    productName: '1GB Data Voucher',
    sku: 'VCH-DATA-1GB',
    quantity: 1,
    unitPrice: 3,
    total: 3,
    paymentMethod: 'ecocash',
    soldAt: '2026-07-16T11:47:00',
    status: 'voided',
  },
  {
    id: 'S-1007',
    receiptNumber: 'RCP-88427',
    productName: 'USB-C Cable 1m',
    sku: 'GAD-CABLE-01',
    quantity: 1,
    unitPrice: 4,
    total: 4,
    paymentMethod: 'qr',
    soldAt: '2026-07-16T12:22:00',
    status: 'completed',
  },
  {
    id: 'S-1008',
    receiptNumber: 'RCP-88428',
    productName: 'Universal Phone Case',
    sku: 'ACC-CASE-01',
    quantity: 1,
    unitPrice: 5,
    total: 5,
    paymentMethod: 'card',
    soldAt: '2026-07-16T13:01:00',
    status: 'completed',
  },
];

const MOCK_MALFUNCTIONS: AdminMalfunction[] = [
  {
    id: 'F-201',
    type: 'Dispense jam',
    severity: 'high',
    slotCode: 'B3',
    message: 'Power bank tray reported jam during dispense. Sensor did not confirm drop.',
    reportedAt: '2026-07-16T11:06:00',
    status: 'open',
  },
  {
    id: 'F-202',
    type: 'Printer low paper',
    severity: 'medium',
    message: 'Thermal printer paper below 15%. Machine may stop trading if empty.',
    reportedAt: '2026-07-16T07:40:00',
    status: 'investigating',
  },
  {
    id: 'F-203',
    type: 'Card terminal timeout',
    severity: 'medium',
    message: 'Payment terminal took longer than 30s to respond on two attempts.',
    reportedAt: '2026-07-15T18:22:00',
    status: 'resolved',
  },
  {
    id: 'F-204',
    type: 'Door sensor warning',
    severity: 'critical',
    message: 'Rear access door ajar detected while machine was online.',
    reportedAt: '2026-07-14T22:11:00',
    status: 'resolved',
  },
];

const MOCK_SECURITY: AdminSecurityEvent[] = [
  {
    id: 'SEC-11',
    type: 'Tamper alert',
    severity: 'critical',
    description: 'Enclosure tilt / vibration spike outside maintenance window.',
    reportedAt: '2026-07-16T02:14:00',
    source: 'Tamper sensor',
    status: 'open',
  },
  {
    id: 'SEC-12',
    type: 'Failed admin PIN',
    severity: 'warning',
    description: '3 consecutive failed attendant PIN attempts within 2 minutes.',
    reportedAt: '2026-07-15T16:48:00',
    source: 'Attendant console',
    status: 'reviewed',
  },
  {
    id: 'SEC-13',
    type: 'Unusual payment pattern',
    severity: 'warning',
    description: 'Multiple declined card attempts for the same amount in under 1 minute.',
    reportedAt: '2026-07-15T12:03:00',
    source: 'Payment bridge',
    status: 'escalated',
  },
  {
    id: 'SEC-14',
    type: 'Certificate rotation',
    severity: 'info',
    description: 'Machine client certificate rotated successfully.',
    reportedAt: '2026-07-14T04:00:00',
    source: 'MDM / Estate',
    status: 'reviewed',
  },
];

const MOCK_HISTORY: AdminHistoryEvent[] = [
  {
    id: 'H-1',
    category: 'sale',
    summary: 'Sale completed — USB-C Cable',
    detail: 'RCP-88427 · $4.00 · QR',
    at: '2026-07-16T12:22:00',
  },
  {
    id: 'H-2',
    category: 'fault',
    summary: 'Dispense jam reported',
    detail: 'Slot B3 · Power Bank tray',
    at: '2026-07-16T11:06:00',
  },
  {
    id: 'H-3',
    category: 'sale',
    summary: 'Sale voided — 1GB Data Voucher',
    detail: 'RCP-88426 · Refund queued',
    at: '2026-07-16T11:47:00',
  },
  {
    id: 'H-4',
    category: 'security',
    summary: 'Tamper alert opened',
    detail: 'SEC-11 · Overnight vibration spike',
    at: '2026-07-16T02:14:00',
  },
  {
    id: 'H-5',
    category: 'restock',
    summary: 'Restock confirmed',
    detail: 'Slots A1–D2 replenished by attendant',
    at: '2026-07-15T17:30:00',
  },
  {
    id: 'H-6',
    category: 'price',
    summary: 'Price list published',
    detail: 'July catalogue effective across machine',
    at: '2026-07-01T00:00:00',
  },
  {
    id: 'H-7',
    category: 'system',
    summary: 'Software update applied',
    detail: 'Kiosk UI package v0.0.0 staged & healthy',
    at: '2026-07-14T03:15:00',
  },
];

const INITIAL_USERS: AdminSystemUser[] = [
  {
    id: 'U-1001',
    name: 'Tendai Moyo',
    email: 'admin@econet.co.zw',
    role: 'admin',
    department: 'Retail Operations',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-002', 'KIOSK-003', 'KIOSK-004', 'KIOSK-005'],
    lastLoginAt: '2026-07-16T14:20:00',
    createdAt: '2025-11-02T09:00:00',
    phone: '+263 77 100 2001',
    notes: 'Platform administrator — full estate access.',
  },
  {
    id: 'U-1002',
    name: 'Chipo Ncube',
    email: 'chipo.ncube@econet.co.zw',
    role: 'developer',
    department: 'Digital Platforms',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-002', 'KIOSK-003'],
    lastLoginAt: '2026-07-16T11:05:00',
    createdAt: '2026-01-14T10:30:00',
    phone: '+263 77 100 2002',
    notes: 'Owns kiosk UI releases and edge bridge integrations.',
  },
  {
    id: 'U-1003',
    name: 'Farai Dube',
    email: 'farai.dube@econet.co.zw',
    role: 'developer',
    department: 'Digital Platforms',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-005'],
    lastLoginAt: '2026-07-15T16:40:00',
    createdAt: '2026-02-03T08:15:00',
    notes: 'Backend / payments microservice developer.',
  },
  {
    id: 'U-1004',
    name: 'Rudo Sibanda',
    email: 'rudo.sibanda@econet.co.zw',
    role: 'security',
    department: 'Information Security',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-002', 'KIOSK-003', 'KIOSK-004', 'KIOSK-005'],
    lastLoginAt: '2026-07-16T09:12:00',
    createdAt: '2025-12-01T12:00:00',
    phone: '+263 77 100 2004',
    notes: 'Reviews tamper alerts and access anomalies.',
  },
  {
    id: 'U-1005',
    name: 'Blessing Phiri',
    email: 'blessing.phiri@econet.co.zw',
    role: 'security',
    department: 'Information Security',
    status: 'invited',
    kioskAccess: ['KIOSK-004', 'KIOSK-005'],
    lastLoginAt: null,
    createdAt: '2026-07-10T14:00:00',
    notes: 'Pending first login — security analyst invite.',
  },
  {
    id: 'U-1006',
    name: 'Tatenda Gumbo',
    email: 'tatenda.gumbo@econet.co.zw',
    role: 'maintainer',
    department: 'Field Engineering',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-003', 'KIOSK-004'],
    lastLoginAt: '2026-07-16T07:45:00',
    createdAt: '2026-03-18T09:40:00',
    phone: '+263 77 100 2006',
    notes: 'Hardware maintenance and restock support for Harare machines.',
  },
  {
    id: 'U-1007',
    name: 'Nyasha Mutasa',
    email: 'nyasha.mutasa@econet.co.zw',
    role: 'maintainer',
    department: 'Field Engineering',
    status: 'active',
    kioskAccess: ['KIOSK-002', 'KIOSK-005'],
    lastLoginAt: '2026-07-14T18:20:00',
    createdAt: '2026-04-02T11:10:00',
    notes: 'Airport and Bulawayo site engineer.',
  },
  {
    id: 'U-1008',
    name: 'Admin Demo',
    email: 'admin',
    role: 'admin',
    department: 'Retail Operations',
    status: 'active',
    kioskAccess: ['KIOSK-001', 'KIOSK-002', 'KIOSK-003', 'KIOSK-004', 'KIOSK-005'],
    lastLoginAt: '2026-07-16T15:00:00',
    createdAt: '2026-07-01T00:00:00',
    notes: 'Demo console login account.',
  },
  {
    id: 'U-1009',
    name: 'Kelvin Mhlanga',
    email: 'kelvin.mhlanga@econet.co.zw',
    role: 'attendant',
    department: 'Retail Operations',
    status: 'active',
    kioskAccess: ['KIOSK-001'],
    lastLoginAt: '2026-07-16T13:30:00',
    createdAt: '2026-05-20T10:00:00',
    phone: '+263 77 100 2009',
    notes: 'On-site attendant for CBD Flagship.',
  },
  {
    id: 'U-1010',
    name: 'Former Contractor',
    email: 'ex.dev@contractor.zw',
    role: 'developer',
    department: 'Digital Platforms',
    status: 'suspended',
    kioskAccess: [],
    lastLoginAt: '2026-06-01T09:00:00',
    createdAt: '2026-01-20T09:00:00',
    notes: 'Access revoked after contract end.',
  },
];

const MOCK_DASHBOARD: AdminDashboardAnalytics = {
  machineId: environment.machineId,
  location: 'Harare CBD',
  currency: 'USD',
  generatedAt: new Date().toISOString(),
  kpis: [
    { label: 'Sales today', value: '24', delta: '+18% vs yesterday', trend: 'up' },
    { label: 'Revenue today', value: '$186.50', delta: '+12% vs yesterday', trend: 'up', tone: 'success' },
    { label: 'Avg basket', value: '$7.77', delta: '+$0.40', trend: 'up' },
    { label: 'Conversion', value: '61%', delta: 'Browse → pay', trend: 'flat' },
    { label: 'Low stock', value: '3', delta: 'Needs refill', trend: 'down', tone: 'warn' },
    { label: 'Open faults', value: '2', delta: '1 high severity', trend: 'down', tone: 'danger' },
    { label: 'Security alerts', value: '1', delta: 'Tamper open', trend: 'down', tone: 'danger' },
    { label: 'Uptime (7d)', value: '99.2%', delta: 'Stable', trend: 'up', tone: 'success' },
  ],
  hourlySales: [
    { label: '08', value: 2 },
    { label: '09', value: 4 },
    { label: '10', value: 3 },
    { label: '11', value: 5 },
    { label: '12', value: 6 },
    { label: '13', value: 4 },
    { label: '14', value: 3 },
    { label: '15', value: 2 },
    { label: '16', value: 1 },
    { label: '17', value: 3 },
    { label: '18', value: 2 },
    { label: '19', value: 1 },
  ],
  weeklyRevenue: [
    { label: 'Mon', value: 142 },
    { label: 'Tue', value: 168 },
    { label: 'Wed', value: 155 },
    { label: 'Thu', value: 191 },
    { label: 'Fri', value: 210 },
    { label: 'Sat', value: 238 },
    { label: 'Sun', value: 186.5 },
  ],
  paymentMix: [
    { label: 'EcoCash', value: 11, percent: 46, color: '#1a35a3' },
    { label: 'Card', value: 8, percent: 33, color: '#e30613' },
    { label: 'QR', value: 5, percent: 21, color: '#4c6ef5' },
  ],
  categoryMix: [
    { label: 'SIM Cards', value: 7, percent: 29, color: '#1a35a3' },
    { label: 'Gadgets', value: 9, percent: 38, color: '#122678' },
    { label: 'Accessories', value: 4, percent: 17, color: '#748ffc' },
    { label: 'Vouchers', value: 4, percent: 16, color: '#e30613' },
  ],
  topProducts: [
    { name: 'Power Bank 10,000mAh', units: 5, revenue: 75, share: 92 },
    { name: 'USB-C Fast Charger', units: 4, revenue: 34, share: 78 },
    { name: '$5 Airtime Voucher', units: 6, revenue: 30, share: 70 },
    { name: 'Econet Starter SIM', units: 5, revenue: 5, share: 55 },
    { name: 'USB-C Cable 1m', units: 3, revenue: 12, share: 42 },
  ],
  health: {
    uptimePercent: 99.2,
    dispenseSuccessPercent: 97.4,
    paymentSuccessPercent: 94.8,
    avgTransactionSeconds: 48,
  },
  alerts: [
    { level: 'critical', text: 'Tamper alert still open from overnight vibration spike.' },
    { level: 'warn', text: 'Power bank slot B3 jam — 1 partial sale today.' },
    { level: 'warn', text: 'Printer paper below 15% — refill recommended.' },
    { level: 'info', text: 'Peak hour today: 12:00–13:00 (6 sales).' },
  ],
};
