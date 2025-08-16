import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/base/globalException.filter';
import { SuccessResponseInterceptor } from './common/interceptor/response.interceptor';
async function bootstrap() {
   const app = await NestFactory.create(AppModule);
   const configService = app.get(ConfigService);
   const port = configService.get<number>('PORT');
   const hostname = configService.get<string>('HOST');
   app.setGlobalPrefix('api');
   const config = new DocumentBuilder()
      .setTitle('TechLeet User Service API')
      .setDescription('The TechLeet User Service API description')
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

   app.useGlobalFilters(new GlobalHttpExceptionFilter());
   app.useGlobalInterceptors(
      new SuccessResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
   );
   app.useGlobalPipes(new ValidationPipe({ transform: true }));

   await app.listen(port, hostname, () => {
      console.log('---------------------------------------------------------------------------\n');
      console.log(
         '\x1b[42m    Server is running   \x1b[0m' +
            ' ' +
            '\x1b[42m   ' +
            hostname +
            '   \x1b[0m ' +
            '\x1b[42m   ' +
            port +
            '   \x1b[0m    ',
      );
      console.log('\n---------------------------------------------------------------------------');

      console.log(`\x1b[36m Server URL: http://${hostname}:${port} \x1b[0m`);
   });
}
bootstrap();
