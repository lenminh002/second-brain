import { FormEvent } from "react";
import { Bot, Loader2, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

export function ChatPanel({
  chatInput,
  chatLog,
  isChatting,
  setChatInput,
  submitChat,
}: {
  chatInput: string;
  chatLog: ChatMessage[];
  isChatting: boolean;
  setChatInput: (value: string) => void;
  submitChat: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col rounded-none border-0 border-l shadow-none lg:rounded-none">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>AI Sidebar</CardTitle>
        </div>
        <CardDescription>Ask across notes, graph nodes, and generated posts.</CardDescription>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {chatLog.length ? (
            chatLog.map((message, index) => (
              <div
                className={cn(
                  "rounded-2xl border p-3 text-sm leading-6",
                  message.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted/45",
                )}
                key={`${message.role}-${index}`}
              >
                <p>{message.text}</p>
                {!!message.citations?.length && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {message.citations.map((citation) => (
                      <Badge key={`${citation.source_id}-${citation.section}`} variant="secondary">
                        {citation.source_title} / {citation.section}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Ask what your saved knowledge says about a topic.
            </div>
          )}
        </div>
      </ScrollArea>
      <form className="flex gap-2 border-t p-4" onSubmit={submitChat}>
        <Input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask your KB..." />
        <Button disabled={isChatting} type="submit">
          {isChatting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}
