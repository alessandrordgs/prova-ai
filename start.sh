#!/bin/sh

echo "Executando migrations do Prisma..."
npx prisma migrate deploy

echo "Iniciando aplicação..."
node server.js
