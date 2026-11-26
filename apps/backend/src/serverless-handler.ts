import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { EventEmitter } from 'node:events';
import serverless from 'serverless-http';

export function createServerlessHandler(app: INestApplication) {
  return serverless(app.getHttpAdapter().getInstance(), {
    request: (request: IncomingMessage) => {
      // serverless-http supplies an unread body stream but marks its mock
      // socket unreadable. Express's body parser consequently considers the
      // request finished and leaves req.body as a Buffer. Mark the synthetic
      // socket readable so Nest's normal parsers enforce JSON syntax, charset
      // and size limits before the controllers receive the request.
      // The parser also listens for socket events when draining a rejected
      // body (for example one over the size limit).
      Object.setPrototypeOf(request.socket, EventEmitter.prototype);
      request.socket.readable = true;
    },
  });
}
