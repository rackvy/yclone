import { SetMetadata, UseGuards, applyDecorators } from "@nestjs/common";
import { UserRole, ROLES_KEY } from "../../auth/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Декораторы для конкретных ролей
export const AdminOnly = () => Roles('owner', 'admin');
export const ManagerAndAbove = () => Roles('owner', 'admin', 'manager');
export const FinanceAccess = () => Roles('owner', 'admin', 'manager'); // master - нет доступа
export const MasterAndAbove = () => Roles('owner', 'admin', 'manager', 'master');

// Комбинированный декоратор: JWT + Roles
export const AuthWithRoles = (...roles: UserRole[]) => applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
);
