import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/chats/route'
import { mockPrisma } from '../setup'
import { cookies } from 'next/headers'

const mockCookies = cookies as jest.Mock

describe('POST /api/chats', () => {
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

    const req = new NextRequest('http://localhost/api/chats', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo Chat' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('deve criar chat com sucesso', async () => {
    const mockChat = {
      id: '123',
      userId: 'user-id',
      name: 'Novo Chat',
      banca: 'CESPE',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.chat.create.mockResolvedValue(mockChat)

    const req = new NextRequest('http://localhost/api/chats', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo Chat', banca: 'CESPE' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.name).toBe('Novo Chat')
    expect(data.banca).toBe('CESPE')
  })

  it('deve usar valores padrão se não fornecidos', async () => {
    const mockChat = {
      id: '123',
      userId: 'user-id',
      name: 'New Chat',
      banca: 'sem-banca',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.chat.create.mockResolvedValue(mockChat)

    const req = new NextRequest('http://localhost/api/chats', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(req)
    expect(response.status).toBe(201)

    expect(mockPrisma.chat.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        name: 'New Chat',
        banca: 'sem-banca',
      },
    })
  })

  it('deve usar nome e banca personalizados', async () => {
    const mockChat = {
      id: '123',
      userId: 'user-id',
      name: 'Concurso TRF',
      banca: 'FCC',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.chat.create.mockResolvedValue(mockChat)

    const req = new NextRequest('http://localhost/api/chats', {
      method: 'POST',
      body: JSON.stringify({ name: 'Concurso TRF', banca: 'FCC' }),
    })

    const response = await POST(req)
    expect(response.status).toBe(201)

    expect(mockPrisma.chat.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        name: 'Concurso TRF',
        banca: 'FCC',
      },
    })
  })
})

describe('GET /api/chats', () => {
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

    const req = new NextRequest('http://localhost/api/chats')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar lista de chats do usuário', async () => {
    const mockChats = [
      { id: '1', userId: 'user-id', name: 'Chat 1', banca: 'CESPE', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', userId: 'user-id', name: 'Chat 2', banca: 'FCC', createdAt: new Date(), updatedAt: new Date() },
    ]
    mockPrisma.chat.findMany.mockResolvedValue(mockChats)

    const req = new NextRequest('http://localhost/api/chats')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(2)
  })

  it('deve retornar lista vazia se não houver chats', async () => {
    mockPrisma.chat.findMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/chats')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(0)
  })

  it('deve ordenar chats por data de criação decrescente', async () => {
    mockPrisma.chat.findMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/chats')
    await GET(req)

    expect(mockPrisma.chat.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      orderBy: { createdAt: 'desc' },
    })
  })
})
