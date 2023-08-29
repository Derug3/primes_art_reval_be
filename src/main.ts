import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  process.setMaxListeners(1500);

  app.enableCors({
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Api-Key',
    ],
    methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    exposedHeaders: ['Link'],
    maxAge: 3600,
    origin: new RegExp(process.env.CORS_ALLOW_ORIGIN!),
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  await app.listen(process.env.PORT || 9000);
}
bootstrap();
