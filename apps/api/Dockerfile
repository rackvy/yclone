# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Генерим Prisma client
RUN pnpm prisma generate

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

RUN pnpm prisma generate

EXPOSE 4000

CMD ["sh", "-lc", "pnpm prisma migrate deploy && node dist/main.js"]
