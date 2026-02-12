import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class TransferMovementDto {
    @IsString()
    fromBranchId!: string;

    @IsString()
    toBranchId!: string;

    @IsString()
    productId!: string;

    @IsInt()
    @Min(1)
    qty!: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    createdByEmployeeId?: string;
}
