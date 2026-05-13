
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const client = neon(process.env.DATABASE_URL);

async function getLatestOTP() {
  try {
    // Query the database directly for the latest code in otp_codes table
    const results = await client`SELECT code FROM otp_codes ORDER BY created_at DESC LIMIT 1`;
    
    if (results.length > 0) {
      console.log("LATEST_OTP:" + results[0].code);
    } else {
      console.log("NO_OTP_FOUND");
    }
  } catch (err) {
    console.error("ERROR_FETCHING_OTP:", err);
  }
}

getLatestOTP();
