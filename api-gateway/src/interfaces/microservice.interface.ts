export interface MicroserviceConfig {
   name: string;
   url: string;
   swaggerPath: string;
   prefix: string;
   healthCheck: string;
}

export interface SwaggerDocument {
   openapi: string;
   info: any;
   paths: any;
   components?: any;
   tags?: any[];
   servers?: any[];
}

export interface AuthPayload {
   employeeId: number;
   permissions: any[];
   isAdmin?: boolean;
}
