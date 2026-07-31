import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { 
  ArrowLeft, Plus, Trash2, BookMarked, Library, 
  FileText, HelpCircle, CheckCircle, XCircle, 
  Edit, MoreVertical, ArrowRight, FileJson, AlertCircle 
} from 'lucide-react';
import './BookManager.css';

export default function BookManager() {
  const navigate = useNavigate();
  const { books, bookTests, addTrackedBook, updateTrackedBook, deleteTrackedBook, addTrackedBookTest } = useTrackedBooks();
  const { submissions } = useEvaluation();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Book Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard" });

  // Bulk Import States
  const [importModal, setImportModal] = useState({ isOpen: false, book: null });
  const [jsonInput, setJsonInput] = useState("");

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
      setNewBook({ title: editingBook.title, publisher: editingBook.publisher, bookType: editingBook.bookType || 'standard' });
    } else {
      setNewBook({ title: "", publisher: "", bookType: "standard" });
    }
  }, [editingBook]);

  const enrichedBooks = useMemo(() => {
    return books.map(book => {
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
  }, [books, bookTests, submissions]);

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
        addTrackedBook(newBook);
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
      if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
        throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
      }

      const existingSubjects = targetBook.subjects || [];
      const updatedSubjects = JSON.parse(JSON.stringify(existingSubjects)); 
      const testsToCreate = [];

      updatedSubjects.forEach(s => {
        if (!s.id) s.id = "s_" + Date.now().toString() + Math.random().toString(36).substring(2, 9);
        if (s.topics && Array.isArray(s.topics)) {
          s.topics.forEach(t => {
            if (!t.id) t.id = "t_" + Date.now().toString() + Math.random().toString(36).substring(2, 9);
          });
        }
      });

      for (const subjData of parsedData.subjects) {
        if (!subjData.name) continue;

        let subject = updatedSubjects.find(s => s.name?.toLocaleLowerCase('tr-TR') === subjData.name.toLocaleLowerCase('tr-TR'));
        if (!subject) {
          subject = { 
            id: "s_" + Date.now().toString() + Math.random().toString(36).substring(2, 9), 
            name: subjData.name, 
            topics: [] 
          };
          updatedSubjects.push(subject);
        }

        if (subjData.topics && Array.isArray(subjData.topics)) {
          if (!subject.topics) subject.topics = [];
          
          for (const topicData of subjData.topics) {
            if (!topicData.name) continue;

            let topic = subject.topics.find(t => t.name?.toLocaleLowerCase('tr-TR') === topicData.name.toLocaleLowerCase('tr-TR'));
            if (!topic) {
              topic = { 
                id: "t_" + Date.now().toString() + Math.random().toString(36).substring(2, 9), 
                name: topicData.name 
              };
              subject.topics.push(topic);
            }

            if (topicData.tests && Array.isArray(topicData.tests)) {
              for (const testData of topicData.tests) {
                const safeSubjectId = subject.id ? String(subject.id) : ("s_" + Date.now());
                const safeTopicId = topic.id ? String(topic.id) : ("t_" + Date.now());

                const testPayload = {
                  subjectId: safeSubjectId,
                  topicId: safeTopicId,
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
                testsToCreate.push(testPayload);
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
      
      showToast(`${targetBook.title} kitabına ${testsToCreate.length} test eklendi.`);
      setJsonInput("");
      setImportModal({ isOpen: false, book: null });
    } catch (error) {
      showToast("Geçersiz JSON formatı.", "error");
    }
  };

  const getSampleJson = (bookType = 'standard') => {
    if (bookType === 'open_ended') {
      return `{\n  "subjects": [\n    {\n      "name": "Matematik",\n      "topics": [\n        {\n          "name": "Üslü Sayılar",\n          "tests": [\n            { "name": "Klasik Sorular Testi 1", "questionCount": 5 },\n            { "name": "Klasik Sorular Testi 2", "questionCount": 8 }\n          ]\n        }\n      ]\n    }\n  ]\n}`;
    }
    return `{\n  "subjects": [\n    {\n      "name": "Matematik",\n      "topics": [\n        {\n          "name": "Üslü Sayılar",\n          "tests": [\n            { \n              "name": "Test 1", \n              "questionCount": 12, \n              "answerKey": ["A", "B", "C", "D", "E"] \n            }\n          ]\n        }\n      ]\n    }\n  ]\n}`;
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/admin')} style={{ padding: '0.5rem', border: 'none', background: 'transparent' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: 'white', padding: '1rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-primary)' }}>Kitap Takibi</h1>
            <p className="text-muted" style={{ margin: 0 }}>Fiziki Soru Bankaları ve Kütüphane Yönetimi</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openDialog(null)}>
          <Plus size={18} /> Yeni Kitap Ekle
        </button>
      </div>

      {/* MAIN CONTENT */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          Yükleniyor...
        </div>
      ) : enrichedBooks.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookMarked size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3, margin: '0 auto 1rem auto' }} />
          <h3>Henüz Kitap Eklenmemiş</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Takip edilecek fiziksel soru bankalarınızı buradan ekleyebilirsiniz.</p>
          <button className="btn btn-outline" onClick={() => openDialog(null)}>İlk Kitabı Ekle</button>
        </div>
      ) : (
        <div className="book-grid">
          {enrichedBooks.map((book) => (
            <div key={book.id} className="card glass book-card">
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
                    <div className="book-dropdown card" ref={dropdownRef}>
                      <button onClick={() => openDialog(book)}><Edit size={16} /> Düzenle</button>
                      <button onClick={() => handleDeleteBook(book.id)} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /> Sil</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="book-badge">
                {book.bookType === 'open_ended' ? 'Açık Uçlu Kitap' : 'Standart Soru Bankası'}
              </div>

              <div className="book-stats">
                <div className="book-stat-item">
                  <span className="text-muted"><Library size={16} /> Ders</span>
                  <strong>{book.subjectCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span className="text-muted"><FileText size={16} /> Test</span>
                  <strong>{book.testCount || 0}</strong>
                </div>
                <div className="book-stat-item">
                  <span className="text-muted"><HelpCircle size={16} /> Soru</span>
                  <strong>{book.questionCount || 0}</strong>
                </div>
              </div>

              {(book.solvedTestCount || 0) > 0 && (
                <div className="book-stats-solved">
                  <div className="book-stat-item">
                    <span className="text-muted">Çözülen Test</span>
                    <span className="tag-mono">{book.solvedTestCount}</span>
                  </div>
                  <div className="book-stat-item" style={{ color: 'var(--color-success)' }}>
                    <span><CheckCircle size={14} /> Doğru</span>
                    <span className="tag-success">{book.totalCorrectAnswers}</span>
                  </div>
                  <div className="book-stat-item" style={{ color: 'var(--color-error)' }}>
                    <span><XCircle size={14} /> Yanlış</span>
                    <span className="tag-danger">{book.totalIncorrectAnswers}</span>
                  </div>
                </div>
              )}

              <div className="book-actions">
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => handleManageBook(book.id)}>
                  İçeriği Yönet <ArrowRight size={16} style={{ marginLeft: '0.25rem' }} />
                </button>
                <button 
                  className="btn btn-outline" 
                  title="JSON İle Toplu İçerik Ekle"
                  style={{ padding: '0.5rem', width: '3rem' }}
                  onClick={() => {
                    setJsonInput("");
                    setImportModal({ isOpen: true, book });
                  }}
                >
                  <FileJson size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW / EDIT BOOK MODAL */}
      {isDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '500px', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>{editingBook ? "Kitabı Düzenle" : "Yeni Kitap Ekle"}</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{editingBook ? "Kitap bilgilerini güncelleyin." : "Takip edilecek yeni bir kitap oluşturun."}</p>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Kitap Adı</label>
              <input 
                type="text" 
                className="input-field"
                value={newBook.title} 
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} 
                placeholder="Örn: TYT Matematik Soru Bankası"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Yayınevi</label>
              <input 
                type="text" 
                className="input-field"
                value={newBook.publisher} 
                onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} 
                placeholder="Örn: Merkez Yayınları"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Kitap Türü</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className={`radio-card ${newBook.bookType === 'standard' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', background: newBook.bookType === 'standard' ? 'rgba(124, 58, 237, 0.05)' : 'transparent', borderColor: newBook.bookType === 'standard' ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)' }}>
                  <input 
                    type="radio" 
                    name="bookType" 
                    value="standard" 
                    checked={newBook.bookType === 'standard'} 
                    onChange={() => setNewBook({ ...newBook, bookType: 'standard' })}
                    style={{ accentColor: 'var(--color-primary)', transform: 'scale(1.2)' }}
                  />
                  <strong>Standart Soru Bankası</strong> (Çoktan Seçmeli)
                </label>
                <label className={`radio-card ${newBook.bookType === 'open_ended' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', background: newBook.bookType === 'open_ended' ? 'rgba(124, 58, 237, 0.05)' : 'transparent', borderColor: newBook.bookType === 'open_ended' ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)' }}>
                  <input 
                    type="radio" 
                    name="bookType" 
                    value="open_ended" 
                    checked={newBook.bookType === 'open_ended'} 
                    onChange={() => setNewBook({ ...newBook, bookType: 'open_ended' })}
                    style={{ accentColor: 'var(--color-primary)', transform: 'scale(1.2)' }}
                  />
                  <strong>Açık Uçlu Kitap</strong> (Klasik Sorular)
                </label>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleAddOrUpdateBook}>{editingBook ? "Güncelle" : "Ekle"}</button>
            </div>
          </div>
        </div>
      )}

      {/* JSON IMPORT MODAL */}
      {importModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '700px', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson /> Toplu İçerik İçe Aktar
            </h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{importModal.book?.title}</strong> kitabına ait dersleri, konuları ve testleri JSON formatında tek seferde ekleyin.
            </p>
            
            <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> Örnek JSON Formatı 
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  ({importModal.book?.bookType === 'open_ended' ? 'Açık Uçlu - Soru Sayılı' : 'Standart - Cevap Anahtarlı'})
                </span>
              </h4>
              <pre style={{ background: 'rgba(0,0,0,0.8)', color: '#a7f3d0', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem', overflowX: 'auto' }}>
                {getSampleJson(importModal.book?.bookType)}
              </pre>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>JSON Verisini Buraya Yapıştırın</label>
              <textarea 
                autoFocus 
                value={jsonInput} 
                onChange={(e) => setJsonInput(e.target.value)} 
                placeholder='{"subjects": [...]}'
                style={{ width: '100%', minHeight: '200px', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.2)', fontFamily: 'monospace', resize: 'vertical' }}
                spellCheck={false}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setImportModal({ isOpen: false, book: null })}>Vazgeç</button>
              <button className="btn btn-primary" onClick={handleImportJson} style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Verileri Aktar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
