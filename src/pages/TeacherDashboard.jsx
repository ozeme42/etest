import { useState } from 'react';
import { Plus, TrendingUp, X, Edit2 } from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import './Dashboard.css';

export default function TeacherDashboard() {
  const { data, addTest, updateTest } = useCurriculum();
  const { questions } = useQuestionBank();
  
  const [showModal, setShowModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testName, setTestName] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  
  const [selGrade, setSelGrade] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selUnit, setSelUnit] = useState('');
  const [selTopic, setSelTopic] = useState('');
  
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  const filteredSubjects = selGrade === 'all' ? data.subjects : data.subjects.filter(s => s.gradeId === selGrade);
  const filteredUnits = selSubject === 'all' ? data.units : data.units.filter(u => u.subjectId === selSubject);
  const filteredTopics = selUnit === 'all' ? data.topics : data.topics.filter(t => t.unitId === selUnit);

  const getCurrentCategoryId = () => {
    if (selTopic && selTopic !== 'all') return selTopic;
    if (selTopic === 'all') return `unit_${selUnit}_all`;
    if (selUnit === 'all') return `sub_${selSubject}_all`;
    if (selSubject === 'all') return `grade_${selGrade}_all`;
    if (selGrade === 'all') return `global_all`;
    return null;
  };

  const categoryId = getCurrentCategoryId();
  const filteredQuestions = questions.filter(q => q.topicId === categoryId);

  const handleToggleQuestion = (id) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };
  
  const openEditModal = (test) => {
    setEditingTestId(test.id);
    setTestName(test.title);
    setTimePerQuestion(test.timePerQuestion || 2);
    setSelectedQuestionIds(test.questionIds || []);
    
    if (test.filters) {
      setSelGrade(test.filters.selGrade);
      setSelSubject(test.filters.selSubject);
      setSelUnit(test.filters.selUnit);
      setSelTopic(test.filters.selTopic);
    } else {
      // Fallbacks if filters weren't saved
      setSelGrade(''); setSelSubject(''); setSelUnit(''); setSelTopic('');
    }
    
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTestId(null);
    setTestName('');
    setTimePerQuestion(2);
    setSelGrade('');
    setSelSubject('');
    setSelUnit('');
    setSelTopic('');
    setSelectedQuestionIds([]);
    setShowModal(false);
  };

  const handleCreateTest = (e) => {
    e.preventDefault();
    if(!testName || !categoryId || selectedQuestionIds.length === 0) return;
    
    const selectedQuestions = filteredQuestions.filter(q => selectedQuestionIds.includes(q.id));
    const totalQuestions = selectedQuestions.reduce((sum, q) => sum + (q.isBundle ? (q.questionCount || 1) : 1), 0);

    let subjectName = 'Genel (Tümü)';
    if (selSubject !== 'all' && selSubject !== '') {
      subjectName = data.subjects.find(s => s.id === selSubject)?.name || subjectName;
    }
    
    const testPayload = {
      title: testName,
      subject: subjectName,
      topicId: categoryId,
      questions: totalQuestions,
      questionIds: selectedQuestionIds,
      timePerQuestion: parseInt(timePerQuestion, 10),
      time: totalQuestions * parseInt(timePerQuestion, 10),
      color: 'primary',
      filters: { selGrade, selSubject, selUnit, selTopic }
    };

    if (editingTestId) {
      updateTest(editingTestId, testPayload);
    } else {
      addTest(testPayload);
    }
    
    resetForm();
  };

  return (
    <div className="container dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Öğretmen Paneli 🎓</h2>
          <p className="text-muted">Test oluşturun, öğrenci gelişimini takip edin.</p>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="test-grid" style={{ marginBottom: '2rem' }}>
          <div 
            className="card glass-dark" 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '200px', cursor: 'pointer' }}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus size={48} color="var(--color-primary-light)" />
            <h3>Yeni Test Oluştur</h3>
          </div>
        </div>

        <section className="available-tests">
          <h3 className="section-title">
            <TrendingUp size={24} color="var(--color-secondary)" />
            Sisteme Eklenen Testler
          </h3>
          <div className="card glass">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '1rem' }}>Test Adı</th>
                  <th style={{ padding: '1rem' }}>Ders / Kategori</th>
                  <th style={{ padding: '1rem' }}>Soru Sayısı</th>
                  <th style={{ padding: '1rem' }}>Tarih</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.tests.map(test => (
                  <tr key={test.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{test.title}</td>
                    <td style={{ padding: '1rem' }}><span className="test-badge bg-primary-light text-primary">{test.subject}</span></td>
                    <td style={{ padding: '1rem' }}>{test.questions}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{new Date(test.date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button className="btn-icon" onClick={() => openEditModal(test)} title="Düzenle">
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.tests.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Henüz test eklenmedi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>{editingTestId ? 'Testi Düzenle' : 'Soru Bankasından Test Oluştur'}</h3>
              <button className="btn-icon" onClick={resetForm}><X /></button>
            </div>
            
            <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 3 }}>
                  <input 
                    type="text" 
                    placeholder="Test Adı (Örn: Doğal Sayılar Quiz 1)" 
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    style={{...selectStyle, width: '100%'}}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-md)', padding: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Soru Başı Süre (Dk):</label>
                    <input type="number" min="1" max="60" value={timePerQuestion} onChange={e => setTimePerQuestion(e.target.value)} style={{ border: 'none', outline: 'none', width: '50px', fontWeight: 'bold' }} required />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <select value={selGrade} onChange={e => { setSelGrade(e.target.value); setSelSubject(''); setSelUnit(''); setSelTopic(''); }} style={selectStyle} required>
                  <option value="">Sınıf Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                <select value={selSubject} onChange={e => { setSelSubject(e.target.value); setSelUnit(''); setSelTopic(''); }} style={selectStyle} disabled={!selGrade} required>
                  <option value="">Ders Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select value={selUnit} onChange={e => { setSelUnit(e.target.value); setSelTopic(''); }} style={selectStyle} disabled={!selSubject} required>
                  <option value="">Ünite Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                <select value={selTopic} onChange={e => setSelTopic(e.target.value)} style={selectStyle} disabled={!selUnit} required>
                  <option value="">Konu Seçin...</option>
                  <option value="all">Tümü (Genel)</option>
                  {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {categoryId && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                  <h4>Havuzdaki Sorular</h4>
                  <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Teste eklemek istediğiniz soruları seçin.</p>
                  
                  {filteredQuestions.length === 0 ? (
                    <p className="text-error" style={{ fontSize: '0.9rem' }}>Bu kategoriye ait soru bankasında soru bulunamadı. Lütfen önce "Soru Bankası"ndan soru ekleyin.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {filteredQuestions.map(q => (
                        <label key={q.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', border: selectedQuestionIds.includes(q.id) ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
                          <input type="checkbox" checked={selectedQuestionIds.includes(q.id)} onChange={() => handleToggleQuestion(q.id)} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{q.type === 'coktan_secmeli' ? 'Çoktan Seçmeli' : 'Açık Uçlu'} - {q.contentType}</div>
                            <div style={{ fontSize: '0.95rem' }}>{q.questionText}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={selectedQuestionIds.length === 0}>
                {editingTestId ? 'Testi Güncelle' : `Testi Oluştur (${selectedQuestionIds.length} Soru)`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid rgba(0,0,0,0.1)',
  fontFamily: 'inherit',
  backgroundColor: 'white'
};
