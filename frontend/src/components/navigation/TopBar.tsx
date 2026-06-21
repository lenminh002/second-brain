import { Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AccountRecord } from "@/types";
import { Logo } from "./Logo";

export function TopBar({ account }: { account: AccountRecord | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b bg-background/95 px-5 backdrop-blur">
      <Logo account={account} />
      <div className="hidden w-full max-w-md items-center gap-2 rounded-full border bg-muted/35 px-3 py-2 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search notes, concepts, posts..." />
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          {account?.avatar_url && <AvatarImage alt={account.name} src={account.avatar_url} />}
          <AvatarFallback>{account?.initials || ""}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
