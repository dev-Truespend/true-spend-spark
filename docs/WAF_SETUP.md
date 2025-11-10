# WAF (Web Application Firewall) Setup Guide

**Objective**: Configure Cloudflare WAF to protect TrueSpend from common web attacks, bot abuse, and malicious traffic.

---

## What is WAF?

A Web Application Firewall (WAF) protects your application from:
- SQL injection attacks
- Cross-site scripting (XSS)
- Bot attacks and scraping
- DDoS amplification
- API abuse
- Zero-day exploits

---

## Prerequisites

- Cloudflare account with domain configured (see [CDN_SETUP.md](./CDN_SETUP.md))
- DNS records proxied through Cloudflare (orange cloud)

---

## Step 1: Enable WAF Managed Rules (Free Plan)

Navigate to **Security** → **WAF**:

### 1.1 OWASP Core Ruleset
1. Click **Deploy Managed Ruleset**
2. Select **"Cloudflare OWASP Core Ruleset"**
3. Click **Deploy**

**What it protects**:
- SQL injection
- XSS attacks
- Remote file inclusion
- Local file inclusion
- Command injection

**Recommended Mode**: Block (default)

### 1.2 Cloudflare Managed Ruleset
1. Click **Deploy Managed Ruleset**
2. Select **"Cloudflare Managed Ruleset"**
3. Click **Deploy**

**What it protects**:
- Zero-day vulnerabilities
- Known CVEs
- WordPress vulnerabilities
- Application-specific attacks

**Recommended Mode**: Block (default)

---

## Step 2: Configure Rate Limiting (Free: 1 rule)

### 2.1 API Rate Limiting
Navigate to **Security** → **WAF** → **Rate Limiting Rules**:

```yaml
Rule Name: API Rate Limit
Match:
  - Hostname equals api.truespend.com
  - Request method equals POST, PUT, DELETE
Then:
  - Requests: 100 requests
  - Period: 10 seconds
  - Action: Block
  - Duration: 60 seconds
```

**What it prevents**:
- API abuse
- Brute force attacks
- Credential stuffing
- Resource exhaustion

### 2.2 Login Rate Limiting (if you upgrade)
```yaml
Rule Name: Login Rate Limit
Match:
  - URI Path equals /auth/login
Then:
  - Requests: 5 requests
  - Period: 60 seconds
  - Action: Challenge (CAPTCHA)
  - Duration: 300 seconds
```

---

## Step 3: Custom WAF Rules (Free: 5 rules)

Navigate to **Security** → **WAF** → **Custom rules**:

### Rule 1: Block Suspicious User Agents
```yaml
Rule Name: Block Bad Bots
Match:
  User Agent contains any of:
    - "sqlmap"
    - "nikto"
    - "nmap"
    - "masscan"
    - "scrapy"
Then: Block
```

### Rule 2: Challenge Anonymous Proxies
```yaml
Rule Name: Challenge Anonymizers
Match:
  - Known Bots equals Off
  - Anonymizer Detection equals On
Then: Managed Challenge
```

### Rule 3: Block Countries (Optional)
```yaml
Rule Name: Geographic Restrictions
Match:
  Country not in:
    - US
    - CA
    - GB
    - [Your allowed countries]
Then: Block
```

**Note**: Only use if you have specific geographic requirements.

### Rule 4: Protect Admin Endpoints
```yaml
Rule Name: Admin Protection
Match:
  - URI Path equals /admin/*
  - IP Address not in [Your office IPs]
Then: Challenge
```

### Rule 5: Block Empty User Agents
```yaml
Rule Name: Require User Agent
Match:
  - User Agent equals ""
  - Known Bots equals Off
Then: Block
```

---

## Step 4: Bot Management (Free Tier)

Navigate to **Security** → **Bots**:

### 4.1 Bot Fight Mode (Free)
1. Enable **Bot Fight Mode**
2. This automatically:
   - Challenges bad bots
   - Allows verified bots (Google, Bing)
   - Blocks malicious bots

### 4.2 Verified Bot Allowlist
Ensure these are allowed:
- ✅ Googlebot (Search)
- ✅ Bingbot (Search)
- ✅ Uptimerobot (Monitoring)
- ❌ SEMrush (Scraper - block if not needed)

---

## Step 5: Security Level Configuration

Navigate to **Security** → **Settings**:

### 5.1 Security Level
- **Development**: Essentially Off (not recommended)
- **Low**: Less sensitive detection
- **Medium**: Balanced (recommended for most sites)
- **High**: More aggressive blocking
- **I'm Under Attack!**: Maximum protection (temporary)

**Recommended**: Start with **Medium**, escalate to **High** if under attack.

### 5.2 Challenge Passage
- **5 minutes**: Very aggressive (may frustrate users)
- **30 minutes**: Balanced (recommended)
- **1 day**: Lenient (less secure)

**Recommended**: **30 minutes**

---

## Step 6: Configure Allowed IPs (Whitelist)

For trusted IPs that should bypass WAF:

1. Navigate to **Security** → **WAF** → **Tools**
2. Click **IP Access Rules**
3. Add your trusted IPs:

```
IP: 1.2.3.4/32
Action: Allow
Zone: This website
Notes: Office IP
```

**Common trusted IPs**:
- Your office/home static IP
- Monitoring service IPs (Pingdom, Uptime Robot)
- CI/CD pipeline IPs
- Payment processor IPs (if webhooks used)

---

## Step 7: Review Threat Analytics

Navigate to **Security** → **Analytics**:

### Key Metrics to Monitor:
- **Total threats mitigated**
- **Top threat types** (SQL injection, XSS, etc.)
- **Top attacking countries**
- **Top attacking IPs**
- **Bot traffic percentage**

### Weekly Review Checklist:
- [ ] Review blocked requests (false positives?)
- [ ] Check top attacking IPs (add to block list?)
- [ ] Monitor rule trigger counts
- [ ] Review CAPTCHA challenge success rate

---

## Step 8: Advanced Protection (Pro/Business Plans)

### Pro Plan ($20/month) Features:
- **10 custom WAF rules** (vs 5 on free)
- **WAF Analytics** (detailed threat insights)
- **Custom Error Pages** (branded block pages)
- **Geo Blocking** (block entire regions)

### Business Plan ($200/month) Features:
- **100 custom WAF rules**
- **Rate Limiting** (10 rules vs 1 on free)
- **Custom Managed Rulesets**
- **Log Push** (export WAF logs to SIEM)

---

## Testing WAF Configuration

### Test 1: SQL Injection Protection
```bash
# Should be blocked by WAF
curl "https://truespend.com/api/test?id=1' OR '1'='1"
# Expected: 403 Forbidden or WAF block page
```

### Test 2: XSS Protection
```bash
# Should be blocked by WAF
curl "https://truespend.com/search?q=<script>alert('xss')</script>"
# Expected: 403 Forbidden or WAF block page
```

### Test 3: Rate Limiting
```bash
# Make 150 requests in 10 seconds
for i in {1..150}; do
  curl -X POST https://api.truespend.com/test &
done
# Expected: 429 Too Many Requests after 100 requests
```

### Test 4: Bad Bot Detection
```bash
# Should be blocked/challenged
curl -A "sqlmap/1.0" https://truespend.com
# Expected: 403 Forbidden or challenge page
```

---

## Common False Positives & Solutions

### Issue: Legitimate Traffic Blocked
**Symptoms**: Users report 403 errors, especially on forms

**Solutions**:
1. Review **Security Events** log
2. Identify the triggered rule
3. Create **Bypass Rule** for specific paths:
```yaml
Match: URI Path equals /contact-form
Then: Skip all remaining rules
```

### Issue: Admin Panel Inaccessible
**Solution**: Whitelist your office IP (see Step 6)

### Issue: API Clients Blocked
**Solution**: Implement custom authentication header:
```yaml
Match: 
  - URI Path starts with /api/
  - Header "X-API-Key" equals "your-secret-key"
Then: Skip WAF
```

---

## Emergency: Under Attack Mode

If experiencing a DDoS attack:

1. Navigate to **Overview**
2. Click **Under Attack Mode** (rocket icon)
3. This enables:
   - JavaScript challenge for all visitors
   - Aggressive caching
   - Enhanced rate limiting
   - Maximum security level

**Important**: This will challenge ALL visitors (including legitimate users).

**Disable** once attack subsides (usually 1-3 hours).

---

## WAF Tuning Best Practices

### Week 1: Monitor Only
1. Deploy all rules in **Log** mode (not Block)
2. Monitor **Security Events** daily
3. Identify false positives

### Week 2: Gradual Enforcement
1. Change rules to **Block** mode one at a time
2. Monitor for user complaints
3. Adjust rules as needed

### Ongoing: Monthly Review
1. Review top 10 triggered rules
2. Check for new OWASP threats
3. Update IP whitelists
4. Test WAF with penetration testing tools

---

## Integration with Backend Rate Limiter

TrueSpend has backend rate limiting (see Phase 2 implementation).

**Layered Defense**:
1. **Cloudflare WAF** (Layer 2): Block bad actors before reaching origin
2. **Backend Rate Limiter** (Layer 3): Fine-grained API rate limiting

**Configuration**:
- Cloudflare: 100 requests/10 seconds (aggressive, all endpoints)
- Backend: 100 requests/minute (per user, specific endpoints)

---

## Compliance & Audit

### PCI DSS Compliance
Cloudflare WAF helps meet:
- Requirement 6.6: Web application firewall
- Requirement 10: Logging and monitoring

### GDPR Compliance
- **Data Processing Agreement**: Sign Cloudflare DPA
- **Data Residency**: Use Cloudflare's regional services if needed
- **Logging**: Configure log retention per GDPR requirements

---

## Resources

- [Cloudflare WAF Documentation](https://developers.cloudflare.com/waf/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Events](https://developers.cloudflare.com/waf/analytics/)
- [Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/)

---

## Next Steps

1. ✅ Enable WAF managed rules
2. ✅ Configure custom WAF rules
3. ➡️ Enable DDoS protection (see [DDOS_PROTECTION.md](./DDOS_PROTECTION.md))
4. ➡️ Run security testing (see [PHASE2_IMPLEMENTATION.md](./PHASE2_IMPLEMENTATION.md))

---

**Last Updated**: 2025-11-10  
**Phase**: 2 (Security & Ingress)  
**Version**: 1.0
