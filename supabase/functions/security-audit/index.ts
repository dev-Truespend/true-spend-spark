import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'rls' | 'auth' | 'api' | 'data' | 'csp';
  title: string;
  description: string;
  remediation: string;
  auto_fix_available: boolean;
}

interface SecurityAuditResult {
  score: number;
  findings: SecurityFinding[];
  recommendations: string[];
  last_scan: string;
  category_scores: {
    rls: number;
    auth: number;
    api: number;
    data: number;
    csp: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    if (action === 'scan') {
      const findings: SecurityFinding[] = [];
      let categoryScores = { rls: 100, auth: 100, api: 100, data: 100, csp: 100 };

      // 1. RLS POLICY VERIFICATION (30% weight)
      const { data: tables } = await supabase.rpc('pg_catalog.pg_tables', {});
      const userTables = ['profiles', 'transactions', 'budgets', 'geofences', 'merchants', 
                          'notifications', 'user_devices', 'mfa_settings', 'password_reset_tokens'];
      
      for (const table of userTables) {
        const { data: policies } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', table);

        if (!policies || policies.length === 0) {
          findings.push({
            id: `rls_missing_${table}`,
            severity: 'critical',
            category: 'rls',
            title: `Missing RLS policies on ${table}`,
            description: `Table ${table} has no Row Level Security policies, allowing unrestricted access`,
            remediation: `Enable RLS and create appropriate policies for ${table} table`,
            auto_fix_available: false,
          });
          categoryScores.rls -= 15;
        }
      }

      // Check for overly permissive policies
      const { data: allPolicies } = await supabase
        .from('pg_policies')
        .select('*');

      const permissivePolicies = allPolicies?.filter(p => 
        p.qual?.includes('true') || p.with_check?.includes('true')
      );

      if (permissivePolicies && permissivePolicies.length > 0) {
        findings.push({
          id: 'rls_permissive_policies',
          severity: 'high',
          category: 'rls',
          title: `${permissivePolicies.length} overly permissive RLS policies detected`,
          description: 'Some RLS policies use "true" conditions, which may grant excessive access',
          remediation: 'Review and restrict RLS policies to specific user conditions',
          auto_fix_available: false,
        });
        categoryScores.rls -= 10;
      }

      // 2. AUTHENTICATION SECURITY (25% weight)
      const { data: mfaStats } = await supabase
        .from('mfa_settings')
        .select('totp_enabled');

      const mfaEnabled = mfaStats?.filter(m => m.totp_enabled).length || 0;
      const totalUsers = mfaStats?.length || 1;
      const mfaAdoptionRate = (mfaEnabled / totalUsers) * 100;

      if (mfaAdoptionRate < 50) {
        findings.push({
          id: 'auth_low_mfa_adoption',
          severity: 'medium',
          category: 'auth',
          title: `Low MFA adoption rate: ${mfaAdoptionRate.toFixed(1)}%`,
          description: 'Less than 50% of users have MFA enabled, increasing account takeover risk',
          remediation: 'Encourage or enforce MFA for all users, especially admins',
          auto_fix_available: false,
        });
        categoryScores.auth -= 15;
      }

      // Check failed login attempts (last 24h)
      const { data: failedAttempts } = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedAttempts && failedAttempts.length > 100) {
        findings.push({
          id: 'auth_high_failed_attempts',
          severity: 'high',
          category: 'auth',
          title: `${failedAttempts.length} failed login attempts in 24h`,
          description: 'High volume of failed logins may indicate credential stuffing attack',
          remediation: 'Review IP addresses and consider implementing additional rate limiting',
          auto_fix_available: false,
        });
        categoryScores.auth -= 20;
      }

      // Check session expiry (should be reasonable)
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('expires_at', new Date().toISOString());

      const longSessions = activeSessions?.filter(s => {
        const expiresAt = new Date(s.expires_at).getTime();
        const now = Date.now();
        const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 30;
      });

      if (longSessions && longSessions.length > 0) {
        findings.push({
          id: 'auth_long_session_expiry',
          severity: 'low',
          category: 'auth',
          title: `${longSessions.length} sessions with >30 day expiry`,
          description: 'Long-lived sessions increase security risk if tokens are compromised',
          remediation: 'Consider shorter session expiry times (7-14 days recommended)',
          auto_fix_available: false,
        });
        categoryScores.auth -= 5;
      }

      // 3. API SECURITY (20% weight)
      // Check for public endpoints without auth
      const publicFunctions = [
        'csp-reporter', 'google-maps-geocode', 'google-places-details', 
        'mfa-verify-totp', 'verify-email', 'confirm-email-change'
      ];

      // Verify rate limiting is effective
      const { data: rateLimits } = await supabase
        .from('rate_limits')
        .select('*')
        .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      const hitLimitUsers = rateLimits?.filter(r => r.attempt_count >= r.max_requests);

      if (hitLimitUsers && hitLimitUsers.length > 50) {
        findings.push({
          id: 'api_rate_limit_abuse',
          severity: 'medium',
          category: 'api',
          title: `${hitLimitUsers.length} users hit rate limits in the last hour`,
          description: 'High rate limit violations may indicate abuse or DDoS attempt',
          remediation: 'Review rate limit thresholds and implement stricter controls',
          auto_fix_available: false,
        });
        categoryScores.api -= 10;
      }

      // Check API request logs for errors
      const { data: apiErrors } = await supabase
        .from('api_request_log')
        .select('*')
        .gte('status_code', 500)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const errorRate = apiErrors?.length || 0;
      if (errorRate > 100) {
        findings.push({
          id: 'api_high_error_rate',
          severity: 'high',
          category: 'api',
          title: `${errorRate} 5xx errors in last 24 hours`,
          description: 'High server error rate indicates system instability',
          remediation: 'Review error logs and fix underlying issues',
          auto_fix_available: false,
        });
        categoryScores.api -= 15;
      }

      // 4. DATA PROTECTION (15% weight)
      // Verify PII encryption is being used
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email_encrypted, phone_encrypted')
        .limit(10);

      const unencryptedProfiles = profiles?.filter(p => 
        !p.email_encrypted || !p.phone_encrypted
      );

      if (unencryptedProfiles && unencryptedProfiles.length > 0) {
        findings.push({
          id: 'data_unencrypted_pii',
          severity: 'critical',
          category: 'data',
          title: 'PII data not fully encrypted',
          description: 'Some user profiles have unencrypted email or phone data',
          remediation: 'Run PII encryption migration on all profiles',
          auto_fix_available: false,
        });
        categoryScores.data -= 40;
      }

      // Check backup status
      const { data: backups } = await supabase
        .from('backup_status')
        .select('*')
        .order('backup_timestamp', { ascending: false })
        .limit(1);

      if (!backups || backups.length === 0) {
        findings.push({
          id: 'data_no_backups',
          severity: 'critical',
          category: 'data',
          title: 'No backup records found',
          description: 'Database backups are not configured or not being tracked',
          remediation: 'Configure automated backups and verification',
          auto_fix_available: false,
        });
        categoryScores.data -= 30;
      } else {
        const lastBackup = new Date(backups[0].backup_timestamp);
        const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);

        if (hoursSinceBackup > 24) {
          findings.push({
            id: 'data_stale_backup',
            severity: 'high',
            category: 'data',
            title: `Last backup was ${Math.floor(hoursSinceBackup)} hours ago`,
            description: 'Backups should run at least daily',
            remediation: 'Investigate backup job failures and ensure daily execution',
            auto_fix_available: false,
          });
          categoryScores.data -= 20;
        }
      }

      // 5. CSP & SECURITY HEADERS (10% weight)
      const { data: cspViolations } = await supabase
        .from('csp_violations')
        .select('violated_directive, blocked_uri')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const uniqueViolations = new Set(cspViolations?.map(v => v.violated_directive));

      if (uniqueViolations.size > 10) {
        findings.push({
          id: 'csp_high_violations',
          severity: 'medium',
          category: 'csp',
          title: `${uniqueViolations.size} unique CSP violations in 24h`,
          description: 'High CSP violation count may indicate overly restrictive policies or XSS attempts',
          remediation: 'Review CSP policy and whitelist legitimate sources',
          auto_fix_available: false,
        });
        categoryScores.csp -= 20;
      }

      // Ensure scores don't go below 0
      Object.keys(categoryScores).forEach(key => {
        if (categoryScores[key as keyof typeof categoryScores] < 0) {
          categoryScores[key as keyof typeof categoryScores] = 0;
        }
      });

      // Calculate overall weighted score
      const overallScore = Math.round(
        categoryScores.rls * 0.30 +
        categoryScores.auth * 0.25 +
        categoryScores.api * 0.20 +
        categoryScores.data * 0.15 +
        categoryScores.csp * 0.10
      );

      // Generate recommendations
      const recommendations: string[] = [];
      if (overallScore < 70) {
        recommendations.push('Address all critical and high severity findings immediately');
      }
      if (categoryScores.rls < 80) {
        recommendations.push('Review and strengthen RLS policies on user tables');
      }
      if (categoryScores.auth < 80) {
        recommendations.push('Improve authentication security by enabling MFA for all users');
      }
      if (categoryScores.data < 80) {
        recommendations.push('Ensure all PII is encrypted and backups are current');
      }

      const result: SecurityAuditResult = {
        score: overallScore,
        findings: findings.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        recommendations,
        last_scan: new Date().toISOString(),
        category_scores: categoryScores,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Security audit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
