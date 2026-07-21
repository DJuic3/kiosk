import { AsyncPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-malfunctions-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, UpperCasePipe],
  template: `
    <section>
      <h1>Malfunctions</h1>
      <p class="sub">Hardware and peripheral faults.</p>
      <div class="card-list">
        @for (fault of malfunctions$ | async; track fault.id) {
          <article class="event-card" [attr.data-severity]="fault.severity">
            <div class="event-card__top">
              <strong>{{ fault.type }}</strong>
              <span class="pill" [attr.data-status]="fault.status">{{ fault.status }}</span>
            </div>
            <p>{{ fault.message }}</p>
            <div class="event-card__meta">
              <span>{{ fault.severity | uppercase }}</span>
              @if (fault.slotCode) {
                <span>Slot {{ fault.slotCode }}</span>
              }
              <span>{{ fault.reportedAt | date: 'dd MMM yyyy HH:mm' }}</span>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: `
    h1 {
      margin: 0 0 6px;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 0 0 20px;
      color: var(--text-muted);
    }

    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef1f8;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pill[data-status='completed'],
    .pill[data-status='ok'],
    .pill[data-status='resolved'],
    .pill[data-status='reviewed'] {
      background: #e8f5ee;
      color: var(--success);
    }

    .pill[data-status='low'],
    .pill[data-status='partial'],
    .pill[data-status='investigating'],
    .pill[data-status='warning'] {
      background: #fff4e0;
      color: var(--warning);
    }

    .pill[data-status='out'],
    .pill[data-status='voided'],
    .pill[data-status='open'],
    .pill[data-status='escalated'],
    .pill[data-status='critical'] {
      background: #ffebee;
      color: #c62828;
    }

    .card-list {
      display: grid;
      gap: 12px;
    }

    .event-card {
      padding: 16px 18px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
    }

    .event-card[data-severity='critical'],
    .event-card[data-severity='high'] {
      border-left-color: #c62828;
    }

    .event-card[data-severity='medium'],
    .event-card[data-severity='warning'] {
      border-left-color: var(--warning);
    }

    .event-card__top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .event-card p {
      margin: 0 0 10px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .event-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
    }
  `,
})
export class AdminMalfunctionsPageComponent {
  private readonly data = inject(AdminDataService);

  readonly malfunctions$ = this.data.getMalfunctions();
}
