import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class AdjustMovementDto {
    @IsString()
    branchId!: string;

    @IsString()
    productId!: string;

    // новое значение остатка (stockQty станет ровно таким)
    @IsInt()
    @Min(0)
    newQty!: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    createdByEmployeeId?: string;
}
