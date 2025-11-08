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

    const prompt = `Generate a professional Gantt chart timeline image for TrueSpend v4.0 with Native Mobile Geofencing.

TITLE: "TrueSpend v4.0 Implementation Timeline (30 Weeks) with Native Geofencing"
SUBTITLE: "19-Layer Production Architecture + Mobile Geolocation | 385 Story Points"

10 PHASES over 30 weeks:

Phase 1: Foundation (Weeks 1-4) - Blue
Phase 2: Security & Ingress (Weeks 5-7) - Orange
Phase 2.5: Geofencing Foundation (Weeks 8-10) 📍 - Teal [NEW]
Phase 3: Auth (Weeks 11-14) - Green
Phase 4: Core Services (Weeks 15-19) - Purple
Phase 5: External Communication (Weeks 20-22) - Orange
Phase 5.5: Location Intelligence (Weeks 23-25) 🗺️ - Emerald [NEW]
Phase 6: Messaging (Weeks 26-28) - Cyan
Phase 7: Data Planes (Weeks 29-32) - Blue
Phase 8: Observability (Weeks 33-34) - Gray

KEY MILESTONES (diamonds):
Week 4, 7, 10📍, 14, 19, 22, 25🗺️, 28, 32, 34⭐

Horizontal Gantt bars, dependencies shown, highlight geofencing phases (2.5 & 5.5), 1920x1080 landscape.`;

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
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Payment required. Please add credits to your Lovable AI workspace.' 
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
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
