import { PrismaClient, Prisma } from '@prisma/client';
import tracer from './tracer';

const prisma = new PrismaClient();

// Register a middleware to instrument every query.
prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
  let queryStatement: string = '';

  if (
    (['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe'] as string[]).includes(
      params.action as string
    )
  ) {
    try {
      queryStatement =
        typeof params.args[0] === 'string'
          ? params.args[0]
          : JSON.stringify(params.args[0]);
    } catch {
      queryStatement = 'unknown raw query';
    }
  } else if (params.model) {
    queryStatement = `${params.model}.${params.action}`;
  } else {
    queryStatement = params.action as string;
  }

  // DD Span Start
  const span = tracer.startSpan('prisma.query', {
    tags: {
      'span.kind': 'client',
      'db.type': 'postgresql',
      'db.statement': queryStatement,
    },
  });

  try {
    const result = await next(params);
    span.setTag('db.response', result);
    return result;
  } catch (error: any) {
    span.setTag('error', true);
    span.setTag('error.msg', error.message);
    throw error;
  } finally {
    span.finish();
  }
});

export default prisma;
