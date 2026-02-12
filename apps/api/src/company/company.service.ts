import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompanyService {
    constructor(private readonly prisma: PrismaService) {}

    async getMe(companyId: string) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!company) throw new NotFoundException("Company not found");
        return company;
    }

    async updateMe(companyId: string, dto: UpdateCompanyDto) {
        // update выбросит ошибку, если записи нет — но дадим красивую
        const exists = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Company not found");

        return this.prisma.company.update({
            where: { id: companyId },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
}
