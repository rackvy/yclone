import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { EmployeeRoleDto } from "./create-employee.dto";

export class UpdateEmployeeDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    fullName?: string;

    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @IsEnum(EmployeeRoleDto)
    role?: EmployeeRoleDto;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    masterRankId?: string;

    @IsOptional()
    @IsString()
    avatarKey?: string;

    @IsOptional()
    @IsString()
    userId?: string;
}
