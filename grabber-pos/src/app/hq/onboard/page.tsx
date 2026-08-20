"use client";

import { useState } from "react";
import { OnboardWizard } from "@/components/admin/OnboardWizard";

export default function HqOnboardPage() {
  const [run, setRun] = useState(0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Onboard</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-dim">
        Grabber Mobility Solutions pipeline — adds the client to the fleet
        roster, optionally white-labels this workspace, and can create an
        organization when the service-role key is set. Attach a login with the
        upsert-admin script; after that, use the tenant detail page to email a
        reset link or issue a temporary password.
      </p>
      <div className="mt-6">
        <OnboardWizard
          key={run}
          mode="hq"
          onDone={() => setRun((n) => n + 1)}
        />
      </div>
    </div>
  );
}
