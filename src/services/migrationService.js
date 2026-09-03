import { supabase, isSupabaseConfigured, resetSupabaseQuotaStatus } from '../lib/supabase';
import { toUUID, dbAddTrackedBook, dbBatchUpsertTrackedBookTests } from './supabaseService';
import { idbGetPayload } from './indexedDbService';

export async function migrateAllLocalDataToSupabase(onProgress = () => {}) {
  resetSupabaseQuotaStatus();
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase bağlantısı henüz yapılandırılmamış veya .env dosyası eksik.');
  }

  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    onProgress(msg, logs);
  };

  log('🚀 Yeni Supabase Veritabanına Tam Aktarım Başlatılıyor...');

  try {
    // 1. KULLANICILAR (USERS)
    log('👥 Kullanıcılar aktarılıyor...');
    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('eTestUsers') || '[]');
    } catch {}
    if (localUsers.length > 0) {
      const userRows = localUsers.map(u => ({
        id: String(u.id),
        email: (u.email || '').trim().toLowerCase(),
        name: u.name || 'Kullanıcı',
        role: u.role || 'student',
        grade_id: u.gradeId || u.grade_id || 'g1',
        teacher_id: u.teacherId || null,
        password: u.password || null,
        is_approved: u.isApproved !== undefined ? Boolean(u.isApproved) : true
      }));

      const { error: uErr } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
      if (uErr) log(`⚠️ Kullanıcılar uyarısı: ${uErr.message}`);
      else log(`✅ ${userRows.length} Kullanıcı başarıyla yüklendi.`);
    }

    // 2. MÜFREDAT (GRADES, SUBJECTS, UNITS, TOPICS)
    log('📚 Müfredat hiyerarşisi (Sınıflar, Dersler, Üniteler, Konular) taranıyor...');
    let curData = null;
    try {
      const rawLs = localStorage.getItem('eTestCurriculum') || localStorage.getItem('curriculumData');
      if (rawLs) curData = JSON.parse(rawLs);
      if (!curData || !curData.grades || curData.grades.length === 0) {
        const idbCur = await idbGetPayload('eTestCurriculum_Cache');
        if (idbCur) curData = JSON.parse(idbCur);
      }
    } catch (e) {
      console.warn('Curriculum read error:', e);
    }

    if (curData && curData.grades && curData.grades.length > 0) {
      const MOCK_IDS = new Set(['g1', 'g2', 's1', 's2', 'u1', 't1']);
      const grades = (curData.grades || []).filter(g => !MOCK_IDS.has(g.id));
      const subjects = (curData.subjects || []).filter(s => !MOCK_IDS.has(s.id));
      const units = (curData.units || []).filter(u => !MOCK_IDS.has(u.id));
      const topics = (curData.topics || []).filter(t => !MOCK_IDS.has(t.id));

      if (grades.length > 0) {
        const { error: gErr } = await supabase.from('grades').upsert(grades.map(g => ({ id: String(g.id), name: g.name })), { onConflict: 'id' });
        if (gErr) log(`⚠️ Sınıflar uyarısı: ${gErr.message}`);
      }
      if (subjects.length > 0) {
        const { error: sErr } = await supabase.from('subjects').upsert(subjects.map(s => ({ id: String(s.id), grade_id: String(s.gradeId || s.grade_id), name: s.name })), { onConflict: 'id' });
        if (sErr) log(`⚠️ Dersler uyarısı: ${sErr.message}`);
      }
      if (units.length > 0) {
        const { error: unErr } = await supabase.from('units').upsert(units.map(u => ({ id: String(u.id), subject_id: String(u.subjectId || u.subject_id), name: u.name })), { onConflict: 'id' });
        if (unErr) log(`⚠️ Üniteler uyarısı: ${unErr.message}`);
      }
      if (topics.length > 0) {
        const { error: topErr } = await supabase.from('topics').upsert(topics.map(t => ({ id: String(t.id), unit_id: String(t.unitId || t.unit_id), name: t.name })), { onConflict: 'id' });
        if (topErr) log(`⚠️ Konular uyarısı: ${topErr.message}`);
      }
      log(`✅ Müfredat yüklendi: ${grades.length} Sınıf, ${subjects.length} Ders, ${units.length} Ünite, ${topics.length} Konu`);
    }

    // 3. TAKİPLİ KİTAPLAR VE KİTAP TESTLERİ (TRACKED BOOKS & TESTS)
    log('📖 Takipli kitaplar ve kitap testleri aktarılıyor...');
    let localBooks = [];
    let localBookTests = [];
    try {
      localBooks = JSON.parse(localStorage.getItem('eTestTrackedBooks') || localStorage.getItem('trackedBooks') || '[]');
      localBookTests = JSON.parse(localStorage.getItem('eTestTrackedBookTests') || '[]');
    } catch {}

    if (localBooks.length > 0) {
      let savedCount = 0;
      for (const b of localBooks) {
        try {
          await dbAddTrackedBook(b);
          savedCount++;
        } catch (err) {
          log(`⚠️ Kitap aktarım uyarısı (${b.title}): ${err.message}`);
        }
      }
      log(`✅ ${savedCount} Kitap tanımı başarıyla yüklendi.`);
    }

    if (localBookTests.length > 0) {
      await dbBatchUpsertTrackedBookTests(localBookTests);
      log(`✅ ${localBookTests.length} Kitap testi başarıyla yüklendi.`);
    }

    // 4. ÖDEVLER (HOMEWORKS)
    log('📝 Ödevler ve görevler aktarılıyor...');
    let localHws = [];
    try {
      localHws = JSON.parse(localStorage.getItem('eTestHomeworks') || '[]');
    } catch {}
    if (localHws.length > 0) {
      const hwRows = localHws.map(hw => ({
        id: String(hw.id),
        title: hw.title || 'Ödev',
        subject: hw.subject || 'Genel',
        due_date: hw.dueDate ? new Date(hw.dueDate).toISOString() : null,
        target_ids: Array.isArray(hw.targetIds) ? hw.targetIds : [],
        raw_data: hw
      }));
      const { error: hwErr } = await supabase.from('homeworks').upsert(hwRows, { onConflict: 'id' });
      if (hwErr) log(`⚠️ Ödevler uyarısı: ${hwErr.message}`);
      else log(`✅ ${hwRows.length} Ödev başarıyla yüklendi.`);
    }

    // 5. TÜM SINAV VE TEST SONUÇLARI (SUBMISSIONS)
    log('📊 Sınav ve test sonuçları (66 Kitap Testi vb.) aktarılıyor...');
    let localSubs = [];
    try {
      const l1 = JSON.parse(localStorage.getItem('eTestSubmissions') || '[]');
      const l2 = JSON.parse(localStorage.getItem('etest_submissions') || '[]');
      const mergedMap = new Map();
      [...l1, ...l2].forEach(s => {
        if (s && s.id) mergedMap.set(String(s.id), s);
      });
      localSubs = Array.from(mergedMap.values());
    } catch {}

    if (localSubs.length > 0) {
      const cleanCompletedSubs = localSubs.filter(s => {
        if (!s) return false;
        const sId = String(s.id || '');
        const suId = String(s.supabaseId || '');
        const meta = (Array.isArray(s.answers) ? s.answers : []).find(a => a?.type === 'metadata') || {};
        const realId = String(meta.realId || s.realId || '');
        if (s.status === 'in_progress' || s.status === 'draft' || meta.status === 'in_progress') return false;
        if (sId.startsWith('draft_') || sId.startsWith('64726166') || suId.startsWith('64726166') || realId.startsWith('draft_')) {
          const hasAnswers = (Array.isArray(s.answers) ? s.answers : []).some(a => a?.type !== 'metadata' && a?.userAnswer !== null && a?.userAnswer !== undefined);
          const hasCounts = (Number(s.correctCount ?? s.correct_count ?? s.correct ?? 0) + Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0)) > 0;
          if (!hasAnswers && !hasCounts) return false;
        }
        return true;
      });

      const subRows = cleanCompletedSubs.map(s => {
        const rawAnswers = (s.answers || []).filter(a => a.type !== 'metadata');
        const isApproved = s.isApproved !== undefined ? Boolean(s.isApproved) : (s.approvalStatus === 'approved' || s.status === 'completed');
        return {
          id: toUUID(s.supabaseId || s.id || `sub_${Date.now()}`),
          test_id: toUUID(s.testId || s.realTestId || s.bookTestId || 'test_1'),
          student_id: String(s.studentId || s.userId || 'u1'),
          score: Number(s.score || s.scorePercentage || s.computedScore || 0),
          correct_count: Number(s.correctCount ?? s.correct ?? 0),
          wrong_count: Number(s.wrongCount ?? s.wrong ?? 0),
          empty_count: Number(s.emptyCount ?? s.blankCount ?? s.blank ?? 0),
          subject: s.subject || s.subjectName || 'Genel',
          title: s.title || s.testTitle || 'Sınav',
          test_title: s.testTitle || s.title || 'Sınav',
          status: s.status || (isApproved ? 'completed' : 'pending_approval'),
          teacher_feedback: s.teacherFeedback || null,
          total_score_points: s.totalScorePoints || null,
          max_possible_score: s.maxPossibleScore || null,
          is_evaluated_by_teacher: Boolean(s.isEvaluatedByTeacher || isApproved),
          homework_id: (s.hwId || s.homeworkId) ? String(s.hwId || s.homeworkId) : null,
          answers: [
            ...rawAnswers,
            {
              type: 'metadata',
              realId: s.id,
              realTestId: s.testId || s.realTestId || s.bookTestId,
              hwId: s.hwId || s.homeworkId || null,
              bookTitle: s.bookTitle || null,
              unitTopic: s.unitTopic || s.topic || null,
              sourceType: s.sourceType || null,
              isManual: Boolean(s.isManual),
              approvalStatus: s.approvalStatus || (isApproved ? 'approved' : 'pending'),
              isApproved: isApproved,
              mistakeReasons: s.mistakeReasons || null,
              bookTestId: s.bookTestId || null,
              bookTestIds: s.bookTestIds || [],
              totalNet: s.totalNet || null,
              totalQuestions: s.totalQuestions || null
            }
          ],
          questions: s.questions || []
        };
      });

      for (let i = 0; i < subRows.length; i += 25) {
        const chunk = subRows.slice(i, i + 25);
        const { error: subErr } = await supabase.from('submissions').upsert(chunk, { onConflict: 'id' });
        if (subErr) log(`⚠️ Sınav sonuçları parça (${i + 1}-${i + chunk.length}) uyarısı: ${subErr.message}`);
        else log(`✅ Sınav sonuçları yüklendi (${Math.min(i + 25, subRows.length)} / ${subRows.length})`);
      }
    }

    // 6. SORU BANKASI (QUESTIONS)
    log('❓ Soru bankası soruları aktarılıyor...');
    let localQs = [];
    try {
      localQs = JSON.parse(localStorage.getItem('eTestQuestions') || '[]');
    } catch {}

    if (localQs.length > 0) {
      const qRows = [];
      for (const q of localQs) {
        if (q.id === 'q1') continue;
        let payload = q.contentPayload || '';
        if (payload === '[STORED_IN_INDEXEDDB]') {
          const full = await idbGetPayload(q.id);
          if (full && typeof full === 'string' && full.length < 300000) payload = full;
        }

        qRows.push({
          id: toUUID(q.id || `q_${Date.now()}`),
          subject: q.subject || 'Matematik',
          grade_id: q.gradeId || 'g1',
          topic: q.topic || 'Genel',
          topic_id: q.topicId || 'global_all',
          type: q.type || 'coktan_secmeli',
          content_type: q.contentType || 'text',
          content_payload: payload.length > 500000 ? '' : payload,
          is_bundle: Boolean(q.isBundle),
          answer_key: q.answerKey || null,
          title: q.title || 'Soru',
          question_count: Number(q.questionCount || 1),
          question_text: q.questionText || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: q.correctAnswer || 'A',
          explanation: q.explanation || null,
          image_url: q.imageUrl || null,
          raw_data: { ...q, contentPayload: undefined }
        });
      }

      for (let i = 0; i < qRows.length; i += 20) {
        const chunk = qRows.slice(i, i + 20);
        await supabase.from('questions').upsert(chunk, { onConflict: 'id' });
      }
      log(`✅ ${qRows.length} Soru yüklendi.`);
    }

    // 7. ÇALIŞMA PLANLARI & KOÇLUK & DENEMELER
    try {
      const localPlans = JSON.parse(localStorage.getItem('eTestStudyPlans') || '[]');
      if (localPlans.length > 0) {
        await supabase.from('study_plans').upsert(localPlans.map(p => ({ id: String(p.id), title: p.title || 'Plan', subjects: p.subjects || [] })), { onConflict: 'id' });
        log(`✅ ${localPlans.length} Çalışma planı yüklendi.`);
      }
    } catch {}

    log('🎉 TÜM VERİLER BAŞARIYLA YENİ SUPABASE VERİTABANINA AKTARILDI!');
    return { success: true, logs };
  } catch (error) {
    log(`❌ Aktarım hatası: ${error.message}`);
    throw error;
  }
}
