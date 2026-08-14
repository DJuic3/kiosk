import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TouchButtonComponent } from '../touch-button/touch-button.component';

@Component({
  selector: 'app-yamurai-assistant',
  standalone: true,
  imports: [FormsModule, TouchButtonComponent],
  template: `
    <div class="yamurai">
      @if (open()) {
        <div class="yamurai__panel">
          <header>
            <strong>Yamurai</strong>
            <button type="button" (click)="open.set(false)">×</button>
          </header>
          <div class="yamurai__chat">
            @for (msg of messages(); track $index) {
              <div class="bubble" [attr.data-from]="msg.from">{{ msg.text }}</div>
            }
          </div>
          <div class="yamurai__quick">
            @for (q of quick; track q) {
              <button type="button" (click)="ask(q)">{{ q }}</button>
            }
          </div>
          <div class="yamurai__input">
            <input [(ngModel)]="draft" placeholder="Ask Yamurai…" (keyup.enter)="send()" />
            <app-touch-button variant="primary" (pressed)="send()">Send</app-touch-button>
          </div>
        </div>
      }
      <button type="button" class="yamurai__fab" (click)="open.set(!open())">
        {{ open() ? 'Close' : 'Yamurai' }}
      </button>
    </div>
  `,
  styles: `
    .yamurai {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 80;
      display: grid;
      justify-items: end;
      gap: 10px;
      pointer-events: none;
    }

    .yamurai__fab,
    .yamurai__panel {
      pointer-events: auto;
    }
    .yamurai__fab {
      min-height: 48px;
      padding: 0 18px;
      border: none;
      border-radius: 999px;
      background: var(--primary);
      color: #fff;
      font-weight: 800;
      box-shadow: 0 8px 24px rgba(26, 53, 163, 0.35);
      cursor: pointer;
    }
    .yamurai__panel {
      width: min(360px, calc(100vw - 36px));
      display: grid;
      grid-template-rows: auto 1fr auto auto;
      height: 420px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid var(--border);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
      overflow: hidden;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #0f1f66;
      color: #fff;
    }
    header button {
      border: none;
      background: transparent;
      color: #fff;
      font-size: 1.4rem;
      cursor: pointer;
    }
    .yamurai__chat {
      display: grid;
      gap: 8px;
      align-content: start;
      padding: 12px;
      overflow: auto;
      background: var(--bg);
    }
    .bubble {
      max-width: 90%;
      padding: 10px 12px;
      border-radius: 14px;
      background: #fff;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .bubble[data-from='user'] {
      justify-self: end;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }
    .yamurai__quick {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 10px;
      border-top: 1px solid var(--border);
    }
    .yamurai__quick button {
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }
    .yamurai__input {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      padding: 10px;
      border-top: 1px solid var(--border);
    }
    .yamurai__input input {
      min-height: 44px;
      padding: 0 12px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font: inherit;
    }
  `,
})
export class YamuraiAssistantComponent {
  readonly open = signal(false);
  readonly messages = signal<{ from: 'bot' | 'user'; text: string }[]>([
    {
      from: 'bot',
      text: 'Hi, I’m Yamurai. I can help with vouchers, refunds, payments, or collecting your items.',
    },
  ]);
  draft = '';
  readonly quick = [
    'Voucher not working',
    'Where is my item?',
    'I need a refund',
    'Payment help',
  ];

  ask(text: string): void {
    this.draft = text;
    this.send();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.messages.update((m) => [...m, { from: 'user', text }]);
    this.draft = '';
    const reply = this.replyFor(text);
    setTimeout(() => {
      this.messages.update((m) => [...m, { from: 'bot', text: reply }]);
    }, 450);
  }

  private replyFor(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('voucher')) {
      return 'Tap Collect with voucher on the home screen and enter your code (e.g. VCH-48291). Invalid or expired codes can be escalated to a human agent.';
    }
    if (t.includes('refund') || t.includes('credit')) {
      return 'If dispense failed after retries, the kiosk raises a fiscalised credit note automatically. Keep your fiscal receipt as proof of payment.';
    }
    if (t.includes('payment')) {
      return 'You can pay with EcoCash, QR, or card. If payment declines, try another method at checkout. Cash is not enabled on this machine.';
    }
    if (t.includes('item') || t.includes('collect') || t.includes('bin')) {
      return 'After a successful dispense, take items from the collection bin below the screen. A receipt is also available to download.';
    }
    return 'I can help with vouchers, refunds, payments, and collection. Tap a quick question or type your issue.';
  }
}
