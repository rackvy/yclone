import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class BaseMovementDto {
    @IsString()
    branchId!: string;

    @IsString()
    productId!: string;

    @IsInt()
    @Min(1)
    qty!: number;

    @IsOptional()
    @IsString()
    note?: string;

    // кто сделал (сотрудник), опционально (позже можно привязать к user->employee)
    @IsOptional()
    @IsString()
    createdByEmployeeId?: string;
}
