import { prisma } from "@/lib/database/prisma"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const cookiesStore = cookies()
  const userId = (await cookiesStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }
  const body = await req.json()
  const chat = await prisma.chat.create({
    data: {
      userId: userId,
      name: body.name || "New Chat",
      banca: body.banca || "sem-banca",
    },
  })

  return new Response(JSON.stringify(chat), { status: 201 })
}

export async function GET(req: NextRequest) {
  const cookiesStore = cookies()
  const userId = (await cookiesStore).get("provaai-user-id")?.value

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const chats = await prisma.chat.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return new Response(JSON.stringify(chats), { status: 200 })
}
