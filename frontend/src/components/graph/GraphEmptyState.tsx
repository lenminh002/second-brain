import { GitBranch } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function GraphEmptyState() {
  return (
    <Card className="grid min-h-[420px] place-items-center border-dashed">
      <CardContent className="pt-6 text-center">
        <GitBranch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">No graph nodes yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Ingest a source, then graphify the knowledge base.</p>
      </CardContent>
    </Card>
  );
}
