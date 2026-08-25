import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Plus, Trash2, BookMarked, Library, 
  FileText, HelpCircle, CheckCircle, XCircle, 
  Edit, MoreVertical, ArrowRight, FileJson, AlertCircle, Copy, Check
} from 'lucide-react';
import './BookManager.css';

export default function BookManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { books, bookTests, addTrackedBook, updateTrackedBook, deleteTrackedBook, addTrackedBookTest, batchSaveTrackedBookTests } = useTrackedBooks();
  const { submissions } = useEvaluation();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Book Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard", optionCount: 5, pdfUrl: "" });

  // Bulk Import States
  const [importModal, setImportModal] = useState({ isOpen: false, book: null });
  const [jsonInput, setJsonInput] = useState("");
  const [sampleFormatTab, setSampleFormatTab] = useState("standard"); // "standard" | "direct" | "open_ended" | "mixed"
  const [copiedFormat, setCopiedFormat] = useState(null);

  // Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingBook) {
      setNewBook({
        title: editingBook.title,
        publisher: editingBook.publisher,
        bookType: editingBook.bookType || 'standard',
        optionCount: editingBook.optionCount || 5,
        pdfUrl: editingBook.pdfUrl || ''
      });
    } else {
      setNewBook({ title: "", publisher: "", bookType: "standard", optionCount: 5, pdfUrl: "" });
    }
  }, [editingBook]);

  const enrichedBooks = useMemo(() => {
    let filteredBooks = books.filter(b => b.bookType !== 'exam');
    if (currentUser?.role === 'teacher' && currentUser?.id) {
      filteredBooks = filteredBooks.filter(b => 
        b.createdBy === currentUser.id || 
        b.teacherId === currentUser.id
      );
    }
    return filteredBooks.map(book => {
      const tests = bookTests.filter(bt => bt.bookId === book.id);
      
      const solvedSubmissions = submissions.filter(s => tests.some(t => t.id === s.testId) && s.status === 'completed');
      
      const subjectCount = book.subjects ? book.subjects.length : 0;
      const testCount = tests.length;
      const questionCount = tests.reduce((acc, bt) => acc + (bt.questionCount || 0), 0);
      
      const totalCorrect = solvedSubmissions.reduce((acc, sub) => acc + sub.answers.filter(a => a.isCorrect === true).length, 0);
      const totalIncorrect = solvedSubmissions.reduce((acc, sub) => acc + sub.answers.filter(a => a.isCorrect === false).length, 0);

      return {
        ...book,
        subjectCount,
        testCount,
        questionCount,
        solvedTestCount: solvedSubmissions.length,
        totalCorrectAnswers: totalCorrect,
        totalIncorrectAnswers: totalIncorrect
      };
    });
  }, [books, bookTests, submissions, currentUser]);

  const showToast = (title, type = 'success') => {
    alert(`${type === 'success' ? '✅' : '❌'} ${title}`);
  };

  const handleAddOrUpdateBook = async () => {
    if (!newBook.title.trim() || !newBook.publisher.trim()) {
      showToast("Lütfen tüm alanları doldurun!", "error");
      return;
    }

    try {
      if (editingBook) {
        await updateTrackedBook(editingBook.id, {
          ...editingBook,
          ...newBook,
          optionCount: Number(newBook.optionCount) || 5
        });
        showToast("Kitap başarıyla güncellendi!");
      } else {
        await addTrackedBook({
          ...newBook,
          optionCount: Number(newBook.optionCount) || 5,
          createdBy: currentUser?.id,
          teacherId: currentUser?.id
        });
        showToast("Kitap başarıyla eklendi!");
      }
      setNewBook({ title: "", publisher: "", bookType: "standard", optionCount: 5, pdfUrl: "" });
      setIsDialogOpen(false);
      setEditingBook(null);
    } catch (error) {
      showToast("İşlem sırasında bir hata oluştu!", "error");
    }
  };

  const handleDeleteBook = async (id) => {
    if (window.confirm("Bu kitabı ve tüm testlerini silmek istediğinize emin misiniz?")) {
      try {
        await deleteTrackedBook(id);
        showToast("Kitap silindi!", "success");
        setActiveDropdown(null);
      } catch (err) {
        showToast("Silme işleminde hata oluştu.", "error");
      }
    }
  };

  const handleManageBook = (bookId) => {
    navigate(`/books/${bookId}`);
  };
  
  const openDialog = (book) => {
    setEditingBook(book);
    setIsDialogOpen(true);
    setActiveDropdown(null);
  };

  const handleImportJson = async () => {
    if (!importModal.book || !jsonInput.trim()) return;
    const targetBook = importModal.book;
    
    try {
      const parsedData = JSON.parse(jsonInput);
      const subjectsList = parsedData.subjects || (Array.isArray(parsedData) ? parsedData : null);

      if (!subjectsList || !Array.isArray(subjectsList)) {
        throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
      }

      const existingSubjects = targetBook.subjects || [];
      const existingTestsList = (bookTests || []).filter(t => String(t.bookId) === String(targetBook.id) || String(t.book_id) === String(targetBook.id) || (toUUID(t.bookId) && toUUID(t.bookId) === toUUID(targetBook.id)));
      const usedExistingTestIds = new Set();
      const allTestsToSave = [];

      const genId = (prefix) => prefix + "_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);

      const updatedSubjects = [];

      let hasAnyOpenEnded = false;
      let hasAnyMultipleChoice = false;

      const formatTestPayload = (testData, subjectId, topicId = null) => {
        const testIsOpenEnded =
          testData.isOpenEnded === true ||
          testData.questionType === 'acik_uclu' ||
          (targetBook.bookType === 'open_ended' && testData.questionType !== 'coktan_secmeli') ||
          String(testData.name || '').toLowerCase().includes('açık uçlu') ||
          String(testData.name || '').toLowerCase().includes('acik uclu') ||
          String(testData.name || '').toLowerCase().includes('klasik');

        const questionType = testData.questionType ||
          (testIsOpenEnded ? 'acik_uclu' : 'coktan_secmeli');

        if (testIsOpenEnded || questionType === 'acik_uclu') hasAnyOpenEnded = true;
        else hasAnyMultipleChoice = true;

        const testNameClean = String(testData.name || 'İsimsiz Test').trim();

        let existingTest = null;
        if (testData.id) {
          existingTest = existingTestsList.find(t => String(t.id) === String(testData.id));
        }
        if (!existingTest) {
          existingTest = existingTestsList.find(t => {
            if (usedExistingTestIds.has(String(t.id))) return false;
            const nameMatch = String(t.name || '').trim().toLowerCase() === testNameClean.toLowerCase();
            if (!nameMatch) return false;
            const sMatch = String(t.subjectId || '') === String(subjectId);
            const topMatch = topicId ? String(t.topicId || '') === String(topicId) : (!t.topicId || t.topicId === 'direct' || String(t.topicId) === String(subjectId));
            return sMatch && topMatch;
          });
        }
        if (!existingTest) {
          existingTest = existingTestsList.find(t => {
            if (usedExistingTestIds.has(String(t.id))) return false;
            return String(t.name || '').trim().toLowerCase() === testNameClean.toLowerCase();
          });
        }

        let testId;
        if (existingTest) {
          testId = String(existingTest.id);
          usedExistingTestIds.add(testId);
        } else if (testData.id) {
          testId = String(testData.id);
          usedExistingTestIds.add(testId);
        } else {
          testId = genId("tbt");
        }

        const testPayload = {
          id: testId,
          bookId: String(targetBook.id),
          subjectId: String(subjectId),
          topicId: topicId ? String(topicId) : null,
          name: testNameClean,
          questionCount: Number(testData.questionCount || testData.question_count) || (existingTest?.questionCount || 20),
          answerKey: {},
          isOpenEnded: testIsOpenEnded,
          questionType,
          pdfUrl: testData.pdfUrl || existingTest?.pdfUrl || '',
          updatedAt: new Date().toISOString()
        };

        if (testData.answerKey || testData.answer_key) {
          const rawAns = testData.answerKey || testData.answer_key;
          if (Array.isArray(rawAns)) {
            rawAns.forEach((ans, idx) => {
              if (ans !== undefined && ans !== null && ans !== '') {
                testPayload.answerKey[String(idx + 1)] = String(ans);
              }
            });
          } else if (typeof rawAns === 'object') {
            Object.entries(rawAns).forEach(([k, v]) => {
              if (v !== undefined && v !== null && v !== '' && k !== '__meta') {
                testPayload.answerKey[String(k)] = String(v);
              }
            });
          }
        } else if (existingTest?.answerKey) {
          testPayload.answerKey = { ...existingTest.answerKey };
        }

        return testPayload;
      };

      for (const subjData of subjectsList) {
        if (!subjData.name) continue;

        const existingSub = existingSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        const subject = { 
          id: existingSub?.id || genId("s"), 
          name: subjData.name, 
          topics: [] 
        };
        updatedSubjects.push(subject);

        // 1. Direct tests under subject (Ders > Test)
        if (subjData.tests && Array.isArray(subjData.tests)) {
          for (const testData of subjData.tests) {
            allTestsToSave.push(formatTestPayload(testData, subject.id, null));
          }
        }

        // 2. Topic-based tests (Ders > Konu > Test)
        if (subjData.topics && Array.isArray(subjData.topics)) {
          for (const topicData of subjData.topics) {
            if (!topicData.name) continue;

            const existingTop = (existingSub?.topics || []).find(t => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            const topic = { 
              id: existingTop?.id || genId("t"), 
              name: topicData.name 
            };
            subject.topics.push(topic);

            if (topicData.tests && Array.isArray(topicData.tests)) {
              for (const testData of topicData.tests) {
                allTestsToSave.push(formatTestPayload(testData, subject.id, topic.id));
              }
            }
          }
        }
      }

      let newBookType = targetBook.bookType || 'standard';
      if (parsedData.bookType) {
        newBookType = parsedData.bookType;
      } else if (hasAnyOpenEnded && hasAnyMultipleChoice) {
        newBookType = 'mixed';
      } else if (hasAnyOpenEnded && !hasAnyMultipleChoice) {
        newBookType = 'open_ended';
      }

      await updateTrackedBook(targetBook.id, { subjects: updatedSubjects, bookType: newBookType, updatedAt: new Date().toISOString() });
      
      if (allTestsToSave.length > 0) {
        await batchSaveTrackedBookTests(allTestsToSave);
      }
      
      showToast(`${targetBook.title} kitabına ${allTestsToSave.length} test başarıyla güncellendi/eklendi! 🎉`);
      setJsonInput("");
      setImportModal({ isOpen: false, book: null });
    } catch (error) {
      console.error(error);
      showToast("Geçersiz JSON formatı: " + (error.message || "Lütfen verilen örnekleri inceleyin."), "error");
    }
  };

  const sampleJsonFormats = {
    standard: `{
  "subjects": [
    {
      "name": "Matematik",
      "topics": [
        {
          "name": "Üslü Sayılar",
          "tests": [
            {
              "name": "Test 1",
              "questionType": "coktan_secmeli",
              "questionCount": 12,
              "answerKey": ["A", "B", "C", "D", "E", "A", "B", "C", "D", "A", "B", "C"]
            }
          ]
        }
      ]
    }
  ]
}`,
    direct: `{
  "subjects": [
    {
      "name": "Türkçe",
      "tests": [
        {
          "name": "Kazanım Testi 1",
          "questionType": "coktan_secmeli",
          "questionCount": 20,
          "answerKey": ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D"]
        },
        {
          "name": "Kazanım Testi 2",
          "questionType": "coktan_secmeli",
          "questionCount": 20,
          "answerKey": ["B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D", "A"]
        }
      ]
    }
  ]
}`,
    open_ended: `{
  "subjects": [
    {
      "name": "Matematik",
      "topics": [
        {
          "name": "Problemler",
          "tests": [
            {
              "name": "7-8. Sayfa",
              "questionType": "acik_uclu",
              "questionCount": 8,
              "answerKey": {
                "1": "103959",
                "2": "2",
                "3": "503976",
                "4": "22",
                "5": "715392",
                "6": "34253",
                "7": "186149",
                "8": "153092"
              }
            },
            {
              "name": "11-12. Sayfa",
              "questionType": "acik_uclu",
              "questionCount": 5,
              "answerKey": {
                "1": "732705",
                "2": "0",
                "3": "700",
                "4": "77777",
                "5": "3"
              }
            }
          ]
        }
      ]
    }
  ]
}`,
    mixed: `{
  "subjects": [
    {
      "name": "Matematik",
      "tests": [
        {
          "name": "7-8. Sayfa (Açık Uçlu)",
          "questionType": "acik_uclu",
          "questionCount": 16,
          "answerKey": {
            "1": "103959",
            "2": "2",
            "3": "503976",
            "4": "22",
            "5": "715392",
            "6": "34253",
            "7": "186149",
            "8": "153092",
            "9": "910910",
            "10": "201030",
            "11": "69930",
            "12": "987615",
            "13": "176740",
            "14": "66",
            "15": "619250",
            "16": "148"
          }
        },
        {
          "name": "79-80. Sayfa (Çoktan Seçmeli)",
          "questionType": "coktan_secmeli",
          "questionCount": 16,
          "answerKey": {
            "1": "B",
            "2": "A",
            "3": "A",
            "4": "A",
            "5": "D",
            "6": "A",
            "7": "C",
            "8": "D",
            "9": "A",
            "10": "C",
            "11": "B",
            "12": "A",
            "13": "A",
            "14": "C",
            "15": "B",
            "16": "B"
          }
        },
        {
          "name": "83-84. Sayfa (Cevap Anahtarsız)",
          "questionType": "acik_uclu",
          "questionCount": 10
        }
      ]
    }
  ]
}`
  };

  const copyToClipboard = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(key);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="books-page-container">
      
      {/* ── TOP HERO HEADER BAR ── */}
      {/* ── HEADER ── */}
      <div className="books-glass-card books-header-card">
        <div className="books-header-left">
          <button 
            className="btn btn-outline" 
            onClick={() => navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher')} 
            style={{ padding: '0.6rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface)', borderRadius: '0.75rem', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Geri Dön"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="books-header-icon">
            <BookMarked size={28} />
          </div>

          <div className="books-header-titles">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(37,99,235,0.12)', color: '#60a5fa', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid #3b82f6' }}>
                📚 FİZİKİ KİTAP &amp; SORU BANKASI MERKEZİ
              </span>
            </div>
            <h1>
              Kitap &amp; Kütüphane Takip Sistemi
            </h1>
          </div>
        </div>

        <button 
          onClick={() => openDialog(null)}
          className="books-btn-add-main"
        >
          <Plus size={20} /> Yeni Kitap Ekle
        </button>
      </div>

      {/* ── 4 LIVE KPI CARDS (2x2 ON MOBILE) ── */}
      <div className="books-kpi-grid">
        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Library size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Toplam Kitap</div>
            <div className="books-kpi-val">{enrichedBooks.length}</div>
          </div>
        </div>

        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Mevcut Test Sayısı</div>
            <div className="books-kpi-val" style={{ color: '#0284c7' }}>
              {enrichedBooks.reduce((sum, b) => sum + (b.testCount || 0), 0)} Test
            </div>
          </div>
        </div>

        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Çözülen Testler</div>
            <div className="books-kpi-val" style={{ color: '#10b981' }}>
              {enrichedBooks.reduce((sum, b) => sum + (b.solvedTestCount || 0), 0)} Test
            </div>
          </div>
        </div>

        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: 'rgba(219, 39, 119, 0.15)', color: '#db2777', border: '1px solid rgba(219, 39, 119, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Doğru / Yanlış Oranı</div>
            <div className="books-kpi-val" style={{ color: '#db2777' }}>
              {(() => {
                const totalD = enrichedBooks.reduce((sum, b) => sum + (b.totalCorrectAnswers || 0), 0);
                const totalY = enrichedBooks.reduce((sum, b) => sum + (b.totalIncorrectAnswers || 0), 0);
                const total = totalD + totalY;
                return total > 0 ? `%${Math.round((totalD / total) * 100)}` : '—';
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN BOOK LIST CONTENT ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--color-text)', fontWeight: 800 }}>
          Yükleniyor...
        </div>
      ) : enrichedBooks.length === 0 ? (
        <div className="books-glass-card" style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
          <BookMarked size={64} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text)', margin: '0 0 0.5rem 0' }}>Henüz Kitap Eklenmemiş</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Takip edilecek fiziksel soru bankalarınızı ve ödev kitaplarınızı buradan ekleyebilirsiniz.
          </p>
          <button 
            onClick={() => openDialog(null)}
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '0.75rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
          >
            İlk Kitabı Ekle
          </button>
        </div>
      ) : (
        <div className="book-grid">
          {enrichedBooks.map((book) => (
            <div key={book.id} className="book-card">
              
              <div className="book-card-header">
                <div>
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-publisher">{book.publisher}</p>
                </div>
                
                <div className="book-menu">
                  <button className="book-menu-trigger" onClick={() => setActiveDropdown(activeDropdown === book.id ? null : book.id)}>
                    <MoreVertical size={20} />
                  </button>
                  {activeDropdown === book.id && (
                    <div className="book-dropdown" ref={dropdownRef}>
                      <button onClick={() => openDialog(book)}><Edit size={16} /> Düzenle</button>
                      <button onClick={() => handleDeleteBook(book.id)} style={{ color: '#dc2626' }}><Trash2 size={16} /> Sil</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span className="book-badge" style={{ margin: 0,
                  background: book.bookType === 'mixed' ? 'rgba(8,145,178,0.12)' : book.bookType === 'open_ended' ? 'rgba(139,92,246,0.12)' : undefined,
                  color: book.bookType === 'mixed' ? '#0891b2' : book.bookType === 'open_ended' ? '#8b5cf6' : undefined,
                  borderColor: book.bookType === 'mixed' ? '#0891b2' : book.bookType === 'open_ended' ? '#8b5cf6' : undefined
                }}>
                  {book.bookType === 'open_ended' ? '✍️ Açık Uçlu Kitap'
                    : book.bookType === 'mixed' ? '🔀 Karma Kitap'
                    : '🔘 Standart Soru Bankası'}
                </span>
                {book.bookType !== 'open_ended' && book.bookType !== 'mixed' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.65rem', borderRadius: '9999px', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                    {book.optionCount === 4 ? '🎯 4 Şık (A-D)' : '🎯 5 Şık (A-E)'}
                  </span>
                )}
              </div>

              <div className="book-stats">
                <div className="book-stat-item">
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}><Library size={16} /> Ders</span>
                  <strong style={{ color: 'var(--color-text)' }}>{book.subjectCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}><FileText size={16} /> Test</span>
                  <strong style={{ color: '#0284c7' }}>{book.testCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}><HelpCircle size={16} /> Soru</span>
                  <strong style={{ color: '#6366f1' }}>{book.questionCount || 0}</strong>
                </div>

                {(book.solvedTestCount || 0) > 0 && (
                  <div className="book-stats-solved">
                    <div className="book-stat-item">
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>Çözülen Test</span>
                      <span className="tag-mono">{book.solvedTestCount}</span>
                    </div>
                    <div className="book-stat-item" style={{ color: '#10b981' }}>
                      <span style={{ fontWeight: 800 }}><CheckCircle size={14} /> Doğru</span>
                      <span className="tag-success">{book.totalCorrectAnswers}</span>
                    </div>
                    <div className="book-stat-item" style={{ color: '#dc2626' }}>
                      <span style={{ fontWeight: 800 }}><XCircle size={14} /> Yanlış</span>
                      <span className="tag-danger">{book.totalIncorrectAnswers}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="book-actions">
                <button 
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
                  onClick={() => handleManageBook(book.id)}
                  className="hover:scale-105 active:scale-95"
                >
                  İçeriği &amp; Ödevleri Yönet <ArrowRight size={16} />
                </button>
                <button 
                  title="JSON İle Toplu İçerik Ekle"
                  style={{ padding: '0.75rem', width: '3.2rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => {
                    setJsonInput("");
                    setImportModal({ isOpen: true, book });
                  }}
                  className="hover:scale-105 active:scale-95"
                >
                  <FileJson size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NEW / EDIT BOOK MODAL ── */}
      {isDialogOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', padding: '2rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', color: 'var(--color-text)' }}>
            <h2 style={{ color: 'var(--color-text)', fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.35rem' }}>{editingBook ? "✏️ Kitabı Düzenle" : "➕ Yeni Kitap Ekle"}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>{editingBook ? "Kitap bilgilerini güncelleyin." : "Takip edilecek yeni bir kitap oluşturun."}</p>
            
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>Kitap Adı</label>
              <input 
                type="text" 
                value={newBook.title} 
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} 
                placeholder="Örn: 8. Sınıf LGS Matematik Soru Bankası"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>Yayınevi</label>
              <input 
                type="text" 
                value={newBook.publisher} 
                onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} 
                placeholder="Örn: Çap Yayınları, Merkez Yayınları..."
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>Kitap Türü</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1.5px solid ${newBook.bookType === 'standard' ? '#6366f1' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.bookType === 'standard' ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover)' }}>
                  <input
                    type="radio"
                    name="bookType"
                    value="standard"
                    checked={newBook.bookType === 'standard'}
                    onChange={() => setNewBook({ ...newBook, bookType: 'standard' })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>🔘 Standart Soru Bankası</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Tüm testler çoktan seçmeli (A/B/C/D veya A/B/C/D/E)</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1.5px solid ${newBook.bookType === 'open_ended' ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.bookType === 'open_ended' ? 'rgba(139,92,246,0.12)' : 'var(--color-surface-hover)' }}>
                  <input
                    type="radio"
                    name="bookType"
                    value="open_ended"
                    checked={newBook.bookType === 'open_ended'}
                    onChange={() => setNewBook({ ...newBook, bookType: 'open_ended' })}
                    style={{ accentColor: '#8b5cf6' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>✍️ Açık Uçlu Kitap</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Tüm testler klasik / yazılı / sayısal cevaplı sorular</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1.5px solid ${newBook.bookType === 'mixed' ? '#0891b2' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.bookType === 'mixed' ? 'rgba(8,145,178,0.12)' : 'var(--color-surface-hover)' }}>
                  <input
                    type="radio"
                    name="bookType"
                    value="mixed"
                    checked={newBook.bookType === 'mixed'}
                    onChange={() => setNewBook({ ...newBook, bookType: 'mixed' })}
                    style={{ accentColor: '#0891b2' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>🔀 Karma Kitap</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Her test kendi tipini JSON'dan alır (çoktan seçmeli + açık uçlu karışık)</div>
                  </div>
                </label>
              </div>
            </div>

            {newBook.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>Optik Form Seçenek Sayısı (Seviye)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${newBook.optionCount === 4 ? '#16a34a' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.optionCount === 4 ? 'rgba(22,163,74,0.12)' : 'var(--color-surface-hover)' }}>
                    <input
                      type="radio"
                      name="optionCount"
                      value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook({ ...newBook, optionCount: 4 })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>4 Şık (A-D)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${newBook.optionCount === 5 ? '#8b5cf6' : 'var(--color-border)'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.optionCount === 5 ? 'rgba(139,92,246,0.12)' : 'var(--color-surface-hover)' }}>
                    <input
                      type="radio"
                      name="optionCount"
                      value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook({ ...newBook, optionCount: 5 })}
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>5 Şık (A-E)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={newBook.pdfUrl || ''}
                onChange={(e) => setNewBook({ ...newBook, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... veya direkt PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDialogOpen(false)} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', padding: '0.65rem 1.25rem', background: 'var(--color-surface-hover)', borderRadius: '0.75rem' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleAddOrUpdateBook} style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff' }}>{editingBook ? "✓ Güncelle" : "➕ Ekle"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON IMPORT MODAL ── */}
      {importModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '720px', padding: '2rem', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', color: 'var(--color-text)' }}>
            <h2 style={{ color: 'var(--color-text)', fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson style={{ color: '#6366f1' }} /> Toplu İçerik İçe Aktar
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
              <strong style={{ color: '#60a5fa' }}>{importModal.book?.title}</strong> kitabına ait dersleri, konuları ve testleri JSON formatında tek seferde ekleyin.
            </p>
            
            <div style={{ background: 'rgba(37,99,235,0.1)', border: '1.5px solid #3b82f6', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={16} /> Kopyalanabilir Örnek JSON Formatları:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sampleCode = sampleJsonFormats[sampleFormatTab];
                    copyToClipboard(sampleFormatTab, sampleCode);
                    setJsonInput(sampleCode);
                  }}
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {copiedFormat === sampleFormatTab ? <Check size={14} /> : <Copy size={14} />} 
                  {copiedFormat === sampleFormatTab ? 'Kopyalandı & Yapıştırıldı!' : 'Kopyala ve Kutuya Yapıştır'}
                </button>
              </div>

              {/* Format Selection Sub-tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSampleFormatTab("standard")}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                    background: sampleFormatTab === "standard" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                    color: sampleFormatTab === "standard" ? '#ffffff' : 'var(--color-text)',
                    boxShadow: sampleFormatTab === "standard" ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                  }}
                >
                  📘 3 Kademeli (Ders &gt; Konu &gt; Test)
                </button>
                <button
                  type="button"
                  onClick={() => setSampleFormatTab("direct")}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                    background: sampleFormatTab === "direct" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface)',
                    color: sampleFormatTab === "direct" ? '#ffffff' : 'var(--color-text)',
                    boxShadow: sampleFormatTab === "direct" ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                  }}
                >
                  📗 2 Kademeli (Ders &gt; Test)
                </button>
                <button
                  type="button"
                  onClick={() => setSampleFormatTab("open_ended")}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                    background: sampleFormatTab === "open_ended" ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'var(--color-surface)',
                    color: sampleFormatTab === "open_ended" ? '#ffffff' : 'var(--color-text)',
                    boxShadow: sampleFormatTab === "open_ended" ? '0 2px 8px rgba(139,92,246,0.2)' : 'none'
                  }}
                >
                  ✍️ Açık Uçlu / Sayısal
                </button>
                <button
                  type="button"
                  onClick={() => setSampleFormatTab("mixed")}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                    background: sampleFormatTab === "mixed" ? 'linear-gradient(135deg, #0891b2, #0e7490)' : 'var(--color-surface)',
                    color: sampleFormatTab === "mixed" ? '#ffffff' : 'var(--color-text)',
                    boxShadow: sampleFormatTab === "mixed" ? '0 2px 8px rgba(8,145,178,0.2)' : 'none'
                  }}
                >
                  🔀 Karma (ÇS + Açık Uçlu)
                </button>
              </div>

              <pre style={{ background: 'var(--color-surface)', color: '#38bdf8', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', overflowX: 'auto', margin: 0, maxHeight: '180px', border: '1px solid var(--color-border)' }}>
                {sampleJsonFormats[sampleFormatTab]}
              </pre>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>JSON Verisini Buraya Yapıştırın</label>
              <textarea 
                autoFocus 
                value={jsonInput} 
                onChange={(e) => setJsonInput(e.target.value)} 
                placeholder='Yukarıdaki "Kopyala ve Kutuya Yapıştır" butonuna basarak örnek veriyi buraya aktarabilir ve düzenleyebilirsiniz...'
                style={{ width: '100%', minHeight: '180px', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                spellCheck={false}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setImportModal({ isOpen: false, book: null })} style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-input)', background: 'var(--color-surface-hover)', padding: '0.65rem 1.25rem', borderRadius: '0.5rem' }}>Vazgeç</button>
              <button className="btn btn-primary" onClick={handleImportJson} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 900, color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem' }}>Verileri Aktar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
