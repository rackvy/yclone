import { IsDateString, IsOptional, IsString } from "class-validator";

export class OpenShiftDto {
    @IsDateString()
    date!: string; // YYYY-MM-DD

    @IsString()
    branchId!: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
