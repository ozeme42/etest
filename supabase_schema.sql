-- ========================================================
-- E-TEST PLATFORM - FULL SUPABASE POSTGRESQL DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ========================================================

-- 1. KULLANICILAR TABLOSU (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    grade_id VARCHAR(50) DEFAULT 'g1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTOMATIC SYNC FROM SUPABASE AUTH TO PUBLIC.USERS TABLE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, grade_id)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'gradeId', 'g1')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. HEDEFLER TABLOSU (GOALS)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL DEFAULT 'u1',
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Soru',
    period VARCHAR(50) NOT NULL DEFAULT 'Günlük',
    target INTEGER NOT NULL DEFAULT 50,
    current INTEGER NOT NULL DEFAULT 0,
    link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HAFTALIK PROGRAM TABLOSU (SCHEDULES)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL DEFAULT 'u1',
    day VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SINAV SONUÇLARI TABLOSU (SUBMISSIONS)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    score NUMERIC(5,2) DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    empty_count INTEGER DEFAULT 0,
    subject VARCHAR(100),
    title VARCHAR(255),
    answers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SORU BANKASI TABLOSU (QUESTIONS)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(100) NOT NULL DEFAULT 'Matematik',
    grade_id VARCHAR(50) NOT NULL DEFAULT 'g1',
    topic VARCHAR(255) NOT NULL DEFAULT 'Genel',
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer VARCHAR(10) NOT NULL DEFAULT '0',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
