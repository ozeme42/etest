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
  ArrowLeft, Check, Heading, Info, AlertTriangle, Pi, Table,
  GraduationCap, FolderTree, Lightbulb
} from 'lucide-react';
import './SummaryManagerPage.css';

const TEMPLATES = {
  goals: `<div class="callout box-goals" style="border-left: 4.5px solid #6366f1; background: rgba(99, 102, 241, 0.08); padding: 1rem 1.25rem; border-radius: 0.85rem; margin: 1.25rem 0;">
  <h3 style="color: #6366f1; margin-top: 0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
    🎯 Bu Bölümün Sonunda Neler Öğreneceksiniz?
  </h3>
  <p style="margin-bottom: 0.5rem; font-size: 0.9em; opacity: 0.9;">Bu konuyu tamamladığınızda aşağıdaki kazanımları elde etmiş olacaksınız:</p>
  <ul style="margin: 0; padding-left: 1.5rem;">
    <li><strong>Kavrama:</strong> Konuyla ilgili temel kavram ve terimleri <em>tanımlayabileceksiniz</em>.</li>
    <li><strong>Açıklama:</strong> Neden-sonuç ilişkilerini ve temel prensipleri kendi cümlelerinizle <em>açıklayabileceksiniz</em>.</li>
    <li><strong>Uygulama:</strong> Karşılaştığınız soru ve problemleri adım adım <em>çözümleyebileceksiniz</em>.</li>
    <li><strong>Analiz & Yorumlama:</strong> Tablo, grafik ve verileri doğru şekilde <em>yorumlayabileceksiniz</em>.</li>
  </ul>
</div>`,
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
</ul>`,
  tip: `<div class="callout box-success">
  <strong>💡 Pratik İpucu:</strong> Soruları hızlı çözmek için bu pratik taktiği kullanabilirsiniz.
</div>`
};

// Natural unit and topic sorting pure helpers
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

export default function SummaryManagerPage() {
  const navigate = useNavigate();
  const { data: curriculumData, addTopic, addUnit } = useCurriculum();
  const { summaries, saveSummary, deleteSummary, getSummary, hasSummary } = useSummaries();
  const { currentUser } = useAuth();

  // Top Selector States
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState(null); // 'unit_general' or topicId

  const [editorMode, setEditorMode] = useState('split'); // 'split', 'code', 'preview'
  const [htmlCode, setHtmlCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Inline topic adding
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const grades = curriculumData?.grades || [];
  const subjects = curriculumData?.subjects || [];
  const units = curriculumData?.units || [];
  const topics = curriculumData?.topics || [];

  // 1. Default Grade Selection
  useEffect(() => {
    if (!selectedGradeId && grades.length > 0) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, selectedGradeId]);

  // Filtered Subjects for Grade
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => String(s.gradeId) === String(selectedGradeId));
  }, [subjects, selectedGradeId]);

  // 2. Default Subject Selection
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [filteredSubjects, selectedSubjectId]);

  // Filtered Units for Subject
  const filteredUnits = useMemo(() => {
    if (!selectedSubjectId) return [];
    let list = units.filter(u => String(u.subjectId || u.subject_id) === String(selectedSubjectId));
    if (list.length === 0) {
      const subjectTopics = topics.filter(t => 
        t && String(t.subjectId || t.subject_id) === String(selectedSubjectId)
      );
      if (subjectTopics.length > 0) {
        list = [{
          id: `u_sub_${selectedSubjectId}`,
          name: 'Genel Müfredat Konuları',
          subjectId: selectedSubjectId,
          topics: subjectTopics
        }];
      }
    }
    return sortUnitsNaturally(list);
  }, [units, topics, selectedSubjectId]);

  // 3. Default Unit Selection
  useEffect(() => {
    if (filteredUnits.length > 0) {
      if (!selectedUnitId || !filteredUnits.some(u => String(u.id) === String(selectedUnitId))) {
        setSelectedUnitId(filteredUnits[0].id);
      }
    } else {
      setSelectedUnitId(null);
    }
  }, [filteredUnits, selectedUnitId]);

  // Helper to reliably find all topics belonging to a unit
  const getTopicsForUnit = (unit) => {
    if (!unit) return [];
    
    // 1. Direct match by unitId or unit_id
    const directTopics = topics.filter(t => 
      t && (
        String(t.unitId || t.unit_id || t.unit) === String(unit.id) ||
        (String(unit.id).startsWith('u_sub_') && String(t.subjectId || t.subject_id) === String(unit.subjectId))
      )
    ).map((t, idx) => ({
      id: String(t.id || `t_${unit.id}_${idx}`),
      name: typeof t === 'string' ? t : (t.name || t.title || `Konu ${idx + 1}`),
      unitId: unit.id,
      order: t.order || t.sortOrder || idx
    }));

    // 2. Embedded topics inside unit.topics
    const embedded = (Array.isArray(unit.topics) ? unit.topics : []).map((t, idx) => ({
      id: typeof t === 'object' && t?.id ? String(t.id) : `t_emb_${unit.id}_${idx}`,
      name: typeof t === 'string' ? t : (t?.name || t?.title || `Konu ${idx + 1}`),
      unitId: unit.id,
      order: t?.order || idx
    }));

    // Combine and deduplicate
    const combined = [...directTopics, ...embedded];
    const unique = [];
    const seenNames = new Set();
    const seenIds = new Set();

    for (const t of combined) {
      if (!t || !t.name) continue;
      const nameKey = t.name.trim().toLowerCase();
      const idKey = String(t.id);
      if (!seenNames.has(nameKey) && !seenIds.has(idKey)) {
        seenNames.add(nameKey);
        seenIds.add(idKey);
        unique.push(t);
      }
    }

    return sortTopicsNaturally(unique);
  };

  // Selected Unit Object
  const currentUnit = useMemo(() => {
    return filteredUnits.find(u => String(u.id) === String(selectedUnitId));
  }, [filteredUnits, selectedUnitId]);

  // Topics for the currently selected Unit
  const currentUnitTopics = useMemo(() => {
    return getTopicsForUnit(currentUnit);
  }, [currentUnit, topics]);

  // 4. Default Target Selection (Topic or Unit General Summary)
  useEffect(() => {
    if (currentUnit) {
      if (currentUnitTopics.length > 0) {
        if (!selectedTargetKey || (selectedTargetKey !== 'unit_general' && !currentUnitTopics.some(t => String(t.id) === String(selectedTargetKey)))) {
          setSelectedTargetKey(currentUnitTopics[0].id);
        }
      } else {
        setSelectedTargetKey('unit_general');
      }
    } else {
      setSelectedTargetKey(null);
    }
  }, [currentUnit, currentUnitTopics]);

  // Active Selected Target Object
  const selectedTarget = useMemo(() => {
    if (!currentUnit) return null;
    if (selectedTargetKey === 'unit_general') {
      return {
        type: 'unit',
        id: currentUnit.id,
        name: `${currentUnit.name} (Genel Ünite Özeti)`,
        unitId: currentUnit.id
      };
    }
    const foundTopic = currentUnitTopics.find(t => String(t.id) === String(selectedTargetKey));
    if (foundTopic) {
      return {
        type: 'topic',
        id: foundTopic.id,
        name: foundTopic.name,
        unitId: currentUnit.id
      };
    }
    return null;
  }, [currentUnit, selectedTargetKey, currentUnitTopics]);

  // Load summary content when target changes
  useEffect(() => {
    if (selectedTarget) {
      const existing = getSummary(selectedTarget.type, selectedTarget.id);
      setHtmlCode(existing?.contentHtml || '');
      setSaveSuccess(false);
    } else {
      setHtmlCode('');
    }
  }, [selectedTarget?.id, selectedTarget?.type]);

  // Handle Save
  const handleSave = async () => {
    if (!selectedTarget) return;
    setIsSaving(true);

    try {
      await saveSummary({
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        gradeId: selectedGradeId,
        subjectId: selectedSubjectId,
        unitId: selectedTarget.unitId || (selectedTarget.type === 'unit' ? selectedTarget.id : null),
        topicId: selectedTarget.type === 'topic' ? selectedTarget.id : null,
        title: selectedTarget.name,
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

  // Handle Adding Topic
  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !selectedUnitId) return;
    try {
      if (typeof addTopic === 'function') {
        await addTopic(selectedUnitId, newTopicName.trim());
      }
      setNewTopicName('');
      setIsAddingTopic(false);
    } catch (e) {
      console.error('Topic add failed:', e);
    }
  };

  // Insert template
  const insertTemplate = (templateKey) => {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    setHtmlCode(prev => (prev ? prev + '\n\n' + tpl : tpl));
  };

  const selectedGradeObj = grades.find(g => String(g.id) === String(selectedGradeId));
  const selectedSubjectObj = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const isTargetSaved = selectedTarget ? hasSummary(selectedTarget.type, selectedTarget.id) : false;

  return (
    <div className="summary-manager-page custom-scrollbar">
      
      {/* ══════════ TOP BAR: HEADER & CONTROLS ══════════ */}
      <header className="summary-top-header">
        <div className="header-left">
          <button 
            className="btn-back-link"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          
          <div className="title-box">
            <h1>Müfredat Özet Modülü Editörü 📝</h1>
            <p>Sınıf, ders, ünite ve konu seçimini yukarıdan yaparak zengin konu özetleri hazırlayın</p>
          </div>
        </div>

        {currentUser?.role === 'teacher' && (
          <div className="teacher-badge-pill">
            <span>🔒 Öğretmen Paneli</span>
          </div>
        )}
      </header>

      {/* ══════════ TOP 4-SELECTOR BAR: SINIF, DERS, ÜNİTE, KONU ══════════ */}
      <div className="top-selectors-ribbon">
        
        {/* 1. Sınıf Seçimi */}
        <div className="top-selector-item">
          <label>🎓 1. Sınıf Seviyesi:</label>
          <select
            value={selectedGradeId || ''}
            onChange={e => setSelectedGradeId(e.target.value)}
          >
            {grades.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Ders Seçimi */}
        <div className="top-selector-item">
          <label>📚 2. Ders:</label>
          <select
            value={selectedSubjectId || ''}
            onChange={e => setSelectedSubjectId(e.target.value)}
            disabled={filteredSubjects.length === 0}
          >
            {filteredSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Ünite Seçimi */}
        <div className="top-selector-item">
          <label>📂 3. Ünite:</label>
          <select
            value={selectedUnitId || ''}
            onChange={e => setSelectedUnitId(e.target.value)}
            disabled={filteredUnits.length === 0}
          >
            {filteredUnits.map((u, uIdx) => (
              <option key={u.id} value={u.id}>{uIdx + 1}. Ünite: {u.name}</option>
            ))}
          </select>
        </div>

        {/* 4. Konu / Ünite Özeti Seçimi */}
        <div className="top-selector-item">
          <label>📄 4. Konu / Özet Türü:</label>
          <select
            value={selectedTargetKey || 'unit_general'}
            onChange={e => setSelectedTargetKey(e.target.value)}
            disabled={!currentUnit}
          >
            <option value="unit_general">
              📁 {currentUnit?.name || 'Ünite'} (Genel Ünite Özeti) {hasSummary('unit', currentUnit?.id) ? '✓' : ''}
            </option>
            {currentUnitTopics.map((t, tIdx) => {
              const filled = hasSummary('topic', t.id);
              return (
                <option key={t.id} value={t.id}>
                  📄 {tIdx + 1}. {t.name} {filled ? '✓ (Dolu)' : '+ (Boş)'}
                </option>
              );
            })}
          </select>
        </div>

      </div>

      {/* ══════════ QUICK TOPIC PILLS BAR (HORIZONTAL TOPIC STRIP) ══════════ */}
      {currentUnit && (
        <div className="unit-topics-quick-strip custom-scrollbar">
          <span className="strip-title">Hızlı Konu Seçimi:</span>
          
          {/* Unit General Summary Pill */}
          <button
            type="button"
            className={`topic-strip-pill ${selectedTargetKey === 'unit_general' ? 'active-pill' : ''}`}
            onClick={() => setSelectedTargetKey('unit_general')}
          >
            <span>📁 Ünite Genel Özeti</span>
            {hasSummary('unit', currentUnit.id) ? (
              <span className="strip-badge badge-filled"><CheckCircle2 size={11} /> Dolu</span>
            ) : (
              <span className="strip-badge badge-empty"><Plus size={11} /> Boş</span>
            )}
          </button>

          {/* Topics Pills */}
          {currentUnitTopics.map((t, tIdx) => {
            const isPillActive = selectedTargetKey === t.id;
            const filled = hasSummary('topic', t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`topic-strip-pill ${isPillActive ? 'active-pill' : ''}`}
                onClick={() => setSelectedTargetKey(t.id)}
              >
                <span>{tIdx + 1}. {t.name}</span>
                {filled ? (
                  <span className="strip-badge badge-filled"><CheckCircle2 size={11} /> Dolu</span>
                ) : (
                  <span className="strip-badge badge-empty"><Plus size={11} /> Boş</span>
                )}
              </button>
            );
          })}

          {/* Inline Add Topic Button */}
          {isAddingTopic ? (
            <div className="inline-add-topic-box">
              <input
                type="text"
                placeholder="Yeni konu adı..."
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateTopic();
                }}
                autoFocus
              />
              <button type="button" onClick={handleCreateTopic} className="btn-add-confirm">
                Ekle
              </button>
              <button type="button" onClick={() => setIsAddingTopic(false)} className="btn-add-cancel">
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="topic-strip-pill btn-add-pill"
              onClick={() => setIsAddingTopic(true)}
              title="Bu üniteye yeni konu ekle"
            >
              <Plus size={13} /> Yeni Konu Ekle
            </button>
          )}
        </div>
      )}

      {/* ══════════ FULL WIDTH RICH HTML EDITOR & PREVIEW PANEL ══════════ */}
      <main className="fullwidth-editor-panel">
        {selectedTarget ? (
          <>
            {/* TARGET BANNER & ACTIONS */}
            <div className="editor-top-bar">
              <div className="target-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="breadcrumb-pill">
                    {selectedGradeObj?.name || 'Sınıf'} &rsaquo; {selectedSubjectObj?.name || 'Ders'} &rsaquo; {currentUnit?.name || 'Ünite'}
                  </span>
                  <span className={`target-type-pill ${selectedTarget.type}`}>
                    {selectedTarget.type === 'unit' ? '📁 ÜNİTE GENEL ÖZETİ' : '📄 KONU ÖZETİ'}
                  </span>
                  {isTargetSaved ? (
                    <span className="save-status-indicator saved">
                      <CheckCircle2 size={13} /> Kayıtlı Özet Mevcut
                    </span>
                  ) : (
                    <span className="save-status-indicator empty">
                      <Plus size={13} /> Henüz Özet Yazılmamış
                    </span>
                  )}
                </div>
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
                    title="Çift Panel (Kod + Canlı Önizleme)"
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
                {isTargetSaved && (
                  <button 
                    className="btn-danger-icon"
                    onClick={handleDelete}
                    title="Bu Özeti Sil"
                  >
                    <Trash2 size={16} /> Sil
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
              <span className="tpl-lbl">Hızlı Şablonlar:</span>
              <button className="tpl-btn" onClick={() => insertTemplate('heading')}>
                <Heading size={13} /> Başlık & Madde
              </button>
              <button className="tpl-btn tpl-note" onClick={() => insertTemplate('note')}>
                <Info size={13} /> 📌 Önemli Not
              </button>
              <button className="tpl-btn tpl-warn" onClick={() => insertTemplate('warning')}>
                <AlertTriangle size={13} /> ⚠️ Dikkat Kutusu
              </button>
              <button className="tpl-btn tpl-formula" onClick={() => insertTemplate('formula')}>
                <Pi size={13} /> 📐 Formül
              </button>
              <button className="tpl-btn tpl-table" onClick={() => insertTemplate('table')}>
                <Table size={13} /> 📊 Tablo
              </button>
              <button className="tpl-btn tpl-tip" onClick={() => insertTemplate('tip')}>
                <Lightbulb size={13} /> 💡 İpucu
              </button>
            </div>

            {/* EDITOR WORKSPACE BODY */}
            <div className={`editor-split-body mode-${editorMode}`}>
              
              {/* HTML CODE TEXTAREA */}
              {(editorMode === 'code' || editorMode === 'split') && (
                <div className="editor-pane code-pane">
                  <div className="pane-header">
                    <span>💻 HTML Kaynak Kodu (Harici HTML veya Word yapıştırabilirsiniz)</span>
                    <span className="char-count">{htmlCode.length} karakter</span>
                  </div>
                  <textarea
                    className="html-code-input custom-scrollbar"
                    placeholder="Buraya HTML formatında konu anlatımınızı veya özetinizi yapıştırın... (Örn: <h2>1. Giriş</h2><p>Konunun detayları...</p>)"
                    value={htmlCode}
                    onChange={e => setHtmlCode(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}

              {/* LIVE PREVIEW PANE */}
              {(editorMode === 'preview' || editorMode === 'split') && (
                <div className="editor-pane preview-pane">
                  <div className="pane-header">
                    <span>👁️ Canlı Öğrenci Önizlemesi</span>
                    <span className="preview-status">{htmlCode ? '✓ Biçimlendirildi' : 'İçerik Boş'}</span>
                  </div>
                  <div className="preview-content-box custom-scrollbar">
                    <SummaryHtmlViewer
                      htmlContent={htmlCode}
                      title={selectedTarget.name}
                      targetType={selectedTarget.type}
                      emptyMessage="Yukarıdaki hızlı şablonlara tıkladığınızda veya HTML yapıştırdığınızda öğrenci ekranında nasıl görüneceği burada anında gösterilecektir."
                    />
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="no-target-selected">
            <BookOpen size={48} style={{ opacity: 0.3 }} />
            <h3>Düzenlemek İçin Yukarıdan Bir Ünite veya Konu Seçin</h3>
            <p>Yukarıdaki açılır menülerden sınıf, ders, ünite ve konu seçimi yaptığınızda editör burada açılacaktır.</p>
          </div>
        )}
      </main>

    </div>
  );
}
