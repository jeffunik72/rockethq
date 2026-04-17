import { supabase } from './supabase';

let cachedSettings = null;

export async function getSettings() {
  if (cachedSettings) return cachedSettings;
  const { data } = await supabase.from('settings').select('*').single();
  cachedSettings = data;
  return data;
}

export function clearSettingsCache() {
  cachedSettings = null;
}
