-- ================================================================
-- Migration: add_mood_to_daily_reports
-- daily_reports に mood カラムを追加
-- 1=とても落ち込んでいる 2=少し落ち込んでいる 3=普通 4=まあまあ良い 5=とても良い
-- ================================================================

ALTER TABLE public.daily_reports
  ADD COLUMN mood smallint CHECK (mood BETWEEN 1 AND 5);
