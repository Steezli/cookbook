import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get next queued job
    const { data: job, error: fetchError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ message: 'No queued jobs' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark job as processing
    const { error: updateError } = await supabase
      .from('scan_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'queued'); // Ensure it's still queued

    if (updateError) {
      console.error('Failed to update job status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to claim job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process job
    try {
      // Call OCR service (placeholder for now)
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-extract', {
        body: {
          imageUrl: job.photo_url,
          jobId: job.id
        }
      });

      if (ocrError) {
        throw new Error(`OCR extraction failed: ${ocrError.message}`);
      }

      // Create scan draft with results
      const { error: draftError } = await supabase
        .from('scan_drafts')
        .insert({
          job_id: job.id,
          user_id: job.user_id,
          raw_text: ocrResult.rawText || '',
          ocr_confidence_score: ocrResult.confidence || 0.5,
          title: ocrResult.title || '',
          ingredients: ocrResult.ingredients || [],
          instructions: ocrResult.instructions || [],
          prep_time_minutes: ocrResult.prepTime || null,
          cook_time_minutes: ocrResult.cookTime || null,
          servings: ocrResult.servings || null,
          status: 'draft',
          confidence_level: ocrResult.confidence > 0.8 ? 'high' : 
                         ocrResult.confidence > 0.6 ? 'medium' : 'low'
        });

      if (draftError) {
        console.error('Failed to create scan draft:', draftError);
        // Don't fail the job - update status with error
        throw new Error(`Failed to save scan results: ${draftError.message}`);
      }

      // Mark job as completed
      await supabase
        .from('scan_jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ 
          message: 'Job processed successfully',
          jobId: job.id,
          draftCreated: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processError) {
      console.error(`Job ${job.id} processing failed:`, processError);
      
      const newRetryCount = job.retry_count + 1;
      
      if (newRetryCount <= job.max_retries) {
        // Retry with exponential backoff
        const delay = RETRY_DELAYS[Math.min(newRetryCount - 1, RETRY_DELAYS.length - 1)];
        
        await supabase
          .from('scan_jobs')
          .update({ 
            status: 'queued', // Back to queue for retry
            retry_count: newRetryCount,
            error_message: processError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Schedule retry (using Supabase's deferred execution)
        await new Promise(resolve => setTimeout(resolve, delay));

        return new Response(
          JSON.stringify({ 
            message: 'Job scheduled for retry',
            jobId: job.id,
            retryCount: newRetryCount,
            nextRetryIn: delay
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else {
        // Max retries exceeded - mark as failed
        await supabase
          .from('scan_jobs')
          .update({ 
            status: 'failed',
            retry_count: newRetryCount,
            error_message: `Failed after ${job.max_retries} retries: ${processError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({ 
            error: 'Job failed permanently',
            jobId: job.id,
            retryCount: newRetryCount,
            maxRetries: job.max_retries
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Queue processor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});