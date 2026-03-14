import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the job
    const { data: job, error: fetchError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id) // Ensure user owns the job
      .single();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status !== 'failed') {
      return new Response(
        JSON.stringify({ error: 'Only failed jobs can be retried' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.retry_count >= job.max_retries) {
      return new Response(
        JSON.stringify({ error: 'Maximum retries exceeded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset job to queued for retry
    const { error: updateError } = await supabase
      .from('scan_jobs')
      .update({ 
        status: 'queued',
        updated_at: new Date().toISOString(),
        error_message: null // Clear previous error
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job for retry:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to retry job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger queue processor
    try {
      await supabase.functions.invoke('process-scan-queue');
    } catch (queueError) {
      console.error('Error triggering queue processor:', queueError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Job queued for retry',
        jobId: job.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Retry job error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});