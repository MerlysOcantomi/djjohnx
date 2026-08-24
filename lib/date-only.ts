export function toDateInput(value: unknown): string | null {
  if (value == null || value === "") return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  const text = String(value)
  const match = /^\d{4}-\d{2}-\d{2}/.exec(text)
  return match ? match[0] : text.slice(0, 10)
}
