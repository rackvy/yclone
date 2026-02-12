# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Prisma config требует DATABASE_URL даже для generate.
# Генерации не нужен реальный коннект, даём валидный "фейковый" URL.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

# СНАЧАЛА generate (для TS типов), ПОТОМ build
RUN pnpm prisma generate
RUN pnpm build

# ====== production stage ======
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

EXPOSE 4000

# Реальный DATABASE_URL придёт из env_file при docker compose up
# Миграции пока не трогаем (по желанию включишь позже)
CMD ["node", "dist/main.js"]
