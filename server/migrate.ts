import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("🔧 Running manual migration...");

  const statements = [
    // Add missing columns to users table
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_attempts NUMERIC DEFAULT 0 NOT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS xp NUMERIC DEFAULT 0 NOT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS level NUMERIC DEFAULT 1 NOT NULL`,

    // Create currency_pref enum if not exists
    `DO $$ BEGIN
      CREATE TYPE currency_pref AS ENUM ('USD', 'INR');
    EXCEPTION WHEN duplicate_object THEN null; END $$`,

    // Create otp_type enum values if not exists
    `DO $$ BEGIN
      ALTER TYPE otp_type ADD VALUE IF NOT EXISTS 'pin_setup';
    EXCEPTION WHEN others THEN null; END $$`,
    `DO $$ BEGIN
      ALTER TYPE otp_type ADD VALUE IF NOT EXISTS 'pin_reset';
    EXCEPTION WHEN others THEN null; END $$`,

    // Add currency_preference column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS currency_preference currency_pref DEFAULT 'USD' NOT NULL`,

    // Create learn_level enum if not exists
    `DO $$ BEGIN
      CREATE TYPE learn_level AS ENUM ('beginner', 'intermediate', 'advanced');
    EXCEPTION WHEN duplicate_object THEN null; END $$`,

    // Create learn_status enum if not exists
    `DO $$ BEGIN
      CREATE TYPE learn_status AS ENUM ('seen', 'completed');
    EXCEPTION WHEN duplicate_object THEN null; END $$`,

    // Create learn_questions table
    `CREATE TABLE IF NOT EXISTS learn_questions (
      id VARCHAR(100) PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      difficulty learn_level DEFAULT 'beginner' NOT NULL,
      options TEXT,
      correct_answer TEXT,
      xp_reward NUMERIC DEFAULT 10 NOT NULL
    )`,

    // Create user_learn_progress table
    `CREATE TABLE IF NOT EXISTS user_learn_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id VARCHAR(100) NOT NULL REFERENCES learn_questions(id) ON DELETE CASCADE,
      status learn_status DEFAULT 'seen' NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, question_id)
    )`,

    // Create badges table
    `CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      xp_reward NUMERIC DEFAULT 50 NOT NULL
    )`,

    // Create user_badges table
    `CREATE TABLE IF NOT EXISTS user_badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id VARCHAR(100) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, badge_id)
    )`,

    // Create user_quests table
    `CREATE TABLE IF NOT EXISTS user_quests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id VARCHAR(100) NOT NULL,
      progress NUMERIC DEFAULT 0 NOT NULL,
      target NUMERIC NOT NULL,
      completed BOOLEAN DEFAULT false NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, quest_id)
    )`,
  ];

  for (const stmt of statements) {
    try {
      await sql(stmt);
      console.log("✅", stmt.slice(0, 60).replace(/\n/g, " ").trim() + "...");
    } catch (err: any) {
      console.warn("⚠️  Skipped (already exists or error):", err.message?.slice(0, 100));
    }
  }

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
