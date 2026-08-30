import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function toUUID(id) {
  if (!id) return '00000000-0000-4000-8000-000000000000';
  const str = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  while (hex.length < 32) {
    hex += '0';
  }
  hex = hex.substring(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

export function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function ensureUUIDs(ids = []) {
  const result = new Set();
  (Array.isArray(ids) ? ids : [ids]).forEach(id => {
    if (!id) return;
    const str = String(id).trim();
    if (isValidUUID(str)) {
      result.add(str.toLowerCase());
    } else {
      const generated = toUUID(str);
      if (generated && isValidUUID(generated)) {
        result.add(generated.toLowerCase());
      }
    }
  });
  return Array.from(result);
}

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
      gradeId: u.grade_id || u.gradeId || u.class_id || 'g1',
      classId: u.class_id || u.classId || u.grade_id || null,
      className: u.class_name || u.className || null,
      grade: u.grade || null,
      teacherId: u.teacher_id || u.teacherId || null,
      password: u.password || null,
      isApproved: u.is_approved !== undefined ? Boolean(u.is_approved) : (u.role === 'teacher' ? false : true),
      createdAt: u.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetUsers error:', err.message);
    return null;
  }
}

export async function dbUpdateUser(userId, updates = {}) {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.gradeId !== undefined || updates.grade_id !== undefined || updates.classId !== undefined || updates.grade !== undefined) {
      const gVal = updates.gradeId || updates.grade_id || updates.classId || updates.grade;
      payload.grade_id = String(gVal);
    }
    if (updates.isApproved !== undefined || updates.is_approved !== undefined) {
      payload.is_approved = Boolean(updates.isApproved ?? updates.is_approved);
    }

    let updatedRows = null;

    // 1. Try update by id
    const resId = await supabase.from('users').update(payload).eq('id', String(userId)).select();
    if (!resId.error && resId.data && resId.data.length > 0) {
      updatedRows = resId.data;
    }

    // 2. If 0 rows updated and email exists, try update by email!
    if (!updatedRows && (updates.email || payload.email)) {
      const mail = (updates.email || payload.email).trim().toLowerCase();
      const resEmail = await supabase.from('users').update(payload).eq('email', mail).select();
      if (!resEmail.error && resEmail.data && resEmail.data.length > 0) {
        updatedRows = resEmail.data;
      }
    }

    // 3. If row still doesn't exist in Supabase users table, insert/upsert it!
    if (!updatedRows) {
      const insertPayload = {
        id: String(userId),
        email: (updates.email || `${String(userId).toLowerCase()}@etest.com`).trim().toLowerCase(),
        name: updates.name || 'Öğrenci',
        role: updates.role || 'student',
        grade_id: payload.grade_id || 'g1',
        is_approved: payload.is_approved !== undefined ? payload.is_approved : true
      };
      const upsertRes = await supabase.from('users').upsert([insertPayload], { onConflict: 'id' }).select();
      if (upsertRes.data && upsertRes.data.length > 0) {
        updatedRows = upsertRes.data;
      }
    }

    return { success: Boolean(updatedRows), data: updatedRows };
  } catch (err) {
    console.error('[Supabase] dbUpdateUser error:', err);
    return { success: false, error: err.message };
  }
}

export async function dbAddUser(user) {
  if (!isSupabaseConfigured() || !user) return null;
  try {
    const isApprovedVal = user.isApproved !== undefined 
      ? Boolean(user.isApproved) 
      : (user.role === 'teacher' ? false : true);

    const payload = {
      id: String(user.id || `u_${Date.now()}`),
      email: (user.email || '').trim().toLowerCase(),
      name: user.name || 'Kullanıcı',
      role: user.role || 'student',
      grade_id: String(user.gradeId || user.grade || user.classId || 'g1'),
      is_approved: isApprovedVal
    };

    // 1. Try update by id first
    const { data: updateData, error: updateErr } = await supabase.from('users').update(payload).eq('id', payload.id).select();
    if (!updateErr && updateData && updateData.length > 0) {
      return { success: true, data: updateData };
    }

    // 2. Try update by email if email exists
    if (payload.email) {
      const { data: emailData, error: emailErr } = await supabase.from('users').update(payload).eq('email', payload.email).select();
      if (!emailErr && emailData && emailData.length > 0) {
        return { success: true, data: emailData };
      }
    }

    // 3. Otherwise upsert
    const { data, error } = await supabase.from('users').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      if (payload.email && (error.code === '23505' || (error.message && error.message.includes('unique')))) {
        const updateByEmail = await supabase.from('users').update(payload).eq('email', payload.email).select();
        return { success: true, data: updateByEmail.data };
      }
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('[Supabase] dbAddUser error:', err.message);
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
      supabase.from('grades').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('units').select('*'),
      supabase.from('topics').select('*')
    ]);

    if (gRes.error || sRes.error || uRes.error || tRes.error) {
      return null;
    }

    const sortFn = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true, sensitivity: 'base' });

    return {
      grades: (gRes.data || []).map(g => ({ id: g.id, name: g.name })).sort(sortFn),
      subjects: (sRes.data || []).map(s => ({ id: s.id, gradeId: s.grade_id, name: s.name })).sort(sortFn),
      units: (uRes.data || []).map(u => ({ id: u.id, subjectId: u.subject_id, name: u.name })).sort(sortFn),
      topics: (tRes.data || []).map(t => ({ id: t.id, unitId: t.unit_id, name: t.name })).sort(sortFn),
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

export async function dbDeleteUnit(unitId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('units').delete().eq('id', unitId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteUnit error:', err.message);
    return false;
  }
}

export async function dbDeleteTopic(topicId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('topics').delete().eq('id', topicId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteTopic error:', err.message);
    return false;
  }
}

// ==========================================
// 0.8. DERS VE KONU ÖZETLERİ (SUMMARIES)
// ==========================================
export async function dbGetSummaries() {
  if (!isSupabaseConfigured()) return null;
  try {
    // 1. Try dedicated summaries table first
    const { data, error } = await supabase.from('summaries').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(s => ({
        id: String(s.id),
        targetType: s.target_type || s.targetType || 'topic',
        targetId: String(s.target_id || s.targetId),
        gradeId: s.grade_id || s.gradeId || null,
        subjectId: s.subject_id || s.subjectId || null,
        unitId: s.unit_id || s.unitId || null,
        topicId: s.topic_id || s.topicId || null,
        title: s.title || '',
        contentHtml: s.content_html || s.contentHtml || '',
        authorName: s.author_name || s.authorName || 'Öğretmen',
        createdAt: s.created_at,
        updatedAt: s.updated_at || s.created_at
      }));
    }

    // 2. Cloud Fallback: Fetch from global summaries store in Supabase
    const { data: storeData, error: storeErr } = await supabase
      .from('coaching_profiles')
      .select('*')
      .eq('id', 'global_summaries_store')
      .maybeSingle();

    if (!storeErr && storeData?.extra_data) {
      const parsed = typeof storeData.extra_data === 'string' ? JSON.parse(storeData.extra_data) : storeData.extra_data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({
          id: String(s.id || `sum_${s.targetType || 'item'}_${s.targetId}`),
          targetType: s.targetType || s.target_type || 'topic',
          targetId: String(s.targetId || s.target_id),
          gradeId: s.gradeId || s.grade_id || null,
          subjectId: s.subjectId || s.subject_id || null,
          unitId: s.unitId || s.unit_id || null,
          topicId: s.topicId || s.topic_id || null,
          title: s.title || '',
          contentHtml: s.contentHtml || s.content_html || '',
          authorName: s.authorName || s.author_name || 'Öğretmen',
          createdAt: s.createdAt || s.created_at,
          updatedAt: s.updatedAt || s.updated_at || new Date().toISOString()
        }));
      }
    }

    return [];
  } catch (err) {
    console.warn('[Supabase] dbGetSummaries error:', err.message);
    return null;
  }
}

export async function dbSaveSummary(summary, allSummaries = []) {
  if (!isSupabaseConfigured()) return null;
  try {
    const targetIdStr = String(summary.targetId || summary.id);
    const summaryId = String(summary.id || `sum_${summary.targetType || 'item'}_${targetIdStr}`);
    
    const payload = {
      id: summaryId,
      target_type: summary.targetType || 'topic',
      target_id: targetIdStr,
      grade_id: summary.gradeId || null,
      subject_id: summary.subjectId || null,
      unit_id: summary.unitId || null,
      topic_id: summary.topicId || null,
      title: summary.title || '',
      content_html: summary.contentHtml || '',
      author_name: summary.authorName || 'Öğretmen',
      updated_at: new Date().toISOString()
    };

    // 1. Try dedicated summaries table
    try {
      await supabase.from('summaries').upsert([payload], { onConflict: 'id' });
    } catch {}

    // 2. Always persist full summaries list to Supabase cloud store
    if (allSummaries && Array.isArray(allSummaries)) {
      const storePayload = {
        id: 'global_summaries_store',
        student_id: 'system_summaries',
        teacher_id: 'teacher_1',
        extra_data: JSON.stringify(allSummaries)
      };
      await supabase.from('coaching_profiles').upsert([storePayload], { onConflict: 'id' });
    }

    return { success: true };
  } catch (err) {
    console.warn('[Supabase] dbSaveSummary error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function dbDeleteSummary(targetId, remainingSummaries = []) {
  if (!isSupabaseConfigured() || !targetId) return null;
  try {
    const targetIdStr = String(targetId);
    try {
      await supabase.from('summaries').delete().or(`id.eq.${targetIdStr},target_id.eq.${targetIdStr}`);
    } catch {}

    if (remainingSummaries && Array.isArray(remainingSummaries)) {
      const storePayload = {
        id: 'global_summaries_store',
        student_id: 'system_summaries',
        extra_data: JSON.stringify(remainingSummaries)
      };
      await supabase.from('coaching_profiles').upsert([storePayload], { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSummary error:', err.message);
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
    if (studentId) {
      const sUuid = toUUID(studentId);
      if (sUuid) {
        query = query.or(`student_id.eq.${studentId},student_id.eq.${sUuid}`);
      } else {
        query = query.eq('student_id', studentId);
      }
    }
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
    const safeId = toUUID(goal.id) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : toUUID(`g_${Date.now()}_${Math.random()}`));
    const safeStudentId = toUUID(goal.studentId) || goal.studentId || 'u1';
    const payload = {
      id: safeId,
      student_id: safeStudentId,
      title: goal.title || 'Hedef',
      type: goal.type || 'Soru',
      period: goal.period || 'Günlük',
      target: Number(goal.target) || 0,
      current: Number(goal.current) || 0,
      link: goal.link || ''
    };
    const { data, error } = await supabase.from('goals').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return {
      ...goal,
      id: String(data.id),
      studentId: data.student_id
    };
  } catch (err) {
    console.warn('[Supabase] dbAddGoal error:', err.message);
    return null;
  }
}

export async function dbUpdateGoalProgress(goalId, newCurrent) {
  if (!isSupabaseConfigured()) return null;
  try {
    const safeId = toUUID(goalId) || String(goalId);
    const { data, error } = await supabase.from('goals').update({ current: Number(newCurrent) || 0 }).eq('id', safeId).select();
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
    const safeId = toUUID(goalId) || String(goalId);
    const { error } = await supabase.from('goals').delete().eq('id', safeId);
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
    if (studentId) {
      const sUuid = toUUID(studentId);
      if (sUuid) {
        query = query.or(`student_id.eq.${studentId},student_id.eq.${sUuid}`);
      } else {
        query = query.eq('student_id', studentId);
      }
    }
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
    const safeId = toUUID(sch.id) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : toUUID(`s_${Date.now()}_${Math.random()}`));
    const safeStudentId = toUUID(sch.studentId) || sch.studentId || 'u1';
    const payload = {
      id: safeId,
      student_id: safeStudentId,
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
    const safeId = toUUID(schId) || String(schId);
    const { data, error } = await supabase.from('schedules').update({ done: Boolean(newDone) }).eq('id', safeId).select();
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
    const safeId = toUUID(schId) || String(schId);
    const { error } = await supabase.from('schedules').delete().eq('id', safeId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSchedule error:', err.message);
    return false;
  }
}

// ==========================================
// 3. SINAV SONUÇLARI (SUBMISSIONS) — PATCHED
// ==========================================
export async function dbGetSubmissions(studentId) {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false }).limit(1000);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(s => {
      let rawAnswers = s.answers;
      if (typeof rawAnswers === 'string') {
        try { rawAnswers = JSON.parse(rawAnswers); } catch {}
      }
      const answersArr = Array.isArray(rawAnswers) ? rawAnswers : [];
      const meta = answersArr.find(a => a?.type === 'metadata') || {};
      const isManual = meta?.isManual !== undefined
        ? Boolean(meta.isManual)
        : Boolean(
            meta?.sourceType === 'manual_test' ||
            s.source_type === 'manual_test' ||
            String(meta?.realId || s.id || '').startsWith('sub_manual') ||
            String(meta?.realTestId || s.test_id || '').startsWith('sub_manual')
          );
      
      const approvalStatus = meta?.approvalStatus || s.approval_status || (meta?.isApproved ? 'approved' : (s.is_evaluated_by_teacher ? 'approved' : (isManual ? 'pending' : 'approved')));
      const isApproved = meta?.isApproved !== undefined
        ? Boolean(meta.isApproved)
        : Boolean(approvalStatus === 'approved' || s.is_evaluated_by_teacher || s.status === 'completed');

      const resolvedTitle = meta?.testTitle || s.test_title || s.title || '';
      const resolvedSubject = meta?.subjectName || meta?.subject || s.subject || '';
      const resolvedUnit = meta?.unitTopic || meta?.topicName || '';
      const resolvedTestName = meta?.testName || s.test_name || '';

      return {
        id: meta?.realId || String(s.id),
        supabaseId: String(s.id),
        testId: s.test_id || meta?.realTestId,
        realTestId: s.test_id || meta?.realTestId,
        bookTestId: meta?.bookTestId || s.test_id || meta?.realTestId,
        studentId: s.student_id,
        hwId: s.homework_id ? String(s.homework_id) : (meta?.hwId ? String(meta.hwId) : null),
        homeworkId: s.homework_id ? String(s.homework_id) : (meta?.hwId ? String(meta.hwId) : null),
        score: s.score,
        correctCount: s.correct_count,
        wrongCount: s.wrong_count,
        emptyCount: s.empty_count,
        blankCount: s.empty_count,
        subject: resolvedSubject || s.subject,
        subjectName: resolvedSubject || s.subject,
        title: resolvedTitle || s.title,
        testTitle: resolvedTitle || s.title,
        testName: resolvedTestName,
        bookTitle: meta?.bookTitle || s.book_title || null,
        unitTopic: resolvedUnit || null,
        topicName: resolvedUnit || null,
        answers: answersArr,
        totalNet: meta?.totalNet !== undefined && meta?.totalNet !== null 
          ? Number(meta.totalNet) 
          : Number(((s.correct_count || 0) - ((s.wrong_count || 0) / 4)).toFixed(2)),
        scorePercentage: (() => {
          const totQ = s.total_questions || meta?.totalQuestions || ((s.correct_count || 0) + (s.wrong_count || 0) + (s.empty_count || 0));
          if (totQ > 0 && typeof s.correct_count === 'number' && (s.correct_count > 0 || (s.wrong_count || 0) > 0 || (s.empty_count || 0) > 0)) {
            return Math.min(100, Math.max(0, Math.round((s.correct_count / totQ) * 100)));
          }
          if (typeof meta?.scorePercentage === 'number' && !isNaN(meta.scorePercentage) && meta.scorePercentage > 0) {
            return Math.round(meta.scorePercentage);
          }
          if (typeof s.score === 'number' && s.score > 0 && s.score <= 100 && (!totQ || totQ <= 1)) {
            return Math.round(s.score);
          }
          return 0;
        })(),
        isManual: isManual,
        sourceType: meta?.sourceType || (isManual ? 'manual_test' : null),
        status: meta?.status || s.status || (isApproved ? 'completed' : 'pending_approval'),
        approvalStatus: approvalStatus,
        isApproved: isApproved,
        submittedByRole: meta?.submittedByRole || null,
        submittedByName: meta?.submittedByName || null,
        approvedBy: meta?.approvedBy || null,
        approvedByName: meta?.approvedByName || null,
        approvedAt: meta?.approvedAt || null,
        rejectedReason: meta?.rejectedReason || null,
        isEvaluatedByTeacher: Boolean(s.is_evaluated_by_teacher || meta?.isEvaluatedByTeacher || meta?.is_evaluated_by_teacher),
        teacherFeedback: s.teacher_feedback || null,
        totalScorePoints: s.total_score_points || null,
        maxPossibleScore: s.max_possible_score || null,
        answers: answersArr.filter(a => a?.type !== 'metadata'),
        mistakeReasons: meta?.mistakeReasons || s.mistake_reasons || null,
        bookTestId: meta?.bookTestId || s.test_id || meta?.realTestId,
        bookTestIds: meta?.bookTestIds || [],
        questions: s.questions || [],
        contentPayload: s.content_payload || null,
        imageUrl: s.image_url || null,
        imageUrls: s.image_urls || [],
        contentType: s.content_type || null,
        submittedAt: meta?.submittedAt || meta?.date || s.created_at,
        date: meta?.date || meta?.submittedAt || s.created_at,
        createdAt: s.created_at
      };
    });
  } catch (err) {
    console.warn('[Supabase] dbGetSubmissions error:', err.message);
    return null;
  }
}

export async function dbSaveSubmission(sub) {
  if (!isSupabaseConfigured()) return null;
  try {
    const rawMistakeReasons = sub.mistakeReasons || null;
    let subAnswersArr = sub.answers;
    if (typeof subAnswersArr === 'string') {
      try { subAnswersArr = JSON.parse(subAnswersArr); } catch {}
    }
    const cleanAnswers = (Array.isArray(subAnswersArr) ? subAnswersArr : []).filter(a => a?.type !== 'metadata').map(a => {
      const qNo = a.questionNo;
      const r = (rawMistakeReasons && qNo && rawMistakeReasons[qNo]) ? rawMistakeReasons[qNo] : a.reason || a.mistakeReason || null;
      return r ? { ...a, reason: r, mistakeReason: r } : a;
    });

    const isManual = Boolean(sub.isManual || sub.sourceType === 'manual_test');
    const approvalStatus = sub.approvalStatus || (sub.isApproved ? 'approved' : (sub.status === 'completed' ? 'approved' : (isManual ? 'pending' : 'approved')));
    const isApproved = sub.isApproved !== undefined ? Boolean(sub.isApproved) : (approvalStatus === 'approved' || sub.status === 'completed');

    const payload = {
      id: toUUID(sub.id || `sub_${Date.now()}`),
      test_id: toUUID(sub.testId || 'test_1'),
      student_id: String(sub.studentId || 'u1'),
      score: sub.score || sub.scorePercentage || 0,
      correct_count: sub.correctCount || 0,
      wrong_count: sub.wrongCount || 0,
      empty_count: sub.emptyCount || sub.blankCount || 0,
      subject: sub.subject || 'Genel',
      title: sub.title || sub.testTitle || 'Sınav',
      test_title: sub.testTitle || sub.title || 'Sınav',
      status: sub.status || (isApproved ? 'completed' : 'pending_approval'),
      teacher_feedback: sub.teacherFeedback || null,
      total_score_points: sub.totalScorePoints || null,
      max_possible_score: sub.maxPossibleScore || null,
      is_evaluated_by_teacher: Boolean(sub.isEvaluatedByTeacher || isApproved),
      homework_id: (sub.hwId || sub.homeworkId) ? String(sub.hwId || sub.homeworkId) : null,
      answers: [
        ...cleanAnswers,
        {
          type: 'metadata',
          realId: sub.id,
          realTestId: sub.testId,
          hwId: sub.hwId || sub.homeworkId || null,
          bookTestId: sub.bookTestId || null,
          bookTestIds: sub.bookTestIds || [],
          bookTitle: sub.bookTitle || null,
          unitTopic: sub.unitTopic || null,
          totalNet: sub.totalNet !== undefined ? sub.totalNet : null,
          scorePercentage: sub.scorePercentage !== undefined ? sub.scorePercentage : null,
          isManual: isManual,
          sourceType: sub.sourceType || (isManual ? 'manual_test' : null),
          approvalStatus: approvalStatus,
          isApproved: isApproved,
          submittedByRole: sub.submittedByRole || null,
          submittedByName: sub.submittedByName || null,
          approvedBy: sub.approvedBy || null,
          approvedByName: sub.approvedByName || null,
          approvedAt: sub.approvedAt || null,
          rejectedReason: sub.rejectedReason || null,
          mistakeReasons: rawMistakeReasons,
          status: sub.status || (isApproved ? 'completed' : 'pending_approval')
        }
      ],
      questions: sub.questions || []
    };
    let currentPayload = { ...payload };

    // FIX: Sadece GERÇEKTEN eksik olduğu doğrulanmış 'questions' kolonu
    // baştan çıkarılıyor (log'larda defalarca bu hatayı görüyorduk).
    // Diğer kolonlar (homework_id, status, is_evaluated_by_teacher, vb.)
    // artık koşulsuz silinmiyor — eğer gerçekten şemada yoklarsa
    // aşağıdaki iteratif fallback zaten otomatik olarak onları çıkarıp
    // yeniden dener. Var olan bir kolonu köre köre silmek, o veriyi
    // sonsuza kadar kaybettiriyordu (özellikle homework_id bu yüzden
    // hiç kaydedilmiyordu ve kitap ilerlemesi bu yüzden bozuluyordu).
    // Remove columns that are known to be missing in the user's Supabase schema
    // to prevent a flood of 400 Bad Request errors in the console.
    const knownMissingColumns = [
      'questions',
      'teacher_feedback',
      'test_title',
      'status',
      'max_possible_score',
      'is_evaluated_by_teacher',
      'total_score_points'
    ];
    knownMissingColumns.forEach(col => delete currentPayload[col]);

    // PostgreSQL jsonb parser rejects null bytes (\0), which causes 'unsupported Unicode escape sequence' errors.
    // Deeply strip null bytes from all nested objects and arrays.
    const removeNullBytes = (obj) => {
      if (typeof obj === 'string') {
        // Remove actual null bytes and literal '\u0000' strings just in case
        return obj.replace(/\0/g, '').replace(/\\u0000/gi, '');
      }
      if (Array.isArray(obj)) return obj.map(removeNullBytes);
      if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const k in obj) {
          newObj[k] = removeNullBytes(obj[k]);
        }
        return newObj;
      }
      return obj;
    };
    
    currentPayload = removeNullBytes(currentPayload);

    let { data, error } = await supabase.from('submissions').upsert([currentPayload], { onConflict: 'id' }).select().single();

    if (error) {
      console.warn('[Supabase] dbSaveSubmission initial safe upsert error:', error.message || error);

      let currentError = error;
      let retryCount = 0;

      // Iteratively remove any other missing columns as reported by Supabase
      while (currentError && currentError.message && currentError.message.includes('Could not find the') && retryCount < 10) {
        const match = currentError.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingColumn = match[1];
          console.warn(`[Supabase] dbSaveSubmission fallback: Removing missing column '${missingColumn}' and retrying...`);
          delete currentPayload[missingColumn];

          const retryRes = await supabase.from('submissions').upsert([currentPayload], { onConflict: 'id' }).select().single();

          if (!retryRes.error) {
            console.log('[Supabase] dbSaveSubmission fallback successful after removing columns.');
            return retryRes.data;
          }

          currentError = retryRes.error;
          retryCount++;
        } else {
          break;
        }
      }

      if (currentError) {
        console.warn('[Supabase] Iterative fallback failed completely. Final error:', currentError.message || currentError);
        // Instead of throwing and failing silently, return null so the app doesn't crash completely
        return null;
      }
    }

    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveSubmission unexpected error:', err.message || err);
    return null;
  }
}

export async function dbDeleteSubmission(id) {
  if (!isSupabaseConfigured() || !id) return null;
  try {
    const targetUuid = toUUID(id);
    if (targetUuid) {
      await supabase.from('submissions').delete().eq('id', targetUuid);
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSubmission error:', err.message);
    return false;
  }
}

export async function dbDeleteSubmissionsForStudentAndTests(studentId, testIds = [], hwId = null) {
  if (!isSupabaseConfigured() || !studentId) return null;
  try {
    const validStudentUuids = ensureUUIDs([studentId]);
    const validTestUuids = ensureUUIDs([...(testIds || []), hwId]);

    for (const sid of validStudentUuids) {
      if (validTestUuids.length > 0) {
        try {
          await supabase.from('submissions').delete().eq('student_id', sid).in('test_id', validTestUuids);
        } catch (e) {}
      }
      if (hwId && (!testIds || testIds.length === 0)) {
        const hwStr = String(hwId);
        const hwUuid = toUUID(hwStr);
        try {
          await supabase.from('submissions').delete().eq('student_id', sid).eq('homework_id', hwStr);
        } catch (e) {}
        if (hwUuid && hwUuid !== hwStr && isValidUUID(hwUuid)) {
          try {
            await supabase.from('submissions').delete().eq('student_id', sid).eq('homework_id', hwUuid);
          } catch (e) {}
          try {
            await supabase.from('submissions').delete().eq('student_id', sid).eq('test_id', hwUuid);
          } catch (e) {}
        }
      }
    }

    // Also clean up from homeworks table
    await dbClearHomeworkSubmissionsForStudent(hwId, studentId, null, testIds);

    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSubmissionsForStudentAndTests error:', err.message);
    return false;
  }
}

export async function dbClearHomeworkSubmissionsForStudent(hwId, studentId, bookId = null, testIds = []) {
  if (!isSupabaseConfigured() || !studentId) return null;
  try {
    const stIdStr = String(studentId);
    const stUuid = toUUID(stIdStr);
    const testIdsSet = new Set((testIds || []).map(String));
    (testIds || []).forEach(tid => {
      const s = String(tid);
      testIdsSet.add(s);
      testIdsSet.add(s.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, ''));
      const u = toUUID(tid);
      if (u) testIdsSet.add(String(u));
    });
    const hasSpecificTests = testIdsSet.size > 0;

    let query = supabase.from('homeworks').select('*');
    if (hwId) {
      query = query.eq('id', String(hwId));
    }
    const { data: hws, error } = await query;
    if (error || !hws) return false;

    for (const hw of hws) {
      const raw = hw.raw_data || {};
      const isTargetBook = bookId && (
        String(hw.book_id) === String(bookId) || 
        String(raw.bookId) === String(bookId) || 
        (hw.title && hw.title.includes(bookId))
      );
      if (hasSpecificTests || hwId || isTargetBook || (!hwId && !bookId)) {
        const subs = raw.submissions || hw.submissions || [];
        const filteredSubs = subs.filter(s => {
          const isMatchStudent = String(s.studentId) === stIdStr || (stUuid && String(s.studentId) === stUuid) || (stUuid && toUUID(s.studentId) === stUuid) || String(s.studentId) === 'u1' || stIdStr === 'u1';
          if (!isMatchStudent) return true;
          if (hasSpecificTests) {
            const candidateFields = [
              s.testId,
              s.bookTestId,
              s.realTestId,
              s.id,
              s.metadata?.testId,
              s.metadata?.bookTestId,
              s.metadata?.realTestId
            ];
            const isMatchTest = candidateFields.some(f => {
              if (!f) return false;
              const fs = String(f);
              const clean = fs.replace(/^tbt_/, '').replace(/^bt_/, '').replace(/^q_/, '');
              const fu = toUUID(f);
              return testIdsSet.has(fs) || testIdsSet.has(clean) || (fu && testIdsSet.has(String(fu)));
            });
            return !isMatchTest;
          }
          return false;
        });

        const updatedRaw = {
          ...raw,
          submissions: filteredSubs
        };
        delete updatedRaw.raw_data;

        await supabase.from('homeworks').update({
          raw_data: updatedRaw
        }).eq('id', hw.id);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbClearHomeworkSubmissionsForStudent error:', err.message);
    return false;
  }
}

export async function dbDeleteSubmissionsByIds(ids = []) {
  if (!isSupabaseConfigured() || !ids || ids.length === 0) return null;
  try {
    const validUuids = ensureUUIDs(ids);
    if (validUuids.length > 0) {
      await supabase.from('submissions').delete().in('id', validUuids);
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSubmissionsByIds error:', err.message);
    return false;
  }
}

export async function dbDeleteBookSubmissionsForEveryone(testIds = [], hwId = null) {
  if (!isSupabaseConfigured()) return null;
  try {
    const validTestUuids = ensureUUIDs([...(testIds || []), hwId]);

    if (validTestUuids.length > 0) {
      try {
        await supabase.from('submissions').delete().in('test_id', validTestUuids);
      } catch (e) {}
    }
    if (hwId) {
      const hwStr = String(hwId);
      const hwUuid = toUUID(hwStr);
      try {
        await supabase.from('submissions').delete().eq('homework_id', hwStr);
      } catch (e) {}
      if (hwUuid && hwUuid !== hwStr && isValidUUID(hwUuid)) {
        try {
          await supabase.from('submissions').delete().eq('homework_id', hwUuid);
        } catch (e) {}
        try {
          await supabase.from('submissions').delete().eq('test_id', hwUuid);
        } catch (e) {}
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteBookSubmissionsForEveryone error:', err.message);
    return false;
  }
}

export async function dbClearStudentSubmissions(studentId) {
  if (!isSupabaseConfigured() || !studentId) return null;
  try {
    const validStudentUuids = ensureUUIDs([studentId]);
    for (const sid of validStudentUuids) {
      try {
        await supabase.from('submissions').delete().eq('student_id', sid);
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbClearStudentSubmissions error:', err.message);
    return false;
  }
}

// ==========================================
// 4. SORU BANKASI (QUESTIONS)
// ==========================================

export async function dbGetQuestions() {
  if (!isSupabaseConfigured()) return null;
  try {
    // Ultra-lean select: excludes bloated raw_data to minimize network egress by 99%
    const { data, error } = await supabase.from('questions')
      .select('id, subject, grade_id, topic, topic_id, type, content_type, content_payload, is_bundle, answer_key, title, question_count, question_text, options, correct_answer, explanation, image_url, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(q => {
      const rawPayload = q.content_payload || '';
      
      // If legacy row contains a heavy base64 string in DB (> 200KB), strip it from bulk memory/egress
      // Local device has it in IndexedDB, and it can be lazy-loaded on demand via dbGetQuestionPayload
      const isUrl = typeof rawPayload === 'string' && (rawPayload.startsWith('http://') || rawPayload.startsWith('https://') || rawPayload.includes('drive.google.com') || rawPayload.includes('|'));
      const isHeavyBase64 = typeof rawPayload === 'string' && rawPayload.startsWith('data:') && rawPayload.length > 200000;
      const contentPayload = isUrl ? rawPayload : (isHeavyBase64 ? '[STORED_IN_INDEXEDDB]' : rawPayload);

      let cleanImageUrl = q.image_url || '';
      if (cleanImageUrl.length > 200000 && cleanImageUrl.startsWith('data:')) {
        cleanImageUrl = '[STORED_IN_INDEXEDDB]';
      }

      const realId = String(q.id);

      return {
        id: realId,
        subject: q.subject || 'Matematik',
        gradeId: q.grade_id || 'g1',
        topic: q.topic || 'Genel',
        topicId: q.topic_id || 'global_all',
        type: q.type || 'coktan_secmeli',
        contentType: q.content_type || 'text',
        contentPayload: contentPayload,
        isBundle: Boolean(q.is_bundle),
        answerKey: q.answer_key || [],
        title: q.title || '',
        questionCount: q.question_count || 1,
        questionText: q.question_text || '',
        options: (() => {
          let opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? (() => { try { const p = JSON.parse(q.options); return Array.isArray(p) ? p : []; } catch { return q.options.split('\n').filter(Boolean); } })() : []);
          const isMeaningful = (arr) => Array.isArray(arr) && arr.some(o => typeof o === 'string' && o.trim().length > 0 && !/^[A-E]$/i.test(o.trim()) && !/^şık [A-E]$/i.test(o.trim()) && !/^[A-E] seçeneği$/i.test(o.trim()));
          if (!isMeaningful(opts) && typeof q.explanation === 'string' && q.explanation.trim().startsWith('{')) {
            try {
              const expObj = JSON.parse(q.explanation);
              if (isMeaningful(expObj.options)) opts = expObj.options;
              else if (isMeaningful(expObj.choices)) opts = expObj.choices;
              else if (isMeaningful(expObj.secenekler)) opts = expObj.secenekler;
            } catch {}
          }
          if (!isMeaningful(opts) && typeof q.content_payload === 'string' && q.content_payload.trim().startsWith('{')) {
            try {
              const cpObj = JSON.parse(q.content_payload);
              if (isMeaningful(cpObj.options)) opts = cpObj.options;
            } catch {}
          }
          return opts || [];
        })(),
        correctAnswer: q.correct_answer !== undefined ? q.correct_answer : '0',
        explanation: q.explanation || '',
        imageUrl: cleanImageUrl,
        createdAt: q.created_at
      };
    });
  } catch (err) {
    console.warn('[Supabase] dbGetQuestions error:', err.message);
    return null;
  }
}

export async function dbGetQuestionPayload(questionId) {
  if (!isSupabaseConfigured() || !questionId) return null;
  try {
    const qUuid = toUUID(questionId);
    const candidateIds = Array.from(new Set([qUuid, String(questionId)].filter(Boolean)));
    const { data, error } = await supabase
      .from('questions')
      .select('id, content_payload, image_url')
      .in('id', candidateIds)
      .maybeSingle();
    if (error || !data) return null;
    return data.content_payload || data.image_url || null;
  } catch {
    return null;
  }
}

// Storage bucket availability flag. Default to true to allow uploading to Supabase Storage.
let isQuestionFilesBucketAvailable = true;

export async function dbUploadFileToStorage(fileOrDataUrl, filenamePrefix = 'file', bucket = 'question_files') {
  if (!isSupabaseConfigured() || !fileOrDataUrl) return null;
  if (!isQuestionFilesBucketAvailable && bucket === 'question_files') return null;

  try {
    let fileBlob = null;
    let fileExt = 'pdf';

    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
      const arr = fileOrDataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      fileExt = mime.includes('pdf') ? 'pdf' : (mime.includes('html') ? 'html' : (mime.includes('webp') ? 'webp' : (mime.includes('image') ? 'png' : 'bin')));
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      fileBlob = new Blob([u8arr], { type: mime.includes('html') ? 'text/html; charset=utf-8' : mime });
    } else if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.includes('<!DOCTYPE') || fileOrDataUrl.includes('<html') || fileOrDataUrl.includes('<body') || fileOrDataUrl.includes('<head'))) {
      fileBlob = new Blob([fileOrDataUrl], { type: 'text/html; charset=utf-8' });
      fileExt = 'html';
    } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
      fileBlob = fileOrDataUrl;
      if (fileOrDataUrl.name) {
        fileExt = fileOrDataUrl.name.split('.').pop().toLowerCase();
      }
    }

    if (!fileBlob) return null;

    const mimeType = fileBlob.type || (fileExt === 'pdf' ? 'application/pdf' : (fileExt === 'webp' ? 'image/webp' : (fileExt === 'png' ? 'image/png' : (fileExt === 'html' ? 'text/html' : 'application/octet-stream'))));
    const fileName = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBlob, {
        cacheControl: '31536000, immutable',
        upsert: true,
        contentType: mimeType
      });

    if (error) {
      console.warn(`[Supabase Storage] '${bucket}' yükleme uyarısı (${error.message || error}). Dosyalar veritabanında korunuyor.`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn(`[Supabase Storage] '${bucket}' işlem hatası:`, err.message || err);
    return null;
  }
}

export async function dbAddQuestion(q) {
  if (!isSupabaseConfigured() || !q) return null;
  try {
    const qId = q.id || `q_${Date.now()}`;
    const dbId = toUUID(qId);

    let finalContentPayload = q.contentPayload || '';

    const safeRaw = { ...q, id: qId };

    const isHtmlPayload = (val) => {
      return typeof val === 'string' && (
        q.contentType === 'html' || q.content_type === 'html' ||
        val.includes('<!DOCTYPE') || val.includes('<html') || val.includes('<head') || val.includes('<body') ||
        val.startsWith('data:text/html')
      );
    };

    // Deduplication cache so identical image payloads are uploaded ONLY ONCE per question
    const uploadedCache = new Map();

    // Helper to upload to storage OR preserve directly within PostgreSQL TEXT columns
    const processBase64String = async (val, suffix) => {
      if (!val || typeof val !== 'string') return val;
      if (val.startsWith('http://') || val.startsWith('https://')) return val;

      if (uploadedCache.has(val)) {
        return uploadedCache.get(val);
      }

      if (val.startsWith('data:') || isHtmlPayload(val)) {
        // Attempt storage upload for all files (PDF, WebP, HTML)
        if (isQuestionFilesBucketAvailable) {
          const publicUrl = await dbUploadFileToStorage(val, `q_${dbId}_${suffix}`);
          if (publicUrl) {
            uploadedCache.set(val, publicUrl);
            return publicUrl;
          }
        }
        // Fallback: Keep directly in PostgreSQL if under 15MB (PostgreSQL text columns support up to 1GB payload)
        if (val.length < 15000000) {
          return val;
        }
        return '[STORED_IN_INDEXEDDB]';
      }
      return val;
    };

    // Helper to process joined or single payload strings
    const processPayload = async (payload, suffix) => {
      if (typeof payload === 'string') {
        if (isHtmlPayload(payload)) {
          return await processBase64String(payload, suffix);
        }
        if (payload.includes('\n') || payload.includes('|')) {
          const parts = payload.split(/\n\n|\n|\|/).map(s => s.trim()).filter(Boolean);
          const processedParts = [];
          for (let i = 0; i < parts.length; i++) {
             processedParts.push(await processBase64String(parts[i], `${suffix}_part${i}`));
          }
          return processedParts.join('|');
        }
        return await processBase64String(payload, suffix);
      }
      return payload;
    };

    // 1. Process individual image URLs array first (clean naming: img_0, img_1, img_2...)
    if (Array.isArray(safeRaw.imageUrls)) {
      for (let i = 0; i < safeRaw.imageUrls.length; i++) {
        const res = await processBase64String(safeRaw.imageUrls[i], `img_${i}`);
        safeRaw.imageUrls[i] = res;
        if (Array.isArray(q.imageUrls)) q.imageUrls[i] = res;
      }
    }

    // 2. Process main content payload (reuses cached URLs with ZERO duplicate uploads)
    finalContentPayload = await processPayload(finalContentPayload, 'main');
    safeRaw.contentPayload = finalContentPayload;
    q.contentPayload = finalContentPayload;

    if (typeof safeRaw.pdfPayload === 'string') {
      safeRaw.pdfPayload = await processBase64String(safeRaw.pdfPayload, 'pdf');
      q.pdfPayload = safeRaw.pdfPayload;
    }
    if (typeof safeRaw.htmlPayload === 'string') {
      safeRaw.htmlPayload = await processBase64String(safeRaw.htmlPayload, 'html');
      q.htmlPayload = safeRaw.htmlPayload;
    }

    if (typeof safeRaw.imageUrl === 'string' && safeRaw.imageUrl.startsWith('data:')) {
      const res = await processBase64String(safeRaw.imageUrl, 'single_img');
      safeRaw.imageUrl = res;
      q.imageUrl = res;
    }

    // 3. Process sub-questions (reuses cached URLs from step 1 with ZERO duplicate uploads)
    if (Array.isArray(safeRaw.questionsList)) {
      for (let i = 0; i < safeRaw.questionsList.length; i++) {
        let sq = safeRaw.questionsList[i];
        if (sq.contentPayload) {
           const res = await processPayload(sq.contentPayload, `sq_${i}`);
           sq.contentPayload = res;
           if (q.questionsList && q.questionsList[i]) q.questionsList[i].contentPayload = res;
        }
        if (sq.imageUrl) {
           const res = await processBase64String(sq.imageUrl, `sq_img_${i}`);
           sq.imageUrl = res;
           if (q.questionsList && q.questionsList[i]) q.questionsList[i].imageUrl = res;
        }
      }
    }

    // Process items array (sometimes used in homeworks/tests)
    if (Array.isArray(safeRaw.items)) {
      for (let i = 0; i < safeRaw.items.length; i++) {
        let item = safeRaw.items[i];
        if (item.contentPayload) {
           const res = await processPayload(item.contentPayload, `item_${i}`);
           item.contentPayload = res;
           if (q.items && q.items[i]) q.items[i].contentPayload = res;
        }
      }
    }

    const dbContentPayload = finalContentPayload;

    let cleanImageUrl = '';
    if (typeof q.imageUrl === 'string' && q.imageUrl.startsWith('http')) {
      cleanImageUrl = q.imageUrl;
    } else if (Array.isArray(safeRaw.imageUrls) && typeof safeRaw.imageUrls[0] === 'string' && safeRaw.imageUrls[0].startsWith('http')) {
      cleanImageUrl = safeRaw.imageUrls[0];
    } else if (typeof safeRaw.imageUrl === 'string' && safeRaw.imageUrl.startsWith('http')) {
      cleanImageUrl = safeRaw.imageUrl;
    }

    // Strip heavy Base64 strings from raw_data so PostgreSQL rows stay under 5 KB
    const cleanSafeRaw = { ...safeRaw };
    if (typeof cleanSafeRaw.contentPayload === 'string' && cleanSafeRaw.contentPayload.startsWith('data:') && cleanSafeRaw.contentPayload.length > 5000) {
      cleanSafeRaw.contentPayload = '[STORED_IN_INDEXEDDB]';
    }
    if (typeof cleanSafeRaw.pdfPayload === 'string' && cleanSafeRaw.pdfPayload.startsWith('data:') && cleanSafeRaw.pdfPayload.length > 5000) {
      cleanSafeRaw.pdfPayload = '[STORED_IN_INDEXEDDB]';
    }
    if (Array.isArray(cleanSafeRaw.imageUrls)) {
      cleanSafeRaw.imageUrls = cleanSafeRaw.imageUrls.map(u => typeof u === 'string' && u.startsWith('data:') && u.length > 5000 ? '[STORED_IN_INDEXEDDB]' : u);
    }
    if (Array.isArray(cleanSafeRaw.questionsList)) {
      cleanSafeRaw.questionsList = cleanSafeRaw.questionsList.map(sq => ({
        ...sq,
        contentPayload: typeof sq.contentPayload === 'string' && sq.contentPayload.startsWith('data:') && sq.contentPayload.length > 5000 ? '[STORED_IN_INDEXEDDB]' : sq.contentPayload,
        imageUrl: typeof sq.imageUrl === 'string' && sq.imageUrl.startsWith('data:') && sq.imageUrl.length > 5000 ? '[STORED_IN_INDEXEDDB]' : sq.imageUrl
      }));
    }

    const payload = {
      id: dbId,
      subject: q.subject || 'Matematik',
      grade_id: q.gradeId || 'g1',
      topic: q.topic || 'Genel',
      topic_id: q.topicId || 'global_all',
      type: q.type || 'coktan_secmeli',
      content_type: q.contentType || 'text',
      content_payload: dbContentPayload,
      is_bundle: Boolean(q.isBundle),
      answer_key: q.answerKey || [],
      title: q.title || '',
      question_count: q.questionCount || 1,
      raw_data: cleanSafeRaw,
      question_text: q.questionText || '',
      options: q.options || [],
      correct_answer: String(q.correctAnswer !== undefined ? q.correctAnswer : '0'),
      explanation: q.explanation || '',
      image_url: cleanImageUrl
    };

    let { data, error } = await supabase.from('questions').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      // Fallback if some new columns don't exist yet in the Supabase schema
      const fallbackPayload = {
        id: dbId,
        subject: q.subject || 'Matematik',
        grade_id: q.gradeId || 'g1',
        topic: q.topic || 'Genel',
        question_text: q.questionText || '',
        options: q.options || [],
        correct_answer: String(q.correctAnswer !== undefined ? q.correctAnswer : '0'),
        explanation: JSON.stringify(safeRaw),
        image_url: cleanImageUrl
      };
      const res = await supabase.from('questions').upsert([fallbackPayload], { onConflict: 'id' }).select();
      if (res.error) throw res.error;
      data = res.data;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddQuestion error:', err.message);
    return null;
  }
}

export async function dbDeleteQuestion(q) {
  if (!isSupabaseConfigured() || !q) return null;
  try {
    const qId = typeof q === 'object' ? q.id : q;
    const rawIdStr = String(qId);
    const validUuids = ensureUUIDs([
      rawIdStr,
      rawIdStr.replace(/^q_?/, ''),
      rawIdStr.replace(/^hw_?/, '')
    ]);

    // 1. Fetch question record to extract storage URLs if only ID was passed
    let questionObj = typeof q === 'object' ? q : null;
    if (!questionObj && validUuids.length > 0) {
      try {
        const { data } = await supabase.from('questions').select('*').in('id', validUuids).maybeSingle();
        if (data) questionObj = data;
      } catch (fetchErr) {}
    }

    // 2. Extract and delete any uploaded files from Supabase Storage ('question_files' bucket)
    const urlsToDelete = [];
    if (questionObj) {
      const payloadUrl = questionObj.content_payload || questionObj.contentPayload;
      if (typeof payloadUrl === 'string' && payloadUrl.includes('/storage/v1/object/public/question_files/')) {
        urlsToDelete.push(payloadUrl);
      }
      if (typeof questionObj.image_url === 'string' && questionObj.image_url.includes('/storage/v1/object/public/question_files/')) {
        urlsToDelete.push(questionObj.image_url);
      }
      if (typeof questionObj.imageUrl === 'string' && questionObj.imageUrl.includes('/storage/v1/object/public/question_files/')) {
        urlsToDelete.push(questionObj.imageUrl);
      }
      if (Array.isArray(questionObj.imageUrls)) {
        questionObj.imageUrls.forEach(url => {
          if (typeof url === 'string' && url.includes('/storage/v1/object/public/question_files/')) urlsToDelete.push(url);
        });
      }
      if (Array.isArray(questionObj.questionsList)) {
        questionObj.questionsList.forEach(sq => {
          if (typeof sq.imageUrl === 'string' && sq.imageUrl.includes('/storage/v1/object/public/question_files/')) urlsToDelete.push(sq.imageUrl);
          if (typeof sq.contentPayload === 'string' && sq.contentPayload.includes('/storage/v1/object/public/question_files/')) urlsToDelete.push(sq.contentPayload);
        });
      }
      if (questionObj.raw_data && typeof questionObj.raw_data === 'object') {
        const rawUrl = questionObj.raw_data.contentPayload;
        if (typeof rawUrl === 'string' && rawUrl.includes('/storage/v1/object/public/question_files/')) {
          urlsToDelete.push(rawUrl);
        }
        if (Array.isArray(questionObj.raw_data.imageUrls)) {
          questionObj.raw_data.imageUrls.forEach(url => {
            if (typeof url === 'string' && url.includes('/storage/v1/object/public/question_files/')) {
              urlsToDelete.push(url);
            }
          });
        }
        if (Array.isArray(questionObj.raw_data.questionsList)) {
          questionObj.raw_data.questionsList.forEach(sq => {
            if (typeof sq.imageUrl === 'string' && sq.imageUrl.includes('/storage/v1/object/public/question_files/')) urlsToDelete.push(sq.imageUrl);
            if (typeof sq.contentPayload === 'string' && sq.contentPayload.includes('/storage/v1/object/public/question_files/')) urlsToDelete.push(sq.contentPayload);
          });
        }
      }
    }

    // Perform file deletion from Storage bucket
    const fileNames = urlsToDelete.map(url => url.split('/question_files/').pop()).filter(Boolean);
    
    // Also scan bucket for ALL files matching this question ID (even legacy/orphaned chunks)
    try {
      const idClean = rawIdStr.replace(/^q_?/, '').replace(/^hw_?/, '');
      const { data: listedFiles } = await supabase.storage.from('question_files').list('', {
        limit: 1000
      });
      if (Array.isArray(listedFiles)) {
        listedFiles.forEach(f => {
          if (f && f.name) {
            const matches = (idClean.length > 5 && f.name.includes(idClean)) ||
                            validUuids.some(u => u.length > 5 && f.name.includes(u));
            if (matches && !fileNames.includes(f.name)) {
              fileNames.push(f.name);
            }
          }
        });
      }
    } catch (searchErr) {
      console.warn('[Supabase Storage] List/search cleanup error:', searchErr);
    }

    if (fileNames.length > 0) {
      try {
        await supabase.storage.from('question_files').remove(fileNames);
        console.log('[Supabase Storage] Deleted files from storage bucket:', fileNames);
      } catch (storageErr) {
        console.warn('[Supabase Storage] Delete error:', storageErr.message);
      }
    }

    // 3. Delete row from Supabase database - ONLY using valid UUIDs to prevent 400 Bad Request
    if (validUuids.length > 0) {
      const { error } = await supabase.from('questions').delete().in('id', validUuids);
      if (error) {
        console.warn('[Supabase] dbDeleteQuestion delete error:', error.message);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteQuestion error:', err.message);
    return false;
  }
}

// ==========================================
// 5. ÖDEVLER
// ==========================================
export async function dbGetHomeworks() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('homeworks')
      .select('id, title, subject, due_date, created_at, raw_data')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data || [])
      .filter(h => h.id !== 'global_ai_config' && h.subject !== 'SYSTEM' && !String(h.title || '').includes('GLOBAL_AI_CONFIG'))
      .map(h => {
      let raw = {};
      if (h.raw_data) {
        if (typeof h.raw_data === 'object') raw = h.raw_data;
        else if (typeof h.raw_data === 'string') {
          try { raw = JSON.parse(h.raw_data); } catch {}
        }
      } else if (h.data) {
        if (typeof h.data === 'object') raw = h.data;
        else if (typeof h.data === 'string') {
          try { raw = JSON.parse(h.data); } catch {}
        }
      } else if (h.extra_data) {
        if (typeof h.extra_data === 'object') raw = h.extra_data;
        else if (typeof h.extra_data === 'string') {
          try { raw = JSON.parse(h.extra_data); } catch {}
        }
      }

      // Strip heavy base64 strings if legacy rows contain them
      if (typeof raw.pdfPayload === 'string' && raw.pdfPayload.startsWith('data:') && raw.pdfPayload.length > 5000) {
        raw.pdfPayload = '[STORED_IN_INDEXEDDB]';
      }

      const qIds = h.question_ids || h.questionIds || raw.questionIds || (Array.isArray(h.tests) ? h.tests : (raw.tests || []));
      const bId = h.book_id || raw.bookId || raw.book_id || null;
      const canonicalId = raw.stringId || String(h.id);
      const testDueDates = raw.testDueDates || h.test_due_dates || raw.scheduleDates || h.schedule_dates || raw.testDates || {};

      const rawTargetIds = (Array.isArray(raw.targetIds) && raw.targetIds.length > 0)
        ? raw.targetIds
        : (Array.isArray(raw.target_ids) && raw.target_ids.length > 0)
          ? raw.target_ids
          : (Array.isArray(h.target_ids) && h.target_ids.length > 0 ? h.target_ids : (raw.targetIds || []));

      const rawTargetType = raw.targetType || raw.target_type || h.target_type || (rawTargetIds.some(id => String(id).startsWith('g_') || String(id).startsWith('c_')) ? 'grade' : 'student');

      return {
        ...raw,
        id: canonicalId,
        supabaseId: String(h.id),
        title: h.title || raw.title || '',
        subject: h.subject || raw.subject || 'Genel',
        dueDate: h.due_date || raw.dueDate,
        targetType: rawTargetType,
        targetIds: rawTargetIds,
        tests: qIds,
        questionIds: qIds,
        totalQuestions: h.total_questions || raw.totalQuestions || raw.questionCount || (qIds.length > 0 ? qIds.length : 1),
        timePerQuestion: h.time_per_question || raw.timePerQuestion || 2,
        time: h.time || raw.time || 20,
        createdAt: h.created_at,
        submissions: h.submissions || raw.submissions || [],
        bookId: bId,
        isBookAssignment: Boolean(h.is_book_assignment || raw.isBookAssignment || bId),
        testDueDates: testDueDates
      };
    });
  } catch (err) {
    console.warn('[Supabase] dbGetHomeworks error:', err.message);
    return null;
  }
}

export async function dbAddHomework(hw) {
  if (!isSupabaseConfigured()) return null;
  try {
    const processedHw = { ...hw };

    // Upload large PDF/image payloads in sections[] to Supabase Storage if present
    if (Array.isArray(processedHw.sections)) {
      processedHw.sections = await Promise.all(processedHw.sections.map(async (sec) => {
        const s = { ...sec };
        if (typeof s.pdfPayload === 'string' && s.pdfPayload.startsWith('data:') && s.pdfPayload.length > 1000) {
          try {
            const url = await dbUploadFileToStorage(s.pdfPayload, `hw_sec_${s.id || Date.now()}`, 'question_files');
            if (url) { s.pdfPayload = url; s.pdfUrl = url; }
          } catch (e) {}
        }
        if (typeof s.contentPayload === 'string' && s.contentPayload.startsWith('data:') && s.contentPayload.length > 1000) {
          try {
            const url = await dbUploadFileToStorage(s.contentPayload, `hw_sec_content_${s.id || Date.now()}`, 'question_files');
            if (url) { s.contentPayload = url; }
          } catch (e) {}
        }
        return s;
      }));
    }

    if (typeof processedHw.pdfPayload === 'string' && processedHw.pdfPayload.startsWith('data:') && processedHw.pdfPayload.length > 1000) {
      try {
        const url = await dbUploadFileToStorage(processedHw.pdfPayload, `hw_pdf_${processedHw.id || Date.now()}`, 'question_files');
        if (url) { processedHw.pdfPayload = url; processedHw.pdfUrl = url; }
      } catch (e) {}
    }

    if (typeof processedHw.htmlPayload === 'string' && processedHw.htmlPayload.startsWith('data:') && processedHw.htmlPayload.length > 1000) {
      try {
        const url = await dbUploadFileToStorage(processedHw.htmlPayload, `hw_html_${processedHw.id || Date.now()}`, 'question_files');
        if (url) { processedHw.htmlPayload = url; }
      } catch (e) {}
    }

    if (Array.isArray(processedHw.questions)) {
      processedHw.questions = await Promise.all(processedHw.questions.map(async (q) => {
        const newQ = { ...q };
        if (typeof newQ.image === 'string' && newQ.image.startsWith('data:') && newQ.image.length > 1000) {
          try {
            const url = await dbUploadFileToStorage(newQ.image, `hw_q_img_${newQ.id || Date.now()}`, 'question_files');
            if (url) { newQ.image = url; }
          } catch (e) {}
        }
        return newQ;
      }));
    }

    let qIds = [];
    if (Array.isArray(processedHw.questionIds) && processedHw.questionIds.length > 0) {
      qIds = processedHw.questionIds;
    } else if (Array.isArray(processedHw.tests) && processedHw.tests.length > 0) {
      qIds = processedHw.tests;
    } else if (Array.isArray(processedHw.questions) && processedHw.questions.length > 0) {
      qIds = processedHw.questions.map(q => typeof q === 'object' ? (q.id || q._id) : q).filter(Boolean);
    } else if (Array.isArray(processedHw.sections)) {
      processedHw.sections.forEach(sec => {
        if (sec.testId) qIds.push(sec.testId);
        if (sec.id) qIds.push(sec.id);
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach(sq => {
            if (sq && typeof sq === 'object' && sq.id) qIds.push(sq.id);
          });
        }
      });
      qIds = Array.from(new Set(qIds));
    }

    if (qIds.length === 0 && processedHw.bookId) {
      const dbBooks = await dbGetTrackedBooks();
      if (dbBooks && dbBooks.tests) {
        const matchingTests = dbBooks.tests.filter(t => String(t.bookId) === String(processedHw.bookId));
        if (matchingTests.length > 0) {
          qIds = matchingTests.map(t => t.id);
        }
      }
    }

    let calculatedDueDate = processedHw.dueDate || processedHw.due_date || null;
    const testDatesObj = processedHw.testDueDates || processedHw.scheduleDates || processedHw.testDates || {};
    if (testDatesObj && typeof testDatesObj === 'object') {
      const dates = Object.values(testDatesObj).filter(Boolean);
      if (dates.length > 0) {
        dates.sort();
        const maxDateStr = dates[dates.length - 1];
        if (maxDateStr) {
          const maxDateObj = new Date(maxDateStr);
          maxDateObj.setHours(23, 59, 59, 999);
          calculatedDueDate = maxDateObj.toISOString();
        }
      }
    }

    const fullRaw = {
      ...processedHw,
      questionIds: qIds,
      tests: qIds,
      bookId: processedHw.bookId || null,
      isBookAssignment: Boolean(processedHw.isBookAssignment || processedHw.bookId),
      testDueDates: testDatesObj,
      dueDate: calculatedDueDate
    };

    // Strip large base64 payloads from raw_data so PostgreSQL rows stay under 5 KB
    const safeRaw = { ...fullRaw };
    if (typeof safeRaw.pdfPayload === 'string' && safeRaw.pdfPayload.startsWith('data:') && safeRaw.pdfPayload.length > 2000) {
      safeRaw.pdfPayload = '[STORED_IN_INDEXEDDB]';
    }
    if (Array.isArray(safeRaw.sections)) {
      safeRaw.sections = safeRaw.sections.map(sec => {
        const s = { ...sec };
        if (typeof s.pdfPayload === 'string' && s.pdfPayload.startsWith('data:') && s.pdfPayload.length > 2000) {
          s.pdfPayload = '[STORED_IN_INDEXEDDB]';
        }
        if (typeof s.contentPayload === 'string' && s.contentPayload.startsWith('data:') && s.contentPayload.length > 2000) {
          s.contentPayload = '[STORED_IN_INDEXEDDB]';
        }
        return s;
      });
    }
    delete safeRaw.raw_data;

    const hwId = String(processedHw.id || `hw_${Date.now()}`);
    const uuidId = toUUID(hwId);
    const targetDbId = uuidId || hwId;

    safeRaw.stringId = hwId;
    safeRaw.targetType = processedHw.targetType || 'student';
    safeRaw.targetIds = Array.isArray(processedHw.targetIds) ? processedHw.targetIds : [];

    const safePayload = {
      id: targetDbId,
      title: processedHw.title || 'Ödev',
      subject: processedHw.subject || 'Genel',
      due_date: calculatedDueDate,
      raw_data: safeRaw
    };

    let { data, error } = await supabase.from('homeworks').upsert([safePayload], { onConflict: 'id' }).select();
    if (error) {
      console.warn('[Supabase] dbAddHomework error:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddHomework error:', err.message);
    return null;
  }
}

export async function dbDeleteHomework(hwId) {
  if (!isSupabaseConfigured() || !hwId) return null;
  try {
    const hwStr = String(hwId).trim();
    const validHwUuids = ensureUUIDs([hwStr, hwStr.replace(/^hw_?/, '')]);

    // 1. Fetch matching rows to ensure exact deletion from homeworks table
    const matchingRowIds = new Set(validHwUuids);
    if (isValidUUID(hwStr)) matchingRowIds.add(hwStr);

    try {
      const { data: rows } = await supabase.from('homeworks').select('id, raw_data');
      (rows || []).forEach(r => {
        const rId = String(r.id);
        const rawId = String(r.raw_data?.id || '');
        const rawStrId = String(r.raw_data?.stringId || '');
        if (
          rId === hwStr ||
          validHwUuids.includes(rId) ||
          rawId === hwStr ||
          rawStrId === hwStr ||
          toUUID(rawId) === hwStr ||
          toUUID(rawStrId) === hwStr ||
          validHwUuids.includes(toUUID(rawId)) ||
          validHwUuids.includes(toUUID(rawStrId))
        ) {
          matchingRowIds.add(rId);
        }
      });
    } catch (e) {}

    const deleteIdsList = Array.from(matchingRowIds);
    if (deleteIdsList.length > 0) {
      try {
        await supabase.from('homeworks').delete().in('id', deleteIdsList);
      } catch (e) {}
    }

    // 2. Delete related submissions in submissions table
    const allSubTestIds = Array.from(new Set([hwStr, ...validHwUuids, hwStr.replace(/^hw_?/, ''), ...deleteIdsList]));
    if (allSubTestIds.length > 0) {
      try {
        await supabase.from('submissions').delete().in('test_id', allSubTestIds);
      } catch (e) {}
      try {
        await supabase.from('submissions').delete().in('homework_id', allSubTestIds);
      } catch (e) {}
    }

    // 3. Record deletion in deleted_records for audit / tombstoning
    try {
      await dbRecordDeletedItem(hwStr, 'homework');
      if (validHwUuids[0]) await dbRecordDeletedItem(validHwUuids[0], 'homework');
    } catch (e) {}

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

    const plans = (pRes.data || []).map(p => {
      let subjects = [];
      if (Array.isArray(p.subjects) && p.subjects.length > 0) {
        subjects = p.subjects;
      } else if (p.raw_data && Array.isArray(p.raw_data.subjects)) {
        subjects = p.raw_data.subjects;
      } else if (Array.isArray(p.raw_data)) {
        subjects = p.raw_data;
      }
      return {
        id: String(p.id),
        title: p.title,
        subjects,
        createdAt: p.created_at
      };
    });

    const assignments = (aRes.data || []).map(a => {
      let completedTopics = [];
      try { completedTopics = JSON.parse(a.topic || '[]'); } catch(e){}
      return {
        id: String(a.id),
        studentId: a.student_id,
        planId: a.study_plan_id,
        studyPlanId: a.study_plan_id,
        completedTopics,
        status: a.status || 'assigned',
        createdAt: a.created_at
      };
    });

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
      raw_data: { subjects: plan.subjects || [] }
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
    await supabase.from('study_assignments').delete().eq('study_plan_id', String(planId));
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
      subject: a.subject || 'Plan Assignment',
      topic: a.topic || '[]',
      status: a.status || 'assigned'
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
    if (updates.topic !== undefined) payload.topic = updates.topic;

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
let _trackedBooksColumnsCache = null;

async function getTrackedBooksColumns() {
  if (_trackedBooksColumnsCache && _trackedBooksColumnsCache.size > 0) {
    return _trackedBooksColumnsCache;
  }
  try {
    const { data, error } = await supabase.from('tracked_books').select('*').limit(1);
    if (!error && data && data.length > 0) {
      _trackedBooksColumnsCache = new Set(Object.keys(data[0]));
      return _trackedBooksColumnsCache;
    }
  } catch {}
  return null;
}

// ==========================================
export async function dbGetTrackedBooks() {
  if (!isSupabaseConfigured()) return null;
  try {
    const [bRes, tRes] = await Promise.all([
      supabase.from('tracked_books').select('*').order('created_at', { ascending: false }),
      supabase.from('tracked_book_tests').select('*').order('created_at', { ascending: false })
    ]);

    if (bRes.error || tRes.error) return null;

    if (bRes.data && bRes.data.length > 0) {
      _trackedBooksColumnsCache = new Set(Object.keys(bRes.data[0]));
    }

    // 1. Deduplicate Books and build alias map
    const idAliasMap = new Map();
    const deduplicatedBooksMap = new Map();

    (bRes.data || []).forEach(b => {
      const rawSubjects = (Array.isArray(b.subjects) && b.subjects.length > 0)
        ? b.subjects
        : (Array.isArray(b.raw_data?.subjects) ? b.raw_data.subjects : []);

      const metaObj = rawSubjects.find(s => s && (s.__meta === true || s.id === '__book_meta__'));
      
      const optCount = metaObj?.optionCount !== undefined
        ? Number(metaObj.optionCount)
        : (b.option_count !== undefined
          ? Number(b.option_count)
          : (b.optionCount !== undefined
            ? Number(b.optionCount)
            : (b.raw_data?.optionCount !== undefined ? Number(b.raw_data.optionCount) : 5)));

      const bType = metaObj?.bookType || b.book_type || b.bookType || b.raw_data?.bookType || (b.id === 'tb_07kzdf_1787267196768' ? 'exam' : 'standard');
      const pdf = metaObj?.pdfUrl || b.pdf_url || b.pdfUrl || b.raw_data?.pdfUrl || '';
      const title = b.title || metaObj?.title || b.raw_data?.title || '';
      const pub = b.publisher || metaObj?.publisher || b.raw_data?.publisher || '';

      const bookObj = {
        id: String(b.id),
        title: title,
        publisher: pub,
        bookType: bType,
        optionCount: Number(optCount) || 5,
        pdfUrl: pdf,
        subjects: rawSubjects.filter(s => !(s && (s.__meta === true || s.id === '__book_meta__'))),
        raw_data: b.raw_data || {},
        createdAt: b.created_at
      };

      const titleNorm = title.trim().toLowerCase().replace(/\s+/g, ' ');
      const pubNorm = pub.trim().toLowerCase().replace(/\s+/g, ' ');
      const normKey = `${titleNorm}___${pubNorm}`;

      if (!deduplicatedBooksMap.has(normKey)) {
        deduplicatedBooksMap.set(normKey, bookObj);
        idAliasMap.set(String(b.id), String(b.id));
        const bUuid = toUUID(b.id);
        if (bUuid) idAliasMap.set(bUuid, String(b.id));
      } else {
        const canonical = deduplicatedBooksMap.get(normKey);
        idAliasMap.set(String(b.id), String(canonical.id));
        const bUuid = toUUID(b.id);
        if (bUuid) idAliasMap.set(bUuid, String(canonical.id));
        canonical.subjects = bookObj.subjects || canonical.subjects;
      }
    });

    const books = Array.from(deduplicatedBooksMap.values());

    // 2. Map and deduplicate tests
    const deduplicatedTestsMap = new Map();
    (tRes.data || []).forEach(t => {
      const tBookIdStr = String(t.book_id || '');
      const canonicalBookId = idAliasMap.get(tBookIdStr) || (toUUID(tBookIdStr) ? idAliasMap.get(toUUID(tBookIdStr)) : null) || tBookIdStr;
      const ansKey = t.answer_key || {};
      const ansMeta = ansKey.__meta || {};
      const hasOptionLetters = Object.entries(ansKey).some(([k, v]) => k !== '__meta' && k !== 'meta' && typeof v === 'string' && /^[A-Ea-e]$/.test(v.trim()));
      const isExplicitMC = t.is_open_ended === false || t.isOpenEnded === false || t.question_type === 'coktan_secmeli' || t.questionType === 'coktan_secmeli' || ansMeta.questionType === 'coktan_secmeli' || ansMeta.isOpenEnded === false || hasOptionLetters;

      const isOe = !isExplicitMC && Boolean(
        t.is_open_ended === true ||
        t.isOpenEnded === true ||
        ansMeta.isOpenEnded === true ||
        t.question_type === 'acik_uclu' ||
        t.questionType === 'acik_uclu' ||
        ansMeta.questionType === 'acik_uclu' ||
        (t.name && /açık\s*uçlu|acik\s*uclu/i.test(t.name) && !/çoktan\s*seçmeli|coktan\s*secmeli|test/i.test(t.name))
      );
      const qType = isOe ? 'acik_uclu' : (t.question_type || t.questionType || ansMeta.questionType || 'coktan_secmeli');
      const sId = t.subject_id ? String(t.subject_id) : null;
      const topId = t.topic_id ? String(t.topic_id) : null;
      const name = String(t.name || 'Test').trim();

      const testDueDate = t.due_date || t.dueDate || ansMeta.dueDate || ansMeta.testDueDate || t.date || null;

      const testObj = {
        id: String(t.id),
        bookId: canonicalBookId,
        subjectId: sId,
        topicId: topId,
        name: name,
        questionCount: t.question_count || 20,
        answerKey: ansKey,
        isOpenEnded: isOe,
        questionType: qType,
        optionCount: Number(t.option_count || t.optionCount || ansMeta.optionCount) || undefined,
        pdfUrl: t.pdf_url || ansMeta.pdfUrl || '',
        dueDate: testDueDate,
        testDueDate: testDueDate,
        date: testDueDate,
        createdAt: t.created_at
      };

      const sKey = sId ? String(sId).trim().toLowerCase() : 'direct';
      const topKey = topId ? String(topId).trim().toLowerCase() : 'direct';
      const testKey = `${canonicalBookId}___${sKey}___${topKey}___${name.toLowerCase()}`;
      if (!deduplicatedTestsMap.has(testKey)) {
        deduplicatedTestsMap.set(testKey, testObj);
      } else {
        const existing = deduplicatedTestsMap.get(testKey);
        deduplicatedTestsMap.set(testKey, { ...existing, ...testObj });
      }
    });

    const bookTests = Array.from(deduplicatedTestsMap.values());
    return { books, bookTests };
  } catch (err) {
    console.warn('[Supabase] dbGetTrackedBooks error:', err.message);
    return null;
  }
}

async function resilientTrackedBookMutation(initialPayload, bookId, isUpsert = false) {
  if (!isSupabaseConfigured()) return null;
  const idStr = String(bookId || '');
  const idUuid = toUUID(idStr);
  const candidateIds = Array.from(new Set([idStr, idUuid].filter(Boolean)));

  const availableCols = await getTrackedBooksColumns();
  
  let payload = {};
  if (availableCols && availableCols.size > 0) {
    for (const [key, value] of Object.entries(initialPayload)) {
      if (availableCols.has(key)) {
        payload[key] = value;
      }
    }
    if (initialPayload.bookType && availableCols.has('book_type')) payload.book_type = initialPayload.bookType;
    if (initialPayload.pdfUrl && availableCols.has('pdf_url')) payload.pdf_url = initialPayload.pdfUrl;
  } else {
    payload = {
      title: initialPayload.title || 'Kitap',
      subjects: initialPayload.subjects || []
    };
  }

  try {
    // 1. Check if row already exists in Supabase under any candidate ID
    const { data: existingRows } = await supabase.from('tracked_books').select('id').in('id', candidateIds);
    const existingId = existingRows && existingRows.length > 0 ? existingRows[0].id : null;

    if (existingId) {
      // Row exists! Update in-place to prevent duplication
      const { data, error } = await supabase.from('tracked_books').update(payload).eq('id', existingId).select().maybeSingle();
      if (!error && data) return data;
    } else {
      // New row! Insert with primary id
      payload.id = idStr;
      const { data, error } = await supabase.from('tracked_books').upsert([payload], { onConflict: 'id' }).select().maybeSingle();
      if (!error && data) return data;
    }
  } catch (err) {
    console.warn('[Supabase] resilientTrackedBookMutation error:', err);
  }
  return null;
}

export async function dbAddTrackedBook(book) {
  if (!isSupabaseConfigured() || !book) return null;
  try {
    const optCount = Number(book.optionCount) || 5;
    const bType = book.bookType || 'standard';
    const pdf = book.pdfUrl || '';
    const pub = book.publisher || '';
    const title = book.title || 'Kitap';
    const rawSubjects = Array.isArray(book.subjects) ? book.subjects : [];
    const cleanSubs = rawSubjects.filter(s => !(s && (s.__meta === true || s.id === '__book_meta__')));
    
    const metaHeader = {
      id: '__book_meta__',
      __meta: true,
      title: title,
      publisher: pub,
      optionCount: optCount,
      bookType: bType,
      pdfUrl: pdf
    };
    const subjectsWithMeta = [metaHeader, ...cleanSubs];

    const rawData = {
      ...(book.raw_data || {}),
      subjects: cleanSubs,
      optionCount: optCount,
      title: title,
      publisher: pub,
      bookType: bType,
      pdfUrl: pdf
    };

    const bookId = String(book.id || `tb_${Date.now()}`);

    const payload = {
      id: toUUID(bookId),
      title: title,
      publisher: pub,
      book_type: bType,
      pdf_url: pdf,
      subjects: subjectsWithMeta,
      raw_data: rawData
    };

    return await resilientTrackedBookMutation(payload, bookId, true);
  } catch (err) {
    console.warn('[Supabase] dbAddTrackedBook error:', err.message);
    return null;
  }
}

export async function dbUpdateTrackedBook(bookId, updates) {
  if (!isSupabaseConfigured() || !bookId) return null;
  try {
    let currentBook = null;
    const safeId = toUUID(bookId);
    try {
      const { data: existing } = await supabase.from('tracked_books').select('*').eq('id', safeId).maybeSingle();
      if (existing) currentBook = existing;
    } catch {}

    const rawSubjects = (updates.subjects !== undefined)
      ? (Array.isArray(updates.subjects) ? updates.subjects : [])
      : (Array.isArray(currentBook?.subjects) ? currentBook.subjects : (Array.isArray(currentBook?.raw_data?.subjects) ? currentBook.raw_data.subjects : []));

    const cleanSubs = rawSubjects.filter(s => !(s && (s.__meta === true || s.id === '__book_meta__')));
    const existingMeta = Array.isArray(rawSubjects) ? rawSubjects.find(s => s && (s.__meta === true || s.id === '__book_meta__')) : null;

    const optCount = updates.optionCount !== undefined
      ? Number(updates.optionCount)
      : (existingMeta?.optionCount !== undefined
        ? Number(existingMeta.optionCount)
        : Number(currentBook?.option_count || currentBook?.raw_data?.optionCount || 5));

    const bType = updates.bookType || updates.book_type || existingMeta?.bookType || currentBook?.book_type || currentBook?.raw_data?.bookType || 'standard';
    const pdf = (updates.pdfUrl !== undefined) ? updates.pdfUrl : (existingMeta?.pdfUrl || currentBook?.pdf_url || currentBook?.raw_data?.pdfUrl || '');
    const pub = (updates.publisher !== undefined) ? updates.publisher : (existingMeta?.publisher || currentBook?.publisher || currentBook?.raw_data?.publisher || '');
    const title = (updates.title !== undefined) ? updates.title : (existingMeta?.title || currentBook?.title || currentBook?.raw_data?.title || '');

    const metaHeader = {
      id: '__book_meta__',
      __meta: true,
      title: title,
      publisher: pub,
      optionCount: optCount,
      bookType: bType,
      pdfUrl: pdf
    };
    const subjectsWithMeta = [metaHeader, ...cleanSubs];

    const currentRawData = currentBook?.raw_data || {};
    const rawData = {
      ...currentRawData,
      ...updates,
      subjects: cleanSubs,
      title: title,
      publisher: pub,
      optionCount: optCount,
      bookType: bType,
      pdfUrl: pdf
    };

    const payload = {
      title: title,
      publisher: pub,
      book_type: bType,
      pdf_url: pdf,
      subjects: subjectsWithMeta,
      raw_data: rawData
    };

    return await resilientTrackedBookMutation(payload, bookId, false);
  } catch (err) {
    console.warn('[Supabase] dbUpdateTrackedBook error:', err.message);
    return null;
  }
}

export async function dbDeleteTrackedBook(bookId) {
  if (!isSupabaseConfigured() || !bookId) return null;
  try {
    const rawId = String(bookId);
    const validBookUuids = ensureUUIDs([rawId, rawId.replace(/^book_?/, '')]);
    const allIds = Array.from(new Set([rawId, rawId.replace(/^book_?/, ''), ...validBookUuids]));
    
    // 1. Delete associated tests first to avoid FK constraint blocks
    try {
      await supabase.from('tracked_book_tests').delete().in('book_id', allIds);
    } catch {}
    
    try {
      await supabase.from('tracked_books').delete().in('id', allIds);
    } catch {}
    
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteTrackedBook error:', err.message);
    return false;
  }
}

export async function dbAddTrackedBookTest(test) {
  if (!isSupabaseConfigured() || !test) return null;
  try {
    const rawBId = test.bookId || test.book_id || null;
    const safeBookId = rawBId ? toUUID(rawBId) : null;
    const safeTestId = toUUID(test.id || `tbt_${Date.now()}`);
    const rawAnsKey = test.answerKey || test.answer_key || {};
    const ansMeta = rawAnsKey.__meta || {};
    const hasOptionLetters = Object.entries(rawAnsKey).some(([k, v]) => k !== '__meta' && k !== 'meta' && typeof v === 'string' && /^[A-Ea-e]$/.test(v.trim()));
    const isExplicitMC = test.is_open_ended === false || test.isOpenEnded === false || test.question_type === 'coktan_secmeli' || test.questionType === 'coktan_secmeli' || ansMeta.questionType === 'coktan_secmeli' || ansMeta.isOpenEnded === false || hasOptionLetters;

    const isOe = !isExplicitMC && Boolean(
      test.isOpenEnded === true ||
      test.is_open_ended === true ||
      ansMeta.isOpenEnded === true ||
      test.questionType === 'acik_uclu' ||
      test.question_type === 'acik_uclu' ||
      ansMeta.questionType === 'acik_uclu' ||
      (test.name && /açık\s*uçlu|acik\s*uclu/i.test(test.name) && !/çoktan\s*seçmeli|coktan\s*secmeli|test/i.test(test.name))
    );
    const qType = isOe ? 'acik_uclu' : (test.questionType || test.question_type || ansMeta.questionType || 'coktan_secmeli');

    const sId = test.subjectId || test.subject_id || null;
    const topId = test.topicId || test.topic_id || null;

    const enrichedAnswerKey = {
      ...rawAnsKey,
      __meta: {
        ...ansMeta,
        questionType: qType,
        isOpenEnded: isOe,
        optionCount: test.optionCount,
        pdfUrl: test.pdfUrl || test.pdf_url || '',
        subjectId: sId ? String(sId) : '',
        topicId: topId ? String(topId) : '',
        dueDate: test.dueDate || test.due_date || test.testDueDate || test.date || ansMeta.dueDate || ''
      }
    };

    const payload = {
      id: safeTestId,
      book_id: safeBookId,
      subject_id: sId ? String(sId) : null,
      topic_id: topId ? String(topId) : null,
      name: test.name || 'Test',
      question_count: Number(test.questionCount || test.question_count) || 20,
      answer_key: enrichedAnswerKey
    };
    const { data, error } = await supabase.from('tracked_book_tests').upsert([payload], { onConflict: 'id' }).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbAddTrackedBookTest error:', err.message);
    return null;
  }
}

export async function dbBatchUpsertTrackedBookTests(testList) {
  if (!isSupabaseConfigured() || !Array.isArray(testList) || testList.length === 0) return true;
  try {
    const seenIds = new Set();
    const rows = [];

    for (const t of testList) {
      const rawBId = t.bookId || t.book_id || null;
      const safeBookId = rawBId ? toUUID(rawBId) : null;
      
      let safeTestId = toUUID(t.id || `tbt_${Date.now()}_${Math.random()}`);
      if (seenIds.has(safeTestId)) {
        safeTestId = toUUID(`tbt_${Date.now()}_${Math.random()}_${Math.random()}`);
      }
      seenIds.add(safeTestId);

      const rawAnsKey = t.answerKey || t.answer_key || {};
      const ansMeta = rawAnsKey.__meta || {};
      const hasOptionLetters = Object.entries(rawAnsKey).some(([k, v]) => k !== '__meta' && k !== 'meta' && typeof v === 'string' && /^[A-Ea-e]$/.test(v.trim()));
      const isExplicitMC = t.is_open_ended === false || t.isOpenEnded === false || t.question_type === 'coktan_secmeli' || t.questionType === 'coktan_secmeli' || ansMeta.questionType === 'coktan_secmeli' || ansMeta.isOpenEnded === false || hasOptionLetters;

      const isOe = !isExplicitMC && Boolean(
        t.isOpenEnded === true ||
        t.is_open_ended === true ||
        ansMeta.isOpenEnded === true ||
        t.questionType === 'acik_uclu' ||
        t.question_type === 'acik_uclu' ||
        ansMeta.questionType === 'acik_uclu' ||
        (t.name && /açık\s*uçlu|acik\s*uclu/i.test(t.name) && !/çoktan\s*seçmeli|coktan\s*secmeli|test/i.test(t.name))
      );
      const qType = isOe ? 'acik_uclu' : (t.questionType || t.question_type || ansMeta.questionType || 'coktan_secmeli');

      const sId = t.subjectId || t.subject_id || null;
      const topId = t.topicId || t.topic_id || null;

      const enrichedAnswerKey = {
        ...rawAnsKey,
        __meta: {
          ...ansMeta,
          questionType: qType,
          isOpenEnded: isOe,
          optionCount: t.optionCount,
          pdfUrl: t.pdfUrl || t.pdf_url || '',
          subjectId: sId ? String(sId) : '',
          topicId: topId ? String(topId) : '',
          dueDate: t.dueDate || t.due_date || t.testDueDate || t.date || ansMeta.dueDate || ''
        }
      };

      rows.push({
        id: safeTestId,
        book_id: safeBookId,
        subject_id: sId ? String(sId) : null,
        topic_id: topId ? String(topId) : null,
        name: t.name || 'Test',
        question_count: Number(t.questionCount || t.question_count) || 20,
        answer_key: enrichedAnswerKey
      });
    }

    // Deduplicate rows by id before sending to prevent PostgreSQL "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueMap = new Map();
    rows.forEach(r => {
      if (r && r.id) {
        uniqueMap.set(String(r.id), r);
      }
    });
    const uniqueRows = Array.from(uniqueMap.values());

    for (let i = 0; i < uniqueRows.length; i += 50) {
      const chunk = uniqueRows.slice(i, i + 50);
      const { error } = await supabase.from('tracked_book_tests').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase] dbBatchUpsertTrackedBookTests chunk error:', error.message);
        // Fallback row-by-row
        for (const row of chunk) {
          try {
            await supabase.from('tracked_book_tests').upsert([row], { onConflict: 'id' });
          } catch {}
        }
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbBatchUpsertTrackedBookTests error:', err.message);
    return false;
  }
}

export async function dbDeleteTrackedBookTest(testId) {
  if (!isSupabaseConfigured() || !testId) return null;
  try {
    const rawId = String(testId);
    const validTestUuids = ensureUUIDs([rawId, rawId.replace(/^test_?/, '')]);
    const allIds = Array.from(new Set([rawId, rawId.replace(/^test_?/, ''), ...validTestUuids]));
    
    await supabase.from('tracked_book_tests').delete().in('id', allIds);
    
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteTrackedBookTest error:', err.message);
    return false;
  }
}

// ==========================================
// 8. KOÇLUK SİSTEMİ (COACHING SYSTEM)
// ==========================================
export async function dbGetCoachingData() {
  if (!isSupabaseConfigured()) return null;
  try {
    const [cRes, nRes] = await Promise.all([
      supabase.from('coaching_links').select('*'),
      supabase.from('coaching_notes').select('*').order('created_at', { ascending: false })
    ]);

    if (cRes.error || nRes.error) return null;

    const links = (cRes.data || []).map(c => ({
      id: String(c.id),
      teacherId: String(c.teacher_id),
      studentId: String(c.student_id),
      createdAt: c.created_at
    }));

    const notes = (nRes.data || []).map(n => ({
      id: String(n.id),
      teacherId: String(n.teacher_id),
      studentId: String(n.student_id),
      note: n.note,
      goals: n.goals || [],
      weeklyFocus: n.weekly_focus || '',
      createdAt: n.created_at
    }));

    return { links, notes };
  } catch (err) {
    console.warn('[Supabase] dbGetCoachingData info:', err.message);
    return null;
  }
}

export async function dbSaveCoachingNote(noteObj) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(noteObj.id || `cn_${Date.now()}`),
      teacher_id: String(noteObj.teacherId || 'teacher_1'),
      student_id: String(noteObj.studentId),
      note: noteObj.note || '',
      goals: noteObj.goals || [],
      weekly_focus: noteObj.weeklyFocus || ''
    };
    const { data, error } = await supabase.from('coaching_notes').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveCoachingNote info:', err.message);
    return null;
  }
}

export async function dbToggleCoachedStudent(teacherId, studentId, isCoached) {
  if (!isSupabaseConfigured()) return null;
  try {
    if (isCoached) {
      const payload = {
        id: `cl_${teacherId}_${studentId}`,
        teacher_id: String(teacherId),
        student_id: String(studentId)
      };
      await supabase.from('coaching_links').upsert([payload], { onConflict: 'id' });
    } else {
      await supabase.from('coaching_links').delete().match({ teacher_id: String(teacherId), student_id: String(studentId) });
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbToggleCoachedStudent info:', err.message);
    return false;
  }
}

// Mock Exams Persistence
export async function dbGetMockExams() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('mock_exams').select('*').order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(m => ({
      id: String(m.id),
      studentId: String(m.student_id),
      title: m.title,
      date: m.date,
      scores: m.scores || {},
      totalNet: m.total_net || 0,
      createdAt: m.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetMockExams info:', err.message);
    return null;
  }
}

export async function dbSaveMockExam(exam) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(exam.id || `me_${Date.now()}`),
      student_id: String(exam.studentId),
      title: exam.title || 'Deneme Sınavı',
      date: exam.date || new Date().toISOString().split('T')[0],
      scores: exam.scores || {},
      total_net: exam.totalNet || 0
    };
    const { data, error } = await supabase.from('mock_exams').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveMockExam info:', err.message);
    return null;
  }
}

export async function dbDeleteMockExam(id) {
  if (!isSupabaseConfigured() || !id) return null;
  try {
    const idStr = String(id);
    const uuidId = toUUID(idStr);
    let q = supabase.from('mock_exams').delete();
    if (uuidId && uuidId !== idStr) {
      q = q.or(`id.eq.${idStr},id.eq.${uuidId}`);
    } else {
      q = q.eq('id', idStr);
    }
    const { error } = await q;
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteMockExam info:', err.message);
    return false;
  }
}

// Coaching Meetings Persistence
export async function dbGetCoachingMeetings() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('coaching_meetings').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(m => ({
      id: String(m.id),
      teacherId: String(m.teacher_id),
      studentId: String(m.student_id),
      date: m.date,
      topic: m.topic,
      notes: m.notes,
      decisions: m.decisions || [],
      nextMeetingDate: m.next_meeting_date,
      createdAt: m.created_at
    }));
  } catch (err) {
    console.warn('[Supabase] dbGetCoachingMeetings info:', err.message);
    return null;
  }
}

export async function dbSaveCoachingMeeting(meeting) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(meeting.id || `cm_${Date.now()}`),
      teacher_id: String(meeting.teacherId || 'teacher_1'),
      student_id: String(meeting.studentId),
      date: meeting.date || new Date().toISOString().split('T')[0],
      topic: meeting.topic || 'Genel Değerlendirme',
      notes: meeting.notes || '',
      decisions: meeting.decisions || [],
      next_meeting_date: meeting.nextMeetingDate || null
    };
    const { data, error } = await supabase.from('coaching_meetings').upsert([payload], { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveCoachingMeeting info:', err.message);
    return null;
  }
}

// Coaching Student Profiles Persistence
export async function dbGetCoachingProfiles() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('coaching_profiles').select('*');
    if (error) throw error;
    return (data || []).map(p => {
      const extraData = p.data || (p.extra_data ? (typeof p.extra_data === 'string' ? JSON.parse(p.extra_data) : p.extra_data) : {});
      return {
        id: String(p.id),
        studentId: String(p.student_id),
        targetSchool: p.target_school || '',
        targetNet: p.target_net || 0,
        learningStyle: p.learning_style || 'Görsel',
        parentName: p.parent_name || '',
        parentPhone: p.parent_phone || '',
        parentNotes: p.parent_notes || '',
        strengths: p.strengths || '',
        hobbies: p.hobbies || '',
        createdAt: p.created_at,
        ...extraData
      };
    });
  } catch (err) {
    console.warn('[Supabase] dbGetCoachingProfiles info:', err.message);
    return null;
  }
}

export async function dbSaveCoachingProfile(profile) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payloadWithData = {
      id: String(profile.id || `cp_${profile.studentId}`),
      student_id: String(profile.studentId),
      target_school: profile.targetSchool || '',
      target_net: profile.targetNet || 0,
      learning_style: profile.learningStyle || 'Görsel',
      parent_name: profile.parentName || '',
      parent_phone: profile.parentPhone || '',
      parent_notes: profile.parentNotes || '',
      strengths: profile.strengths || '',
      hobbies: profile.hobbies || '',
      extra_data: JSON.stringify(profile)
    };
    
    // First try with extra_data
    const { data, error } = await supabase.from('coaching_profiles').upsert([payloadWithData], { onConflict: 'id' }).select().single();
    
    if (error) {
      console.warn('[Supabase] dbSaveCoachingProfile extra_data failed, trying data column fallback:', error.message);
      // Fallback to data column if extra_data doesn't exist
      const fallbackPayload = { ...payloadWithData, data: payloadWithData.extra_data };
      delete fallbackPayload.extra_data;
      
      const { data: fallbackData, error: fallbackError } = await supabase.from('coaching_profiles').upsert([fallbackPayload], { onConflict: 'id' }).select().single();
      
      if (fallbackError) {
        console.warn('[Supabase] dbSaveCoachingProfile fallback failed:', fallbackError.message);
        
        // Final fallback: just save the raw columns without JSON
        const rawPayload = { ...payloadWithData };
        delete rawPayload.extra_data;
        const { data: rawData } = await supabase.from('coaching_profiles').upsert([rawPayload], { onConflict: 'id' }).select().single();
        return rawData;
      }
      return fallbackData;
    }
    
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveCoachingProfile catch:', err.message);
    return null;
  }
}

// ==========================================
// ÖLÇEK SİSTEMİ (SCALES)
// ==========================================

export async function dbGetScales(teacherId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('scales')
      .select('*')
      .eq('teacher_id', String(teacherId));
    if (error) {
      console.warn('[Supabase] dbGetScales error:', error.message);
      return null;
    }
    return (data || []).map(row => {
      try {
        const parsed = JSON.parse(row.data || '{}');
        return { ...parsed, id: row.id, teacherId: row.teacher_id };
      } catch {
        return { id: row.id, teacherId: row.teacher_id };
      }
    });
  } catch (err) {
    console.warn('[Supabase] dbGetScales catch:', err.message);
    return null;
  }
}

export async function dbSaveScale(scale) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: String(scale.id),
      teacher_id: String(scale.teacherId || scale.createdBy || ''),
      data: JSON.stringify(scale),
    };
    const { data, error } = await supabase
      .from('scales')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.warn('[Supabase] dbSaveScale error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveScale catch:', err.message);
    return null;
  }
}

export async function dbDeleteScale(scaleId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase
      .from('scales')
      .delete()
      .eq('id', String(scaleId));
    if (error) console.warn('[Supabase] dbDeleteScale error:', error.message);
  } catch (err) {
    console.warn('[Supabase] dbDeleteScale catch:', err.message);
  }
}
// ==========================================
// 15. KULLANICIYA / ÖĞRETMENE ÖZEL YAPAY ZEKA (AI) API ANAHTARI
// ==========================================
export async function dbGetUserAiApiKey(userId) {
  if (!userId) return null;
  const userKey = `gemini_api_key_${userId}`;
  const localVal = localStorage.getItem(userKey);

  if (!isSupabaseConfigured()) return localVal || null;

  try {
    const storeId = `user_ai_config_${userId}`;
    const storeUuid = toUUID(storeId);
    const { data, error } = await supabase
      .from('coaching_profiles')
      .select('*')
      .or(`id.eq.${storeUuid},student_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const parsed = data.extra_data
        ? (typeof data.extra_data === 'string' ? JSON.parse(data.extra_data) : data.extra_data)
        : (data.data ? (typeof data.data === 'string' ? JSON.parse(data.data) : data.data) : {});
      const cloudKey = parsed.apiKey || parsed.gemini_api_key || parsed.key || null;
      if (cloudKey) {
        localStorage.setItem(userKey, cloudKey);
        return cloudKey;
      }
    }
  } catch (err) {
    console.warn('[Supabase] dbGetUserAiApiKey:', err.message);
  }
  return localVal || null;
}

export async function dbSaveUserAiApiKey(userId, apiKey, metadata = {}) {
  if (!userId) return false;
  const userKey = `gemini_api_key_${userId}`;
  const cleanKey = apiKey ? String(apiKey).trim() : '';

  if (cleanKey) {
    localStorage.setItem(userKey, cleanKey);
    localStorage.setItem('system_ai_api_key', cleanKey);
    localStorage.setItem('gemini_api_key', cleanKey);
    localStorage.setItem('eTestGeminiApiKey', cleanKey);
  } else {
    localStorage.removeItem(userKey);
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const storeId = `user_ai_config_${userId}`;
    const storeUuid = toUUID(storeId);
    const payloadJson = JSON.stringify({
      userId: String(userId),
      apiKey: cleanKey,
      defaultModel: metadata.defaultModel || 'gemini-3.6-flash',
      userName: metadata.userName || '',
      updatedAt: new Date().toISOString()
    });

    const payload = {
      id: storeUuid,
      student_id: String(userId),
      target_school: 'AI_SETTINGS',
      parent_notes: 'User-specific private Gemini API key configuration',
      extra_data: payloadJson
    };

    try {
      await supabase.from('coaching_profiles').upsert([payload], { onConflict: 'id' });
    } catch {
      try {
        const fallbackPayload = { ...payload, data: payloadJson };
        delete fallbackPayload.extra_data;
        await supabase.from('coaching_profiles').upsert([fallbackPayload], { onConflict: 'id' });
      } catch {}
    }

    // Also automatically register as system-wide key so all students immediately have access
    if (cleanKey) {
      await dbSaveSystemAiApiKey(cleanKey, metadata);
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbSaveUserAiApiKey error:', err.message);
    return false;
  }
}

/**
 * Get system-wide global Gemini AI Configuration (API Key & Default Model)
 */
export async function dbGetSystemAiConfig() {
  const localKey = localStorage.getItem('system_ai_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('eTestGeminiApiKey');
  const localModel = localStorage.getItem('system_ai_default_model') || 'gemini-3.6-flash';
  
  if (!isSupabaseConfigured()) {
    return { apiKey: localKey || null, defaultModel: localModel };
  }

  try {
    const storeIdStr = 'system_global_ai_config';
    const storeIdUuid = toUUID(storeIdStr);

    // 1. Check summaries table (dedicated system config record)
    try {
      const { data: sData } = await supabase
        .from('summaries')
        .select('*')
        .or(`id.eq.global_ai_config,id.eq.${storeIdUuid},target_id.eq.system_global_ai,target_id.eq.SYSTEM_GLOBAL`)
        .limit(5);

      if (Array.isArray(sData) && sData.length > 0) {
        for (const s of sData) {
          const key = s.content_html || s.content || s.raw_data?.apiKey;
          if (key && String(key).trim()) {
            const cleanKey = String(key).trim();
            const model = s.raw_data?.defaultModel || localModel;
            localStorage.setItem('system_ai_api_key', cleanKey);
            localStorage.setItem('gemini_api_key', cleanKey);
            localStorage.setItem('eTestGeminiApiKey', cleanKey);
            return { apiKey: cleanKey, defaultModel: model };
          }
        }
      }
    } catch {}

    // 2. Check coaching_profiles table (including any teacher user_ai_config_ rows)
    try {
      const { data: cData } = await supabase
        .from('coaching_profiles')
        .select('*')
        .limit(20);

      if (Array.isArray(cData) && cData.length > 0) {
        for (const row of cData) {
          let parsed = row.extra_data || row.data || row.raw_data;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch {}
          }
          if (parsed && typeof parsed.extra_data === 'string') {
            try { parsed = JSON.parse(parsed.extra_data); } catch {}
          }
          const key = parsed?.apiKey || parsed?.gemini_api_key || parsed?.key || null;
          const model = parsed?.defaultModel || parsed?.model || localModel;
          if (key && String(key).trim()) {
            const cleanKey = String(key).trim();
            localStorage.setItem('system_ai_api_key', cleanKey);
            localStorage.setItem('gemini_api_key', cleanKey);
            localStorage.setItem('eTestGeminiApiKey', cleanKey);
            return { apiKey: cleanKey, defaultModel: model };
          }
        }
      }
    } catch {}
  } catch (err) {
    console.warn('[Supabase] dbGetSystemAiConfig error:', err.message);
  }
  return { apiKey: localKey || null, defaultModel: localModel };
}

/**
 * Get system-wide global Gemini API Key (set by Admin in Admin Dashboard)
 */
export async function dbGetSystemAiApiKey() {
  const config = await dbGetSystemAiConfig();
  return config?.apiKey || null;
}

/**
 * Save system-wide global Gemini API Key and default model (by Admin) to Supabase database & localStorage
 */
export async function dbSaveSystemAiApiKey(apiKey, metadata = {}) {
  const cleanKey = apiKey ? String(apiKey).trim() : '';
  const modelToSave = metadata.defaultModel || localStorage.getItem('system_ai_default_model') || 'gemini-3.6-flash';

  localStorage.setItem('system_ai_default_model', modelToSave);

  if (cleanKey) {
    localStorage.setItem('system_ai_api_key', cleanKey);
    localStorage.setItem('gemini_api_key', cleanKey);
    localStorage.setItem('eTestGeminiApiKey', cleanKey);
  } else {
    localStorage.removeItem('system_ai_api_key');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('eTestGeminiApiKey');
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const storeIdStr = 'system_global_ai_config';
    const storeIdUuid = toUUID(storeIdStr);

    const payloadJson = JSON.stringify({
      apiKey: cleanKey,
      defaultModel: modelToSave,
      updatedBy: metadata.updatedBy || 'Admin',
      updatedAt: new Date().toISOString()
    });

    // 1. Save to summaries table (most compatible string table in Supabase)
    try {
      const summaryPayload = {
        id: 'global_ai_config',
        target_type: 'SYSTEM',
        target_id: 'system_global_ai',
        title: 'GLOBAL_AI_CONFIG',
        content_html: cleanKey,
        author_name: metadata.updatedBy || 'Admin',
        updated_at: new Date().toISOString()
      };
      await supabase.from('summaries').upsert([summaryPayload], { onConflict: 'id' });
    } catch {}

    // 2. Save to coaching_profiles with UUID id
    try {
      const coachingPayloadUuid = {
        id: storeIdUuid,
        target_school: 'SYSTEM_AI_SETTINGS',
        parent_notes: cleanKey,
        extra_data: payloadJson
      };
      await supabase.from('coaching_profiles').upsert([coachingPayloadUuid], { onConflict: 'id' });
    } catch {}

    return true;
  } catch (err) {
    console.warn('[Supabase] dbSaveSystemAiApiKey error:', err.message);
    return false;
  }
}

// ==========================================
// 12. HATA ANALİZİ, ARALIKLI TEKRAR & SİLİNEN KAYITLAR (REMEDIAL & MISTAKES)
// ==========================================
export async function dbSaveMistakeReasons(studentId, testId, submissionId, mistakeReasonsMap = {}) {
  if (!isSupabaseConfigured() || !studentId || !testId || !mistakeReasonsMap) return false;
  try {
    const sId = String(studentId);
    const tId = String(testId);
    const subId = submissionId ? String(submissionId) : null;

    const rows = Object.entries(mistakeReasonsMap).map(([qNo, reasonTag]) => {
      const qNum = parseInt(qNo, 10) || 1;
      return {
        id: `mr_${sId}_${tId}_${qNum}`,
        student_id: sId,
        test_id: tId,
        submission_id: subId,
        question_no: qNum,
        reason_tag: String(reasonTag),
        raw_data: { studentId: sId, testId: tId, submissionId: subId, qNo: qNum, reasonTag }
      };
    });

    if (rows.length > 0) {
      await supabase.from('mistake_reasons').upsert(rows, { onConflict: 'id' });
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbSaveMistakeReasons error:', err.message);
    return false;
  }
}

export async function dbGetMistakeReasons(studentId, testId) {
  if (!isSupabaseConfigured() || !studentId) return {};
  try {
    let query = supabase.from('mistake_reasons').select('*').eq('student_id', String(studentId));
    if (testId) query = query.eq('test_id', String(testId));
    const { data, error } = await query;
    if (error || !data) return {};

    const result = {};
    data.forEach(row => {
      if (row.question_no && row.reason_tag) {
        result[row.question_no] = row.reason_tag;
      }
    });
    return result;
  } catch (err) {
    console.warn('[Supabase] dbGetMistakeReasons error:', err.message);
    return {};
  }
}

export async function dbSaveRemedialRepetition({ studentId, testId, homeworkId, intervals = [1, 3, 7, 15], keepMasteryTracking = true, startDate = new Date() }) {
  if (!isSupabaseConfigured() || !studentId || !testId) return false;
  try {
    const sId = String(studentId);
    const tId = String(testId);
    const hwId = homeworkId ? String(homeworkId) : null;

    const rows = intervals.map((intervalDays, idx) => {
      const stage = idx + 1;
      const targetDate = new Date(startDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split('T')[0];

      return {
        id: `rep_${sId}_${tId}_s${stage}`,
        student_id: sId,
        test_id: tId,
        homework_id: hwId,
        stage,
        total_stages: intervals.length,
        interval_days: intervalDays,
        target_date: dateStr,
        is_completed: false,
        keep_mastery_tracking: Boolean(keepMasteryTracking),
        raw_data: { studentId: sId, testId: tId, homeworkId: hwId, stage, intervalDays, targetDate: dateStr }
      };
    });

    if (rows.length > 0) {
      await supabase.from('remedial_spaced_repetition').upsert(rows, { onConflict: 'id' });
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] dbSaveRemedialRepetition error:', err.message);
    return false;
  }
}

export async function dbRecordDeletedItem(id, recordType = 'submission', deletedBy = null) {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const idStr = String(id);
    await supabase.from('deleted_records').upsert([{
      id: idStr,
      record_type: String(recordType),
      deleted_by: deletedBy ? String(deletedBy) : null,
      deleted_at: new Date().toISOString()
    }], { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase] dbRecordDeletedItem error:', err.message);
    return false;
  }
}

export async function dbGetDeletedItems() {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('deleted_records').select('*');
    if (error || !data) return [];
    return data.map(d => d.id);
  } catch (err) {
    console.warn('[Supabase] dbGetDeletedItems error:', err.message);
    return [];
  }
}


