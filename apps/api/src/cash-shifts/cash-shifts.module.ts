import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CashShiftsController } from "./cash-shifts.controller";
import { CashShiftsService } from "./cash-shifts.service";

@Module({
    imports: [PrismaModule],
    controllers: [CashShiftsController],
    providers: [CashShiftsService],
})
export class CashShiftsModule {}
