#!/usr/bin/env node
// Generates an Apple "Sign in with Apple" client secret JWT (valid 6 months).
// This Supabase project's Apple provider only exposes "Client IDs" + "Secret Key
// (for OAuth)", so we must supply the signed client-secret JWT ourselves.
// Re-run every 6 months and update the Secret Key in Supabase → Auth → Providers → Apple.
//
// Usage:
//   node scripts/generate-apple-secret.js
//
// Requirements: Node.js 15+ (built-in crypto — no npm install needed)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const TEAM_ID     = 'T6GYVDW7V2';                  // Apple Developer Team ID
const KEY_ID      = '877RPG827V';                  // Sign in with Apple Key ID (AuthKey_<KEY_ID>.p8)
const SERVICES_ID = 'com.truespend.signin';        // Services ID (Supabase "Client IDs")
const P8_PATH     = `${process.env.HOME}/Documents/TrueSpend-IOS-Certs/AuthKey/AuthKey_877RPG827V.p8`;
// ─────────────────────────────────────────────────────────────────────────────

const privateKey = fs.readFileSync(path.resolve(P8_PATH), 'utf8');
const now = Math.floor(Date.now() / 1000);

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp: now + 15777000, // 6 months
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
})).toString('base64url');

const signingInput = `${header}.${payload}`;
const sign = crypto.createSign('SHA256');
sign.update(signingInput);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

const jwt = `${signingInput}.${signature}`;
console.log('\nGenerated client secret JWT (paste into Supabase → Apple provider → Secret Key):\n');
console.log(jwt);
console.log(`\nExpires: ${new Date((now + 15777000) * 1000).toLocaleDateString()}\n`);
