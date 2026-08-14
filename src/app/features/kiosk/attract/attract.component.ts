import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CatalogService } from '../../../core/services/catalog.service';
import { SessionService } from '../../../core/services/session.service';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CATEGORIES } from '../../../core/data/mock-catalog';

@Component({
  selector: 'app-attract',
  standalone: true,
  imports: [AsyncPipe, RouterLink, TouchButtonComponent, CurrencyFormatPipe],
  template: `
    <section class="attract" (click)="start()">
      <div class="attract__top">
        <img class="attract__logo" src="images/EconetLogo.png" alt="Econet Wireless" />
        <div class="attract__live">
          <span class="dot"></span>
          Machine ready
        </div>
      </div>

      <div class="attract__body">
        <div class="attract__copy">
          <p class="eyebrow">Self-service shop</p>
          <h1>SIMs, gadgets &amp; top-ups — ready when you are</h1>
          <p class="lead">
            Pick an item, pay with EcoCash, card or QR, then collect from the bin below.
            No queue. No waiting.
          </p>
          <div class="attract__cta" (click)="$event.stopPropagation()">
            <app-touch-button variant="primary" (pressed)="start()">
              Touch to Begin
            </app-touch-button>
            <app-touch-button variant="secondary" (pressed)="goVoucher()">
              Collect with voucher
            </app-touch-button>
            <span class="hint">Or tap anywhere on this screen</span>
          </div>
          <ul class="trust">
            <li>EcoCash</li>
            <li>Card / Tap</li>
            <li>Scan to Pay</li>
            <li>Instant dispense</li>
          </ul>
        </div>

        <div class="attract__showcase" (click)="$event.stopPropagation()">
          <div class="showcase-head">
            <h2>In stock right now</h2>
            <span>Ads only show what this machine can sell</span>
          </div>
          <div class="showcase-grid">
            @for (product of featured$ | async; track product.id) {
              <button type="button" class="showcase-card" (click)="startWithProduct(product.id)">
                <img [src]="product.imageUrl" [alt]="product.name" />
                <div class="showcase-card__body">
                  @if (product.badge) {
                    <em>{{ product.badge }}</em>
                  }
                  <strong>{{ product.name }}</strong>
                  <span>{{ product.tagline }}</span>
                  <b>{{ product.price | currencyFormat: product.currency }}</b>
                </div>
              </button>
            }
          </div>
          <div class="category-row">
            @for (cat of categories; track cat.id) {
              <div class="category-pill">
                <span>{{ cat.icon }}</span>
                {{ cat.label }}
              </div>
            }
          </div>
        </div>
      </div>

      <footer class="attract__footer">
        <div class="attract__links" (click)="$event.stopPropagation()">
          <a routerLink="/attendant" class="staff">Staff</a>
          <a routerLink="/dev/machine" class="staff">Machine control</a>
          <a routerLink="/admin/login" class="admin-btn">Admin login</a>
        </div>
        <span class="attract__tagline">Pay · Collect · Done — usually under a minute</span>
      </footer>
    </section>
  `,
  styles: `
    .attract {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 28px 40px 88px;
      background:
        radial-gradient(ellipse 80% 50% at 100% 0%, rgba(227, 6, 19, 0.18), transparent 50%),
        radial-gradient(ellipse 60% 40% at 0% 20%, rgba(255, 255, 255, 0.12), transparent 45%),
        linear-gradient(165deg, #0a1550 0%, #1a35a3 48%, #243db0 70%, #eef1f8 70.1%);
      color: #fff;
      cursor: pointer;
    }

    .attract__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .attract__logo {
      height: 48px;
      width: auto;
      padding: 10px 14px;
      border-radius: 12px;
      background: #fff;
      object-fit: contain;
    }

    .attract__live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.25);
      animation: blink 1.8s ease-in-out infinite;
    }

    .attract__body {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 36px;
      align-items: center;
      flex: 1;
      padding: 28px 0 12px;
    }

    .eyebrow {
      margin: 0 0 10px;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }

    h1 {
      margin: 0 0 16px;
      font-size: clamp(2.2rem, 4.2vw, 3.4rem);
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1.08;
      max-width: 14ch;
    }

    .lead {
      margin: 0 0 28px;
      font-size: 1.15rem;
      line-height: 1.55;
      opacity: 0.92;
      max-width: 38ch;
    }

    .attract__cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
      animation: pulse 2.6s ease-in-out infinite;
    }

    .hint {
      font-size: 0.95rem;
      opacity: 0.8;
    }

    .trust {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .trust li {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.08);
      font-size: 0.88rem;
      font-weight: 600;
    }

    .attract__showcase {
      padding: 22px;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.97);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      cursor: default;
    }

    .showcase-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .showcase-head h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
    }

    .showcase-head span {
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .showcase-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .showcase-card {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: linear-gradient(180deg, #f8f9fd, #fff);
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }

    .showcase-card:hover,
    .showcase-card:focus-visible {
      border-color: var(--primary);
      transform: translateY(-2px);
      outline: none;
    }

    .showcase-card img {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: contain;
      background: #fff;
      flex-shrink: 0;
    }

    .showcase-card__body {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .showcase-card__body em {
      font-style: normal;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
    }

    .showcase-card__body strong {
      font-size: 0.92rem;
      line-height: 1.25;
    }

    .showcase-card__body span {
      color: var(--text-muted);
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .showcase-card__body b {
      color: var(--primary);
      font-size: 1rem;
    }

    .category-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .category-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.82rem;
      font-weight: 700;
    }

    .attract__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 8px;
      padding-right: 8px;
      font-size: 0.9rem;
      opacity: 0.9;
      flex-wrap: wrap;
    }

    .attract__tagline {
      margin-left: auto;
      text-align: right;
      max-width: 28ch;
    }

    .attract__links {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 14px;
    }

    .staff {
      text-decoration: underline;
      text-underline-offset: 3px;
      opacity: 0.85;
      font-size: 0.85rem;
    }

    .admin-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(0, 0, 0, 0.2);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 700;
      text-decoration: none;
      letter-spacing: 0.02em;
    }

    .admin-btn:hover {
      background: rgba(0, 0, 0, 0.35);
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    @media (max-width: 980px) {
      .attract__body {
        grid-template-columns: 1fr;
      }

      h1 {
        max-width: none;
      }

      .showcase-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .attract {
        padding: 20px 20px 96px;
      }

      .attract__footer {
        flex-direction: column;
        align-items: flex-start;
      }

      .attract__tagline {
        margin-left: 0;
        text-align: left;
      }
    }
  `,
})
export class AttractComponent {
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(SessionService);

  readonly featured$ = this.catalog.getFeaturedProducts();
  readonly categories = CATEGORIES;

  start(): void {
    this.session.startSession();
    void this.router.navigate(['/browse']);
  }

  startWithProduct(id: string): void {
    this.session.startSession();
    void this.router.navigate(['/product', id]);
  }

  goVoucher(): void {
    this.session.startSession();
    this.session.setStep('voucher');
    void this.router.navigate(['/voucher']);
  }
}
