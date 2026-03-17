docker compose build --no-cache
docker compose up -d
docker exec -it yclone-api sh -lc "pnpm exec prisma migrate deploy"
docker exec -it yclone-api sh -lc "pnpm exec prisma db push"