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
  },
  { path: '**', redirectTo: '' },
];
