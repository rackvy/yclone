import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
    constructor(private readonly prisma: PrismaService) {}

    @Get("health")
    health() {
        return { ok: true };
    }

    @Get("db")
    async db() {
        const companyCount = await this.prisma.company.count();
        return { companyCount };
    }
}
