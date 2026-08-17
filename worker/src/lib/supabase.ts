import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ReminderRow {
  id: string;
  deadline_id: string;
  user_id: string;
  channel: 'email' | 'sms';
  scheduled_at: string;
  status: string;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
}

export interface DeadlineWithItem {
  id: string;
  due_date: string;
  due_time: string | null;
  all_day: boolean;
  timezone: string;
  items: { title: string } | null;
}

export function createServiceRoleClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
