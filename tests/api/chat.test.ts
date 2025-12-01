import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/chat/route'
import { mockPrisma } from '../setup'
import { cookies } from 'next/headers'

const mockCookies = cookies as jest.Mock

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: 'user-id' }),
    })
  })

  it('deve retornar 401 se usuário não autenticado', async () => {
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue(undefined),
    })

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123', message: 'teste' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar 400 se chatId não fornecido', async () => {
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'teste' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('deve retornar 400 se message não fornecida', async () => {
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('deve retornar 400 se mensagem muito longa', async () => {
    const longMessage = 'a'.repeat(10001)
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123', message: longMessage }),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('too long')
  })

  it('deve retornar 404 se chat não encontrado', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123', message: 'teste' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(404)
  })

  it('deve criar mensagem do usuário e retornar stream', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.message.create.mockResolvedValue({
      id: 'msg-1',
      chatId: '123',
      role: 'user',
      content: 'teste',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.message.findMany.mockResolvedValue([])
    mockPrisma.sourceChunks.count.mockResolvedValue(0)

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123', message: 'teste' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  })

  it('deve buscar chunks quando existem sources', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.message.create.mockResolvedValue({
      id: 'msg-1',
      chatId: '123',
      role: 'user',
      content: 'teste',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.message.findMany.mockResolvedValue([])
    mockPrisma.sourceChunks.count.mockResolvedValue(10)
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: 'chunk-1', content: 'Conteúdo relevante', metadata: {}, similarity_score: 0.8 },
    ])

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ chatId: '123', message: 'teste' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPrisma.$queryRaw).toHaveBeenCalled()
  })
})

describe('GET /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue({ value: 'user-id' }),
    })
  })

  it('deve retornar 401 se usuário não autenticado', async () => {
    mockCookies.mockReturnValue({
      get: jest.fn().mockReturnValue(undefined),
    })

    const req = new NextRequest('http://localhost/api/chat?chatId=123')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar 400 se chatId não fornecido', async () => {
    const req = new NextRequest('http://localhost/api/chat')
    const response = await GET(req)
    expect(response.status).toBe(400)
  })

  it('deve retornar 404 se chat não encontrado', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/chat?chatId=123')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('deve retornar mensagens do chat', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const mockMessages = [
      { id: '1', chatId: '123', role: 'user', content: 'Olá', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', chatId: '123', role: 'assistant', content: 'Oi!', createdAt: new Date(), updatedAt: new Date() },
    ]
    mockPrisma.message.findMany.mockResolvedValue(mockMessages)

    const req = new NextRequest('http://localhost/api/chat?chatId=123')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(2)
  })
})
