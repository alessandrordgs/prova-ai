// Desabilitar mocks globais para testar o módulo real
jest.unmock('@/lib/ollama')

import { generateEmbedding, streamChatCompletion, ChatMessage } from '@/lib/ollama'

const originalFetch = global.fetch

describe('generateEmbedding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('deve gerar embedding com sucesso', async () => {
    const mockEmbedding = new Array(768).fill(0.1)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: mockEmbedding }),
    })

    const result = await generateEmbedding('teste')

    expect(result).toHaveLength(768)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/embeddings'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('deve incluir o texto no body da requisição', async () => {
    const mockEmbedding = new Array(768).fill(0.1)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: mockEmbedding }),
    })

    await generateEmbedding('meu texto de teste')

    const call = (global.fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.prompt).toBe('meu texto de teste')
  })

  it('deve lançar erro se resposta não ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    })

    await expect(generateEmbedding('teste')).rejects.toThrow('Embedding generation failed')
  })

  it('deve propagar AbortSignal', async () => {
    const mockEmbedding = new Array(768).fill(0.1)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: mockEmbedding }),
    })

    const controller = new AbortController()
    await generateEmbedding('teste', controller.signal)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
      })
    )
  })
})

describe('streamChatCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('deve processar stream de chat', async () => {
    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"Olá"}}\n'))
        controller.enqueue(encoder.encode('{"message":{"content":" mundo"}}\n'))
        controller.close()
      },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const chunks: string[] = []
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Oi' },
    ]

    const result = await streamChatCompletion(messages, (chunk) => {
      chunks.push(chunk)
    })

    expect(result).toBe('Olá mundo')
    expect(chunks).toEqual(['Olá', ' mundo'])
  })

  it('deve enviar mensagens no formato correto', async () => {
    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"ok"}}\n'))
        controller.close()
      },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: 'Você é um assistente' },
      { role: 'user', content: 'Olá' },
    ]

    await streamChatCompletion(messages, () => {})

    const call = (global.fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.messages).toEqual(messages)
    expect(body.stream).toBe(true)
  })

  it('deve lançar erro se resposta não ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Oi' }]

    await expect(streamChatCompletion(messages, () => {})).rejects.toThrow('Chat completion failed')
  })

  it('deve lançar erro se body não legível', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: null,
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Oi' }]

    await expect(streamChatCompletion(messages, () => {})).rejects.toThrow('Response body is not readable')
  })

  it('deve propagar AbortSignal', async () => {
    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"ok"}}\n'))
        controller.close()
      },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const controller = new AbortController()
    const messages: ChatMessage[] = [{ role: 'user', content: 'Oi' }]

    await streamChatCompletion(messages, () => {}, controller.signal)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
      })
    )
  })

  it('deve ignorar linhas JSON inválidas', async () => {
    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":{"content":"Olá"}}\n'))
        controller.enqueue(encoder.encode('linha inválida\n'))
        controller.enqueue(encoder.encode('{"message":{"content":" mundo"}}\n'))
        controller.close()
      },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const messages: ChatMessage[] = [{ role: 'user', content: 'Oi' }]
    const result = await streamChatCompletion(messages, () => {})

    expect(result).toBe('Olá mundo')
  })
})
