const UUID_V4_RE
  = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type RecordLike = Record<string, unknown>

function asRecord(value: unknown): RecordLike {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid request body' })
  }
  return value as RecordLike
}

export function readRequiredStringField(
  body: unknown,
  field: string,
  opts?: { minLength?: number, maxLength?: number }
): string {
  const record = asRecord(body)
  const value = record[field]
  if (typeof value !== 'string') {
    throw createError({ statusCode: 422, statusMessage: `Field '${field}' must be a string` })
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw createError({ statusCode: 422, statusMessage: `Field '${field}' is required` })
  }
  if (opts?.minLength && trimmed.length < opts.minLength) {
    throw createError({
      statusCode: 422,
      statusMessage: `Field '${field}' must be at least ${opts.minLength} characters`
    })
  }
  if (opts?.maxLength && trimmed.length > opts.maxLength) {
    throw createError({
      statusCode: 422,
      statusMessage: `Field '${field}' must be at most ${opts.maxLength} characters`
    })
  }
  return trimmed
}

export function readOptionalStringField(
  body: unknown,
  field: string,
  opts?: { minLength?: number, maxLength?: number }
): string | undefined {
  const record = asRecord(body)
  if (!(field in record) || record[field] === undefined || record[field] === null) {
    return undefined
  }
  return readRequiredStringField(body, field, opts)
}

export function ensureUuid(value: string, field: string): void {
  if (!UUID_V4_RE.test(value)) {
    throw createError({ statusCode: 422, statusMessage: `Field '${field}' must be a valid UUID` })
  }
}

export function readRequiredDateField(body: unknown, field: string): string {
  const value = readRequiredStringField(body, field, { minLength: 10, maxLength: 10 })
  if (!DATE_RE.test(value)) {
    throw createError({ statusCode: 422, statusMessage: `Field '${field}' must be YYYY-MM-DD` })
  }
  return value
}
