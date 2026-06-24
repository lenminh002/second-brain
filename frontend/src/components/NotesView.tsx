import { useEffect, useState } from "react";
import { BookOpen, FileText, Pencil, Bot, Trash2 } from "lucide-react";

import { GraphView } from "@/components/GraphView";
import { SourceContent } from "@/components/SourceContent";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { deleteSource, updateSourceContent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { errorMessage, formatDate } from "@/lib/format";
import type { KnowledgeGraph, NotesMode, SourceDetail, SourceRecord, SourceType } from "@/types";

export function NotesView({
  chatPanel,
  conceptCount,
  graph,
  notesMode,
  notice,
  readyCount,
  refreshKnowledge,
  selectedSourceDetail,
  selectedSourceId,
  setNotice,
  setNotesMode,
  setSelectedSourceId,
  setSelectedSourceDetail,
  sourcesByType,
  sidebarTab,
  setSidebarTab,
}: {
  chatPanel: React.ReactNode;
  conceptCount: number;
  graph: KnowledgeGraph;
  notesMode: NotesMode;
  notice: string;
  readyCount: number;
  refreshKnowledge: () => Promise<void>;
  selectedSourceDetail: SourceDetail | null;
  selectedSourceId: string | null;
  setNotice: (notice: string) => void;
  setNotesMode: (mode: NotesMode) => void;
  setSelectedSourceId: (id: string | null) => void;
  setSelectedSourceDetail: (source: SourceDetail | null) => void;
  sourcesByType: Record<SourceType, SourceRecord[]>;
  sidebarTab: "chat" | "vault";
  setSidebarTab: (tab: "chat" | "vault") => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [draftContent, setDraftContent] = useState("");

  const selectedContent = selectedSourceDetail?.content ?? "";
  const canEdit = selectedSourceDetail?.status === "ready";
  const canDelete = Boolean(selectedSourceDetail && selectedSourceDetail.status !== "processing");
  const saveDisabled = (
    isSaving
    || !draftContent.trim()
    || draftContent.trim() === selectedContent.trim()
  );

  useEffect(() => {
    setIsEditing(false);
    setIsSaving(false);
    setDraftContent(selectedSourceDetail?.content ?? "");
  }, [selectedSourceDetail?.id]);

  function startEditing() {
    setDraftContent(selectedContent);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftContent(selectedContent);
    setIsEditing(false);
  }

  async function saveEdit() {
    if (!selectedSourceDetail || saveDisabled) return;
    setIsSaving(true);
    try {
      const updatedSource = await updateSourceContent(selectedSourceDetail.id, draftContent);
      setSelectedSourceDetail(updatedSource);
      await refreshKnowledge();
      setNotice("");
      setIsEditing(false);
      setDraftContent(updatedSource.content ?? "");
    } catch (error: unknown) {
      setNotice(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!selectedSourceDetail || isDeleting) return;
    const sourceId = selectedSourceDetail.id;
    const remainingSources = (Object.values(sourcesByType).flat() as SourceRecord[])
      .filter((source) => source.id !== sourceId);
    const nextSourceId = remainingSources[0]?.id ?? null;
    setIsDeleting(true);
    try {
      await deleteSource(sourceId);
      setIsDeleteDialogOpen(false);
      setIsEditing(false);
      setDraftContent("");
      setSelectedSourceDetail(null);
      setSelectedSourceId(nextSourceId);
      await refreshKnowledge();
      setNotice("");
    } catch (error: unknown) {
      setNotice(errorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-74px)] min-w-0 border-r @container">
      <section className="h-[calc(100vh-74px)] min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {/* Desktop header to switch between Vault and AI Chat */}
          <div className={cn("hidden h-14 items-center justify-between border-b bg-background px-6 lg:flex", notesMode === "graph" && "lg:hidden")}>
          <h1 className="font-bold">Memories</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setSidebarTab(sidebarTab === "vault" ? "chat" : "vault")}
                size="icon"
                variant="outline"
                className="h-9 w-9"
              >
                {sidebarTab === "vault" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarTab === "vault" ? "Switch to Librarian Chat" : "Switch to Vault"}
            </TooltipContent>
          </Tooltip>
        </div>

          {/* Mobile-only header to open the Vault in a drawer */}
          <div className="flex items-center justify-between px-6 py-3 lg:hidden">
          <div className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-4 w-4 text-primary" />
            Memories
          </div>
          <Drawer>
            <DrawerTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Vault
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader className="border-b pb-3">
                <DrawerTitle className="text-left flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Vault
                </DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="h-[calc(80vh-70px)] pb-6">
                <div className="space-y-4 p-4">
                  {(["note", "pdf"] as const).map((type) => (
                    <div key={type}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{type}</div>
                      <div className="space-y-1">
                        {sourcesByType[type].length ? (
                          sourcesByType[type].map((source) => (
                            <DrawerClose asChild key={source.id}>
                              <button
                                className={cn(
                                  "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors duration-150",
                                  selectedSourceId === source.id && "bg-muted font-medium",
                                )}
                                onClick={() => { setSelectedSourceId(source.id); setNotesMode("note"); }}
                                type="button"
                              >
                                <span className="flex w-full items-start justify-between gap-2 min-w-0">
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium">{source.title}</span>
                                    <span className="text-xs text-muted-foreground">{formatDate(source.created_at)}</span>
                                  </span>
                                  {source.status !== "ready" && <StatusBadge status={source.status} />}
                                </span>
                              </button>
                            </DrawerClose>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No {type} sources</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DrawerContent>
          </Drawer>
        </div>


          <div className={cn("mx-auto w-full p-5", notesMode === "graph" ? "max-w-7xl" : "max-w-4xl")}>
            {notice && <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive break-words">{notice}</div>}
            {notesMode === "graph" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Knowledge Graph</h2>
                    <p className="text-sm text-muted-foreground">Graphified concepts from the current knowledge base.</p>
                  </div>
                </div>
                <GraphView graph={graph} onRefresh={() => { void refreshKnowledge(); }} />
              </div>
            ) : selectedSourceDetail ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl break-words">{selectedSourceDetail.title}</CardTitle>
                      <CardDescription>
                        {selectedSourceDetail.type} · {formatDate(selectedSourceDetail.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedSourceDetail.status} />
                      {isEditing ? (
                        <>
                          <Button
                            disabled={isSaving}
                            onClick={cancelEditing}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={saveDisabled}
                            onClick={() => { void saveEdit(); }}
                            size="sm"
                            type="button"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                        </>
                      ) : (
                        <>
                          {canEdit ? (
                            <Button onClick={startEditing} size="sm" type="button" variant="outline">
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              disabled={isDeleting}
                              onClick={() => setIsDeleteDialogOpen(true)}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                  {selectedSourceDetail.error && <p className="text-sm text-destructive break-words">{selectedSourceDetail.error}</p>}
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <SourceContent
                    draftContent={draftContent}
                    isEditing={isEditing}
                    isSaving={isSaving}
                    onDraftContentChange={setDraftContent}
                    source={selectedSourceDetail}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="grid min-h-[420px] place-items-center border-dashed">
                <CardContent className="pt-6 text-center">
                  <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold">Select a note</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ingest a source or choose one from the vault.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete memory?</DialogTitle>
              <DialogDescription>
                This will permanently remove "{selectedSourceDetail?.title}" and delete its generated post from Home.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button disabled={isDeleting} type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                disabled={isDeleting}
                onClick={() => { void confirmDelete(); }}
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete memory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
