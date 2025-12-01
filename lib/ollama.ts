export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434"
export const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "qwen2.5:1.5b"
export const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text"

export const CHUNK_LIMIT = Number(process.env.CHUNK_LIMIT) || 5
export const CHAT_TEMPERATURE = Number(process.env.CHAT_TEMPERATURE) || 0.5
export const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT) || 2
export const SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD) || 0.3
export const MAX_CONTEXT_CHARS = Number(process.env.MAX_CONTEXT_CHARS) || 4000

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export async function generateEmbedding(
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data.embedding
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
      options: {
        temperature: CHAT_TEMPERATURE,
        num_ctx: 4096,
        num_predict: 512,
      },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Chat completion failed: ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Response body is not readable")
  }

  const decoder = new TextDecoder()
  let fullResponse = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n").filter((line) => line.trim())

      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.message?.content) {
            fullResponse += json.message.content
            onChunk(json.message.content)
          }
        } catch {
          // Incomplete JSON chunk, skip
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullResponse
}
