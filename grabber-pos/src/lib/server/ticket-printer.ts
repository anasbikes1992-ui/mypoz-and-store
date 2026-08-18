import "server-only";
import {
  printer as ThermalPrinter,
  types as PrinterTypes,
} from "node-thermal-printer";
import type { TicketStation } from "@/lib/types";

/**
 * Port of the legacy Electron `print-ticket` handler.
 * Printer IPs come from env instead of being hardcoded:
 *   PRINTER_KOT_IP (kitchen order ticket), PRINTER_BOT_IP (bar order ticket)
 */
const STATION_ENV: Record<TicketStation, string> = {
  KOT: "PRINTER_KOT_IP",
  BOT: "PRINTER_BOT_IP",
  RECEIPT: "PRINTER_RECEIPT_IP",
  DRAWER: "PRINTER_RECEIPT_IP",
};

const STATION_HEADER: Record<Exclude<TicketStation, "DRAWER">, string | null> =
  {
    KOT: "===== KITCHEN ORDER =====",
    BOT: "===== BAR ORDER =====",
    RECEIPT: null,
  };

export interface PrintResult {
  success: boolean;
  message: string;
}

export async function printTicket(
  station: TicketStation,
  content: string,
): Promise<PrintResult> {
  const ip = process.env[STATION_ENV[station]];
  if (!ip) {
    return {
      success: false,
      message: `${STATION_ENV[station]} is not configured in .env`,
    };
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${ip}`,
  });

  try {
    const connected = await printer.isPrinterConnected();
    if (!connected) {
      return { success: false, message: `Cannot reach printer at ${ip}` };
    }
    printer.clear();

    if (station === "DRAWER") {
      printer.openCashDrawer();
      await printer.execute();
      return { success: true, message: `Drawer kick sent (${ip})` };
    }

    printer.alignCenter();
    const header = STATION_HEADER[station];
    if (header) {
      printer.println(header);
      printer.drawLine();
    }
    printer.alignLeft();
    printer.println(content);
    printer.drawLine();
    printer.cut();
    await printer.execute();
    return { success: true, message: `Printed to ${station} (${ip})` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Print failed: ${message}` };
  }
}

/** ESC/POS cash-drawer pulse via the receipt printer. */
export async function kickCashDrawer(): Promise<PrintResult> {
  return printTicket("DRAWER", "");
}
