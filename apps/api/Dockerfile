# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Prisma config требует DATABASE_URL даже для generate.
# Для generate не нужен реальный коннект — даём валидный фейк.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

# 1) Генерим client в /app/generated/...
RUN pnpm prisma generate

# 2) Собираем Nest (получится /app/dist/src/...)
RUN pnpm build

# 3) КЛЮЧ: кладём generated внутрь dist, чтобы ../../generated работало из dist/src/*
RUN mkdir -p /app/dist/generated \
  && cp -R /app/generated/prisma /app/dist/generated/prisma

# ====== production stage ======
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Копируем только dist (внутри уже есть dist/generated)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
