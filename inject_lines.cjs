const fs = require('fs');
let lines = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8').split('\\n');

let buttonInjected = false;
let cardsInjected = false;

for (let i = 0; i < lines.length; i++) {
  // Inject Button
  if (lines[i].includes('<Plus size={20} /> Kendi Denemeni Ekle') && !buttonInjected) {
    // lines[i-4] is `<button `
    // lines[i] is `<Plus size={20} /> Kendi Denemeni Ekle`
    // lines[i+1] is `</button>`
    const newButton = \`          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#8b5cf6', color: '#8b5cf6', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => setShowMockModal(true)}>
              <ClipboardList size={18} /> Manuel Sonuç Ekle
            </button>\`;
    
    // We insert newButton at i-4
    lines.splice(i-4, 0, newButton);
    // After insertion, the index shifts by 1, so the `</button>` is now at i+2
    // We append `</div>` after `</button>`
    lines.splice(i+3, 0, \`          </div>\`);
    
    buttonInjected = true;
    console.log('Button injected');
    i += 2; // adjust index
  }
  
  // Inject Cards
  if (lines[i].includes('Haritayı Görüntüle') && lines[i].includes('Denemeye Devam Et') && !cardsInjected) {
    // lines[i+1] is `</button>`
    // lines[i+2] is `</div>`
    // lines[i+3] is `);`
    // lines[i+4] is `})}`
    // lines[i+5] is `</div>` (this closes the grid)
    
    const mockCardsHTML = \`          {/* Render Manual Mock Exams */}
          {studentMockExams.map(mock => (
            <div key={mock.id} className="card glass hover-lift" style={{ padding: '1.5rem', border: '1px solid #c7d2fe', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: mock.approvalStatus === 'pending_approval' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.4rem 1rem', borderBottomLeftRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800 }}>
                {mock.approvalStatus === 'pending_approval' ? 'ONAY BEKLİYOR' : 'ONAYLANDI'}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 64, height: 85, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  <ClipboardList size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>{mock.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tarih: {mock.date || mock.createdAt?.slice(0, 10)}</div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Toplam Net: <span style={{ color: '#7c3aed', fontSize: '1.2rem' }}>{Number(mock.netScore || mock.totalNet || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>Doğru</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669' }}>{mock.totalCorrect || 0}</div>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Yanlış</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>{mock.totalWrong || 0}</div>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>Boş</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748b' }}>{mock.totalBlank || mock.totalEmpty || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}\`;
          
    lines.splice(i+5, 0, mockCardsHTML);
    cardsInjected = true;
    console.log('Cards injected');
    i += 5; // adjust index
  }
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', lines.join('\\n'));
console.log('Done!');
