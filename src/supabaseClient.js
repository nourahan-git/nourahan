import { createClient } from "@supabase/supabase-js";

// بيانات مشروع Supabase الخاص بنورهان
const SUPABASE_URL = "https://fwxzgujbiqguveaxyjur.supabase.co";
const SUPABASE_KEY = "sb_publishable_c8cgljNgiyHkFZDatik1fg_provmfSN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// محاكاة لنفس واجهة window.storage (get/set/delete) حتى يبقى باقي الكود كما هو
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value };
  },
  async set(key, value) {
    const { error } = await supabase
      .from("app_storage")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error("Supabase set error:", error);
      return null;
    }
    return { key, value };
  },
  async delete(key) {
    const { error } = await supabase.from("app_storage").delete().eq("key", key);
    if (error) return null;
    return { key, deleted: true };
  },
};
