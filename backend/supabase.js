// backend/supabase.js
const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // ❗ใช้ service role เฉพาะ backend เท่านั้น

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

module.exports = { getSupabase };
