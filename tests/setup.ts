export const mockPrisma = {
  chat: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  source: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  sourceChunks: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
}

jest.mock('@/lib/database/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/ollama', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
  streamChatCompletion: jest.fn().mockImplementation(async (messages, onChunk) => {
    onChunk('Resposta ')
    onChunk('do modelo')
    return 'Resposta do modelo'
  }),
  CHUNK_LIMIT: 10,
  HISTORY_LIMIT: 3,
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue({ value: 'test-user-id' }),
  }),
}))

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: 'Conteúdo do PDF de teste' }),
  })),
  TextResult: {},
}))
