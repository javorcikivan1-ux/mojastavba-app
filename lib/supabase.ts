
import { createClient } from "@supabase/supabase-js";

// Nahraďte vlastnými údajmi z vášho Supabase projektu, ak tieto nefungujú
const SUPABASE_URL = "https://fuuxskyamoeuusnlsgvl.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dXhza3lhbW9ldXVzbmxzZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODEzOTIsImV4cCI6MjA4MTI1NzM5Mn0.wbl2AFNJ48QA7NuWSyOC_WPIKTWXV6d9eTGnHBnIs4c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  full_name: string;
  organization_id: string;
  hourly_rate?: number;
  phone?: string;
  is_active?: boolean;
};
