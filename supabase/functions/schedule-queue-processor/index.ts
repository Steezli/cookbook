import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Verify this is a cron job (from Supabase)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== Deno.env.get('CRON_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all queued jobs that are ready to process
    // Use cursor-based pagination to avoid race conditions
    let hasMore = true;
    let processedCount = 0;
    
    while (hasMore && processedCount < 10) { // Process max 10 jobs per run
      const { data: jobs, error } = await supabase
        .from('scan_jobs')
        .select('id')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !jobs || jobs.length === 0) {
        hasMore = false;
        break;
      }

      // Trigger queue processor for this job
      try {
        await supabase.functions.invoke('process-scan-queue');
        processedCount++;
        
        // Small delay between jobs to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (processError) {
        console.error('Error processing job:', processError);
        // Continue with next job
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Queue processing completed',
        jobsProcessed: processedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});