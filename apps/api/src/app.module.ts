import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CompanyModule } from "./company/company.module";
import { BranchesModule } from "./branches/branches.module";
import { MasterRanksModule } from "./master-ranks/master-ranks.module";
import { EmployeesModule } from "./employees/employees.module";
import { UsersModule } from "./users/users.module";
import { ServicesModule } from "./services/services.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { AvailabilityModule } from "./availability/availability.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { ClientsModule } from "./clients/clients.module";
import { ServiceCategoriesModule } from "./service-categories/service-categories.module";
import { ProductCategoriesModule } from "./product-categories/product-categories.module";
import { ProductsModule } from "./products/products.module";
import { StockMovementsModule } from "./stock-movements/stock-movements.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        CompanyModule,
        BranchesModule,
        MasterRanksModule,
        EmployeesModule,
        UsersModule,
        ServicesModule,
        ScheduleModule,
        AvailabilityModule,
        AppointmentsModule,
        ClientsModule,
        ServiceCategoriesModule,
        ProductCategoriesModule,
        ProductsModule,
        StockMovementsModule,
    ],
})
export class AppModule {}
