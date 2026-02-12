import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateMasterRankDto {
    @IsString()
    @MinLength(2)
    name!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sort?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
