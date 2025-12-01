#!/bin/bash

ollama serve &

echo "Aguardando Ollama iniciar..."
sleep 5

until ollama list > /dev/null 2>&1; do
  echo "Aguardando servidor..."
  sleep 2
done

echo "Baixando modelos..."

# ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama pull qwen2.5:1.5b

echo "Modelos prontos! Ollama rodando..."

wait
