# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

# Ставим зависимости (строго по lock)
COPY package*.json ./
RUN npm ci

# Копируем исходники и собираем
COPY . .
RUN npm run build

# ====== production stage ======
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Ставим только production зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Забираем build-артефакты
COPY --from=builder /app/dist ./dist

# Если у тебя Prisma — раскомментируй 2 строки ниже
# COPY --from=builder /app/prisma ./prisma
# RUN npx prisma generate

# Порт внутри контейнера (должен совпадать с traefik service port)
EXPOSE 4000

CMD ["node", "dist/main.js"]