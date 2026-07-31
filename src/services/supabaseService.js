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
// 0.5. MÜFREDAT / SINIFLAR / DERSLER (CURRICULUM)
// ==========================================
export async function dbGetCurriculum() {
  if (!isSupabaseConfigured()) return null;
  try {
    const [gRes, sRes, uRes, tRes] = await Promise.all([
      supabase.from('grades').select('*').order('created_at', { ascending: true }),
      supabase.from('subjects').select('*').order('created_at', { ascending: true }),
      supabase.from('units').select('*').order('created_at', { ascending: true }),
      supabase.from('topics').select('*').order('created_at', { ascending: true })
    ]);

    if (gRes.error || sRes.error || uRes.error || tRes.error) {
      return null;
    }

    return {
      grades: (gRes.data || []).map(g => ({ id: g.id, name: g.name })),
      subjects: (sRes.data || []).map(s => ({ id: s.id, gradeId: s.grade_id, name: s.name })),
      units: (uRes.data || []).map(u => ({ id: u.id, subjectId: u.subject_id, name: u.name })),
      topics: (tRes.data || []).map(t => ({ id: t.id, unitId: t.unit_id, name: t.name })),
      tests: []
    };
  } catch (err) {
    console.warn('[Supabase] dbGetCurriculum error:', err.message);
    return null;
  }
}

export async function dbAddGrade(grade) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = { id: String(grade.id), name: grade.name };
    const { data, error } = await supabase.from('grades').upsert([payload], { onConflict: 'id' }).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddGrade error:', err.message);
    return null;
  }
}

export async function dbDeleteGrade(gradeId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('grades').delete().eq('id', gradeId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteGrade error:', err.message);
    return false;
  }
}

export async function dbAddSubject(subject) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = { id: String(subject.id), grade_id: String(subject.gradeId), name: subject.name };
    const { data, error } = await supabase.from('subjects').upsert([payload], { onConflict: 'id' }).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddSubject error:', err.message);
    return null;
  }
}

export async function dbDeleteSubject(subjectId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSubject error:', err.message);
    return false;
  }
}

export async function dbAddUnit(unit) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = { id: String(unit.id), subject_id: String(unit.subjectId), name: unit.name };
    const { data, error } = await supabase.from('units').upsert([payload], { onConflict: 'id' }).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddUnit error:', err.message);
    return null;
  }
}

export async function dbAddTopic(topic) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = { id: String(topic.id), unit_id: String(topic.unitId), name: topic.name };
    const { data, error } = await supabase.from('topics').upsert([payload], { onConflict: 'id' }).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddTopic error:', err.message);
    return null;
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
      id: String(g.id),
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
    console.warn('[Supabase] dbGetGoals error:', err.message);
    return null;
  }
}

export async function dbAddGoal(goal) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(goal.id || `g_${Date.now()}`),
      student_id: goal.studentId || 'u1',
      title: goal.title,
      type: goal.type,
      period: goal.period,
      target: goal.target,
      current: goal.current || 0,
      link: goal.link || ''
    };
    const { data, error } = await supabase.from('goals').upsert([payload], { onConflict: 'id' }).select().single();
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
    const { data, error } = await supabase.from('goals').update({ current: newCurrent }).eq('id', String(goalId)).select();
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
    const { error } = await supabase.from('goals').delete().eq('id', String(goalId));
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
      id: String(s.id),
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
      id: String(sch.id || `s_${Date.now()}`),
      student_id: sch.studentId || 'u1',
      day: sch.day,
      time: sch.time,
      title: sch.title,
      done: Boolean(sch.done)
    };
    const { data, error } = await supabase.from('schedules').upsert([payload], { onConflict: 'id' }).select().single();
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
    const { data, error } = await supabase.from('schedules').update({ done: newDone }).eq('id', String(schId)).select();
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
    const { error } = await supabase.from('schedules').delete().eq('id', String(schId));
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
      id: String(s.id),
      testId: s.test_id,
      studentId: s.student_id,
      score: s.score,
      correctCount: s.correct_count,
      wrongCount: s.wrong_count,
      emptyCount: s.empty_count,
      subject: s.subject,
      title: s.title,
      answers: s.answers || [],
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
      id: String(sub.id || `sub_${Date.now()}`),
      test_id: String(sub.testId || 'test_1'),
      student_id: String(sub.studentId || 'u1'),
      score: sub.score || 0,
      correct_count: sub.correctCount || 0,
      wrong_count: sub.wrongCount || 0,
      empty_count: sub.emptyCount || 0,
      subject: sub.subject || 'Genel',
      title: sub.title || 'Sınav',
      answers: sub.answers || []
    };
    const { data, error } = await supabase.from('submissions').upsert([payload], { onConflict: 'id' }).select().single();
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
      id: String(q.id),
      subject: q.subject,
      gradeId: q.grade_id,
      topic: q.topic,
      questionText: q.question_text,
      options: q.options || [],
      correctAnswer: q.correct_answer,
      explanation: q.explanation || '',
      imageUrl: q.image_url || ''
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
      id: String(q.id || `q_${Date.now()}`),
      subject: q.subject || 'Matematik',
      grade_id: q.gradeId || 'g1',
      topic: q.topic || 'Genel',
      question_text: q.questionText || '',
      options: q.options || [],
      correct_answer: String(q.correctAnswer || '0'),
      explanation: q.explanation || '',
      image_url: q.imageUrl || ''
    };
    const { data, error } = await supabase.from('questions').upsert([payload], { onConflict: 'id' }).select().single();
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
    const { error } = await supabase.from('questions').delete().eq('id', String(qId));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteQuestion error:', err.message);
    return false;
  }
}

// ==========================================
// 5. ÖDEVLER (HOMEWORKS)
// ==========================================
export async function dbGetHomeworks() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('homeworks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(h => ({
      id: String(h.id),
      title: h.title,
      subject: h.subject,
      dueDate: h.due_date,
      targetType: h.target_type,
      targetIds: h.target_ids || [],
      tests: h.tests || [],
      createdAt: h.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetHomeworks error:', err.message);
    return null;
  }
}

export async function dbAddHomework(hw) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(hw.id || `hw_${Date.now()}`),
      title: hw.title,
      subject: hw.subject || 'Genel',
      due_date: hw.dueDate,
      target_type: hw.targetType || 'grade',
      target_ids: hw.targetIds || [],
      tests: hw.tests || []
    };
    const { data, error } = await supabase.from('homeworks').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddHomework error:', err.message);
    return null;
  }
}

export async function dbDeleteHomework(hwId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('homeworks').delete().eq('id', String(hwId));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteHomework error:', err.message);
    return false;
  }
}

// ==========================================
// 6. DERS ÇALIŞMA PLANLARI & ATAMALARI (STUDY PLANS & ASSIGNMENTS)
// ==========================================
export async function dbGetStudyPlans() {
  if (!isSupabaseConfigured()) return null;
  try {
    const [pRes, aRes] = await Promise.all([
      supabase.from('study_plans').select('*').order('created_at', { ascending: false }),
      supabase.from('study_assignments').select('*').order('created_at', { ascending: false })
    ]);

    if (pRes.error || aRes.error) return null;

    const plans = (pRes.data || []).map(p => ({
      id: String(p.id),
      title: p.title,
      subjects: p.subjects || [],
      createdAt: p.created_at
    }));

    const assignments = (aRes.data || []).map(a => ({
      id: String(a.id),
      studentId: a.student_id,
      studyPlanId: a.study_plan_id,
      subject: a.subject,
      topic: a.topic,
      dueDate: a.due_date,
      status: a.status || 'assigned',
      durationMinutes: a.duration_minutes || 30,
      completedAt: a.completed_at,
      createdAt: a.created_at
    }));

    return { plans, assignments };
  } catch (err) {
    console.warn('[Supabase] dbGetStudyPlans error:', err.message);
    return null;
  }
}

export async function dbAddStudyPlan(plan) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(plan.id || `plan_${Date.now()}`),
      title: plan.title,
      subjects: plan.subjects || []
    };
    const { data, error } = await supabase.from('study_plans').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddStudyPlan error:', err.message);
    return null;
  }
}

export async function dbDeleteStudyPlan(planId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('study_plans').delete().eq('id', String(planId));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteStudyPlan error:', err.message);
    return false;
  }
}

export async function dbAddStudyAssignment(a) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(a.id || `sa_${Date.now()}`),
      student_id: String(a.studentId),
      study_plan_id: a.studyPlanId ? String(a.studyPlanId) : null,
      subject: a.subject,
      topic: a.topic,
      due_date: a.dueDate,
      status: a.status || 'assigned',
      duration_minutes: a.durationMinutes || 30
    };
    const { data, error } = await supabase.from('study_assignments').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddStudyAssignment error:', err.message);
    return null;
  }
}

export async function dbUpdateStudyAssignment(aId, updates) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

    const { data, error } = await supabase.from('study_assignments').update(payload).eq('id', String(aId)).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbUpdateStudyAssignment error:', err.message);
    return null;
  }
}

// ==========================================
// 7. KİTAP TAKİBİ (TRACKED BOOKS & TESTS)
// ==========================================
export async function dbGetTrackedBooks() {
  if (!isSupabaseConfigured()) return null;
  try {
    const [bRes, tRes] = await Promise.all([
      supabase.from('tracked_books').select('*').order('created_at', { ascending: false }),
      supabase.from('tracked_book_tests').select('*').order('created_at', { ascending: false })
    ]);

    if (bRes.error || tRes.error) return null;

    const books = (bRes.data || []).map(b => ({
      id: String(b.id),
      title: b.title,
      publisher: b.publisher,
      bookType: b.book_type,
      subjects: b.subjects || [],
      createdAt: b.created_at
    }));

    const bookTests = (tRes.data || []).map(t => ({
      id: String(t.id),
      bookId: String(t.book_id),
      subjectId: t.subject_id ? String(t.subject_id) : null,
      topicId: t.topic_id ? String(t.topic_id) : null,
      name: t.name,
      questionCount: t.question_count || 20,
      answerKey: t.answer_key || {},
      createdAt: t.created_at
    }));

    return { books, bookTests };
  } catch (err) {
    console.warn('[Supabase] dbGetTrackedBooks error:', err.message);
    return null;
  }
}

export async function dbAddTrackedBook(book) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(book.id || `tb_${Date.now()}`),
      title: book.title,
      publisher: book.publisher || '',
      book_type: book.bookType || 'standard',
      subjects: book.subjects || []
    };
    const { data, error } = await supabase.from('tracked_books').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddTrackedBook error:', err.message);
    return null;
  }
}

export async function dbUpdateTrackedBook(bookId, updates) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.publisher !== undefined) payload.publisher = updates.publisher;
    if (updates.bookType !== undefined) payload.book_type = updates.bookType;
    if (updates.subjects !== undefined) payload.subjects = updates.subjects;

    const { data, error } = await supabase.from('tracked_books').update(payload).eq('id', String(bookId)).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbUpdateTrackedBook error:', err.message);
    return null;
  }
}

export async function dbDeleteTrackedBook(bookId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('tracked_books').delete().eq('id', String(bookId));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteTrackedBook error:', err.message);
    return false;
  }
}

export async function dbAddTrackedBookTest(test) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(test.id || `tbt_${Date.now()}`),
      book_id: String(test.bookId),
      subject_id: test.subjectId ? String(test.subjectId) : null,
      topic_id: test.topicId ? String(test.topicId) : null,
      name: test.name,
      question_count: test.questionCount || 20,
      answer_key: test.answerKey || {}
    };
    const { data, error } = await supabase.from('tracked_book_tests').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddTrackedBookTest error:', err.message);
    return null;
  }
}

export async function dbDeleteTrackedBookTest(testId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('tracked_book_tests').delete().eq('id', String(testId));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteTrackedBookTest error:', err.message);
    return false;
  }
}
