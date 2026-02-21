import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

class SaleItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    qty: number;

    @IsNumber()
    @Min(0)
    priceKopeks: number;
}

export class CreateSaleDto {
    @IsString()
    branchId: string;

    @IsString()
    @IsOptional()
    clientId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SaleItemDto)
    items: SaleItemDto[];
}
