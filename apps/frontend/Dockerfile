# ====== build stage ======
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ====== production stage ======
FROM nginx:1.27-alpine

# Чистим дефолтную статику и кладём свою
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Если хочешь кастомный nginx.conf (SPA fallback и т.п.) — раскомментируй:
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]