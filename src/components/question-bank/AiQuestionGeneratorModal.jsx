import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, X, Upload, FileText, CheckCircle2, AlertCircle,
  Plus, Trash2, Edit3, ArrowRight, ArrowLeft, RotateCcw,
  BookOpen, Layers, Key, Check, HelpCircle, Eye, RefreshCw, FolderTree
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { dbGetUserAiApiKey, dbSaveUserAiApiKey } from '../../services/supabaseService';
import { generateQuestionsWithGemini, extractTextFromPdf, getAvailableGeminiModels, DEFAULT_GEMINI_MODELS } from '../../services/aiQuestionService';

export default function AiQuestionGeneratorModal({
  isOpen,
  onClose,
  onSaveQuestions,
  defaultSubject = 'Matematik',
  defaultSubjectId = '',
  defaultGrade = '8. Sınıf',
  defaultGradeId = '',
  defaultTopic = '',
  defaultTopicId = '',
  defaultUnitId = '',
  curData = { grades: [], subjects: [], units: [], topics: [] },
  availableGrades = [],
  availableSubjects = [],
  availableUnits = [],
  availableTopics = []
}) {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const userId = currentUser?.id || 'guest_teacher';

  // Step 1: Config & Input | Step 2: Review & Edit Studio
  const [step, setStep] = useState(1);

  // API Key & Model (Kişiye ve Öğretmene Özel)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(`gemini_api_key_${userId}`) || localStorage.getItem('gemini_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [availableModelOptions, setAvailableModelOptions] = useState(DEFAULT_GEMINI_MODELS);

  // Curriculum State
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  // Custom text inputs if not found in curriculum
  const [customGrade, setCustomGrade] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  // Question Config
  const [difficulty, setDifficulty] = useState('Orta');
  const [questionCount, setQuestionCount] = useState(5);
  const [optionCount, setOptionCount] = useState(4);
  const [questionType, setQuestionType] = useState('coktan_secmeli'); // 'coktan_secmeli' | 'acik_uclu'
  const [includeExplanation, setIncludeExplanation] = useState(true);

  // Source Type: 'text' | 'pdf' | 'topic_only'
  const [sourceType, setSourceType] = useState('text');
  const [sourceText, setSourceText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedPdfText, setExtractedPdfText] = useState('');

  // Generation & Review State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [packageTitle, setPackageTitle] = useState('');

  const fileInputRef = useRef(null);

  const allGrades = curData.grades?.length ? curData.grades : availableGrades;
  const allSubjects = curData.subjects?.length ? curData.subjects : availableSubjects;
  const allUnits = curData.units?.length ? curData.units : availableUnits;
  const allTopics = curData.topics?.length ? curData.topics : availableTopics;

  // Load teacher's personal private API Key from Supabase on mount / user change
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;
    async function loadTeacherKey() {
      try {
        const cloudKey = await dbGetUserAiApiKey(currentUser.id);
        if (isMounted && cloudKey) {
          setApiKey(cloudKey);
          setShowKeyInput(false);
        } else if (isMounted && !apiKey) {
          setShowKeyInput(true);
        }
      } catch (err) {
        console.warn('[AiModal] Error loading user API key:', err);
      }
    }
    loadTeacherKey();
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  // Initialize and sync selections from default props
  useEffect(() => {
    if (!isOpen) return;

    // 1. Resolve Grade
    let gId = defaultGradeId;
    if (!gId && defaultGrade) {
      const foundG = allGrades.find(g => g.name.toLowerCase() === defaultGrade.toLowerCase() || g.id === defaultGrade);
      if (foundG) gId = foundG.id;
    }
    if (!gId && allGrades.length > 0) gId = allGrades[0].id;
    setSelectedGradeId(gId || '');
    setCustomGrade(defaultGrade || (allGrades.find(g => g.id === gId)?.name) || '8. Sınıf');

    // 2. Resolve Subject
    let sId = defaultSubjectId;
    if (!sId && defaultSubject) {
      const foundS = allSubjects.find(s => s.name.toLowerCase() === defaultSubject.toLowerCase() && (!gId || s.gradeId === gId));
      if (foundS) sId = foundS.id;
    }
    if (!sId) {
      const gradeSubs = allSubjects.filter(s => !gId || s.gradeId === gId);
      if (gradeSubs.length > 0) sId = gradeSubs[0].id;
    }
    setSelectedSubjectId(sId || '');
    setCustomSubject(defaultSubject || (allSubjects.find(s => s.id === sId)?.name) || 'Matematik');

    // 3. Resolve Unit
    let uId = defaultUnitId;
    if (!uId && sId) {
      const subUnits = allUnits.filter(u => u.subjectId === sId);
      if (subUnits.length > 0) uId = subUnits[0].id;
    }
    setSelectedUnitId(uId || '');

    // 4. Resolve Topic
    let tId = defaultTopicId;
    if (!tId && defaultTopic && uId) {
      const foundT = allTopics.find(t => t.name.toLowerCase() === defaultTopic.toLowerCase() && t.unitId === uId);
      if (foundT) tId = foundT.id;
    }
    setSelectedTopicId(tId || '');
    setCustomTopic(defaultTopic || '');
  }, [isOpen, defaultGradeId, defaultGrade, defaultSubjectId, defaultSubject, defaultUnitId, defaultTopicId, defaultTopic]);

  // Load models dynamically when API key is available
  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      getAvailableGeminiModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableModelOptions(models);
        }
      }).catch(() => {});
    }
  }, [apiKey]);

  // Filtered dropdown lists based on selection
  const subjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return allSubjects;
    return allSubjects.filter(s => s.gradeId === selectedGradeId);
  }, [selectedGradeId, allSubjects]);

  const unitsForSubject = useMemo(() => {
    if (!selectedSubjectId) return [];
    return allUnits.filter(u => u.subjectId === selectedSubjectId);
  }, [selectedSubjectId, allUnits]);

  const topicsForUnit = useMemo(() => {
    if (!selectedUnitId) return [];
    return allTopics.filter(t => t.unitId === selectedUnitId);
  }, [selectedUnitId, allTopics]);

  if (!isOpen) return null;

  const handleSaveApiKey = async (key) => {
    const cleanKey = key.trim();
    setApiKey(cleanKey);
    setIsSavingKey(true);
    try {
      if (currentUser?.id) {
        await dbSaveUserAiApiKey(currentUser.id, cleanKey, {
          defaultModel: selectedModel,
          userName: currentUser.name || currentUser.email || ''
        });
      } else {
        localStorage.setItem('gemini_api_key', cleanKey);
      }
      setKeySaveSuccess(true);
      setTimeout(() => setKeySaveSuccess(false), 3000);
      if (cleanKey) {
        setShowKeyInput(false);
      }
    } catch (err) {
      console.warn('[AiModal] Error saving API key:', err);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (window.confirm('Bu hesaba kayıtlı Gemini API anahtarını veritabanından kaldırmak istediğinize emin misiniz?')) {
      await handleSaveApiKey('');
      setApiKey('');
      setShowKeyInput(true);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMessage('Lütfen geçerli bir PDF dosyası seçiniz.');
      return;
    }

    setPdfFile(file);
    setIsExtractingPdf(true);
    setErrorMessage('');

    try {
      const text = await extractTextFromPdf(file);
      setExtractedPdfText(text);
      if (!customTopic && !selectedTopicId) {
        setCustomTopic(file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '));
      }
    } catch (err) {
      setErrorMessage('PDF metni ayıklanırken hata oluştu: ' + err.message);
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // Get active names for display and prompt
  const activeGradeObj = allGrades.find(g => g.id === selectedGradeId);
  const activeSubjectObj = allSubjects.find(s => s.id === selectedSubjectId);
  const activeUnitObj = allUnits.find(u => u.id === selectedUnitId);
  const activeTopicObj = allTopics.find(t => t.id === selectedTopicId);

  const finalGradeName = activeGradeObj?.name || customGrade || '8. Sınıf';
  const finalSubjectName = activeSubjectObj?.name || customSubject || 'Matematik';
  const finalTopicName = activeTopicObj?.name || customTopic || activeUnitObj?.name || finalSubjectName;

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      setErrorMessage('Lütfen geçerli bir Google Gemini API anahtarı giriniz.');
      return;
    }

    setErrorMessage('');
    setIsGenerating(true);

    try {
      const effectiveContent = sourceType === 'pdf' ? extractedPdfText : (sourceType === 'text' ? sourceText : '');
      const questions = await generateQuestionsWithGemini({
        apiKey,
        model: selectedModel,
        subject: finalSubjectName,
        grade: finalGradeName,
        topic: finalTopicName,
        sourceType,
        sourceContent: effectiveContent,
        questionCount: Number(questionCount) || 5,
        optionCount: Number(optionCount) || 4,
        difficulty,
        questionType,
        includeExplanation
      });

      setGeneratedQuestions(questions);
      setPackageTitle(`${finalGradeName} ${finalSubjectName} - ${finalTopicName} (${questions.length} Soru)`);
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Soru üretimi sırasında bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (qIndex, field, value) => {
    setGeneratedQuestions(prev => prev.map((q, idx) => {
      if (idx === qIndex) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleUpdateOption = (qIndex, optIndex, value) => {
    setGeneratedQuestions(prev => prev.map((q, idx) => {
      if (idx === qIndex) {
        const nextOpts = [...(q.options || [])];
        nextOpts[optIndex] = value;
        return { ...q, options: nextOpts };
      }
      return q;
    }));
  };

  const handleSetCorrectAnswer = (qIndex, optIndex) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    setGeneratedQuestions(prev => prev.map((q, idx) => {
      if (idx === qIndex) {
        return {
          ...q,
          correctAnswer: optIndex,
          correctAnswerLetter: letters[optIndex] || 'A'
        };
      }
      return q;
    }));
  };

  const handleDeleteQuestion = (qIndex) => {
    if (generatedQuestions.length <= 1) {
      alert('Pakette en az 1 soru bulunmalıdır.');
      return;
    }
    setGeneratedQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleAddBlankQuestion = () => {
    const letters = optionCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
    const newQ = {
      id: `ai_q_manual_${Date.now()}`,
      questionText: 'Yeni eklenen soru metnini buraya yazınız...',
      options: letters.map(l => `${l}) Şık ${l}`),
      correctAnswer: 0,
      correctAnswerLetter: 'A',
      explanation: 'Çözüm açıklaması...',
      difficulty: difficulty,
      topic: finalTopicName,
      subject: finalSubjectName,
      grade: finalGradeName,
      optionCount: optionCount,
      questionType: questionType
    };
    setGeneratedQuestions(prev => [...prev, newQ]);
  };

  const handleSaveToQuestionBank = () => {
    if (generatedQuestions.length === 0) return;

    // Resolve exact curriculum Topic ID
    let resolvedTopicId = 'global_all';
    if (selectedTopicId) {
      resolvedTopicId = selectedTopicId;
    } else if (selectedUnitId) {
      resolvedTopicId = `unit_${selectedUnitId}_all`;
    } else if (selectedSubjectId) {
      resolvedTopicId = `sub_${selectedSubjectId}_all`;
    } else if (selectedGradeId) {
      resolvedTopicId = `grade_${selectedGradeId}_all`;
    }

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const subQuestions = generatedQuestions.map((q, idx) => {
      let cAns = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      return {
        id: q.id || `ai_sub_${Date.now()}_${idx + 1}`,
        questionText: q.questionText,
        options: q.options || (optionCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']),
        correctAnswer: cAns,
        correctAnswerLetter: letters[cAns] || 'A',
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty,
        topic: finalTopicName,
        topicId: resolvedTopicId,
        subject: finalSubjectName,
        subjectId: selectedSubjectId || null,
        unitId: selectedUnitId || null,
        grade: finalGradeName,
        gradeId: selectedGradeId || null,
        contentType: 'text'
      };
    });

    const answerKey = subQuestions.map(q => q.correctAnswerLetter);

    const bundleQuestion = {
      id: `q_ai_${Date.now()}`,
      title: packageTitle || `${finalSubjectName} AI Soru Paketi (${subQuestions.length} Soru)`,
      subject: finalSubjectName,
      subjectId: selectedSubjectId || null,
      grade: finalGradeName,
      gradeId: selectedGradeId || null,
      unitId: selectedUnitId || null,
      unitName: activeUnitObj?.name || null,
      topic: finalTopicName,
      topicId: resolvedTopicId,
      contentType: 'json',
      type: questionType,
      isBundle: true,
      questionCount: subQuestions.length,
      optionCount: optionCount,
      questionsList: subQuestions,
      answerKey: answerKey,
      contentPayload: JSON.stringify(subQuestions, null, 2),
      sourceType: 'ai_generated',
      createdAt: new Date().toISOString()
    };

    onSaveQuestions(bundleQuestion);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: isDark ? 'var(--color-surface, #1e293b)' : '#ffffff',
        color: 'var(--color-text, #0f172a)',
        borderRadius: '1.25rem',
        border: '1.5px solid var(--color-border)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: step === 1 ? '780px' : '1050px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(139,92,246,0.35)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                Yapay Zeka ile Soru Paketi Üretici
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 800 }}>
                  Google Gemini ⚡
                </span>
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {step === 1 ? 'Konu metni veya PDF analiz ederek MEB / ÖSYM formatında sorular üretin' : 'Üretilen soru paketini inceleyin, düzenleyin veya yeni sorular ekleyin'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--color-border)',
                background: apiKey ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: apiKey ? '#10b981' : '#ef4444',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Google Gemini API Anahtarını Yönet"
            >
              <Key size={13} />
              <span>{apiKey ? 'API Bağlı ✓' : 'API Key Gir'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── KULLANICIYA ÖZEL GÜVENLİ API KEY PANELİ ── */}
        {showKeyInput && (
          <div style={{
            padding: '1rem 1.4rem',
            background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))' : 'linear-gradient(135deg, #f0fdf4, #eff6ff)',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🔒</span>
                <label style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  Öğretmene Özel Gemini API Anahtarı
                </label>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {currentUser?.name || currentUser?.email || 'Öğretmen Hesabı'}
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.74rem', color: '#6366f1', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                Ücretsiz API Key Al (Google AI Studio) ↗
              </a>
            </div>

            <p style={{ margin: 0, fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.45 }}>
              🛡️ <strong>Kişiye Özel Güvenlik:</strong> Girdiğiniz anahtar doğrudan bulut veritabanında <u>yalnızca sizin hesabınıza</u> özel şifreli saklanır. Diğer öğretmenler veya öğrenciler sizin API anahtarınızı veya soru kotanızı asla göremez ve kullanamaz.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="password"
                placeholder="AIzaSy... (Kişisel Gemini API Anahtarınız)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  borderRadius: '0.65rem',
                  border: '1.5px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.84rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em'
                }}
              />

              <button
                type="button"
                onClick={() => handleSaveApiKey(apiKey)}
                disabled={isSavingKey}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '0.65rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: isSavingKey ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                  flexShrink: 0
                }}
              >
                {isSavingKey ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>{isSavingKey ? 'Kaydediliyor...' : 'Hesabıma Kaydet'}</span>
              </button>

              {apiKey && (
                <button
                  type="button"
                  onClick={handleRemoveApiKey}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Anahtarı Hesabınızdan Kaldırın"
                >
                  Kaldır
                </button>
              )}
            </div>

            {keySaveSuccess && (
              <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} /> API anahtarı hesabınıza ve veritabanına başarıyla kaydedildi!
              </div>
            )}
          </div>
        )}

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div style={{
            margin: '0.8rem 1.4rem 0',
            padding: '0.65rem 0.95rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '0.75rem',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem' }}>
          {step === 1 ? (
            /* ══════════ STEP 1: FORM & SOURCE SELECTION ══════════ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Row 1: Sınıf, Ders, Ünite, Konu Dropdown Grid */}
              <div style={{ background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FolderTree size={16} color="#6366f1" />
                  <span>Hedef Müfredat Kazanımı ve Konu Seçimi:</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                  {/* Sınıf */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, marginBottom: 3, display: 'block', color: 'var(--color-text-muted)' }}>Sınıf Seviyesi:</label>
                    <select
                      value={selectedGradeId}
                      onChange={(e) => {
                        const gId = e.target.value;
                        setSelectedGradeId(gId);
                        const subs = allSubjects.filter(s => s.gradeId === gId);
                        const firstSub = subs[0]?.id || '';
                        setSelectedSubjectId(firstSub);
                        const uns = allUnits.filter(u => u.subjectId === firstSub);
                        setSelectedUnitId(uns[0]?.id || '');
                        setSelectedTopicId('');
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>

                  {/* Ders */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, marginBottom: 3, display: 'block', color: 'var(--color-text-muted)' }}>Ders:</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setSelectedSubjectId(sId);
                        const uns = allUnits.filter(u => u.subjectId === sId);
                        setSelectedUnitId(uns[0]?.id || '');
                        setSelectedTopicId('');
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      {subjectsForGrade.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Ünite */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, marginBottom: 3, display: 'block', color: 'var(--color-text-muted)' }}>Ünite:</label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => {
                        const uId = e.target.value;
                        setSelectedUnitId(uId);
                        setSelectedTopicId('');
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <option value="">-- Tüm Ünite / Genel --</option>
                      {unitsForSubject.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  {/* Konu */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, marginBottom: 3, display: 'block', color: 'var(--color-text-muted)' }}>Konu / Alt Başlık:</label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <option value="">-- {topicsForUnit.length > 0 ? 'Tüm Konular / Manuel Yaz' : 'Özel Konu Yaz'} --</option>
                      {topicsForUnit.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Custom Topic Input if not in predefined list */}
                {!selectedTopicId && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Özel Konu / Kazanım Başlığı yazınız (Örn: Üslü Sayılarda Çarpma, Kurtuluş Savaşı...)"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Row 2: Kaynak Materyali Seçimi (Metin, PDF, Sadece Konu) */}
              <div style={{ background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '0.6rem', display: 'block', color: 'var(--color-text)' }}>
                  📖 Soru Üretim Kaynağı:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSourceType('text')}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.65rem',
                      border: `1.5px solid ${sourceType === 'text' ? '#6366f1' : 'var(--color-border-input)'}`,
                      background: sourceType === 'text' ? (isDark ? 'rgba(99, 102, 241, 0.25)' : '#eff6ff') : 'var(--color-surface)',
                      color: sourceType === 'text' ? '#6366f1' : 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <FileText size={15} />
                    <span>Metin / Özet Yapıştır</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('pdf')}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.65rem',
                      border: `1.5px solid ${sourceType === 'pdf' ? '#ec4899' : 'var(--color-border-input)'}`,
                      background: sourceType === 'pdf' ? (isDark ? 'rgba(236, 72, 153, 0.25)' : '#fdf2f8') : 'var(--color-surface)',
                      color: sourceType === 'pdf' ? '#ec4899' : 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Upload size={15} />
                    <span>Konu PDF'i Yükle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('topic_only')}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.65rem',
                      border: `1.5px solid ${sourceType === 'topic_only' ? '#10b981' : 'var(--color-border-input)'}`,
                      background: sourceType === 'topic_only' ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#f0fdf4') : 'var(--color-surface)',
                      color: sourceType === 'topic_only' ? '#10b981' : 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Sadece Konu Başlığı</span>
                  </button>
                </div>

                {sourceType === 'text' && (
                  <div>
                    <textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Ders notunu, kitap özetini veya konunun açıklama metnini buraya yapıştırınız. Yapay zeka tüm soruları bu metindeki bilgilere dayandıracaktır..."
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.65rem',
                        border: '1.5px solid var(--color-border-input)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '0.84rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}

                {sourceType === 'pdf' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePdfUpload}
                      accept="application/pdf"
                      style={{ display: 'none' }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--color-border-input)',
                        borderRadius: '0.75rem',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Upload size={24} style={{ color: '#ec4899', marginBottom: 4 }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        {pdfFile ? pdfFile.name : 'Konu PDF Dosyasını Seçiniz'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Tıklayarak Değiştir` : 'Maksimum 25 sayfalık ders notu veya konu anlatımı PDF'}
                      </div>
                    </div>

                    {isExtractingPdf && (
                      <div style={{ fontSize: '0.76rem', color: '#ec4899', fontWeight: 800, textAlign: 'center' }}>
                        ⏳ PDF içeriği taranıyor ve metin ayıklanıyor...
                      </div>
                    )}
                    {extractedPdfText && !isExtractingPdf && (
                      <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 800, textAlign: 'center' }}>
                        ✓ {extractedPdfText.length.toLocaleString('tr-TR')} karakterlik konu metni başarıyla ayıklandı.
                      </div>
                    )}
                  </div>
                )}

                {sourceType === 'topic_only' && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', padding: '0.4rem 0.2rem' }}>
                    💡 Ekstra bir kaynak metin yüklemeden doğrudan seçtiğiniz <b>{finalGradeName} {finalSubjectName} - {finalTopicName}</b> kazanımlarına göre sorular üretilecektir.
                  </div>
                )}
              </div>

              {/* Row 3: Parametreler (Model, Soru Adedi, Şık Sayısı, Zorluk) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>🤖 Yapay Zeka Modeli:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    {availableModelOptions.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Soru Adedi:</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem' }}
                  >
                    <option value={3}>3 Soru</option>
                    <option value={5}>5 Soru (Önerilen)</option>
                    <option value={10}>10 Soru</option>
                    <option value={15}>15 Soru</option>
                    <option value={20}>20 Soru</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Şık Sayısı:</label>
                  <select
                    value={optionCount}
                    onChange={(e) => setOptionCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem' }}
                  >
                    <option value={4}>4 Şık (A-D • Ortaokul / LGS)</option>
                    <option value={5}>5 Şık (A-E • Lise / YKS)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Zorluk Seviyesi:</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem' }}
                  >
                    <option value="Kolay">Kolay (Temel Kavramlar)</option>
                    <option value="Orta">Orta (Müfredat Standardı)</option>
                    <option value="Zor">Zor (İleri Seviye)</option>
                    <option value="Yeni Nesil">🌟 Yeni Nesil (Beceri & Mantık)</option>
                  </select>
                </div>
              </div>

              {/* Extra checkboxes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeExplanation}
                    onChange={(e) => setIncludeExplanation(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                  />
                  <span>Her soru için detaylı çözüm rehberi ekle</span>
                </label>
              </div>
            </div>
          ) : (
            /* ══════════ STEP 2: INTERACTIVE REVIEW & EDIT STUDIO ══════════ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Package Header Bar */}
              <div style={{
                background: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
                border: '1.5px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '0.85rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    📦 Soru Paketi Başlığı:
                  </label>
                  <input
                    type="text"
                    value={packageTitle}
                    onChange={(e) => setPackageTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.35rem 0.55rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--color-border-input)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, background: '#8b5cf6', color: '#ffffff', padding: '3px 9px', borderRadius: 99 }}>
                    {generatedQuestions.length} Soru
                  </span>
                  <button
                    onClick={handleAddBlankQuestion}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border-input)',
                      color: 'var(--color-text)',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={14} />
                    <span>Soru Ekle</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {generatedQuestions.map((q, qIdx) => {
                  const letters = ['A', 'B', 'C', 'D', 'E'];
                  return (
                    <div
                      key={q.id || qIdx}
                      style={{
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '0.85rem',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      {/* Question Card Top Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#8b5cf6',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {qIdx + 1}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                            {q.difficulty || difficulty}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                            Doğru Cevap: <b style={{ color: '#10b981' }}>{letters[q.correctAnswer] || 'A'}</b>
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteQuestion(qIdx)}
                          title="Bu Soruyu Sil"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            borderRadius: '0.45rem',
                            padding: '0.25rem 0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Sil</span>
                        </button>
                      </div>

                      {/* Question Text */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 2, display: 'block' }}>
                          Soru Metni:
                        </label>
                        <textarea
                          value={q.questionText}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'questionText', e.target.value)}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.7rem',
                            borderRadius: '0.55rem',
                            border: '1.5px solid var(--color-border-input)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: '0.84rem',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Options Grid */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>
                          Şıklar (Doğru cevabı seçmek için harfe veya kutuya tıklayınız):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.45rem' }}>
                          {(q.options || []).map((opt, optIdx) => {
                            const isCorrect = q.correctAnswer === optIdx;
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: isCorrect ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : 'var(--color-surface)',
                                  border: `1.5px solid ${isCorrect ? '#10b981' : 'var(--color-border-input)'}`,
                                  borderRadius: '0.55rem',
                                  padding: '0.35rem 0.55rem'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSetCorrectAnswer(qIdx, optIdx)}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: isCorrect ? '#10b981' : 'var(--color-surface-hover)',
                                    color: isCorrect ? '#ffffff' : 'var(--color-text)',
                                    border: `1px solid ${isCorrect ? '#10b981' : 'var(--color-border)'}`,
                                    fontWeight: 900,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                  title="Doğru Cevap Olarak İşaretle"
                                >
                                  {letters[optIdx]}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                  style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--color-text)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 2, display: 'block' }}>
                          💡 Çözüm Rehberi & Açıklama:
                        </label>
                        <textarea
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          rows={2}
                          placeholder="Doğru cevabın adımları ve gerekçesi..."
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '0.55rem',
                            border: '1px solid var(--color-border-input)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '0.85rem 1.4rem',
          borderTop: '1.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc'
        }}>
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '0.65rem',
                  border: '1.5px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isExtractingPdf}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '0.65rem',
                  background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(139,92,246,0.35)'
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Yapay Zeka Soruları Hazırlıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Soru Paketini Üret</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '0.65rem',
                  border: '1.5px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <ArrowLeft size={14} />
                <span>Ayarları Değiştir</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToQuestionBank}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '0.65rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>💾 Soru Bankasına ({finalSubjectName}) Aktar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
