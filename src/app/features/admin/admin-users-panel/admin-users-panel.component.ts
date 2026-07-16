import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AdminSystemUser,
  AdminUserRole,
  AdminUserStatus,
} from '../../../core/models/admin.model';
import {
  AdminDataService,
  AdminUserInput,
  MOCK_KIOSKS,
} from '../../../core/services/admin-data.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type UsersMode = 'index' | 'view' | 'create' | 'edit';
type RoleFilter = 'all' | AdminUserRole;

@Component({
  selector: 'app-admin-users-panel',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, FormsModule, TouchButtonComponent],
  template: `
    <section class="users">
      @if (mode() === 'index') {
        <div class="users__head">
          <div>
            <h1>User management</h1>
            <p class="sub">
              Admins, developers, security and field maintainers with access to the estate.
            </p>
          </div>
          <app-touch-button variant="primary" (pressed)="openCreate()">+ Add user</app-touch-button>
        </div>

        <div class="summary-row">
          <article class="summary-card">
            <span>Total users</span>
            <strong>{{ summary().total }}</strong>
          </article>
          <article class="summary-card">
            <span>Admins</span>
            <strong>{{ summary().admin }}</strong>
          </article>
          <article class="summary-card">
            <span>Developers</span>
            <strong>{{ summary().developer }}</strong>
          </article>
          <article class="summary-card">
            <span>Security</span>
            <strong>{{ summary().security }}</strong>
          </article>
          <article class="summary-card">
            <span>Maintainers</span>
            <strong>{{ summary().maintainer }}</strong>
          </article>
          <article class="summary-card warn">
            <span>Suspended / invited</span>
            <strong>{{ summary().other }}</strong>
          </article>
        </div>

        <div class="filters">
          @for (f of roleFilters; track f.id) {
            <button
              type="button"
              [class.active]="filter() === f.id"
              (click)="filter.set(f.id)"
            >
              {{ f.label }}
            </button>
          }
        </div>

        <div class="user-grid">
          @for (user of filteredUsers(); track user.id) {
            <article class="user-card" [attr.data-status]="user.status" [attr.data-role]="user.role">
              <div class="user-card__top">
                <div class="avatar" [attr.data-role]="user.role">{{ initials(user.name) }}</div>
                <span class="pill" [attr.data-status]="user.status">{{ user.status }}</span>
              </div>
              <h2>{{ user.name }}</h2>
              <p class="email">{{ user.email }}</p>
              <div class="role-row">
                <span class="role-pill" [attr.data-role]="user.role">{{ roleLabel(user.role) }}</span>
                <span>{{ user.department }}</span>
              </div>
              <div class="access">
                <small>Kiosk access</small>
                <p>
                  @if (user.kioskAccess.length === 0) {
                    None
                  } @else if (user.kioskAccess.length >= kiosks.length) {
                    Full estate
                  } @else {
                    {{ user.kioskAccess.length }} machine{{ user.kioskAccess.length === 1 ? '' : 's' }}
                    @if (hasCurrentKiosk(user)) {
                      · includes this kiosk
                    }
                  }
                </p>
              </div>
              <div class="user-card__actions">
                <button type="button" (click)="openView(user)">View</button>
                <button type="button" (click)="openEdit(user)">Edit</button>
                <button type="button" class="danger" (click)="remove(user)">Remove</button>
              </div>
            </article>
          } @empty {
            <div class="empty">No users match this filter.</div>
          }
        </div>
      }

      @if (mode() === 'view' && selected(); as user) {
        <div class="users__head">
          <div>
            <button type="button" class="back-link" (click)="backToIndex()">← Back to users</button>
            <h1>{{ user.name }}</h1>
            <p class="sub">{{ user.email }} · {{ roleLabel(user.role) }}</p>
          </div>
          <div class="head-actions">
            <app-touch-button variant="secondary" (pressed)="openEdit(user)">Edit</app-touch-button>
            <app-touch-button variant="ghost" (pressed)="remove(user)">Remove</app-touch-button>
          </div>
        </div>

        <div class="view-layout">
          <article class="view-hero" [attr.data-role]="user.role">
            <div class="avatar large" [attr.data-role]="user.role">{{ initials(user.name) }}</div>
            <div>
              <span class="pill" [attr.data-status]="user.status">{{ user.status }}</span>
              <h2>{{ user.name }}</h2>
              <p>{{ user.email }}</p>
              <strong class="role-line">{{ roleLabel(user.role) }} · {{ user.department }}</strong>
            </div>
          </article>

          <div class="view-side">
            <article class="panel">
              <h3>Access</h3>
              <div class="meta-list">
                <div><span>User ID</span><strong>{{ user.id }}</strong></div>
                <div><span>Status</span><strong>{{ user.status | uppercase }}</strong></div>
                <div><span>Role</span><strong>{{ roleLabel(user.role) }}</strong></div>
                <div><span>Department</span><strong>{{ user.department }}</strong></div>
                @if (user.phone) {
                  <div><span>Phone</span><strong>{{ user.phone }}</strong></div>
                }
                <div>
                  <span>Last login</span>
                  <strong>
                    {{ user.lastLoginAt ? (user.lastLoginAt | date: 'dd MMM yyyy HH:mm') : 'Never' }}
                  </strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{{ user.createdAt | date: 'dd MMM yyyy' }}</strong>
                </div>
              </div>
            </article>

            <article class="panel">
              <h3>Kiosk access</h3>
              <div class="kiosk-chips">
                @for (kid of user.kioskAccess; track kid) {
                  <span [class.current]="kid === currentKioskId()">{{ kioskName(kid) }}</span>
                } @empty {
                  <p class="muted">No kiosk access assigned.</p>
                }
              </div>
            </article>

            @if (user.notes) {
              <article class="panel">
                <h3>Notes</h3>
                <p class="notes">{{ user.notes }}</p>
              </article>
            }
          </div>
        </div>
      }

      @if (mode() === 'create' || mode() === 'edit') {
        <div class="users__head">
          <div>
            <button type="button" class="back-link" (click)="cancelForm()">← Back</button>
            <h1>{{ mode() === 'create' ? 'Add user' : 'Edit user' }}</h1>
            <p class="sub">
              {{
                mode() === 'create'
                  ? 'Invite someone who administers, builds, secures or maintains the platform.'
                  : 'Update role, status and kiosk access for ' + (selected()?.name ?? '')
              }}
            </p>
          </div>
        </div>

        <form class="user-form" (ngSubmit)="save()">
          <section class="form-section">
            <div class="form-section__head">
              <h3>1. Identity</h3>
              <p>Who they are on the estate</p>
            </div>
            <div class="form-grid">
              <label class="span-2">
                Full name
                <input [(ngModel)]="form.name" name="name" required placeholder="e.g. Tendai Moyo" />
              </label>
              <label>
                Email / login
                <input [(ngModel)]="form.email" name="email" required placeholder="name@econet.co.zw" />
              </label>
              <label>
                Phone
                <input [(ngModel)]="form.phone" name="phone" placeholder="+263 …" />
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h3>2. Role &amp; organisation</h3>
              <p>What they can do and where they sit</p>
            </div>
            <div class="form-grid">
              <label>
                Role
                <select [(ngModel)]="form.role" name="role" required>
                  @for (role of roles; track role.id) {
                    <option [value]="role.id">{{ role.label }}</option>
                  }
                </select>
              </label>
              <label>
                Status
                <select [(ngModel)]="form.status" name="status" required>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label class="span-2">
                Department
                <input
                  [(ngModel)]="form.department"
                  name="department"
                  required
                  placeholder="e.g. Digital Platforms"
                />
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h3>3. Kiosk access</h3>
              <p>Machines this user may operate or support</p>
            </div>
            <div class="kiosk-checkboxes">
              @for (kiosk of kiosks; track kiosk.id) {
                <label class="check">
                  <input
                    type="checkbox"
                    [checked]="form.kioskAccess.includes(kiosk.id)"
                    (change)="toggleKiosk(kiosk.id, $event)"
                  />
                  <span>
                    <strong>{{ kiosk.name }}</strong>
                    <small>{{ kiosk.id }} · {{ kiosk.location }}</small>
                  </span>
                </label>
              }
            </div>
            <div class="quick-actions">
              <button type="button" (click)="selectAllKiosks()">Full estate</button>
              <button type="button" (click)="clearKiosks()">Clear all</button>
              <button type="button" (click)="selectCurrentKioskOnly()">This kiosk only</button>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__head">
              <h3>4. Notes</h3>
              <p>Optional context for other admins</p>
            </div>
            <label class="notes-label">
              Notes
              <textarea [(ngModel)]="form.notes" name="notes" rows="3" placeholder="Responsibilities, shift, etc."></textarea>
            </label>
          </section>

          @if (formError()) {
            <p class="form-error">{{ formError() }}</p>
          }

          <div class="form-footer">
            <app-touch-button variant="secondary" (pressed)="cancelForm()">Cancel</app-touch-button>
            <app-touch-button variant="primary" (pressed)="save()">
              {{ mode() === 'create' ? 'Create user' : 'Save changes' }}
            </app-touch-button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .users__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.7rem;
      font-weight: 800;
    }

    .sub {
      margin: 0;
      color: var(--text-muted);
    }

    .head-actions {
      display: flex;
      gap: 10px;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 8px;
      padding: 0;
      border: none;
      background: none;
      color: var(--primary);
      font-weight: 700;
      cursor: pointer;
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .summary-card {
      padding: 14px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .summary-card span {
      display: block;
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .summary-card strong {
      display: block;
      margin-top: 6px;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .summary-card.warn strong { color: var(--warning); }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .filters button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .filters button.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .user-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 14px;
    }

    .user-card {
      display: flex;
      flex-direction: column;
      padding: 16px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .user-card[data-status='suspended'] {
      border-color: #f5c2c7;
      opacity: 0.92;
    }

    .user-card[data-status='invited'] {
      border-color: #f0c36d;
    }

    .user-card__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .avatar {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-weight: 800;
      font-size: 0.95rem;
    }

    .avatar.large {
      width: 88px;
      height: 88px;
      font-size: 1.6rem;
      border-radius: 20px;
    }

    .avatar[data-role='admin'] { background: #e8eefc; color: #1a35a3; }
    .avatar[data-role='developer'] { background: #eef1f8; color: #122678; }
    .avatar[data-role='security'] { background: #ffebee; color: #c62828; }
    .avatar[data-role='maintainer'] { background: #fff4e0; color: #b36b00; }
    .avatar[data-role='attendant'] { background: #e8f5ee; color: var(--success); }

    .user-card h2 {
      margin: 0 0 4px;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .email {
      margin: 0 0 10px;
      color: var(--text-muted);
      font-size: 0.85rem;
      word-break: break-all;
    }

    .role-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .role-pill {
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--primary-dark);
    }

    .role-pill[data-role='security'] { background: #ffebee; color: #c62828; }
    .role-pill[data-role='maintainer'] { background: #fff4e0; color: #b36b00; }
    .role-pill[data-role='developer'] { background: #e8eefc; color: #122678; }
    .role-pill[data-role='attendant'] { background: #e8f5ee; color: var(--success); }

    .access small {
      display: block;
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .access p {
      margin: 4px 0 0;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .user-card__actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 14px;
    }

    .user-card__actions button {
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    .user-card__actions .danger {
      color: #c62828;
      border-color: #f5c2c7;
    }

    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pill[data-status='active'] { background: #e8f5ee; color: var(--success); }
    .pill[data-status='invited'] { background: #fff4e0; color: var(--warning); }
    .pill[data-status='suspended'] { background: #ffebee; color: #c62828; }

    .empty {
      grid-column: 1 / -1;
      padding: 40px;
      border-radius: 16px;
      background: #fff;
      border: 1px dashed var(--border);
      text-align: center;
      color: var(--text-muted);
    }

    .view-layout {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 16px;
      align-items: start;
    }

    .view-hero {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 18px;
      align-items: center;
      padding: 22px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 5px solid var(--primary);
    }

    .view-hero[data-role='security'] { border-left-color: #c62828; }
    .view-hero[data-role='maintainer'] { border-left-color: var(--warning); }
    .view-hero[data-role='developer'] { border-left-color: #122678; }
    .view-hero[data-role='attendant'] { border-left-color: var(--success); }

    .view-hero h2 {
      margin: 10px 0 4px;
      font-size: 1.5rem;
      font-weight: 800;
    }

    .view-hero p {
      margin: 0 0 8px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .role-line {
      color: var(--primary-dark);
      font-size: 1rem;
    }

    .view-side {
      display: grid;
      gap: 14px;
    }

    .panel {
      padding: 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .panel h3 {
      margin: 0 0 12px;
      font-size: 0.85rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .meta-list {
      display: grid;
      gap: 8px;
    }

    .meta-list > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg);
    }

    .meta-list span {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .kiosk-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .kiosk-chips span {
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--bg);
      border: 1px solid var(--border);
      font-size: 0.82rem;
      font-weight: 700;
    }

    .kiosk-chips span.current {
      background: var(--primary-soft);
      border-color: var(--primary);
      color: var(--primary-dark);
    }

    .muted,
    .notes {
      margin: 0;
      color: var(--text-muted);
      font-weight: 600;
      line-height: 1.5;
    }

    .user-form {
      display: grid;
      gap: 14px;
      max-width: 820px;
    }

    .form-section {
      padding: 20px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .form-section__head {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .form-section__head h3 {
      margin: 0 0 4px;
      font-size: 1rem;
      font-weight: 800;
    }

    .form-section__head p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .form-grid label,
    .notes-label {
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .span-2 { grid-column: 1 / -1; }

    .form-grid input,
    .form-grid select,
    .notes-label textarea {
      min-height: 48px;
      padding: 0 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
      background: #fff;
    }

    .notes-label textarea {
      min-height: 96px;
      padding: 12px;
      resize: vertical;
    }

    .form-grid input:focus,
    .form-grid select:focus,
    .notes-label textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .kiosk-checkboxes {
      display: grid;
      gap: 8px;
    }

    .check {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px;
      border-radius: 12px;
      background: var(--bg);
      cursor: pointer;
    }

    .check input {
      margin-top: 4px;
      width: 18px;
      height: 18px;
    }

    .check strong {
      display: block;
      font-size: 0.95rem;
    }

    .check small {
      color: var(--text-muted);
      font-weight: 600;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px dashed var(--border);
    }

    .quick-actions button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }

    .form-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .form-error {
      margin: 0;
      padding: 12px 14px;
      border-radius: 12px;
      background: #ffebee;
      color: #c62828;
      font-weight: 700;
    }

    @media (max-width: 1000px) {
      .summary-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 800px) {
      .summary-row,
      .view-layout,
      .view-hero,
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminUsersPanelComponent {
  private readonly data = inject(AdminDataService);

  private readonly users = toSignal(this.data.getUsers(), { initialValue: [] as AdminSystemUser[] });
  readonly currentKioskId = toSignal(this.data.getSelectedKioskId(), { initialValue: 'KIOSK-001' });

  readonly kiosks = MOCK_KIOSKS;
  readonly mode = signal<UsersMode>('index');
  readonly selected = signal<AdminSystemUser | null>(null);
  readonly filter = signal<RoleFilter>('all');
  readonly formError = signal('');
  readonly editingId = signal<string | null>(null);

  readonly roles: { id: AdminUserRole; label: string }[] = [
    { id: 'admin', label: 'Admin' },
    { id: 'developer', label: 'Developer' },
    { id: 'security', label: 'Security' },
    { id: 'maintainer', label: 'Maintainer' },
    { id: 'attendant', label: 'Attendant' },
  ];

  readonly roleFilters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...this.roles,
  ];

  form = this.blankForm();

  readonly filteredUsers = computed(() => {
    const list = this.users();
    const f = this.filter();
    return f === 'all' ? list : list.filter((u) => u.role === f);
  });

  readonly summary = computed(() => {
    const list = this.users();
    return {
      total: list.length,
      admin: list.filter((u) => u.role === 'admin').length,
      developer: list.filter((u) => u.role === 'developer').length,
      security: list.filter((u) => u.role === 'security').length,
      maintainer: list.filter((u) => u.role === 'maintainer').length,
      other: list.filter((u) => u.status !== 'active').length,
    };
  });

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  roleLabel(role: AdminUserRole): string {
    return this.roles.find((r) => r.id === role)?.label ?? role;
  }

  kioskName(id: string): string {
    const k = this.kiosks.find((x) => x.id === id);
    return k ? `${k.name} (${k.id})` : id;
  }

  hasCurrentKiosk(user: AdminSystemUser): boolean {
    return user.kioskAccess.includes(this.currentKioskId());
  }

  openCreate(): void {
    this.form = this.blankForm();
    this.form.kioskAccess = [this.currentKioskId()];
    this.formError.set('');
    this.editingId.set(null);
    this.selected.set(null);
    this.mode.set('create');
  }

  openView(user: AdminSystemUser): void {
    this.selected.set(user);
    this.mode.set('view');
  }

  openEdit(user: AdminSystemUser): void {
    this.selected.set(user);
    this.editingId.set(user.id);
    this.form = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      kioskAccess: [...user.kioskAccess],
      lastLoginAt: user.lastLoginAt,
      phone: user.phone ?? '',
      notes: user.notes ?? '',
    };
    this.formError.set('');
    this.mode.set('edit');
  }

  backToIndex(): void {
    this.mode.set('index');
    this.selected.set(null);
    this.editingId.set(null);
    this.formError.set('');
  }

  cancelForm(): void {
    if (this.mode() === 'edit' && this.selected()) {
      this.mode.set('view');
      this.formError.set('');
      return;
    }
    this.backToIndex();
  }

  toggleKiosk(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.form.kioskAccess.includes(id)) {
        this.form.kioskAccess = [...this.form.kioskAccess, id];
      }
    } else {
      this.form.kioskAccess = this.form.kioskAccess.filter((k) => k !== id);
    }
  }

  selectAllKiosks(): void {
    this.form.kioskAccess = this.kiosks.map((k) => k.id);
  }

  clearKiosks(): void {
    this.form.kioskAccess = [];
  }

  selectCurrentKioskOnly(): void {
    this.form.kioskAccess = [this.currentKioskId()];
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.department.trim()) {
      this.formError.set('Name, email and department are required.');
      return;
    }

    const payload: AdminUserInput = {
      name: this.form.name,
      email: this.form.email,
      role: this.form.role,
      department: this.form.department,
      status: this.form.status,
      kioskAccess: [...this.form.kioskAccess],
      lastLoginAt: this.mode() === 'create' ? null : this.form.lastLoginAt,
      phone: this.form.phone,
      notes: this.form.notes,
    };

    if (this.mode() === 'create') {
      this.data.createUser(payload).subscribe({
        next: (user) => {
          if (!user) {
            this.formError.set('A user with that email already exists.');
            return;
          }
          this.selected.set(user);
          this.mode.set('view');
        },
      });
      return;
    }

    const id = this.editingId();
    if (!id) return;

    this.data.updateUser(id, payload).subscribe({
      next: (user) => {
        if (!user) {
          this.formError.set('Could not update — email may already be in use.');
          return;
        }
        this.selected.set(user);
        this.mode.set('view');
      },
    });
  }

  remove(user: AdminSystemUser): void {
    if (!confirm(`Remove user ${user.name} (${user.email})?`)) {
      return;
    }
    this.data.deleteUser(user.id).subscribe({
      next: () => this.backToIndex(),
    });
  }

  private blankForm() {
    return {
      name: '',
      email: '',
      role: 'developer' as AdminUserRole,
      department: '',
      status: 'invited' as AdminUserStatus,
      kioskAccess: [] as string[],
      lastLoginAt: null as string | null,
      phone: '',
      notes: '',
    };
  }
}
