import { NextRequest } from "next/server"
import { prisma } from "@/lib/database/prisma"
import { cookies } from "next/headers"
import { Prisma } from "@/generated/prisma/client"
import {
  generateEmbedding,
  streamChatCompletion,
  ChatMessage,
  CHUNK_LIMIT,
  HISTORY_LIMIT,
  SIMILARITY_THRESHOLD,
  MAX_CONTEXT_CHARS,
} from "@/lib/ollama"

async function hybridSearch(
  chatId: string,
  query: string,
  queryEmbedding: number[],
  limit: number = CHUNK_LIMIT
) {
  const embeddingString = `[${queryEmbedding.join(",")}]`

  try {
    const chunksCount = await prisma.sourceChunks.count({
      where: {
        Source: {
          chatId: chatId,
        },
      },
    })

    if (chunksCount === 0) {
      return []
    }

    const chunks = await prisma.$queryRaw<
      Array<{
        id: string
        content: string
        metadata: Record<string, unknown>
        similarity_score: number
      }>
    >(Prisma.sql`
      WITH semantic_search AS (
        SELECT 
          id,
          content,
          metadata,
          1 - (embedding <=> ${embeddingString}::vector) AS embedding_score
        FROM "SourceChunks"
        WHERE "sourceId" IN (
          SELECT id FROM "Source" WHERE "chatId" = ${chatId}
        )
        AND embedding IS NOT NULL
      ),
      text_search AS (
        SELECT 
          id,
          ts_rank_cd(to_tsvector('portuguese', content), plainto_tsquery('portuguese', ${query})) AS text_score
        FROM "SourceChunks"
        WHERE "sourceId" IN (
          SELECT id FROM "Source" WHERE "chatId" = ${chatId}
        )
      )
      SELECT 
        s.id,
        s.content,
        s.metadata,
        (COALESCE(s.embedding_score, 0) * 0.7 + COALESCE(t.text_score, 0) * 0.3) AS similarity_score
      FROM semantic_search s
      LEFT JOIN text_search t ON s.id = t.id
      ORDER BY similarity_score DESC
      LIMIT ${limit}
    `)

    return chunks.filter(c => c.similarity_score >= SIMILARITY_THRESHOLD)
  } catch (error) {
    console.error("[hybridSearch] Error:", error)
    return []
  }
}

async function getChatHistory(chatId: string, limit: number = HISTORY_LIMIT) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
    select: {
      role: true,
      content: true,
    },
  })

  return messages.reverse()
}

const SYSTEM_PROMPT_TEMPLATE = `Você é um assistente de estudos. Responda baseado nos documentos:

{context}

Seja direto e objetivo. Se não encontrar a informação, avise.`

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const userId = (await cookieStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { chatId, message } = body

  if (!chatId || !message) {
    return new Response("Chat ID and message are required", { status: 400 })
  }

  if (message.length > 10000) {
    return new Response("Message too long (max 10000 characters)", { status: 400 })
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  })

  if (!chat) {
    return new Response("Chat not found", { status: 404 })
  }

  await prisma.message.create({
    data: {
      chatId,
      role: "user",
      content: message,
    },
  })

  const abortController = new AbortController()
  req.signal.addEventListener("abort", () => {
    abortController.abort()
  })

  try {
    const [queryEmbedding, chatHistory] = await Promise.all([
      generateEmbedding(message, abortController.signal),
      getChatHistory(chatId, HISTORY_LIMIT),
    ])

    const relevantChunks = await hybridSearch(chatId, message, queryEmbedding)

    let contextChars = 0
    const limitedChunks = relevantChunks.filter(chunk => {
      if (contextChars + chunk.content.length > MAX_CONTEXT_CHARS) return false
      contextChars += chunk.content.length
      return true
    })

    const context =
      limitedChunks.length > 0
        ? limitedChunks
            .map(
              (chunk, idx) =>
                `[Doc ${idx + 1}] ${chunk.content}`
            )
            .join("\n\n")
        : "Nenhum documento encontrado."

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{context}", context)

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ]

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let assistantContent = ""

        try {
          assistantContent = await streamChatCompletion(
            chatMessages,
            (chunk) => {
              controller.enqueue(encoder.encode(chunk))
            },
            abortController.signal
          )

          controller.close()

          await prisma.message.create({
            data: {
              chatId,
              role: "assistant",
              content: assistantContent,
            },
          })
        } catch (error) {
          if (abortController.signal.aborted) {
            controller.close()
            return
          }

          console.error("[POST /api/chat] Streaming error:", error)
          const errorMessage = "Desculpe, ocorreu um erro ao processar sua mensagem."
          controller.enqueue(encoder.encode(errorMessage))
          controller.close()

          await prisma.message.create({
            data: {
              chatId,
              role: "assistant",
              content: errorMessage,
            },
          })
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Error in chat POST:", error)
    return new Response("Internal server error", { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const userId = (await cookieStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get("chatId")

  if (!chatId) {
    return new Response("Chat ID is required", { status: 400 })
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  })

  if (!chat) {
    return new Response("Chat not found", { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  })

  return Response.json(messages)
}
