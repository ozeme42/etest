import { supabase, isSupabaseConfigured, resetSupabaseQuotaStatus } from '../lib/supabase';
import { toUUID } from './supabaseService';
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

  log('🚀 Yeni Supabase Veritabanına Aktarım Başlatılıyor...');

  try {
    // 1. KULLANICILAR (USERS)
    log('👥 Kullanıcılar aktarılıyor...');
    const localUsers = JSON.parse(localStorage.getItem('eTestUsers') || '[]');
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
    log('📚 Müfredat hiyerarşisi aktarılıyor...');
    const rawCur = localStorage.getItem('eTestCurriculum') || localStorage.getItem('curriculumData');
    if (rawCur) {
      const curData = JSON.parse(rawCur);
      if (curData?.grades?.length > 0) {
        await supabase.from('grades').upsert(curData.grades.map(g => ({ id: String(g.id), name: g.name })), { onConflict: 'id' });
      }
      if (curData?.subjects?.length > 0) {
        await supabase.from('subjects').upsert(curData.subjects.map(s => ({ id: String(s.id), grade_id: String(s.gradeId || s.grade_id), name: s.name })), { onConflict: 'id' });
      }
      if (curData?.units?.length > 0) {
        await supabase.from('units').upsert(curData.units.map(u => ({ id: String(u.id), subject_id: String(u.subjectId || u.subject_id), name: u.name })), { onConflict: 'id' });
      }
      if (curData?.topics?.length > 0) {
        await supabase.from('topics').upsert(curData.topics.map(t => ({ id: String(t.id), unit_id: String(t.unitId || t.unit_id), name: t.name })), { onConflict: 'id' });
      }
      log('✅ Müfredat sınıfları, dersleri ve konuları yüklendi.');
    }

    // 3. ÖDEVLER (HOMEWORKS)
    log('📝 Ödevler ve test görevleri aktarılıyor...');
    const localHws = JSON.parse(localStorage.getItem('eTestHomeworks') || '[]');
    if (localHws.length > 0) {
      const hwRows = localHws.map(hw => ({
        id: String(hw.id),
        title: hw.title || 'Ödev',
        subject: hw.subject || 'Genel',
        description: hw.description || null,
        due_date: hw.dueDate ? new Date(hw.dueDate).toISOString() : null,
        grade_id: hw.gradeId || null,
        target_ids: Array.isArray(hw.targetIds) ? hw.targetIds : [],
        is_book_assignment: Boolean(hw.isBookAssignment),
        book_id: hw.bookId ? String(hw.bookId) : null,
        raw_data: hw
      }));

      const { error: hwErr } = await supabase.from('homeworks').upsert(hwRows, { onConflict: 'id' });
      if (hwErr) log(`⚠️ Ödevler uyarısı: ${hwErr.message}`);
      else log(`✅ ${hwRows.length} Ödev kaydı başarıyla yüklendi.`);
    }

    // 4. SINAV VE TEST SONUÇLARI (SUBMISSIONS)
    log('📊 Sınav ve test sonuçları (66 Kitap Testi vb.) aktarılıyor...');
    const rawSubs = localStorage.getItem('eTestSubmissions') || localStorage.getItem('etest_submissions') || '[]';
    const localSubs = JSON.parse(rawSubs);
    if (localSubs.length > 0) {
      const subRows = localSubs.map(s => {
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

      // Upload in chunks of 25
      for (let i = 0; i < subRows.length; i += 25) {
        const chunk = subRows.slice(i, i + 25);
        const { error: subErr } = await supabase.from('submissions').upsert(chunk, { onConflict: 'id' });
        if (subErr) log(`⚠️ Sınav sonuçları parça (${i + 1}-${i + chunk.length}) uyarısı: ${subErr.message}`);
        else log(`✅ Sınav sonuçları aktarıldı (${Math.min(i + 25, subRows.length)} / ${subRows.length})`);
      }
    }

    // 5. SORU BANKASI (QUESTIONS)
    log('❓ Soru bankası soruları aktarılıyor...');
    const localQs = JSON.parse(localStorage.getItem('eTestQuestions') || '[]');
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
        const { error: qErr } = await supabase.from('questions').upsert(chunk, { onConflict: 'id' });
        if (qErr) log(`⚠️ Soru bankası parça (${i + 1}-${i + chunk.length}) uyarısı: ${qErr.message}`);
        else log(`✅ Sorular aktarıldı (${Math.min(i + 20, qRows.length)} / ${qRows.length})`);
      }
    }

    // 6. TAKİPLİ KİTAPLAR (TRACKED BOOKS)
    log('📖 Takipli kitaplar aktarılıyor...');
    const localBooks = JSON.parse(localStorage.getItem('eTestTrackedBooks') || localStorage.getItem('trackedBooks') || '[]');
    if (localBooks.length > 0) {
      const bookRows = localBooks.map(b => ({
        id: String(b.id),
        title: b.title || 'Kitap',
        subject: b.subject || null,
        grade_id: b.gradeId || null,
        total_tests: Number(b.totalTests || 0),
        total_questions: Number(b.totalQuestions || 0),
        raw_data: b
      }));
      await supabase.from('tracked_books').upsert(bookRows, { onConflict: 'id' });
      log(`✅ ${bookRows.length} Takipli kitap yüklendi.`);
    }

    // 7. FİZİKİ DENEME SINAVLARI (MOCK EXAMS)
    const localExams = JSON.parse(localStorage.getItem('eTestMockExams') || '[]');
    if (localExams.length > 0) {
      const examRows = localExams.map(m => ({
        id: String(m.id),
        student_id: String(m.studentId || 'u1'),
        title: m.title || 'Deneme',
        subject: m.subject || 'Genel',
        scores: m.scores || {},
        date: m.date ? new Date(m.date).toISOString() : new Date().toISOString()
      }));
      await supabase.from('mock_exams').upsert(examRows, { onConflict: 'id' });
      log(`✅ ${examRows.length} Deneme sınavı yüklendi.`);
    }

    log('🎉 TÜM VERİLER BAŞARIYLA YENİ SUPABASE VERİTABANINA AKTARILDI!');
    return { success: true, logs };
  } catch (error) {
    log(`❌ Aktarım hatası: ${error.message}`);
    throw error;
  }
}
