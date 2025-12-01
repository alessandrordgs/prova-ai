# ProvaAI

Aplicação de chat com documentos PDF para estudos de concursos públicos, utilizando RAG (Retrieval-Augmented Generation) com IA local via Ollama.

## Índice

- [Como Rodar o Projeto](#como-rodar-o-projeto)
- [Instalação do Ollama](#instalação-do-ollama)
- [Modelos Utilizados](#modelos-utilizados)
- [Implementação do RAG](#implementação-do-rag)
- [Arquitetura e Decisões Técnicas](#arquitetura-e-decisões-técnicas)
- [Melhorias Futuras](#melhorias-futuras)

---

## Como Rodar o Projeto

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ e pnpm (para desenvolvimento local)

### Opção 1: Docker Compose (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/alessandrordgs/prova-ai.git
cd prova-ai

# Suba todos os serviços
docker compose up -d

# Aguarde os modelos serem baixados (~2-3 minutos na primeira vez)
docker logs -f provaai-ollama

# Acesse a aplicação
open http://localhost:3000
```

### Opção 2: Desenvolvimento Local

```bash
# Suba apenas o banco e o Ollama
docker compose up -d postgres ollama

# Instale as dependências
pnpm install

# Configure o ambiente
cp .env.example .env.local
# Edite o .env.local:
# OLLAMA_HOST=http://localhost:11434
# DATABASE_URL=postgresql://provaai:provaai123@localhost:5432/provaai

# Execute as migrações
pnpm prisma migrate dev

# Rode a aplicação
pnpm dev
```

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://provaai:provaai123@localhost:5432/provaai` |
| `OLLAMA_HOST` | URL do servidor Ollama | `http://localhost:11434` |
| `OLLAMA_CHAT_MODEL` | Modelo para chat | `qwen2.5:1.5b` |
| `OLLAMA_EMBEDDING_MODEL` | Modelo para embeddings | `nomic-embed-text` |
| `CHUNK_LIMIT` | Máximo de chunks por busca | `5` |
| `HISTORY_LIMIT` | Mensagens de histórico | `2` |
| `MAX_CONTEXT_CHARS` | Limite de caracteres no contexto | `4000` |

---

## Instalação do Ollama

### Via Docker (usado no projeto)

O Ollama é configurado automaticamente via Docker Compose. O arquivo `entrypoint.sh` baixa os modelos necessários:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:1.5b
```

### Instalação Manual (opcional)

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Iniciar o servidor
ollama serve

# Baixar os modelos
ollama pull nomic-embed-text
ollama pull qwen2.5:1.5b
```

### Verificar instalação

```bash
# Listar modelos
ollama list

# Testar modelo
ollama run qwen2.5:1.5b "Olá, teste!"
```

---
# Modelos Utilizados

## Chat: `qwen2.5:1.5b`

| Característica | Valor |
|----------------|-------|
| Tamanho | 986 MB |
| Parâmetros | 1.54B |
| Suporte Multilíngue | 29+ idiomas incluindo português |

### Por que este modelo?

1. **Otimizado para CPU**: O projeto roda sem GPU, então modelos menores são essenciais
2. **Velocidade**: Modelos menores oferecem respostas mais rápidas em ambientes sem GPU
3. **Qualidade**: Apesar do tamanho, mantém boa capacidade de compreensão em português
4. **Memória**: Cabe em máquinas com 4GB RAM

### Alternativas consideradas:

| Modelo | Tamanho | Motivo da não escolha |
|--------|---------|----------------------|
| `qwen2.5:3b` | 1.9 GB | Maior uso de recursos |
| `qwen2.5:7b` | 4.7 GB | Inviável sem GPU |
| `phi3:mini` | 2.3 GB | Pior qualidade em PT-BR |

---

## Embeddings: `nomic-embed-text`

| Característica | Valor |
|----------------|-------|
| Dimensões | 768 (padrão, suporta 64-768 via Matryoshka) |
| Tamanho | 274 MB |
| Suporte Multilíngue | Sim |

### Por que este modelo?

1. **Qualidade**: Estado da arte para embeddings de texto
2. **Dimensionalidade flexível**: 768 dimensões oferece bom equilíbrio entre qualidade e performance, com opções de 64 a 768
3. **Compatibilidade**: Funciona bem com pgvector
4. **Multilíngue**: Suporte a português e outros idiomas
5. **Eficiência**: Tamanho compacto de 274 MB

---

**Nota**: Métricas de performance (tokens/s, latência, tempo de resposta) variam conforme hardware específico e não são incluídas aqui.
## Implementação do RAG

### Fluxo Geral

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Upload PDF  │────▶│ Chunk + Embed │────▶│ PostgreSQL      │
└─────────────┘     └──────────────┘     │ (pgvector)      │
                                         └────────┬────────┘
                                                  │
┌─────────────┐     ┌──────────────┐              │
│ Pergunta    │────▶│ Embed query  │──────────────┘
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Busca Híbrida │
                    │ (70% vec +    │
                    │  30% tsvec)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────────┐
                    │ Top 5 chunks │────▶│ Ollama (qwen2.5)│
                    │ + histórico  │     │ Streaming       │
                    └──────────────┘     └────────┬────────┘
                                                  │
                                           ┌──────▼──────┐
                                           │  Resposta   │
                                           └─────────────┘
```

### 1. Processamento de PDFs (`app/api/pdf/route.ts`)

**Características:**
- Chunks de 1000 caracteres com overlap de 200
- Identificação automática de tipo de documento (edital, questões, gabarito, legislação)
- Extração de metadados: ano, banca, assuntos
- Enriquecimento do texto antes de gerar embedding

### 2. Busca Híbrida (`app/api/chat/route.ts`)

A busca combina dois métodos com pesos definidos:

**Pesos da busca híbrida:**

| Método | Peso | Justificativa |
|--------|------|---------------|
| Busca vetorial | 70% | Captura semântica e sinônimos |
| Busca textual (tsvector) | 30% | Precisão em termos técnicos |

**Filtros aplicados:**
- `SIMILARITY_THRESHOLD = 0.3` - Descarta chunks irrelevantes
- `MAX_CONTEXT_CHARS = 4000` - Limita tamanho do contexto
- `CHUNK_LIMIT = 5` - Máximo de chunks

### 3. Geração de Resposta

**Otimizações:**
- `num_ctx: 4096` - Contexto limitado para performance
- `num_predict: 512` - Respostas concisas
- `temperature: 0.5` - Equilíbrio entre criatividade e precisão
- Streaming para UX responsiva

---

## Arquitetura e Decisões Técnicas

### Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Frontend | Next.js 16 (App Router) | SSR, API Routes, React Server Components |
| Backend | Next.js API Routes | Simplicidade, TypeScript nativo |
| Banco de Dados | PostgreSQL + pgvector | Busca vetorial nativa, confiabilidade |
| ORM | Prisma | Type-safety, migrações |
| LLM | Ollama | IA local, privacidade, sem custos de API |
| Containerização | Docker Compose | Portabilidade, fácil setup |

### Estrutura do Projeto

```
prova-ai/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Chat com RAG
│   │   ├── chats/route.ts     # CRUD de conversas
│   │   └── pdf/route.ts       # Upload e processamento de PDFs
│   └── [[...id]]/             # Páginas dinâmicas
├── components/                 # Componentes React
├── lib/
│   ├── ollama.ts              # Cliente Ollama (embeddings + chat)
│   └── database/prisma.ts     # Cliente Prisma
├── prisma/
│   └── schema.prisma          # Schema do banco
└── tests/                     # Testes unitários (Jest)
```

### Decisões Arquiteturais

#### 1. IA Local vs API Cloud

**Escolha:** Ollama (local)

| Aspecto | IA Local | API Cloud |
|---------|----------|-----------|
| Custo | Zero | Por token |
| Privacidade | Total | Dados enviados a terceiros |
| Latência | Depende do hardware | Consistente |
| Disponibilidade | 100% offline | Depende de internet |

#### 2. Busca Híbrida vs Apenas Vetorial

**Escolha:** Híbrida (70% vetorial + 30% textual)

- Vetorial sozinho perde termos técnicos exatos (artigos de lei, nomes)
- Textual sozinho não entende sinônimos e reformulações
- Híbrido combina o melhor dos dois

#### 3. PostgreSQL + pgvector vs Banco Vetorial Dedicado

**Escolha:** PostgreSQL + pgvector

| Aspecto | pgvector | Pinecone/Weaviate |
|---------|----------|-------------------|
| Infraestrutura | Um banco só | Banco separado |
| Custo | Zero | Pago |
| Complexidade | Baixa | Média |
| Performance | Boa (HNSW) | Excelente |


#### 4. Chunking Strategy

```typescript
const CHUNK_SIZE = 1000   // caracteres
const OVERLAP = 200       // overlap entre chunks
```

- Chunks menores = mais precisão, mais chunks
- Chunks maiores = mais contexto, menos precisão
- Overlap evita cortar informações no meio

---

## Melhorias Futuras

### Performance

- [ ] **GPU Support**: Adicionar suporte a NVIDIA CUDA no Docker para acelerar inferência
- [ ] **Cache de Embeddings**: Cache Redis para embeddings de queries frequentes
- [ ] **Streaming de PDF**: Processar PDFs em chunks sem carregar tudo na memória
- [ ] **Background Jobs**: Usar filas para processamento de PDFs

### Funcionalidades

- [ ] **Multi-modal**: Suporte a imagens em PDFs (gráficos, tabelas)
- [ ] **Citações**: Mostrar exatamente de qual página/documento veio a informação
- [ ] **Flashcards**: Criar flashcards automáticos do conteúdo
- [ ] **Comparação de Bancas**: Identificar padrões por banca (CESPE vs FCC)

### RAG Avançado

- [ ] **Reranking**: Usar modelo de rerank após busca inicial
- [ ] **Query Expansion**: Expandir query com sinônimos antes da busca
- [ ] **Contextual Compression**: Comprimir chunks antes de enviar ao LLM
- [ ] **Hybrid Fusion**: RRF (Reciprocal Rank Fusion) ao invés de média ponderada
- [ ] **Parent-Child Chunks**: Chunks pequenos para busca, chunks grandes para contexto

### Infraestrutura

- [ ] **Autenticação**: betterAuth (Google, GitHub)
- [ ] **Rate Limiting**: Limitar requisições por usuário
- [ ] **Monitoramento**: OpenTelemetry + Grafana
- [ ] **Testes E2E**: Playwright para testes de integração
- [ ] **Backend Dedicado**: Separar processamento de PDFs em microsserviço Python/Node para melhor escalabilidade

 
## Testes

```bash
# Rodar todos os testes
pnpm test

# Modo watch
pnpm test:watch

# Com cobertura
pnpm test:coverage
```
