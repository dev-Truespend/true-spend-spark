# DDoS Protection Guide - Phase 2: Edge & Ingress

**Objective**: Configure Cloudflare DDoS protection to defend TrueSpend against distributed denial-of-service attacks.

---

## Automatic Protection (Free - Always Enabled)

Cloudflare automatically protects against:
- **Network Layer (L3/L4) DDoS**: TCP/UDP floods
- **Application Layer (L7) DDoS**: HTTP floods
- **DNS Amplification Attacks**
- **SYN Floods**

**Capacity**: 172 Tbps mitigation capacity globally

---

## DDoS Protection Levels

### 1. Standard (Free - Default)
- Automatic mitigation of common attacks
- No configuration needed
- Transparent to legitimate users

### 2. Under Attack Mode (Free - Manual Activation)
1. Go to **Overview** → Enable "I'm Under Attack Mode"
2. Shows JavaScript challenge to all visitors
3. Use when experiencing active attack

### 3. Advanced (Business/Enterprise)
- Custom DDoS rules
- Sensitivity adjustment
- Regional blocking

---

## Monitoring DDoS Events

Navigate to **Security** → **Analytics** → **DDoS**:

**Key Metrics**:
- Attacks mitigated (last 24h/7d/30d)
- Attack size (Mbps/requests per second)
- Attack duration
- Top attack vectors

---

## Emergency Response Plan

### If Under DDoS Attack:

1. **Enable Under Attack Mode** (Quick toggle in Overview)
2. **Monitor Analytics** (Security → Analytics)
3. **Increase Security Level** (Security → Settings → High)
4. **Contact Support** (Enterprise plans - 24/7 hotline)

**Expected Mitigation Time**: <3 seconds

---

## Resources

- [Cloudflare DDoS Protection](https://developers.cloudflare.com/ddos-protection/)
- [Under Attack Mode Guide](https://support.cloudflare.com/hc/en-us/articles/200170076)

---

**Last Updated**: 2025-11-10  
**Phase**: 2 (Security & Ingress)  
**Version**: 1.0
