import { supabase, isSupabaseConfigured } from '../lib/supabase';

function toUUID(id) {
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
      teacherId: u.teacher_id,
      password: u.password,
      isApproved: u.is_approved !== undefined ? Boolean(u.is_approved) : (u.role === 'teacher' ? false : true),
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
    const isApprovedVal = user.isApproved !== undefined 
      ? Boolean(user.isApproved) 
      : (user.role === 'teacher' ? false : true);

    const payload = {
      id: String(user.id || `u_${Date.now()}`),
      email: user.email,
      name: user.name,
      role: user.role || 'student',
      grade_id: user.gradeId || 'g1',
      teacher_id: user.teacherId || null,
      password: user.password || null,
      is_approved: isApprovedVal
    };
    const { data, error } = await supabase.from('users').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      if (error.code === '23505' || error.status === 409) {
        return { success: true, data: [payload] };
      }
      // Fallback if password or teacher_id columns don't exist in remote table
      const fallbackPayload = { ...payload };
      if (error.message && error.message.includes('is_approved')) delete fallbackPayload.is_approved;
      if (error.message && error.message.includes('teacher_id')) delete fallbackPayload.teacher_id;
      if (error.message && error.message.includes('password')) delete fallbackPayload.password;
      
      const fallbackRes = await supabase.from('users').upsert([fallbackPayload], { onConflict: 'id' }).select();
      return { success: true, data: fallbackRes.data };
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
      id: toUUID(sub.id || `sub_${Date.now()}`),
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

export async function dbDeleteSubmission(id) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('submissions').delete().eq('id', String(id));
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Supabase] dbDeleteSubmission error:', err.message);
    return false;
  }
}

export async function dbClearStudentSubmissions(studentId) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('submissions').delete().eq('student_id', String(studentId));
    if (error) throw error;
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
    const { data, error } = await supabase.from('questions')
      .select('id, subject, grade_id, topic, topic_id, type, content_type, content_payload, is_bundle, answer_key, title, question_count, question_text, options, correct_answer, explanation, image_url, raw_data, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(q => {
      let rawData = q.raw_data;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { rawData = {}; }
      }
      rawData = rawData && typeof rawData === 'object' ? rawData : {};

      const rawPayload = q.content_payload || rawData.contentPayload || '';
      const contentPayload = rawPayload.startsWith('http') ? rawPayload : 
                             (rawPayload.startsWith('data:') && rawPayload.length > 500000 ? '' : rawPayload);

      const realId = rawData.id || String(q.id);

      return {
        ...rawData,
        id: realId,
        subject: q.subject || rawData.subject || 'Matematik',
        gradeId: q.grade_id || rawData.gradeId || 'g1',
        topic: q.topic || rawData.topic || 'Genel',
        topicId: q.topic_id || rawData.topicId || 'global_all',
        type: q.type || rawData.type || 'coktan_secmeli',
        contentType: q.content_type || rawData.contentType || 'text',
        contentPayload: contentPayload || rawData.contentPayload || '',
        isBundle: q.is_bundle !== undefined ? q.is_bundle : (rawData.isBundle || false),
        questionsList: rawData.questionsList || q.questionsList || null,
        imageUrls: rawData.imageUrls || q.imageUrls || null,
        answerKey: q.answer_key || rawData.answerKey || [],
        title: q.title || rawData.title || '',
        questionCount: q.question_count || rawData.questionCount || 1,
        questionText: q.question_text || rawData.questionText || '',
        options: q.options || rawData.options || [],
        correctAnswer: q.correct_answer !== undefined ? q.correct_answer : (rawData.correctAnswer || '0'),
        explanation: q.explanation || rawData.explanation || '',
        imageUrl: q.image_url || rawData.imageUrl || ''
      };
    });
  } catch (err) {
    console.warn('[Supabase] dbGetQuestions error:', err.message);
    return null;
  }
}

export async function dbUploadFileToStorage(fileOrDataUrl, filenamePrefix = 'file') {
  if (!isSupabaseConfigured() || !fileOrDataUrl) return null;
  try {
    let fileBlob = null;
    let fileExt = 'pdf';

    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
      const arr = fileOrDataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      fileExt = mime.includes('pdf') ? 'pdf' : (mime.includes('image') ? 'png' : 'bin');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      fileBlob = new Blob([u8arr], { type: mime });
    } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
      fileBlob = fileOrDataUrl;
      if (fileOrDataUrl.name) {
        fileExt = fileOrDataUrl.name.split('.').pop().toLowerCase();
      }
    }

    if (!fileBlob) return null;

    const fileName = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('question_files')
      .upload(fileName, fileBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('[Supabase Storage] Upload error:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('question_files')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Supabase Storage] dbUploadFileToStorage failed:', err.message);
    return null;
  }
}

export async function dbAddQuestion(q) {
  if (!isSupabaseConfigured()) return null;
  try {
    const qId = q.id || `q_${Date.now()}`;
    const dbId = toUUID(qId);

    let finalContentPayload = q.contentPayload || '';

    // Automatically upload Base64 PDF/Image DataURLs to Supabase Storage Bucket!
    if (typeof finalContentPayload === 'string' && finalContentPayload.startsWith('data:')) {
      const publicUrl = await dbUploadFileToStorage(finalContentPayload, `q_${dbId}`);
      if (publicUrl) {
        finalContentPayload = publicUrl;
        q.contentPayload = publicUrl; // Update in-memory object URL
      }
    }

    const fullRaw = { ...q, id: qId, contentPayload: finalContentPayload };

    const payload = {
      id: dbId,
      subject: q.subject || 'Matematik',
      grade_id: q.gradeId || 'g1',
      topic: q.topic || 'Genel',
      topic_id: q.topicId || 'global_all',
      type: q.type || 'coktan_secmeli',
      content_type: q.contentType || 'text',
      content_payload: finalContentPayload,
      is_bundle: Boolean(q.isBundle),
      answer_key: q.answerKey || [],
      title: q.title || '',
      question_count: q.questionCount || 1,
      raw_data: fullRaw,
      question_text: q.questionText || '',
      options: q.options || [],
      correct_answer: String(q.correctAnswer !== undefined ? q.correctAnswer : '0'),
      explanation: q.explanation || '',
      image_url: q.imageUrl || ''
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
        explanation: JSON.stringify(fullRaw),
        image_url: q.imageUrl || ''
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
    const dbId = toUUID(qId);

    // 1. Fetch question record to extract storage URLs if only ID was passed
    let questionObj = typeof q === 'object' ? q : null;
    if (!questionObj) {
      const { data } = await supabase.from('questions').select('*').or(`id.eq.${dbId},id.eq.${String(qId)}`).maybeSingle();
      if (data) questionObj = data;
    }

    // 2. Extract and delete any uploaded files from Supabase Storage ('question_files' bucket)
    if (questionObj) {
      const urlsToDelete = [];
      const payloadUrl = questionObj.content_payload || questionObj.contentPayload;
      if (typeof payloadUrl === 'string' && payloadUrl.includes('/storage/v1/object/public/question_files/')) {
        urlsToDelete.push(payloadUrl);
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
      }

      // Perform file deletion from Storage bucket
      const fileNames = urlsToDelete.map(url => url.split('/question_files/').pop()).filter(Boolean);
      if (fileNames.length > 0) {
        try {
          await supabase.storage.from('question_files').remove(fileNames);
          console.log('[Supabase Storage] Deleted files from storage bucket:', fileNames);
        } catch (storageErr) {
          console.warn('[Supabase Storage] Delete error:', storageErr.message);
        }
      }
    }

    // 3. Delete row from Supabase database
    let { error } = await supabase.from('questions').delete().eq('id', dbId);
    if (error) {
      await supabase.from('questions').delete().eq('id', String(qId));
    }
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
    return data.map(h => {
      let raw = {};
      if (h.raw_data && typeof h.raw_data === 'object') {
        raw = h.raw_data;
      }
      const qIds = h.question_ids || h.questionIds || raw.questionIds || (Array.isArray(h.tests) ? h.tests : []);
      return {
        id: String(h.id),
        title: h.title || raw.title || '',
        subject: h.subject || raw.subject || 'Genel',
        dueDate: h.due_date || raw.dueDate,
        targetType: h.target_type || raw.targetType || 'grade',
        targetIds: h.target_ids || raw.targetIds || [],
        tests: qIds,
        questionIds: qIds,
        totalQuestions: h.total_questions || raw.totalQuestions || qIds.length || 10,
        timePerQuestion: h.time_per_question || raw.timePerQuestion || 2,
        time: h.time || raw.time || 20,
        createdAt: h.created_at,
        submissions: h.submissions || raw.submissions || [],
        ...raw
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
    const qIds = hw.questionIds || hw.tests || [];
    const fullRaw = { ...hw, questionIds: qIds, tests: qIds };
    const payload = {
      id: String(hw.id || `hw_${Date.now()}`),
      title: hw.title,
      subject: hw.subject || 'Genel',
      due_date: hw.dueDate,
      target_type: hw.targetType || 'grade',
      target_ids: hw.targetIds || [],
      tests: qIds,
      question_ids: qIds,
      total_questions: hw.totalQuestions || qIds.length || 0,
      time_per_question: hw.timePerQuestion || 2,
      time: hw.time || 20,
      raw_data: fullRaw
    };
    let { data, error } = await supabase.from('homeworks').upsert([payload], { onConflict: 'id' }).select();
    if (error) {
      // Fallback if question_ids or raw_data columns don't exist yet in Supabase schema
      const fallbackPayload = {
        id: String(hw.id || `hw_${Date.now()}`),
        title: hw.title,
        subject: hw.subject || 'Genel',
        due_date: hw.dueDate,
        target_type: hw.targetType || 'grade',
        target_ids: hw.targetIds || [],
        tests: qIds
      };
      const res = await supabase.from('homeworks').upsert([fallbackPayload], { onConflict: 'id' }).select();
      if (res.error) throw res.error;
      data = res.data;
    }
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
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('mock_exams').delete().eq('id', String(id));
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
      data: profile
    };
    const { data, error } = await supabase.from('coaching_profiles').upsert([payloadWithData], { onConflict: 'id' }).select().single();
    if (error) {
      // Fallback if 'data' column is not on table schema
      const basePayload = { ...payloadWithData };
      delete basePayload.data;
      const fallback = await supabase.from('coaching_profiles').upsert([basePayload], { onConflict: 'id' }).select().single();
      return fallback.data;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] dbSaveCoachingProfile info:', err.message);
    return null;
  }
}
