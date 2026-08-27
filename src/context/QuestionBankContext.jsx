import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetQuestions, dbAddQuestion, dbDeleteQuestion } from '../services/supabaseService';
import { idbSetPayload, idbGetPayload, idbDeletePayload } from '../services/indexedDbService';

const QuestionBankContext = createContext();

export function useQuestionBank() {
  return useContext(QuestionBankContext);
}

const INITIAL_QUESTIONS = [];

export function QuestionBankProvider({ children }) {
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('eTestQuestions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return (parsed || []).filter(q => q.id !== 'q1');
      } catch (e) {
        console.warn('[LocalStorage] Error parsing saved questions:', e);
      }
    }
    return INITIAL_QUESTIONS;
  });

  useEffect(() => {
    async function syncAndRestorePayloads() {
      // 1. Restore full PDF/Image payloads from IndexedDB for questions loaded from localStorage metadata
      const currentQs = questions || [];
      const restored = await Promise.all(currentQs.map(async (q) => {
        let currentPayload = q.contentPayload;
        const needsRestore = !currentPayload || (typeof currentPayload === 'string' && (currentPayload.includes('[STORED_IN_INDEXEDDB]') || currentPayload.includes('[LOCALSTORAGE_CACHE]')));
        if (needsRestore) {
          const candidateKeys = [q.id, String(q.id).replace(/^q_?/, ''), `q_${String(q.id).replace(/^q_?/, '')}`, `q${String(q.id).replace(/^q_?/, '')}`];
          for (const key of candidateKeys) {
            const fullPayload = await idbGetPayload(key);
            if (fullPayload && typeof fullPayload === 'string' && fullPayload.length > 30 && !fullPayload.includes('[STORED_IN_INDEXEDDB]')) {
              currentPayload = fullPayload;
              break;
            }
          }
        }

        let subQs = q.questionsList;
        if (Array.isArray(subQs)) {
          subQs = await Promise.all(subQs.map(async (sq) => {
            if (!sq.contentPayload || sq.contentPayload === '[STORED_IN_INDEXEDDB]' || !sq.imageUrl || sq.imageUrl === '[STORED_IN_INDEXEDDB]') {
              const sqPayload = (sq.id ? await idbGetPayload(sq.id) : null) || (sq.id ? await idbGetPayload(String(sq.id).replace(/^q_?/, '')) : null);
              if (sqPayload && !sqPayload.includes('[STORED_IN_INDEXEDDB]')) {
                return { ...sq, contentPayload: sqPayload, imageUrl: sqPayload };
              }
            }
            return sq;
          }));
        }

        return { ...q, contentPayload: currentPayload, questionsList: subQs };
      }));

      setQuestions(prev => {
        const mergedMap = new Map();
        (restored || []).forEach(q => mergedMap.set(String(q.id), q));
        (prev || []).forEach(q => {
          const existing = mergedMap.get(String(q.id));
          // If current in-memory question has full PDF DataURL, keep it!
          if (!existing || (typeof q.contentPayload === 'string' && q.contentPayload.startsWith('data:'))) {
            mergedMap.set(String(q.id), q);
          }
        });
        return Array.from(mergedMap.values());
      });

      // 2. Safely merge from Supabase database only if cache expired
      const lastSync = sessionStorage.getItem('eTestLastQBSync');
      const now = Date.now();
      if (lastSync && now - Number(lastSync) < 15 * 60 * 1000 && currentQs.length > 0) {
        return;
      }
      const dbQs = await dbGetQuestions();
      if (dbQs && dbQs.length > 0) {
        sessionStorage.setItem('eTestLastQBSync', String(now));
        setQuestions(prev => {
          const mergedMap = new Map();
          (prev || []).forEach(q => mergedMap.set(String(q.id), q));

          dbQs.forEach(dbQ => {
            if (dbQ.id === 'q1') return;

            let existingKey = String(dbQ.id);

            const existing = mergedMap.get(existingKey);
            if (existing) {
              const hasFullLocalPayload = typeof existing.contentPayload === 'string' &&
                existing.contentPayload.length > 500 &&
                !existing.contentPayload.includes('[STORED_IN_INDEXEDDB]') &&
                !existing.contentPayload.includes('[LOCALSTORAGE_CACHE]');

              const dbHasStorageUrl = typeof dbQ.contentPayload === 'string' && dbQ.contentPayload.startsWith('http');

              mergedMap.set(existingKey, {
                ...dbQ,
                ...existing,
                id: existing.id || dbQ.id,
                questionsList: existing.questionsList || dbQ.questionsList || null,
                contentPayload: dbHasStorageUrl ? dbQ.contentPayload :
                                hasFullLocalPayload ? existing.contentPayload :
                                (dbQ.contentPayload || existing.contentPayload)
              });
            } else {
              mergedMap.set(String(dbQ.id), dbQ);
            }
          });
          return Array.from(mergedMap.values());
        });
      }
    }

    syncAndRestorePayloads();
  }, []);

  useEffect(() => {
    try {
      // Store lightweight metadata in LocalStorage (5MB limit).
      // Full PDF/Image DataURLs remain safely stored in React State & IndexedDB.
      const lightweightQuestions = (questions || []).map(q => {
        const copy = { ...q };
        const isHtml = q.contentType === 'html' || q.sourceFormat === 'html' ||
          (typeof q.contentPayload === 'string' && (q.contentPayload.includes('<html') || q.contentPayload.includes('<!DOCTYPE') || q.contentPayload.startsWith('data:text/html')));

        // Strip heavy base64 data to avoid LocalStorage QuotaExceededError
        if (!isHtml) {
          if (typeof copy.contentPayload === 'string' && copy.contentPayload.length > 50000 && copy.contentPayload.startsWith('data:')) {
            copy.contentPayload = '[STORED_IN_INDEXEDDB]';
          }
          if (Array.isArray(copy.imageUrls)) {
            copy.imageUrls = copy.imageUrls.map(u => (typeof u === 'string' && u.length > 50000 && u.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : u));
          }
          if (Array.isArray(copy.questionsList)) {
            copy.questionsList = copy.questionsList.map(sq => ({
              ...sq,
              contentPayload: typeof sq.contentPayload === 'string' && sq.contentPayload.length > 50000 && sq.contentPayload.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : sq.contentPayload,
              imageUrl: typeof sq.imageUrl === 'string' && sq.imageUrl.length > 50000 && sq.imageUrl.startsWith('data:') ? '[STORED_IN_INDEXEDDB]' : sq.imageUrl
            }));
          }
        }
        return copy;
      });
      localStorage.setItem('eTestQuestions', JSON.stringify(lightweightQuestions));
    } catch (err) {
      console.warn('[LocalStorage] QuotaExceededError avoided safely:', err.message);
    }
  }, [questions]);

  const addQuestion = async (questionData) => {
    if (Array.isArray(questionData)) {
      if (questionData.length === 0) return;

      const bundleId = `q${Date.now()}`;
      const firstQ = questionData[0] || {};

      const subQuestions = questionData.map((q, idx) => ({
        id: q.id || `sub_${idx}_${Date.now()}`,
        questionText: q.questionText || q.title || `Soru ${idx + 1}`,
        options: q.options || ['A', 'B', 'C', 'D'],
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
        contentType: q.contentType || firstQ.contentType || 'text',
        contentPayload: q.contentPayload || ''
      }));

      const answerKey = subQuestions.map(q => {
        const idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
        return String.fromCharCode(65 + idx);
      });

      const singleBundleQuestion = {
        id: bundleId,
        title: firstQ.title || `${firstQ.subject || 'Ders'} Toplu Test Paketi (${subQuestions.length} Soru)`,
        topicId: firstQ.topicId || 'global_all',
        subject: firstQ.subject || 'Matematik',
        gradeId: firstQ.gradeId || 'g1',
        contentType: firstQ.contentType || 'json',
        type: firstQ.type || 'coktan_secmeli',
        isBundle: true,
        questionCount: subQuestions.length,
        questionsList: subQuestions,
        answerKey: answerKey,
        contentPayload: JSON.stringify(subQuestions, null, 2)
      };

      if (singleBundleQuestion.contentPayload && singleBundleQuestion.contentPayload.length > 500) {
        const payload = singleBundleQuestion.contentPayload;
        const qId = singleBundleQuestion.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }

      setQuestions(prev => [...prev, singleBundleQuestion]);
      const savedBundle = await dbAddQuestion(singleBundleQuestion);
      if (savedBundle && savedBundle[0]) {
        const row = savedBundle[0];
        setQuestions(prev => prev.map(item => item.id === singleBundleQuestion.id ? { ...item, contentPayload: row.content_payload || item.contentPayload, ...(row.raw_data || {}) } : item));
      }
    } else {
      const isHtmlType = questionData.contentType === 'html';
      const newQuestion = { 
        id: `q_${Date.now()}`, 
        htmlPayload: isHtmlType ? (questionData.contentPayload || questionData.htmlPayload) : questionData.htmlPayload,
        ...questionData 
      };
      if (newQuestion.contentPayload && typeof newQuestion.contentPayload === 'string' && newQuestion.contentPayload.length > 50) {
        const payload = newQuestion.contentPayload;
        const qId = newQuestion.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }
      if (Array.isArray(newQuestion.questionsList)) {
        for (const sq of newQuestion.questionsList) {
          if (sq.id && (sq.contentPayload || sq.imageUrl)) {
            const sqPayload = sq.contentPayload || sq.imageUrl;
            await idbSetPayload(sq.id, sqPayload);
            await idbSetPayload(String(sq.id).replace(/^q_?/, ''), sqPayload);
          }
        }
      }
      setQuestions(prev => [...prev, newQuestion]);
      const savedQ = await dbAddQuestion(newQuestion);
      if (savedQ && savedQ[0]) {
        const row = savedQ[0];
        setQuestions(prev => prev.map(item => item.id === newQuestion.id ? { ...item, contentPayload: row.content_payload || item.contentPayload, imageUrl: row.image_url || item.imageUrl, ...(row.raw_data || {}) } : item));
      }
    }
  };

  const deleteQuestion = async (id) => {
    const targetQ = questions.find(q => q.id === id);
    setQuestions(prev => prev.filter(q => q.id !== id));

    // 1. Delete from IndexedDB (main ID and ID variants)
    await idbDeletePayload(id);
    await idbDeletePayload(String(id).replace(/^q_?/, ''));
    await idbDeletePayload(`q_${id}`);
    await idbDeletePayload(`q${id}`);

    // 2. Delete sub-question payloads if bundle
    if (targetQ && Array.isArray(targetQ.questionsList)) {
      for (const subQ of targetQ.questionsList) {
        if (subQ.id) {
          await idbDeletePayload(subQ.id);
          await idbDeletePayload(String(subQ.id).replace(/^q_?/, ''));
        }
      }
    }

    // 3. Delete from Supabase Database & Storage Bucket ('question_files')
    await dbDeleteQuestion(targetQ || id);
  };

  const updateQuestion = async (id, updatedData) => {
    let updatedQ = null;
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        updatedQ = { ...q, ...updatedData };
        return updatedQ;
      }
      return q;
    }));
    if (updatedQ) {
      if (updatedQ.contentPayload && typeof updatedQ.contentPayload === 'string' && updatedQ.contentPayload.length > 50) {
        const payload = updatedQ.contentPayload;
        const qId = updatedQ.id;
        await idbSetPayload(qId, payload);
        await idbSetPayload(String(qId).replace(/^q_?/, ''), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q_'), payload);
        await idbSetPayload(String(qId).replace(/^q_?/, 'q'), payload);
      }
      if (Array.isArray(updatedQ.questionsList)) {
        for (const sq of updatedQ.questionsList) {
          if (sq.id && (sq.contentPayload || sq.imageUrl)) {
            const sqPayload = sq.contentPayload || sq.imageUrl;
            await idbSetPayload(sq.id, sqPayload);
            await idbSetPayload(String(sq.id).replace(/^q_?/, ''), sqPayload);
          }
        }
      }
      await dbAddQuestion(updatedQ);
    }
  };

  return (
    <QuestionBankContext.Provider value={{
      questions,
      addQuestion,
      updateQuestion,
      deleteQuestion
    }}>
      {children}
    </QuestionBankContext.Provider>
  );
}
