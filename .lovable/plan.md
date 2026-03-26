

## Plaid Production Readiness Plan

### Phase 1: Critical Fixes (Must Do)

1. **Add Plaid Webhook Handler**
   - Create `supabase/functions/webhook-plaid/index.ts` edge function
   - Handle `TRANSACTIONS`, `ITEM`, and `AUTH` webhook types
   - Set `verify_jwt = false` in config.toml (webhooks don't have JWT)
   - Add `PLAID_WEBHOOK_SECRET` to secrets

2. **Add Sync Cursor Support**
   - Add `sync_cursor` column to `plaid_items` table
   - Update `plaid-sync-transactions` to use cursor for incremental sync
   - Store cursor after each sync to avoid re-fetching transactions

3. **Configure Cloudflare WAF Allowlist**
   - Add Plaid IP addresses to Cloudflare allowlist
   - Production IPs: `54.81.125.132`, `54.165.242.34`, `35.174.38.70`
   - Path: `/functions/v1/webhook-plaid`

### Phase 2: Recommended Improvements

4. **Encrypt Access Tokens**
   - Use Supabase Vault to store access tokens securely
   - Update all edge functions to decrypt tokens on use

5. **Add Plaid Error Handling**
   - Handle `ITEM_LOGIN_REQUIRED` errors (Link update mode)
   - Handle `PENDING_EXPIRATION` warnings
   - Store `error_message` in `plaid_items.error_message` column

6. **Configure Plaid Dashboard**
   - Set webhook URL: `https://uolpwcngftpmgkopltwz.supabase.co/functions/v1/webhook-plaid`
   - Add redirect URIs for OAuth banks (if needed)
   - Verify production mode is enabled in Plaid Dashboard

### Phase 3: Testing

7. **Test Production Flow**
   - Connect a real bank account
   - Verify transactions sync correctly
   - Test webhook delivery
   - Test disconnect flow

