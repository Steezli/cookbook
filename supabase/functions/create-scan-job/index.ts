import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { photoUrl, metadata } = await req.json();

    if (!photoUrl) {
      return new Response(
        JSON.stringify({ error: 'photoUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create scan job
    const { data: job, error: insertError } = await supabase
      .from('scan_jobs')
      .insert({
        user_id: user.id,
        photo_url: photoUrl,
        status: 'queued',
        // Store metadata as JSON for reference
        metadata: metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      // Handle rate limiting error specifically
      if (insertError.message?.includes('maximum of 3 concurrent scan jobs')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'You have reached the maximum of 3 concurrent scan jobs. Please wait for one to complete.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Error creating scan job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create scan job', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger queue processing (async - don't wait)
    try {
      await supabase.functions.invoke('process-scan-queue', {
        body: { jobId: job.id }
      });
    } catch (queueError) {
      console.error('Error triggering queue processor:', queueError);
      // Don't fail the request - job is created, queue will process it eventually
    }

    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        status: job.status,
        createdAt: job.created_at
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});