export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
