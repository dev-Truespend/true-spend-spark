# Snyk Setup Guide for TrueSpend v4.2

## 🎯 Overview

This guide walks you through setting up Snyk for automated vulnerability scanning in your TrueSpend project. Snyk is a developer-first security platform that helps identify and fix vulnerabilities in your dependencies, container images, and infrastructure as code.

**Estimated Time:** 10 minutes

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ GitHub account with admin access to the TrueSpend repository
- ✅ Write access to GitHub repository settings
- ✅ Basic understanding of GitHub Actions workflows

---

## 🚀 Step 1: Create a Snyk Account

### 1.1 Sign Up for Snyk

1. Visit [https://snyk.io/](https://snyk.io/)
2. Click "**Start free**" or "**Sign up**"
3. Choose "**Sign up with GitHub**" for easy integration
4. Authorize Snyk to access your GitHub repositories

### 1.2 Install Snyk GitHub App

1. After signing up, Snyk will prompt you to install the GitHub App
2. Click "**Install Snyk**"
3. Choose whether to install for:
   - **All repositories** (recommended for teams)
   - **Select repositories** (choose TrueSpend repository)
4. Click "**Install**"

---

## 🔑 Step 2: Generate Snyk API Token

### 2.1 Navigate to Account Settings

1. Log in to [app.snyk.io](https://app.snyk.io)
2. Click your **profile icon** (top-right corner)
3. Select "**Account settings**"
4. Navigate to "**General**" tab

### 2.2 Generate API Token

1. Scroll down to "**API Token**" section
2. Click "**show**" to reveal your token (or generate a new one)
3. Click "**Copy**" to copy the token to clipboard
4. ⚠️ **IMPORTANT**: Store this token securely - it won't be shown again!

**Example Token Format:**
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## 🔐 Step 3: Add Snyk Token to GitHub Secrets

### 3.1 Navigate to Repository Settings

1. Go to your TrueSpend repository on GitHub
2. Click "**Settings**" tab (top-right)
3. In the left sidebar, click "**Secrets and variables**"
4. Select "**Actions**"

### 3.2 Add New Secret

1. Click "**New repository secret**" button
2. Fill in the form:
   - **Name**: `SNYK_TOKEN`
   - **Value**: Paste your Snyk API token from Step 2.2
3. Click "**Add secret**"

### 3.3 Verify Secret Was Added

You should now see `SNYK_TOKEN` listed under "Repository secrets" (value will be hidden).

---

## 🧪 Step 4: Run Your First Security Scan

### 4.1 Trigger Manual Workflow

1. In your GitHub repository, go to "**Actions**" tab
2. Find "**Snyk Security Scan**" workflow
3. Click "**Run workflow**" dropdown
4. Select branch: `main` or `develop`
5. Click green "**Run workflow**" button

### 4.2 Monitor Workflow Execution

1. Click on the running workflow to see live logs
2. Wait for all jobs to complete (~2-5 minutes)
3. Check for any failures or warnings

### 4.3 Expected Results

**✅ Successful Scan (Green Checkmark):**
- All jobs passed
- No critical or high-severity vulnerabilities found
- SARIF report uploaded to GitHub Security tab

**❌ Failed Scan (Red X):**
- Critical vulnerabilities detected
- Build intentionally fails to prevent merging vulnerable code
- See Step 5 for remediation

---

## 📊 Step 5: Interpret Snyk Results

### 5.1 View Snyk Dashboard

1. Go to [app.snyk.io](https://app.snyk.io)
2. Select your TrueSpend project
3. View summary of vulnerabilities:
   - **Critical**: Requires immediate action
   - **High**: Should be fixed soon
   - **Medium**: Fix when possible
   - **Low**: Can be addressed later

### 5.2 View GitHub Security Tab

1. In your GitHub repository, click "**Security**" tab
2. Click "**Code scanning alerts**"
3. Filter by tool: "**Snyk**"
4. View detailed vulnerability information

### 5.3 Understanding Vulnerability Severity

| Severity | CVSS Score | Action Required |
|----------|-----------|-----------------|
| 🔴 **Critical** | 9.0-10.0 | Fix immediately (CI fails) |
| 🟠 **High** | 7.0-8.9 | Fix within 7 days (CI warns) |
| 🟡 **Medium** | 4.0-6.9 | Fix within 30 days |
| 🟢 **Low** | 0.1-3.9 | Fix when convenient |

---

## 🔧 Step 6: Fix Vulnerabilities

### 6.1 Auto-Fix with Snyk (Recommended)

1. In Snyk dashboard, click on a vulnerability
2. Click "**Fix this vulnerability**" button
3. Snyk will create a Pull Request with the fix
4. Review and merge the PR

### 6.2 Manual Fix

If auto-fix isn't available:

```bash
# Update a specific package
npm update <package-name>

# Or upgrade to a specific version
npm install <package-name>@<version>

# Audit all dependencies
npm audit fix
```

### 6.3 Add Exceptions (Use Sparingly)

If a vulnerability can't be fixed immediately, add it to `.snyk`:

```yaml
ignore:
  'SNYK-JS-LODASH-567746':
    - '*':
        reason: 'No fix available yet, risk accepted for non-user input'
        expires: '2025-12-31T00:00:00.000Z'
```

---

## 🎯 Step 7: Configure Automated Monitoring

### 7.1 Verify Workflows Are Active

Check that these workflows are enabled:

1. **Snyk Security Scan** (`.github/workflows/snyk-security.yml`)
   - Runs on: Push/PR to `main` or `develop`
   - Runs on: Daily schedule (3 AM UTC)
   - Runs on: Manual trigger

2. **Dependabot** (`.github/dependabot.yml`)
   - Weekly dependency updates (Mondays, 9 AM)

3. **NPM Audit** (`.github/workflows/security-audit.yml`)
   - Runs on: Push/PR to `main` or `develop`
   - Runs on: Daily schedule

### 7.2 Enable Email Notifications

1. Go to [app.snyk.io](https://app.snyk.io)
2. Click profile icon → "**Notification settings**"
3. Enable notifications for:
   - ✅ New vulnerabilities
   - ✅ Fixed vulnerabilities
   - ✅ Weekly reports

---

## 🐛 Troubleshooting

### Issue: "SNYK_TOKEN not found"

**Solution:**
- Verify secret name is exactly `SNYK_TOKEN` (case-sensitive)
- Check secret was added to correct repository
- Re-run workflow after adding secret

### Issue: "Authentication failed"

**Solution:**
- Token may have expired - generate new token
- Verify you copied the entire token (no spaces)
- Check token has correct permissions

### Issue: "Rate limit exceeded"

**Solution:**
- Snyk free tier has scan limits
- Wait 1 hour or upgrade to paid plan
- Configure workflows to run less frequently

### Issue: Workflow fails with "No package.json found"

**Solution:**
- Ensure workflow checks out code first
- Verify `package.json` exists in repo root
- Check workflow syntax for errors

---

## 📈 Success Metrics

After successful setup, you should see:

- ✅ Snyk badge showing "No vulnerabilities" in dashboard
- ✅ Daily scans running automatically
- ✅ Pull requests for dependency updates
- ✅ GitHub Security tab populated with results
- ✅ Email notifications for new issues

---

## 🎨 Add Snyk Badge to README

Once setup is complete, add a status badge to your `README.md`:

```markdown
[![Known Vulnerabilities](https://snyk.io/test/github/{username}/{repo}/badge.svg)](https://snyk.io/test/github/{username}/{repo})
```

Replace `{username}` and `{repo}` with your GitHub username and repository name.

---

## 📚 Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk CLI Reference](https://docs.snyk.io/snyk-cli)
- [GitHub Actions Integration](https://docs.snyk.io/integrations/ci-cd-integrations/github-actions-integration)
- [Severity Scoring](https://snyk.io/blog/snyk-priority-score/)
- [TrueSpend Supply Chain Security](./PHASE3_SUPPLY_CHAIN_SECURITY.md)

---

## ✅ Verification Checklist

Use this checklist to verify your setup:

- [ ] Snyk account created
- [ ] GitHub App installed
- [ ] API token generated
- [ ] `SNYK_TOKEN` added to GitHub Secrets
- [ ] First manual scan executed successfully
- [ ] Snyk dashboard showing project
- [ ] GitHub Security tab populated
- [ ] Email notifications configured
- [ ] Snyk badge added to README
- [ ] All team members have Snyk access

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check [Snyk Status Page](https://status.snyk.io/)
2. Visit [Snyk Community Forum](https://community.snyk.io/)
3. Contact Snyk Support via [support@snyk.io](mailto:support@snyk.io)
4. Review TrueSpend [security documentation](./PHASE3_COMPLETION.md)

---

**Last Updated:** 2025-11-15 (Phase 3 Completion)  
**Version:** 1.0  
**Maintained By:** TrueSpend DevOps Team
