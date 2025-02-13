import tracer from "./tracer";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Monkey-patches PrismaClient.$queryRaw to wrap queries in a custom Datadog span.
 * We capture the original parameters and return type to keep the signature.
 */
function instrumentPrisma(client: PrismaClient) {
  // Save the original method.
  const originalQueryRaw = client.$queryRaw.bind(client);

  // Override $queryRaw with a function matching its original parameters.
  client.$queryRaw = (async function (
    ...args: Parameters<typeof originalQueryRaw>
  ): Promise<ReturnType<typeof originalQueryRaw>> {
    // Determine the query statement for tagging.
    let queryStatement: string;
    try {
      queryStatement =
        typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
    } catch (err) {
      queryStatement = 'unknown query';
    }

    // Start a custom Datadog span.
    const span = tracer.startSpan('prisma.query', {
      tags: {
        'span.kind': 'client',
        'db.type': 'postgresql',
        'db.statement': queryStatement,
      },
    });

    try {
      const result = await originalQueryRaw(...args);
      span.setTag('db.response', result);
      return result;
    } catch (error: any) {
      span.setTag('error', true);
      span.setTag('error.msg', error.message);
      throw error;
    } finally {
      span.finish();
    }
  } as unknown) as typeof prisma.$queryRaw;
}

// Apply instrumentation.
instrumentPrisma(prisma);

async function runQuery() {
  try {
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 + 1 AS result;`;
    console.log("Query result:", result);
  } catch (error) {
    console.error("Error running query:", error);
  }
}

async function main() {
  await runQuery();
  setInterval(runQuery, 5000);
}

main().catch((error) => console.error("Error in main:", error));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received. Disconnecting Prisma...');
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Disconnecting Prisma...');
  await prisma.$disconnect();
  process.exit(0);
});
