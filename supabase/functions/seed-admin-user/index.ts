import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { users }, error: fetchError } = await supabaseClient.auth.admin.listUsers();
    
    if (fetchError) {
      throw fetchError;
    }
    
    const adminUser = users.find(u => u.email === 'otherservices51@gmail.com');
    
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin user otherservices51@gmail.com not found. Please sign up first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabaseClient
      .from('user_roles')
      .upsert({ user_id: adminUser.id, role: 'admin' }, { onConflict: 'user_id,role' });

    if (insertError) {
      throw insertError;
    }

    console.log(`Admin role assigned to ${adminUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin role assigned successfully',
        user_id: adminUser.id,
        email: adminUser.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error seeding admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
