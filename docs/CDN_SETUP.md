# CDN Setup Guide - Phase 2: Edge & Ingress

**Objective**: Configure Cloudflare CDN for TrueSpend to improve performance, security, and global availability.

---

## Prerequisites

- A domain name (e.g., `truespend.com`)
- Access to domain DNS settings
- Cloudflare account (free tier is sufficient)

---

## Step 1: Create Cloudflare Account

1. Visit [cloudflare.com](https://cloudflare.com) and sign up
2. Choose the **Free Plan** (sufficient for Phase 2)
3. Verify your email address

---

## Step 2: Add Your Domain

1. Click **"Add a Site"** in Cloudflare dashboard
2. Enter your domain name (e.g., `truespend.com`)
3. Click **"Add site"**
4. Select the **Free Plan**

---

## Step 3: Update DNS Records

### Option A: Quick Add (Cloudflare scans existing DNS)
1. Cloudflare will automatically scan your existing DNS records
2. Review the records it found
3. Click **"Continue"** to import them

### Option B: Manual Add
Add these DNS records manually:

```
Type: A
Name: @
Content: [Your Lovable app IP - get from Lovable settings]
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: www
Content: truespend.com
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: api
Content: [Your Supabase project URL]
Proxy status: Proxied (orange cloud)
```

**Important**: Ensure the proxy status is **Proxied** (orange cloud icon) for CDN caching.

---

## Step 4: Update Nameservers

Cloudflare will provide you with two nameservers:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Navigate to DNS settings
3. Replace existing nameservers with Cloudflare's nameservers
4. Save changes

**Note**: DNS propagation can take up to 24 hours (usually < 1 hour).

---

## Step 5: Configure Caching Rules

### 5.1 Page Rules (Free Plan: 3 rules)

Navigate to **Rules** → **Page Rules** and create:

#### Rule 1: API No-Cache
- **URL Pattern**: `api.truespend.com/*`
- **Settings**:
  - Cache Level: Bypass
  - Disable Performance

#### Rule 2: Static Assets Cache
- **URL Pattern**: `*.truespend.com/*.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)`
- **Settings**:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 30 days

#### Rule 3: HTML Cache
- **URL Pattern**: `truespend.com/*`
- **Settings**:
  - Cache Level: Standard
  - Browser Cache TTL: 1 hour

### 5.2 Cache Rules (Alternative for Pro/Business plans)

If you upgrade, use **Cache Rules** instead:

```yaml
# Static Assets
Match: File extension is one of jpg, jpeg, png, gif, ico, css, js, svg, woff, woff2
Then:
  - Eligible for cache: Yes
  - Edge TTL: 30 days
  - Browser TTL: 7 days

# API Responses
Match: Hostname equals api.truespend.com
Then:
  - Eligible for cache: No
  - Bypass cache: Yes

# HTML Pages
Match: Hostname equals truespend.com AND File extension equals html
Then:
  - Eligible for cache: Yes
  - Edge TTL: 1 hour
  - Browser TTL: 5 minutes
```

---

## Step 6: Enable Performance Features

Navigate to **Speed** → **Optimization**:

- ✅ Enable **Auto Minify** (JavaScript, CSS, HTML)
- ✅ Enable **Brotli Compression**
- ✅ Enable **Rocket Loader** (defer JS loading)
- ✅ Enable **Mirage** (lazy load images on mobile)
- ✅ Enable **Polish** (image compression) - *requires Pro plan*

---

## Step 7: Configure SSL/TLS

Navigate to **SSL/TLS**:

1. Set **SSL/TLS encryption mode** to **Full (strict)**
2. Enable **Always Use HTTPS**
3. Enable **Automatic HTTPS Rewrites**
4. Enable **TLS 1.3**
5. Enable **Minimum TLS Version**: TLS 1.2
6. Enable **HSTS** (HTTP Strict Transport Security):
   - Max Age Header: 12 months
   - Include subdomains: Yes
   - Preload: Yes

---

## Step 8: Geographic Distribution

### Check Edge Locations
Cloudflare automatically uses 300+ edge locations globally.

To verify:
1. Visit **Analytics** → **Traffic**
2. Check **Requests by Country** map
3. Verify users are being served from nearby edges

### Argo Smart Routing (Optional - Paid)
For even better performance:
1. Navigate to **Traffic** → **Argo**
2. Enable **Argo Smart Routing** ($0.10/GB after first 1GB free)
3. This routes traffic through Cloudflare's fastest paths

---

## Step 9: Verify CDN is Working

### Test 1: Check DNS Resolution
```bash
dig truespend.com
# Should return Cloudflare IPs (e.g., 104.21.x.x or 172.67.x.x)
```

### Test 2: Check CDN Headers
```bash
curl -I https://truespend.com
# Look for these headers:
# CF-Cache-Status: HIT or MISS
# CF-Ray: [ray-id]
# Server: cloudflare
```

### Test 3: Performance Test
1. Visit [tools.pingdom.com](https://tools.pingdom.com)
2. Enter your domain
3. Check load time from multiple locations
4. **Target**: <2s load time globally

---

## Cache Purging

### Manual Purge
1. Go to **Caching** → **Configuration**
2. Click **Purge Everything** or **Custom Purge**
3. For selective purge, enter specific URLs

### API Purge (Automated)
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## Monitoring CDN Performance

### Cloudflare Analytics
Navigate to **Analytics** → **Traffic**:
- Requests served
- Bandwidth saved
- Cache hit ratio (target: >85%)
- Threats blocked
- Response time by location

### Key Metrics to Monitor
- **Cache Hit Ratio**: Should be >85% after warmup
- **Time to First Byte (TTFB)**: <100ms globally
- **Total Load Time**: <2s globally
- **Bandwidth Savings**: 60-80% typical

---

## Troubleshooting

### Issue: Low Cache Hit Rate (<50%)
**Solutions**:
- Review cache rules - may be too restrictive
- Check for dynamic query parameters
- Enable **Cache Query String Sort**
- Use **Custom Cache Keys** to ignore unnecessary parameters

### Issue: Origin Server Still Getting Hit
**Solutions**:
- Verify proxy status is **Proxied** (orange cloud)
- Check page rules are correctly configured
- Ensure no cache bypass headers from origin (`Cache-Control: no-cache`)

### Issue: SSL Errors
**Solutions**:
- Change SSL mode to **Full** (not Full Strict) temporarily
- Verify origin certificate is valid
- Check SSL/TLS version compatibility

---

## Cost Optimization

### Free Plan Limits
- 3 Page Rules
- Unlimited requests
- Standard DDoS protection
- Shared SSL certificate
- 24-hour analytics retention

### When to Upgrade to Pro ($20/month)
- Need more than 3 Page Rules
- Want **Polish** image compression
- Need **Mobile Redirects**
- Want **WAF Custom Rules** (10 rules)
- Need 30-day analytics retention

### When to Upgrade to Business ($200/month)
- Need 20+ Page Rules
- Want 100 WAF Custom Rules
- Need **Argo Smart Routing**
- Want **Image Resizing**
- Need 1-year analytics retention

---

## Security Considerations

1. **Always Proxied**: Keep DNS records proxied to hide origin IP
2. **SSL Full Strict**: Prevent man-in-the-middle attacks
3. **HSTS Enabled**: Force HTTPS for all connections
4. **Rate Limiting**: Configure in WAF (see WAF_SETUP.md)
5. **Bot Management**: Enable Cloudflare Bot Fight Mode (free)

---

## Next Steps

1. ✅ Complete CDN setup
2. ➡️ Configure WAF rules (see [WAF_SETUP.md](./WAF_SETUP.md))
3. ➡️ Enable DDoS protection (see [DDOS_PROTECTION.md](./DDOS_PROTECTION.md))
4. ➡️ Run integration tests (see [PHASE2_IMPLEMENTATION.md](./PHASE2_IMPLEMENTATION.md))

---

## Resources

- [Cloudflare Learning Center](https://www.cloudflare.com/learning/)
- [Cloudflare Cache API](https://developers.cloudflare.com/cache/)
- [Cloudflare Page Rules](https://developers.cloudflare.com/rules/page-rules/)
- [SSL/TLS Best Practices](https://developers.cloudflare.com/ssl/)

---

**Last Updated**: 2025-11-10  
**Phase**: 2 (Security & Ingress)  
**Version**: 1.0
