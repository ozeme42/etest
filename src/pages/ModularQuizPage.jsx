import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { Clock3, Trophy, Eye, Home, CheckCircle2 } from 'lucide-react';
import { checkIsAnswerCorrect } from '../utils/answerEvaluation';

import PdfQuizRunner from '../components/quiz/runner/PdfQuizRunner';
import HtmlQuizRunner from '../components/quiz/runner/HtmlQuizRunner';
import ImageQuizRunner from '../components/quiz/runner/ImageQuizRunner';
import StandardQuizRunner from '../components/quiz/runner/StandardQuizRunner';
import PhysicalQuizRunner from '../components/quiz/runner/PhysicalQuizRunner';

import { resolveTestQuestions } from '../utils/testResolver';

export default function ModularQuizPage() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || 'u1';
  const navigate = useNavigate();

  const { homeworks } = useHomework();
  const { addSubmission } = useEvaluation();
  const { data: curriculumData } = useCurriculum();
  const { questions: allBankQuestions } = useQuestionBank();
  const { bookTests } = useTrackedBooks();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    let foundTest = homeworks.find(h => String(h.id) === String(testId));

    if (!foundTest && bookTests) {
      foundTest = bookTests.find(t => String(t.id) === String(testId));
    }

    if (!foundTest && curriculumData?.tests) {
      foundTest = curriculumData.tests.find(t => String(t.id) === String(testId));
    }

    if (!foundTest && allBankQuestions) {
      foundTest = allBankQuestions.find(q => String(q.id) === String(testId));
    }

    if (foundTest) {
      setTest(foundTest);

      const isTrackedBook = Boolean(
        foundTest.sourceType === 'trackedBook' || 
        foundTest.bookId || 
        foundTest.sourceFormat === 'physical'
      );

      if (isTrackedBook) {
        // Resolve questions from bookTests
        let targetBookTests = [];
        if (foundTest.tests && Array.isArray(foundTest.tests) && bookTests) {
          targetBookTests = bookTests.filter(bt => foundTest.tests.includes(bt.id));
        }
        if (targetBookTests.length === 0) {
          targetBookTests = [foundTest];
        }

        const resolvedQs = [];
        let globalQNo = 1;

        targetBookTests.forEach(bt => {
          const qCount = bt.questionCount || 20;
          const ansKey = bt.answerKey || {};

          for (let i = 1; i <= qCount; i++) {
            let letterAns = null;
            let idxAns = null;

            if (Array.isArray(ansKey)) {
              letterAns = ansKey[i - 1];
            } else if (typeof ansKey === 'object') {
              letterAns = ansKey[i] ?? ansKey[String(i)] ?? ansKey[i - 1] ?? ansKey[String(i - 1)];
            } else if (typeof ansKey === 'string') {
              const clean = ansKey.replace(/[^A-Ea-e0-4]/g, '');
              letterAns = clean[i - 1];
            }

            if (letterAns !== null && letterAns !== undefined && letterAns !== '') {
              if (typeof letterAns === 'number') {
                idxAns = letterAns;
                letterAns = String.fromCharCode(65 + idxAns);
              } else if (typeof letterAns === 'string') {
                const str = letterAns.trim().toUpperCase();
                if (/^[A-E]$/.test(str)) {
                  idxAns = str.charCodeAt(0) - 65;
                  letterAns = str;
                } else {
                  const num = Number(str);
                  if (!isNaN(num) && num >= 0 && num <= 4) {
                    idxAns = num;
                    letterAns = String.fromCharCode(65 + num);
                  }
                }
              }
            }

            resolvedQs.push({
              id: `${bt.id || 'bt'}_q${i}`,
              questionNo: globalQNo++,
              testName: bt.name || bt.title || 'Test',
              questionText: `${bt.name || 'Test'} - Soru ${i}`,
              questionCount: 1,
              correctAnswer: idxAns,
              correctAnswerLetter: letterAns
            });
          }
        });

        if (resolvedQs.length === 0 && foundTest.totalQuestions) {
          for (let i = 1; i <= foundTest.totalQuestions; i++) {
            resolvedQs.push({
              id: `hw_q${i}`,
              questionNo: i,
              testName: foundTest.title || 'Kitap Ödevi',
              questionText: `Soru ${i}`,
              questionCount: 1,
              correctAnswer: null,
              correctAnswerLetter: null
            });
          }
        }

        setQuestions(resolvedQs);
      } else {
        const resolved = resolveTestQuestions(foundTest, allBankQuestions);
        setQuestions(resolved);
      }
    }
    setLoading(false);
  }, [testId, homeworks, curriculumData, allBankQuestions, bookTests]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontWeight: 800 }}>
        Sınav Yükleniyor...
      </div>
    );
  }

  if (!test) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', gap: '1rem' }}>
        <h2>Sınav Bulunamadı</h2>
        <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
          Geri Dön
        </button>
      </div>
    );
  }

  const handleSubmit = (formattedAnswers) => {
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    const evaluatedAnswers = formattedAnswers.map((ans, idx) => {
      const qObj = questions[idx] || {};
      const userAns = ans.userAnswer;
      const textVal = ans.userAnswerText;
      const qNo = ans.questionNo || (idx + 1);

      let isCorrect = ans.isCorrect;
      if (userAns !== null && userAns !== undefined && userAns !== '') {
        isCorrect = checkIsAnswerCorrect(userAns, qObj, test, qNo);
      } else if (textVal) {
        isCorrect = null; // Open ended pending
      } else {
        isCorrect = false; // Blank
      }

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false && (userAns !== null && userAns !== undefined && userAns !== '')) wrongCount++;
      else if (isCorrect === null && textVal) pendingCount++;
      else blankCount++;

      return {
        ...ans,
        isCorrect,
        correctAnswer: qObj.correctAnswerLetter || (qObj.correctAnswer !== null && qObj.correctAnswer !== undefined ? String.fromCharCode(65 + qObj.correctAnswer) : null)
      };
    });

    const totalQ = questions.length || test.questionCount || test.totalQuestions || formattedAnswers.length || 1;
    const score = Math.round((correctCount / totalQ) * 100);
    const isAcikUclu = test.questionType === 'acik_uclu' || test.type === 'acik_uclu' || pendingCount > 0;
    const finalStatus = isAcikUclu ? 'pending' : 'completed';
    const newSubId = `sub_${Date.now()}`;

    const submissionData = {
      id: newSubId,
      testId: test.id,
      testTitle: test.title || test.name || 'Sınav',
      studentId: studentId,
      studentName: searchParams.get('studentName') || 'Öğrenci',
      subject: test.subject || test.publisher || 'Genel',
      bookId: test.bookId || null,
      questionsList: questions.map(q => ({
        id: q.id,
        text: q.questionText || q.text || '',
        imageUrl: q.imageUrl || null,
        imageUrls: q.imageUrls || (q.imageUrl ? [q.imageUrl] : []),
        contentPayload: q.contentPayload || null,
        contentType: q.contentType || q.type || test.contentType || test.type || null,
        options: q.options || []
      })),
      contentPayload: test.contentPayload || questions[0]?.contentPayload || null,
      pdfPayload: test.pdfPayload || questions[0]?.pdfPayload || null,
      htmlPayload: test.htmlPayload || questions[0]?.htmlPayload || null,
      imageUrl: test.imageUrl || questions[0]?.imageUrl || null,
      imageUrls: test.imageUrls || questions[0]?.imageUrls || [],
      contentType: test.contentType || test.type || questions[0]?.contentType || questions[0]?.type || null,
      sourceFormat: test.sourceFormat || test.formatType || null,
      isOpenEnded: isAcikUclu,
      answers: evaluatedAnswers,
      correctCount,
      wrongCount,
      blankCount,
      pendingCount,
      totalQuestions: totalQ,
      score,
      status: finalStatus,
      submittedAt: new Date().toISOString()
    };

    addSubmission(submissionData);

    setSubmissionResult({
      submissionId: newSubId,
      isPending: isAcikUclu,
      correctCount,
      wrongCount,
      blankCount,
      pendingCount,
      totalQuestions: totalQ,
      score
    });
  };

  if (submissionResult) {
    if (submissionResult.isPending) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '1.5rem', color: 'white' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)' }}>
              <Clock3 size={44} />
            </div>
            <div>
              <span style={{ padding: '0.35rem 0.75rem', background: '#f59e0b', color: '#0f172a', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✍️ Değerlendirmeye Gönderildi
              </span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.75rem 0 0.5rem 0', color: 'white' }}>
                Cevaplarınız Başarıyla Kaydedildi!
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Bu sınavda açık uçlu / yazılı sorular yer almaktadır. Yanıtlarınız öğretmeninizin değerlendirmesine gönderilmiştir. Puanınız öğretmen değerlendirmesinden sonra açıklanacaktır.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '1rem' }}>
              <button
                onClick={() => navigate(`/quiz-review/${test.id}?studentId=${studentId}`)}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
              >
                <Eye size={18} /> Cevapları İncele
              </button>
              <button
                onClick={() => navigate('/student')}
                style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Home size={18} /> Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '1.5rem', color: 'white' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)' }}>
            <Trophy size={44} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'white' }}>
              Tebrikler! Test Tamamlandı
            </h1>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#34d399', margin: '0.5rem 0' }}>
              %{submissionResult.score} Puan
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', width: '100%', background: '#0f172a', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #334155' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>{submissionResult.correctCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Doğru</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171' }}>{submissionResult.wrongCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Yanlış</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#94a3b8' }}>{submissionResult.blankCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Boş</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '1rem' }}>
            <button
              onClick={() => navigate(`/quiz-review/${test.id}?studentId=${studentId}`)}
              style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#4f46e5', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
            >
              <Eye size={18} /> Detaylı İncele
            </button>
            <button
              onClick={() => navigate('/student')}
              style={{ flex: 1, minWidth: '180px', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', background: '#334155', color: 'white', fontWeight: 900, fontSize: '0.92rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Home size={18} /> Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine Source Format Mode
  const isHtml = Boolean(
    test.htmlPayload ||
    test.sourceFormat === 'html' ||
    test.formatType === 'html' ||
    test.contentType === 'html' ||
    test.type === 'html' ||
    test.questionType === 'html'
  );

  const isPdf = Boolean(
    test.pdfPayload ||
    test.sourceFormat === 'pdf' ||
    test.formatType === 'pdf' ||
    test.contentType === 'pdf' ||
    test.type === 'pdf' ||
    test.questionType === 'pdf'
  );

  // ALWAYS force Physical Optik Grid Form for tracked book homeworks or tests!
  const isPhysical = Boolean(
    test.sourceFormat === 'physical' ||
    test.formatType === 'physical' ||
    test.questionType === 'optik_form' ||
    test.type === 'optik_form' ||
    test.sourceType === 'trackedBook' ||
    test.bookId
  );

  const isImageTest = !isHtml && !isPdf && !isPhysical && (
    test.sourceFormat === 'image' || 
    test.formatType === 'image' || 
    test.questionType === 'gorsel_klasik' || 
    test.contentType === 'gorsel' || 
    test.type === 'gorsel'
  );

  if (isPhysical) {
    return <PhysicalQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isHtml) {
    return <HtmlQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isPdf) {
    return <PdfQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  if (isImageTest) {
    return <ImageQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
  }

  return <StandardQuizRunner test={test} questions={questions} onSubmit={handleSubmit} />;
}
