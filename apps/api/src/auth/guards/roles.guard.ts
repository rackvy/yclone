import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";

export type UserRole = 'owner' | 'admin' | 'manager' | 'master';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // No roles required, allow access
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user; // From JWT: { sub, companyId }

        if (!user?.sub) {
            throw new ForbiddenException('User not authenticated');
        }

        // Get user role from database
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.sub },
            include: { employee: { select: { role: true } } },
        });

        if (!dbUser) {
            throw new ForbiddenException('User not found');
        }

        // Determine role: owner (no employee) or employee role
        const userRole: UserRole = dbUser.employee?.role ?? 'owner';

        if (!requiredRoles.includes(userRole)) {
            throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
        }

        // Attach role to request for later use
        request.userRole = userRole;

        return true;
    }
}
