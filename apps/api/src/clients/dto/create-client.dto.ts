import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateClientDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    // телефон обязателен по схеме
    @IsString()
    phone!: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
