import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MachineService } from '../../../core/services/machine.service';
import { CartService } from '../../../core/services/cart.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <header class="status-bar">
      <div class="status-bar__brand">
        <img
          class="status-bar__logo"
          src="images/EconetLogo.png"
          alt="Econet Wireless"
        />
        <div>
          <strong>Self-Service Kiosk</strong>
          <small>{{ (machine$ | async)?.location ?? 'Loading...' }}</small>
        </div>
      </div>
      <div class="status-bar__meta">
        <span class="status-bar__id">{{ machineId }}</span>
        @if (cartService.summary().itemCount > 0) {
          <span class="status-bar__cart">{{ cartService.summary().itemCount }} in cart</span>
        }
        <span class="status-bar__online" [class.offline]="!(health$ | async)?.online">
          <span class="pulse"></span>
          {{ (health$ | async)?.online ? 'Online' : 'Offline' }}
        </span>
      </div>
    </header>
  `,
  styles: `
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 28px;
      background: linear-gradient(90deg, #0e1a5c, var(--primary-dark));
      color: #fff;
      box-shadow: 0 4px 20px rgba(10, 21, 80, 0.25);
    }

    .status-bar__brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .status-bar__logo {
      height: 40px;
      width: auto;
      max-width: 180px;
      padding: 8px 12px;
      border-radius: 10px;
      background: #fff;
      object-fit: contain;
    }

    strong {
      display: block;
      font-size: 1rem;
      font-weight: 800;
    }

    small {
      opacity: 0.85;
      font-size: 0.85rem;
    }

    .status-bar__meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
    }

    .status-bar__id {
      opacity: 0.8;
      font-weight: 600;
    }

    .status-bar__cart {
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      font-weight: 700;
    }

    .status-bar__online {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(27, 122, 61, 0.9);
      font-weight: 700;
    }

    .status-bar__online.offline {
      background: #c62828;
    }

    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
    }
  `,
})
export class StatusBarComponent {
  readonly cartService = inject(CartService);
  private readonly machineService = inject(MachineService);

  readonly machineId = environment.machineId;
  readonly machine$ = this.machineService.getMachineInfo();
  readonly health$ = this.machineService.getHealth();
}
