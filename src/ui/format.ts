export function nowLocalInput(): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatTime(value: string): string {
  return value.replace("T", " ");
}

export function formatCent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} 音分`;
}

export function formatHz(value: number): string {
  return `${value.toFixed(2)} Hz`;
}

export function formatPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}
