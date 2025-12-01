import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '@/app/api/pdf/route'
import { mockPrisma } from '../setup'
import { cookies } from 'next/headers'

const mockCookies = cookies as jest.Mock

describe('POST /api/pdf', () => {
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

    const formData = new FormData()
    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar 400 se nenhum arquivo enviado', async () => {
    const formData = new FormData()
    formData.append('chatId', '123')

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('No file')
  })

  it('deve retornar 400 se chatId não fornecido', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('files', file)

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('Chat ID')
  })

  it('deve retornar 404 se chat não encontrado', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue(null)

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('files', file)
    formData.append('chatId', '123')

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(404)
  })

  it('deve retornar 400 se arquivo com tipo inválido', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('files', file)
    formData.append('chatId', '123')

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('inválido')
  })

  it('deve iniciar processamento de PDF válido', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.source.create.mockResolvedValue({
      id: 'source-1',
      userId: 'user-id',
      chatId: '123',
      name: 'test.pdf',
      progress: 0,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('files', file)
    formData.append('chatId', '123')

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.message).toBe('Processing started')
    expect(data.sources).toHaveLength(1)
    expect(data.sources[0].status).toBe('processing')
  })

  it('deve processar múltiplos arquivos', async () => {
    mockPrisma.chat.findFirst.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      name: 'Test Chat',
      banca: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.source.create
      .mockResolvedValueOnce({
        id: 'source-1',
        userId: 'user-id',
        chatId: '123',
        name: 'test1.pdf',
        progress: 0,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'source-2',
        userId: 'user-id',
        chatId: '123',
        name: 'test2.pdf',
        progress: 0,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    const file1 = new File(['test content 1'], 'test1.pdf', { type: 'application/pdf' })
    const file2 = new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('files', file1)
    formData.append('files', file2)
    formData.append('chatId', '123')

    const req = new NextRequest('http://localhost/api/pdf', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.sources).toHaveLength(2)
  })
})

describe('GET /api/pdf', () => {
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

    const req = new NextRequest('http://localhost/api/pdf?chatId=123')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar 400 se chatId não fornecido', async () => {
    const req = new NextRequest('http://localhost/api/pdf')
    const response = await GET(req)
    expect(response.status).toBe(400)
  })

  it('deve retornar sources do chat', async () => {
    const mockSources = [
      { id: '1', userId: 'user-id', chatId: '123', name: 'doc1.pdf', progress: 100, status: 'completed', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', userId: 'user-id', chatId: '123', name: 'doc2.pdf', progress: 50, status: 'processing', createdAt: new Date(), updatedAt: new Date() },
    ]
    mockPrisma.source.findMany.mockResolvedValue(mockSources)

    const req = new NextRequest('http://localhost/api/pdf?chatId=123')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(2)
  })

  it('deve retornar lista vazia se não houver sources', async () => {
    mockPrisma.source.findMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/pdf?chatId=123')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(0)
  })
})

describe('DELETE /api/pdf', () => {
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

    const req = new NextRequest('http://localhost/api/pdf?sourceId=123', { method: 'DELETE' })
    const response = await DELETE(req)
    expect(response.status).toBe(401)
  })

  it('deve retornar 400 se sourceId não fornecido', async () => {
    const req = new NextRequest('http://localhost/api/pdf', { method: 'DELETE' })
    const response = await DELETE(req)
    expect(response.status).toBe(400)
  })

  it('deve deletar source com sucesso', async () => {
    mockPrisma.source.delete.mockResolvedValue({
      id: '123',
      userId: 'user-id',
      chatId: '456',
      name: 'doc.pdf',
      progress: 100,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const req = new NextRequest('http://localhost/api/pdf?sourceId=123', { method: 'DELETE' })
    const response = await DELETE(req)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('Source deleted')
    expect(mockPrisma.source.delete).toHaveBeenCalledWith({
      where: { id: '123', userId: 'user-id' },
    })
  })
})
