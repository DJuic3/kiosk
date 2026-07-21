import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type AdminTab =
  | 'overview'
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'operations'
  | 'users'
  | 'malfunctions'
  | 'security'
  | 'history';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet, TouchButtonComponent],
  template: `
    <div class="admin" [class.sidebar-open]="sidebarOpen()">
      <aside class="admin__sidebar">
        <div class="sidebar__brand">
          <img src="images/EconetLogo.png" alt="Econet" />
          <div>
            <strong>Admin Console</strong>
            @if (selectedKiosk$ | async; as kiosk) {
              <small>{{ kiosk.id }}</small>
            }
          </div>
        </div>

        <nav class="sidebar__nav">
          <p class="sidebar__label">Manage</p>
          @for (tab of tabs; track tab.id) {
            <a
              class="side-btn"
              [routerLink]="['/admin', tab.id]"
              routerLinkActive="active"
              (click)="sidebarOpen.set(false)"
            >
              <span class="side-btn__icon" aria-hidden="true">
                @switch (tab.icon) {
                  @case ('overview') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="9" rx="1" />
                      <rect x="14" y="3" width="7" height="5" rx="1" />
                      <rect x="14" y="12" width="7" height="9" rx="1" />
                      <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                  }
                  @case ('sales') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 6H6" />
                    </svg>
                  }
                  @case ('inventory') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
                      <path d="M3.3 7.1 12 12l8.7-4.9" />
                      <path d="M12 22V12" />
                    </svg>
                  }
                  @case ('finance') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  }
                  @case ('operations') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                    </svg>
                  }
                  @case ('users') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.9" />
                      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
                    </svg>
                  }
                  @case ('malfunctions') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  }
                  @case ('security') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                  @case ('history') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3v5h5" />
                      <path d="M3.1 9A9 9 0 1 0 6 4.3L3 8" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  }
                }
              </span>
              <span>{{ tab.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          <a routerLink="/" class="side-link">Customer kiosk</a>
          <app-touch-button variant="secondary" [block]="true" (pressed)="logout()">
            Sign out
          </app-touch-button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <button type="button" class="sidebar-backdrop" (click)="sidebarOpen.set(false)" aria-label="Close menu"></button>
      }

      <div class="admin__shell">
        <header class="admin__topbar">
          <button type="button" class="menu-toggle" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Toggle menu">
            ☰
          </button>

          <div class="kiosk-switcher">
            <label for="kiosk-select">Working on</label>
            <select
              id="kiosk-select"
              [value]="(selectedKioskId$ | async) ?? ''"
              (change)="onKioskChange($event)"
            >
              @for (kiosk of kiosks$ | async; track kiosk.id) {
                <option [value]="kiosk.id">
                  {{ kiosk.name }} — {{ kiosk.location }}
                  {{ kiosk.status === 'maintenance' ? '(maintenance)' : '' }}
                </option>
              }
            </select>
            @if (selectedKiosk$ | async; as kiosk) {
              <span class="kiosk-status" [attr.data-status]="kiosk.status">{{ kiosk.status }}</span>
            }
          </div>

          <div class="topbar-meta">
            @if (selectedKiosk$ | async; as kiosk) {
              <span>{{ kiosk.location }}</span>
            }
          </div>
        </header>

        <main class="admin__main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .admin {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      min-height: 100vh;
      background: var(--bg);
    }

    .admin__sidebar {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 18px 14px;
      background: #0f1f66;
      color: #fff;
      z-index: 30;
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 8px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      margin-bottom: 16px;
    }

    .sidebar__brand img {
      height: 34px;
      width: auto;
      padding: 6px 8px;
      border-radius: 8px;
      background: #fff;
    }

    .sidebar__brand strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .sidebar__brand small {
      display: block;
      margin-top: 2px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .sidebar__label {
      margin: 0 10px 8px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
    }

    .sidebar__nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      overflow: auto;
      padding-bottom: 12px;
    }

    .side-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 44px;
      padding: 0 12px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: rgba(255, 255, 255, 0.82);
      font: inherit;
      font-weight: 700;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }

    .side-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .side-btn.active {
      background: #fff;
      color: var(--primary-dark);
    }

    .side-btn__icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .side-btn__icon svg {
      width: 16px;
      height: 16px;
    }

    .side-btn.active .side-btn__icon {
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .sidebar__footer {
      display: grid;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .side-link {
      color: rgba(255, 255, 255, 0.85);
      font-weight: 700;
      text-decoration: none;
      padding: 8px 10px;
      border-radius: 10px;
    }

    .side-link:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .admin__shell {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }

    .admin__topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 24px;
      background: #fff;
      border-bottom: 1px solid var(--border);
    }

    .menu-toggle {
      display: none;
      width: 42px;
      height: 42px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #fff;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .kiosk-switcher {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .kiosk-switcher label {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .kiosk-switcher select {
      min-width: min(320px, 100%);
      max-width: 420px;
      min-height: 44px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      font: inherit;
      font-weight: 700;
      color: var(--text);
      cursor: pointer;
    }

    .kiosk-switcher select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .kiosk-status {
      padding: 6px 10px;
      border-radius: 999px;
      background: #e8f5ee;
      color: var(--success);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .kiosk-status[data-status='maintenance'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .kiosk-status[data-status='offline'] {
      background: #ffebee;
      color: #c62828;
    }

    .topbar-meta {
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.88rem;
      white-space: nowrap;
    }

    .sidebar-backdrop {
      display: none;
    }

    .admin__main {
      padding: 24px;
      flex: 1;
    }

    @media (max-width: 980px) {
      .admin {
        grid-template-columns: 1fr;
      }

      .admin__sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: min(280px, 86vw);
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        box-shadow: 12px 0 40px rgba(15, 23, 42, 0.2);
      }

      .admin.sidebar-open .admin__sidebar {
        transform: translateX(0);
      }

      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        border: none;
        background: rgba(15, 23, 42, 0.4);
        z-index: 25;
        cursor: pointer;
      }

      .menu-toggle {
        display: grid;
        place-items: center;
      }

      .admin__topbar {
        flex-wrap: wrap;
      }

      .kiosk-switcher {
        flex: 1 1 220px;
        flex-wrap: wrap;
      }

      .kiosk-switcher select {
        min-width: 0;
        flex: 1;
      }

      .topbar-meta {
        display: none;
      }
    }
  `,
})
export class AdminDashboardComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly data = inject(AdminDataService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly kiosks$ = this.data.getKiosks();
  readonly selectedKiosk$ = this.data.getSelectedKiosk();
  readonly selectedKioskId$ = this.data.getSelectedKioskId();

  readonly tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'overview' },
    { id: 'sales', label: 'Sales', icon: 'sales' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'finance', label: 'Finance', icon: 'finance' },
    { id: 'operations', label: 'Operations', icon: 'operations' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'malfunctions', label: 'Malfunctions', icon: 'malfunctions' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'history', label: 'History', icon: 'history' },
  ];

  onKioskChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.data.selectKiosk(value);
    const path = this.router.url.split('?')[0];
    void this.router.navigateByUrl(path);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/admin/login']);
  }
}
