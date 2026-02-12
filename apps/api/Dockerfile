# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# ВАЖНО: НЕ делаем prisma generate здесь
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

# 🔥 Prisma generate + migrate уже при runtime,
# когда env из .env.production доступен
CMD ["sh", "-lc", "pnpm prisma generate && node dist/main.js"]
