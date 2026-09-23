-- ============================================================================
-- CogniFix — Supabase (PostgreSQL) Production Schema & RLS Policies
-- ============================================================================
-- Description: Complete schema for CogniFix AI Adaptive STEM Tutor.
-- Includes: Tables, constraints, foreign keys, indexes, security definer
--           helpers, row-level security (RLS) policies, and user onboarding trigger.
-- Safe for execution in the Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Ensure pgcrypto extension is active for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS
-- ----------------------------------------------------------------------------

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill people who authenticated before this schema was installed. The
-- onboarding trigger below covers every account created from this point on.
INSERT INTO public.profiles (id, email, full_name, role, is_guest)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'student',
  false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Defined after public.profiles because SQL-language functions validate their
-- referenced relations when created.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 2. HISTORY (Logs every practice attempt and misconception trace)
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  topic TEXT,
  misconception TEXT,
  generated_problem JSONB,
  student_answer TEXT,
  is_correct BOOLEAN,
  mastery_delta NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MASTERY (Tracks per-topic and per-misconception mastery score)
CREATE TABLE IF NOT EXISTS public.mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  misconception TEXT NOT NULL,
  mastery_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_topic_misconception UNIQUE (user_id, topic, misconception)
);

-- 4. QUIZ_ATTEMPTS (Stores aggregated quiz mode calibration sessions)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT,
  score NUMERIC,
  total_questions INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FLASHCARDS (Stores spaced retrieval flashcards per user)
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('known', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MIND_MAPS (Stores generated concept knowledge graphs)
CREATE TABLE IF NOT EXISTS public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT,
  graph_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ROADMAPS (Stores structured learning progression sequences)
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT,
  steps_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. QUIZ_ASSIGNMENTS (For admin/teacher-assigned class quizzes)
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  assigned_to_all BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_user_id ON public.mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON public.mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON public.roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_assigned_by ON public.quiz_assignments(assigned_by);

-- ----------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable Row-Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4.1 PROFILES POLICIES
-- ----------------------------------------------------------------------------
-- Users (and guests) can read their own profile; admins can view all profiles.
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 4.2 HISTORY POLICIES
-- ----------------------------------------------------------------------------
-- Students read their own history; admins can view class-wide history
CREATE POLICY "Users can view own history or admin can view all"
  ON public.history
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Students and guests can insert their own attempts
CREATE POLICY "Users can insert own history"
  ON public.history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students can update only their own history
CREATE POLICY "Users can update own history"
  ON public.history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.3 MASTERY POLICIES
-- ----------------------------------------------------------------------------
-- Students view their own mastery; admins can view all for analytics
CREATE POLICY "Users can view own mastery or admin can view all"
  ON public.mastery
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Students insert their own mastery records
CREATE POLICY "Users can insert own mastery"
  ON public.mastery
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students update only their own mastery
CREATE POLICY "Users can update own mastery"
  ON public.mastery
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.4 QUIZ_ATTEMPTS POLICIES
-- ----------------------------------------------------------------------------
-- Students view their own attempts; admins can view all for class dashboards
CREATE POLICY "Users can view own quiz attempts or admin can view all"
  ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Students insert their own quiz attempts
CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students update their own quiz attempts
CREATE POLICY "Users can update own quiz attempts"
  ON public.quiz_attempts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.5 FLASHCARDS POLICIES
-- ----------------------------------------------------------------------------
-- Strictly scoped to user's own deck
CREATE POLICY "Users can view own flashcards"
  ON public.flashcards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcards"
  ON public.flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards"
  ON public.flashcards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards"
  ON public.flashcards
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.6 MIND_MAPS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own mind maps"
  ON public.mind_maps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mind maps"
  ON public.mind_maps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mind maps"
  ON public.mind_maps
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mind maps"
  ON public.mind_maps
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.7 ROADMAPS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own roadmaps"
  ON public.roadmaps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmaps"
  ON public.roadmaps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmaps"
  ON public.roadmaps
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roadmaps"
  ON public.roadmaps
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4.8 QUIZ_ASSIGNMENTS POLICIES
-- ----------------------------------------------------------------------------
-- Any authenticated user can read assigned quizzes
CREATE POLICY "Anyone can view quiz assignments"
  ON public.quiz_assignments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins/teachers can create new quiz assignments
CREATE POLICY "Only admins can insert quiz assignments"
  ON public.quiz_assignments
  FOR INSERT
  WITH CHECK (public.is_admin() AND auth.uid() = assigned_by);

-- Only admins can update or delete quiz assignments
CREATE POLICY "Only admins can modify quiz assignments"
  ON public.quiz_assignments
  FOR UPDATE
  USING (public.is_admin() AND auth.uid() = assigned_by)
  WITH CHECK (public.is_admin() AND auth.uid() = assigned_by);

CREATE POLICY "Only admins can delete quiz assignments"
  ON public.quiz_assignments
  FOR DELETE
  USING (public.is_admin() AND auth.uid() = assigned_by);

-- ----------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER (handle_new_user)
-- ----------------------------------------------------------------------------

-- Function executed when a new account is registered in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_guest
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

-- Trigger attached to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. WRONG-ANSWER UPLOADS (private student documents)
-- Run this section in Supabase SQL Editor before enabling uploads.
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wrong-answer-uploads',
  'wrong-answer-uploads',
  false,
  31457280,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp']
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

CREATE INDEX IF NOT EXISTS idx_wrong_answer_uploads_user_id ON public.wrong_answer_uploads(user_id);
ALTER TABLE public.wrong_answer_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can view own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can insert own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own wrong-answer uploads" ON public.wrong_answer_uploads;
CREATE POLICY "Users can delete own wrong-answer uploads"
  ON public.wrong_answer_uploads FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own uploaded files" ON storage.objects;
CREATE POLICY "Users can read own uploaded files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wrong-answer-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wrong-answer-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can delete own uploaded files" ON storage.objects;
CREATE POLICY "Users can delete own uploaded files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wrong-answer-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
