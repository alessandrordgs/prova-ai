import { NextRequest } from "next/server"
import { prisma } from "@/lib/database/prisma"
import { cookies } from "next/headers"
import { PDFParse, TextResult } from "pdf-parse"
import { generateEmbedding } from "@/lib/ollama"

type ExtractedMetadata = {
  ano?: number
  banca?: string
  assuntos: string[]
  cargo?: string
}

type Chunk = {
  text: string
  metadata: Record<string, unknown>
}

type DocumentType = "edital" | "questoes" | "gabarito" | "legislacao" | "conteudo_geral"

const BANKS = ["FCC", "CESPE", "CEBRASPE", "FGV", "OUTRO"] as const
const POSSIBLE_SUBJECTS = [
  "Direito Constitucional",
  "Direito Administrativo",
  "Informática",
  "Língua Portuguesa",
  "Matemática",
  "Raciocínio Lógico",
] as const

const YEAR_REGEX = /\b20(?:2[0-9]|3[0-9])\b/

function extractMetadata(originalText: string): ExtractedMetadata {
  const text = (originalText ?? "").trim()
  const textLower = text.toLowerCase()
  const textUpper = text.toUpperCase()

  const metadata: ExtractedMetadata = { assuntos: [] }

  const yearMatch = text.match(YEAR_REGEX)
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[0], 10)
    if (!Number.isNaN(year)) metadata.ano = year
  }

  metadata.banca = BANKS.find((b) => textUpper.includes(b))

  metadata.assuntos = POSSIBLE_SUBJECTS.filter((subject) =>
    textLower.includes(subject.toLowerCase())
  )

  return metadata
}

function identifyDocumentType(filename: string, text: string): DocumentType {
  const filenameLower = filename.toLowerCase()
  const textLower = text.toLowerCase()

  if (filenameLower.includes("edital") || textLower.includes("edital de abertura")) return "edital"
  if (filenameLower.includes("questões") || filenameLower.includes("questoes") || filenameLower.includes("prova")) return "questoes"
  if (filenameLower.includes("gabarito")) return "gabarito"
  if (textLower.includes("lei nº") || textLower.includes("lei n°") || textLower.includes("decreto")) return "legislacao"

  return "conteudo_geral"
}


function buildEnrichedText(
  text: string,
  metadata: ExtractedMetadata,
  documentType: DocumentType
): string {
  return `Tipo: ${documentType}
Assunto: ${metadata.assuntos.length > 0 ? metadata.assuntos.join(", ") : "Geral"}
Banca: ${metadata.banca || "Não especificada"}
Ano: ${metadata.ano || "N/A"}

Conteúdo:
${text}`
}

async function generateEnrichedEmbedding(
  text: string,
  metadata: ExtractedMetadata,
  documentType: DocumentType
): Promise<{ embedding: number[]; enrichedText: string }> {
  const enrichedText = buildEnrichedText(text, metadata, documentType)
  const embedding = await generateEmbedding(enrichedText)
  return { embedding, enrichedText }
}

async function extractTextFromPDF(file: File): Promise<TextResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const data = new PDFParse({
    data: buffer,
  })
  return await data.getText()
}

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length)
    const chunk = text.substring(startIndex, endIndex)
    chunks.push(chunk)

    startIndex += chunkSize - overlap

    if (endIndex === text.length) break
  }

  return chunks
}

async function processPDF(
  file: File,
  sourceId: string,
  totalFiles: number,
  fileIndex: number
): Promise<void> {
  const textResult = await extractTextFromPDF(file)
  const text = textResult.text
  const documentType = identifyDocumentType(file.name, text)
  const metadata = extractMetadata(text)
  
  const textChunks = chunkText(text, 1000, 200)
  
  const chunks: Chunk[] = textChunks.map((chunkText) => ({
    text: chunkText,
    metadata: { ...metadata, documentType },
  }))

  const totalChunks = chunks.length

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const { embedding, enrichedText } = await generateEnrichedEmbedding(
      chunk.text,
      metadata,
      documentType
    )

    const exists = await prisma.sourceChunks.findFirst({
      where: { sourceId, content: enrichedText },
    })

    if (!exists) {
      await prisma.$executeRaw`
        INSERT INTO "SourceChunks" (id, "sourceId", content, metadata, embedding, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${sourceId},
          ${enrichedText},
          ${JSON.stringify({ ...chunk.metadata, ...metadata, documentType })}::jsonb,
          ${`[${embedding.join(",")}]`}::vector,
          NOW(),
          NOW()
        )
      `
    } else {
      console.debug(`Skipping duplicate chunk for source ${sourceId}`)
    }

    const baseProgress = (fileIndex / totalFiles) * 100
    const chunkProgress = ((i + 1) / totalChunks) * (100 / totalFiles)
    const progress = Math.min(baseProgress + chunkProgress, 100)

    await prisma.source.update({
      where: { id: sourceId },
      data: { progress, status: progress >= 100 ? "completed" : "processing" },
    })
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const userId = (await cookieStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const form = await req.formData()
  const files = form.getAll("files") as File[]
  const chatId = form.get("chatId") as string

  if (!files || files.length === 0) {
    return new Response("No file uploaded", { status: 400 })
  }

  if (!chatId) {
    return new Response("Chat ID is required", { status: 400 })
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  })

  if (!chat) {
    return new Response("Chat not found", { status: 404 })
  }

  const MAX_SIZE = 10 * 1024 * 1024
  const invalid = files.find(
    (f) => f.type !== "application/pdf" || f.size > MAX_SIZE
  )

  if (invalid) {
    return new Response("Arquivo inválido (tipo ou tamanho)", { status: 400 })
  }

  const sources = await Promise.all(
    files.map((file) =>
      prisma.source.create({
        data: {
          userId,
          chatId,
          name: file.name,
          status: "processing",
          progress: 0,
        },
      })
    )
  )

  ;(async () => {
    for (let i = 0; i < files.length; i++) {
      try {
        await processPDF(files[i], sources[i].id, files.length, i)
      } catch (error) {
        await prisma.source.update({
          where: { id: sources[i].id },
          data: { status: "error", progress: 0 },
        })
        console.error(`Error processing ${files[i].name}:`, error)
      }
    }
  })()

  return Response.json({
    message: "Processing started",
    sources: sources.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  })
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

  const sources = await prisma.source.findMany({
    where: { userId, chatId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(sources)
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies()
  const userId = (await cookieStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get("sourceId")

  if (!sourceId) {
    return new Response("Source ID is required", { status: 400 })
  }

  await prisma.source.delete({
    where: { id: sourceId, userId },
  })

  return Response.json({ message: "Source deleted" })
}
