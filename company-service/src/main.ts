import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
   const app = await NestFactory.create(AppModule);
   const configService = app.get(ConfigService);
   const port = configService.get<number>('PORT', 3032);
   const hostname = configService.get<string>('HOST', 'localhost');

   app.setGlobalPrefix('api');

   const config = new DocumentBuilder()
      .setTitle('TechLeet Company Service API')
      .setDescription('API for managing company departments, positions, and organizational structure')
      .setVersion('1.0')
      .addBearerAuth(
         {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
         },
         'token',
      )
      .build();

   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api', app, document, {
      swaggerOptions: { persistAuthorization: true },
      jsonDocumentUrl: 'api/swagger/json',
   });

   app.use(helmet());
   app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3030'],
      credentials: true,
   });

   app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
   );
   app.useGlobalPipes(new ValidationPipe({ transform: true }));

   await app.listen(port, hostname, () => {
      console.log('---------------------------------------------------------------------------\n');
      console.log(
         '\x1b[46m    Company Service   \x1b[0m' +
            ' ' +
            '\x1b[46m   ' +
            hostname +
            '   \x1b[0m ' +
            '\x1b[46m   ' +
            port +
            '   \x1b[0m    ',
      );
      console.log('\n---------------------------------------------------------------------------');
      console.log(`\x1b[36m Company Service URL: http://${hostname}:${port} \x1b[0m`);
   });
}
bootstrap();
