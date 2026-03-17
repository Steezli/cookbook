import { supabase } from '@/lib/supabase';
import { ScanLimitError } from '@/features/scan/errors';

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getScanCount(userId: string): Promise<number> {
  const { data } = await (supabase.from as Function)('user_scan_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('year_month', currentYearMonth())
    .maybeSingle();

  return data?.count ?? 0;
}

export async function incrementScanCount(userId: string): Promise<number> {
  const { data, error } = await (supabase.rpc as Function)('increment_scan_count', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  if (data > 3) throw new ScanLimitError(data);

  return data;
}
