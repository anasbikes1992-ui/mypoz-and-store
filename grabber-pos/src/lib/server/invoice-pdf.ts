import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Sale } from "@/lib/types";
import type { Settings } from "@/lib/settings";

function money(n: number): string {
  return "Rs " + n.toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

/** Render a one-page A5 invoice for a sale as PDF bytes. */
export async function buildInvoicePdf(
  sale: Sale,
  settings: Settings,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]); // A5 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const accent = rgb(0.02, 0.55, 0.4);
  const ink = rgb(0.1, 0.11, 0.13);
  const dim = rgb(0.42, 0.46, 0.52);
  const M = 36;
  let y = 560;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 9,
    f = font,
    color = ink,
  ) => page.drawText(s, { x, y: yy, size, font: f, color });

  const right = (s: string, xRight: number, yy: number, size = 9, f = font, color = ink) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y: yy, size, font: f, color });
  };

  // Header
  text(settings.businessName || "GRABBER POS", M, y, 18, bold, accent);
  y -= 16;
  if (settings.address) {
    text(settings.address.replace(/\n/g, ", ").slice(0, 60), M, y, 8, font, dim);
    y -= 11;
  }
  const contact = [settings.phone, settings.email].filter(Boolean).join("  ·  ");
  if (contact) {
    text(contact, M, y, 8, font, dim);
    y -= 11;
  }

  y -= 8;
  text("INVOICE", M, y, 12, bold, ink);
  right(sale.id, 384, y, 11, bold, accent);
  y -= 14;
  text(new Date(sale.createdAt).toLocaleString("en-GB"), M, y, 8, font, dim);
  if (sale.customerName) right(`Customer: ${sale.customerName}`, 384, y, 8, font, dim);
  y -= 6;
  if (sale.customerMobile) {
    right(sale.customerMobile, 384, y, 8, font, dim);
  }

  // Table header
  y -= 14;
  page.drawLine({ start: { x: M, y }, end: { x: 384, y }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });
  y -= 12;
  text("Item", M, y, 8, bold, dim);
  right("Qty", 250, y, 8, bold, dim);
  right("Price", 320, y, 8, bold, dim);
  right("Total", 384, y, 8, bold, dim);
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: 384, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) });
  y -= 14;

  for (const l of sale.lines) {
    text(l.name.slice(0, 34), M, y, 9);
    right(String(l.quantity), 250, y, 9);
    right(money(l.unitPrice), 320, y, 9);
    right(money(l.lineTotal), 384, y, 9);
    y -= 15;
    if (y < 120) break;
  }

  // Totals
  y -= 4;
  page.drawLine({ start: { x: M, y }, end: { x: 384, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) });
  y -= 16;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, 230, y, strong ? 11 : 9, strong ? bold : font, strong ? ink : dim);
    right(value, 384, y, strong ? 12 : 9, strong ? bold : font, strong ? accent : ink);
    y -= strong ? 18 : 14;
  };
  totalRow("Subtotal", money(sale.subtotal));
  if (sale.discountTotal > 0) totalRow("Item discounts", "-" + money(sale.discountTotal));
  if (sale.finalDiscount > 0) totalRow("Final discount", "-" + money(sale.finalDiscount));
  if (sale.serviceCharge > 0) totalRow("Service charge", money(sale.serviceCharge));
  totalRow("TOTAL", money(sale.total), true);
  if (sale.cashReceived != null) {
    totalRow("Paid", money(sale.cashReceived));
    if (sale.change != null && sale.change > 0) totalRow("Change", money(sale.change));
  }

  // Footer
  text(
    settings.receiptFooter || "Thank you for your business!",
    M,
    56,
    9,
    font,
    dim,
  );
  text(`Payment: ${sale.paymentMethod}`, M, 42, 8, font, dim);

  return doc.save();
}
