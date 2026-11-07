import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const docs = new DocumentBuilder()
    .setTitle('Iwear API')
    .setDescription('Backend for the Iwear web site and, later, the mobile apps.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, docs));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Iwear API on http://localhost:${port}/api (docs at /api/docs)`);
}
bootstrap();
