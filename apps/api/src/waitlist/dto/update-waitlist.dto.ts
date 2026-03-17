import { IsOptional, IsString, IsIn } from "class-validator";

export class UpdateWaitlistDto {
    @IsOptional()
    @IsString()
    @IsIn(["pending", "contacted", "booked", "canceled"])
    status?: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
