import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing required env vars' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,  // Use service role for elevated permissions
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Fetch queued jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10)  // Process up to 10 jobs at once

    if (fetchError) {
      throw fetchError
    }

    const results = []

    for (const job of jobs) {
      try {
        // Call the process-scan-job function
        const { data, error: processError } = await supabase.functions.invoke('process-scan-job', {
          body: { jobId: job.id }
        })

        results.push({
          jobId: job.id,
          success: !processError,
          error: processError?.message || null,
          result: data
        })

        // Add delay between jobs to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          jobId: job.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Queue worker error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})