import { sql } from "drizzle-orm";
import { db } from "./index.js";

let bootstrapped = false;

/**
 * Ensures all enums, tables, and columns added across all phases
 * exist in the database with zero-downtime, idempotent SQL statements.
 */
export async function ensureDatabaseSchema() {
  if (bootstrapped) return;

  try {
    console.log("🛠️  Checking and bootstrapping database schema...");

    await db.execute(sql`
      -- 1. Create Enums if missing
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
          CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
          CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'expired');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
          CREATE TYPE order_type AS ENUM ('limit', 'stop_loss', 'take_profit');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_side') THEN
          CREATE TYPE order_side AS ENUM ('buy', 'sell');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM ('open', 'filled', 'cancelled', 'expired');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          CREATE TYPE notification_type AS ENUM ('trade', 'alert', 'deposit', 'withdraw', 'security', 'system');
        END IF;
      END $$;

      -- 2. Add KYC columns to users table if missing
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status kyc_status DEFAULT 'unverified' NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_level INTEGER DEFAULT 1 NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_number TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_dob VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_country VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

      -- 3. Add Referral columns to users table if missing
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

      -- 4. Add Moderation / Account Block columns if missing
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;

      -- 5. Create referrals table if not exists
      CREATE TABLE IF NOT EXISTS referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status referral_status DEFAULT 'pending' NOT NULL,
        reward_amount NUMERIC(18, 8) DEFAULT '25' NOT NULL,
        claimed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);
      CREATE INDEX IF NOT EXISTS referrals_referred_idx ON referrals(referred_user_id);

      -- 5. Create notifications table if not exists
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type DEFAULT 'system' NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE NOT NULL,
        link TEXT,
        data JSON,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

      -- 6. Create orders table if not exists
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        coin_id VARCHAR(100) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        type order_type NOT NULL,
        side order_side NOT NULL,
        target_price NUMERIC(18, 8) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL,
        total NUMERIC(18, 8) NOT NULL,
        status order_status DEFAULT 'open' NOT NULL,
        filled_price NUMERIC(18, 8),
        reason VARCHAR(50),
        confidence INTEGER,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        filled_at TIMESTAMP,
        cancelled_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
      CREATE INDEX IF NOT EXISTS orders_coin_idx ON orders(coin_id);
    `);

    bootstrapped = true;
    console.log("✅ Database schema bootstrapped successfully.");
  } catch (err: any) {
    console.warn("⚠️  Schema bootstrap warning (will continue):", err.message);
  }
}
