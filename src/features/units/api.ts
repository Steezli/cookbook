import { supabase } from "@/lib/supabase";
import type { UnitSystem } from "./types";

export async function getUnitPreference(): Promise<UnitSystem> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('profiles')
    .select('unit_preference')
    .eq('user_id', session.user.id)
    .single();

  if (error) throw error;

  return (data?.unit_preference as UnitSystem) || 'imperial';
}

export async function setUnitPreference(preference: UnitSystem): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from('profiles')
    .update({ unit_preference: preference })
    .eq('user_id', user.id);

  if (error) throw error;
}
