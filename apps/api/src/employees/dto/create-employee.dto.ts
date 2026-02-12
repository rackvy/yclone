import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export enum EmployeeRoleDto {
    admin = "admin",
    manager = "manager",
    master = "master",
}

export class CreateEmployeeDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @IsString()
    branchId!: string;

    @IsEnum(EmployeeRoleDto)
    role!: EmployeeRoleDto;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    // только если role=master
    @IsOptional()
    @IsString()
    masterRankId?: string;

    @IsOptional()
    @IsString()
    avatarKey?: string; // позже будет через S3 upload
}
