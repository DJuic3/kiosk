import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AdminInventoryItem } from '../../../core/models/admin.model';
import {
  AdminDataService,
  AdminInventoryInput,
} from '../../../core/services/admin-data.service';
import { CATEGORIES, MOCK_PRODUCTS } from '../../../core/data/mock-catalog';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type InventoryMode = 'index' | 'view' | 'create' | 'edit';
type StockFilter = 'all' | 'ok' | 'low' | 'out';

@Component({
  selector: 'app-admin-inventory-panel',
  standalone: true,
  imports: [CurrencyPipe, UpperCasePipe, FormsModule, TouchButtonComponent],
  template: `
    <section class="inv">
      @if (mode() === 'index') {
        <div class="inv__head">
          <div>
            <h1>Inventory</h1>
            <p class="sub">Manage slots, stock levels and refill thresholds.</p>
          </div>
          <app-touch-button variant="primary" (pressed)="openCreate()">+ Add item</app-touch-button>
        </div>

        <div class="summary-row">
          <article class="summary-card">
            <span>Total SKUs</span>
            <strong>{{ summary().total }}</strong>
          </article>
          <article class="summary-card ok">
            <span>Healthy</span>
            <strong>{{ summary().ok }}</strong>
          </article>
          <article class="summary-card warn">
            <span>Low stock</span>
            <strong>{{ summary().low }}</strong>
          </article>
          <article class="summary-card danger">
            <span>Out of stock</span>
            <strong>{{ summary().out }}</strong>
          </article>
        </div>

        <div class="filters">
          <button
            type="button"
            [class.active]="filter() === 'all'"
            (click)="filter.set('all')"
          >
            All
          </button>
          <button
            type="button"
            [class.active]="filter() === 'ok'"
            (click)="filter.set('ok')"
          >
            OK
          </button>
          <button
            type="button"
            [class.active]="filter() === 'low'"
            (click)="filter.set('low')"
          >
            Low
          </button>
          <button
            type="button"
            [class.active]="filter() === 'out'"
            (click)="filter.set('out')"
          >
            Out
          </button>
        </div>

        <div class="card-grid">
          @for (item of filteredInventory(); track item.sku) {
            <article class="inv-card" [attr.data-status]="item.status">
              <div class="inv-card__top">
                @if (productImage(item.sku); as img) {
                  <img [src]="img" [alt]="item.name" />
                } @else {
                  <div class="inv-card__placeholder">{{ item.slotCode }}</div>
                }
                <span class="pill" [attr.data-status]="item.status">{{ item.status }}</span>
              </div>
              <div class="inv-card__body">
                <small>Slot {{ item.slotCode }} · {{ item.category }}</small>
                <h2>{{ item.name }}</h2>
                <p>{{ item.sku }} · {{ item.price | currency: 'USD' }}</p>
                <div class="stock-bar">
                  <div class="stock-bar__fill" [style.width.%]="fillPercent(item)"></div>
                </div>
                <div class="stock-meta">
                  <span>{{ item.stock }} / {{ item.capacity }} units</span>
                  <span>Par {{ item.parLevel }}</span>
                </div>
              </div>
              <div class="inv-card__actions">
                <button type="button" (click)="openView(item)">View</button>
                <button type="button" (click)="openEdit(item)">Edit</button>
                <button type="button" class="danger" (click)="remove(item)">Delete</button>
              </div>
            </article>
          } @empty {
            <div class="empty">No inventory items match this filter.</div>
          }
        </div>
      }

      @if (mode() === 'view' && selected(); as item) {
        <div class="inv__head">
          <div>
            <button type="button" class="back-link" (click)="backToIndex()">← Back to inventory</button>
            <h1>Inventory item</h1>
            <p class="sub">{{ item.sku }} · Slot {{ item.slotCode }}</p>
          </div>
          <div class="head-actions">
            <app-touch-button variant="secondary" (pressed)="openEdit(item)">Edit</app-touch-button>
            <app-touch-button variant="danger" (pressed)="remove(item)">Delete</app-touch-button>
          </div>
        </div>

        <div class="view-layout">
          <article class="view-hero" [attr.data-status]="item.status">
            <div class="view-hero__media">
              @if (productImage(item.sku); as img) {
                <img [src]="img" [alt]="item.name" />
              } @else {
                <div class="inv-card__placeholder large">{{ item.slotCode }}</div>
              }
            </div>
            <div>
              <span class="pill" [attr.data-status]="item.status">{{ item.status }}</span>
              <h2>{{ item.name }}</h2>
              <p>{{ item.category | uppercase }} · {{ item.sku }}</p>
              <strong class="price">{{ item.price | currency: 'USD' }}</strong>
            </div>
          </article>

          <aside class="view-side">
            <article class="panel">
              <h3>Stock position</h3>
              <div class="stock-bar tall">
                <div class="stock-bar__fill" [style.width.%]="fillPercent(item)"></div>
              </div>
              <div class="meta-list">
                <div><span>On hand</span><strong>{{ item.stock }}</strong></div>
                <div><span>Capacity</span><strong>{{ item.capacity }}</strong></div>
                <div><span>Par level</span><strong>{{ item.parLevel }}</strong></div>
                <div><span>Free space</span><strong>{{ item.capacity - item.stock }}</strong></div>
              </div>
            </article>

            <article class="panel">
              <h3>Slot details</h3>
              <div class="meta-list">
                <div><span>Slot code</span><strong>{{ item.slotCode }}</strong></div>
                <div><span>Category</span><strong>{{ categoryLabel(item.category) }}</strong></div>
                <div><span>Unit price</span><strong>{{ item.price | currency: 'USD' }}</strong></div>
                <div>
                  <span>Fill level</span>
                  <strong>{{ fillPercent(item) }}%</strong>
                </div>
              </div>
            </article>
          </aside>
        </div>
      }

      @if (mode() === 'create' || mode() === 'edit') {
        <div class="inv__head">
          <div>
            <button type="button" class="back-link" (click)="backToIndex()">← Back to inventory</button>
            <h1>{{ mode() === 'create' ? 'Add inventory item' : 'Edit inventory item' }}</h1>
            <p class="sub">
              {{
                mode() === 'create'
                  ? 'Set up a new product slot on this machine.'
                  : 'Update stock, capacity and slot details for ' + (selected()?.name ?? '')
              }}
            </p>
          </div>
        </div>

        <div class="edit-layout">
          <aside class="edit-preview">
            <div class="preview-card" [attr.data-status]="previewStatus()">
              <div class="preview-card__media">
                @if (productImage(form.sku); as img) {
                  <img [src]="img" [alt]="form.name || 'Product'" />
                } @else {
                  <div class="inv-card__placeholder large">{{ form.slotCode || '—' }}</div>
                }
                <span class="pill" [attr.data-status]="previewStatus()">{{ previewStatus() }}</span>
              </div>
              <div class="preview-card__body">
                <small>Live preview</small>
                <h2>{{ form.name || 'Untitled item' }}</h2>
                <p>{{ form.sku || 'SKU' }} · Slot {{ form.slotCode || '—' }}</p>
                <strong class="price">{{ form.price || 0 | currency: 'USD' }}</strong>
                <div class="stock-bar tall">
                  <div class="stock-bar__fill" [style.width.%]="previewFill()"></div>
                </div>
                <div class="stock-meta">
                  <span>{{ form.stock || 0 }} / {{ form.capacity || 0 }} units</span>
                  <span>{{ previewFill() }}% full</span>
                </div>
                <div class="preview-stats">
                  <div><span>Par</span><strong>{{ form.parLevel || 0 }}</strong></div>
                  <div><span>Free</span><strong>{{ Math.max(0, (form.capacity || 0) - (form.stock || 0)) }}</strong></div>
                  <div><span>Category</span><strong>{{ categoryLabel(form.category) }}</strong></div>
                </div>
              </div>
            </div>
            <p class="preview-hint">
              Status updates automatically from stock vs par level.
            </p>
          </aside>

          <form class="edit-form" (ngSubmit)="save()">
            <section class="form-section">
              <div class="form-section__head">
                <h3>1. Product identity</h3>
                <p>Name and catalogue identifiers</p>
              </div>
              <div class="form-grid">
                <label class="span-2">
                  Product name
                  <input [(ngModel)]="form.name" name="name" required placeholder="e.g. USB-C Fast Charger" />
                </label>
                <label>
                  SKU
                  <input
                    [(ngModel)]="form.sku"
                    name="sku"
                    required
                    [readonly]="mode() === 'edit'"
                    placeholder="e.g. GAD-USB-C-01"
                  />
                  @if (mode() === 'edit') {
                    <em class="field-hint">SKU cannot be changed after creation</em>
                  }
                </label>
                <label>
                  Category
                  <select [(ngModel)]="form.category" name="category" required>
                    @for (cat of categories; track cat.id) {
                      <option [value]="cat.id">{{ cat.label }}</option>
                    }
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="form-section__head">
                <h3>2. Slot &amp; pricing</h3>
                <p>Where it lives in the machine and what it costs</p>
              </div>
              <div class="form-grid">
                <label>
                  Slot code
                  <input [(ngModel)]="form.slotCode" name="slotCode" required placeholder="e.g. B1" />
                </label>
                <label>
                  Unit price (USD)
                  <input type="number" min="0" step="0.01" [(ngModel)]="form.price" name="price" required />
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="form-section__head">
                <h3>3. Stock levels</h3>
                <p>On-hand quantity, tray capacity and low-stock threshold</p>
              </div>
              <div class="form-grid">
                <label>
                  Current stock
                  <div class="stepper">
                    <button type="button" (click)="adjustStock(-1)" [disabled]="form.stock <= 0">−</button>
                    <input type="number" min="0" [(ngModel)]="form.stock" name="stock" required />
                    <button type="button" (click)="adjustStock(1)">+</button>
                  </div>
                </label>
                <label>
                  Capacity
                  <div class="stepper">
                    <button type="button" (click)="adjustCapacity(-1)" [disabled]="form.capacity <= 1">−</button>
                    <input type="number" min="1" [(ngModel)]="form.capacity" name="capacity" required />
                    <button type="button" (click)="adjustCapacity(1)">+</button>
                  </div>
                </label>
                <label class="span-2">
                  Par level (low-stock alert threshold)
                  <div class="stepper">
                    <button type="button" (click)="adjustPar(-1)" [disabled]="form.parLevel <= 0">−</button>
                    <input type="number" min="0" [(ngModel)]="form.parLevel" name="parLevel" required />
                    <button type="button" (click)="adjustPar(1)">+</button>
                  </div>
                  <em class="field-hint">
                    When stock is at or below {{ form.parLevel || 0 }}, status becomes Low.
                  </em>
                </label>
              </div>

              <div class="quick-actions">
                <button type="button" (click)="setStockFull()">Fill to capacity</button>
                <button type="button" (click)="setStockPar()">Set stock to par</button>
                <button type="button" (click)="setStockZero()">Mark empty</button>
              </div>
            </section>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }

            <div class="edit-form__footer">
              <app-touch-button variant="secondary" (pressed)="cancelEdit()">Cancel</app-touch-button>
              <app-touch-button variant="primary" (pressed)="save()">
                {{ mode() === 'create' ? 'Create item' : 'Save changes' }}
              </app-touch-button>
            </div>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .inv__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
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
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .summary-card {
      padding: 14px 16px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .summary-card span {
      display: block;
      margin-bottom: 4px;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .summary-card strong {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .summary-card.ok strong { color: var(--success); }
    .summary-card.warn strong { color: var(--warning); }
    .summary-card.danger strong { color: #c62828; }

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

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }

    .inv-card {
      display: flex;
      flex-direction: column;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .inv-card[data-status='low'] {
      border-color: #f0c36d;
    }

    .inv-card[data-status='out'] {
      border-color: #f5c2c7;
    }

    .inv-card__top {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 120px;
      padding: 16px;
      background: linear-gradient(180deg, #f5f7fc, #eef1f8);
    }

    .inv-card__top img {
      width: 88px;
      height: 88px;
      object-fit: contain;
      border-radius: 12px;
    }

    .inv-card__placeholder {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      border-radius: 14px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-weight: 800;
    }

    .inv-card__placeholder.large {
      width: 120px;
      height: 120px;
      font-size: 1.4rem;
    }

    .inv-card__top .pill {
      position: absolute;
      top: 12px;
      right: 12px;
    }

    .inv-card__body {
      padding: 14px 16px 8px;
    }

    .inv-card__body small {
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .inv-card__body h2 {
      margin: 4px 0;
      font-size: 1.05rem;
      font-weight: 800;
    }

    .inv-card__body p {
      margin: 0 0 10px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .stock-bar {
      height: 8px;
      border-radius: 999px;
      background: #eef1f8;
      overflow: hidden;
      margin-bottom: 6px;
    }

    .stock-bar.tall {
      height: 12px;
      margin-bottom: 14px;
    }

    .stock-bar__fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--primary), #4c6ef5);
    }

    .inv-card[data-status='low'] .stock-bar__fill {
      background: var(--warning);
    }

    .inv-card[data-status='out'] .stock-bar__fill {
      background: #c62828;
      width: 4% !important;
    }

    .stock-meta {
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .inv-card__actions {
      display: flex;
      gap: 6px;
      padding: 12px 16px 16px;
    }

    .inv-card__actions button,
    .actions button {
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    .inv-card__actions .danger {
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

    .pill[data-status='ok'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .pill[data-status='low'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .pill[data-status='out'] {
      background: #ffebee;
      color: #c62828;
    }

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
      grid-template-columns: 1.2fr 0.9fr;
      gap: 16px;
      align-items: start;
    }

    .view-hero {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 18px;
      align-items: center;
      padding: 22px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 5px solid var(--success);
    }

    .view-hero[data-status='low'] { border-left-color: var(--warning); }
    .view-hero[data-status='out'] { border-left-color: #c62828; }

    .view-hero__media img {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 14px;
      background: var(--bg);
    }

    .view-hero h2 {
      margin: 10px 0 4px;
      font-size: 1.5rem;
      font-weight: 800;
    }

    .view-hero p {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .price {
      font-size: 1.6rem;
      color: var(--primary-dark);
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

    .edit-layout {
      display: grid;
      grid-template-columns: minmax(260px, 0.85fr) 1.4fr;
      gap: 18px;
      align-items: start;
    }

    .edit-preview {
      position: sticky;
      top: 12px;
    }

    .preview-card {
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 5px solid var(--success);
      overflow: hidden;
    }

    .preview-card[data-status='low'] { border-left-color: var(--warning); }
    .preview-card[data-status='out'] { border-left-color: #c62828; }

    .preview-card__media {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 160px;
      padding: 20px;
      background: linear-gradient(180deg, #f5f7fc, #eef1f8);
    }

    .preview-card__media img {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 14px;
    }

    .preview-card__media .pill {
      position: absolute;
      top: 14px;
      right: 14px;
    }

    .preview-card__body {
      padding: 18px 20px 20px;
    }

    .preview-card__body small {
      color: var(--text-muted);
      font-weight: 800;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .preview-card__body h2 {
      margin: 6px 0 4px;
      font-size: 1.25rem;
      font-weight: 800;
    }

    .preview-card__body > p {
      margin: 0 0 10px;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 600;
    }

    .preview-card .price {
      display: block;
      margin-bottom: 14px;
      font-size: 1.45rem;
    }

    .preview-card[data-status='low'] .stock-bar__fill {
      background: var(--warning);
    }

    .preview-card[data-status='out'] .stock-bar__fill {
      background: #c62828;
      width: 4% !important;
    }

    .preview-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .preview-stats > div {
      display: grid;
      gap: 2px;
      padding: 10px;
      border-radius: 12px;
      background: var(--bg);
      text-align: center;
    }

    .preview-stats span {
      color: var(--text-muted);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .preview-stats strong {
      font-size: 0.95rem;
      font-weight: 800;
    }

    .preview-hint {
      margin: 12px 4px 0;
      color: var(--text-muted);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .edit-form {
      display: grid;
      gap: 14px;
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

    .form-grid label {
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .form-grid .span-2 {
      grid-column: 1 / -1;
    }

    .form-grid input,
    .form-grid select {
      min-height: 48px;
      padding: 0 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
      background: #fff;
    }

    .form-grid input:focus,
    .form-grid select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .form-grid input[readonly] {
      background: var(--bg);
      color: var(--text-muted);
    }

    .field-hint {
      font-style: normal;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .stepper {
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      gap: 8px;
      align-items: center;
    }

    .stepper button {
      min-height: 48px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      font-size: 1.25rem;
      font-weight: 800;
      cursor: pointer;
      color: var(--primary-dark);
    }

    .stepper button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .stepper input {
      text-align: center;
      font-weight: 800;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
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

    .quick-actions button:hover {
      border-color: var(--primary);
      color: var(--primary-dark);
      background: var(--primary-soft);
    }

    .edit-form__footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      position: sticky;
      bottom: 8px;
    }

    .form-error {
      margin: 0;
      padding: 12px 14px;
      border-radius: 12px;
      background: #ffebee;
      color: #c62828;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      .summary-row,
      .view-layout,
      .view-hero,
      .edit-layout,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .edit-preview {
        position: static;
      }
    }
  `,
})
export class AdminInventoryPanelComponent {
  private readonly data = inject(AdminDataService);

  private readonly inventory = toSignal(this.data.getInventory(), { initialValue: [] as AdminInventoryItem[] });

  readonly Math = Math;
  readonly categories = CATEGORIES;
  readonly mode = signal<InventoryMode>('index');
  readonly selected = signal<AdminInventoryItem | null>(null);
  readonly filter = signal<StockFilter>('all');
  readonly formError = signal('');
  readonly editingSku = signal<string | null>(null);

  readonly filteredInventory = computed(() => {
    const items = this.inventory();
    const f = this.filter();
    return f === 'all' ? items : items.filter((i) => i.status === f);
  });

  readonly summary = computed(() => {
    const items = this.inventory();
    return {
      total: items.length,
      ok: items.filter((i) => i.status === 'ok').length,
      low: items.filter((i) => i.status === 'low').length,
      out: items.filter((i) => i.status === 'out').length,
    };
  });

  form = this.blankForm();

  productImage(sku: string): string | null {
    return MOCK_PRODUCTS.find((p) => p.sku === sku)?.imageUrl ?? null;
  }

  categoryLabel(category: string): string {
    return CATEGORIES.find((c) => c.id === category)?.label ?? category;
  }

  fillPercent(item: AdminInventoryItem): number {
    if (item.capacity <= 0) return 0;
    return Math.min(100, Math.round((item.stock / item.capacity) * 100));
  }

  previewFill(): number {
    const capacity = Number(this.form.capacity) || 0;
    const stock = Number(this.form.stock) || 0;
    if (capacity <= 0) return 0;
    return Math.min(100, Math.round((stock / capacity) * 100));
  }

  previewStatus(): 'ok' | 'low' | 'out' {
    const stock = Number(this.form.stock) || 0;
    const par = Number(this.form.parLevel) || 0;
    if (stock <= 0) return 'out';
    if (stock <= par) return 'low';
    return 'ok';
  }

  adjustStock(delta: number): void {
    const next = Math.max(0, Number(this.form.stock) + delta);
    const cap = Number(this.form.capacity) || 0;
    this.form.stock = cap > 0 ? Math.min(next, cap) : next;
  }

  adjustCapacity(delta: number): void {
    this.form.capacity = Math.max(1, Number(this.form.capacity) + delta);
    if (this.form.stock > this.form.capacity) {
      this.form.stock = this.form.capacity;
    }
    if (this.form.parLevel > this.form.capacity) {
      this.form.parLevel = this.form.capacity;
    }
  }

  adjustPar(delta: number): void {
    const next = Math.max(0, Number(this.form.parLevel) + delta);
    const cap = Number(this.form.capacity) || 0;
    this.form.parLevel = cap > 0 ? Math.min(next, cap) : next;
  }

  setStockFull(): void {
    this.form.stock = Math.max(1, Number(this.form.capacity) || 0);
  }

  setStockPar(): void {
    this.form.stock = Math.min(Number(this.form.parLevel) || 0, Number(this.form.capacity) || 0);
  }

  setStockZero(): void {
    this.form.stock = 0;
  }

  cancelEdit(): void {
    if (this.mode() === 'edit' && this.selected()) {
      this.mode.set('view');
      this.formError.set('');
      return;
    }
    this.backToIndex();
  }

  openCreate(): void {
    this.form = this.blankForm();
    this.formError.set('');
    this.editingSku.set(null);
    this.selected.set(null);
    this.mode.set('create');
  }

  openView(item: AdminInventoryItem): void {
    this.selected.set(item);
    this.mode.set('view');
  }

  openEdit(item: AdminInventoryItem): void {
    this.selected.set(item);
    this.editingSku.set(item.sku);
    this.form = {
      name: item.name,
      sku: item.sku,
      category: item.category,
      slotCode: item.slotCode,
      price: item.price,
      stock: item.stock,
      capacity: item.capacity,
      parLevel: item.parLevel,
    };
    this.formError.set('');
    this.mode.set('edit');
  }

  backToIndex(): void {
    this.mode.set('index');
    this.selected.set(null);
    this.editingSku.set(null);
    this.formError.set('');
  }

  save(): void {
    if (
      !this.form.name.trim() ||
      !this.form.sku.trim() ||
      !this.form.slotCode.trim()
    ) {
      this.formError.set('Name, SKU and slot code are required.');
      return;
    }
    if (this.form.capacity < 1 || this.form.stock < 0 || this.form.parLevel < 0) {
      this.formError.set('Stock values must be valid.');
      return;
    }
    if (this.form.stock > this.form.capacity) {
      this.formError.set('Stock cannot exceed capacity.');
      return;
    }
    if (this.form.parLevel > this.form.capacity) {
      this.formError.set('Par level cannot exceed capacity.');
      return;
    }

    const payload: AdminInventoryInput = {
      name: this.form.name.trim(),
      sku: this.form.sku.trim().toUpperCase(),
      category: this.form.category,
      slotCode: this.form.slotCode.trim().toUpperCase(),
      price: Number(this.form.price),
      stock: Number(this.form.stock),
      capacity: Number(this.form.capacity),
      parLevel: Number(this.form.parLevel),
    };

    if (this.mode() === 'create') {
      this.data.createInventoryItem(payload).subscribe({
        next: (item) => {
          if (!item) {
            this.formError.set('SKU already exists.');
            return;
          }
          this.backToIndex();
        },
      });
      return;
    }

    const sku = this.editingSku();
    if (!sku) return;

    this.data.updateInventoryItem(sku, payload).subscribe({
      next: (item) => {
        if (!item) {
          this.formError.set('Could not update — SKU may already exist.');
          return;
        }
        this.selected.set(item);
        this.mode.set('view');
      },
    });
  }

  remove(item: AdminInventoryItem): void {
    if (!confirm(`Delete inventory item ${item.name} (${item.sku})?`)) {
      return;
    }
    this.data.deleteInventoryItem(item.sku).subscribe({
      next: () => this.backToIndex(),
    });
  }

  private blankForm() {
    return {
      name: '',
      sku: '',
      category: 'gadgets',
      slotCode: '',
      price: 0,
      stock: 0,
      capacity: 15,
      parLevel: 3,
    };
  }
}
