import { IsString, IsOptional } from "class-validator";

export class ListSalesDto {
    @IsString()
    @IsOptional()
    from?: string;

    @IsString()
    @IsOptional()
    to?: string;

    @IsString()
    @IsOptional()
    branchId?: string;
}
