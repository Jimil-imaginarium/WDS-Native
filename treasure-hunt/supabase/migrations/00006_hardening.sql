-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 6: Function Hardening
-- Addresses the Supabase database linter (advisors 0011 / 0028 / 0029).
--
-- Every game mutation deliberately runs through a SECURITY DEFINER
-- function, and each one already guards itself internally (auth.uid()
-- checks, is_admin() checks, ownership checks). The linter still flags
-- them as "callable by anon/authenticated" — expected and intended for
-- the RPCs the app invokes.
--
-- The functions below, however, are INTERNAL helpers meant to be called
-- only from inside the other SECURITY DEFINER functions (which execute
-- as the function owner). Exposing them directly would let a signed-in
-- player, for example, self-grant achievements or forge notifications.
-- We revoke direct EXECUTE from anon + authenticated.
--
-- Left intentionally executable (used inside RLS policies and/or called
-- by the app): is_admin, can_access_riddle, player_completed_all, plus
-- all the client-facing RPCs (get_player_board, get_riddle_content,
-- submit_answer, submit_proof, notify_riddle_unlocked,
-- mark_notifications_read, review_submission, assign_punishment,
-- review_proof).
-- ═══════════════════════════════════════════════════════════════

revoke execute on function public.notify_user(uuid, public.notification_type, text, text, text) from anon, authenticated;
revoke execute on function public.notify_admins(public.notification_type, text, text, text) from anon, authenticated;
revoke execute on function public.log_activity(uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.grant_achievement(uuid, text) from anon, authenticated;
revoke execute on function public.check_achievements(uuid, uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.notify_note_created() from anon, authenticated;
revoke execute on function public.protect_profile_role() from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;

-- Pin a stable search_path on the trigger helper (advisor 0011).
alter function public.touch_updated_at() set search_path = public;
