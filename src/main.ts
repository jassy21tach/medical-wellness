import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Medical Wellness API")
    .setDescription(
      "Backend MVP — Authentication, RBAC, Clients, Employees, Appointments",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(config.get<string>("PORT", "4000"));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `Medical Wellness API listening on http://localhost:${port}/api/v1`,
  );
  // eslint-disable-next-line no-console
  console.log(`Swagger UI at http://localhost:${port}/api/docs`);
}

void bootstrap();
