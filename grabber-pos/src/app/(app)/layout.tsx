import { TopBar } from "@/components/shell/TopBar";
import { PageTransition } from "@/components/shell/PageTransition";
import { BrandProvider } from "@/components/brand/BrandProvider";
import { LicenceBanner } from "@/components/brand/LicenceBanner";
import { IdleLock } from "@/components/shell/IdleLock";
import { OfflineSetup } from "@/components/OfflineSetup";
import { OnlineOrderAlerts } from "@/components/commerce/admin/OnlineOrderAlerts";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandProvider>
      <div className="relative flex min-h-screen flex-col">
        {/* Futuristic ambient depth behind every app page (grid + aurora glow). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="fz-grid absolute inset-0 opacity-30" />
          <div className="fz-float absolute -left-24 top-8 h-80 w-80 rounded-full bg-[var(--glow)] blur-3xl" />
          <div
            className="fz-float absolute right-0 top-[38%] h-72 w-72 rounded-full bg-[var(--glow-cool)] blur-3xl"
            style={{ animationDelay: "1.6s" }}
          />
        </div>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <div className="relative z-10 flex min-h-screen flex-col">
          <TopBar />
          <LicenceBanner />
          <main id="main" className="flex-1" tabIndex={-1}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <IdleLock />
        <OfflineSetup />
        <OnlineOrderAlerts />
      </div>
    </BrandProvider>
  );
}
