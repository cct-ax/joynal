-- ================================================================
-- Migration: create_tables
-- テーブル・トリガー・インデックスの作成
-- ================================================================

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  email       text        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('trainee', 'mentor', 'ojt', 'admin')),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- daily_reports
-- ----------------------------------------------------------------
CREATE TABLE public.daily_reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       date        NOT NULL,
  check_in   time        NOT NULL,
  check_out  time        NOT NULL CHECK (check_out > check_in),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------
CREATE TABLE public.comments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   date        NOT NULL,
  trainee_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commenter_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, trainee_id, commenter_id)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- mentor_assignments
-- ----------------------------------------------------------------
CREATE TABLE public.mentor_assignments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ojt_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  year       integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainee_id, year)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- インデックス
-- ----------------------------------------------------------------
CREATE INDEX idx_daily_reports_user_date ON public.daily_reports (user_id, date DESC);
CREATE INDEX idx_comments_week_trainee   ON public.comments (week_start, trainee_id);
CREATE INDEX idx_mentor_assignments_year ON public.mentor_assignments (year, trainee_id);
