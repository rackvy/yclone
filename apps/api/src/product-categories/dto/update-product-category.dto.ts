import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateProductCategoryDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sort?: number;
}
