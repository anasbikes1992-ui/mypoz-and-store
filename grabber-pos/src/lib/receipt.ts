import type { Sale } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const WIDTH = 32;

function row(left: string, right: string): string {
  const space = Math.max(1, WIDTH - left.length - right.length);
  return left + " ".repeat(space) + right;
}

/** Plain-text ticket body for thermal printers (KOT/BOT or receipt). */
export function saleToTicketText(sale: Sale): string {
  const lines: string[] = [];
  lines.push(`Sale ${sale.id}`);
  lines.push(new Date(sale.createdAt).toLocaleString("en-GB"));
  lines.push("-".repeat(WIDTH));
  for (const l of sale.lines) {
    lines.push(l.name.slice(0, WIDTH));
    lines.push(
      row(
        `  ${l.quantity} x ${formatMoney(l.unitPrice)}`,
        formatMoney(l.lineTotal),
      ),
    );
    if (l.discount > 0) {
      lines.push(row("  discount", `-${formatMoney(l.discount * l.quantity)}`));
    }
  }
  lines.push("-".repeat(WIDTH));
  lines.push(row("Subtotal", formatMoney(sale.subtotal)));
  if (sale.discountTotal > 0) {
    lines.push(row("Discount", `-${formatMoney(sale.discountTotal)}`));
  }
  lines.push(row("TOTAL", formatMoney(sale.total)));
  if (sale.paymentMethod === "cash" && sale.cashReceived != null) {
    lines.push(row("Cash", formatMoney(sale.cashReceived)));
    lines.push(row("Change", formatMoney(sale.change ?? 0)));
  }
  return lines.join("\n");
}
