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
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- 2. AUTOMATIC SYNC FROM SUPABASE AUTH TO PUBLIC.USERS TABLE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, grade_id, is_approved)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'gradeId', 'g1'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'teacher' THEN FALSE ELSE TRUE END
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

-- 3. SINIFLAR (GRADES)
CREATE TABLE IF NOT EXISTS public.grades (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DERSLER (SUBJECTS)
CREATE TABLE IF NOT EXISTS public.subjects (
    id VARCHAR(100) PRIMARY KEY,
    grade_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÜNİTELER (UNITS)
CREATE TABLE IF NOT EXISTS public.units (
    id VARCHAR(100) PRIMARY KEY,
    subject_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. KONULAR (TOPICS)
CREATE TABLE IF NOT EXISTS public.topics (
    id VARCHAR(100) PRIMARY KEY,
    unit_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. HEDEFLER TABLOSU (GOALS)
CREATE TABLE IF NOT EXISTS public.goals (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL DEFAULT 'u1',
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Soru',
    period VARCHAR(50) NOT NULL DEFAULT 'Günlük',
    target INTEGER NOT NULL DEFAULT 50,
    current INTEGER NOT NULL DEFAULT 0,
    link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HAFTALIK PROGRAM TABLOSU (SCHEDULES)
CREATE TABLE IF NOT EXISTS public.schedules (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL DEFAULT 'u1',
    day VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SINAV SONUÇLARI TABLOSU (SUBMISSIONS)
CREATE TABLE IF NOT EXISTS public.submissions (
    id VARCHAR(100) PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    score NUMERIC(5,2) DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    empty_count INTEGER DEFAULT 0,
    subject VARCHAR(100),
    title VARCHAR(255),
    answers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SORU BANKASI TABLOSU (QUESTIONS)
CREATE TABLE IF NOT EXISTS public.questions (
    id VARCHAR(100) PRIMARY KEY,
    subject VARCHAR(100) NOT NULL DEFAULT 'Matematik',
    grade_id VARCHAR(50) NOT NULL DEFAULT 'g1',
    topic VARCHAR(255) NOT NULL DEFAULT 'Genel',
    topic_id VARCHAR(255) DEFAULT 'global_all',
    type VARCHAR(100) DEFAULT 'coktan_secmeli',
    content_type VARCHAR(100) DEFAULT 'text',
    content_payload TEXT DEFAULT '',
    is_bundle BOOLEAN DEFAULT FALSE,
    answer_key JSONB DEFAULT '[]'::jsonb,
    title TEXT DEFAULT '',
    question_count INT DEFAULT 1,
    raw_data JSONB DEFAULT '{}'::jsonb,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer VARCHAR(10) NOT NULL DEFAULT '0',
    explanation TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic_id VARCHAR(255) DEFAULT 'global_all';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'coktan_secmeli';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'text';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS content_payload TEXT DEFAULT '';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answer_key JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_count INT DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 11. ÖDEVLER TABLOSU (HOMEWORKS)
CREATE TABLE IF NOT EXISTS public.homeworks (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    due_date TIMESTAMPTZ,
    target_type VARCHAR(50) DEFAULT 'grade',
    target_ids JSONB DEFAULT '[]'::jsonb,
    tests JSONB DEFAULT '[]'::jsonb,
    question_ids JSONB DEFAULT '[]'::jsonb,
    total_questions INT DEFAULT 0,
    time_per_question INT DEFAULT 2,
    time INT DEFAULT 20,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS question_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;
ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS time_per_question INT DEFAULT 2;
ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS time INT DEFAULT 20;
ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 12. DERS ÇALIŞMA PLANLARI (STUDY PLANS)
CREATE TABLE IF NOT EXISTS public.study_plans (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subjects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DERS ÇALIŞMA ATAMALARI (STUDY ASSIGNMENTS)
CREATE TABLE IF NOT EXISTS public.study_assignments (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    study_plan_id VARCHAR(100),
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'assigned',
    duration_minutes INTEGER DEFAULT 30,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. KİTAP TAKİBİ - KİTAPLAR (TRACKED BOOKS)
CREATE TABLE IF NOT EXISTS public.tracked_books (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    publisher VARCHAR(255) DEFAULT '',
    book_type VARCHAR(50) DEFAULT 'standard',
    subjects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. KİTAP TAKİBİ - KİTAP TESTLERİ (TRACKED BOOK TESTS)
CREATE TABLE IF NOT EXISTS public.tracked_book_tests (
    id VARCHAR(100) PRIMARY KEY,
    book_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100),
    topic_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    question_count INTEGER DEFAULT 20,
    answer_key JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_book_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public users" ON public.users;
DROP POLICY IF EXISTS "Allow public grades" ON public.grades;
DROP POLICY IF EXISTS "Allow public subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow public units" ON public.units;
DROP POLICY IF EXISTS "Allow public topics" ON public.topics;
DROP POLICY IF EXISTS "Allow public goals" ON public.goals;
DROP POLICY IF EXISTS "Allow public schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow public submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow public questions" ON public.questions;
DROP POLICY IF EXISTS "Allow public homeworks" ON public.homeworks;
DROP POLICY IF EXISTS "Allow public study_plans" ON public.study_plans;
DROP POLICY IF EXISTS "Allow public study_assignments" ON public.study_assignments;
DROP POLICY IF EXISTS "Allow public tracked_books" ON public.tracked_books;
DROP POLICY IF EXISTS "Allow public tracked_book_tests" ON public.tracked_book_tests;

CREATE POLICY "Allow public users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public grades" ON public.grades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public topics" ON public.topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public homeworks" ON public.homeworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public study_plans" ON public.study_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public study_assignments" ON public.study_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public tracked_books" ON public.tracked_books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public tracked_book_tests" ON public.tracked_book_tests FOR ALL USING (true) WITH CHECK (true);

-- 12. KOÇLUK SİSTEMİ TABLOLARI
CREATE TABLE IF NOT EXISTS public.coaching_links (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coaching_notes (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    note TEXT,
    goals JSONB DEFAULT '[]'::jsonb,
    weekly_focus TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_exams (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    scores JSONB DEFAULT '{}'::jsonb,
    total_net NUMERIC(6,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coaching_meetings (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    topic VARCHAR(255),
    notes TEXT,
    decisions JSONB DEFAULT '[]'::jsonb,
    next_meeting_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coaching_profiles (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    school_name VARCHAR(255),
    student_number VARCHAR(100),
    birth_date DATE,
    target_school VARCHAR(255),
    target_net NUMERIC(6,2) DEFAULT 0,
    learning_style VARCHAR(100) DEFAULT 'Görsel Öğrenen',
    parent_name VARCHAR(255),
    parent_phone VARCHAR(100),
    parent_notes TEXT,
    strengths TEXT,
    hobbies TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coaching_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public coaching_links" ON public.coaching_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public coaching_notes" ON public.coaching_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public mock_exams" ON public.mock_exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public coaching_meetings" ON public.coaching_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public coaching_profiles" ON public.coaching_profiles FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 8. SUPABASE STORAGE BUCKET FOR PDF & IMAGE FILES
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('question_files', 'question_files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access for question_files" ON storage.objects FOR SELECT USING (bucket_id = 'question_files');
CREATE POLICY "Public Insert Access for question_files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question_files');
CREATE POLICY "Public Update Access for question_files" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'question_files');
