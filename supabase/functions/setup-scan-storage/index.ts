import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing required env vars' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create scan-photos bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;

    const scanBucket = buckets.find(b => b.name === 'scan-photos');
    
    if (!scanBucket) {
      const { error: createError } = await supabase.storage.createBucket('scan-photos', {
        public: false, // Private access, only via signed URLs
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) throw createError;
    }

    // Set up RLS policies for the bucket
    // Users can upload to their own folder
    const { error: policyError } = await supabase.rpc('exec', {
      sql: `
        CREATE POLICY "Users can upload scan photos" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'scan-photos' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
        
        CREATE POLICY "Users can view own scan photos" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'scan-photos' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
        
        CREATE POLICY "Users can delete own scan photos" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'scan-photos' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    });

    return new Response(
      JSON.stringify({ message: 'Storage bucket configured successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Storage setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to configure storage', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});