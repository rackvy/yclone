import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Create company first
        const company = await this.prisma.company.create({
            data: {
                name: dto.companyName,
            },
        });

        // Create main branch explicitly with companyId
        await this.prisma.branch.create({
            data: {
                name: "Главный филиал",
                companyId: company.id,
            },
        });

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                companyId: company.id,
            },
        });

        return this.issueTokens(user.id, company.id);
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                email: dto.email,
            },
        });


        if (!user) throw new UnauthorizedException("Invalid credentials");

        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok) throw new UnauthorizedException("Invalid credentials");

        return this.issueTokens(user.id, user.companyId);
    }

    private issueTokens(userId: string, companyId: string) {
        const payload = { sub: userId, companyId };

        return {
            accessToken: this.jwt.sign(payload),
            refreshToken: this.jwt.sign(payload, { expiresIn: "30d" }),
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true,
                    },
                },
            },
        });

        if (!user) throw new UnauthorizedException("User not found");

        // Определяем роль пользователя
        const role = user.employee?.role || 'owner';

        return {
            ...user,
            role,
        };
    }
}
