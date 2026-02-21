import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CashboxesService } from "./cashboxes.service";
import { CashboxesController } from "./cashboxes.controller";

@Module({
    imports: [PrismaModule],
    providers: [CashboxesService],
    controllers: [CashboxesController],
    exports: [CashboxesService],
})
export class CashboxesModule {}
