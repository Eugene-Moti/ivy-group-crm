-- Ivy Group CRM — team member profile details
--
-- display_name: what the system calls someone (dashboard greeting, and
-- anywhere else a first-name-basis feels right) — separate from full_name,
-- which stays the untouched record used for activity attribution
-- ("logged by ..."). job_title is purely descriptive, shown on their Team &
-- Users card. is_active mirrors whether an admin has banned their auth
-- account (see the new PATCH handler in /api/admin/users) — the actual
-- access block is enforced by Supabase Auth's own ban_duration, this column
-- only exists so the UI can show status without an extra admin-only call.
--
-- Both new text fields fall under the existing profiles_update_own_or_admin
-- policy — someone can already set their own, same as full_name today.

alter table public.profiles
  add column display_name text,
  add column job_title text,
  add column is_active boolean not null default true;
