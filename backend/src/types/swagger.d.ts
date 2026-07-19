declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';
  export const serve: RequestHandler[];
  export function setup(swaggerDoc?: any, opts?: any, options?: any, css?: any, favIcon?: any, swaggerUrl?: any, customeSiteTitle?: any): RequestHandler;
}

declare module 'swagger-jsdoc' {
  function swaggerJSDoc(options: any): any;
  export = swaggerJSDoc;
}
