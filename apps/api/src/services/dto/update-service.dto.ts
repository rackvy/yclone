import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { ServicePriceDto } from "./service-price.dto";

export class UpdateServiceDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(15)
    durationMin?: number;

    @IsOptional()
    @IsString()
    categoryId?: string | null; // null = снять категорию

    @IsOptional()
    @IsInt()
    @Min(0)
    sort?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    pricesByRank?: ServicePriceDto[];
}
