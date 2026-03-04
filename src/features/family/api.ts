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
  console.log("[createFamily] Starting family creation with name:", name);
  
  try {
    const { data, error } = await supabase.rpc("create_family", { p_name: name });
    
    if (error) {
      console.error("[createFamily] RPC error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    console.log("[createFamily] Success, family ID:", data);
    return data as string;
  } catch (err) {
    console.error("[createFamily] Unexpected error:", err);
    throw err;
  }
}

