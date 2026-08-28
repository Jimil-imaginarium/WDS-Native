-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 4: Storage
-- Two private buckets:
--   media  — everything the admin uploads (riddle photos, videos,
--            voice notes, music, GIFs, PDFs, memories, treasure)
--   proofs — the player's punishment proof uploads, stored under
--            a folder named after her user id
-- Files are served through short-lived signed URLs, never publicly.
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('media',  'media',  false, 104857600),  -- 100 MB per file
  ('proofs', 'proofs', false, 104857600)
on conflict (id) do nothing;

-- ── media bucket ─────────────────────────────────────────────────

create policy "media bucket: authenticated read"
  on storage.objects for select
  using (bucket_id = 'media' and auth.uid() is not null);

create policy "media bucket: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

create policy "media bucket: admin update"
  on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

create policy "media bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- ── proofs bucket ────────────────────────────────────────────────
-- Path convention: <player_uid>/<punishment_id>/<filename>

create policy "proofs bucket: owner or admin read"
  on storage.objects for select
  using (
    bucket_id = 'proofs'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "proofs bucket: player uploads to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "proofs bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'proofs' and public.is_admin());
