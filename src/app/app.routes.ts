import { Routes } from '@angular/router';
import { KioskLayoutComponent } from './features/kiosk/kiosk-layout/kiosk-layout.component';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: KioskLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/kiosk/attract/attract.component').then((m) => m.AttractComponent),
      },
      {
        path: 'browse',
        loadComponent: () =>
          import('./features/kiosk/browse/browse.component').then((m) => m.BrowseComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./features/kiosk/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/kiosk/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/kiosk/checkout/checkout.component').then((m) => m.CheckoutComponent),
      },
      {
        path: 'payment',
        loadComponent: () =>
          import('./features/kiosk/payment/payment.component').then((m) => m.PaymentComponent),
      },
      {
        path: 'fiscal-receipt',
        loadComponent: () =>
          import('./features/kiosk/fiscal-receipt/fiscal-receipt.component').then(
            (m) => m.FiscalReceiptComponent,
          ),
      },
      {
        path: 'dispensing',
        loadComponent: () =>
          import('./features/kiosk/dispensing/dispensing.component').then(
            (m) => m.DispensingComponent,
          ),
      },
      {
        path: 'collect',
        loadComponent: () =>
          import('./features/kiosk/collect/collect.component').then((m) => m.CollectComponent),
      },
      {
        path: 'refund',
        loadComponent: () =>
          import('./features/kiosk/refund/refund.component').then((m) => m.RefundComponent),
      },
      {
        path: 'voucher',
        loadComponent: () =>
          import('./features/kiosk/voucher-collect/voucher-collect.component').then(
            (m) => m.VoucherCollectComponent,
          ),
      },
    ],
  },
  {
    path: 'attendant',
    loadComponent: () =>
      import('./features/attendant/attendant.component').then((m) => m.AttendantComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/admin/admin-overview/admin-overview.component').then(
            (m) => m.AdminOverviewComponent,
          ),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/admin/admin-sales-panel/admin-sales-panel.component').then(
            (m) => m.AdminSalesPanelComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/admin/admin-inventory-panel/admin-inventory-panel.component').then(
            (m) => m.AdminInventoryPanelComponent,
          ),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./features/admin/admin-finance-panel/admin-finance-panel.component').then(
            (m) => m.AdminFinancePanelComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/admin-users-panel/admin-users-panel.component').then(
            (m) => m.AdminUsersPanelComponent,
          ),
      },
      {
        path: 'malfunctions',
        loadComponent: () =>
          import('./features/admin/admin-malfunctions-page/admin-malfunctions-page.component').then(
            (m) => m.AdminMalfunctionsPageComponent,
          ),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./features/admin/admin-security-page/admin-security-page.component').then(
            (m) => m.AdminSecurityPageComponent,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/admin/admin-history-page/admin-history-page.component').then(
            (m) => m.AdminHistoryPageComponent,
          ),
      },
      {
        path: 'operations',
        loadComponent: () =>
          import('./features/admin/admin-ops-panel/admin-ops-panel.component').then(
            (m) => m.AdminOpsPanelComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
