import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Create a detailed professional Gantt chart timeline diagram for TrueSpend v4.0 project implementation showing:

TITLE: "TrueSpend: Production-Ready Build Timeline (0-100k Users)"

8 PHASES over 28 weeks (horizontal timeline):

Phase 0: Foundation (Week 1)
- Project Setup & Config
- Lovable Cloud Enable ✓
- Environment Variables Setup ✓
- Schema Governance Framework (in progress)
- Monitoring Foundation
- Structured Logging Setup
- [Milestone] Phase 0 Testing & Docs

Phase 1: Data & Auth (Weeks 2-5)
- Data Plane-A Design
- Users Table + RLS
- Profiles Table + Encryption
- Transactions Table + RLS
- Accounts Table + RLS
- Data Plane-B Design
- Categories/Merchants/Products Tables
- Auth System Setup
- Google OAuth Integration
- User Roles + RBAC
- [Milestone] Phase 1 Security Audit

Phase 2: External Services (Weeks 6-8)
- Plaid Integration Design
- Plaid Edge Functions
- Bank Connection Flow
- Transaction Sync
- Stripe Integration
- Subscription Management
- SMS/Twilio Setup
- Notification Templates
- [Milestone] External Services Testing

Phase 3: Core Services (Weeks 9-13)
- Transaction Processing
- Categorization Engine
- Duplicate Detection
- Budget Management
- Budget Alerts
- Analytics Engine
- Reports Generation
- Notification System
- [Milestone] Core Features Integration

Phase 4: UI/UX (Weeks 14-18)
- Dashboard UI
- Transaction Views
- Budget Interface
- Analytics Dashboard
- Mobile Responsive Design
- Tablet Optimization
- Accessibility (WCAG)
- [Milestone] UI/UX Review

Phase 5: Security & Performance (Weeks 19-21)
- RLS Policies (All Tables)
- CSP Implementation
- SRI Configuration
- Security Headers
- Performance Optimization
- Caching Strategy
- Load Testing
- [Milestone] Security Audit

Phase 6: Testing & QA (Weeks 22-24)
- Integration Testing
- E2E Testing
- User Acceptance Testing
- Security Testing
- Bug Fixes & Refinement
- Performance Testing
- Cross-browser Testing
- [Milestone] Final QA Review

Phase 7: Launch Prep (Weeks 25-28)
- Documentation Complete
- API Documentation
- User Guides
- Deployment Pipeline
- Monitoring & Alerts
- Backup & Recovery
- [Milestone] Production Launch

VISUAL REQUIREMENTS:
- Hierarchical tree structure (like a project breakdown)
- Use checkboxes: ☑ for completed, ⊡ for active, ☐ for pending
- Use ◆ diamond symbols for milestones
- Color-code by phase (8 different colors)
- Show indentation levels for task hierarchy
- Professional, clean design
- Include week numbers across the top
- Show current progress indicator at Week 5
- High resolution, suitable for documentation`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Gateway error: ${error}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageData,
        message: 'Timeline image generated successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating timeline image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
