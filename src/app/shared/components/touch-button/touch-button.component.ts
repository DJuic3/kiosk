import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-touch-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="touch-btn"
      [class.touch-btn--primary]="variant() === 'primary'"
      [class.touch-btn--secondary]="variant() === 'secondary'"
      [class.touch-btn--danger]="variant() === 'danger'"
      [class.touch-btn--ghost]="variant() === 'ghost'"
      [class.touch-btn--block]="block()"
      [disabled]="disabled()"
      (click)="pressed.emit()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    .touch-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 58px;
      min-width: 128px;
      padding: 14px 28px;
      border: 2px solid transparent;
      border-radius: 16px;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
    }

    .touch-btn:active:not(:disabled) {
      transform: scale(0.97);
    }

    .touch-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .touch-btn--block {
      width: 100%;
    }

    .touch-btn--primary {
      background: linear-gradient(180deg, #2444b8 0%, var(--primary) 100%);
      color: #fff;
      box-shadow: 0 10px 24px rgba(26, 53, 163, 0.28);
    }

    .touch-btn--secondary {
      background: var(--surface);
      border-color: var(--border);
      color: var(--text);
    }

    .touch-btn--danger {
      background: #c62828;
      color: #fff;
    }

    .touch-btn--ghost {
      background: transparent;
      color: var(--primary);
    }
  `,
})
export class TouchButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  readonly block = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
