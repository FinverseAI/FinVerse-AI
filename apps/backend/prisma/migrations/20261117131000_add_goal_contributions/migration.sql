CREATE TABLE "user_goal_contributions" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" VARCHAR(140),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_goal_contributions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_goal_contributions_positive_amount" CHECK ("amount" > 0)
);

CREATE INDEX "user_goal_contributions_goal_id_idx" ON "user_goal_contributions"("goal_id");
CREATE INDEX "user_goal_contributions_user_id_idx" ON "user_goal_contributions"("user_id");
ALTER TABLE "user_goal_contributions" ADD CONSTRAINT "user_goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "user_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_goal_contributions" ADD CONSTRAINT "user_goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
