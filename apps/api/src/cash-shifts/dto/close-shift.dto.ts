import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CloseShiftDto {
    @IsInt()
    @Min(0)
    actualCash!: number;

    @IsOptional()
    @IsString()
    comment?: string;
}
