import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class InventoryItemDto {
    @IsString()
    productId!: string;

    @IsOptional()
    actualQty!: number;
}

export class CreateInventoryCountDto {
    @IsString()
    branchId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InventoryItemDto)
    items!: InventoryItemDto[];
}

export class UpdateInventoryItemDto {
    @IsOptional()
    actualQty?: number;
}

export class UpdateInventoryCountDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateInventoryItemDto)
    items?: { id: string; actualQty: number }[];
}
