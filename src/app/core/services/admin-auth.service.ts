import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'vending_admin_session';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly _authenticated = signal(this.readStored());

  readonly authenticated = this._authenticated.asReadonly();

  login(username: string, password: string): boolean {
    const ok =
      username.trim().toLowerCase() === 'admin' && password === 'Admin@123';

    if (!ok) {
      return false;
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: 'admin', at: Date.now() }),
    );
    this._authenticated.set(true);
    return true;
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this._authenticated.set(false);
  }

  isAuthenticated(): boolean {
    return this._authenticated();
  }

  private readStored(): boolean {
    try {
      return !!sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }
}
