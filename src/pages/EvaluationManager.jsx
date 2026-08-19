import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import { idbGetPayload } from '../services/indexedDbService';
import { toUUID } from '../services/supabaseService';
import { resolveTestQuestions } from '../utils/testResolver';
import PdfViewerWithControls from '../components/PdfViewerWithControls';
import HtmlViewerWithControls from '../components/HtmlViewerWithControls';
import ImageLightbox from '../components/quiz/common/ImageLightbox';
import {
  CheckCircle2, Search, ArrowLeft, Eye, Edit3, Save, Sparkles, X, CheckCircle, XCircle
} from 'lucide-react';

function resolveExactQuestionCount(item, testObj, bankQ, questionsList = [], images = []) {
  if (Array.isArray(questionsList) && questionsList.length > 0) return questionsList.length;
  if (Array.isArray(images) && images.length > 0) return images.length;
  const c = parseInt(item?.questionCount || testObj?.questionCount || bankQ?.questionCount || item?.totalQuestions || testObj?.totalQuestions || 0, 10);
  if (c > 0) return c;
  const key = item?.answerKey || testObj?.answerKey || bankQ?.answerKey;
  if (Array.isArray(key) && key.length > 0) return key.length;
  if (typeof key === 'string' && key.trim().length > 0) return key.trim().length;
  return 1;
}

function detectSubject(title = '', existingSubject = '') {
  if (existingSubject && !['genel', 'diğer', 'all', ''].includes(String(existingSubject).toLowerCase().trim())) {
    return existingSubject;
  }
  const t = (String(title) + ' ' + String(existingSubject || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Ödevler';
}

function getOpenEndedCategory(sub, hw, allBankQuestions = []) {
  const candidates = [sub, hw].filter(Boolean);

  if (Array.isArray(hw?.sections)) {
    hw.sections.forEach(s => {
      if (s && typeof s === 'object') {
        candidates.push(s);
        if (s.bankQ) candidates.push(s.bankQ);
      }
    });
  }

  const refIds = new Set([
    ...(Array.isArray(hw?.questionIds) ? hw.questionIds : []),
    ...(Array.isArray(hw?.tests) ? hw.tests : []),
    ...(Array.isArray(hw?.selectedQuestions) ? hw.selectedQuestions : []),
    ...(Array.isArray(hw?.sections) ? hw.sections.map(s => typeof s === 'object' ? (s.id || s.questionId || s.bankQ?.id) : s) : []),
    ...(Array.isArray(sub?.questionIds) ? sub.questionIds : []),
    ...(Array.isArray(sub?.tests) ? sub.tests : []),
    ...(Array.isArray(sub?.answers) ? sub.answers.map(a => a?.questionId) : []),
    sub?.testId, sub?.homeworkId, sub?.hwId, sub?.questionId, hw?.questionId, hw?.testId
  ].filter(Boolean).map(String));

  refIds.forEach(id => {
    const cleanId = id.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
    const foundList = (allBankQuestions || []).filter(q =>
      String(q.id) === id ||
      String(q.id).replace(/^q_?/, '') === cleanId ||
      String(q.questionId) === id ||
      String(q.testId) === id
    );
    foundList.forEach(found => {
      if (!candidates.includes(found)) candidates.push(found);
    });
  });

  const targetTitle = (sub?.testTitle || sub?.title || hw?.title || '').trim().toLowerCase();
  if (targetTitle) {
    const titleMatches = (allBankQuestions || []).filter(q =>
      (q.title && q.title.trim().toLowerCase() === targetTitle) ||
      (q.name && q.name.trim().toLowerCase() === targetTitle)
    );
    titleMatches.forEach(tm => {
      if (!candidates.includes(tm)) candidates.push(tm);
    });
  }

  if (Array.isArray(sub?.answers)) {
    sub.answers.forEach(a => {
      if (a && typeof a === 'object') candidates.push(a);
    });
  }

  // 1. PDF Kontrolü
  const isPdf = candidates.some(o => {
    if (!o) return false;
    if (o.pdfPayload || o.pdfUrl) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.documentType || '').toLowerCase();
    if (ct.includes('pdf')) return true;
    if (typeof o.contentPayload === 'string' && (o.contentPayload.includes('.pdf') || o.contentPayload.startsWith('data:application/pdf') || o.contentPayload.startsWith('%PDF'))) return true;
    return false;
  });

  const titles = candidates.map(o => String(o.title || o.testTitle || o.name || '')).join(' ').toLowerCase();
  if (isPdf || titles.includes('.pdf') || titles.includes('pdf sınav') || titles.includes('pdf ödev') || titles.includes('pdf kitapçık') || titles.includes('pdf testi') || titles.includes('(pdf)')) {
    return 'pdf';
  }

  // 2. HTML Kontrolü
  const isHtml = candidates.some(o => {
    if (!o) return false;
    if (o.htmlPayload || o.htmlUrl) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.documentType || '').toLowerCase();
    if (ct.includes('html')) return true;
    if (typeof o.contentPayload === 'string' && (o.contentPayload.includes('<html') || o.contentPayload.includes('<!DOCTYPE') || o.contentPayload.startsWith('data:text/html'))) return true;
    return false;
  });

  if (isHtml || titles.includes('.html') || titles.includes('html sınav') || titles.includes('html ödev') || titles.includes('web testi') || titles.includes('html testi') || titles.includes('(html)')) {
    return 'html';
  }

  // 3. Görsel Kontrolü
  const isImage = candidates.some(o => {
    if (!o) return false;
    if (o.imageUrl && o.imageUrl !== '[STORED_IN_INDEXEDDB]') return true;
    if (Array.isArray(o.imageUrls) && o.imageUrls.length > 0) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.questionType || '').toLowerCase();
    if (ct.includes('gorsel') || ct.includes('image')) return true;
    return false;
  });

  if (isImage || titles.includes('görsel') || titles.includes('resimli') || titles.includes('görselli') || titles.includes('fotoğraf')) {
    return 'image';
  }

  return 'text';
}

const CATEGORY_META = {
  text: { label: 'Yazılı / Metin', icon: '📝', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  image: { label: 'Görselli Soru', icon: '🖼️', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  pdf: { label: 'PDF Sınavı', icon: '📄', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  html: { label: 'HTML Sınavı', icon: '🌐', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
};

const QUICK_FEEDBACK_PRESETS = [
  '👏 Çözüm yöntemi ve açıklama harika, tam puan!',
  '💡 Çözüm doğru ancak işlem adımlarına dikkat edilmeli.',
  '✍️ Açıklama biraz eksik kalmış, formülü belirtmelisin.',
  '⚠️ Yanlış formül veya kavram kullanılmış, tekrar gözden geçir.',
  '🌟 Gayet başarılı, tebrikler!'
];

// Helper to determine if a question item is Open-Ended / Written
function isItemOpenEnded(item, ans) {
  if (ans?.userAnswerText && String(ans.userAnswerText).trim().length > 0) return true;
  if (!item) return false;
  if (item.isOpenEnded === true || item.openEnded === true) return true;
  const qType = String(item.questionType || item.type || item.contentType || item.formatType || '').toLowerCase();
  if (['acik_uclu', 'yazili', 'gorsel_klasik'].includes(qType)) return true;
  const title = String(item.title || item.name || item.questionText || item.text || '').toLowerCase();
  if (title.includes('açık uçlu') || title.includes('acik uclu') || title.includes('yazılı') || title.includes('yazili') || title.includes('klasik')) return true;
  if (Array.isArray(item.options) && item.options.length > 0 && !item.isOpenEnded) return false;
  return false;
}

// Helper to validate whether a payload string is a valid non-placeholder string
function isValidPayloadString(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length === 0) return false;
  if (s === '[STORED_IN_INDEXEDDB]' || s === '[LOCALSTORAGE_CACHE]') return false;
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── SIMPLE & UNIFIED EVALUATION MODAL (TÜM SINAV DOKÜMANI + D/Y/B NOTLAMA) ───
// ══════════════════════════════════════════════════════════════════════════════
function SmartEvaluationModal({ submission, allBankQuestions, homeworks, curriculumData, bookTests, books, onClose, onSaveSuccess }) {
  const { updateSubmission } = useEvaluation();
  const { updateHomeworkSubmission } = useHomework();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active section for multi-section exams
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Local Grading States: { [qNo]: { status: 'correct'|'wrong'|'blank'|'half'|'custom', isCorrect: boolean, isBlank: boolean, score: number } }
  const [questionEvals, setQuestionEvals] = useState({});
  const [teacherNotes, setTeacherNotes] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Filter in question evaluation panel ('all' | 'oe' | 'pending')
  const [filterMode, setFilterMode] = useState('all');

  const targetId = String(submission.testId || submission.homeworkId || submission.questionId || submission.id || '');
  const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

  useEffect(() => {
    let isMounted = true;

    async function loadTestData() {
      setLoading(true);

      let foundHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(submission.id)))
      );

      let foundBankQ = (allBankQuestions || []).find(q =>
        String(q.id) === targetId ||
        String(q.id) === normTargetId ||
        String(q.questionId) === targetId ||
        String(q.id) === String(foundHw?.questionId || foundHw?.testId)
      );

      let titleMatchBankQ = (allBankQuestions || []).find(q =>
        submission.testTitle && q.title &&
        String(q.title).toLowerCase().trim() === String(submission.testTitle).toLowerCase().trim()
      );

      let foundBookTest = (bookTests || []).find(bt =>
        String(bt.id) === targetId ||
        String(bt.id) === normTargetId ||
        toUUID(bt.id) === targetId
      );

      let foundCurTest = (curriculumData?.tests || []).find(t =>
        String(t.id) === targetId ||
        String(t.id) === normTargetId
      );

      let resolved = foundHw || foundBankQ || titleMatchBankQ || foundBookTest || foundCurTest || null;

      let contentPayload = isValidPayloadString(submission.contentPayload) ? submission.contentPayload : (isValidPayloadString(resolved?.contentPayload) ? resolved.contentPayload : null);
      let pdfPayload = isValidPayloadString(submission.pdfPayload) ? submission.pdfPayload : (isValidPayloadString(resolved?.pdfPayload) ? resolved.pdfPayload : null);
      let htmlPayload = isValidPayloadString(submission.htmlPayload) ? submission.htmlPayload : (isValidPayloadString(resolved?.htmlPayload) ? resolved.htmlPayload : null);

      if (!contentPayload && !pdfPayload && !htmlPayload) {
        const rawCandidateIds = [
          targetId, normTargetId, submission.id, submission.testId,
          submission.homeworkId, submission.questionId, resolved?.id,
          resolved?.questionId, resolved?.testId, foundHw?.id,
          foundHw?.questionId, foundBankQ?.id, titleMatchBankQ?.id
        ];

        const expandedIds = new Set();
        rawCandidateIds.filter(Boolean).forEach(id => {
          const str = String(id);
          const clean = str.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
          expandedIds.add(str);
          expandedIds.add(clean);
          expandedIds.add(`q_${clean}`);
          expandedIds.add(`hw_${clean}`);
          expandedIds.add(`test_${clean}`);
        });

        for (const cid of expandedIds) {
          try {
            const val = await idbGetPayload(cid);
            if (isValidPayloadString(val)) {
              contentPayload = val;
              if (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF')) {
                pdfPayload = val;
              } else if (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html')) {
                htmlPayload = val;
              }
              break;
            }
          } catch (e) {}
        }
      }

      if (contentPayload && !pdfPayload && (contentPayload.startsWith('data:application/pdf') || contentPayload.includes('.pdf') || contentPayload.startsWith('%PDF'))) {
        pdfPayload = contentPayload;
      }
      if (contentPayload && !htmlPayload && (contentPayload.includes('<html') || contentPayload.startsWith('<!DOCTYPE') || contentPayload.startsWith('data:text/html'))) {
        htmlPayload = contentPayload;
      }

      let sections = resolved?.sections || resolved?.tests || null;
      let generatedQuestions = [];

      if (Array.isArray(sections) && sections.length > 0) {
        const mappedSections = [];
        let runningQIndex = 0;

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const secQId = typeof sec === 'object' ? (sec.questionId || sec.id) : sec;
          const secBankQ = (allBankQuestions || []).find(q => String(q.id) === String(secQId));
          let secPayload = isValidPayloadString(sec?.contentPayload) ? sec.contentPayload : (isValidPayloadString(secBankQ?.contentPayload) ? secBankQ.contentPayload : null);
          if (!secPayload) {
            secPayload = await idbGetPayload(secQId);
            if (!isValidPayloadString(secPayload)) secPayload = null;
          }

          const secResolvedQs = secBankQ ? resolveTestQuestions(secBankQ, allBankQuestions) : [];
          const secImages = (secBankQ?.imageUrls && Array.isArray(secBankQ.imageUrls)) ? secBankQ.imageUrls : [];
          const secCount = resolveExactQuestionCount(sec, secBankQ, secBankQ, secResolvedQs, secImages);

          const secPdf = (isValidPayloadString(secBankQ?.pdfPayload) ? secBankQ.pdfPayload : null) || (secPayload && (secPayload.startsWith('data:application/pdf') || secPayload.includes('.pdf')) ? secPayload : null) || pdfPayload;
          const secHtml = (isValidPayloadString(secBankQ?.htmlPayload) ? secBankQ.htmlPayload : null) || (secPayload && secPayload.includes('<html') ? secPayload : null) || htmlPayload;
          const isSecOE = isItemOpenEnded(secBankQ) || isItemOpenEnded(sec);

          for (let qIdx = 0; qIdx < secCount; qIdx++) {
            runningQIndex++;
            const existingQ = secResolvedQs[qIdx] || {};
            const qImg = secImages[qIdx] || (secImages.length === 1 ? secImages[0] : null) || existingQ.imageUrl || null;

            generatedQuestions.push({
              ...existingQ,
              id: existingQ.id || `${secQId}_q${qIdx + 1}`,
              globalIndex: runningQIndex,
              questionNo: runningQIndex,
              subIndex: qIdx,
              sectionIndex: i,
              sectionTitle: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
              sectionId: secQId,
              title: existingQ.title || existingQ.name || existingQ.questionText || `${sec?.title || `${i+1}. Bölüm`} — Soru ${qIdx + 1}`,
              questionText: existingQ.questionText || (secCount === 1 ? (secBankQ?.questionText || sec?.title) : `Soru ${qIdx + 1}`),
              pdfPayload: secPdf,
              htmlPayload: secHtml,
              imageUrl: qImg,
              imageUrls: secImages,
              isOpenEnded: isSecOE || isItemOpenEnded(existingQ),
              options: existingQ.options || ['A', 'B', 'C', 'D'],
              answerKey: existingQ.answerKey || (secBankQ?.answerKey ? secBankQ.answerKey[qIdx] : null)
            });
          }

          mappedSections.push({
            id: secQId || `sec_${i}`,
            title: sec?.title || secBankQ?.title || `${i + 1}. Bölüm`,
            bankQ: secBankQ ? { ...secBankQ, contentPayload: secPayload || secBankQ.contentPayload } : { id: secQId, title: sec?.title },
            questions: secResolvedQs,
            questionCount: secCount,
            contentPayload: secPayload,
            pdfPayload: secPdf,
            htmlPayload: secHtml,
            imageUrls: secImages,
            isOpenEnded: isSecOE
          });
        }
        sections = mappedSections;
      } else {
        const baseResolvedQs = resolveTestQuestions(resolved || submission, allBankQuestions);
        const ansList = Array.isArray(submission.answers) ? submission.answers : [];
        const baseImages = (resolved?.imageUrls && Array.isArray(resolved.imageUrls)) ? resolved.imageUrls : [];
        
        const exactCount = Math.max(
          resolveExactQuestionCount(resolved || {}, resolved || {}, resolved || {}, baseResolvedQs, baseImages),
          ansList.length,
          parseInt(submission.totalQuestions || resolved?.questionCount || 0, 10) || 0,
          1
        );

        const isSingleOE = isItemOpenEnded(resolved) || isItemOpenEnded(submission);

        for (let i = 0; i < exactCount; i++) {
          const existingQ = baseResolvedQs[i] || baseResolvedQs[0] || {};
          const ans = ansList[i] || {};
          const qImg = baseImages[i] || (baseImages.length === 1 ? baseImages[0] : null) || existingQ.imageUrl || (exactCount === 1 ? resolved?.imageUrl : null) || null;

          generatedQuestions.push({
            ...existingQ,
            id: existingQ.id ? `${existingQ.id}_q${i + 1}` : `q_${i + 1}`,
            globalIndex: i + 1,
            questionNo: i + 1,
            subIndex: i,
            sectionIndex: 0,
            sectionTitle: submission.testTitle || resolved?.title || 'Sınav',
            title: existingQ.title || existingQ.name || existingQ.questionText || `Soru ${i + 1}`,
            questionText: existingQ.questionText && exactCount === 1 ? existingQ.questionText : `Soru ${i + 1}`,
            pdfPayload: existingQ.pdfPayload || pdfPayload,
            htmlPayload: existingQ.htmlPayload || htmlPayload,
            imageUrl: qImg,
            imageUrls: baseImages,
            isOpenEnded: isSingleOE || isItemOpenEnded(existingQ, ans),
            options: existingQ.options || ['A', 'B', 'C', 'D'],
            answerKey: existingQ.answerKey || (resolved?.answerKey ? resolved.answerKey[i] : null)
          });
        }
      }

      const finalTestObj = {
        ...(resolved || {}),
        id: targetId,
        title: submission.testTitle || resolved?.title || resolved?.name || 'Sınav İncelemesi',
        contentType: submission.contentType || resolved?.contentType || (pdfPayload ? 'pdf' : (htmlPayload ? 'html' : 'standard')),
        sourceFormat: submission.sourceFormat || resolved?.sourceFormat || 'standard',
        contentPayload,
        pdfPayload,
        htmlPayload,
        imageUrl: submission.imageUrl || resolved?.imageUrl || null,
        imageUrls: submission.imageUrls || resolved?.imageUrls || [],
        sections,
        questionCount: generatedQuestions.length || 1
      };

      if (isMounted) {
        setTest(finalTestObj);
        setQuestions(generatedQuestions);

        const evals = {};
        const notes = {};
        const qCount = Math.max(1, generatedQuestions.length);
        for (let i = 1; i <= qCount; i++) {
          const ans = (submission.answers || []).find(a => (a.questionNo || i) === i) || (submission.answers || [])[i - 1];
          const qObj = generatedQuestions[i - 1] || {};
          const isOE = isItemOpenEnded(qObj, ans);

          if (ans) {
            notes[i] = ans.teacherNote || '';
            if (ans.isCorrect === true) {
              evals[i] = {
                status: 'correct',
                isCorrect: true,
                isBlank: false,
                score: ans.score !== undefined ? Number(ans.score) : 10
              };
            } else if (ans.isCorrect === false) {
              const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
              if (isB && !isOE) {
                evals[i] = {
                  status: 'blank',
                  isCorrect: false,
                  isBlank: true,
                  score: 0
                };
              } else {
                evals[i] = {
                  status: 'wrong',
                  isCorrect: false,
                  isBlank: false,
                  score: 0
                };
              }
            } else {
              if (ans.score !== undefined && ans.score !== null) {
                const s = Number(ans.score);
                evals[i] = {
                  status: s >= 10 ? 'correct' : (s >= 5 ? 'half' : (s === 0 ? 'wrong' : 'custom')),
                  isCorrect: s >= 5,
                  isBlank: false,
                  score: s
                };
              } else {
                evals[i] = {
                  status: null,
                  isCorrect: null,
                  isBlank: false,
                  score: 0
                };
              }
            }
          } else {
            evals[i] = {
              status: null,
              isCorrect: null,
              isBlank: false,
              score: 0
            };
            notes[i] = '';
          }
        }

        setQuestionEvals(evals);
        setTeacherNotes(notes);
        setOverallFeedback(submission.teacherFeedback || submission.teacherNote || '');
        setLoading(false);
      }
    }

    loadTestData();
    return () => { isMounted = false; };
  }, [submission, targetId, normTargetId, allBankQuestions, homeworks, curriculumData, bookTests]);

  const globalMedia = useMemo(() => {
    const isPdfStr = (val) => isValidPayloadString(val) && (val.startsWith('data:application/pdf') || val.includes('.pdf') || val.startsWith('%PDF'));
    const isHtmlStr = (val) => isValidPayloadString(val) && (val.includes('<html') || val.startsWith('<!DOCTYPE') || val.startsWith('data:text/html'));

    let pdfSrc = null;
    if (isPdfStr(test?.pdfPayload)) pdfSrc = test.pdfPayload;
    else if (isPdfStr(test?.contentPayload)) pdfSrc = test.contentPayload;
    else if (test?.pdfUrl) pdfSrc = test.pdfUrl;

    let htmlSrc = null;
    if (!pdfSrc) {
      if (isHtmlStr(test?.htmlPayload)) htmlSrc = test.htmlPayload;
      else if (isHtmlStr(test?.contentPayload)) htmlSrc = test.contentPayload;
    }

    return { hasPdf: Boolean(pdfSrc), hasHtml: Boolean(htmlSrc), pdfSrc, htmlSrc };
  }, [test]);

  const activeSection = test?.sections && test.sections[activeSectionIndex];
  const activePdf = activeSection?.pdfPayload || activeSection?.bankQ?.pdfPayload || (activeSection?.contentPayload && (activeSection.contentPayload.startsWith('data:application/pdf') || activeSection.contentPayload.includes('.pdf')) ? activeSection.contentPayload : null) || globalMedia.pdfSrc;
  const activeHtml = activeSection?.htmlPayload || activeSection?.bankQ?.htmlPayload || (activeSection?.contentPayload && activeSection.contentPayload.includes('<html') ? activeSection.contentPayload : null) || globalMedia.htmlSrc;
  const activeImages = activeSection?.imageUrls || activeSection?.bankQ?.imageUrls || (activeSection?.imageUrl ? [activeSection.imageUrl] : []) || (test?.imageUrls && test.imageUrls.length > 0 ? test.imageUrls : (test?.imageUrl ? [test.imageUrl] : []));
  const activeTitle = activeSection?.title || test?.title || 'Sınav Dokümanı';

  const scoreStats = useMemo(() => {
    const totalQ = Math.max(1, questions.length);
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let unevaluatedCount = 0;
    let oeCount = 0;
    let mcCount = 0;
    let totalPoints = 0;

    questions.forEach((qObj, idx) => {
      const qNo = qObj.questionNo || (idx + 1);
      const isOE = qObj.isOpenEnded;
      if (isOE) oeCount++;
      else mcCount++;

      const ev = questionEvals[qNo] || {};
      if (ev.status === 'correct') {
        correctCount++;
        totalPoints += (ev.score !== undefined ? ev.score : 10);
      } else if (ev.status === 'half') {
        correctCount++;
        totalPoints += (ev.score !== undefined ? ev.score : 5);
      } else if (ev.status === 'wrong') {
        wrongCount++;
        totalPoints += (ev.score || 0);
      } else if (ev.status === 'blank') {
        blankCount++;
      } else if (ev.status === 'custom') {
        if (ev.score >= 5) correctCount++;
        else wrongCount++;
        totalPoints += (ev.score || 0);
      } else {
        unevaluatedCount++;
      }
    });

    const maxPoints = totalQ * 10;
    const percentage = maxPoints > 0 ? Math.min(100, Math.round((totalPoints / maxPoints) * 100)) : 0;

    return {
      totalQ,
      oeCount,
      mcCount,
      correctCount,
      wrongCount,
      blankCount,
      unevaluatedCount,
      totalPoints,
      maxPoints,
      percentage
    };
  }, [questions, questionEvals]);

  const setQuestionStatus = (qNo, status, customScore = null) => {
    setQuestionEvals(prev => {
      let isCorrect = false;
      let isBlank = false;
      let score = 0;

      if (status === 'correct') {
        isCorrect = true;
        isBlank = false;
        score = customScore !== null ? customScore : 10;
      } else if (status === 'wrong') {
        isCorrect = false;
        isBlank = false;
        score = 0;
      } else if (status === 'blank') {
        isCorrect = false;
        isBlank = true;
        score = 0;
      } else if (status === 'half') {
        isCorrect = true;
        isBlank = false;
        score = 5;
      } else if (status === 'custom') {
        score = Math.max(0, Math.min(10, customScore || 0));
        isCorrect = score >= 5;
        isBlank = false;
      }

      return {
        ...prev,
        [qNo]: {
          status,
          isCorrect,
          isBlank,
          score
        }
      };
    });
  };

  const handleSaveEvaluation = async () => {
    if (isSaving || !submission) return;
    setIsSaving(true);

    try {
      const { totalQ, percentage, totalPoints, maxPoints, correctCount, wrongCount, blankCount } = scoreStats;

      const updatedAnswers = questions.map((qObj, idx) => {
        const qNo = qObj.questionNo || (idx + 1);
        const originalAns = (submission.answers || []).find(a => (a.questionNo || (idx + 1)) === qNo) || (submission.answers || [])[idx] || {};
        const qEval = questionEvals[qNo] || {};

        const isCorrect = qEval.status === 'correct' || (qEval.score >= 5) || (qEval.isCorrect === true);
        const isBlank = qEval.status === 'blank' || (qEval.isBlank === true);
        const score = qEval.score !== undefined ? qEval.score : (isCorrect ? 10 : 0);
        const note = teacherNotes[qNo] || originalAns.teacherNote || '';

        return {
          ...originalAns,
          questionNo: qNo,
          isCorrect,
          score,
          teacherNote: note,
          evaluatedAt: new Date().toISOString()
        };
      });

      const updatedSubPayload = {
        ...submission,
        answers: updatedAnswers,
        correctCount,
        wrongCount,
        emptyCount: blankCount,
        blankCount,
        totalQuestions: totalQ,
        score: percentage,
        scorePercentage: percentage,
        rawScore: totalPoints,
        maxScore: maxPoints,
        status: 'evaluated',
        isEvaluatedByTeacher: true,
        teacherFeedback: overallFeedback,
        teacherNote: overallFeedback,
        evaluatedAt: new Date().toISOString()
      };

      await updateSubmission(submission.id, updatedSubPayload);

      if (submission.homeworkId || submission.hwId) {
        const hwId = submission.homeworkId || submission.hwId;
        try {
          await updateHomeworkSubmission(hwId, submission.id, updatedSubPayload);
        } catch (e) {}
      }

      if (onSaveSuccess) onSaveSuccess(updatedSubPayload);
      onClose();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !test) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800 }}>
        <Sparkles size={22} className="animate-spin" style={{ marginRight: 10, color: '#6366f1' }} />
        Sınav ve Değerlendirme Dokümanı Yükleniyor...
      </div>
    );
  }

  const filteredQuestions = questions.filter(q => {
    if (filterMode === 'oe') return q.isOpenEnded;
    if (filterMode === 'pending') {
      const ev = questionEvals[q.questionNo];
      return !ev || ev.status === null;
    }
    return true;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Soru Görseli" onClose={() => setLightboxSrc(null)} />
      )}

      {/* ── TOP CONTROL BAR ── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        zIndex: 20
      }}>
        {/* Left: Back & Student/Exam Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: '#f1f5f9', border: '1.5px solid #cbd5e1',
              borderRadius: '0.65rem', padding: '0.45rem 0.85rem',
              color: '#334155', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Kapat & Geri
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{
              background: '#eff6ff', color: '#2563eb',
              padding: '0.2rem 0.6rem', borderRadius: 99, fontWeight: 900, fontSize: '0.78rem',
              border: '1px solid #bfdbfe'
            }}>
              🎓 {submission.studentName || 'Öğrenci'}
            </span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
              {submission.testTitle || test.title}
            </span>
          </div>
        </div>

        {/* Center: Live Summary Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: '0.65rem', padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span style={{
              fontSize: '1.05rem', fontWeight: 900,
              color: scoreStats.percentage >= 70 ? '#16a34a' : (scoreStats.percentage >= 50 ? '#d97706' : '#dc2626')
            }}>
              %{scoreStats.percentage} Başarı
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
              ({scoreStats.totalPoints}/{scoreStats.maxPoints} P)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 800 }}>
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ✓ {scoreStats.correctCount} D
            </span>
            <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ✗ {scoreStats.wrongCount} Y
            </span>
            <span style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
              ○ {scoreStats.blankCount} B
            </span>
            {scoreStats.unevaluatedCount > 0 && (
              <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
                ⏳ {scoreStats.unevaluatedCount} Bekliyor
              </span>
            )}
          </div>
        </div>

        {/* Right: Save Action Button */}
        <button
          type="button"
          onClick={handleSaveEvaluation}
          disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1.15rem',
            color: 'white', fontWeight: 900, fontSize: '0.82rem',
            cursor: isSaving ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
          }}
        >
          <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Bitir ✓'}
        </button>
      </header>

      {/* ── MAIN UNIFIED BODY (SIDE BY SIDE: DOCUMENT & QUESTIONS) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 60px)', background: '#0f172a' }}>
        
        {/* ══════════ LEFT PANE: EXAM / DOCUMENT VIEWER (60%) ══════════ */}
        <div style={{
          flex: '1 1 60%',
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1.5px solid #334155',
          background: '#ffffff',
          overflow: 'hidden'
        }}>
          {/* Section Switcher Tabs (If Multi-Section Exam) */}
          {Array.isArray(test.sections) && test.sections.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginRight: 4 }}>
                📑 Bölümler:
              </span>
              {test.sections.map((sec, sIdx) => {
                const isActive = activeSectionIndex === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setActiveSectionIndex(sIdx)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      border: isActive ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                      background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {sec.isOpenEnded ? '✍️' : '📝'} {sec.title || `${sIdx + 1}. Bölüm`}
                    <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({sec.questionCount || 1} Soru)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Media Container */}
          <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
            {activePdf ? (
              <PdfViewerWithControls payload={activePdf} title={activeTitle} height="100%" />
            ) : activeHtml ? (
              <HtmlViewerWithControls payload={activeHtml} title={activeTitle} height="100%" />
            ) : activeImages.length > 0 ? (
              <div style={{ height: '100%', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                {activeImages.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} style={{ maxWidth: '850px', width: '100%', background: '#f8fafc', borderRadius: '0.85rem', padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed' }}>
                      <span>🖼️ Sayfa / Soru Görseli {imgIdx + 1}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>🔍 Büyütmek için tıkla</span>
                    </div>
                    <img
                      src={imgUrl}
                      alt={`Doküman Görseli ${imgIdx + 1}`}
                      style={{ width: '100%', height: 'auto', maxHeight: '680px', objectFit: 'contain', borderRadius: '0.5rem', display: 'block', cursor: 'zoom-in' }}
                      onClick={() => setLightboxSrc(imgUrl)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback Standard Question Cards */
              <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((qItem, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.85rem',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0284c7', marginBottom: '0.5rem' }}>
                      ❓ Soru {qItem.questionNo || (idx + 1)}: {qItem.title || ''}
                    </div>
                    {qItem.questionText && (
                      <div style={{ fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {qItem.questionText}
                      </div>
                    )}
                    {qItem.imageUrl && (
                      <img
                        src={qItem.imageUrl}
                        alt="Soru Görseli"
                        style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '0.5rem', marginBottom: '0.5rem', cursor: 'zoom-in' }}
                        onClick={() => setLightboxSrc(qItem.imageUrl)}
                      />
                    )}
                    {Array.isArray(qItem.options) && qItem.options.length > 0 && !qItem.isOpenEnded && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {qItem.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ fontSize: '0.78rem', background: '#ffffff', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#4f46e5', marginRight: 4 }}>{String.fromCharCode(65 + oIdx)})</strong> {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT PANE: QUESTIONS & NOTLAMA (D / Y / B) (40%) ══════════ */}
        <div style={{
          flex: '0 0 40%',
          minWidth: '380px',
          maxWidth: '520px',
          height: '100%',
          overflowY: 'auto',
          background: '#f8fafc',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxSizing: 'border-box'
        }}>
          {/* Right Header & Filters */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '0.85rem',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                🎯 Notlama Listesi ({questions.length} Soru)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                  background: filterMode === 'all' ? '#4f46e5' : '#f1f5f9',
                  color: filterMode === 'all' ? '#fff' : '#64748b',
                  fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                Tümü
              </button>
              {scoreStats.oeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('oe')}
                  style={{
                    padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                    background: filterMode === 'oe' ? '#d97706' : '#f1f5f9',
                    color: filterMode === 'oe' ? '#fff' : '#64748b',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  ✍️ Yazılı ({scoreStats.oeCount})
                </button>
              )}
              {scoreStats.unevaluatedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('pending')}
                  style={{
                    padding: '0.2rem 0.55rem', borderRadius: '0.4rem', border: 'none',
                    background: filterMode === 'pending' ? '#dc2626' : '#f1f5f9',
                    color: filterMode === 'pending' ? '#fff' : '#64748b',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  ⏳ Bekleyen ({scoreStats.unevaluatedCount})
                </button>
              )}
            </div>
          </div>

          {/* Question Cards List with D / Y / B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredQuestions.map((qItem, idx) => {
              const qNo = qItem.questionNo || (idx + 1);
              const ans = (submission.answers || []).find(a => (a.questionNo || (idx + 1)) === qNo) || (submission.answers || [])[idx] || {};
              const ev = questionEvals[qNo] || {};
              const isOE = qItem.isOpenEnded;

              // Student answer string
              let studentAnsText = null;
              if (isOE) {
                studentAnsText = ans.userAnswerText || '(Yazılı yanıt verilmedi - Boş)';
              } else if (ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '') {
                if (typeof ans.userAnswer === 'number') {
                  studentAnsText = `Şık ${String.fromCharCode(65 + ans.userAnswer)}`;
                } else {
                  studentAnsText = `Şık ${ans.userAnswer}`;
                }
              } else {
                studentAnsText = 'Boş Bırakıldı';
              }

              // Answer key string
              let correctKeyText = null;
              if (!isOE && qItem.answerKey !== undefined && qItem.answerKey !== null && qItem.answerKey !== '') {
                if (typeof qItem.answerKey === 'number') {
                  correctKeyText = `Şık ${String.fromCharCode(65 + qItem.answerKey)}`;
                } else {
                  correctKeyText = `Şık ${qItem.answerKey}`;
                }
              }

              return (
                <div
                  key={qNo}
                  style={{
                    background: '#ffffff',
                    border: ev.status === 'correct' ? '1.5px solid #86efac' : (ev.status === 'wrong' ? '1.5px solid #fca5a5' : (ev.status === 'half' ? '1.5px solid #fcd34d' : '1.5px solid #e2e8f0')),
                    borderRadius: '0.85rem',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Card Header: Soru No & Type & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        background: isOE ? '#fef3c7' : '#eff6ff',
                        color: isOE ? '#b45309' : '#1d4ed8',
                        border: isOE ? '1px solid #fde68a' : '1px solid #bfdbfe',
                        padding: '0.15rem 0.5rem', borderRadius: '0.45rem', fontWeight: 900, fontSize: '0.78rem'
                      }}>
                        {isOE ? '✍️ Soru' : '📋 Soru'} #{qNo}
                      </span>
                      {qItem.sectionTitle && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                          {qItem.sectionTitle}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      padding: '0.15rem 0.55rem', borderRadius: 99, fontWeight: 900, fontSize: '0.72rem',
                      background: ev.status === 'correct' ? '#dcfce7' : (ev.status === 'wrong' ? '#fee2e2' : (ev.status === 'half' ? '#fef3c7' : (ev.status === 'blank' ? '#f1f5f9' : '#fef9c3'))),
                      color: ev.status === 'correct' ? '#15803d' : (ev.status === 'wrong' ? '#b91c1c' : (ev.status === 'half' ? '#b45309' : (ev.status === 'blank' ? '#475569' : '#854d0e'))),
                      border: `1px solid ${ev.status === 'correct' ? '#bbf7d0' : (ev.status === 'wrong' ? '#fecaca' : (ev.status === 'half' ? '#fde68a' : (ev.status === 'blank' ? '#e2e8f0' : '#fef08a')))}`
                    }}>
                      {ev.status === 'correct' ? '✓ Doğru (10P)' : (ev.status === 'wrong' ? '✗ Yanlış (0P)' : (ev.status === 'half' ? '½ Yarım (5P)' : (ev.status === 'blank' ? '○ Boş (0P)' : (ev.status === 'custom' ? `${ev.score} Puan` : '⏳ Değerlendirilmedi'))))}
                    </span>
                  </div>

                  {/* Student Response Display */}
                  {isOE ? (
                    <div style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '0.55rem', padding: '0.6rem 0.75rem'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '0.25rem' }}>
                        📝 Öğrencinin Yazılı Yanıtı:
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {studentAnsText}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '0.55rem', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>Öğrenci Yanıtı: </span>
                        <strong style={{ color: ans.userAnswer !== null && ans.userAnswer !== undefined && ans.userAnswer !== '' ? '#0f172a' : '#94a3b8' }}>
                          {studentAnsText}
                        </strong>
                      </div>
                      {correctKeyText && (
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>Cevap Anahtarı: </span>
                          <strong style={{ color: '#10b981' }}>{correctKeyText}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 3 QUICK ACTION BUTTONS: DOĞRU (✓), YANLIŞ (✗), BOŞ (○) ── */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                    gap: '0.35rem',
                    marginTop: '0.25rem'
                  }}>
                    {/* DOĞRU (D) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'correct')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'correct' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                        background: ev.status === 'correct' ? '#16a34a' : '#f0fdf4',
                        color: ev.status === 'correct' ? '#ffffff' : '#15803d',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'correct' ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✓ Doğru (D)
                    </button>

                    {/* YANLIŞ (Y) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'wrong')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'wrong' ? '2px solid #dc2626' : '1px solid #fecaca',
                        background: ev.status === 'wrong' ? '#dc2626' : '#fef2f2',
                        color: ev.status === 'wrong' ? '#ffffff' : '#b91c1c',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'wrong' ? '0 2px 8px rgba(220,38,38,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✗ Yanlış (Y)
                    </button>

                    {/* BOŞ (B) */}
                    <button
                      type="button"
                      onClick={() => setQuestionStatus(qNo, 'blank')}
                      style={{
                        padding: '0.45rem 0.3rem',
                        borderRadius: '0.55rem',
                        border: ev.status === 'blank' ? '2px solid #64748b' : '1px solid #cbd5e1',
                        background: ev.status === 'blank' ? '#64748b' : '#f8fafc',
                        color: ev.status === 'blank' ? '#ffffff' : '#475569',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        boxShadow: ev.status === 'blank' ? '0 2px 8px rgba(100,116,139,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ○ Boş (B)
                    </button>

                    {/* YARIM PUAN (Only for Open-Ended) */}
                    {isOE && (
                      <button
                        type="button"
                        onClick={() => setQuestionStatus(qNo, 'half')}
                        style={{
                          padding: '0.45rem 0.3rem',
                          borderRadius: '0.55rem',
                          border: ev.status === 'half' ? '2px solid #d97706' : '1px solid #fde68a',
                          background: ev.status === 'half' ? '#d97706' : '#fffbeb',
                          color: ev.status === 'half' ? '#ffffff' : '#b45309',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.2rem',
                          boxShadow: ev.status === 'half' ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ½ Yarım (5P)
                      </button>
                    )}
                  </div>

                  {/* Teacher Feedback Note for this Question */}
                  <input
                    type="text"
                    placeholder={`Soru #${qNo} için öğretmen geri bildirim notu...`}
                    value={teacherNotes[qNo] || ''}
                    onChange={e => setTeacherNotes(prev => ({ ...prev, [qNo]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '0.5rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.76rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Overall Exam Feedback & Message */}
          <div style={{
            background: '#ffffff',
            borderRadius: '0.85rem',
            padding: '0.85rem',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              💬 Sınavın Geneli İçin Öğrenciye Karne Mesajı:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {QUICK_FEEDBACK_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setOverallFeedback(preset)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.2rem 0.5rem', borderRadius: 99, cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows="2"
              placeholder="Öğrencinin bu sınavdaki genel performansı ve tavsiyeleriniz..."
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.55rem',
                background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a',
                fontSize: '0.78rem', outline: 'none', resize: 'none', boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={handleSaveEvaluation}
              disabled={isSaving}
              style={{
                marginTop: '0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: '0.65rem', padding: '0.65rem',
                color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
              }}
            >
              <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet & Tamamla ✓'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── MAIN EVALUATION MANAGER LIST PAGE ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function EvaluationManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();
  const { data: curriculumData } = useCurriculum();
  const { bookTests, books } = useTrackedBooks();

  const [formatTab, setFormatTab] = useState('all');
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [activeSubmission, setActiveSubmission] = useState(null);

  const openEndedSubmissions = useMemo(() => {
    const activeHws = (homeworks || []).filter(hw => hw && hw.id);
    const map = new Map();

    const isBookTaskOrBookTest = (item) => {
      if (!item) return false;
      if (item.bookId || item.bookTestId || item.isBookTask || item.isBookTest) return true;
      const sId = String(item.id || '');
      const tId = String(item.testId || '');
      const hwId = String(item.homeworkId || item.hwId || '');
      if (sId.startsWith('bt_') || sId.startsWith('book_') || sId.startsWith('tbt_')) return true;
      if (tId.startsWith('bt_') || tId.startsWith('book_') || tId.startsWith('tbt_')) return true;
      if (hwId.startsWith('bt_') || hwId.startsWith('book_') || hwId.startsWith('tbt_')) return true;
      return false;
    };

    activeHws.forEach(hw => {
      if (isBookTaskOrBookTest(hw)) return;

      (hw.submissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        if (isBookTaskOrBookTest(sub)) return;

        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        map.set(subKey, {
          ...sub,
          id: subKey,
          homeworkId: hw.id,
          hwId: hw.id,
          testId: hw.id,
          testTitle: hw.title,
          subject: hw.subject,
          totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
          submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
        });
      });

      (allSubmissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        if (isBookTaskOrBookTest(sub)) return;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.id || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
        
        const matchesHw = String(hw.id) === targetId ||
          String(hw.id) === normTargetId ||
          String(hw.id) === String(sub.hwId) ||
          String(hw.id) === String(sub.homeworkId) ||
          (hw.submissions && hw.submissions.some(s => String(s.id) === String(sub.id)));

        if (matchesHw) {
          const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
          const existing = map.get(subKey);
          if (!existing || (sub.isEvaluatedByTeacher && !existing.isEvaluatedByTeacher) || new Date(sub.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
            map.set(subKey, {
              ...sub,
              id: subKey,
              homeworkId: hw.id,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
              submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
            });
          }
        }
      });
    });

    (allSubmissions || []).forEach(sub => {
      if (!sub || !sub.studentId) return;
      if (isBookTaskOrBookTest(sub)) return;

      const subKey = String(sub.id || `sub_${Date.now()}`);
      if (!map.has(subKey)) {
        map.set(subKey, sub);
      }
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  const enrichedSubmissions = useMemo(() => {
    return openEndedSubmissions.map(sub => {
      let studentName = sub.studentName;
      const sId = String(sub.studentId || sub.userId || sub.user_id || '');
      if (!studentName || studentName === 'Öğrenci' || !studentName.trim()) {
        const matchedUser = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
        if (matchedUser && matchedUser.name) {
          studentName = matchedUser.name;
        } else if (sId) {
          studentName = `Öğrenci (#${sId.slice(-4)})`;
        } else {
          studentName = 'Öğrenci';
        }
      }

      let targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.questionId || sub.id || '');
      let normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      let matchedHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
      );

      let title = sub.testTitle || sub.homeworkTitle || sub.title;
      if (!title || ['sınav', 'test', 'ödev'].includes(String(title).trim().toLowerCase())) {
        if (matchedHw?.title) title = matchedHw.title;
        else title = 'Açık Uçlu Ödev';
      }

      let subject = detectSubject(title, sub.subject || matchedHw?.subject);

      let score = sub.score;
      if (score !== undefined && score !== null) {
        score = Math.max(0, Math.min(100, Math.round(Number(score))));
      }

      const isAlreadyEvaluated = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      const isPending = !isAlreadyEvaluated;
      const category = getOpenEndedCategory(sub, matchedHw, allBankQuestions);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        score,
        isPending,
        isAlreadyEvaluated,
        category,
        matchedHw
      };
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [openEndedSubmissions, users, homeworks, allBankQuestions]);

  const filteredSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (formatTab !== 'all' && sub.category !== formatTab) return false;
      if (statusTab === 'pending' && !sub.isPending) return false;
      if (statusTab === 'completed' && sub.isPending) return false;

      const q = search.toLowerCase().trim();
      if (q) {
        const sName = String(sub.studentName || '').toLowerCase();
        const tTitle = String(sub.testTitle || '').toLowerCase();
        if (!sName.includes(q) && !tTitle.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSubmissions, formatTab, statusTab, search]);

  const counts = useMemo(() => {
    return {
      all: enrichedSubmissions.length,
      text: enrichedSubmissions.filter(s => s.category === 'text').length,
      image: enrichedSubmissions.filter(s => s.category === 'image').length,
      pdf: enrichedSubmissions.filter(s => s.category === 'pdf').length,
      html: enrichedSubmissions.filter(s => s.category === 'html').length,
      pending: enrichedSubmissions.filter(s => s.isPending).length,
      completed: enrichedSubmissions.filter(s => !s.isPending).length
    };
  }, [enrichedSubmissions]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '1.5rem 2rem 5rem 2rem', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── UNIFIED SMART EVALUATION MODAL ── */}
      {activeSubmission && (
        <SmartEvaluationModal
          submission={activeSubmission}
          allBankQuestions={allBankQuestions}
          homeworks={homeworks}
          curriculumData={curriculumData}
          bookTests={bookTests}
          books={books}
          onClose={() => setActiveSubmission(null)}
          onSaveSuccess={() => {
            setActiveSubmission(null);
          }}
        />
      )}

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              borderRadius: '0.65rem', padding: '0.5rem 0.95rem',
              color: '#334155', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <ArrowLeft size={16} /> Panel
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✍️</span> Açık Uçlu Sınav & Ödev Değerlendirme
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Öğrenci sınav kağıtlarını ve ödev yanıtlarını standart inceleme ekranında doğrudan puanlayın
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {counts.pending > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.4rem 0.85rem', borderRadius: 99, fontWeight: 900, fontSize: '0.8rem' }}>
              ⏳ {counts.pending} Ödev Notlama Bekliyor
            </span>
          )}
        </div>
      </div>

      {/* ── 4 KATEGORİ SEKMELERİ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setFormatTab('all')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'all' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
            background: formatTab === 'all' ? '#ffffff' : '#ffffff',
            boxShadow: formatTab === 'all' ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'all' ? '#4f46e5' : '#334155' }}>Tüm Ödevler</span>
          </div>
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('text')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'text' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
            background: formatTab === 'text' ? '#eff6ff' : '#ffffff',
            boxShadow: formatTab === 'text' ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'text' ? '#2563eb' : '#334155' }}>Yazılı / Metin</span>
          </div>
          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.text}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('image')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'image' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
            background: formatTab === 'image' ? '#faf5ff' : '#ffffff',
            boxShadow: formatTab === 'image' ? '0 4px 12px rgba(124, 58, 237, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🖼️</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'image' ? '#7c3aed' : '#334155' }}>Görselli Soru</span>
          </div>
          <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.image}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('pdf')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'pdf' ? '2px solid #dc2626' : '1.5px solid #e2e8f0',
            background: formatTab === 'pdf' ? '#fef2f2' : '#ffffff',
            boxShadow: formatTab === 'pdf' ? '0 4px 12px rgba(220, 38, 38, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'pdf' ? '#dc2626' : '#334155' }}>PDF Sınavları</span>
          </div>
          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.pdf}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('html')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'html' ? '2px solid #059669' : '1.5px solid #e2e8f0',
            background: formatTab === 'html' ? '#ecfdf5' : '#ffffff',
            boxShadow: formatTab === 'html' ? '0 4px 12px rgba(5, 150, 105, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'html' ? '#059669' : '#334155' }}>HTML Sınavları</span>
          </div>
          <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.html}
          </span>
        </button>
      </div>

      {/* Durum & Arama Filtresi */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'all' ? '#334155' : '#f8fafc',
              color: statusTab === 'all' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'pending' ? '#d97706' : '#f8fafc',
              color: statusTab === 'pending' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ⏳ Bekleyenler ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('completed')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'completed' ? '#059669' : '#f8fafc',
              color: statusTab === 'completed' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ✅ Tamamlananlar ({counts.completed})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Öğrenci veya ödev ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '0.5rem', background: '#f8fafc',
              border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: '1.25rem', padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
          <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>
            {statusTab === 'pending' ? 'Tebrikler! Değerlendirme Bekleyen Açık Uçlu Ödev Yok' : 'Bu Kategoride Ödev Bulunamadı'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            {statusTab === 'pending' ? 'Tüm açık uçlu ödev teslimleri başarıyla sonuçlandırılmıştır.' : 'Seçili filtre ve kategoriye uygun açık uçlu ödev kaydı bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredSubmissions.map(sub => {
            const cardMeta = CATEGORY_META[sub.category] || CATEGORY_META.text;

            return (
              <div
                key={sub.id}
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${sub.isPending ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: '1rem',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                    🎓 {sub.studentName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      background: cardMeta.bg, color: cardMeta.color,
                      border: `1px solid ${cardMeta.border}`,
                      padding: '2px 7px', borderRadius: 6, fontWeight: 800, fontSize: '0.7rem'
                    }}>
                      {cardMeta.icon} {cardMeta.label}
                    </span>
                    <span style={{
                      background: sub.isPending ? '#fef3c7' : '#ecfdf5',
                      color: sub.isPending ? '#b45309' : '#047857',
                      border: `1px solid ${sub.isPending ? '#fde68a' : '#a7f3d0'}`,
                      padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.72rem'
                    }}>
                      {sub.isPending ? '⏳ Bekliyor' : `%${sub.score || 0}`}
                    </span>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.4 }}>
                  {sub.testTitle}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    📚 {sub.subject}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveSubmission(sub)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: sub.isPending ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #059669, #10b981)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.95rem',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} /> {sub.isPending ? 'Puanla & Değerlendir' : 'İncele'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
