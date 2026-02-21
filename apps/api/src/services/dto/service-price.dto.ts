import { IsInt, IsString, Min } from "class-validator";

export class ServicePriceDto {
    @IsString()
    masterRankId!: string;

    @IsInt()
    @Min(0)
    price!: number; // рубли
}
