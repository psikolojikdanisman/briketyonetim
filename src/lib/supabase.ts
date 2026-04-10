import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase env değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalı.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function girisYap(email: string, sifre: string): Promise<{ hata?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
  if (!error) return {};
  if (error.message.includes('Invalid login credentials')) return { hata: 'E-posta veya şifre hatalı.' };
  if (error.message.includes('Email not confirmed'))       return { hata: 'E-posta adresi henüz doğrulanmamış.' };
  return { hata: error.message };
}

export async function cikisYap(): Promise<void> {
  await supabase.auth.signOut();
}

export async function mevcutOturum() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}