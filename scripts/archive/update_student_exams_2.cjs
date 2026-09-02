const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

// 1. Imports
if (!code.includes('recharts')) {
  code = code.replace(
    /import \{ BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, ClipboardList \} from 'lucide-react';/,
    `import { BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, ClipboardList, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';`
  );
}

// 2. useCoaching
code = code.replace(
  /const \{ getMockExamsForStudent \} = useCoaching\(\);/,
  `const { getMockExamsForStudent, addMockExam } = useCoaching();`
);

// 3. State and functions
if (!code.includes('chartMetric')) {
  code = code.replace(
    /const \[isSaving, setIsSaving\] = useState\(false\);/,
    `const [isSaving, setIsSaving] = useState(false);
  const [chartMetric, setChartMetric] = useState('Toplam Net');

  // Manual Mock Exam States
  const [showMockModal, setShowMockModal] = useState(false);
  const [newManualMock, setNewManualMock] = useState({
    title: '', date: new Date().toISOString().slice(0, 10),
    subjects: {
      'Türkçe': { d: '', y: '', b: '', net: '' },
      'Matematik': { d: '', y: '', b: '', net: '' },
      'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
      'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
      'İngilizce': { d: '', y: '', b: '', net: '' },
    }
  });
  const [newSubjectName, setNewSubjectName] = useState('');

  const updateSubjectScore = (subjectName, field, value) => {
    setNewManualMock(prev => {
      const currentSub = prev.subjects[subjectName] || { d: '', y: '', b: '', net: '' };
      const updatedSub = { ...currentSub, [field]: value };

      if (field === 'd' || field === 'y') {
        const d = parseFloat(field === 'd' ? value : updatedSub.d) || 0;
        const y = parseFloat(field === 'y' ? value : updatedSub.y) || 0;
        const penalty = /lgs|bursluluk/i.test(prev.title) ? 3 : 4;
        updatedSub.net = (d - (y / penalty)).toFixed(2);
      }

      return {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subjectName]: updatedSub
        }
      };
    });
  };

  const addSubjectToMock = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (newManualMock.subjects[trimmed]) return;
    setNewManualMock(prev => ({
      ...prev,
      subjects: { ...prev.subjects, [trimmed]: { d: '', y: '', b: '', net: '' } }
    }));
    setNewSubjectName('');
  };

  const removeSubjectFromMock = (subjectName) => {
    setNewManualMock(prev => {
      const updated = { ...prev.subjects };
      delete updated[subjectName];
      return { ...prev, subjects: updated };
    });
  };

  const totalMockD = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.d) || 0), 0);
  const totalMockY = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.y) || 0), 0);
  const totalMockB = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.b) || 0), 0);
  const totalMockNet = Object.values(newManualMock.subjects).reduce((s, x) => s + (parseFloat(x.net) || 0), 0);

  const handleSaveManualMock = async (e) => {
    e.preventDefault();
    if (!newManualMock.title.trim()) return;

    const formattedScores = {};
    Object.entries(newManualMock.subjects).forEach(([subName, val]) => {
      formattedScores[subName] = {
        correct: parseFloat(val.d) || 0,
        wrong: parseFloat(val.y) || 0,
        empty: parseFloat(val.b) || 0,
        net: parseFloat(val.net) || 0
      };
    });

    await addMockExam({
      studentId,
      studentName: currentUser?.name || 'Öğrenci',
      title: newManualMock.title.trim(),
      date: newManualMock.date || new Date().toISOString().slice(0, 10),
      scores: formattedScores,
      totalCorrect: totalMockD,
      totalWrong: totalMockY,
      totalEmpty: totalMockB,
      totalNet: totalMockNet.toFixed(2),
      isManual: true,
      createdBy: 'student',
      approvalStatus: 'pending'
    });

    setShowMockModal(false);
    setNewManualMock({
      title: '', date: new Date().toISOString().slice(0, 10),
      subjects: {
        'Türkçe': { d: '', y: '', b: '', net: '' },
        'Matematik': { d: '', y: '', b: '', net: '' },
        'Fen Bilimleri': { d: '', y: '', b: '', net: '' },
        'Sosyal Bilgiler': { d: '', y: '', b: '', net: '' },
        'İngilizce': { d: '', y: '', b: '', net: '' },
      }
    });
  };`
  );
}

// 4. Buttons
code = code.replace(
  /<button \s*onClick=\{\(\) => setIsAddModalOpen\(true\)\}\s*style=\{\{ background: 'linear-gradient\(135deg, #10b981, #059669\)', color: 'white', border: 'none', padding: '0\.75rem 1\.25rem', borderRadius: '0\.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0\.5rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba\(16,185,129,0\.3\)' \}\}\s*>\s*<Plus size=\{20\} \/> Kendi Denemeni Ekle\s*<\/button>/,
  `<div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowMockModal(true)}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}
            >
              <Plus size={20} /> Manuel Sonuç Ekle
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
            >
              <BookOpen size={20} /> Kitap/Deneme Tanımla
            </button>
          </div>`
);

// 5. Chart
if (!code.includes('TREND CHART')) {
  code = code.replace(
    /\{\/\* STATISTICS BANNER \*\/\}/,
    `{/* TREND CHART */}
          {allExamsList.length > 0 && (
            <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={24} /> Net Gelişim Grafiği
                </h2>
                <select 
                  value={chartMetric} 
                  onChange={(e) => setChartMetric(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="Toplam Net">Genel (Toplam Net)</option>
                  {overallStats.subjects.map(s => (
                    <option key={s.name} value={s.name}>{s.name} Net</option>
                  ))}
                </select>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...allExamsList].reverse().map((exam, i) => {
                    const penaltyRatio = /lgs|bursluluk/i.test(exam.title) ? 3 : 4;
                    let net = 0;
                    if (chartMetric === 'Toplam Net') {
                       net = (exam.totalCorrect || 0) - ((exam.totalWrong || 0) / penaltyRatio);
                    } else {
                       if (exam.isManualMock) {
                          if (exam.scores && exam.scores[chartMetric]) {
                             const sc = exam.scores[chartMetric];
                             net = sc.net !== undefined && sc.net !== null ? parseFloat(sc.net) : ((sc.correct || 0) - ((sc.wrong || 0) / penaltyRatio));
                          }
                       } else {
                          let c = 0, w = 0;
                          exam.bestSubs?.forEach(sub => {
                            const testId = sub.testId || sub.bookTestId || sub.id;
                            const bookTest = bookTests.find(t => String(t.id) === String(testId));
                            if (bookTest && exam.subjects) {
                              const subject = exam.subjects.find(s => String(s.id) === String(bookTest.subjectId));
                              const subjName = subject ? subject.name : 'Genel';
                              if (subjName === chartMetric) {
                                c += sub.correctCount || 0;
                                w += sub.wrongCount || 0;
                              }
                            }
                          });
                          net = c - (w / penaltyRatio);
                       }
                    }
                    
                    return { name: \`D\${i + 1}\`, Net: parseFloat(net.toFixed(2)), fullName: exam.title };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem', fontWeight: 700 }}
                      formatter={(value) => [\`\${value} Net\`, 'Sonuç']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Line type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, fill: '#059669' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* STATISTICS BANNER */}`
  );
}

// 6. Modal
if (!code.includes('DENEME EKLEME MODAL POPUP')) {
  const modalCode = `
      {/* ═══ DENEME EKLEME MODAL POPUP ═══ */}
      {showMockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '1.25rem', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>📝</span>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>Yeni Deneme Sonucu Ekle</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Sonuçlarınız kaydolduktan sonra koç öğretmeninizin onayına sunulur.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMockModal(false)} style={{ background: 'rgba(255, 255, 255, 0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualMock}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>Deneme Adı / Yayın</label>
                  <input style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box' }} value={newManualMock.title} onChange={e => setNewManualMock(p => ({ ...p, title: e.target.value }))} placeholder="Örn: Özdebir Türkiye Geneli LGS-3" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>Tarih</label>
                  <input style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box' }} type="date" value={newManualMock.date} onChange={e => setNewManualMock(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>

              <div style={{ fontWeight: 800, fontSize: '0.83rem', color: '#1e293b', marginBottom: 8 }}>Ders Bazlı Doğru, Yanlış, Boş ve Net Sayıları:</div>
              
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.85rem', overflow: 'hidden', marginBottom: '0.85rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.5)', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Ders</th>
                      <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#16a34a', width: 70 }}>Doğru (D)</th>
                      <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#dc2626', width: 70 }}>Yanlış (Y)</th>
                      <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#d97706', width: 70 }}>Boş (B)</th>
                      <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#7c3aed', width: 85 }}>Net</th>
                      <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(newManualMock.subjects).map((subName, idx) => {
                      const sub = newManualMock.subjects[subName];
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
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', whiteSpace: 'nowrap' }}>➕ Ders Ekle:</span>
                <select
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, color: '#334155', background: 'rgba(255, 255, 255, 0.8)', outline: 'none', boxSizing: 'border-box', flex: 1 }}
                >
                  <option value="">— Ders seç veya yaz —</option>
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
                  <span>✅ {totalMockD} Doğru</span>
                  <span>❌ {totalMockY} Yanlış</span>
                  <span>⭕ {totalMockB} Boş</span>
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

  // Find the VERY LAST closing tag. It's the `</div>\n  );\n}` at the end of the file.
  const lastDivIndex = code.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    code = code.substring(0, lastDivIndex) + modalCode + code.substring(lastDivIndex);
  }
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', code);
console.log('Update script finished successfully.');
