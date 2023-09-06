import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
  });
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
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // swagger
  const swaggerUsername = process.env.SWAGGER_USERNAME as string;
  const swaggerPassword = process.env.SWAGGER_PASSWORD as string;
  if (swaggerUsername && swaggerPassword) {
    const swaggerUsers: Record<string, string> = {
      [swaggerUsername]: swaggerPassword,
    };
    app.use(
      // Paths you want to protect with basic auth
      '/api/doc',
      basicAuth({
        challenge: true,
        users: swaggerUsers,
      }),
    );
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('ThePrimes - ArtReveal')
    .setDescription('The ArtReveal API')
    .setVersion('1.0.0-' + process.env.NODE_ENV)
    .addBasicAuth()
    .addSecurity('admin-auth', {
      type: 'apiKey',
      description: 'Api Key',
      name: 'X-Api-Key',
      in: 'header',
    })
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig, {
    extraModels: [],
  });
  SwaggerModule.setup('api/doc', app, document, {
    customCss: '.topbar{display: none} .swagger-ui textarea{font-size: 1.3rem}',
    swaggerOptions: {
      tryItOutEnabled: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 0,
      syntaxHighlight: {
        theme: 'monokai',
      },
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 9000);
}
bootstrap();
