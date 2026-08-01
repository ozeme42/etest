import { useState, useMemo } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, HelpCircle, Save, Clock3, Eye, FileText, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import './Dashboard.css';

export default function EvaluationManager() {
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions, evaluateAnswer, finalizeSubmission } = useEvaluation();
  const { questions } = useQuestionBank();
  
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // Filter submissions: Teachers see ONLY their added students' submissions, Admin sees all
  const submissions = useMemo(() => {
    if (currentUser?.role === 'admin') return allSubmissions || [];
    const teacherStudentIds = (users || []).filter(u => u.role === 'student' && u.teacherId === currentUser?.id).map(u => u.id);
    const teacherHwIds = (homeworks || []).filter(h => h.assignedBy === currentUser?.id).map(h => h.id);
    return (allSubmissions || []).filter(sub => teacherStudentIds.includes(sub.studentId) || teacherHwIds.includes(sub.testId));
  }, [allSubmissions, users, homeworks, currentUser]);

  const pendingSubmissions = submissions.filter(sub => sub.status === 'pending_evaluation');
  const completedSubmissions = submissions.filter(sub => sub.status === 'completed');

  const activeSubmission = submissions.find(s => s.id === activeSubmissionId);

  // Show ONLY open-ended / written response answers for teacher evaluation
  const allSubmissionAnswers = activeSubmission 
    ? (activeSubmission.answers || []).filter(ans => ans.type !== 'coktan_secmeli' && (ans.userAnswerText !== undefined || ans.type === 'acik_uclu' || ans.isCorrect === null)) 
    : [];
  
  const remainingPendingCount = allSubmissionAnswers.filter(ans => ans.isCorrect === null || ans.isCorrect === undefined).length;

  const handleEvaluate = (ans, isCorrectResult) => {
    evaluateAnswer(activeSubmissionId, ans.questionId, ans.isBundle, ans.subIndex, isCorrectResult);
  };

  const handleFinalize = () => {
    finalizeSubmission(activeSubmissionId);
    setActiveSubmissionId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0B1120] dark:via-[#0d1528] dark:to-[#0B1120] font-sans text-slate-800 dark:text-slate-200">
      
      {/* ── STICKY GLASS HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0d1528]/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Clock3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">E-Test LMS</span>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                Değerlendirme Merkezi ⚖️
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 font-bold text-xs">
              {pendingSubmissions.length} Bekleyen Kağıt
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── LEFT SIDE: SUBMISSIONS LIST ── */}
          <div className={`w-full lg:w-5/12 space-y-6 ${activeSubmissionId ? 'hidden lg:block' : 'block'}`}>
            
            {/* Pending Evaluation Section */}
            <section className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-rose-500" /> Bekleyen Değerlendirmeler
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-black text-xs">
                  {pendingSubmissions.length}
                </span>
              </div>

              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  🎉 Harika! Bekleyen kağıt bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSubmissions.map(sub => {
                    const isActive = activeSubmissionId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        onClick={() => setActiveSubmissionId(sub.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500"
                            : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {sub.studentName?.charAt(0) || 'Ö'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">{sub.studentName}</p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{sub.testTitle}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-xl shrink-0">
                          Bekliyor ➔
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Completed Submissions Section */}
            <section className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-5 space-y-3 shadow-sm opacity-90">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Sonuçlandırılan Sınavlar
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black text-xs">
                  {completedSubmissions.length}
                </span>
              </div>

              {completedSubmissions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  Henüz sonuçlandırılan test yok.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {completedSubmissions.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setActiveSubmissionId(sub.id)}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{sub.studentName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{sub.testTitle}</p>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl shrink-0">
                        {sub.score} Puan
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* ── RIGHT SIDE: EVALUATION GRADING PANEL ── */}
          <div className={`w-full lg:w-7/12 sticky top-20 ${!activeSubmissionId ? 'hidden lg:block' : 'block'}`}>
            {activeSubmission ? (
              <div className="bg-white dark:bg-slate-800/80 rounded-3xl border-2 border-indigo-500 p-5 sm:p-6 space-y-5 shadow-xl">
                
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <button
                      onClick={() => setActiveSubmissionId(null)}
                      className="lg:hidden mb-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Kağıt Listesine Dön
                    </button>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                      {activeSubmission.studentName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{activeSubmission.testTitle} Kağıdı</p>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-black text-xs shrink-0">
                    Kalan Soru: {remainingPendingCount} / {allSubmissionAnswers.length}
                  </span>
                </div>

                {/* Answers Grading List */}
                {allSubmissionAnswers.length > 0 ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {allSubmissionAnswers.map((ans, idx) => {
                      const q = questions.find(q => q.id === ans.questionId);
                      if (!q) return null;

                      let displayQuestionText = q.questionText || 'Açık Uçlu Soru';
                      let subItemPayload = null;

                      if ((q.contentType === 'json' || q.questionsList) && ans.subIndex !== undefined) {
                        let subQuestions = q.questionsList || [];
                        if (!subQuestions.length && q.contentPayload) {
                          try {
                            const parsed = JSON.parse(q.contentPayload);
                            if (Array.isArray(parsed)) subQuestions = parsed;
                          } catch (e) {
                            subQuestions = [];
                          }
                        }
                        if (subQuestions[ans.subIndex]) {
                          displayQuestionText = subQuestions[ans.subIndex].questionText || `Soru ${ans.subIndex + 1}`;
                          subItemPayload = subQuestions[ans.subIndex].contentPayload;
                        }
                      }

                      const isEvaluated = ans.isCorrect !== null;
                      const isCorrectVal = ans.isCorrect === true;

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            isEvaluated
                              ? isCorrectVal
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500"
                                : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500"
                              : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              Soru {ans.subIndex !== undefined ? ans.subIndex + 1 : idx + 1}:
                            </span>
                            {isEvaluated && (
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full text-white flex items-center gap-1 ${isCorrectVal ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                {isCorrectVal ? <><CheckCircle className="w-3 h-3" /> Doğru (+10)</> : <><XCircle className="w-3 h-3" /> Yanlış (0)</>}
                              </span>
                            )}
                          </div>

                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                            {displayQuestionText}
                          </p>

                          {/* Image for Visual Question */}
                          {(subItemPayload || q.contentPayload) && (q.contentType === 'gorsel' || subItemPayload) && (
                            <div className="my-2 text-center">
                              <img
                                src={subItemPayload || q.contentPayload}
                                alt="Soru Görseli"
                                className="max-h-60 mx-auto rounded-xl border border-slate-200 dark:border-slate-700 object-contain"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 block">Öğrencinin Cevabı:</span>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 min-h-[50px] whitespace-pre-wrap">
                              {ans.userAnswerText || <span className="italic text-slate-400">(Boş Bırakılmış)</span>}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleEvaluate(ans, true)}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                isCorrectVal
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{isCorrectVal ? 'Doğru Verildi' : 'Doğru (+10)'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEvaluate(ans, false)}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                isEvaluated && !isCorrectVal
                                  ? "bg-rose-600 text-white shadow-md"
                                  : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white"
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{(isEvaluated && !isCorrectVal) ? 'Yanlış Verildi' : 'Yanlış (0)'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={handleFinalize}
                      className={`w-full py-3 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        remainingPendingCount === 0 ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Sonucu Kaydet ve Öğrenciye Bildir</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-black text-base text-slate-900 dark:text-white">Tüm Sorular Değerlendirildi!</h4>
                    <p className="text-xs text-slate-400">Öğrencinin kağıdını sonuçlandırmak için onaylayın.</p>
                    <button
                      onClick={handleFinalize}
                      className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Sonucu Kaydet ve Yayınla
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/60 p-12 text-center text-slate-400">
                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">İncelemek için sol taraftan bir sınav kağıdı seçin.</p>
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
