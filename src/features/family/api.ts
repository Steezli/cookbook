import { supabase } from "@/lib/supabase";

export type Family = {
  id: string;
  name: string;
};

export async function listFamilies(): Promise<Family[]> {
  const { data, error } = await supabase
    .from("families")
    .select("id,name")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Family[];
}

export async function createFamily(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_family", { p_name: name });
  if (error) throw error;
  return data as string;
}

