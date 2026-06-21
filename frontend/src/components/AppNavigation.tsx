import {
  BookOpen,
  CircleUserRound,
  GitBranch,
  Home,
  Menu,
  PenLine,
  Search,
  Upload,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AccountRecord, ActiveView, NotesMode } from "@/types";

export function Logo({ account }: { account: AccountRecord | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <PenLine className="h-5 w-5" />
      </div>
      <div>
        <div className="brand text-xl leading-none">{account?.name || "Profile"}</div>
        <div className="text-xs text-muted-foreground">{account ? `@${account.handle}` : "Loading account"}</div>
      </div>
    </div>
  );
}

export function TopBar({ account }: { account: AccountRecord | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b bg-background px-4 lg:px-6">
      <Logo account={account} />
      <div className="hidden w-full max-w-sm items-center gap-2 rounded-md bg-muted px-3 py-2 md:flex">
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

type NavProps = {
  account: AccountRecord | null;
  activeView: ActiveView;
  notesMode: NotesMode;
  setActiveView: (view: ActiveView) => void;
  setNotesMode: (mode: NotesMode) => void;
  isMinimized: boolean;
  toggleMinimize: () => void;
};

export function SidebarNav({
  account,
  activeView,
  notesMode,
  setActiveView,
  setNotesMode,
  isMinimized,
  toggleMinimize,
}: NavProps) {
  const items = [
    { label: "Home", icon: Home, active: activeView === "home", action: () => setActiveView("home") },
    { label: "Notes", icon: BookOpen, active: activeView === "notes" && notesMode === "note", action: () => { setActiveView("notes"); setNotesMode("note"); } },
    { label: "Graph", icon: GitBranch, active: activeView === "notes" && notesMode === "graph", action: () => { setActiveView("notes"); setNotesMode("graph"); } },
    { label: "Profile", icon: CircleUserRound, active: activeView === "profile", action: () => setActiveView("profile") },
  ];

  const digestButton = (
    <Button
      className={cn(
        "w-full transition-all duration-300",
        isMinimized ? "justify-center px-0 h-10 w-10 mx-auto rounded-full" : "gap-2"
      )}
      onClick={() => setActiveView("digest")}
      size={isMinimized ? "icon" : "default"}
    >
      <Upload className="h-4 w-4 shrink-0" />
      {!isMinimized && <span>Digest Source</span>}
    </Button>
  );

  return (
    <aside
      className={cn(
        "sticky top-[74px] hidden h-[calc(100vh-74px)] border-r bg-background py-5 lg:flex flex-col transition-all duration-300 ease-in-out",
        isMinimized ? "px-3" : "px-5"
      )}
    >
      <div className={cn("mb-4 flex items-center", isMinimized ? "justify-center" : "justify-start")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-9 w-9 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
              onClick={toggleMinimize}
              size="icon"
              variant="ghost"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isMinimized ? "Expand menu" : "Collapse menu"}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className={cn("mb-5 flex items-center transition-all duration-300", isMinimized ? "flex-col gap-2 justify-center" : "gap-3")}>
        <Avatar className={cn("transition-all duration-300", isMinimized ? "h-10 w-10" : "h-14 w-14")}>
          {account?.avatar_url && <AvatarImage alt={account.name} src={account.avatar_url} />}
          <AvatarFallback>{account?.initials || ""}</AvatarFallback>
        </Avatar>
        {!isMinimized && (
          <div className="transition-all duration-300 opacity-100 whitespace-nowrap overflow-hidden">
            <div className="font-semibold">{account?.name || "Loading"}</div>
            <div className="text-sm text-muted-foreground">{account ? `@${account.handle}` : "Loading account"}</div>
          </div>
        )}
      </div>

      <nav className="space-y-1 flex-grow flex flex-col items-stretch">
        {items.map((item) => {
          const buttonContent = (
            <Button
              className={cn(
                "transition-all duration-300",
                isMinimized ? "h-10 w-10 mx-auto justify-center" : "w-full justify-start gap-3 text-base",
                item.active ? "text-foreground" : "text-muted-foreground"
              )}
              key={item.label}
              onClick={item.action}
              variant={item.active ? "secondary" : "ghost"}
              size={isMinimized ? "icon" : "default"}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isMinimized && <span>{item.label}</span>}
            </Button>
          );

          if (isMinimized) {
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.label}>{buttonContent}</div>;
        })}

      </nav>

      <div className="pt-4 border-t">
        {isMinimized ? (
          <Tooltip>
            <TooltipTrigger asChild>{digestButton}</TooltipTrigger>
            <TooltipContent side="right">Digest Source</TooltipContent>
          </Tooltip>
        ) : (
          digestButton
        )}
      </div>
    </aside>
  );
}

export function MobileNav({ activeView, setActiveView }: Pick<NavProps, "activeView" | "setActiveView">) {
  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background px-2 py-2 lg:hidden">
      <Button className="h-12 flex-col gap-1 rounded-md text-[11px] font-medium" onClick={() => setActiveView("home")} variant={activeView === "home" ? "secondary" : "ghost"}>
        <Home className="h-5 w-5" />
        Home
      </Button>
      <Button className="h-12 flex-col gap-1 rounded-md text-[11px] font-medium" onClick={() => setActiveView("notes")} variant={activeView === "notes" ? "secondary" : "ghost"}>
        <BookOpen className="h-5 w-5" />
        Notes
      </Button>
      <Button className="h-12 flex-col gap-1 rounded-md text-[11px] font-medium" onClick={() => setActiveView("digest")} variant={activeView === "digest" ? "secondary" : "ghost"}>
        <Upload className="h-5 w-5" />
        Digest
      </Button>
      <Button className="h-12 flex-col gap-1 rounded-md text-[11px] font-medium" onClick={() => setActiveView("profile")} variant={activeView === "profile" ? "secondary" : "ghost"}>
        <CircleUserRound className="h-5 w-5" />
        Profile
      </Button>
    </nav>
  );
}
