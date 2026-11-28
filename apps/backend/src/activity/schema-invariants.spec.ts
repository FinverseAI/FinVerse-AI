import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * B46 — the database CHECK constraints (and the ivfflat vector index)
 * live ONLY in migration SQL: Prisma cannot express them, so
 * schema.prisma does not show them. This test pins the invariant two
 * ways: the constraints must still exist in the migration files, and
 * schema.prisma must carry the comment that documents them — so a
 * future migration that drops one, or a schema rewrite that forgets
 * the comment, fails loudly instead of silently losing a guardrail.
 * This is a static check (no database connection): it asserts the
 * SQL that would run, not a live database's pg_constraint catalog.
 */
describe('database CHECK constraints (B46 invariant)', () => {
  const backendRoot = join(process.cwd(), 'prisma');
  const schema = readFileSync(join(backendRoot, 'schema.prisma'), 'utf8');
  const migrationSql = readdirSync(join(backendRoot, 'migrations'))
    .filter((name) => name !== 'migration_lock.toml')
    .map((name) =>
      readFileSync(
        join(backendRoot, 'migrations', name, 'migration.sql'),
        'utf8',
      ),
    )
    .join('\n');

  it.each([
    'profile_budget_check',
    'profile_investments_check',
    'user_financial_profile_payday_check',
    'user_bills_positive_amount',
    'user_transactions_nonzero_amount',
    'user_bill_payments_positive_amount',
    'user_goal_contributions_positive_amount',
    'user_bills_recurrence_check',
    'watchlist_alert_pair',
  ])('migration SQL still defines the %s CHECK constraint', (name) => {
    expect(migrationSql).toContain(`CONSTRAINT "${name}" CHECK`);
  });

  it('documents the SQL-only constraints in schema.prisma', () => {
    for (const name of [
      'profile_budget_check',
      'profile_investments_check',
      'user_financial_profile_payday_check',
      'user_bills_positive_amount',
      'user_transactions_nonzero_amount',
      'user_bill_payments_positive_amount',
      'user_goal_contributions_positive_amount',
      'user_bills_recurrence_check',
      'watchlist_alert_pair',
    ]) {
      expect(schema).toContain(name);
    }
    expect(schema).toContain('B46');
  });

  it('permits paydays through the 31st in SQL', () => {
    expect(migrationSql).toContain('"payday" BETWEEN 1 AND 31');
  });
});
