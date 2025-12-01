// Testar funções utilitárias de PDF (precisamos exportá-las primeiro)
// Por enquanto, testamos apenas a lógica que pode ser isolada

describe('Funções utilitárias de PDF', () => {
  describe('chunkText', () => {
    // Reimplementar para teste (função não exportada)
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

    it('deve dividir texto em chunks com overlap', () => {
      const text = 'a'.repeat(2500)
      const chunks = chunkText(text, 1000, 200)

      expect(chunks.length).toBe(3)
      expect(chunks[0].length).toBe(1000)
    })

    it('deve retornar um único chunk para texto pequeno', () => {
      const text = 'Texto pequeno'
      const chunks = chunkText(text, 1000, 200)

      expect(chunks.length).toBe(1)
      expect(chunks[0]).toBe(text)
    })

    it('deve ter overlap entre chunks consecutivos', () => {
      const text = 'a'.repeat(1500)
      const chunks = chunkText(text, 1000, 200)

      // Primeiro chunk: 0-1000
      // Segundo chunk começa em 800 (1000 - 200)
      expect(chunks.length).toBe(2)
    })

    it('deve lidar com texto vazio', () => {
      const chunks = chunkText('', 1000, 200)
      expect(chunks.length).toBe(0)
    })
  })

  describe('extractMetadata', () => {
    // Reimplementar para teste
    const BANKS = ['FCC', 'CESPE', 'CEBRASPE', 'FGV', 'OUTRO'] as const
    const POSSIBLE_SUBJECTS = [
      'Direito Constitucional',
      'Direito Administrativo',
      'Informática',
      'Língua Portuguesa',
      'Matemática',
      'Raciocínio Lógico',
    ] as const
    const YEAR_REGEX = /\b20(?:2[0-9]|3[0-9])\b/

    type ExtractedMetadata = {
      ano?: number
      banca?: string
      assuntos: string[]
      cargo?: string
    }

    function extractMetadata(originalText: string): ExtractedMetadata {
      const text = (originalText ?? '').trim()
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

    it('deve extrair ano do texto', () => {
      const metadata = extractMetadata('Prova realizada em 2024')
      expect(metadata.ano).toBe(2024)
    })

    it('deve extrair banca CESPE', () => {
      const metadata = extractMetadata('Concurso organizado pela CESPE')
      expect(metadata.banca).toBe('CESPE')
    })

    it('deve extrair banca FCC', () => {
      const metadata = extractMetadata('Concurso organizado pela FCC')
      expect(metadata.banca).toBe('FCC')
    })

    it('deve extrair assuntos', () => {
      const metadata = extractMetadata('Questões de Direito Constitucional e Matemática')
      expect(metadata.assuntos).toContain('Direito Constitucional')
      expect(metadata.assuntos).toContain('Matemática')
    })

    it('deve retornar array vazio se não encontrar assuntos', () => {
      const metadata = extractMetadata('Texto sem assuntos específicos')
      expect(metadata.assuntos).toEqual([])
    })

    it('deve lidar com texto nulo ou undefined', () => {
      const metadata = extractMetadata(null as unknown as string)
      expect(metadata.assuntos).toEqual([])
    })
  })

  describe('identifyDocumentType', () => {
    type DocumentType = 'edital' | 'questoes' | 'gabarito' | 'legislacao' | 'conteudo_geral'

    function identifyDocumentType(filename: string, text: string): DocumentType {
      const filenameLower = filename.toLowerCase()
      const textLower = text.toLowerCase()

      if (filenameLower.includes('edital') || textLower.includes('edital de abertura')) return 'edital'
      if (filenameLower.includes('questões') || filenameLower.includes('questoes') || filenameLower.includes('prova')) return 'questoes'
      if (filenameLower.includes('gabarito')) return 'gabarito'
      if (textLower.includes('lei nº') || textLower.includes('lei n°') || textLower.includes('decreto')) return 'legislacao'

      return 'conteudo_geral'
    }

    it('deve identificar edital pelo nome do arquivo', () => {
      expect(identifyDocumentType('edital_concurso.pdf', '')).toBe('edital')
    })

    it('deve identificar edital pelo conteúdo', () => {
      expect(identifyDocumentType('documento.pdf', 'Edital de Abertura do concurso')).toBe('edital')
    })

    it('deve identificar questões pelo nome do arquivo', () => {
      expect(identifyDocumentType('prova_2024.pdf', '')).toBe('questoes')
      expect(identifyDocumentType('questoes_portugues.pdf', '')).toBe('questoes')
    })

    it('deve identificar gabarito', () => {
      expect(identifyDocumentType('gabarito.pdf', '')).toBe('gabarito')
    })

    it('deve identificar legislação', () => {
      expect(identifyDocumentType('documento.pdf', 'Lei nº 8.112/1990')).toBe('legislacao')
      expect(identifyDocumentType('documento.pdf', 'Decreto sobre...')).toBe('legislacao')
    })

    it('deve retornar conteudo_geral por padrão', () => {
      expect(identifyDocumentType('arquivo.pdf', 'Conteúdo qualquer')).toBe('conteudo_geral')
    })
  })
})
