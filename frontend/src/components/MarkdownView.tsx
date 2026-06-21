export function MarkdownView({ markdown }: { markdown: string }) {
  if (!markdown) {
    return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No note selected.</div>;
  }

  return (
    <div className="markdown-body">
      {markdown
        .split("\n")
        .filter((line) => !line.startsWith("---") && !line.startsWith("id:") && !line.startsWith("type:") && !line.startsWith("title:") && !line.startsWith("source_url:") && !line.startsWith("created_at:"))
        .map((line, index) => {
          if (line.startsWith("# ")) return <h1 key={index}>{line.replace("# ", "")}</h1>;
          if (line.startsWith("## ")) return <h2 key={index}>{line.replace("## ", "")}</h2>;
          if (line.startsWith("- ")) return <li key={index}>{line.replace("- ", "")}</li>;
          if (!line.trim()) return <div key={index} className="h-2" />;
          return <p key={index}>{line}</p>;
        })}
    </div>
  );
}
