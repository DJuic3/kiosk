import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of } from 'rxjs';
import {
  AdminInventoryItem,
  InventoryActivityEvent,
  InventoryActivityType,
} from '../../../core/models/admin.model';
import {
  AdminDataService,
  AdminInventoryInput,
} from '../../../core/services/admin-data.service';
import { CATEGORIES, MOCK_PRODUCTS } from '../../../core/data/mock-catalog';
import { TouchButtonComponent } from '../../../shared/components/touch-button/touch-button.component';

type InventoryMode = 'index' | 'view' | 'create' | 'edit';
type StockFilter = 'all' | 'ok' | 'low' | 'out';
type SortKey = 'attention' | 'slot' | 'name' | 'category' | 'price' | 'stock';
type ActivityFilter = 'all' | 'sale' | 'restock' | 'adjustment' | 'price' | 'fault';

@Component({
  selector: 'app-admin-inventory-panel',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, UpperCasePipe, FormsModule, TouchButtonComponent],
  template: `
    <section class="inv">
      @if (mode() === 'index') {
        <div class="inv__head">
          <div>
            <h1>Inventory</h1>
            <p class="sub">Planogram for this machine — filter, sort and page every slot.</p>
          </div>
          <app-touch-button variant="primary" (pressed)="openCreate()">+ Add item</app-touch-button>
        </div>

        <div class="summary-row">
          <button type="button" class="summary-card" [class.active]="filter() === 'all'" (click)="setFilter('all')">
            <span>All slots</span>
            <strong>{{ summary().total }}</strong>
          </button>
          <button type="button" class="summary-card ok" [class.active]="filter() === 'ok'" (click)="setFilter('ok')">
            <span>Healthy</span>
            <strong>{{ summary().ok }}</strong>
          </button>
          <button type="button" class="summary-card warn" [class.active]="filter() === 'low'" (click)="setFilter('low')">
            <span>Low stock</span>
            <strong>{{ summary().low }}</strong>
          </button>
          <button type="button" class="summary-card danger" [class.active]="filter() === 'out'" (click)="setFilter('out')">
            <span>Out of stock</span>
            <strong>{{ summary().out }}</strong>
          </button>
        </div>

        <div class="toolbar">
          <label class="filter-field search-field">
            Search
            <input
              type="search"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearch($event)"
              placeholder="Name, SKU, slot…"
            />
          </label>
          <label class="filter-field">
            Category
            <select [ngModel]="categoryFilter()" (ngModelChange)="onCategoryFilter($event)">
              <option value="all">All categories</option>
              @for (cat of categories; track cat.id) {
                <option [value]="cat.id">{{ cat.label }}</option>
              }
            </select>
          </label>
          <label class="filter-field">
            Rows
            <select [ngModel]="pageSize()" (ngModelChange)="onPageSize($event)">
              @for (size of pageSizes; track size) {
                <option [ngValue]="size">{{ size === 0 ? 'All' : size }}</option>
              }
            </select>
          </label>
          <p class="result-count">{{ rangeLabel() }}</p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('slot')" [class.active]="sortKey() === 'slot'">
                    Slot {{ sortMark('slot') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('name')" [class.active]="sortKey() === 'name'">
                    Product {{ sortMark('name') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('category')" [class.active]="sortKey() === 'category'">
                    Category {{ sortMark('category') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('price')" [class.active]="sortKey() === 'price'">
                    Price {{ sortMark('price') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('stock')" [class.active]="sortKey() === 'stock'">
                    Stock {{ sortMark('stock') }}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort" (click)="toggleSort('attention')" [class.active]="sortKey() === 'attention'">
                    Status {{ sortMark('attention') }}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pagedInventory(); track item.sku) {
                <tr class="data-row" [attr.data-status]="item.status" (click)="openView(item)">
                  <td class="slot-cell"><span>{{ item.slotCode }}</span></td>
                  <td>
                    <div class="product-cell">
                      @if (itemImage(item); as img) {
                        <img [src]="img" [alt]="" />
                      } @else {
                        <div class="thumb-fallback">{{ item.slotCode }}</div>
                      }
                      <div>
                        <strong>{{ item.name }}</strong>
                        <small>{{ item.sku }}</small>
                      </div>
                    </div>
                  </td>
                  <td>{{ categoryLabel(item.category) }}</td>
                  <td>{{ item.price | currency: 'USD' }}</td>
                  <td class="stock-cell">
                    <div class="stock-line">
                      <strong>{{ item.stock }}</strong>
                      <span>/ {{ item.capacity }} · par {{ item.parLevel }}</span>
                    </div>
                    <div class="stock-bar" [attr.data-status]="item.status">
                      <div class="stock-bar__fill" [style.width.%]="fillPercent(item)"></div>
                    </div>
                  </td>
                  <td>
                    <span class="pill" [attr.data-status]="item.status">{{ item.status }}</span>
                  </td>
                  <td class="actions" (click)="$event.stopPropagation()">
                    <button type="button" (click)="openView(item)">View</button>
                    <button type="button" (click)="openEdit(item)">Edit</button>
                    <button type="button" class="danger" (click)="remove(item)">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty">No slots match these filters.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (pageCount() > 1) {
          <div class="pager">
            <button type="button" [disabled]="page() <= 1" (click)="prevPage()">Previous</button>
            <span>Page {{ Math.min(page(), pageCount()) }} of {{ pageCount() }}</span>
            <button type="button" [disabled]="page() >= pageCount()" (click)="nextPage()">Next</button>
          </div>
        }
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
              @if (itemImage(item); as img) {
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

        <article class="panel activity-panel">
          <div class="activity-head">
            <div>
              <h3>Product activity</h3>
              <p>Sales, restocks, adjustments and other movements for this SKU.</p>
            </div>
            <div class="activity-summary">
              <div>
                <span>Sold</span>
                <strong>{{ activityStats().sold }}</strong>
              </div>
              <div>
                <span>Restocked</span>
                <strong>{{ activityStats().restocked }}</strong>
              </div>
              <div>
                <span>Adjusted</span>
                <strong>{{ activityStats().adjusted }}</strong>
              </div>
            </div>
          </div>

          <div class="activity-filters">
            @for (chip of activityFilters; track chip.id) {
              <button
                type="button"
                [class.active]="activityFilter() === chip.id"
                (click)="activityFilter.set(chip.id)"
              >
                {{ chip.label }}
              </button>
            }
          </div>

          <div class="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>What happened</th>
                  <th>Qty</th>
                  <th>Stock after</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredActivity(); track row.id) {
                  <tr [attr.data-type]="row.type">
                    <td>
                      <strong>{{ row.at | date: 'dd MMM' }}</strong>
                      <small>{{ row.at | date: 'HH:mm' }}</small>
                    </td>
                    <td><span class="type-pill" [attr.data-type]="row.type">{{ row.type }}</span></td>
                    <td>
                      <strong>{{ row.summary }}</strong>
                      <small>{{ row.detail }}</small>
                    </td>
                    <td class="qty" [attr.data-sign]="qtySign(row.qtyDelta)">
                      {{ qtyLabel(row.qtyDelta) }}
                    </td>
                    <td>{{ row.stockAfter ?? '—' }}</td>
                    <td>{{ row.amount != null ? (row.amount | currency: 'USD') : '—' }}</td>
                    <td>{{ row.reference }}</td>
                    <td>{{ row.actor }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty">No activity for this filter.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>
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
                @if (form.imageUrl) {
                  <img [src]="form.imageUrl" [alt]="form.name || 'Product'" />
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
                <h3>2. Product image</h3>
                <p>Upload a photo or graphic shown on the kiosk and in admin</p>
              </div>
              <div class="image-upload">
                <div class="image-upload__preview">
                  @if (form.imageUrl) {
                    <img [src]="form.imageUrl" [alt]="form.name || 'Preview'" />
                  } @else {
                    <span>No image yet</span>
                  }
                </div>
                <div class="image-upload__actions">
                  <label class="upload-btn">
                    Choose image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      (change)="onImageSelected($event)"
                    />
                  </label>
                  @if (form.imageUrl) {
                    <button type="button" class="clear-image" (click)="clearImage()">Remove image</button>
                  }
                  <em class="field-hint">PNG, JPG, WEBP or SVG. Preview updates instantly.</em>
                  @if (imageError()) {
                    <em class="field-error">{{ imageError() }}</em>
                  }
                </div>
              </div>
            </section>

            <section class="form-section">
              <div class="form-section__head">
                <h3>3. Slot &amp; pricing</h3>
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
                <h3>4. Stock levels</h3>
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
      cursor: pointer;
      text-align: left;
      font: inherit;
    }

    .summary-card.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
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

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 12px;
    }

    .filter-field {
      display: grid;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .search-field {
      flex: 1;
      min-width: min(280px, 100%);
    }

    .filter-field input,
    .filter-field select {
      min-height: 44px;
      padding: 0 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: #fff;
      font: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text);
      text-transform: none;
      letter-spacing: normal;
    }

    .filter-field select {
      min-width: 160px;
      cursor: pointer;
    }

    .filter-field input:focus,
    .filter-field select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .result-count {
      margin: 0 0 8px auto;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .table-wrap {
      overflow: auto;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      max-height: calc(100vh - 280px);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      white-space: nowrap;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f7f8fc;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sort {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      font-weight: 800;
      color: var(--text-muted);
      cursor: pointer;
    }

    .sort.active {
      color: var(--primary-dark);
    }

    .data-row {
      cursor: pointer;
    }

    .data-row:hover {
      background: #f7f8fc;
    }

    .data-row[data-status='out'] {
      background: #fff8f8;
    }

    .data-row[data-status='low'] {
      background: #fffaf0;
    }

    .slot-cell span {
      display: inline-grid;
      place-items: center;
      min-width: 40px;
      padding: 4px 8px;
      border-radius: 8px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-weight: 800;
      font-size: 0.8rem;
    }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 220px;
    }

    .product-cell img,
    .thumb-fallback {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      object-fit: contain;
      background: #eef1f8;
      flex-shrink: 0;
    }

    .thumb-fallback {
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .product-cell strong {
      display: block;
      font-size: 0.9rem;
    }

    .product-cell small {
      display: block;
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .stock-cell {
      min-width: 160px;
    }

    .stock-line {
      display: flex;
      gap: 4px;
      align-items: baseline;
      margin-bottom: 4px;
      font-size: 0.8rem;
    }

    .stock-line span {
      color: var(--text-muted);
      font-weight: 600;
    }

    .pager {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .pager button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .pager button:disabled {
      opacity: 0.45;
      cursor: default;
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

    .stock-bar[data-status='low'] .stock-bar__fill {
      background: var(--warning);
    }

    .stock-bar[data-status='out'] .stock-bar__fill,
    .inv-card[data-status='out'] .stock-bar__fill {
      background: #c62828;
      min-width: 4px;
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
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
      white-space: normal;
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

    .activity-panel {
      margin-top: 16px;
    }

    .activity-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    .activity-head h3 {
      margin: 0 0 4px;
      font-size: 1.05rem;
      font-weight: 800;
      text-transform: none;
      color: var(--text);
    }

    .activity-head p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .activity-summary {
      display: flex;
      gap: 18px;
    }

    .activity-summary span {
      display: block;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .activity-summary strong {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .activity-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .activity-filters button {
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    .activity-filters button.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }

    .qty[data-sign='pos'] { color: var(--success); font-weight: 800; }
    .qty[data-sign='neg'] { color: #c62828; font-weight: 800; }

    .type-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .type-pill[data-type='sale'] { background: var(--primary-soft); color: var(--primary-dark); }
    .type-pill[data-type='restock'] { background: #e8f5ee; color: var(--success); }
    .type-pill[data-type='adjustment'] { background: #fff4e0; color: var(--warning); }
    .type-pill[data-type='price'] { background: #eef1f8; color: var(--text-muted); }
    .type-pill[data-type='fault'],
    .type-pill[data-type='void'],
    .type-pill[data-type='refund'] { background: #ffebee; color: #c62828; }
    .type-pill[data-type='system'] { background: var(--primary-soft); color: var(--primary-dark); }

    .table-wrap.compact {
      border: none;
      border-radius: 0;
      max-height: none;
    }

    .activity-panel table { min-width: 820px; }

    .activity-panel td strong { display: block; }
    .activity-panel td small {
      display: block;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: normal;
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

    .field-error {
      font-style: normal;
      font-size: 0.78rem;
      font-weight: 700;
      color: #c62828;
    }

    .image-upload {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 16px;
      align-items: center;
    }

    .image-upload__preview {
      display: grid;
      place-items: center;
      width: 140px;
      height: 140px;
      border-radius: 16px;
      border: 2px dashed var(--border);
      background: var(--bg);
      overflow: hidden;
    }

    .image-upload__preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #fff;
    }

    .image-upload__preview span {
      color: var(--text-muted);
      font-size: 0.82rem;
      font-weight: 700;
      text-align: center;
      padding: 12px;
    }

    .image-upload__actions {
      display: grid;
      gap: 10px;
      justify-items: start;
    }

    .upload-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 12px;
      background: var(--primary);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    .upload-btn input {
      display: none;
    }

    .clear-image {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid #f5c2c7;
      border-radius: 999px;
      background: #fff;
      color: #c62828;
      font-weight: 700;
      cursor: pointer;
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
      .form-grid,
      .image-upload {
        grid-template-columns: 1fr;
      }

      .result-count {
        margin-left: 0;
      }

      .table-wrap {
        max-height: none;
      }

      .edit-preview {
        position: static;
      }
    }
  `,
})
export class AdminInventoryPanelComponent {
  private readonly data = inject(AdminDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly inventory = toSignal(this.data.getInventory(), { initialValue: [] as AdminInventoryItem[] });
  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly categories = CATEGORIES;
  readonly mode = signal<InventoryMode>('index');
  readonly selected = signal<AdminInventoryItem | null>(null);
  readonly selectedSku = computed(() => this.selected()?.sku ?? '');
  readonly filter = signal<StockFilter>('all');
  readonly categoryFilter = signal('all');
  readonly searchQuery = signal('');
  readonly sortKey = signal<SortKey>('attention');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly formError = signal('');
  readonly imageError = signal('');
  readonly editingSku = signal<string | null>(null);
  readonly pageSizes = [25, 50, 100, 0];
  readonly activityFilter = signal<ActivityFilter>('all');
  readonly activityFilters: { id: ActivityFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'sale', label: 'Sales' },
    { id: 'restock', label: 'Restocks' },
    { id: 'adjustment', label: 'Adjustments' },
    { id: 'price', label: 'Price' },
    { id: 'fault', label: 'Faults' },
  ];

  readonly activity = toSignal(
    toObservable(this.selectedSku).pipe(
      switchMap((sku) =>
        sku ? this.data.getInventoryActivity(sku) : of([] as InventoryActivityEvent[]),
      ),
    ),
    { initialValue: [] as InventoryActivityEvent[] },
  );

  readonly filteredActivity = computed(() => {
    const rows = this.activity();
    const filter = this.activityFilter();
    if (filter === 'all') {
      return rows;
    }
    return rows.filter((row) => this.matchesActivityFilter(row.type, filter));
  });

  readonly activityStats = computed(() => {
    const rows = this.activity();
    return {
      sold: Math.abs(
        rows
          .filter((row) => row.type === 'sale')
          .reduce((sum, row) => sum + (row.qtyDelta ?? 0), 0),
      ),
      restocked: rows
        .filter((row) => row.type === 'restock')
        .reduce((sum, row) => sum + (row.qtyDelta ?? 0), 0),
      adjusted: rows
        .filter((row) => row.type === 'adjustment')
        .reduce((sum, row) => sum + Math.abs(row.qtyDelta ?? 0), 0),
    };
  });

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const items = this.inventory();
      if (!params) {
        return;
      }
      this.applyRoute(params.get('id'), params.get('mode'), items);
      this.activityFilter.set('all');
    });
  }

  readonly Math = Math;

  readonly filteredInventory = computed(() => {
    const f = this.filter();
    const category = this.categoryFilter();
    const query = this.searchQuery().trim().toLowerCase();
    return this.inventory().filter((item) => {
      if (f !== 'all' && item.status !== f) {
        return false;
      }
      if (category !== 'all' && item.category !== category) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.slotCode.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        this.categoryLabel(item.category).toLowerCase().includes(query)
      );
    });
  });

  readonly sortedInventory = computed(() => {
    const rows = [...this.filteredInventory()];
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    rows.sort((a, b) => dir * this.compareItems(a, b, key));
    return rows;
  });

  readonly pageCount = computed(() => {
    const size = this.pageSize();
    const total = this.sortedInventory().length;
    if (size === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / size));
  });

  readonly pagedInventory = computed(() => {
    const rows = this.sortedInventory();
    const size = this.pageSize();
    if (size === 0) {
      return rows;
    }
    const page = Math.min(this.page(), this.pageCount());
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly rangeLabel = computed(() => {
    const total = this.sortedInventory().length;
    if (total === 0) {
      return '0 slots';
    }
    const size = this.pageSize();
    if (size === 0) {
      return `1–${total} of ${total} slots`;
    }
    const page = Math.min(this.page(), this.pageCount());
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}–${end} of ${total} slots`;
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

  setFilter(value: StockFilter): void {
    this.filter.set(value);
    this.page.set(1);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  onCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
    this.page.set(1);
  }

  onPageSize(value: number | string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  sortMark(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  prevPage(): void {
    this.page.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.page.update((page) => Math.min(this.pageCount(), page + 1));
  }

  itemImage(item: AdminInventoryItem): string | null {
    return item.imageUrl || MOCK_PRODUCTS.find((p) => p.sku === item.sku)?.imageUrl || null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.imageError.set('Please choose an image file.');
      return;
    }
    if (file.size > 2_500_000) {
      this.imageError.set('Image must be under 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.form.imageUrl = typeof reader.result === 'string' ? reader.result : null;
      this.imageError.set('');
    };
    reader.onerror = () => {
      this.imageError.set('Could not read that image. Try another file.');
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.form.imageUrl = null;
    this.imageError.set('');
  }

  categoryLabel(category: string): string {
    return CATEGORIES.find((c) => c.id === category)?.label ?? category;
  }

  qtyLabel(qty: number | null): string {
    if (qty == null) {
      return '—';
    }
    if (qty > 0) {
      return `+${qty}`;
    }
    return String(qty);
  }

  qtySign(qty: number | null): 'pos' | 'neg' | 'zero' {
    if (qty == null || qty === 0) {
      return 'zero';
    }
    return qty > 0 ? 'pos' : 'neg';
  }

  fillPercent(item: AdminInventoryItem): number {
    if (item.capacity <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((item.stock / item.capacity) * 100));
  }

  private matchesActivityFilter(type: InventoryActivityType, filter: ActivityFilter): boolean {
    if (filter === 'sale') {
      return type === 'sale' || type === 'void' || type === 'refund';
    }
    if (filter === 'fault') {
      return type === 'fault' || type === 'system';
    }
    return type === filter;
  }

  private compareItems(a: AdminInventoryItem, b: AdminInventoryItem, key: SortKey): number {
    switch (key) {
      case 'slot':
        return this.slotRank(a.slotCode) - this.slotRank(b.slotCode);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'category':
        return this.categoryLabel(a.category).localeCompare(this.categoryLabel(b.category));
      case 'price':
        return a.price - b.price;
      case 'stock':
        return this.fillPercent(a) - this.fillPercent(b);
      case 'attention':
      default: {
        const status = this.statusRank(a.status) - this.statusRank(b.status);
        if (status !== 0) {
          return status;
        }
        return this.slotRank(a.slotCode) - this.slotRank(b.slotCode);
      }
    }
  }

  private slotRank(slot: string): number {
    const match = slot.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      return 0;
    }
    return (match[1].toUpperCase().charCodeAt(0) - 64) * 100 + Number(match[2]);
  }

  private statusRank(status: AdminInventoryItem['status']): number {
    if (status === 'out') {
      return 0;
    }
    if (status === 'low') {
      return 1;
    }
    return 2;
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
    const selected = this.selected();
    if (this.mode() === 'edit' && selected) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { id: selected.sku },
      });
      return;
    }
    this.backToIndex();
  }

  openCreate(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: 'create' },
    });
  }

  openView(item: AdminInventoryItem): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: item.sku },
    });
  }

  openEdit(item: AdminInventoryItem): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: item.sku, mode: 'edit' },
    });
  }

  backToIndex(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  private applyRoute(
    id: string | null,
    modeParam: string | null,
    items: AdminInventoryItem[],
  ): void {
    if (modeParam === 'create') {
      if (this.mode() !== 'create') {
        this.form = this.blankForm();
        this.formError.set('');
        this.imageError.set('');
        this.editingSku.set(null);
        this.selected.set(null);
      }
      this.mode.set('create');
      return;
    }

    if (id) {
      const item = items.find((i) => i.sku === id) ?? null;
      if (!item) {
        this.mode.set('index');
        this.selected.set(null);
        this.editingSku.set(null);
        return;
      }
      this.selected.set(item);
      if (modeParam === 'edit') {
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
          imageUrl: item.imageUrl,
        };
        this.formError.set('');
        this.imageError.set('');
        this.mode.set('edit');
      } else {
        this.mode.set('view');
      }
      return;
    }

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
      imageUrl: this.form.imageUrl,
    };

    if (this.mode() === 'create') {
      this.data.createInventoryItem(payload).subscribe({
        next: (item) => {
          if (!item) {
            this.formError.set('SKU already exists.');
            return;
          }
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: item.sku },
          });
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
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { id: item.sku },
        });
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
      imageUrl: null as string | null,
    };
  }
}
