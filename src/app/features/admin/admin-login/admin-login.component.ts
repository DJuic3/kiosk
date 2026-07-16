import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TouchButtonComponent],
  template: `
    <section class="admin-login">
      <div class="admin-login__card">
        <img src="images/EconetLogo.png" alt="Econet Wireless" />
        <h1>Admin Console</h1>
        <p>Restricted access — sales, inventory, faults and security.</p>

        <label>
          Username
          <input type="text" [(ngModel)]="username" autocomplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            (keyup.enter)="submit()"
          />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <app-touch-button variant="primary" [block]="true" (pressed)="submit()">
          Sign in
        </app-touch-button>

        <a routerLink="/">← Back to customer kiosk</a>
        <p class="hint">Demo: admin / Admin&#64;123</p>
      </div>
    </section>
  `,
  styles: `
    .admin-login {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(ellipse at top, rgba(26, 53, 163, 0.18), transparent 50%),
        var(--bg);
    }

    .admin-login__card {
      width: min(420px, 100%);
      display: grid;
      gap: 14px;
      padding: 32px;
      border-radius: 22px;
      background: var(--surface);
      box-shadow: var(--shadow-lg);
    }

    img {
      width: 160px;
      height: auto;
      margin: 0 auto;
    }

    h1 {
      margin: 0;
      text-align: center;
      font-size: 1.6rem;
      font-weight: 800;
    }

    p {
      margin: 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 700;
      text-align: left;
    }

    input {
      min-height: 52px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 500;
    }

    input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .error {
      color: #c62828;
      font-weight: 700;
    }

    a {
      text-align: center;
      color: var(--primary);
      font-weight: 600;
      text-decoration: none;
    }

    .hint {
      font-size: 0.8rem;
      opacity: 0.75;
    }
  `,
})
export class AdminLoginComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  readonly error = signal('');

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/admin']);
    }
  }

  submit(): void {
    if (!this.auth.login(this.username, this.password)) {
      this.error.set('Invalid username or password.');
      return;
    }
    void this.router.navigate(['/admin']);
  }
}
