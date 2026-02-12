import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class GetAvailabilityDto {
    @IsString()
    employeeId!: string;

    // "YYYY-MM-DD"
    @IsString()
    date!: string;

    // длительность слота в минутах (пока 15 по умолчанию)
    @IsOptional()
    @IsInt()
    @Min(15)
    durationMin?: number;
}
