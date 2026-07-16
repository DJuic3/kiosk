export interface AdminSale {
  id: string;
  receiptNumber: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: string;
  soldAt: string;
  status: 'completed' | 'voided' | 'partial';
}

export interface AdminKiosk {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
}

export interface AdminInventoryItem {
  sku: string;
  name: string;
  category: string;
  slotCode: string;
  price: number;
  stock: number;
  capacity: number;
  parLevel: number;
  status: 'ok' | 'low' | 'out';
}

export interface AdminMalfunction {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  slotCode?: string;
  message: string;
  reportedAt: string;
  status: 'open' | 'investigating' | 'resolved';
}

export interface AdminSecurityEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  reportedAt: string;
  source: string;
  status: 'open' | 'reviewed' | 'escalated';
}

export interface AdminHistoryEvent {
  id: string;
  category: 'sale' | 'restock' | 'price' | 'fault' | 'security' | 'system';
  summary: string;
  detail: string;
  at: string;
}

export interface DashboardKpi {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  tone?: 'default' | 'warn' | 'danger' | 'success';
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface NamedShare {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface TopProductStat {
  name: string;
  units: number;
  revenue: number;
  share: number;
}

export interface AdminDashboardAnalytics {
  machineId: string;
  location: string;
  currency: string;
  generatedAt: string;
  kpis: DashboardKpi[];
  hourlySales: ChartPoint[];
  weeklyRevenue: ChartPoint[];
  paymentMix: NamedShare[];
  categoryMix: NamedShare[];
  topProducts: TopProductStat[];
  health: {
    uptimePercent: number;
    dispenseSuccessPercent: number;
    paymentSuccessPercent: number;
    avgTransactionSeconds: number;
  };
  alerts: { level: 'info' | 'warn' | 'critical'; text: string }[];
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: 'settlement' | 'cash' | 'clearing' | 'fee' | 'tax';
  provider: string;
  balance: number;
  pending: number;
  currency: string;
  lastMovementAt: string;
  status: 'healthy' | 'attention' | 'blocked';
}

export interface FinanceLedgerEntry {
  id: string;
  at: string;
  type: 'sale' | 'settlement' | 'refund' | 'void' | 'fee' | 'payout' | 'tax';
  reference: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  status: 'posted' | 'pending' | 'failed';
}

export interface FinanceSettlement {
  id: string;
  periodLabel: string;
  channel: string;
  gross: number;
  fees: number;
  net: number;
  status: 'settled' | 'in_transit' | 'failed' | 'scheduled';
  settledAt?: string;
  expectedAt?: string;
}

export interface FinanceReconciliationDay {
  date: string;
  salesCount: number;
  grossSales: number;
  voidsRefunds: number;
  fees: number;
  netRecognised: number;
  matched: boolean;
  variance: number;
}

export interface AdminFinanceSnapshot {
  machineId: string;
  location: string;
  currency: string;
  generatedAt: string;
  periodLabel: string;
  summary: {
    grossRevenue: number;
    refundsVoids: number;
    paymentFees: number;
    taxCollected: number;
    netRevenue: number;
    cashOnHand: number;
    pendingSettlements: number;
    settledToDate: number;
  };
  accounts: FinanceAccount[];
  ledger: FinanceLedgerEntry[];
  settlements: FinanceSettlement[];
  reconciliation: FinanceReconciliationDay[];
  channelMix: NamedShare[];
  alerts: { level: 'info' | 'warn' | 'critical'; text: string }[];
}

export type AdminUserRole =
  | 'admin'
  | 'developer'
  | 'security'
  | 'maintainer'
  | 'attendant';

export type AdminUserStatus = 'active' | 'invited' | 'suspended';

export interface AdminSystemUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  department: string;
  status: AdminUserStatus;
  kioskAccess: string[];
  lastLoginAt: string | null;
  createdAt: string;
  phone?: string;
  notes?: string;
}
