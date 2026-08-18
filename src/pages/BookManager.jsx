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
  const { books, bookTests, addTrackedBook, updateTrackedBook, deleteTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions } = useEvaluation();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Book Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard", optionCount: 5, pdfUrl: "" });

  // Bulk Import States
  const [importModal, setImportModal] = useState({ isOpen: false, book: null });
  const [jsonInput, setJsonInput] = useState("");
  const [sampleFormatTab, setSampleFormatTab] = useState("standard"); // "standard" | "direct" | "open_ended"
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

  const handleAddOrUpdateBook = () => {
    if (!newBook.title.trim() || !newBook.publisher.trim()) {
      showToast("Lütfen tüm alanları doldurun!", "error");
      return;
    }

    try {
      if (editingBook) {
        updateTrackedBook(editingBook.id, newBook);
        showToast("Kitap başarıyla güncellendi!");
      } else {
        addTrackedBook({
          ...newBook,
          createdBy: currentUser?.id,
          teacherId: currentUser?.id
        });
        showToast("Kitap başarıyla eklendi!");
      }
      setNewBook({ title: "", publisher: "", bookType: "standard" });
      setIsDialogOpen(false);
      setEditingBook(null);
    } catch (error) {
      showToast("İşlem sırasında bir hata oluştu!", "error");
    }
  };

  const handleDeleteBook = (id) => {
    if (window.confirm("Bu kitabı silmek istediğinize emin misiniz?")) {
      deleteTrackedBook(id);
      showToast("Kitap silindi!", "success");
      setActiveDropdown(null);
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

  const handleImportJson = () => {
    if (!importModal.book || !jsonInput.trim()) return;
    const targetBook = importModal.book;
    
    try {
      const parsedData = JSON.parse(jsonInput);
      const subjectsList = parsedData.subjects || (Array.isArray(parsedData) ? parsedData : null);

      if (!subjectsList || !Array.isArray(subjectsList)) {
        throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
      }

      const existingSubjects = targetBook.subjects || [];
      const updatedSubjects = JSON.parse(JSON.stringify(existingSubjects)); 
      const testsToCreate = [];

      const genId = (prefix) => prefix + "_" + Date.now().toString() + Math.random().toString(36).substring(2, 7);

      updatedSubjects.forEach(s => {
        if (!s.id) s.id = genId("s");
        if (s.topics && Array.isArray(s.topics)) {
          s.topics.forEach(t => {
            if (!t.id) t.id = genId("t");
          });
        }
      });

      for (const subjData of subjectsList) {
        if (!subjData.name) continue;

        let subject = updatedSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        if (!subject) {
          subject = { 
            id: genId("s"), 
            name: subjData.name, 
            topics: [] 
          };
          updatedSubjects.push(subject);
        }
        if (!subject.topics) subject.topics = [];

        const formatTestPayload = (testData, topicId = null) => {
          const testPayload = {
            subjectId: String(subject.id),
            topicId: topicId ? String(topicId) : null,
            name: String(testData.name || "İsimsiz Test"),
            questionCount: Number(testData.questionCount) || 20,
            answerKey: {}
          };

          if (targetBook.bookType !== 'open_ended' && testData.answerKey) {
            if (Array.isArray(testData.answerKey)) {
              testData.answerKey.forEach((ans, idx) => { 
                if (ans !== undefined && ans !== null && ans !== "") {
                  testPayload.answerKey[String(idx + 1)] = String(ans); 
                }
              });
            } else if (typeof testData.answerKey === 'object') {
              Object.entries(testData.answerKey).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== "") {
                  testPayload.answerKey[k] = String(v);
                }
              });
            }
          }
          return testPayload;
        };

        // 1. Direct tests under subject (Ders > Test)
        if (subjData.tests && Array.isArray(subjData.tests)) {
          for (const testData of subjData.tests) {
            testsToCreate.push(formatTestPayload(testData, null));
          }
        }

        // 2. Topic-based tests (Ders > Konu > Test)
        if (subjData.topics && Array.isArray(subjData.topics)) {
          for (const topicData of subjData.topics) {
            if (!topicData.name) continue;

            let topic = subject.topics.find(t => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            if (!topic) {
              topic = { 
                id: genId("t"), 
                name: topicData.name 
              };
              subject.topics.push(topic);
            }

            if (topicData.tests && Array.isArray(topicData.tests)) {
              for (const testData of topicData.tests) {
                testsToCreate.push(formatTestPayload(testData, topic.id));
              }
            }
          }
        }
      }

      updateTrackedBook(targetBook.id, { subjects: updatedSubjects });
      
      if (testsToCreate.length > 0) {
        for (const testPayload of testsToCreate) {
          addTrackedBookTest(targetBook.id, testPayload);
        }
      }
      
      showToast(`${targetBook.title} kitabına ${testsToCreate.length} test başarıyla eklendi!`);
      setJsonInput("");
      setImportModal({ isOpen: false, book: null });
    } catch (error) {
      showToast("Geçersiz JSON formatı. Lütfen verilen örnekleri inceleyin.", "error");
    }
  };

  const sampleJsonFormats = {
    standard: `{\n  "subjects": [\n    {\n      "name": "Matematik",\n      "topics": [\n        {\n          "name": "Üslü Sayılar",\n          "tests": [\n            { \n              "name": "Test 1", \n              "questionCount": 12, \n              "answerKey": ["A", "B", "C", "D", "E"] \n            }\n          ]\n        }\n      ]\n    }\n  ]\n}`,
    direct: `{\n  "subjects": [\n    {\n      "name": "Türkçe",\n      "tests": [\n        { \n          "name": "Kazanım Testi 1", \n          "questionCount": 20, \n          "answerKey": ["A", "B", "C", "D"] \n        },\n        { \n          "name": "Kazanım Testi 2", \n          "questionCount": 20, \n          "answerKey": ["B", "C", "D", "A"] \n        }\n      ]\n    }\n  ]\n}`,
    open_ended: `{\n  "subjects": [\n    {\n      "name": "Sosyal Bilgiler",\n      "topics": [\n        {\n          "name": "Milli Uyanış",\n          "tests": [\n            { "name": "Klasik Çalışma Kağıdı 1", "questionCount": 5 },\n            { "name": "Klasik Çalışma Kağıdı 2", "questionCount": 8 }\n          ]\n        }\n      ]\n    }\n  ]\n}`
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
            style={{ padding: '0.6rem', border: '1.5px solid #cbd5e1', background: '#ffffff', borderRadius: '0.75rem', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Geri Dön"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="books-header-icon">
            <BookMarked size={28} />
          </div>

          <div className="books-header-titles">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
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
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: '#eff6ff', color: '#6366f1', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Library size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Toplam Kitap</div>
            <div className="books-kpi-val">{enrichedBooks.length}</div>
          </div>
        </div>

        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="books-kpi-label">Çözülen Testler</div>
            <div className="books-kpi-val" style={{ color: '#16a34a' }}>
              {enrichedBooks.reduce((sum, b) => sum + (b.solvedTestCount || 0), 0)} Test
            </div>
          </div>
        </div>

        <div className="books-kpi-card">
          <div style={{ width: 48, height: 48, borderRadius: '1rem', background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#0f172a', fontWeight: 800 }}>
          Yükleniyor...
        </div>
      ) : enrichedBooks.length === 0 ? (
        <div className="books-glass-card" style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
          <BookMarked size={64} style={{ color: '#cbd5e1', margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Henüz Kitap Eklenmemiş</h3>
          <p style={{ color: '#64748b', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
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
                <span className="book-badge" style={{ margin: 0 }}>
                  {book.bookType === 'open_ended' ? '📝 Açık Uçlu Kitap' : '🔘 Standart Soru Bankası'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.65rem', borderRadius: '9999px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                  {book.optionCount === 4 ? '🎯 4 Şık (A-D)' : '🎯 5 Şık (A-E)'}
                </span>
              </div>

              <div className="book-stats">
                <div className="book-stat-item">
                  <span style={{ color: '#475569', fontWeight: 700 }}><Library size={16} /> Ders</span>
                  <strong style={{ color: '#0f172a' }}>{book.subjectCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span style={{ color: '#475569', fontWeight: 700 }}><FileText size={16} /> Test</span>
                  <strong style={{ color: '#0284c7' }}>{book.testCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span style={{ color: '#475569', fontWeight: 700 }}><HelpCircle size={16} /> Soru</span>
                  <strong style={{ color: '#6366f1' }}>{book.questionCount || 0}</strong>
                </div>

                {(book.solvedTestCount || 0) > 0 && (
                  <div className="book-stats-solved">
                    <div className="book-stat-item">
                      <span style={{ color: '#475569', fontWeight: 700 }}>Çözülen Test</span>
                      <span className="tag-mono">{book.solvedTestCount}</span>
                    </div>
                    <div className="book-stat-item" style={{ color: '#16a34a' }}>
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
                  style={{ padding: '0.75rem', width: '3.2rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '520px', padding: '2rem', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a' }}>
            <h2 style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.35rem' }}>{editingBook ? "✏️ Kitabı Düzenle" : "➕ Yeni Kitap Ekle"}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.88rem' }}>{editingBook ? "Kitap bilgilerini güncelleyin." : "Takip edilecek yeni bir kitap oluşturun."}</p>
            
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>Kitap Adı</label>
              <input 
                type="text" 
                value={newBook.title} 
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} 
                placeholder="Örn: 8. Sınıf LGS Matematik Soru Bankası"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>Yayınevi</label>
              <input 
                type="text" 
                value={newBook.publisher} 
                onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} 
                placeholder="Örn: Çap Yayınları, Merkez Yayınları..."
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>Kitap Türü</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1.5px solid ${newBook.bookType === 'standard' ? '#6366f1' : '#e2e8f0'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.bookType === 'standard' ? '#eff6ff' : '#f8fafc' }}>
                  <input 
                    type="radio" 
                    name="bookType" 
                    value="standard" 
                    checked={newBook.bookType === 'standard'} 
                    onChange={() => setNewBook({ ...newBook, bookType: 'standard' })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Standart Soru Bankası</strong> (Çoktan Seçmeli)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1.5px solid ${newBook.bookType === 'open_ended' ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.bookType === 'open_ended' ? '#faf5ff' : '#f8fafc' }}>
                  <input 
                    type="radio" 
                    name="bookType" 
                    value="open_ended" 
                    checked={newBook.bookType === 'open_ended'} 
                    onChange={() => setNewBook({ ...newBook, bookType: 'open_ended' })}
                    style={{ accentColor: '#8b5cf6' }}
                  />
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Açık Uçlu Kitap</strong> (Klasik / Yazılı Sorular)
                </label>
              </div>
            </div>

            {newBook.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>Optik Form Seçenek Sayısı (Seviye)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${newBook.optionCount === 4 ? '#16a34a' : '#e2e8f0'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.optionCount === 4 ? '#f0fdf4' : '#f8fafc' }}>
                    <input
                      type="radio"
                      name="optionCount"
                      value={4}
                      checked={newBook.optionCount === 4}
                      onChange={() => setNewBook({ ...newBook, optionCount: 4 })}
                      style={{ accentColor: '#16a34a' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a' }}>4 Şık (A-D)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ortaokul / LGS</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: `1.5px solid ${newBook.optionCount === 5 ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: '0.75rem', cursor: 'pointer', background: newBook.optionCount === 5 ? '#faf5ff' : '#f8fafc' }}>
                    <input
                      type="radio"
                      name="optionCount"
                      value={5}
                      checked={newBook.optionCount === 5}
                      onChange={() => setNewBook({ ...newBook, optionCount: 5 })}
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a' }}>5 Şık (A-E)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Lise / YKS</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>PDF Linki (İsteğe Bağlı)</label>
              <input
                type="url"
                value={newBook.pdfUrl || ''}
                onChange={(e) => setNewBook({ ...newBook, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... veya direkt PDF URL"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDialogOpen(false)} style={{ color: '#475569', borderColor: '#cbd5e1', padding: '0.65rem 1.25rem', background: '#f8fafc', borderRadius: '0.75rem' }}>İptal</button>
              <button className="btn btn-primary" onClick={handleAddOrUpdateBook} style={{ padding: '0.65rem 1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff' }}>{editingBook ? "✓ Güncelle" : "➕ Ekle"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON IMPORT MODAL ── */}
      {importModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', padding: '1.25rem' }}>
          <div className="modal-content" style={{ width: '96vw', maxWidth: '720px', padding: '2rem', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a' }}>
            <h2 style={{ color: '#0f172a', fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson style={{ color: '#6366f1' }} /> Toplu İçerik İçe Aktar
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
              <strong style={{ color: '#1e40af' }}>{importModal.book?.title}</strong> kitabına ait dersleri, konuları ve testleri JSON formatında tek seferde ekleyin.
            </p>
            
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '1rem', borderRadius: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    background: sampleFormatTab === "standard" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff',
                    color: sampleFormatTab === "standard" ? '#ffffff' : '#475569',
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
                    background: sampleFormatTab === "direct" ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff',
                    color: sampleFormatTab === "direct" ? '#ffffff' : '#475569',
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
                    background: sampleFormatTab === "open_ended" ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#ffffff',
                    color: sampleFormatTab === "open_ended" ? '#ffffff' : '#475569',
                    boxShadow: sampleFormatTab === "open_ended" ? '0 2px 8px rgba(139,92,246,0.2)' : 'none'
                  }}
                >
                  ✍️ Açık Uçlu / Klasik
                </button>
              </div>

              <pre style={{ background: '#f8fafc', color: '#0369a1', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '0.82rem', overflowX: 'auto', margin: 0, maxHeight: '180px', border: '1px solid #e2e8f0' }}>
                {sampleJsonFormats[sampleFormatTab]}
              </pre>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>JSON Verisini Buraya Yapıştırın</label>
              <textarea 
                autoFocus 
                value={jsonInput} 
                onChange={(e) => setJsonInput(e.target.value)} 
                placeholder='Yukarıdaki "Kopyala ve Kutuya Yapıştır" butonuna basarak örnek veriyi buraya aktarabilir ve düzenleyebilirsiniz...'
                style={{ width: '100%', minHeight: '180px', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                spellCheck={false}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setImportModal({ isOpen: false, book: null })} style={{ color: '#475569', borderColor: '#cbd5e1', background: '#f8fafc', padding: '0.65rem 1.25rem', borderRadius: '0.5rem' }}>Vazgeç</button>
              <button className="btn btn-primary" onClick={handleImportJson} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 900, color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem' }}>Verileri Aktar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
