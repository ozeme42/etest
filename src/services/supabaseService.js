import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * High-performance Supabase database integration service.
 * Automatically falls back gracefully to localStorage or local memory if env variables are not present.
 */

// ==========================================
// 0. KULLANICILAR (USERS)
// ==========================================
export async function dbGetUsers() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      gradeId: u.grade_id,
      createdAt: u.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetUsers error:', err.message);
    return null;
  }
}

export async function dbAddUser(user) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(user.id || `u_${Date.now()}`),
      email: user.email,
      name: user.name,
      role: user.role || 'student',
      grade_id: user.gradeId || 'g1'
    };
    
    // Upsert using id conflict resolution
    const { data, error } = await supabase.from('users').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      if (error.code === '23505' || error.status === 409) {
        return { success: true, data: [payload] };
      }
      console.warn('[Supabase] dbAddUser upsert note:', error.message);
      return { error };
    }
    return { success: true, data };
  } catch (err) {
    return { success: true };
  }
}

export async function dbDeleteUser(userId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteUser error:', err.message);
    return false;
  }
}

// ==========================================
// 1. HEDEFLER (GOALS)
// ==========================================
export async function dbGetGoals(studentId) {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = supabase.from('goals').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(g => ({
      id: g.id,
      studentId: g.student_id,
      title: g.title,
      type: g.type,
      period: g.period,
      target: g.target,
      current: g.current || 0,
      link: g.link || '',
      createdAt: g.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetGoals error, fallback to local:', err.message);
    return null;
  }
}

export async function dbAddGoal(goal) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      student_id: goal.studentId || 'u1',
      title: goal.title,
      type: goal.type,
      period: goal.period,
      target: goal.target,
      current: goal.current || 0,
      link: goal.link || ''
    };
    const { data, error } = await supabase.from('goals').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddGoal error:', err.message);
    return null;
  }
}

export async function dbUpdateGoalProgress(goalId, newCurrent) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('goals').update({ current: newCurrent }).eq('id', goalId).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbUpdateGoalProgress error:', err.message);
    return null;
  }
}

export async function dbDeleteGoal(goalId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteGoal error:', err.message);
    return false;
  }
}

// ==========================================
// 2. HAFTALIK PROGRAM (SCHEDULES)
// ==========================================
export async function dbGetSchedules(studentId) {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = supabase.from('schedules').select('*').order('created_at', { ascending: true });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(s => ({
      id: s.id,
      studentId: s.student_id,
      day: s.day,
      time: s.time,
      title: s.title,
      done: s.done || false
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetSchedules error:', err.message);
    return null;
  }
}

export async function dbAddSchedule(sch) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      student_id: sch.studentId || 'u1',
      day: sch.day,
      time: sch.time,
      title: sch.title,
      done: Boolean(sch.done)
    };
    const { data, error } = await supabase.from('schedules').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddSchedule error:', err.message);
    return null;
  }
}

export async function dbToggleSchedule(schId, newDone) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('schedules').update({ done: newDone }).eq('id', schId).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbToggleSchedule error:', err.message);
    return null;
  }
}

export async function dbDeleteSchedule(schId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('schedules').delete().eq('id', schId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSchedule error:', err.message);
    return false;
  }
}

// ==========================================
// 3. SINAV SONUÇLARI (SUBMISSIONS)
// ==========================================
export async function dbGetSubmissions(studentId) {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(s => ({
      id: s.id,
      testId: s.testId || s.test_id,
      studentId: s.studentId || s.student_id,
      score: s.score,
      correctCount: s.correct_count,
      wrongCount: s.wrong_count,
      emptyCount: s.empty_count,
      subject: s.subject,
      title: s.title,
      answers: s.answers,
      createdAt: s.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetSubmissions error:', err.message);
    return null;
  }
}

export async function dbSaveSubmission(sub) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      test_id: sub.testId,
      student_id: sub.studentId,
      score: sub.score,
      correct_count: sub.correctCount,
      wrong_count: sub.wrongCount,
      empty_count: sub.emptyCount,
      subject: sub.subject,
      title: sub.title,
      answers: sub.answers
    };
    const { data, error } = await supabase.from('submissions').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveSubmission error:', err.message);
    return null;
  }
}

// ==========================================
// 4. SORU BANKASI (QUESTIONS)
// ==========================================
export async function dbGetQuestions() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(q => ({
      id: q.id,
      subject: q.subject,
      gradeId: q.grade_id,
      topic: q.topic,
      questionText: q.question_text,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      imageUrl: q.image_url
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetQuestions error:', err.message);
    return null;
  }
}

export async function dbAddQuestion(q) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      subject: q.subject || 'Matematik',
      grade_id: q.gradeId || 'g1',
      topic: q.topic || 'Genel',
      question_text: q.questionText || '',
      options: q.options || [],
      correct_answer: String(q.correctAnswer || '0'),
      explanation: q.explanation || '',
      image_url: q.imageUrl || ''
    };
    const { data, error } = await supabase.from('questions').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddQuestion error:', err.message);
    return null;
  }
}

export async function dbDeleteQuestion(qId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteQuestion error:', err.message);
    return false;
  }
}
