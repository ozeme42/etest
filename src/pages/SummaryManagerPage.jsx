import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurriculum } from '../context/CurriculumContext';
import { useSummaries } from '../context/SummaryContext';
import { useAuth } from '../context/AuthContext';
import SummaryHtmlViewer from '../components/summary/SummaryHtmlViewer';
import { 
  BookOpen, Plus, Save, Trash2, CheckCircle2, AlertCircle, 
  Code, Eye, FileText, Sparkles, Layers, ChevronRight, 
  Search, ArrowRight, ExternalLink, HelpCircle, Columns,
  ArrowLeft, Check, Heading, Info, AlertTriangle, Pi, Table
} from 'lucide-react';
import './SummaryManagerPage.css';

const TEMPLATES = {
  note: `<div class="callout box-info">
  <strong>📌 Önemli Not:</strong> Bu konuda dikkat edilmesi gereken en temel kural burada açıklanır.
</div>`,
  warning: `<div class="callout box-warning">
  <strong>⚠️ Dikkat & Tuzak Noktalar:</strong> Sınavlarda en sık yapılan hatalar ve ipuçları.
</div>`,
  formula: `<div class="callout box-formula">
  <h3>📐 Temel Formül</h3>
  <p>a² + b² = c²</p>
</div>`,
  table: `<table>
  <thead>
    <tr>
      <th>Kavram / Özellik</th>
      <th>Açıklama</th>
      <th>Örnek</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Özellik 1</strong></td>
      <td>Detaylı açıklama metni</td>
      <td>Örnek kullanım</td>
    </tr>
    <tr>
      <td><strong>Özellik 2</strong></td>
      <td>Detaylı açıklama metni</td>
      <td>Örnek kullanım</td>
    </tr>
  </tbody>
</table>`,
  heading: `<h2>📌 1. Temel Kavramlar</h2>
<p>Konunun giriş ve temel tanımı buraya yazılır.</p>
<h3>🔹 Alt Başlık ve Detaylar</h3>
<ul>
  <li><strong>Madde 1:</strong> Açıklama</li>
  <li><strong>Madde 2:</strong> Açıklama</li>
</ul>`
};

export default function SummaryManagerPage() {
  const navigate = useNavigate();
  const { data: curriculumData } = useCurriculum();
  const { summaries, saveSummary, deleteSummary, getSummary, hasSummary } = useSummaries();
  const { currentUser } = useAuth();

  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null); // { type: 'unit' | 'topic', id: string, name: string, unitId?: string }

  const [editorMode, setEditorMode] = useState('split'); // 'split', 'code', 'preview'
  const [htmlCode, setHtmlCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const grades = curriculumData.grades || [];
  const subjects = curriculumData.subjects || [];
  const units = curriculumData.units || [];
  const topics = curriculumData.topics || [];

  // Default selection
  useEffect(() => {
    if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, selectedGradeId]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => String(s.gradeId) === String(selectedGradeId));
  }, [subjects, selectedGradeId]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [filteredSubjects, selectedSubjectId]);

  // Natural unit and topic sorting
  const extractUnitOrderNumber = (unit, fallbackIndex = 999) => {
    if (!unit) return fallbackIndex;
    if (typeof unit.order === 'number') return unit.order;
    if (typeof unit.sortOrder === 'number') return unit.sortOrder;
    if (typeof unit.unitNumber === 'number') return unit.unitNumber;
    const match = String(unit.name || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : fallbackIndex;
  };

  const sortUnitsNaturally = (unitList = []) => {
    return [...unitList].sort((a, b) => {
      const numA = extractUnitOrderNumber(a, 999);
      const numB = extractUnitOrderNumber(b, 999);
      if (numA !== numB) return numA - numB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true });
    });
  };

  const sortTopicsNaturally = (topicList = []) => {
    return [...topicList].sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      const numA = (String(a.name || '').match(/(\d+)/) || [])[1];
      const numB = (String(b.name || '').match(/(\d+)/) || [])[1];
      if (numA && numB && parseInt(numA, 10) !== parseInt(numB, 10)) {
        return parseInt(numA, 10) - parseInt(numB, 10);
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true });
    });
  };

  const filteredUnits = useMemo(() => {
    const list = units.filter(u => String(u.subjectId) === String(selectedSubjectId));
    return sortUnitsNaturally(list);
  }, [units, selectedSubjectId]);

  // Load summary content when target changes
  useEffect(() => {
    if (selectedTarget) {
      const existing = getSummary(selectedTarget.type, selectedTarget.id);
      setHtmlCode(existing?.contentHtml || '');
      setSaveSuccess(false);
    } else if (filteredUnits.length > 0) {
      // Auto-select first unit
      setSelectedTarget({
        type: 'unit',
        id: filteredUnits[0].id,
        name: filteredUnits[0].name,
        unitId: filteredUnits[0].id
      });
    } else {
      setSelectedTarget(null);
      setHtmlCode('');
    }
  }, [selectedTarget?.id, selectedTarget?.type, filteredUnits]);

  // Handle Save
  const handleSave = async () => {
    if (!selectedTarget) return;
    setIsSaving(true);

    try {
      const selectedGrade = grades.find(g => String(g.id) === String(selectedGradeId));
      const selectedSubj = subjects.find(s => String(s.id) === String(selectedSubjectId));

      await saveSummary({
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        gradeId: selectedGradeId,
        subjectId: selectedSubjectId,
        unitId: selectedTarget.unitId || (selectedTarget.type === 'unit' ? selectedTarget.id : null),
        topicId: selectedTarget.type === 'topic' ? selectedTarget.id : null,
        title: `${selectedGrade?.name ? selectedGrade.name + ' - ' : ''}${selectedSubj?.name ? selectedSubj.name + ' - ' : ''}${selectedTarget.name}`,
        contentHtml: htmlCode,
        authorName: currentUser?.name || 'Öğretmen'
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save summary failed:', e);
      alert('Özet kaydedilirken bir hata oluştu!');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedTarget) return;
    if (window.confirm(`"${selectedTarget.name}" için kayıtlı özeti silmek istediğinize emin misiniz?`)) {
      await deleteSummary(selectedTarget.id);
      setHtmlCode('');
      setSaveSuccess(false);
    }
  };

  // Insert template
  const insertTemplate = (templateKey) => {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    setHtmlCode(prev => (prev ? prev + '\n\n' + tpl : tpl));
  };

  // Stats
  const stats = useMemo(() => {
    let unitCount = filteredUnits.length;
    let topicCount = 0;
    let filledCount = 0;

    filteredUnits.forEach(u => {
      if (hasSummary('unit', u.id)) filledCount++;
      const unitTopics = topics.filter(t => String(t.unitId) === String(u.id));
      topicCount += unitTopics.length;
      unitTopics.forEach(t => {
        if (hasSummary('topic', t.id)) filledCount++;
      });
    });

    return { unitCount, topicCount, totalItems: unitCount + topicCount, filledCount };
  }, [filteredUnits, topics, summaries]);

  return (
    <div className="summary-manager-page">
      
      {/* HEADER */}
      <header className="summary-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: '0.75rem',
              padding: '0.55rem 0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <ArrowLeft size={18} /> Geri Dön
          </button>
          <div>
            <div className="summary-badge">
              <Sparkles size={14} /> Ders & Konu Özetleri Yönetimi
            </div>
            <h1>Müfredat Özet Modülü Editörü 📝</h1>
            <p>Müfredattaki derslerin ünite ve konularına HTML formatında zengin ders notları ve konu özetleri ekleyin.</p>
          </div>
        </div>

        {/* Global Progress Pill */}
        <div className="summary-stats-card">
          <div className="stats-metric">
            <span className="stats-num">{stats.filledCount} / {stats.totalItems}</span>
            <span className="stats-lbl">Dolu Özet</span>
          </div>
          <div className="stats-bar-bg">
            <div 
              className="stats-bar-fill"
              style={{ width: `${stats.totalItems > 0 ? (stats.filledCount / stats.totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      {/* FILTER BAR: GRADES & SUBJECTS */}
      <div className="summary-filters-card">
        <div className="filter-group">
          <label>Kademe / Sınıf:</label>
          <div className="pill-group">
            {grades.map(g => (
              <button
                key={g.id}
                className={`pill-btn ${String(selectedGradeId) === String(g.id) ? 'active' : ''}`}
                onClick={() => setSelectedGradeId(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Ders:</label>
          <div className="pill-group">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map(s => (
                <button
                  key={s.id}
                  className={`pill-btn subject-pill ${String(selectedSubjectId) === String(s.id) ? 'active' : ''}`}
                  onClick={() => setSelectedSubjectId(s.id)}
                >
                  <BookOpen size={14} /> {s.name}
                </button>
              ))
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontStyle: 'italic' }}>Bu sınıfa ait ders bulunamadı.</span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="summary-workspace-grid">
        
        {/* LEFT COLUMN: CURRICULUM TREE */}
        <aside className="curriculum-tree-sidebar">
          <div className="sidebar-search-box">
            <Search size={16} />
            <input 
              type="text"
              placeholder="Ünite veya konu ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="curriculum-list">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u, uIdx) => {
                const isUnitSelected = selectedTarget?.type === 'unit' && String(selectedTarget?.id) === String(u.id);
                const unitHasSummary = hasSummary('unit', u.id);
                const unitTopics = sortTopicsNaturally(topics.filter(t => String(t.unitId) === String(u.id)));
                const filteredUnitTopics = searchQuery
                  ? unitTopics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  : unitTopics;

                if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && filteredUnitTopics.length === 0) {
                  return null;
                }

                return (
                  <div key={u.id} className="unit-tree-node">
                    {/* Unit Row */}
                    <div 
                      className={`unit-node-header ${isUnitSelected ? 'active-target' : ''}`}
                      onClick={() => setSelectedTarget({ type: 'unit', id: u.id, name: u.name, unitId: u.id })}
                    >
                      <div className="node-title-group">
                        <span className="unit-num-badge">{uIdx + 1}</span>
                        <div className="node-text">
                          <strong>{u.name}</strong>
                          <span className="node-sub">Ünite Genel Özeti</span>
                        </div>
                      </div>
                      {unitHasSummary ? (
                        <span className="status-badge badge-filled" title="Ünite özeti eklenmiş">
                          <CheckCircle2 size={13} /> Dolu
                        </span>
                      ) : (
                        <span className="status-badge badge-empty" title="Özet yok">
                          <Plus size={13} /> Boş
                        </span>
                      )}
                    </div>

                    {/* Topics Sub-Tree */}
                    <div className="topics-sub-list">
                      {filteredUnitTopics.map((t) => {
                        const isTopicSelected = selectedTarget?.type === 'topic' && String(selectedTarget?.id) === String(t.id);
                        const topicHasSummary = hasSummary('topic', t.id);

                        return (
                          <div
                            key={t.id}
                            className={`topic-node-item ${isTopicSelected ? 'active-target' : ''}`}
                            onClick={() => setSelectedTarget({ type: 'topic', id: t.id, name: t.name, unitId: u.id })}
                          >
                            <div className="topic-text-group">
                              <span className="topic-dot" />
                              <span>{t.name}</span>
                            </div>
                            {topicHasSummary ? (
                              <span className="status-badge badge-filled" title="Konu özeti eklenmiş">
                                <CheckCircle2 size={11} />
                              </span>
                            ) : (
                              <span className="status-badge badge-empty" title="Özet yok">
                                <Plus size={11} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-units-box">
                <AlertCircle size={28} />
                <p>Seçili ders için henüz ünite veya konu kaydı bulunmuyor.</p>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: RICH HTML EDITOR & PREVIEW */}
        <main className="summary-editor-panel">
          {selectedTarget ? (
            <>
              {/* TARGET BANNER */}
              <div className="editor-top-bar">
                <div className="target-info">
                  <span className={`target-type-pill ${selectedTarget.type}`}>
                    {selectedTarget.type === 'unit' ? '📁 ÜNİTE GENEL ÖZETİ' : '📄 KONU ÖZETİ'}
                  </span>
                  <h2>{selectedTarget.name}</h2>
                </div>

                <div className="editor-actions">
                  {/* View Mode Switcher */}
                  <div className="view-mode-toggle">
                    <button
                      className={`mode-btn ${editorMode === 'code' ? 'active' : ''}`}
                      onClick={() => setEditorMode('code')}
                      title="Sadece HTML Kod Editörü"
                    >
                      <Code size={15} /> Kod
                    </button>
                    <button
                      className={`mode-btn ${editorMode === 'split' ? 'active' : ''}`}
                      onClick={() => setEditorMode('split')}
                      title="Çift Panel (Kod + Önizleme)"
                    >
                      <Columns size={15} /> Yan Yana
                    </button>
                    <button
                      className={`mode-btn ${editorMode === 'preview' ? 'active' : ''}`}
                      onClick={() => setEditorMode('preview')}
                      title="Sadece Canlı Önizleme"
                    >
                      <Eye size={15} /> Önizleme
                    </button>
                  </div>

                  {/* Delete Button */}
                  {hasSummary(selectedTarget.type, selectedTarget.id) && (
                    <button 
                      className="btn-danger-icon"
                      onClick={handleDelete}
                      title="Bu Özeti Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Save Button */}
                  <button 
                    className="btn-save-summary"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      'Kaydediliyor...'
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 size={16} /> Kaydedildi!
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Özeti Kaydet
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QUICK INSERT TEMPLATES */}
              <div className="template-shortcuts-bar">
                <span className="tpl-lbl">Hızlı Şablon:</span>
                <button className="tpl-btn" onClick={() => insertTemplate('heading')}>
                  + Başlık & Madde
                </button>
                <button className="tpl-btn" onClick={() => insertTemplate('note')}>
                  + 📌 Önemli Not
                </button>
                <button className="tpl-btn" onClick={() => insertTemplate('warning')}>
                  + ⚠️ Dikkat Kutusu
                </button>
                <button className="tpl-btn" onClick={() => insertTemplate('formula')}>
                  + 📐 Formül
                </button>
                <button className="tpl-btn" onClick={() => insertTemplate('table')}>
                  + 📊 Tablo
                </button>
              </div>

              {/* EDITOR WORKSPACE BODY */}
              <div className={`editor-split-body mode-${editorMode}`}>
                
                {/* HTML CODE TEXTAREA */}
                {(editorMode === 'code' || editorMode === 'split') && (
                  <div className="editor-pane code-pane">
                    <div className="pane-header">
                      <span>HTML Kaynak Kodu (Word veya harici HTML yapıştırabilirsiniz)</span>
                      <span className="char-count">{htmlCode.length} karakter</span>
                    </div>
                    <textarea
                      className="html-code-input"
                      placeholder="Buraya HTML formatında konu anlatımınızı veya özetinizi yapıştırın... (Örn: <h2>Başlık</h2><p>İçerik...</p>)"
                      value={htmlCode}
                      onChange={e => setHtmlCode(e.target.value)}
                    />
                  </div>
                )}

                {/* LIVE PREVIEW PANE */}
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div className="editor-pane preview-pane">
                    <div className="pane-header">
                      <span>👁️ Canlı Öğrenci Önizlemesi</span>
                      <span className="preview-status">{htmlCode ? 'Biçimlendirilmiş' : 'İçerik Boş'}</span>
                    </div>
                    <div className="preview-content-box">
                      <SummaryHtmlViewer
                        htmlContent={htmlCode}
                        title={selectedTarget.name}
                        targetType={selectedTarget.type}
                        emptyMessage="Sol taraftaki editöre HTML kod yapıştırdığınızda canlı önizleme burada görünecektir."
                      />
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="no-target-selected">
              <BookOpen size={48} style={{ opacity: 0.3 }} />
              <h3>Düzenlemek İçin Bir Ünite veya Konu Seçin</h3>
              <p>Sol taraftaki müfredat ağacından özet eklemek veya düzenlemek istediğiniz ünite ya da konuyu seçin.</p>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}
