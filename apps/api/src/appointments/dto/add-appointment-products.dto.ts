import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AddAppointmentProductItemDto {
    @IsString()
    productId!: string;

    @IsInt()
    @Min(1)
    qty!: number;
}

export class AddAppointmentProductsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddAppointmentProductItemDto)
    items!: AddAppointmentProductItemDto[];

    @IsOptional()
    @IsString()
    createdByEmployeeId?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
