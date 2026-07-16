import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-dispensing',
  standalone: true,
  template: `
    <section class="dispensing page">
      <div class="dispensing__card">
        <div class="dispensing__visual" aria-hidden="true">
          <div class="dispensing__slot"></div>
          <div class="dispensing__item"></div>
        </div>
        <h1>Dispensing your items</h1>
        <p>Please wait — do not leave the machine.</p>
        <div class="progress">
          <div class="progress__bar"></div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .dispensing {
      display: grid;
      place-items: center;
    }

    .dispensing__card {
      width: min(560px, 100%);
      display: grid;
      gap: 16px;
      padding: 48px 40px;
      border-radius: 24px;
      background: var(--surface);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .dispensing__visual {
      position: relative;
      height: 120px;
      margin: 0 auto 8px;
      width: 160px;
    }

    .dispensing__slot {
      position: absolute;
      inset: 0 20px auto;
      height: 28px;
      border-radius: 8px;
      background: #1a3d2a;
    }

    .dispensing__item {
      position: absolute;
      left: 50%;
      top: 20px;
      width: 48px;
      height: 48px;
      margin-left: -24px;
      border-radius: 12px;
      background: linear-gradient(145deg, #1a35a3, #122678);
      animation: drop 1.4s ease-in-out infinite;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    h1 {
      margin: 0;
      font-size: 1.8rem;
    }

    p {
      margin: 0;
      color: var(--text-muted);
    }

    .progress {
      height: 8px;
      margin-top: 8px;
      border-radius: 999px;
      background: #e8eee9;
      overflow: hidden;
    }

    .progress__bar {
      height: 100%;
      width: 40%;
      border-radius: 999px;
      background: var(--primary);
      animation: slide 1.2s ease-in-out infinite;
    }

    @keyframes drop {
      0% { transform: translateY(0); opacity: 1; }
      70% { transform: translateY(70px); opacity: 1; }
      100% { transform: translateY(70px); opacity: 0; }
    }

    @keyframes slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(280%); }
    }
  `,
})
export class DispensingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly session = inject(SessionService);

  ngOnInit(): void {
    const order = this.session.activeOrder();
    if (!order) {
      void this.router.navigate(['/']);
      return;
    }

    this.session.setStep('dispensing');
    this.orders.dispenseOrder(order).subscribe({
      next: (results) => {
        this.session.setOrder({
          ...order,
          dispenseResults: results,
          status: 'completed',
        });
        this.session.setStep('collect');
        void this.router.navigate(['/collect']);
      },
      error: () => {
        void this.router.navigate(['/collect']);
      },
    });
  }
}
