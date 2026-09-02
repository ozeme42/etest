const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

const cardsTarget = `                  {isCompleted ? 'Haritayı Görüntüle' : 'Denemeye Devam Et'} <ArrowRight size={18} />\n                </button>\n              </div>\n            );\n          })}\n        </div>`;

const mockCardsHTML = `                  {isCompleted ? 'Haritayı Görüntüle' : 'Denemeye Devam Et'} <ArrowRight size={18} />\n                </button>\n              </div>\n            );\n          })}\n\n          {/* Render Manual Mock Exams */}\n          {studentMockExams.map(mock => (\n            <div key={mock.id} className="card glass hover-lift" style={{ padding: '1.5rem', border: '1px solid #c7d2fe', position: 'relative', overflow: 'hidden' }}>\n              <div style={{ position: 'absolute', top: 0, right: 0, background: mock.approvalStatus === 'pending_approval' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800 }}>\n                {mock.approvalStatus === 'pending_approval' ? 'ONAY BEKLİYOR' : 'ONAYLANDI'}\n              </div>\n              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>\n                <div style={{ width: 64, height: 85, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>\n                  <ClipboardList size={28} />\n                </div>\n                <div style={{ flex: 1 }}>\n                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>{mock.title}</h3>\n                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tarih: {mock.date || mock.createdAt?.slice(0, 10)}</div>\n                </div>\n              </div>\n              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem' }}>\n                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', textAlign: 'center' }}>\n                  Toplam Net: <span style={{ color: '#7c3aed', fontSize: '1.2rem' }}>{Number(mock.netScore || mock.totalNet || 0).toFixed(2)}</span>\n                </div>\n                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', textAlign: 'center' }}>\n                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>\n                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>Doğru</div>\n                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669' }}>{mock.totalCorrect || 0}</div>\n                  </div>\n                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>\n                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Yanlış</div>\n                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>{mock.totalWrong || 0}</div>\n                  </div>\n                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>\n                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Boş</div>\n                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748b' }}>{mock.totalBlank || mock.totalEmpty || 0}</div>\n                  </div>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>`;

if (code.includes(cardsTarget)) {
  code = code.replace(cardsTarget, mockCardsHTML);
  console.log('Cards injected!');
} else {
  console.log('Cards target not found!');
}

const modalTarget = `      {/* NEW BOOK MODAL */}`;
const modalHTML = `
      {/* MANUAL MOCK MODAL */}
      {showMockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>Manuel Deneme Sonucu Ekle</h2>
              <button onClick={() => setShowMockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveMock} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Sınav Adı (Örn: Özdebir TYT 1)</label>
                  <input required type="text" className="input" placeholder="Deneme Adı" value={newManualMock.title} onChange={e => setNewManualMock(prev => ({...prev, title: e.target.value}))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Tarih</label>
                  <input required type="date" className="input" value={newManualMock.date} onChange={e => setNewManualMock(prev => ({...prev, date: e.target.value}))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 800, fontSize: '0.85rem' }}>Ders Ekle (Örn: Türkçe, Matematik)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="input" placeholder="Ders Adı" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubjectToMock(); }}} />
                  <button type="button" className="btn" onClick={addSubjectToMock}>Ekle</button>
                </div>
              </div>

              {Object.keys(newManualMock.subjects).length > 0 && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: '0.5rem', fontWeight: 800, color: '#475569', fontSize: '0.8rem', textAlign: 'center' }}>
                    <div style={{ textAlign: 'left' }}>Ders</div>
                    <div>Doğru</div>
                    <div>Yanlış</div>
                    <div>Boş</div>
                    <div>Net</div>
                    <div></div>
                  </div>
                  {Object.entries(newManualMock.subjects).map(([sName, scores]) => (
                    <div key={sName} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{sName}</div>
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center' }} placeholder="D" value={scores.d} onChange={e => updateSubjectScore(sName, 'd', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center' }} placeholder="Y" value={scores.y} onChange={e => updateSubjectScore(sName, 'y', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center' }} placeholder="B" value={scores.b} onChange={e => updateSubjectScore(sName, 'b', e.target.value)} />
                      <input type="number" className="input" style={{ padding: '0.5rem', textAlign: 'center' }} placeholder="N" value={scores.net} onChange={e => updateSubjectScore(sName, 'net', e.target.value)} step="0.25" />
                      <button type="button" onClick={() => removeSubjectFromMock(sName)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
                    </div>
                  ))}
                  <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: '0.5rem', fontWeight: 900, color: '#0f172a', textAlign: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>TOPLAM</div>
                    <div style={{ color: '#10b981' }}>{totalMockD}</div>
                    <div style={{ color: '#ef4444' }}>{totalMockY}</div>
                    <div style={{ color: '#64748b' }}>{totalMockB}</div>
                    <div style={{ color: '#8b5cf6', fontSize: '1.2rem' }}>{totalMockNet}</div>
                    <div></div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} /> Sonucu Kaydet ve Gönder
              </button>
            </form>
          </div>
        </div>
      )}
      {/* NEW BOOK MODAL */}`;

if (code.includes(modalTarget)) {
  code = code.replace(modalTarget, modalHTML);
  console.log('Modal injected!');
} else {
  console.log('Modal target not found!');
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', code);
