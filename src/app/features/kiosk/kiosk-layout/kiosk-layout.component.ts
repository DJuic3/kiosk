import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { StatusBarComponent } from '../../../shared/components/status-bar/status-bar.component';
import { SessionService } from '../../../core/services/session.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-kiosk-layout',
  standalone: true,
  imports: [RouterOutlet, StatusBarComponent],
  template: `
    <div class="kiosk-layout">
      @if (session.step() !== 'idle') {
        <app-status-bar />
      }
      <main class="kiosk-layout__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .kiosk-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg);
    }

    .kiosk-layout__main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `,
})
export class KioskLayoutComponent implements OnInit, OnDestroy {
  readonly session = inject(SessionService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.session.onSessionEnded.subscribe(() => {
      this.cart.clear();
      void this.router.navigate(['/']);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('document:pointerdown')
  onActivity(): void {
    this.session.touch();
  }
}
