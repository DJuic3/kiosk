import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-history-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  template: `
    <section>
      <h1>Activity history</h1>
      <p class="sub">Chronological log across sales, stock, faults and security.</p>
      <div class="timeline">
        @for (event of history$ | async; track event.id) {
          <article class="timeline__item">
            <span class="timeline__cat">{{ event.category }}</span>
            <div>
              <strong>{{ event.summary }}</strong>
              <p>{{ event.detail }}</p>
              <small>{{ event.at | date: 'dd MMM yyyy HH:mm' }}</small>
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

    .timeline {
      display: grid;
      gap: 12px;
    }

    .timeline__item {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--border);
    }

    .timeline__cat {
      height: fit-content;
      padding: 4px 8px;
      border-radius: 8px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
    }

    .timeline__item p {
      margin: 4px 0;
      color: var(--text-muted);
    }

    .timeline__item small {
      color: var(--text-muted);
    }

    @media (max-width: 980px) {
      .timeline__item {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminHistoryPageComponent {
  private readonly data = inject(AdminDataService);

  readonly history$ = this.data.getHistory();
}
