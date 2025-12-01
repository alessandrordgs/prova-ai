import { JSDOM } from "jsdom"
import DOMPurify from "dompurify"

const window = new JSDOM("").window
const purify = DOMPurify(window)

const INJECTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\[INST\]|\[\/INST\]/gi, replacement: "" },
  { pattern: /<\|im_start\|>|<\|im_end\|>/gi, replacement: "" },
  { pattern: /<<SYS>>|<\/SYS>>/gi, replacement: "" },
  { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi, replacement: "" },
  { pattern: /you\s+are\s+now/gi, replacement: "" },
]

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  let sanitized = purify.sanitize(input, { ALLOWED_TAGS: [] })

  for (const { pattern, replacement } of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement)
  }

  return sanitized.trim()
}

export function wrapUserContent(content: string): string {
  return `<user_message>\n${content}\n</user_message>`
}

export function wrapDocumentContext(context: string): string {
  return `<document_context>\n${context}\n</document_context>`
}
