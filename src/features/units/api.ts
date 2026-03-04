import { supabase } from "@/lib/supabase";
import type { UnitSystem } from "./types";

export async function getUnitPreference(): Promise<UnitSystem> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Fetch unit preference from profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('unit_preference')
    .eq('user_id', user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch unit preference: ${error.message}`);
  }

  // Return preference or default to imperial
  return (data?.unit_preference as UnitSystem) || 'imperial';
}

export async function setUnitPreference(preference: UnitSystem): Promise<void> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Update profiles
  const { error } = await supabase
    .from('profiles')
    .update({ unit_preference: preference })
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to update unit preference: ${error.message}`);
  }
}
