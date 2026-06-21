import { PenLine } from "lucide-react";

import type { AccountRecord } from "@/types";

export function Logo({ account }: { account: AccountRecord | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <PenLine className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-black tracking-tight">{account?.name || "Profile"}</div>
        <div className="text-xs text-muted-foreground">{account ? `@${account.handle}` : "Loading account"}</div>
      </div>
    </div>
  );
}
