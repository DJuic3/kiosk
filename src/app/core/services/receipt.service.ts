import { Injectable } from '@angular/core';
import { MachineInfo } from '../models/machine.model';
import { Order } from '../models/order.model';
import { PaymentIntent } from '../models/payment.model';

export interface ReceiptData {
  order: Order;
  machine: MachineInfo;
  receiptNumber: string;
  payment?: PaymentIntent | null;
}

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  async downloadReceipt(data: ReceiptData): Promise<void> {
    const logoDataUrl = await this.loadLogoAsDataUrl();
    const html = this.buildReceiptHtml(data, logoDataUrl);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async loadLogoAsDataUrl(): Promise<string> {
    try {
      const response = await fetch('images/EconetLogo.png');
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  private buildReceiptHtml(data: ReceiptData, logoDataUrl: string): string {
    const { order, machine, receiptNumber, payment } = data;
    const issuedAt = new Date(order.createdAt || Date.now());
    const dateStr = issuedAt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = issuedAt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const lines =
      order.lines.length > 0
        ? order.lines
        : (order.dispenseResults ?? []).map((r) => ({
            product: {
              name: r.productName,
              sku: r.slotCode,
              currency: order.currency,
            },
            quantity: 1,
            unitPrice: 0,
          }));

    const itemRows = lines
      .map((line) => {
        const name = line.product.name;
        const qty = line.quantity;
        const unit = line.unitPrice;
        const total = unit * qty;
        return `
          <tr>
            <td class="item-name">${this.escape(name)}</td>
            <td class="num">${qty}</td>
            <td class="num">${this.money(unit, order.currency)}</td>
            <td class="num">${this.money(total, order.currency)}</td>
          </tr>`;
      })
      .join('');

    const paymentMethod = (payment?.method ?? order.paymentMethod ?? '—').toString().toUpperCase();
    const paymentRef = payment?.reference ?? '—';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${this.escape(receiptNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #e8e8e8;
      font-family: "Courier New", Courier, monospace;
    }
    .ticket {
      width: 320px;
      margin: 0 auto;
      padding: 20px 18px 28px;
      background: #fff;
      color: #111;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .center { text-align: center; }
    .logo {
      display: block;
      width: 170px;
      height: auto;
      margin: 0 auto 10px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .muted { color: #444; font-size: 11px; line-height: 1.45; }
    .dash {
      border: none;
      border-top: 1px dashed #999;
      margin: 12px 0;
    }
    .meta { font-size: 11px; line-height: 1.55; }
    .meta div { display: flex; justify-content: space-between; gap: 8px; }
    .meta span:last-child { font-weight: 700; text-align: right; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      text-align: left;
      padding-bottom: 6px;
      border-bottom: 1px dashed #999;
      font-size: 10px;
      text-transform: uppercase;
    }
    th.num, td.num { text-align: right; }
    td { padding: 8px 0 0; vertical-align: top; }
    .item-name { padding-right: 6px; }
    .totals { font-size: 12px; }
    .totals .row {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .totals .grand {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 2px solid #111;
      font-size: 14px;
      font-weight: 700;
    }
    .thanks {
      margin-top: 14px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
    }
    .barcode {
      margin: 14px auto 0;
      width: 180px;
      height: 36px;
      background:
        repeating-linear-gradient(
          90deg,
          #111 0,
          #111 2px,
          transparent 2px,
          transparent 4px
        );
    }
    .footer-note {
      margin-top: 10px;
      text-align: center;
      font-size: 10px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Econet Wireless" />` : '<h1>ECONET WIRELESS</h1>'}
      <h1>Self-Service Kiosk</h1>
      <div class="muted">
        ${this.escape(machine.name)}<br />
        ${this.escape(machine.location)}
      </div>
    </div>

    <hr class="dash" />

    <div class="meta">
      <div><span>Receipt No</span><span>${this.escape(receiptNumber)}</span></div>
      <div><span>Order ID</span><span>${this.escape(order.id)}</span></div>
      <div><span>Machine ID</span><span>${this.escape(machine.id)}</span></div>
      <div><span>Location</span><span>${this.escape(machine.location)}</span></div>
      <div><span>Date</span><span>${dateStr}</span></div>
      <div><span>Time</span><span>${timeStr}</span></div>
    </div>

    <hr class="dash" />

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <hr class="dash" />

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${this.money(order.total, order.currency)}</span></div>
      <div class="row"><span>Tax</span><span>Included</span></div>
      <div class="row grand"><span>TOTAL</span><span>${this.money(order.total, order.currency)}</span></div>
    </div>

    <hr class="dash" />

    <div class="meta">
      <div><span>Payment</span><span>${this.escape(paymentMethod)}</span></div>
      <div><span>Reference</span><span>${this.escape(paymentRef)}</span></div>
      <div><span>Status</span><span>PAID</span></div>
    </div>

    <p class="thanks">Thank you for shopping with Econet</p>
    <div class="barcode" aria-hidden="true"></div>
    <p class="footer-note">Keep this receipt for your records<br />Goods dispensed from ${this.escape(machine.id)}</p>
  </div>
</body>
</html>`;
  }

  private money(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
