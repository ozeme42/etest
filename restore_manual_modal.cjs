const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

if (!code.includes('ClipboardList')) {
  code = code.replace(/TrendingUp \} from 'lucide-react';/, "TrendingUp, ClipboardList } from 'lucide-react';");
}

if (!code.includes('setChartMetric')) {
  code = code.replace(
    /const \[isSaving, setIsSaving\] = useState\(false\);/,
    `const [isSaving, setIsSaving] = useState(false);
  const [chartMetric, setChartMetric] = useState('Toplam Net');
  const [showMockModal, setShowMockModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newManualMock, setNewManualMock] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    subjects: {}
  });

  const addSubjectToMock = () => {
    if (!newSubjectName.trim()) return;
    setNewManualMock(prev => ({
      ...prev,
      subjects: { ...prev.subjects, [newSubjectName.trim()]: { d: '', y: '', b: '', net: '' } }
    }));
    setNewSubjectName('');
  };

  const updateSubjectScore = (subjName, field, value) => {
    setNewManualMock(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjName]: { ...prev.subjects[subjName], [field]: value }
      }
    }));
  };

  const removeSubjectFromMock = (subjName) => {
    setNewManualMock(prev => {
      const copy = { ...prev };
      delete copy.subjects[subjName];
      return copy;
    });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.net) || 0), 0);

  const handleSaveMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title) return;
    try {
      await addMockExam({
        studentId,
        title: newManualMock.title,
        date: newManualMock.date,
        totalCorrect: totalMockD,
        totalWrong: totalMockY,
        totalBlank: totalMockB,
        netScore: totalMockNet,
        subjects: newManualMock.subjects,
        approvalStatus: 'pending_approval' // Manuel eklenenler onay bekler
      });
      setShowMockModal(false);
      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: {} });
      // Reload is handled by parent context fetch or refresh
      window.location.reload(); 
    } catch(err) {
      console.error(err);
    }
  };`
  );
}

if (!code.includes('Manuel Sonuç Ekle')) {
  code = code.replace(
    /<div style=\{\{ display: 'flex', gap: '0.5rem' \}\}>/,
    `<div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#8b5cf6', color: '#8b5cf6' }} onClick={() => setShowMockModal(true)}>
            <ClipboardList size={18} /> Manuel Sonuç Ekle
          </button>`
  );
}

if (!code.includes('showMockModal && (')) {
  const modalCode = `
      {showMockModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="modal-content card glass animate-fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={22} color="#7c3aed" /> Yeni Deneme Sonucu Ekle (Manuel)
              </h2>
              <button onClick={() => setShowMockModal(false)} className="btn-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveMock}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Deneme Adı / Yayın</label>
                  <input type="text" className="input" placeholder="Örn: Özdebir LGS Genel Deneme 1" required style={{ width: '100%' }} value={newManualMock.title} onChange={e => setNewManualMock({...newManualMock, title: e.target.value})} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Tarih</label>
                  <input type="date" className="input" required style={{ width: '100%' }} value={newManualMock.date} onChange={e => setNewManualMock({...newManualMock, date: e.target.value})} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#334155', marginTop: 0, marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Ders Bazlı Sonuçlar</h3>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 800 }}>DERS</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 800 }}>DOĞRU</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: '#ef4444', fontSize: '0.8rem', fontWeight: 800 }}>YANLIŞ</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 800 }}>BOŞ</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: '#8b5cf6', fontSize: '0.8rem', fontWeight: 800 }}>NET</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(newManualMock.subjects).map(([subName, sub], idx) => {
                      const total = Object.keys(newManualMock.subjects).length;
                      return (
                        <tr key={subName} style={{ borderBottom: idx < total - 1 ? '1px solid #f1f5f9' : 'none', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '0.55rem 0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{subName}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <input type="number" min="0" style={{ width: '100%', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box' }}
                              value={sub.d} onChange={e => updateSubjectScore(subName, 'd', e.target.value)} placeholder="0" />
                          </td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <input type="number" min="0" style={{ width: '100%', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid #fca5a5', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box' }}
                              value={sub.y} onChange={e => updateSubjectScore(subName, 'y', e.target.value)} placeholder="0" />
                          </td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <input type="number" min="0" style={{ width: '100%', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid #fde68a', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box' }}
                              value={sub.b} onChange={e => updateSubjectScore(subName, 'b', e.target.value)} placeholder="0" />
                          </td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <input type="number" step="0.25" style={{ width: '100%', padding: '0.3rem', borderRadius: '0.75rem', border: '1.5px solid #ddd6fe', textAlign: 'center', fontSize: '0.82rem', fontWeight: 900, color: '#7c3aed', background: '#f5f3ff', outline: 'none', boxSizing: 'border-box' }}
                              value={sub.net} onChange={e => updateSubjectScore(subName, 'net', e.target.value)} placeholder="0.00" />
                          </td>
                          <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                            <button type="button" onClick={() => removeSubjectFromMock(subName)} title="Dersi kaldır"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', alignItems: 'center', background: 'rgba(255, 255, 255, 0.5)', border: '1.5px dashed #c7d2fe', borderRadius: '0.85rem', padding: '0.65rem 0.85rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', whiteSpace: 'nowrap' }}>+ Ders Ekle:</span>
                <select
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box', flex: 1 }}
                >
                  <option value="">-- Ders seç veya yaz --</option>
                  {['Türkçe','Matematik','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Din Kültürü','Yabancı Dil','Tarih','Coğrafya','Fizik','Kimya','Biyoloji','Edebiyat','Geometri','TYT Türkçe','TYT Matematik','TYT Fen','TYT Sosyal']
                    .filter(s => !newManualMock.subjects[s])
                    .map(s => <option key={s} value={s}>{s}</option>)
                  }
                </select>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubjectToMock())}
                  placeholder="veya özel ders adı yaz"
                  style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box', flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addSubjectToMock}
                  disabled={!newSubjectName.trim() || !!newManualMock.subjects[newSubjectName.trim()]}
                  style={{ background: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? '#6366f1' : '#e2e8f0', color: newSubjectName.trim() && !newManualMock.subjects[newSubjectName.trim()] ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.9rem', fontWeight: 800, fontSize: '0.82rem', cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                >
                  Ekle
                </button>
              </div>

              <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4c1d95', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>✓ {totalMockD} Doğru</span>
                  <span>✗ {totalMockY} Yanlış</span>
                  <span>○ {totalMockB} Boş</span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6d28d9' }}>
                  Toplam Net: <span style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{totalMockNet.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowMockModal(false)} style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#64748b', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.2rem', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer' }}>
                  Vazgeç
                </button>
                <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.6rem 1.4rem', fontWeight: 900, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                  <Plus size={16} /> Kaydet ve Koç Onayına Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

  const lastDivIndex = code.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    code = code.substring(0, lastDivIndex) + modalCode + code.substring(lastDivIndex);
  }
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', code);
console.log('Restored manual modal successfully.');
