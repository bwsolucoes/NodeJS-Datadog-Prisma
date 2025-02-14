import prisma from './prismaClient';

async function runQuery() {
  try {
    // Testing with prisma queryRaw
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 + 1 AS result;`;
    console.log("Query result:", result);
  } catch (error) {
    console.error("Error running query:", error);
  }
}

async function runModelQueries() {
  try {
    // Testing with other prisma query methods
    const users = await prisma.user.findMany({
      include: {
        posts: true,
      },
    });
    console.log('findMany result:', users);
  } catch (error) {
    console.error("Error running query:", error);
  }
}

runModelQueries().catch((error) =>
  console.error('Error executing model queries:', error)
);

async function main() {
  await runQuery();
  setInterval(runQuery, 5000);
}

main().catch((error) => console.error("Error in main:", error));

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
