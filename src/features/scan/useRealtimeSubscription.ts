import { useEffect, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useRealtimeSubscription<T = any>(
  channelName: string,
  event: string,
  table: string,
  filter?: string,
  initialData?: T[]
) {
  const [data, setData] = useState<T[]>(initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build channel configuration
        const channelConfig: any = {
          event: '*',
          schema: 'public',
          table: table,
        };

        if (filter) {
          channelConfig.filter = filter;
        }

        // Create and subscribe to channel
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', channelConfig, (payload) => {
            console.log('Realtime update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setData(prev => [...prev, payload.new as T]);
            } else if (payload.eventType === 'UPDATE') {
              setData(prev => 
                prev.map(item => 
                  (item as any).id === payload.new.id ? payload.new as T : item
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setData(prev => 
                prev.filter(item => (item as any).id !== payload.old.id)
              );
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setLoading(false);
              console.log(`Connected to ${channelName}`);
            } else if (status === 'CHANNEL_ERROR') {
              setError('Failed to connect to real-time updates');
              setLoading(false);
            }
          });

        channelRef.current = channel;

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log(`Unsubscribed from ${channelName}`);
      }
    };
  }, [channelName, event, table, filter]);

  return { data, loading, error };
}

/**
 * Hook for subscribing to scan job updates for the current user
 */
export function useScanJobSubscription() {
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const setupUserJobsSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Subscribe to all scan jobs and filter by user ID in the callback
        const channel = supabase
          .channel('user_scan_jobs')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'scan_jobs',
          }, async (payload) => {
            // Only process updates for current user's jobs
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedJob = payload.new;
              if (updatedJob.user_id === user.id) {
                setUserJobs(prev => 
                  prev.map(job => 
                    job.id === updatedJob.id ? updatedJob : job
                  )
                );
              }
            } else if (payload.eventType === 'INSERT' && payload.new) {
              const newJob = payload.new;
              if (newJob.user_id === user.id) {
                setUserJobs(prev => [...prev, newJob]);
              }
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedJob = payload.old;
              if (deletedJob.user_id === user.id) {
                setUserJobs(prev => 
                  prev.filter(job => job.id !== deletedJob.id)
                );
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setLoading(false);
              console.log('Connected to user scan jobs');
              
              // Load initial jobs after connecting
              loadUserJobs(user.id);
            } else if (status === 'CHANNEL_ERROR') {
              setError('Failed to connect to real-time updates');
              setLoading(false);
            }
          });

        channelRef.current = channel;

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    const loadUserJobs = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('scan_jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUserJobs(data || []);
      } catch (err) {
        console.error('Failed to load user jobs:', err);
      }
    };

    setupUserJobsSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log('Unsubscribed from user scan jobs');
      }
    };
  }, []);

  return { userJobs, loading, error };
}