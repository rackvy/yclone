import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StockMovementsController } from "./stock-movements.controller";
import { StockMovementsService } from "./stock-movements.service";

@Module({
    imports: [PrismaModule],
    controllers: [StockMovementsController],
    providers: [StockMovementsService],
})
export class StockMovementsModule {}
