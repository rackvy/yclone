import { IsString, IsNumber, Min, IsOptional } from "class-validator";

export class AddPaymentDto {
    @IsString()
    methodId: string;

    @IsString()
    cashboxId: string;

    @IsNumber()
    @Min(1)
    amountKopeks: number;

    @IsString()
    @IsOptional()
    comment?: string;
}
