-- CogniFix wrong-answer upload setup
-- Run this file by itself in Supabase SQL Editor when the main schema already exists.

-- Backfill users who signed in before the profiles trigger existed. Existing
-- profiles are preserved unchanged.
INSERT INTO public.profiles (id, email, full_name, role, is_guest)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'student',
  false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wrong-answer-uploads',
  'wrong-answer-uploads',
  false,
  31457280,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 31457280,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.wrong_answer_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 31457280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrong_answer_uploads_user_id
  ON public.wrong_answer_uploads(user_id);

ALTER TABLE public.wrong_answer_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can view own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can insert own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can delete own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own uploaded files" ON storage.objects;
CREATE POLICY "Users can read own uploaded files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wrong-answer-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wrong-answer-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own uploaded files" ON storage.objects;
CREATE POLICY "Users can delete own uploaded files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wrong-answer-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
