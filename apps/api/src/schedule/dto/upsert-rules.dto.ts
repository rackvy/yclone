import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class RuleDayDto {
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek!: number; // 0..6 (Пн..Вс)

    @IsBoolean()
    isWorkingDay!: boolean;

    @IsOptional()
    @IsString()
    startTime?: string; // "10:00"

    @IsOptional()
    @IsString()
    endTime?: string; // "19:00"
}

export class UpsertRulesDto {
    @IsString()
    employeeId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RuleDayDto)
    days!: RuleDayDto[];
}
