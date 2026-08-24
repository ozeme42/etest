import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Upload, FileText, CheckCircle2, AlertCircle,
  Plus, Trash2, Edit3, ArrowRight, ArrowLeft, RotateCcw,
  BookOpen, Layers, Key, Check, HelpCircle, Eye, RefreshCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { generateQuestionsWithGemini, extractTextFromPdf, getAvailableGeminiModels } from '../../services/aiQuestionService';

export default function AiQuestionGeneratorModal({
  isOpen,
  onClose,
  onSaveQuestions,
  defaultSubject = 'Matematik',
  defaultGrade = '8. Sınıf',
  defaultTopic = '',
  availableGrades = [],
  availableSubjects = []
}) {
  const { isDark } = useTheme();

  // Step 1: Config & Input | Step 2: Review & Edit Studio
  const [step, setStep] = useState(1);

  // API Key & Model
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(() => !localStorage.getItem('gemini_api_key'));
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [availableModelOptions, setAvailableModelOptions] = useState([
    { id: 'gemini-3.7-flash', name: '🔥 Gemini 3.7 Flash (En Yeni & Güçlü • Önerilen)' },
    { id: 'gemini-3.5-flash', name: '⚡ Gemini 3.5 Flash (Yüksek Hızlı & Dengeli)' },
    { id: 'gemini-3.5-flash-lite', name: '💡 Gemini 3.5 Flash-Lite (Ultra Hızlı)' },
    { id: 'gemini-3.1-pro', name: '🧠 Gemini 3.1 Pro (Gelişmiş Akıl Yürütme)' },
    { id: 'gemini-2.5-flash', name: '🛡️ Gemini 2.5 Flash' }
  ]);

  // Question Config
  const [subject, setSubject] = useState(defaultSubject);
  const [grade, setGrade] = useState(defaultGrade);
  const [topic, setTopic] = useState(defaultTopic);
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

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
    if (defaultGrade) setGrade(defaultGrade);
    if (defaultTopic) setTopic(defaultTopic);
  }, [defaultSubject, defaultGrade, defaultTopic]);

  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      getAvailableGeminiModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableModelOptions(models);
        }
      }).catch(() => {});
    }
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      setShowKeyInput(false);
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
      if (!topic) {
        setTopic(file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '));
      }
    } catch (err) {
      setErrorMessage('PDF metni ayıklanırken hata oluştu: ' + err.message);
    } finally {
      setIsExtractingPdf(false);
    }
  };

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
        subject,
        grade,
        topic,
        sourceType,
        sourceContent: effectiveContent,
        questionCount: Number(questionCount) || 5,
        optionCount: Number(optionCount) || 4,
        difficulty,
        questionType,
        includeExplanation
      });

      setGeneratedQuestions(questions);
      setPackageTitle(`${grade} ${subject} - ${topic || 'Yapay Zeka Soru Paketi'} (${questions.length} Soru)`);
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Soru üretimi sırasında bir hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Question editing helpers in Step 2
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
      topic: topic || subject,
      subject: subject,
      grade: grade,
      optionCount: optionCount,
      questionType: questionType
    };
    setGeneratedQuestions(prev => [...prev, newQ]);
  };

  const handleSaveToQuestionBank = () => {
    if (generatedQuestions.length === 0) return;

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
        topic: q.topic || topic || subject,
        contentType: 'text'
      };
    });

    const answerKey = subQuestions.map(q => q.correctAnswerLetter);

    const bundleQuestion = {
      id: `q_ai_${Date.now()}`,
      title: packageTitle || `${subject} AI Soru Paketi (${subQuestions.length} Soru)`,
      subject: subject,
      gradeId: grade,
      topicId: topic || 'Genel',
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
        maxWidth: step === 1 ? '750px' : '1050px',
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

        {/* API KEY CONFIG ACCORDION */}
        {showKeyInput && (
          <div style={{
            padding: '0.85rem 1.4rem',
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#eff6ff',
            borderBottom: '1.5px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>
                🔑 Google Gemini API Anahtarı:
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, textDecoration: 'none' }}
              >
                Ücretsiz API Key Al (Google AI Studio) ↗
              </a>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={() => handleSaveApiKey(apiKey)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '0.6rem',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Kaydet
              </button>
            </div>
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
              {/* Row 1: Ders, Sınıf, Konu */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Ders:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Örn: Matematik, Fizik, Türkçe"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Sınıf Seviyesi:</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Örn: 8. Sınıf (LGS), 12. Sınıf (TYT/AYT)"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 4, display: 'block' }}>Konu / Kazanım Başlığı:</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Örn: Üslü Sayılar, Kurtuluş Savaşı"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
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
                    💡 Ekstra bir kaynak metin yüklemeden doğrudan seçtiğiniz ders, sınıf ve konu kazanımlarına göre sorular üretilecektir.
                  </div>
                )}
              </div>

              {/* Row 3: Parametreler (Model, Soru Adedi, Şık Sayısı, Zorluk) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
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
                    <option value="Yeni Nesil">🌟 Yeni Nesil (Beceri & Mantık Temelli)</option>
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
                <span>💾 Soru Bankasına Paket Olarak Aktar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
