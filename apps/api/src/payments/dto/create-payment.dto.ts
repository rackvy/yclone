import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentDto {
    @IsString()
    methodId!: string;

    @IsString()
    cashboxId!: string;

    @IsInt()
    @Min(1)
    amountKopeks!: number; // сумма в копейках

    @IsOptional()
    @IsString()
    comment?: string;
}
