import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';
import { createApp } from '../../apps/backend/dist/app.factory';

/**
 * FinVerse backend as a Netlify Function.
 * The Nest app boots once per cold start and is reused across warm
 * invocations. Netlify invokes this at /.netlify/functions/api/*, so the
 * function prefix is stripped before the request reaches Nest, whose
 * controllers live under /api/*.
 */
const FUNCTION_PREFIX = '/.netlify/functions/api';

let cachedHandler: Handler | undefined;

async function getHandler(): Promise<Handler> {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedHandler = serverless(expressApp) as unknown as Handler;
  }
  return cachedHandler;
}

export const handler: Handler = async (event, context) => {
  const strippedEvent = {
    ...event,
    path: event.path.startsWith(FUNCTION_PREFIX)
      ? event.path.slice(FUNCTION_PREFIX.length) || '/'
      : event.path,
  };
  const handle = await getHandler();
  return handle(strippedEvent, context);
};
