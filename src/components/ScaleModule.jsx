import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, Edit2, Trash2, ClipboardList, Calendar,
  TrendingUp, TrendingDown, Minus, Save, Check,
  AlertCircle, Award, Target, ChevronDown
} from 'lucide-react';
import { useScale } from '../context/ScaleContext';

/* ─────────────── constants ─────────────── */
const CRITERION_TYPES = [
  { id: 'plusminus', label: '± Çift Yön', color: '#6366f1' },
  { id: 'binary',    label: '✓/✗ İkili',  color: '#10b981' },
  { id: 'stars',     label: '★ Yıldız',   color: '#f59e0b' },
  { id: 'numeric',   label: '# Puan',     color: '#3b82f6' },
  { id: 'emoji',     label: '😊 Duygu',   color: '#ec4899' },
  { id: 'rubrik',    label: '📊 Rubrik',  color: '#8b5cf6' },
];
const EMOJI_SCALE   = ['😞','😕','😐','🙂','😊','🤩'];
const RUBRIC_LABELS = ['—','Başlangıç','Gelişiyor','Yetkin','Uzman'];
const RUBRIC_COLORS = ['#94a3b8','#ef4444','#f59e0b','#3b82f6','#10b981'];
const ACOLORS       = ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#14b8a6','#8b5cf6','#f97316'];

/* ─────────────── utils ─────────────── */
function normalizeScore(type, val) {
  if (val === null || val === undefined) return null;
  if (type === 'binary')    return val ? 100 : 0;
  if (type === 'plusminus') return ((+val + 2) / 4) * 100;
  if (type === 'stars')     return (+val / 5) * 100;
  if (type === 'numeric')   return +val;
  if (type === 'emoji')     return (+val / 5) * 100;
  if (type === 'rubrik')    return ((+val - 1) / 3) * 100;
  return 0;
}
function scoreColor(type, val) {
  if (val === null || val === undefined) return '#cbd5e1';
  if (type === 'binary')    return val ? '#10b981' : '#ef4444';
  if (type === 'plusminus') {
    if (val >= 2) return '#10b981'; if (val >= 1) return '#6366f1';
    if (val === 0) return '#94a3b8'; return val <= -2 ? '#ef4444' : '#f97316';
  }
  if (type === 'stars')   { const p = val/5; return p>=0.7?'#10b981':p>=0.4?'#f59e0b':'#ef4444'; }
  if (type === 'numeric') return val>=70?'#10b981':val>=40?'#f59e0b':'#ef4444';
  if (type === 'emoji')   { const p = val/5; return p>=0.6?'#10b981':p>=0.3?'#f59e0b':'#ef4444'; }
  if (type === 'rubrik')  return RUBRIC_COLORS[val] ?? '#94a3b8';
  return '#94a3b8';
}
function scoreToDisplay(type, val) {
  if (val === null || val === undefined) return '—';
  if (type === 'binary')    return val ? '✓' : '✗';
  if (type === 'plusminus') return ({'-2':'−−','-1':'−','0':'0','1':'+','2':'++'})[String(val)] ?? val;
  if (type === 'emoji')     return EMOJI_SCALE[val] ?? '—';
  if (type === 'rubrik')    return RUBRIC_LABELS[val] ?? '—';
  return String(val);
}

/* ─────────────── Avatar ─────────────── */
const Av = ({ name, idx, size = 30 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: ACOLORS[(idx||0)%ACOLORS.length], color: '#fff', fontWeight: 900, fontSize: size*0.38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {(name||'Ö').charAt(0)}
  </div>
);

/* ─────────────── ScoreBadge ─────────────── */
function ScoreBadge({ type, value }) {
  if (value === null || value === undefined) return <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>—</span>;
  const color = scoreColor(type, value);
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.15rem 0.5rem', borderRadius: '0.45rem', background: color+'22', color, fontWeight: 900, fontSize: '0.72rem', minWidth: 24 }}>{scoreToDisplay(type, value)}</span>;
}

/* ─────────────── ScoreCell ─────────────── */
function ScoreCell({ type, value, onChange }) {
  const [focused, setFocused] = useState(false);

  if (type === 'binary') return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      <button onClick={() => onChange(value === 1 ? null : 1)} style={{ width: 36, height: 30, borderRadius: '0.5rem', border: value===1?'2px solid #059669':'2px solid #e2e8f0', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', background: value===1?'linear-gradient(135deg,#d1fae5,#a7f3d0)':'#f8fafc', color: value===1?'#065f46':'#cbd5e1', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
      <button onClick={() => onChange(value === 0 ? null : 0)} style={{ width: 36, height: 30, borderRadius: '0.5rem', border: value===0?'2px solid #dc2626':'2px solid #e2e8f0', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', background: value===0?'linear-gradient(135deg,#fee2e2,#fecaca)':'#f8fafc', color: value===0?'#991b1b':'#cbd5e1', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✗</button>
    </div>
  );
  if (type === 'plusminus') return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {[[-2,'−−','#ef4444'],[-1,'−','#f97316'],[0,'0','#94a3b8'],[1,'+','#6366f1'],[2,'++','#10b981']].map(([v,label,color]) => (
        <button key={v} onClick={() => onChange(value===v?null:v)} style={{ height: 28, minWidth: 26, borderRadius: '0.4rem', border: value===v?`2px solid ${color}`:'2px solid #e2e8f0', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 900, background: value===v?color:'#f8fafc', color: value===v?'#fff':'#94a3b8', transition: 'all .1s', padding: '0 4px' }}>{label}</button>
      ))}
    </div>
  );
  if (type === 'stars') return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange(value===s?null:s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 1px', fontSize: '1.1rem', lineHeight: 1, color: s<=(value||0)?'#f59e0b':'#e2e8f0', transition: 'color .1s' }}>★</button>
      ))}
    </div>
  );
  if (type === 'numeric') return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <input type="number" min={0} max={100} step={5} value={value??''} onChange={e => onChange(e.target.value===''?null:Math.min(100,Math.max(0,+e.target.value)))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="—"
        style={{ width: 58, padding: '0.35rem 0.4rem', borderRadius: 8, border: `2px solid ${focused?'#6366f1':value!=null?scoreColor('numeric',value)+'66':'#e2e8f0'}`, background: value!=null?scoreColor('numeric',value)+'11':'#f8fafc', fontSize: '0.82rem', fontWeight: 800, color: value!=null?scoreColor('numeric',value):'#94a3b8', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }} />
    </div>
  );
  if (type === 'emoji') return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {EMOJI_SCALE.slice(1).map((em, i) => (
        <button key={i} onClick={() => onChange(value===i+1?null:i+1)} title={em} style={{ background: value===i+1?'#eff6ff':'none', border: value===i+1?'2px solid #93c5fd':'2px solid transparent', borderRadius: '0.4rem', cursor: 'pointer', padding: '2px 3px', fontSize: '1.1rem', lineHeight: 1, opacity: value!=null&&value!==i+1?0.3:1, transition: 'all .1s', display: 'flex', alignItems: 'center' }}>{em}</button>
      ))}
    </div>
  );
  if (type === 'rubrik') return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {[1,2,3,4].map(v => (
        <button key={v} onClick={() => onChange(value===v?null:v)} title={RUBRIC_LABELS[v]} style={{ height: 28, minWidth: 28, borderRadius: '0.4rem', border: value===v?`2px solid ${RUBRIC_COLORS[v]}`:'2px solid #e2e8f0', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 900, background: value===v?RUBRIC_COLORS[v]+'22':'#f8fafc', color: value===v?RUBRIC_COLORS[v]:'#94a3b8', transition: 'all .1s', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v}</button>
      ))}
    </div>
  );
  return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>—</span>;
}

/* ─────────────── Shared styles ─────────────── */
const S = {
  card:  { background: '#fff', borderRadius: '1.1rem', border: '1px solid #e8ecf4', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
  label: { display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { width: '100%', padding: '0.55rem 0.85rem', borderRadius: '0.7rem', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  btnP:  { background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: '0.7rem', padding: '0.55rem 1.1rem', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  btnG:  { background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '0.7rem', padding: '0.5rem 0.9rem', fontWeight: 800, fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' },
  mbox:  { background: '#fff', borderRadius: '1.5rem', width: '100%', maxWidth: 580, padding: '1.75rem', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
};

/* ─────────────── Kriter Ekleme Paneli (3 tab) ─────────────── */
const ALL_TEMPLATES = [
  { name: 'Derse hazırlıklı gelme', type: 'binary' },
  { name: 'Ödev teslimi',           type: 'binary' },
  { name: 'Aktif katılım',          type: 'plusminus' },
  { name: 'Dikkat süresi',          type: 'plusminus' },
  { name: 'Sınıf içi davranış',     type: 'emoji' },
  { name: 'Motivasyon düzeyi',      type: 'emoji' },
  { name: 'Grup çalışması',         type: 'stars' },
  { name: 'Sunum becerisi',         type: 'stars' },
  { name: 'Not durumu',             type: 'numeric' },
  { name: 'Sınav puanı',            type: 'numeric' },
  { name: 'Sorumluluk',             type: 'rubrik' },
  { name: 'İletişim',               type: 'rubrik' },
  { name: 'Yazılı ifade',           type: 'rubrik' },
  { name: 'Yaratıcılık',            type: 'stars' },
  { name: 'Öz değerlendirme',       type: 'emoji' },
  { name: 'Proje katkısı',          type: 'plusminus' },
];

function CriteriaTabBar({ formCriteria, setFormCriteria, S, CRITERION_TYPES }) {
  const [tab, setTab]               = useState('single');
  const [singleName, setSingleName] = useState('');
  const [singleType, setSingleType] = useState('binary');
  const [bulkText, setBulkText]     = useState('');
  const [bulkType, setBulkType]     = useState('binary');
  const [selected, setSelected]     = useState(new Set());

  const addSingle = () => {
    if (!singleName.trim()) return;
    setFormCriteria(p => [...p, { id: `c_${Date.now()}_${Math.random()}`, name: singleName.trim(), type: singleType }]);
    setSingleName('');
  };

  const addBulk = () => {
    const names = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!names.length) return;
    setFormCriteria(p => [...p, ...names.map(name => ({ id: `c_${Date.now()}_${Math.random()}`, name, type: bulkType }))]);
    setBulkText('');
  };

  const addSelected = () => {
    if (!selected.size) return;
    const toAdd = ALL_TEMPLATES.filter(t => selected.has(t.name));
    setFormCriteria(p => [...p, ...toAdd.map(t => ({ id: `c_${Date.now()}_${Math.random()}`, ...t }))]);
    setSelected(new Set());
  };

  const toggleAll = () => {
    if (selected.size === ALL_TEMPLATES.length) setSelected(new Set());
    else setSelected(new Set(ALL_TEMPLATES.map(t => t.name)));
  };

  const TABS = [
    { id: 'single',    icon: '➕', label: 'Tek Ekle' },
    { id: 'bulk',      icon: '📝', label: 'Toplu Metin' },
    { id: 'templates', icon: '⚡', label: 'Şablonlar' },
  ];

  return (
    <div>
      {/* Tab headers */}
      <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1.5px solid #e8ecf4' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '0.6rem 0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: tab === t.id ? 900 : 700, color: tab === t.id ? '#7c3aed' : '#94a3b8', background: tab === t.id ? '#fff' : 'transparent', borderBottom: tab === t.id ? '2.5px solid #8b5cf6' : '2.5px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.85rem' }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0.85rem' }}>

        {/* ── Tek Ekle ── */}
        {tab === 'single' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginBottom: '0.3rem' }}>Kriter Adı</label>
              <input value={singleName} onChange={e => setSingleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSingle()}
                placeholder="Örn: Aktif katılım, Ödev teslimi..." style={{ ...S.input, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ ...S.label, marginBottom: '0.3rem' }}>Tür</label>
              <select value={singleType} onChange={e => setSingleType(e.target.value)}
                style={{ ...S.input, width: 'auto', padding: '0.5rem 0.6rem', fontSize: '0.74rem', minWidth: 115 }}>
                {CRITERION_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
              </select>
            </div>
            <button onClick={addSingle} disabled={!singleName.trim()}
              style={{ ...S.btnP, padding: '0.5rem 0.85rem', opacity: singleName.trim() ? 1 : 0.45, flexShrink: 0 }}>
              <Plus size={14} /> Ekle
            </button>
          </div>
        )}

        {/* ── Toplu Metin ── */}
        {tab === 'bulk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ ...S.label, margin: 0, flexShrink: 0 }}>Tümüne Tür:</label>
              <select value={bulkType} onChange={e => setBulkType(e.target.value)}
                style={{ ...S.input, width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
                {CRITERION_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
              </select>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Her satır ayrı kriter olur</span>
            </div>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={'Derse hazırlıklı gelme\nAktif katılım\nÖdev teslimi\nGrup çalışması\n...'}
              rows={5}
              style={{ ...S.input, resize: 'vertical', lineHeight: 1.7, fontSize: '0.8rem', padding: '0.6rem 0.8rem', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                {bulkText.split('\n').filter(l => l.trim()).length} kriter hazır
              </span>
              <button onClick={addBulk} disabled={!bulkText.trim()}
                style={{ ...S.btnP, padding: '0.45rem 1rem', fontSize: '0.78rem', opacity: bulkText.trim() ? 1 : 0.45 }}>
                <Plus size={13} /> Tümünü Ekle
              </button>
            </div>
          </div>
        )}

        {/* ── Şablonlar ── */}
        {tab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={toggleAll} style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {selected.size === ALL_TEMPLATES.length ? '☑ Hiçbirini Seçme' : '☐ Tümünü Seç'}
              </button>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selected.size} seçili</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.35rem' }}>
              {ALL_TEMPLATES.map(tmpl => {
                const ct = CRITERION_TYPES.find(t => t.id === tmpl.type);
                const isSelected = selected.has(tmpl.name);
                return (
                  <button key={tmpl.name}
                    onClick={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        isSelected ? next.delete(tmpl.name) : next.add(tmpl.name);
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0.45rem 0.65rem',
                      borderRadius: '0.6rem', border: isSelected ? `2px solid ${ct?.color||'#8b5cf6'}` : '1.5px solid #e8ecf4',
                      background: isSelected ? (ct?.color||'#8b5cf6') + '12' : '#f8fafc',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    }}>
                    <div style={{ width: 16, height: 16, borderRadius: '0.3rem', border: `2px solid ${isSelected ? ct?.color||'#8b5cf6' : '#e2e8f0'}`, background: isSelected ? ct?.color||'#8b5cf6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                      {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.name}</div>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: ct?.color||'#94a3b8' }}>{ct?.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={addSelected} disabled={!selected.size}
              style={{ ...S.btnP, alignSelf: 'flex-end', padding: '0.45rem 1rem', fontSize: '0.78rem', opacity: selected.size ? 1 : 0.4 }}>
              <Plus size={13} /> {selected.size > 0 ? `${selected.size} Kriteri Ekle` : 'Kriter Seçin'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}



/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ScaleModule({ students = [], teacherId }) {
  const { getScalesForTeacher, loadScalesForTeacher, saveScale, deleteScale } = useScale();
  const scales = getScalesForTeacher(teacherId);

  useEffect(() => { if (teacherId) loadScalesForTeacher(teacherId); }, [teacherId]);

  const [activeScaleId, setActiveScaleId]         = useState(null);
  const [activeSession, setActiveSession]         = useState(null);
  const [view, setView]                           = useState('grid');
  const [showCreateScale, setShowCreateScale]     = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [editingScaleId, setEditingScaleId]       = useState(null);
  const [scaleDropOpen, setScaleDropOpen]         = useState(false);

  const [formName, setFormName]         = useState('');
  const [formDesc, setFormDesc]         = useState('');
  const [formCriteria, setFormCriteria] = useState([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
  const [sessionLabel, setSessionLabel] = useState(`Seans ${new Date().toLocaleDateString('tr-TR')}`);
  const [sessionDate, setSessionDate]   = useState(new Date().toISOString().split('T')[0]);

  const activeScale = useMemo(() => scales.find(s => s.id === activeScaleId), [scales, activeScaleId]);
  const activeSess  = useMemo(() => activeScale?.sessions?.find(s => s.id === activeSession), [activeScale, activeSession]);

  useEffect(() => { if (!activeScaleId && scales.length > 0) setActiveScaleId(scales[0].id); }, [scales]);
  useEffect(() => {
    if (activeScale?.sessions?.length > 0) setActiveSession(activeScale.sessions[activeScale.sessions.length - 1].id);
    else setActiveSession(null);
  }, [activeScaleId]);

  /* ── CRUD ── */
  const handleSaveScale = async () => {
    if (!formName.trim() || formCriteria.some(c => !c.name.trim())) return;
    const sd = {
      id: editingScaleId || `scale_${Date.now()}`,
      name: formName.trim(), desc: formDesc.trim(),
      criteria: formCriteria.map((c, i) => ({ ...c, id: c.id || `c_${i}_${Date.now()}` })),
      sessions: editingScaleId ? (activeScale?.sessions || []) : [],
      teacherId, createdBy: teacherId,
      createdAt: editingScaleId ? (activeScale?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveScale(sd);
    setActiveScaleId(sd.id);
    setShowCreateScale(false); setEditingScaleId(null);
    setFormName(''); setFormDesc(''); setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
  };

  const openEditScale = (sc) => {
    setEditingScaleId(sc.id); setFormName(sc.name); setFormDesc(sc.desc || '');
    setFormCriteria(sc.criteria.map(c => ({ ...c }))); setShowCreateScale(true);
  };

  const handleDeleteScale = async (id) => {
    if (!window.confirm('Bu ölçek listesi silinsin mi?')) return;
    await deleteScale(id);
    if (activeScaleId === id) setActiveScaleId(null);
  };

  const handleCreateSession = async () => {
    if (!activeScale || !sessionLabel.trim()) return;
    const ns = { id: `sess_${Date.now()}`, label: sessionLabel.trim(), date: sessionDate, scores: {}, homeworkStudents: {} };
    const upd = { ...activeScale, sessions: [...(activeScale.sessions||[]), ns], updatedAt: new Date().toISOString() };
    await saveScale(upd);
    setActiveSession(ns.id); setShowCreateSession(false);
  };

  const handleDeleteSession = async (sessId) => {
    if (!activeScale || !window.confirm('Bu seans silinsin mi?')) return;
    const upd = { ...activeScale, sessions: activeScale.sessions.filter(s => s.id !== sessId), updatedAt: new Date().toISOString() };
    await saveScale(upd);
    if (activeSession === sessId) {
      const r = upd.sessions;
      setActiveSession(r.length ? r[r.length-1].id : null);
    }
  };

  const setScore = async (studentId, criterionId, value) => {
    if (!activeScale || !activeSess) return;
    const updSess = { ...activeSess, scores: { ...activeSess.scores, [studentId]: { ...(activeSess.scores[studentId]||{}), [criterionId]: value } } };
    await saveScale({ ...activeScale, sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s), updatedAt: new Date().toISOString() });
  };

  /* ── Homework per student ── */
  const toggleHomework = async (studentId) => {
    if (!activeScale || !activeSess) return;
    const hw = activeSess.homeworkStudents || {};
    const updSess = { ...activeSess, homeworkStudents: { ...hw, [studentId]: !hw[studentId] } };
    await saveScale({ ...activeScale, sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s), updatedAt: new Date().toISOString() });
  };

  /* ── Stats ── */
  const studentStats = useMemo(() => {
    if (!activeScale) return [];
    return students.map((std, idx) => {
      const all = [];
      (activeScale.sessions||[]).forEach(sess => activeScale.criteria.forEach(crit => {
        const v = sess.scores?.[std.id]?.[crit.id];
        if (v != null) all.push(normalizeScore(crit.type, v));
      }));
      const avg = all.length ? Math.round(all.reduce((a,b) => a+b,0)/all.length) : null;
      return { ...std, avg, idx };
    }).sort((a,b) => (b.avg??-1)-(a.avg??-1));
  }, [activeScale, students]);

  const criterionStats = useMemo(() => {
    if (!activeScale) return [];
    return activeScale.criteria.map(crit => {
      const all = [];
      (activeScale.sessions||[]).forEach(sess => students.forEach(std => {
        const v = sess.scores?.[std.id]?.[crit.id];
        if (v != null) all.push(normalizeScore(crit.type, v));
      }));
      const avg = all.length ? Math.round(all.reduce((a,b) => a+b,0)/all.length) : null;
      return { ...crit, avg, count: all.length };
    });
  }, [activeScale, students]);

  const studentTrend = useMemo(() => {
    if (!activeScale || (activeScale.sessions?.length??0) < 2) return {};
    const sess = activeScale.sessions;
    const last = sess[sess.length-1], prev = sess[sess.length-2];
    const avg = (s, std) => {
      const vals = activeScale.criteria.map(c => { const v = s.scores?.[std.id]?.[c.id]; return v!=null?normalizeScore(c.type,v):null; }).filter(x=>x!==null);
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    };
    const t = {};
    students.forEach(std => { const la=avg(last,std), pa=avg(prev,std); if(la!==null&&pa!==null) t[std.id]=la-pa; });
    return t;
  }, [activeScale, students]);

  /* ═══ RENDER ═══ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── TOP CONTROL BAR ── */}
      <div style={{ ...S.card, padding: '0.85rem 1.1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>

        {/* Ölçek seçici */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setScaleDropOpen(o => !o)}
            style={{ ...S.btnG, gap: '0.5rem', minWidth: 160, justifyContent: 'space-between', fontWeight: 900, fontSize: '0.8rem', color: '#1e293b', borderColor: activeScale ? '#c4b5fd' : '#e2e8f0', background: activeScale ? 'rgba(139,92,246,0.06)' : '#fff' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
              {activeScale ? activeScale.name : 'Ölçek Seç'}
            </span>
            <ChevronDown size={14} />
          </button>
          {scaleDropOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, background: '#fff', borderRadius: '0.85rem', border: '1.5px solid #e8ecf4', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 220, overflow: 'hidden' }}
              onMouseLeave={() => setScaleDropOpen(false)}>
              {scales.length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}>Henüz ölçek yok</div>
              ) : scales.map(sc => (
                <div key={sc.id}
                  onClick={() => { setActiveScaleId(sc.id); setView('grid'); setScaleDropOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', cursor: 'pointer', background: sc.id === activeScaleId ? 'rgba(139,92,246,0.07)' : 'transparent', borderLeft: `3px solid ${sc.id === activeScaleId ? '#8b5cf6' : 'transparent'}`, transition: 'all 0.12s' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{sc.name}</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{sc.criteria?.length||0} kriter · {sc.sessions?.length||0} seans</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button onClick={e => { e.stopPropagation(); openEditScale(sc); setScaleDropOpen(false); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.4rem', padding: '0.28rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><Edit2 size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteScale(sc.id); setScaleDropOpen(false); }} style={{ background: '#fee2e2', border: 'none', borderRadius: '0.4rem', padding: '0.28rem', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              <div style={{ padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => { setEditingScaleId(null); setFormName(''); setFormDesc(''); setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]); setShowCreateScale(true); setScaleDropOpen(false); }}
                  style={{ ...S.btnP, width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '0.45rem' }}>
                  <Plus size={13} /> Yeni Ölçek
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Seans sekmeleri */}
        {activeScale && (
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flex: 1, overflowX: 'auto', scrollbarWidth: 'none', flexWrap: 'nowrap' }}>
            {(activeScale.sessions||[]).map(sess => {
              const hwCount = Object.values(sess.homeworkStudents||{}).filter(Boolean).length;
              return (
                <button key={sess.id} onClick={() => setActiveSession(sess.id)}
                  style={{
                    padding: '0.32rem 0.7rem', borderRadius: '0.6rem', border: sess.id===activeSession ? 'none' : '1.5px solid #e2e8f0',
                    background: sess.id===activeSession ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : '#f8fafc',
                    color: sess.id===activeSession ? '#fff' : '#64748b',
                    fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  }}>
                  {sess.label}
                  {hwCount > 0 && <span style={{ background: sess.id===activeSession?'rgba(255,255,255,0.25)':'#d1fae5', color: sess.id===activeSession?'#fff':'#065f46', borderRadius: '1rem', padding: '0 5px', fontSize: '0.6rem', fontWeight: 900 }}>📚{hwCount}</span>}
                  <X size={10} style={{ opacity: 0.6 }} onClick={e => { e.stopPropagation(); handleDeleteSession(sess.id); }} />
                </button>
              );
            })}
            <button onClick={() => setShowCreateSession(true)}
              style={{ ...S.btnG, fontSize: '0.72rem', padding: '0.32rem 0.65rem', flexShrink: 0, borderStyle: 'dashed' }}>
              <Plus size={12} /> Seans
            </button>
          </div>
        )}

        {/* Görünüm butonları */}
        <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto', flexShrink: 0 }}>
          {[['grid','📋'],['stats','📊'],['history','📅']].map(([v, ic]) => (
            <button key={v} onClick={() => setView(v)}
              title={v==='grid'?'Tablo':v==='stats'?'İstatistik':'Geçmiş'}
              style={{ width: 34, height: 34, borderRadius: '0.6rem', border: view===v?'none':'1.5px solid #e2e8f0', background: view===v?'linear-gradient(135deg,#8b5cf6,#6366f1)':'#f8fafc', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {!activeScale ? (
        <div style={{ ...S.card, padding: '4rem', textAlign: 'center' }}>
          <ClipboardList size={40} color="#cbd5e1" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <h4 style={{ margin: '0 0 0.5rem', fontWeight: 900, color: '#1e293b' }}>Ölçek Seçin veya Oluşturun</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 1.5rem' }}>Yukarıdan bir ölçek seçin ya da yeni bir tane oluşturun.</p>
          <button onClick={() => { setShowCreateScale(true); }} style={{ ...S.btnP, margin: '0 auto' }}><Plus size={15} /> İlk Ölçeği Oluştur</button>
        </div>

      ) : view === 'grid' ? (
        /* ══ TABLO GÖRÜNÜMÜ ══ */
        activeSess ? (
          <div style={{ borderRadius: '1.25rem', overflow: 'hidden', border: '1.5px solid #e8ecf4', boxShadow: '0 4px 24px rgba(99,102,241,0.06)', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 480 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.06))' }}>
                  <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 160, position: 'sticky', left: 0, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderBottom: '2px solid #ddd6fe', zIndex: 2, borderRight: '1px solid #ede9fe' }}>Öğrenci</th>
                  {activeScale.criteria.map((crit, ci) => {
                    const ct = CRITERION_TYPES.find(t => t.id === crit.type);
                    return (
                      <th key={crit.id} style={{ padding: '0.9rem 0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd6fe', borderRight: ci < activeScale.criteria.length - 1 ? '1px solid #ede9fe' : 'none', background: 'linear-gradient(135deg,rgba(139,92,246,0.04),rgba(99,102,241,0.04))', minWidth: 120 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#374151', marginBottom: '0.3rem', whiteSpace: 'nowrap' }}>{crit.name}</div>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', background: (ct?.color||'#94a3b8')+'20', color: ct?.color||'#94a3b8', fontSize: '0.6rem', fontWeight: 800 }}>{ct?.label}</span>
                      </th>
                    );
                  })}
                  {/* Ödev sütunu */}
                  <th style={{ padding: '0.9rem 0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd6fe', borderLeft: '1px solid #ede9fe', background: 'linear-gradient(135deg,#fef9c3,#fef3c7)', minWidth: 90 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📚 Ödev</div>
                  </th>
                  {/* Ort sütunu */}
                  <th style={{ padding: '0.9rem 0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd6fe', borderLeft: '1px solid #ede9fe', background: 'linear-gradient(135deg,rgba(139,92,246,0.04),rgba(99,102,241,0.04))', minWidth: 80, fontSize: '0.65rem', fontWeight: 900, color: '#7c3aed', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ort.</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={activeScale.criteria.length + 3} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.82rem' }}>Sınıfa öğrenci eklendikten sonra değerlendirme yapabilirsiniz.</td></tr>
                ) : students.map((std, si) => {
                  const scores = activeSess.scores?.[std.id] || {};
                  const hw = activeSess.homeworkStudents?.[std.id] || false;
                  const norms = activeScale.criteria.map(c => { const v = scores[c.id]; return v!=null?normalizeScore(c.type,v):null; }).filter(x => x!==null);
                  const avg = norms.length ? Math.round(norms.reduce((a,b)=>a+b,0)/norms.length) : null;
                  const isEven = si % 2 === 0;
                  const avgColor = avg!==null?(avg>=70?'#10b981':avg>=40?'#f59e0b':'#ef4444'):null;
                  return (
                    <tr key={std.id} style={{ background: isEven ? '#ffffff' : '#fafbff', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = isEven ? '#ffffff' : '#fafbff'}>
                      {/* Öğrenci */}
                      <td style={{ padding: '0.75rem 1.1rem', position: 'sticky', left: 0, zIndex: 1, background: isEven?'#ffffff':'#fafbff', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f0f0f8', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Av name={std.name} idx={si} size={28} />
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap' }}>{std.name}</div>
                        </div>
                      </td>
                      {/* Kriterler */}
                      {activeScale.criteria.map((crit, ci) => (
                        <td key={crit.id} style={{ padding: '0.65rem 0.6rem', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', borderRight: ci < activeScale.criteria.length-1 ? '1px solid #f0f0f8' : 'none' }}>
                          <ScoreCell type={crit.type} value={scores[crit.id]??null} onChange={val => setScore(std.id, crit.id, val)} />
                        </td>
                      ))}
                      {/* Ödev toggle */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f0f0f8', background: hw ? '#f0fdf4' : 'transparent' }}>
                        <button onClick={() => toggleHomework(std.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '0.28rem 0.65rem', borderRadius: '1rem',
                            border: hw ? '1.5px solid #6ee7b7' : '1.5px solid #e2e8f0',
                            background: hw ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : '#fff',
                            color: hw ? '#065f46' : '#94a3b8',
                            fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}>
                          {hw ? '✅' : '📚'} {hw ? 'Verildi' : 'Ver'}
                        </button>
                      </td>
                      {/* Ortalama */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f0f0f8' }}>
                        {avg !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ padding: '0.22rem 0.6rem', borderRadius: '0.6rem', background: avgColor+'18', color: avgColor, fontWeight: 900, fontSize: '0.78rem', border: `1.5px solid ${avgColor}33` }}>%{avg}</span>
                            <div style={{ width: 40, height: 3, borderRadius: 9, background: '#e8ecf4', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${avg}%`, background: avgColor, borderRadius: 9, transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        ) : <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...S.card, padding: '3.5rem', textAlign: 'center' }}>
            <Calendar size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ color: '#94a3b8', margin: '0 0 1rem', fontSize: '0.82rem' }}>Değerlendirme başlatmak için bir seans oluşturun.</p>
            <button onClick={() => setShowCreateSession(true)} style={{ ...S.btnP, margin: '0 auto' }}><Plus size={15} /> İlk Seansı Başlat</button>
          </div>
        )

      ) : view === 'stats' ? (
        /* ══ İSTATİSTİK ══ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...S.card, padding: '1rem 1.2rem' }}>
            <h4 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>📊 {activeScale.name} — İstatistikler</h4>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>{activeScale.sessions?.length||0} seans · {students.length} öğrenci · {activeScale.criteria?.length||0} kriter</p>
          </div>
          <div style={{ ...S.card, padding: '1.1rem' }}>
            <h5 style={{ margin: '0 0 0.85rem', fontWeight: 900, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Award size={15} color="#f59e0b" /> Öğrenci Sıralaması</h5>
            {studentStats.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>Henüz veri yok.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {studentStats.map((std, rank) => {
                  const trend = studentTrend[std.id];
                  return (
                    <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 900, flexShrink: 0, background: rank===0?'linear-gradient(135deg,#f59e0b,#d97706)':rank===1?'linear-gradient(135deg,#94a3b8,#64748b)':rank===2?'linear-gradient(135deg,#f97316,#ea580c)':'#f1f5f9', color: rank<3?'#fff':'#64748b' }}>{rank+1}</div>
                      <Av name={std.name} idx={std.idx} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.78rem', color: '#1e293b' }}>{std.name}</p>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 9, overflow: 'hidden', marginTop: '0.3rem' }}>
                          <div style={{ height: '100%', borderRadius: 9, width: `${std.avg??0}%`, background: (std.avg??0)>=70?'linear-gradient(90deg,#10b981,#059669)':(std.avg??0)>=40?'linear-gradient(90deg,#f59e0b,#f97316)':'linear-gradient(90deg,#f43f5e,#e11d48)', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                        {trend !== undefined && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: trend>0?'#10b981':trend<0?'#ef4444':'#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>{trend>0?<TrendingUp size={11}/>:trend<0?<TrendingDown size={11}/>:<Minus size={11}/>}{Math.abs(Math.round(trend))}</span>}
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.74rem', minWidth: 40, textAlign: 'center', background: std.avg!==null?(std.avg>=70?'#d1fae5':std.avg>=40?'#fef3c7':'#fee2e2'):'#f1f5f9', color: std.avg!==null?(std.avg>=70?'#065f46':std.avg>=40?'#92400e':'#991b1b'):'#94a3b8' }}>{std.avg!==null?`%${std.avg}`:'—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ ...S.card, padding: '1.1rem' }}>
            <h5 style={{ margin: '0 0 0.85rem', fontWeight: 900, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Target size={15} color="#6366f1" /> Kriter Bazlı Ortalamalar</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '0.65rem' }}>
              {criterionStats.map(crit => {
                const ct = CRITERION_TYPES.find(t => t.id === crit.type);
                return (
                  <div key={crit.id} style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.85rem', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.73rem', color: '#334155', lineHeight: 1.2, flex: 1, marginRight: '0.4rem' }}>{crit.name}</p>
                      <span style={{ fontSize: '0.58rem', fontWeight: 900, padding: '0.1rem 0.4rem', borderRadius: '1rem', background: (ct?.color||'#94a3b8')+'22', color: ct?.color||'#94a3b8', flexShrink: 0 }}>{ct?.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: crit.avg!==null?(crit.avg>=70?'#10b981':crit.avg>=40?'#f59e0b':'#ef4444'):'#cbd5e1' }}>{crit.avg!==null?`%${crit.avg}`:'—'}</p>
                    <p style={{ margin: '0.1rem 0 0.4rem', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>{crit.count} kayıt</p>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${crit.avg??0}%`, borderRadius: 9, background: ct?.color||'#94a3b8', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      ) : (
        /* ══ GEÇMİŞ ══ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!(activeScale.sessions?.length) ? (
            <div style={{ ...S.card, padding: '3rem', textAlign: 'center' }}>
              <Calendar size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.82rem' }}>Henüz seans kaydı yok.</p>
            </div>
          ) : [...activeScale.sessions].reverse().map(sess => {
            const filled = students.filter(std => activeScale.criteria.some(c => { const v = sess.scores?.[std.id]?.[c.id]; return v != null; })).length;
            const hwStudents = students.filter(std => sess.homeworkStudents?.[std.id]);
            return (
              <div key={sess.id} style={{ ...S.card, padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.85rem', color: '#1e293b' }}>{sess.label}</h5>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>{sess.date}</span>
                    {hwStudents.length > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.18rem 0.55rem', borderRadius: '1rem', background: '#d1fae5', color: '#065f46', fontWeight: 800, fontSize: '0.62rem', border: '1px solid #6ee7b7' }}>📚 {hwStudents.length} öğrenciye ödev verildi</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>{filled}/{students.length} öğrenci</span>
                    <button onClick={() => { setActiveSession(sess.id); setView('grid'); }} style={{ ...S.btnG, fontSize: '0.68rem', padding: '0.28rem 0.6rem' }}><Edit2 size={11} /> Düzenle</button>
                    <button onClick={() => handleDeleteSession(sess.id)} style={{ ...S.btnG, fontSize: '0.68rem', padding: '0.28rem 0.6rem', borderColor: '#fca5a5', color: '#ef4444' }}><Trash2 size={11} /></button>
                  </div>
                </div>
                {/* Ödev verilen öğrenciler */}
                {hwStudents.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '0.65rem', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#065f46', marginRight: '0.25rem' }}>📚 Ödev Verilenler:</span>
                    {hwStudents.map((std, si) => (
                      <span key={std.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.65rem' }}>
                        <Av name={std.name} idx={students.indexOf(std)} size={14} /> {std.name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.5rem' }}>
                  {students.map((std, si) => {
                    const scores = sess.scores?.[std.id] || {};
                    const cnt = activeScale.criteria.filter(c => scores[c.id] != null).length;
                    const stdHw = sess.homeworkStudents?.[std.id] || false;
                    return (
                      <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', borderRadius: '0.65rem', background: stdHw ? '#f0fdf4' : '#f8fafc', border: `1px solid ${stdHw ? '#bbf7d0' : '#f1f5f9'}` }}>
                        <Av name={std.name} idx={si} size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.7rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{std.name}</p>
                          <p style={{ margin: 0, fontSize: '0.6rem', color: '#94a3b8' }}>{cnt}/{activeScale.criteria.length} kriter{stdHw ? ' · 📚 ödev' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-end' }}>
                          {activeScale.criteria.slice(0,3).map(c => <ScoreBadge key={c.id} type={c.type} value={scores[c.id]??null} />)}
                          {activeScale.criteria.length > 3 && <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 700 }}>+{activeScale.criteria.length-3}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL: Ölçek Oluştur/Düzenle ══ */}
      {showCreateScale && (
        <div style={S.modal}>
          <div style={{ ...S.mbox, maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>{editingScaleId ? '✏️ Ölçek Düzenle' : '✨ Yeni Ölçek Listesi'}</h3>
              <button onClick={() => { setShowCreateScale(false); setEditingScaleId(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Temel bilgiler */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div><label style={S.label}>Ölçek Adı *</label><input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Örn: Haftalık Davranış Takibi" style={S.input} /></div>
                <div><label style={S.label}>Açıklama</label><input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Bu ölçek neyi ölçer?" style={S.input} /></div>
              </div>

              {/* Kriter editörü */}
              <div style={{ border: '1.5px solid #e8ecf4', borderRadius: '1rem', overflow: 'hidden' }}>

                {/* Tab bar */}
                <CriteriaTabBar formCriteria={formCriteria} setFormCriteria={setFormCriteria} S={S} CRITERION_TYPES={CRITERION_TYPES} />

              </div>

              {/* Mevcut kriterler özeti */}
              {formCriteria.length > 0 && (
                <div style={{ background: '#f8fafc', borderRadius: '0.85rem', padding: '0.75rem 0.9rem', border: '1.5px solid #e8ecf4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <p style={{ ...S.label, margin: 0 }}>Eklenecek Kriterler ({formCriteria.length})</p>
                    <button onClick={() => setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.62rem', color: '#ef4444', fontWeight: 700 }}>Tümünü Temizle</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 180, overflowY: 'auto' }}>
                    {formCriteria.map((crit, i) => {
                      const ct = CRITERION_TYPES.find(t => t.id === crit.type);
                      return (
                        <div key={crit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', borderRadius: '0.55rem', background: '#fff', border: '1px solid #f1f5f9' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontWeight: 900, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                          <input value={crit.name} onChange={e => setFormCriteria(p => p.map((c,j) => j===i?{...c,name:e.target.value}:c))} style={{ flex: 1, border: 'none', background: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', outline: 'none' }} />
                          <select value={crit.type} onChange={e => setFormCriteria(p => p.map((c,j) => j===i?{...c,type:e.target.value}:c))}
                            style={{ border: `1.5px solid ${ct?.color||'#e2e8f0'}22`, borderRadius: '0.5rem', padding: '0.18rem 0.35rem', fontSize: '0.62rem', fontWeight: 800, color: ct?.color||'#94a3b8', background: (ct?.color||'#94a3b8')+'11', outline: 'none', cursor: 'pointer' }}>
                            {CRITERION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                          <button onClick={() => { if (formCriteria.length > 1) setFormCriteria(p => p.filter((_,j) => j!==i)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '0 2px', display: 'flex', flexShrink: 0 }}><X size={12} /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => { setShowCreateScale(false); setEditingScaleId(null); }} style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 800, fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>İptal</button>
                <button onClick={handleSaveScale} disabled={!formName.trim() || formCriteria.some(c => !c.name.trim())} style={{ ...S.btnP, flex: 2, justifyContent: 'center', padding: '0.65rem', opacity: !formName.trim()||formCriteria.some(c=>!c.name.trim())?0.5:1 }}>
                  <Save size={14} /> {editingScaleId ? 'Güncelle & Kaydet' : 'Ölçeği Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ══ MODAL: Seans ══ */}
      {showCreateSession && (
        <div style={S.modal}>
          <div style={{ ...S.mbox, maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>📅 Yeni Değerlendirme Seansı</h3>
              <button onClick={() => setShowCreateSession(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div><label style={S.label}>Seans Adı</label><input value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} placeholder="Örn: Hafta 3 · Kasım" style={S.input} /></div>
              <div><label style={S.label}>Tarih</label><input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={S.input} /></div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => setShowCreateSession(false)} style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 800, fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>İptal</button>
                <button onClick={handleCreateSession} style={{ ...S.btnP, flex: 2, justifyContent: 'center', padding: '0.65rem' }}><Check size={14} /> Seansı Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
