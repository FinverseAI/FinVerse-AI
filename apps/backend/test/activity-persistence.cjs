// Run after building and migrating: node --env-file=.env test/activity-persistence.cjs
// All test data is rolled back, including on failure.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { ActivityService } = require('../dist/activity/activity.service.js');

const prisma = new PrismaClient();
const rollback = new Error('Rollback successful activity verification');

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const owner = `activity-test-${randomUUID()}`;
        await tx.user.create({
          data: { id: owner, email: `${owner}@example.invalid` },
        });
        const service = new ActivityService(tx);
        const created = [];
        for (let index = 0; index < 7; index++) {
          created.push(
            await service.addBill(owner, {
              name: `Test bill ${index}`,
              amount: '12.34',
              dueDate: `2026-11-${20 - index}`,
              autoPay: index % 2 === 0,
            }),
          );
        }
        const restored = await new ActivityService(tx).bills(owner);
        assert.equal(
          restored.length,
          7,
          'See all must return more than five bills',
        );
        assert.equal(
          restored[0].dueDate,
          '2026-11-14',
          'Bills must be sorted by due date',
        );
        assert.equal(restored[0].amount, 12.34);
        assert.deepEqual(
          await service.bills(`${owner}-other`),
          [],
          'Other users cannot read bills',
        );
        await assert.rejects(
          service.removeBill(`${owner}-other`, created[0].id),
          (error) => error.getStatus() === 404,
        );
        assert.equal((await service.bills(owner)).length, 7);
        await service.removeBill(owner, created[0].id);
        assert.equal(
          (await new ActivityService(tx).bills(owner)).length,
          6,
          'Removal must persist in the database',
        );
        await service.addTransaction(owner, {
          name: 'Test expense',
          amount: -0.3,
          date: '2026-11-13',
          category: 'Other',
        });
        await service.addTransaction(owner, {
          name: 'Test income',
          amount: 1000,
          date: '2026-11-12',
          category: 'Income',
        });
        const transactions = await new ActivityService(tx).transactions(owner);
        assert.deepEqual(
          transactions.map((item) => item.amount),
          [-0.3, 1000],
        );
        assert.deepEqual(await service.transactions(`${owner}-other`), []);
        throw rollback;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
  console.log(
    'Database verification passed: create, reload, full lists, removal, decimal precision, and user isolation. All test records rolled back.',
  );
}

main().catch((error) => {
  console.error(
    'Activity database verification failed:',
    error.code ?? error.name,
  );
  process.exitCode = 1;
});
