import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MasterRanksController } from "./master-ranks.controller";
import { MasterRanksService } from "./master-ranks.service";

@Module({
    imports: [PrismaModule],
    controllers: [MasterRanksController],
    providers: [MasterRanksService],
})
export class MasterRanksModule {}
