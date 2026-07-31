import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { 
  ArrowLeft, BookMarked, Layers, FileText, CheckCircle, 
  ChevronDown, ChevronRight, Plus, Edit, Trash2, 
  ListX, Send, XCircle, FileOutput, Filter, AlertTriangle, FileJson, CheckSquare
} from 'lucide-react';

export default function BookContentManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, bookTests, updateTrackedBook, deleteTrackedBookTest, addTrackedBookTest, updateTrackedBookTest, deleteTrackedBookSubject, deleteTrackedBookTopic } = useTrackedBooks();
  const { submissions } = useEvaluation();
  const { addHomework } = useHomework();
  const { users } = useUser();
  
  const book = books.find(b => b.id === id);
  const tests = useMemo(() => bookTests.filter(t => t.bookId === id), [bookTests, id]);
  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);

  const [activeTab, setActiveTab] = useState("contents"); // "contents" | "mistakes"
  
  // Accordion States
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [selectedTests, setSelectedTests] = useState([]);

  // Modal States
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkTestDialogOpen, setIsBulkTestDialogOpen] = useState(false);

  // Form States
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [testFormData, setTestFormData] = useState({ name: "", questionCount: 20, answerKey: {} });
  const [bulkTestFormData, setBulkTestFormData] = useState({ testCount: 10, questionCount: 20, prefix: "Test" });
  
  const [assignFormData, setAssignFormData] = useState({ studentIds: [], dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  // Mistake Filter States
  const [mistakeFilterSubject, setMistakeFilterSubject] = useState("all");
  const [mistakeFilterTopic, setMistakeFilterTopic] = useState("all");

  const showToast = (msg, type = 'success') => {
    alert(`${type === 'success' ? '✅' : '❌'} ${msg}`);
  };

  // --- MISTAKE ANALYSIS LOGIC ---
  const mistakeList = useMemo(() => {
    const mistakesBySubject = {};
    // Sadece bu kitaba ait testlerin sonuçlanmış (completed) olanlarını bul
    const solvedSubmissions = submissions.filter(s => tests.some(t => t.id === s.testId) && s.status === 'completed');

    for (const sub of solvedSubmissions) {
      const testDef = tests.find(t => t.id === sub.testId);
      if (!testDef) continue;
      
      const subject = book?.subjects?.find(s => s.id === testDef.subjectId);
      const topic = subject?.topics?.find(t => t.id === testDef.topicId);
      if (!subject || !topic) continue;

      sub.answers.forEach(ans => {
        if (!ans.isCorrect) {
          const isBlank = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
          if (!mistakesBySubject[subject.name]) mistakesBySubject[subject.name] = {};
          if (!mistakesBySubject[subject.name][topic.name]) mistakesBySubject[subject.name][topic.name] = [];
          
          mistakesBySubject[subject.name][topic.name].push({ 
            submission: sub, 
            testDef, 
            questionNumber: ans.questionId,
            isBlank
          });
        }
      });
    }
    return mistakesBySubject;
  }, [submissions, tests, book]);

  const { filteredMistakes, subjectOptions, topicOptions } = useMemo(() => {
    const flatList = [];
    Object.entries(mistakeList).forEach(([subjectName, topics]) => {
        Object.entries(topics).forEach(([topicName, mistakes]) => {
            mistakes.forEach(mistake => {
                flatList.push({ subjectName, topicName, ...mistake });
            });
        });
    });

    const filtered = flatList.filter(m => {
        if (mistakeFilterSubject !== 'all' && m.subjectName !== mistakeFilterSubject) return false;
        if (mistakeFilterTopic !== 'all' && m.topicName !== mistakeFilterTopic) return false;
        return true;
    });

    const grouped = [];
    const map = new Map();
    filtered.forEach(m => {
        const key = `${m.submission.studentId}_${m.testDef.id}`;
        if (!map.has(key)) {
            map.set(key, {
                subjectName: m.subjectName,
                topicName: m.topicName,
                testDef: m.testDef,
                submission: m.submission,
                questionData: [{ num: parseInt(m.questionNumber), isBlank: m.isBlank }]
            });
            grouped.push(map.get(key));
        } else {
            if (!map.get(key).questionData.find(q => q.num === parseInt(m.questionNumber))) {
                map.get(key).questionData.push({ num: parseInt(m.questionNumber), isBlank: m.isBlank });
            }
        }
    });

    grouped.forEach(g => {
        g.questionData.sort((a, b) => a.num - b.num);
    });

    const subjects = Array.from(new Set(flatList.map(m => m.subjectName))).sort();
    const topics = Array.from(new Set(
        flatList.filter(m => mistakeFilterSubject === 'all' || m.subjectName === mistakeFilterSubject).map(m => m.topicName)
    )).sort();

    return { filteredMistakes: grouped, subjectOptions: subjects, topicOptions: topics };
  }, [mistakeList, mistakeFilterSubject, mistakeFilterTopic]);


  // --- HANDLERS ---
  const toggleSubject = (subjId) => setExpandedSubjects(p => ({ ...p, [subjId]: !p[subjId] }));
  const toggleTopic = (topicId) => setExpandedTopics(p => ({ ...p, [topicId]: !p[topicId] }));
  const toggleTestSelection = (testId) => setSelectedTests(p => p.includes(testId) ? p.filter(id => id !== testId) : [...p, testId]);

  const handleSubjectSave = async () => {
    if (!book || !newSubjectName.trim()) return;
    const subjects = book.subjects || [];
    if (currentSubject) {
      const updatedSubjects = subjects.map(s => s.id === currentSubject.id ? { ...s, name: newSubjectName } : s);
      updateTrackedBook(book.id, { subjects: updatedSubjects });
    } else {
      const newSubject = { id: `subj_${Date.now()}`, name: newSubjectName, topics: [] };
      updateTrackedBook(book.id, { subjects: [...subjects, newSubject] });
    }
    setIsSubjectDialogOpen(false);
    setNewSubjectName("");
    setCurrentSubject(null);
  };

  const handleDeleteSubject = (subjId) => {
    if (window.confirm("Bu dersi ve içindeki tüm konuları/testleri silmek istediğinize emin misiniz?")) {
      const updatedSubjects = book.subjects.filter(s => s.id !== subjId);
      updateTrackedBook(book.id, { subjects: updatedSubjects });
      // TODO: Cascade delete tests as well if needed
    }
  };

  const handleTopicSave = async () => {
    if (!book || !currentSubject || !newTopicName.trim()) return;
    const subjects = book.subjects.map(subject => {
        if(subject.id === currentSubject.id) {
            const topics = subject.topics || [];
            if (currentTopic) {
                return {...subject, topics: topics.map(t => t.id === currentTopic.id ? { ...t, name: newTopicName } : t)};
            } else {
                 const newTopic = { id: `topic_${Date.now()}`, name: newTopicName };
                 return {...subject, topics: [...topics, newTopic]};
            }
        }
        return subject;
    });
    updateTrackedBook(book.id, { subjects });
    setIsTopicDialogOpen(false);
    setNewTopicName("");
    setCurrentTopic(null);
  };

  const handleDeleteTopic = (subjId, topicId) => {
    if (window.confirm("Bu konuyu silmek istediğinize emin misiniz?")) {
      const subjects = book.subjects.map(subject => {
        if (subject.id === subjId) {
          return { ...subject, topics: subject.topics.filter(t => t.id !== topicId) };
        }
        return subject;
      });
      updateTrackedBook(book.id, { subjects });
    }
  };

  const handleTestSave = async () => {
    if (!book || !currentSubject || !currentTopic || !testFormData.name.trim()) return;
    
    const testPayload = {
      subjectId: String(currentSubject.id),
      topicId: String(currentTopic.id),
      name: testFormData.name,
      questionCount: testFormData.questionCount,
    };
    
    if (book.bookType !== 'open_ended') testPayload.answerKey = testFormData.answerKey;

    if (currentTest) updateTrackedBookTest(currentTest.id, testPayload);
    else addTrackedBookTest(book.id, testPayload);
    
    setIsTestDialogOpen(false);
  };

  const handleBulkTestSave = () => {
    if (!book || !currentSubject || !currentTopic) return;
    const { testCount, questionCount, prefix } = bulkTestFormData;
    
    for (let i = 1; i <= testCount; i++) {
      addTrackedBookTest(book.id, {
        subjectId: String(currentSubject.id),
        topicId: String(currentTopic.id),
        name: `${prefix} ${i}`,
        questionCount: questionCount,
        answerKey: {}
      });
    }
    
    showToast(`${testCount} adet test eklendi.`);
    setIsBulkTestDialogOpen(false);
  };

  const handleAssignDialogStudentSelection = (studentId, checked) => {
    setAssignFormData(prev => ({
      ...prev, 
      studentIds: checked ? [...prev.studentIds, studentId] : prev.studentIds.filter(id => id !== studentId)
    }));
  };

  const handleAssignSelectedTests = () => {
    if (selectedTests.length === 0 || assignFormData.studentIds.length === 0) {
      showToast("Lütfen en az bir test ve bir öğrenci seçin.", "error");
      return;
    }

    selectedTests.forEach(testId => {
      const testDef = tests.find(t => t.id === testId);
      if (!testDef) return;

      const subjectObj = book.subjects?.find(s => s.id === testDef.subjectId);
      const topicObj = subjectObj?.topics?.find(t => t.id === testDef.topicId);

      addHomework({
        title: `${book.title} - ${testDef.name}`,
        description: `${subjectObj?.name || ''} - ${topicObj?.name || ''} fiziksel kitaptan çözülecek.`,
        targetType: 'student',
        targetIds: assignFormData.studentIds,
        dueDate: assignFormData.dueDate.toISOString(),
        tests: [testId], // Linking physical test ID
        sourceType: 'trackedBook'
      });
    });

    showToast(`${selectedTests.length} test ödev olarak atandı!`);
    setIsAssignDialogOpen(false);
    setSelectedTests([]);
    setAssignFormData({ studentIds: [], dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  };

  const handleDownloadMistakes = () => {
    if (!book || filteredMistakes.length === 0) {
      showToast("İndirilecek yanlış bulunamadı.", "error");
      return;
    }
    
    let content = `"${book.title}" Kitabı Yanlış Analizi\n====================================\n\n`;
    
    const sorted = [...filteredMistakes].sort((a, b) => {
       if (a.subjectName !== b.subjectName) return a.subjectName.localeCompare(b.subjectName);
       if (a.topicName !== b.topicName) return a.topicName.localeCompare(b.topicName);
       return a.testDef.name.localeCompare(b.testDef.name);
    });

    let currentSubject = "";
    let currentTopic = "";

    sorted.forEach(m => {
       if (m.subjectName !== currentSubject) {
           content += `\nDERS: ${m.subjectName}\n--------------------\n`;
           currentSubject = m.subjectName;
           currentTopic = "";
       }
       if (m.topicName !== currentTopic) {
           content += `  Konu: ${m.topicName}\n`;
           currentTopic = m.topicName;
       }
       const questionsStr = m.questionData.map(q => q.num + (q.isBlank ? " (Boş)" : "")).join(", ");
       content += `    - Test: ${m.testDef.name} | Öğrenci: ${m.submission.studentName} | Hatalı Sorular: ${questionsStr}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yanlis-analizi-${book.title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Yanlış analizi indirildi.");
  };

  if (!book) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Yükleniyor...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem', paddingBottom: selectedTests.length > 0 ? '6rem' : '2rem' }}>
      
      {/* HEADER */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/books')} style={{ padding: '0.5rem', border: 'none', background: 'transparent' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: 'white', padding: '1rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-primary)' }}>{book.title}</h1>
            <p className="text-muted" style={{ margin: 0 }}>İçerik Yönetimi - {book.publisher}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
            <FileJson size={18} /> JSON Aktar
          </button>
          <button className="btn btn-primary" onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}>
            <Plus size={18} /> Ders Ekle
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab("contents")}
          style={{ 
            background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === "contents" ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: activeTab === "contents" ? '3px solid var(--color-primary)' : '3px solid transparent'
          }}
        >
          İçindekiler
        </button>
        <button 
          onClick={() => setActiveTab("mistakes")}
          style={{ 
            background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: activeTab === "mistakes" ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: activeTab === "mistakes" ? '3px solid var(--color-primary)' : '3px solid transparent'
          }}
        >
          Yanlış Analizi 
          {Object.keys(mistakeList).length > 0 && <span style={{ background: 'var(--color-error)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{Object.values(mistakeList).flatMap(Object.values).flat().length}</span>}
        </button>
      </div>

      {/* CONTENTS TAB */}
      {activeTab === "contents" && (
        <div className="card glass" style={{ padding: '2rem' }}>
          {book.subjects && book.subjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {book.subjects.map(subject => (
                <div key={subject.id} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                  
                  {/* Subject Header */}
                  <div style={{ background: 'rgba(124, 58, 237, 0.05)', display: 'flex', alignItems: 'center', borderBottom: expandedSubjects[subject.id] ? '1px solid rgba(0,0,0,0.1)' : 'none' }}>
                    <div 
                      onClick={() => toggleSubject(subject.id)}
                      style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', flexGrow: 1, cursor: 'pointer' }}
                    >
                      {expandedSubjects[subject.id] ? <ChevronDown size={20} style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} /> : <ChevronRight size={20} style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} />}
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={18} /> {subject.name}
                      </h3>
                      <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
                        {subject.topics?.length || 0} Konu
                      </span>
                    </div>
                    <div style={{ padding: '0 1rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setCurrentSubject(subject); setNewSubjectName(subject.name); setIsSubjectDialogOpen(true); }} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }}><Edit size={16} /></button>
                      <button onClick={() => handleDeleteSubject(subject.id)} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {/* Topics List */}
                  {expandedSubjects[subject.id] && subject.topics && (
                    <div style={{ padding: '1rem' }}>
                      {subject.topics.map(topic => {
                        const topicTests = tests.filter(t => t.topicId === topic.id);
                        return (
                          <div key={topic.id} style={{ borderLeft: '2px solid var(--color-primary-light)', margin: '0.5rem 1.5rem 1.5rem 1.5rem', paddingLeft: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div 
                                onClick={() => toggleTopic(topic.id)}
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexGrow: 1 }}
                              >
                                {expandedTopics[topic.id] ? <ChevronDown size={16} style={{ marginRight: '0.5rem' }} /> : <ChevronRight size={16} style={{ marginRight: '0.5rem' }} />}
                                <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <FileText size={16} style={{ color: 'var(--color-secondary)' }} /> {topic.name}
                                </h4>
                                <span style={{ marginLeft: '1rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>{topicTests.length} Test</span>
                              </div>
                              <button onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setNewTopicName(topic.name); setIsTopicDialogOpen(true); }} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }}><Edit size={14} /></button>
                              <button onClick={() => handleDeleteTopic(subject.id, topic.id)} className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                            </div>

                            {/* Tests List */}
                            {expandedTopics[topic.id] && (
                              <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                                  {topicTests.length > 0 ? (
                                    topicTests.map(test => (
                                      <div key={test.id} className="card" style={{ padding: '0.75rem 1rem', background: 'var(--color-bg)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <input 
                                            type="checkbox" 
                                            checked={selectedTests.includes(test.id)} 
                                            onChange={() => toggleTestSelection(test.id)}
                                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                          />
                                          <div>
                                            <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{test.name}</h5>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{test.questionCount} Soru</div>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                          <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(test); setTestFormData({ name: test.name, questionCount: test.questionCount, answerKey: test.answerKey || {} }); setIsTestDialogOpen(true); }}>
                                            <Edit size={14} />
                                          </button>
                                          <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none', color: 'var(--color-error)' }} onClick={() => { if(window.confirm('Emin misiniz?')) deleteTrackedBookTest(test.id); }}>
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted" style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>Bu konuda test bulunmuyor.</p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setCurrentTest(null); setTestFormData({ name: "", questionCount: 20, answerKey: {} }); setIsTestDialogOpen(true); }}>
                                    <Plus size={14} /> Test Ekle
                                  </button>
                                  <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setIsBulkTestDialogOpen(true); }}>
                                    <CheckSquare size={14} /> Toplu Test Ekle
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button className="btn btn-outline" style={{ marginTop: '0.5rem', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)' }} onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}>
                        <Plus size={16} /> Yeni Konu Ekle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--border-radius-md)' }}>
              <p className="text-muted">Bu kitaba henüz içerik (ders/konu) eklenmemiş.</p>
              <button className="btn btn-outline" onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }} style={{ marginTop: '1rem' }}>
                İlk Dersi Ekle
              </button>
            </div>
          )}
        </div>
      )}

      {/* MISTAKES TAB */}
      {activeTab === "mistakes" && (
        <div className="card glass" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ListX size={28} style={{ color: 'var(--color-error)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Yanlış Analizi</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Kitaptaki hatalı cevapların dökümü.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {subjectOptions.length > 0 && (
                <select className="input-field" value={mistakeFilterSubject} onChange={e => setMistakeFilterSubject(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <option value="all">Tüm Dersler</option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select className="input-field" value={mistakeFilterTopic} onChange={e => setMistakeFilterTopic(e.target.value)} disabled={mistakeFilterSubject === 'all' && topicOptions.length === 0} style={{ padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }}>
                <option value="all">Tüm Konular</option>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {Object.keys(mistakeList).length > 0 && (
                <button className="btn btn-outline" onClick={handleDownloadMistakes}><FileOutput size={16} /> İndir</button>
              )}
            </div>
          </div>

          {filteredMistakes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Ders</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Konu</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Test Adı</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Hatalı Sorular</th>
                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Öğrenci</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMistakes.map((mistake, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.85rem' }}>{mistake.subjectName}</span></td>
                      <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 500 }}>{mistake.topicName}</td>
                      <td style={{ padding: '1rem', fontSize: '0.95rem' }}>{mistake.testDef.name}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {mistake.questionData.map((q, idx) => (
                            <span key={idx} style={{ color: q.isBlank ? 'var(--color-text-muted)' : 'var(--color-error)' }}>
                              {q.num}{idx < mistake.questionData.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{mistake.submission.studentName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <CheckCircle size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <p>Yanlış soru bulunamadı. Öğrencileriniz harika iş çıkarıyor!</p>
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR SELECTED TESTS */}
      {selectedTests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'var(--color-primary)', color: 'white', padding: '1rem 2rem', borderRadius: '3rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedTests.length} Test Seçildi</span>
          <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.3)' }} />
          <button onClick={() => setIsAssignDialogOpen(true)} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            Ata <Send size={18} />
          </button>
          <button onClick={() => setSelectedTests([])} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.3rem', cursor: 'pointer', display: 'flex' }}>
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* MODALS */}
      
      {/* Subject Modal */}
      {isSubjectDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ders Adı</label>
              <input type="text" className="input-field" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Matematik, Fizik..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsSubjectDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSubjectSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {isTopicDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Konu Adı</label>
              <input type="text" className="input-field" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Üslü Sayılar, Dinamik..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTopicDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleTopicSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {isTestDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{currentTest ? 'Testi Düzenle' : 'Yeni Test Ekle'}</h3>
            <div className="form-group" style={{ margin: '1.5rem 0 1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Test Adı</label>
              <input type="text" className="input-field" value={testFormData.name} onChange={e => setTestFormData(p => ({...p, name: e.target.value}))} placeholder="Test 1, Zor Seviye..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Soru Sayısı</label>
              <input type="number" className="input-field" value={testFormData.questionCount} onChange={e => setTestFormData(p => ({...p, questionCount: parseInt(e.target.value)||0}))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} />
            </div>
            {book.bookType !== 'open_ended' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span>Cevap Anahtarı (İsteğe Bağlı)</span>
                  <input 
                    type="text" 
                    placeholder="Toplu Gir (Örn: ABC...)"
                    onChange={(e) => {
                      const str = e.target.value;
                      const newKey = {};
                      str.replace(/[^A-Ea-e]/g, '').toUpperCase().split('').forEach((char, idx) => {
                        if(idx < testFormData.questionCount) newKey[idx + 1] = char;
                      });
                      setTestFormData(p => ({...p, answerKey: newKey}));
                    }}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)', width: '160px', outline: 'none' }}
                  />
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  {Array.from({ length: testFormData.questionCount }).map((_, i) => {
                    const qNum = i + 1;
                    const val = testFormData.answerKey?.[qNum] || '';
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '20px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{qNum}.</div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {['A','B','C','D','E'].map(opt => {
                            const isSelected = val === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setTestFormData(p => ({ ...p, answerKey: { ...p.answerKey, [qNum]: opt } }))}
                                style={{
                                  width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.2)',
                                  background: isSelected ? 'var(--color-primary)' : 'white',
                                  color: isSelected ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {testFormData.questionCount === 0 && <span className="text-muted" style={{ fontSize: '0.8rem', gridColumn: '1 / -1', textAlign: 'center' }}>Önce soru sayısı girin.</span>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsTestDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleTestSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Test Modal */}
      {isBulkTestDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>Toplu Test Ekle</h3>
            <div className="form-group" style={{ margin: '1.5rem 0 1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Oluşturulacak Test Sayısı</label>
              <input type="number" className="input-field" value={bulkTestFormData.testCount} onChange={e => setBulkTestFormData(p => ({...p, testCount: parseInt(e.target.value)||1}))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} autoFocus />
            </div>
            <div className="form-group" style={{ margin: '0 0 1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Her Testteki Soru Sayısı</label>
              <input type="number" className="input-field" value={bulkTestFormData.questionCount} onChange={e => setBulkTestFormData(p => ({...p, questionCount: parseInt(e.target.value)||1}))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Önek (Test 1, Test 2 vb.)</label>
              <input type="text" className="input-field" value={bulkTestFormData.prefix} onChange={e => setBulkTestFormData(p => ({...p, prefix: e.target.value}))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsBulkTestDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleBulkTestSave}>Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Homework Modal */}
      {isAssignDialogOpen && (
        <div className="modal-overlay">
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>Ödev Ata ({selectedTests.length} Test)</h3>
            <div className="form-group" style={{ margin: '1.5rem 0 1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Öğrenci(ler)</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                {students.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '0.25rem' }}>
                    <input type="checkbox" checked={assignFormData.studentIds.includes(s.id)} onChange={e => handleAssignDialogStudentSelection(s.id, e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
                    {s.name}
                  </label>
                ))}
                {students.length === 0 && <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', margin: 0 }}>Sistemde öğrenci bulunmuyor.</p>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsAssignDialogOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleAssignSelectedTests}>Ödevleri Ata</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
