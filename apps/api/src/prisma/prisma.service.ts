import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ВАЖНО: импортируем из generated (как у тебя настроен generator output)
import { PrismaClient } from "../../generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    constructor(private readonly config: ConfigService) {
        const url = config.get<string>("DATABASE_URL");
        if (!url) throw new Error("DATABASE_URL is missing in env");

        // pg pool
        const pool = new Pool({ connectionString: url });
        const adapter = new PrismaPg(pool);

        // Prisma 7: нужен adapter или accelerateUrl
        super({ adapter } as any);

        this.pool = pool;
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end().catch(() => undefined);
    }
}
