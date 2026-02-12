import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // выкидывает лишние поля
            forbidNonWhitelisted: true, // ругается если прислали лишние поля
            transform: true, // включает преобразования типов
        }),
    );

    app.enableCors({
        origin: true,
        credentials: true,
    });

    await app.listen(process.env.PORT || 4000);
}
bootstrap();
