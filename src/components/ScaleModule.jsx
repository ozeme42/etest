import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, X, Edit2, Trash2, ClipboardList, Calendar,
  TrendingUp, TrendingDown, Minus, Save, Check,
  AlertCircle, Award, Target, ChevronDown, Search,
  Sparkles, Layers, FileText, CheckCircle, Users,
  BarChart3, LineChart, Printer, MessageSquare,
  Zap, BookmarkCheck, ArrowRight, ShieldCheck,
  Flame, Download, Star, Smile, Sliders, CheckSquare
} from 'lucide-react';
import { useScale } from '../context/ScaleContext';
import '../pages/Scale.css';

/* ─────────────── CRITERIA TYPES & SCALES ─────────────── */
const CRITERION_TYPES = [
  { id: 'binary',    label: '✓/✗ İkili',      color: '#10b981', desc: 'Var / Yok, Yapıldı / Yapılmadı' },
  { id: 'plusminus', label: '± Çift Yön',     color: '#6366f1', desc: '−−, −, 0, +, ++ (5 Seviye)' },
  { id: 'stars',     label: '★ Yıldız (1-5)',  color: '#f59e0b', desc: '1 ile 5 Yıldız Arası Derece' },
  { id: 'numeric',   label: '# Puan (0-100)', color: '#38bdf8', desc: '0 ile 100 Arası Sayısal Puan' },
  { id: 'emoji',     label: '😊 Duygu / Likert',color: '#ec4899', desc: 'Duygu / Memnuniyet / Kaygı' },
  { id: 'rubrik',    label: '📊 MEB Rubrik',   color: '#8b5cf6', desc: '1:Başlangıç, 2:Gelişiyor, 3:Yetkin, 4:Uzman' },
];

const EMOJI_SCALE   = ['😞','😕','😐','🙂','😊','🤩'];
const EMOJI_LABELS  = ['—','Çok Düşük / Kaygılı','Düşük / Kararsız','Orta / Yeterli','İyi / İstekli','Mükemmel / Coşkulu'];
const RUBRIC_LABELS = ['—','1: Başlangıç Düzeyi','2: Gelişmekte Olan','3: Yetkin / Hedefe Ulaştı','4: Uzman / İleri Düzey'];
const RUBRIC_COLORS = ['#94a3b8','#ef4444','#f59e0b','#38bdf8','#10b981'];
const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#38bdf8','#14b8a6','#8b5cf6','#f97316'];

/* ─────────────── READY-MADE PRESET SCALES ─────────────── */
const PRESET_SCALES = [
  {
    id: 'preset_meb_performance',
    name: 'MEB Ders İçi Katılım & Performans Ölçeği',
    desc: 'MEB yönetmeliğine uygun ders içi etkinlik, hazırlık, dinleme ve aktif katılım ölçeği.',
    category: 'Akademik / MEB',
    criteria: [
      { id: 'c_meb_1', name: 'Derse zamanında ve hazırlıklı gelme', type: 'binary' },
      { id: 'c_meb_2', name: 'Ders araç-gereçlerini eksiksiz getirme', type: 'binary' },
      { id: 'c_meb_3', name: 'Derse aktif katılım ve soru sorma/cevaplama', type: 'plusminus' },
      { id: 'c_meb_4', name: 'Dikkatini derse verme ve odaklanma süresi', type: 'stars' },
      { id: 'c_meb_5', name: 'Sınıf kurallarına ve arkadaşlarına saygı', type: 'emoji' },
      { id: 'c_meb_6', name: 'Verilen görev ve ödevleri tamamlama', type: 'rubrik' },
      { id: 'c_meb_7', name: 'Grup çalışması ve iş birliğine yatkınlık', type: 'stars' },
      { id: 'c_meb_8', name: 'Sözlü & Yazılı İfade Başarısı', type: 'numeric' }
    ]
  },
  {
    id: 'preset_guidance_anxiety',
    name: 'Rehberlik & Sınav Kaygısı / Motivasyon Ölçeği',
    desc: 'Öğrencinin sınav öncesi kaygı durumu, zaman yönetimi, özgüven ve odaklanma seviyesi.',
    category: 'Rehberlik & Psikolojik',
    criteria: [
      { id: 'c_g_1', name: 'Sınav öncesi özgüven ve rahatlık düzeyi', type: 'emoji' },
      { id: 'c_g_2', name: 'Zaman yönetimi ve planlı çalışma alışkanlığı', type: 'rubrik' },
      { id: 'c_g_3', name: 'Soru çözerken odaklanabilme & dikkati sürdürme', type: 'stars' },
      { id: 'c_g_4', name: 'Sınav kaygısı ve stres kontrolü', type: 'emoji' },
      { id: 'c_g_5', name: 'Günlük soru hedefine ulaşma kararlılığı', type: 'plusminus' },
      { id: 'c_g_6', name: 'Düzenli tekrar ve deneme analizi yapma', type: 'binary' },
      { id: 'c_g_7', name: 'Koçluk / Rehberlik görüşmelerine katılım', type: 'binary' }
    ]
  },
  {
    id: 'preset_coaching_routine',
    name: 'LGS / YKS Koçluk & Haftalık Rutin Takip Çizelgesi',
    desc: 'Paragraf rutini, hedef soru sayısı, deneme sınavı ve yanlış analizi takip sistemi.',
    category: 'Koçluk & Takip',
    criteria: [
      { id: 'c_c_1', name: 'Günlük Paragraf & Problem Rutini (Aralıksız)', type: 'binary' },
      { id: 'c_c_2', name: 'Haftalık Hedeflenen Soru Sayısına Ulaşma (%)', type: 'numeric' },
      { id: 'c_c_3', name: 'Haftalık Deneme Sınavı Çözümü', type: 'binary' },
      { id: 'c_c_4', name: 'Yanlış ve Boş Soruların Analizini Yapma', type: 'plusminus' },
      { id: 'c_c_5', name: 'Uyku Düzeni ve Ekran Süresi Kontrolü', type: 'stars' },
      { id: 'c_c_6', name: 'Ders Çalışma Motivasyonu & Enerji Düzeyi', type: 'emoji' },
      { id: 'c_c_7', name: 'Haftalık Konu Eksiklerini Tamamlama Oranı', type: 'rubrik' }
    ]
  },
  {
    id: 'preset_project_rubric',
    name: 'Proje, Sunum & Performans Görevi Analitik Rubriği',
    desc: 'MEB dereceli puanlama anahtarı: araştırma, sunum, materyal ve yaratıcılık değerlendirmesi.',
    category: 'Proje & Rubrik',
    criteria: [
      { id: 'c_p_1', name: 'Konuyu Araştırma ve Kaynak Çeşitliliği', type: 'rubrik' },
      { id: 'c_p_2', name: 'Bilgiyi Yapılandırma ve İçerik Doğruluğu', type: 'numeric' },
      { id: 'c_p_3', name: 'Sunum Becerisi, Diksiyon ve Beden Dili', type: 'stars' },
      { id: 'c_p_4', name: 'Görsel Materyal ve Teknoloji Kullanımı', type: 'stars' },
      { id: 'c_p_5', name: 'Zamanı Etkili ve Verimli Kullanma', type: 'plusminus' },
      { id: 'c_p_6', name: 'Özgünlük ve Yaratıcılık Düzeyi', type: 'emoji' }
    ]
  },
  {
    id: 'preset_reading_habits',
    name: 'Kitap Okuma & Anlama Becerisi Gelişim Ölçeği',
    desc: 'Okuma süresi, ana fikir çıkarımı, sözcük dağarcığı ve özetleme yeteneği.',
    category: 'Okuma & Anlama',
    criteria: [
      { id: 'c_r_1', name: 'Günlük Kitap Okuma Süresi (Dk)', type: 'numeric' },
      { id: 'c_r_2', name: 'Metnin Ana Fikrini ve Yardımcı Fikirlerini Belirleme', type: 'stars' },
      { id: 'c_r_3', name: 'Sözcük Dağarcığı ve Yeni Kelimeleri Kullanma', type: 'plusminus' },
      { id: 'c_r_4', name: 'Okuduğunu Özetleme ve Yorumlama Becerisi', type: 'rubrik' },
      { id: 'c_r_5', name: 'Okuma İsteği ve Kitap Sevgisi', type: 'emoji' }
    ]
  }
];

/* ─────────────── SCORE NORMALIZATION ─────────────── */
function normalizeScore(type, val) {
  if (val === null || val === undefined) return null;
  if (type === 'binary')    return val ? 100 : 0;
  if (type === 'plusminus') return ((+val + 2) / 4) * 100;
  if (type === 'stars')     return (+val / 5) * 100;
  if (type === 'numeric')   return Math.min(100, Math.max(0, +val));
  if (type === 'emoji')     return (+val / 5) * 100;
  if (type === 'rubrik')    return ((+val - 1) / 3) * 100;
  return 0;
}

function scoreColor(type, val) {
  if (val === null || val === undefined) return '#94a3b8';
  if (type === 'binary')    return val ? '#16a34a' : '#dc2626';
  if (type === 'plusminus') {
    if (val >= 2) return '#16a34a';
    if (val >= 1) return '#4f46e5';
    if (val === 0) return '#64748b';
    return val <= -2 ? '#dc2626' : '#ea580c';
  }
  if (type === 'stars') {
    const p = val / 5;
    return p >= 0.7 ? '#16a34a' : p >= 0.4 ? '#d97706' : '#dc2626';
  }
  if (type === 'numeric') return val >= 70 ? '#16a34a' : val >= 45 ? '#d97706' : '#dc2626';
  if (type === 'emoji') {
    const p = val / 5;
    return p >= 0.6 ? '#16a34a' : p >= 0.3 ? '#d97706' : '#dc2626';
  }
  if (type === 'rubrik') return RUBRIC_COLORS[val] ?? '#64748b';
  return '#64748b';
}

function scoreToDisplay(type, val) {
  if (val === null || val === undefined) return '—';
  if (type === 'binary')    return val ? '✓' : '✗';
  if (type === 'plusminus') return ({'-2':'−−','-1':'−','0':'0','1':'+','2':'++'})[String(val)] ?? val;
  if (type === 'emoji')     return EMOJI_SCALE[val] ?? '—';
  if (type === 'rubrik')    return RUBRIC_LABELS[val] ?? '—';
  return String(val);
}

/* ─────────────── COMPACT AVATAR ─────────────── */
const Av = ({ name, idx, size = 32 }) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: '50%',
    background: AVATAR_COLORS[(idx || 0) % AVATAR_COLORS.length],
    color: '#ffffff',
    fontWeight: 900,
    fontSize: size * 0.4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  }}>
    {(name || 'Ö').charAt(0).toUpperCase()}
  </div>
);

/* ─────────────── INTERACTIVE SCORE CELL ─────────────── */
function ScoreCell({ type, value, onChange }) {
  if (type === 'binary') {
    return (
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
        <button
          onClick={() => onChange(value === 1 ? null : 1)}
          style={{
            width: 36,
            height: 30,
            borderRadius: '0.5rem',
            border: value === 1 ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '1rem',
            background: value === 1 ? '#f0fdf4' : '#f8fafc',
            color: value === 1 ? '#15803d' : '#94a3b8',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Var / Yapıldı"
        >
          ✓
        </button>
        <button
          onClick={() => onChange(value === 0 ? null : 0)}
          style={{
            width: 36,
            height: 30,
            borderRadius: '0.5rem',
            border: value === 0 ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '1rem',
            background: value === 0 ? '#fef2f2' : '#f8fafc',
            color: value === 0 ? '#dc2626' : '#94a3b8',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Yok / Yapılmadı"
        >
          ✗
        </button>
      </div>
    );
  }

  if (type === 'plusminus') {
    return (
      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
        {[[-2, '−−', '#dc2626'], [-1, '−', '#ea580c'], [0, '0', '#64748b'], [1, '+', '#4f46e5'], [2, '++', '#16a34a']].map(([v, label, color]) => (
          <button
            key={v}
            onClick={() => onChange(value === v ? null : v)}
            style={{
              height: 28,
              minWidth: 26,
              borderRadius: '0.4rem',
              border: value === v ? `2px solid ${color}` : '1.5px solid #cbd5e1',
              cursor: 'pointer',
              fontSize: '0.68rem',
              fontWeight: 900,
              background: value === v ? color : '#f8fafc',
              color: value === v ? '#ffffff' : '#475569',
              transition: 'all 0.1s',
              padding: '0 4px'
            }}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'stars') {
    return (
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => onChange(value === s ? null : s)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 1px',
              fontSize: '1.15rem',
              lineHeight: 1,
              color: s <= (value || 0) ? '#f59e0b' : '#cbd5e1',
              transition: 'color 0.1s'
            }}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (type === 'numeric') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Math.min(100, Math.max(0, +e.target.value)))}
          placeholder="—"
          style={{
            width: 58,
            padding: '0.35rem 0.4rem',
            borderRadius: 8,
            border: `1.5px solid ${value != null ? scoreColor('numeric', value) : '#cbd5e1'}`,
            background: value != null ? '#f0f9ff' : '#ffffff',
            fontSize: '0.86rem',
            fontWeight: 900,
            color: value != null ? scoreColor('numeric', value) : '#0f172a',
            outline: 'none',
            textAlign: 'center',
            fontFamily: 'monospace'
          }}
        />
      </div>
    );
  }

  if (type === 'emoji') {
    return (
      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
        {EMOJI_SCALE.slice(1).map((em, i) => (
          <button
            key={i}
            onClick={() => onChange(value === i + 1 ? null : i + 1)}
            title={EMOJI_LABELS[i + 1]}
            style={{
              background: value === i + 1 ? '#fdf2f8' : 'none',
              border: value === i + 1 ? '2px solid #db2777' : '1px solid transparent',
              borderRadius: '0.45rem',
              cursor: 'pointer',
              padding: '2px 3px',
              fontSize: '1.15rem',
              lineHeight: 1,
              opacity: value != null && value !== i + 1 ? 0.35 : 1,
              transition: 'all 0.1s',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {em}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'rubrik') {
    return (
      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
        {[1, 2, 3, 4].map(v => (
          <button
            key={v}
            onClick={() => onChange(value === v ? null : v)}
            title={RUBRIC_LABELS[v]}
            style={{
              height: 28,
              minWidth: 28,
              borderRadius: '0.4rem',
              border: value === v ? `2px solid ${RUBRIC_COLORS[v]}` : '1.5px solid #cbd5e1',
              cursor: 'pointer',
              fontSize: '0.68rem',
              fontWeight: 900,
              background: value === v ? RUBRIC_COLORS[v] + '25' : '#f8fafc',
              color: value === v ? RUBRIC_COLORS[v] : '#475569',
              transition: 'all 0.1s',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }

  return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT: SCALE MODULE
═══════════════════════════════════════════════════════════ */
export default function ScaleModule({ students = [], teacherId }) {
  const { getScalesForTeacher, loadScalesForTeacher, saveScale, deleteScale } = useScale();
  const scales = getScalesForTeacher(teacherId);

  useEffect(() => {
    if (teacherId) loadScalesForTeacher(teacherId);
  }, [teacherId, loadScalesForTeacher]);

  // Active States
  const [activeScaleId, setActiveScaleId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [viewTab, setViewTab] = useState('grid'); // 'grid' | 'analytics' | 'trend'

  // Modals
  const [showCreateScale, setShowCreateScale] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [editingScaleId, setEditingScaleId] = useState(null);
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);

  // Selected Student for Note/Report
  const [selectedStudentForNote, setSelectedStudentForNote] = useState(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [studentObservationNote, setStudentObservationNote] = useState('');

  // Form Data for Scale Create/Edit
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCriteria, setFormCriteria] = useState([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
  const [criteriaTab, setCriteriaTab] = useState('single');
  const [singleCritName, setSingleCritName] = useState('');
  const [singleCritType, setSingleCritType] = useState('binary');
  const [bulkCritText, setBulkCritText] = useState('');
  const [bulkCritType, setBulkCritType] = useState('binary');

  // Session Form Data
  const [sessionLabel, setSessionLabel] = useState(`Seans ${new Date().toLocaleDateString('tr-TR')}`);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Search & Filter
  const [searchStudent, setSearchStudent] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeScale = useMemo(() => scales.find(s => s.id === activeScaleId), [scales, activeScaleId]);
  const activeSess  = useMemo(() => activeScale?.sessions?.find(s => s.id === activeSession), [activeScale, activeSession]);

  useEffect(() => {
    if (!activeScaleId && scales.length > 0) {
      setActiveScaleId(scales[0].id);
    }
  }, [scales, activeScaleId]);

  useEffect(() => {
    if (activeScale?.sessions?.length > 0) {
      setActiveSession(activeScale.sessions[activeScale.sessions.length - 1].id);
    } else {
      setActiveSession(null);
    }
  }, [activeScaleId, activeScale?.sessions]);

  // Total KPIs
  const totalScalesCount = scales.length;
  const totalSessionsCount = useMemo(() => {
    return scales.reduce((sum, sc) => sum + (sc.sessions?.length || 0), 0);
  }, [scales]);
  const totalStudentsCount = students.length;

  const classOverallAvg = useMemo(() => {
    if (!activeScale || !activeScale.sessions || activeScale.sessions.length === 0) return 0;
    const all = [];
    activeScale.sessions.forEach(sess => {
      activeScale.criteria.forEach(crit => {
        students.forEach(std => {
          const v = sess.scores?.[std.id]?.[crit.id];
          if (v != null) all.push(normalizeScore(crit.type, v));
        });
      });
    });
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [activeScale, students]);

  /* ── ACTIONS ── */
  const handleSaveScale = async () => {
    if (!formName.trim() || formCriteria.some(c => !c.name.trim())) {
      showToast('Lütfen ölçek adını ve tüm kriter başlıklarını doldurunuz.', 'error');
      return;
    }
    const sd = {
      id: editingScaleId || `scale_${Date.now()}`,
      name: formName.trim(),
      desc: formDesc.trim(),
      criteria: formCriteria.map((c, i) => ({ ...c, id: c.id || `c_${i}_${Date.now()}` })),
      sessions: editingScaleId ? (activeScale?.sessions || []) : [],
      teacherId: teacherId || 'teacher_default',
      createdBy: teacherId || 'teacher_default',
      createdAt: editingScaleId ? (activeScale?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveScale(sd);
    setActiveScaleId(sd.id);
    setShowCreateScale(false);
    setEditingScaleId(null);
    setFormName('');
    setFormDesc('');
    setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
    showToast('Ölçek başarıyla kaydedildi! ✨');
  };

  const handleLoadPreset = async (preset) => {
    const sd = {
      id: `scale_${Date.now()}`,
      name: preset.name,
      desc: preset.desc,
      category: preset.category,
      criteria: preset.criteria,
      sessions: [
        {
          id: `sess_${Date.now()}`,
          label: `1. Değerlendirme (${new Date().toLocaleDateString('tr-TR')})`,
          date: new Date().toISOString().split('T')[0],
          scores: {},
          notes: {},
          homeworkStudents: {}
        }
      ],
      teacherId: teacherId || 'teacher_default',
      createdBy: teacherId || 'teacher_default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveScale(sd);
    setActiveScaleId(sd.id);
    showToast(`"${preset.name}" şablonu başarıyla yüklendi! 🚀`);
  };

  const openEditScale = (sc) => {
    setEditingScaleId(sc.id);
    setFormName(sc.name);
    setFormDesc(sc.desc || '');
    setFormCriteria(sc.criteria.map(c => ({ ...c })));
    setShowCreateScale(true);
  };

  const handleDeleteScale = async (id, name) => {
    if (!window.confirm(`"${name}" ölçeğini silmek istediğinize emin misiniz?`)) return;
    await deleteScale(id);
    if (activeScaleId === id) setActiveScaleId(null);
    showToast('Ölçek silindi.');
  };

  const handleCreateSession = async () => {
    if (!activeScale || !sessionLabel.trim()) return;
    const ns = {
      id: `sess_${Date.now()}`,
      label: sessionLabel.trim(),
      date: sessionDate,
      scores: {},
      notes: {},
      homeworkStudents: {}
    };
    const upd = { ...activeScale, sessions: [...(activeScale.sessions || []), ns], updatedAt: new Date().toISOString() };
    await saveScale(upd);
    setActiveSession(ns.id);
    setShowCreateSession(false);
    showToast(`"${sessionLabel}" seansı başlatıldı! 🎯`);
  };

  const handleDeleteSession = async (sessId) => {
    if (!activeScale || !window.confirm('Bu seansı ve tüm puan kayıtlarını silmek istediğinize emin misiniz?')) return;
    const upd = { ...activeScale, sessions: activeScale.sessions.filter(s => s.id !== sessId), updatedAt: new Date().toISOString() };
    await saveScale(upd);
    if (activeSession === sessId) {
      const r = upd.sessions;
      setActiveSession(r.length ? r[r.length - 1].id : null);
    }
    showToast('Seans silindi.');
  };

  const setScore = async (studentId, criterionId, value) => {
    if (!activeScale || !activeSess) return;
    const updSess = {
      ...activeSess,
      scores: {
        ...activeSess.scores,
        [studentId]: {
          ...(activeSess.scores[studentId] || {}),
          [criterionId]: value
        }
      }
    };
    await saveScale({
      ...activeScale,
      sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s),
      updatedAt: new Date().toISOString()
    });
  };

  const toggleHomework = async (studentId) => {
    if (!activeScale || !activeSess) return;
    const hw = activeSess.homeworkStudents || {};
    const updSess = {
      ...activeSess,
      homeworkStudents: {
        ...hw,
        [studentId]: !hw[studentId]
      }
    };
    await saveScale({
      ...activeScale,
      sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s),
      updatedAt: new Date().toISOString()
    });
  };

  const saveObservationNote = async () => {
    if (!activeScale || !activeSess || !selectedStudentForNote) return;
    const notes = activeSess.notes || {};
    const updSess = {
      ...activeSess,
      notes: {
        ...notes,
        [selectedStudentForNote.id]: studentObservationNote.trim()
      }
    };
    await saveScale({
      ...activeScale,
      sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s),
      updatedAt: new Date().toISOString()
    });
    setShowNoteModal(false);
    setSelectedStudentForNote(null);
    showToast('Öğretmen gözlem notu kaydedildi.');
  };

  // Bulk Quick Score for Entire Class
  const handleBulkQuickScore = async (critId, standardVal) => {
    if (!activeScale || !activeSess) return;
    const newScores = { ...(activeSess.scores || {}) };
    students.forEach(std => {
      newScores[std.id] = {
        ...(newScores[std.id] || {}),
        [critId]: standardVal
      };
    });
    const updSess = { ...activeSess, scores: newScores };
    await saveScale({
      ...activeScale,
      sessions: activeScale.sessions.map(s => s.id === updSess.id ? updSess : s),
      updatedAt: new Date().toISOString()
    });
    showToast('Tüm sınıfa standart değer uygulandı! ✅');
  };

  /* ── COMPUTED STATS ── */
  const studentStats = useMemo(() => {
    if (!activeScale) return [];
    return students.map((std, idx) => {
      const all = [];
      (activeScale.sessions || []).forEach(sess => {
        activeScale.criteria.forEach(crit => {
          const v = sess.scores?.[std.id]?.[crit.id];
          if (v != null) all.push(normalizeScore(crit.type, v));
        });
      });
      const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
      return { ...std, avg, idx };
    }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  }, [activeScale, students]);

  const criterionStats = useMemo(() => {
    if (!activeScale) return [];
    return activeScale.criteria.map(crit => {
      const all = [];
      (activeScale.sessions || []).forEach(sess => {
        students.forEach(std => {
          const v = sess.scores?.[std.id]?.[crit.id];
          if (v != null) all.push(normalizeScore(crit.type, v));
        });
      });
      const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
      return { ...crit, avg, count: all.length };
    }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  }, [activeScale, students]);

  const studentTrend = useMemo(() => {
    if (!activeScale || (activeScale.sessions?.length ?? 0) < 2) return {};
    const sess = activeScale.sessions;
    const last = sess[sess.length - 1];
    const prev = sess[sess.length - 2];
    const avgFor = (s, std) => {
      const vals = activeScale.criteria.map(c => {
        const v = s.scores?.[std.id]?.[c.id];
        return v != null ? normalizeScore(c.type, v) : null;
      }).filter(x => x !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const t = {};
    students.forEach(std => {
      const la = avgFor(last, std);
      const pa = avgFor(prev, std);
      if (la !== null && pa !== null) t[std.id] = Math.round(la - pa);
    });
    return t;
  }, [activeScale, students]);

  // Filtered Students in Table
  const filteredStudents = useMemo(() => {
    return students.filter(std => 
      (std.name || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
      (std.className || '').toLowerCase().includes(searchStudent.toLowerCase())
    );
  }, [students, searchStudent]);

  return (
    <div className="scales-page-container custom-scrollbar">
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          background: toast.type === 'error' 
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '1rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 800,
          fontSize: '0.95rem',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* ── TOP HERO HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BarChart3 size={30} style={{ color: '#6366f1' }} /> Çok Yönlü Değerlendirme &amp; Gözlem Ölçekleri
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8', padding: '0.2rem 0.75rem', borderRadius: '1rem', letterSpacing: '0.05em' }}>
              MEB &amp; REHBERLİK UYUMLU
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.92rem', fontWeight: 600 }}>
            Akademik başarı, ders içi katılım, rehberlik, sınav kaygısı, proje rubrikleri ve koçluk için tüm ölçekleri puanlayın ve gelişim raporlayın.
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setEditingScaleId(null);
              setFormName('');
              setFormDesc('');
              setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
              setShowCreateScale(true);
            }}
            style={{
              padding: '0.75rem 1.4rem',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 900,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)'
            }}
          >
            <Plus size={18} /> Yeni Ölçek Oluştur
          </button>
        </div>
      </div>

      {/* ── 4 LIVE KPI HERO CARDS ── */}
      <div className="scale-kpi-grid">
        <div className="scale-kpi-card">
          <div className="scale-kpi-icon" style={{ background: '#eff6ff', color: '#4f46e5', border: '1px solid #bfdbfe' }}>
            <ClipboardList size={26} />
          </div>
          <div>
            <div className="scale-kpi-val">{totalScalesCount}</div>
            <div className="scale-kpi-lbl">Aktif Ölçek</div>
          </div>
        </div>

        <div className="scale-kpi-card">
          <div className="scale-kpi-icon" style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
            <Calendar size={26} />
          </div>
          <div>
            <div className="scale-kpi-val">{totalSessionsCount}</div>
            <div className="scale-kpi-lbl">Toplam Seans &amp; Tarih</div>
          </div>
        </div>

        <div className="scale-kpi-card">
          <div className="scale-kpi-icon" style={{ background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="scale-kpi-val">{totalStudentsCount}</div>
            <div className="scale-kpi-lbl">Kayıtlı Öğrenci</div>
          </div>
        </div>

        <div className="scale-kpi-card">
          <div className="scale-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            <Award size={26} />
          </div>
          <div>
            <div className="scale-kpi-val">%{classOverallAvg}</div>
            <div className="scale-kpi-lbl">Sınıf Genel Ortalaması</div>
          </div>
        </div>
      </div>

      {/* ── PRESET TEMPLATES FAST BAR ── */}
      <div className="scale-glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={18} /> 1 Tıkla Hazır Ölçek Yükle:
          </span>
          {PRESET_SCALES.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s'
              }}
              title={preset.desc}
            >
              <Zap size={13} style={{ color: '#0284c7' }} /> {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCALE SELECTOR & SESSION CONTROL BAR ── */}
      <div className="scale-glass-card" style={{ padding: '1rem 1.4rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
        
        {/* Ölçek Seçici Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setScaleDropdownOpen(o => !o)}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.85rem',
                background: activeScale ? '#eff6ff' : '#f8fafc',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                minWidth: '220px',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                {activeScale ? `📋 ${activeScale.name}` : 'Ölçek Seçiniz...'}
              </span>
              <ChevronDown size={16} />
            </button>

            {scaleDropdownOpen && (
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  zIndex: 9999,
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '1rem',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                  minWidth: '280px',
                  overflow: 'hidden'
                }}
                onMouseLeave={() => setScaleDropdownOpen(false)}
              >
                {scales.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.82rem', textAlign: 'center' }}>
                    Henüz kayıtlı ölçek yok
                  </div>
                ) : (
                  scales.map(sc => (
                    <div
                      key={sc.id}
                      onClick={() => { setActiveScaleId(sc.id); setScaleDropdownOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        background: sc.id === activeScaleId ? '#eff6ff' : 'transparent',
                        borderLeft: `3px solid ${sc.id === activeScaleId ? '#6366f1' : 'transparent'}`,
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{sc.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{sc.criteria?.length || 0} kriter • {sc.sessions?.length || 0} seans</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={e => { e.stopPropagation(); openEditScale(sc); setScaleDropdownOpen(false); }}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.4rem', padding: '0.35rem', cursor: 'pointer', color: '#4f46e5' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteScale(sc.id, sc.name); setScaleDropdownOpen(false); }}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.4rem', padding: '0.35rem', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                
                <div style={{ padding: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => {
                      setEditingScaleId(null);
                      setFormName('');
                      setFormDesc('');
                      setFormCriteria([{ id: `c_${Date.now()}`, name: '', type: 'binary' }]);
                      setShowCreateScale(true);
                      setScaleDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '0.65rem',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Plus size={14} /> Yeni Ölçek Ekle
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeScale && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => openEditScale(activeScale)}
                style={{ padding: '0.55rem 0.85rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#334155', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Ölçeği ve Kriterlerini Düzenle"
              >
                <Edit2 size={14} /> Ölçeği Düzenle
              </button>
            </div>
          )}
        </div>

        {/* Seanslar ve Tarih Seçici */}
        {activeScale && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflowX: 'auto', maxWidth: '600px' }} className="custom-scrollbar">
            {(activeScale.sessions || []).map(sess => {
              const isActive = sess.id === activeSession;
              const hwCount = Object.values(sess.homeworkStudents || {}).filter(Boolean).length;

              return (
                <button
                  key={sess.id}
                  onClick={() => setActiveSession(sess.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: isActive ? '1.5px solid #4f46e5' : '1.5px solid #cbd5e1',
                    background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#334155',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
                  }}
                >
                  <Calendar size={13} /> {sess.label}
                  {hwCount > 0 && (
                    <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#f0fdf4', color: isActive ? '#ffffff' : '#15803d', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: 900, border: isActive ? 'none' : '1px solid #bbf7d0' }}>
                      📚 {hwCount}
                    </span>
                  )}
                  <X size={12} style={{ opacity: 0.6 }} onClick={e => { e.stopPropagation(); handleDeleteSession(sess.id); }} />
                </button>
              );
            })}

            <button
              onClick={() => setShowCreateSession(true)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                background: '#f0f9ff',
                border: '1.5px dashed #0284c7',
                color: '#0284c7',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} /> Yeni Seans
            </button>
          </div>
        )}

        {/* View Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '0.75rem', padding: '0.25rem', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setViewTab('grid')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: viewTab === 'grid' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none',
              color: viewTab === 'grid' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📋 Tablo Matrisi
          </button>
          <button
            onClick={() => setViewTab('analytics')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: viewTab === 'analytics' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none',
              color: viewTab === 'analytics' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📊 Sınıf Analizi
          </button>
          <button
            onClick={() => setViewTab('trend')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: viewTab === 'trend' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none',
              color: viewTab === 'trend' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📈 Gelişim Trendi
          </button>
        </div>

      </div>

      {/* ── CONTENT AREA ── */}
      {!activeScale ? (
        <div className="scale-glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eff6ff', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
            <ClipboardList size={40} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              Değerlendirme Ölçeği Seçiniz veya Oluşturunuz
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', maxWidth: '480px', fontSize: '0.92rem' }}>
              Yukarıdaki hazır şablonlardan 1 tıkla yükleyebilir veya kendi kriterlerinize özel yeni bir ölçek oluşturabilirsiniz.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => handleLoadPreset(PRESET_SCALES[0])}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(99,102,241,0.25)' }}
            >
              ⚡ MEB Performans Ölçeğiyle Başla
            </button>
            <button
              onClick={() => handleLoadPreset(PRESET_SCALES[1])}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(2,132,199,0.25)' }}
            >
              🧠 Rehberlik &amp; Sınav Kaygısı Ölçeği
            </button>
          </div>
        </div>
      ) : viewTab === 'grid' ? (
        /* ════ TAB 1: MATRIX SCORING TABLE ════ */
        activeSess ? (
          <div className="scale-glass-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
            
            {/* Table Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              
              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Öğrenci ara..."
                  style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.3rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Quick info & bulk tips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                  💡 <strong>Hızlı İpucu:</strong> Sütun başlıklarındaki "Tümüne Uygula" ile sınıfa tek tıkla standart puan verip istisnaları değiştirebilirsiniz.
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1.5px solid #e2e8f0', background: '#ffffff' }} className="custom-scrollbar">
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '780px', color: '#0f172a' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '180px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, borderRight: '1px solid #e2e8f0' }}>
                      Öğrenci
                    </th>
                    
                    {activeScale.criteria.map((crit) => {
                      const ct = CRITERION_TYPES.find(t => t.id === crit.type);
                      return (
                        <th key={crit.id} style={{ padding: '0.85rem 0.65rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', minWidth: '140px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>
                            {crit.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <span style={{ padding: '0.12rem 0.45rem', borderRadius: '0.4rem', background: (ct?.color || '#94a3b8') + '18', color: ct?.color || '#475569', fontSize: '0.68rem', fontWeight: 800 }}>
                              {ct?.label}
                            </span>
                            {/* Bulk quick fill trigger */}
                            {crit.type === 'binary' && (
                              <button
                                onClick={() => handleBulkQuickScore(crit.id, 1)}
                                style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '0.68rem', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                                title="Tüm sınıfa ✓ ver"
                              >
                                [Tümüne ✓]
                              </button>
                            )}
                            {crit.type === 'plusminus' && (
                              <button
                                onClick={() => handleBulkQuickScore(crit.id, 1)}
                                style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.68rem', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                                title="Tüm sınıfa + ver"
                              >
                                [Tümüne +]
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}

                    {/* Ödev Sütunu */}
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', minWidth: '100px', background: '#fffbeb' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>📚 Ödev</div>
                    </th>

                    {/* Ortalama Sütunu */}
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', minWidth: '85px', fontSize: '0.74rem', fontWeight: 900, color: '#0284c7', textTransform: 'uppercase' }}>
                      Ortalama
                    </th>

                    {/* Rapor & Karne */}
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', minWidth: '110px', fontSize: '0.74rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase' }}>
                      Gözlem &amp; Karne
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={activeScale.criteria.length + 4} style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
                        Öğrenci bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, si) => {
                      const scores = activeSess.scores?.[std.id] || {};
                      const note = activeSess.notes?.[std.id] || '';
                      const hw = activeSess.homeworkStudents?.[std.id] || false;
                      const norms = activeScale.criteria.map(c => {
                        const v = scores[c.id];
                        return v != null ? normalizeScore(c.type, v) : null;
                      }).filter(x => x !== null);
                      const avg = norms.length ? Math.round(norms.reduce((a, b) => a + b, 0) / norms.length) : null;
                      const isEven = si % 2 === 0;

                      return (
                        <tr
                          key={std.id}
                          style={{
                            background: isEven ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'background 0.12s'
                          }}
                        >
                          {/* Student Info (Sticky) */}
                          <td style={{ padding: '0.75rem 1.1rem', position: 'sticky', left: 0, zIndex: 1, background: isEven ? '#ffffff' : '#f8fafc', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <Av name={std.name} idx={si} size={30} />
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                  {std.name} {std.surname || ''}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {std.className || std.grade || 'Öğrenci'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Criteria Score Cells */}
                          {activeScale.criteria.map((crit) => (
                            <td key={crit.id} style={{ padding: '0.65rem 0.55rem', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0' }}>
                              <ScoreCell
                                type={crit.type}
                                value={scores[crit.id] ?? null}
                                onChange={val => setScore(std.id, crit.id, val)}
                              />
                            </td>
                          ))}

                          {/* Homework Toggle */}
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', background: hw ? '#f0fdf4' : 'transparent' }}>
                            <button
                              onClick={() => toggleHomework(std.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '1rem',
                                border: hw ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                                background: hw ? '#f0fdf4' : '#ffffff',
                                color: hw ? '#15803d' : '#64748b',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {hw ? '✅ Verildi' : '📚 Ödev Ver'}
                            </button>
                          </td>

                          {/* Ortalama Score Badge */}
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0' }}>
                            {avg !== null ? (
                              <span style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '0.65rem',
                                background: avg >= 70 ? '#f0fdf4' : avg >= 45 ? '#fffbeb' : '#fef2f2',
                                color: avg >= 70 ? '#15803d' : avg >= 45 ? '#b45309' : '#dc2626',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                border: `1px solid ${avg >= 70 ? '#bbf7d0' : avg >= 45 ? '#fde68a' : '#fecaca'}`
                              }}>
                                %{avg}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>

                          {/* Gözlem Notu & Karne Butonları */}
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              <button
                                onClick={() => {
                                  setSelectedStudentForNote(std);
                                  setStudentObservationNote(note);
                                  setShowNoteModal(true);
                                }}
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.5rem',
                                  background: note ? '#faf5ff' : '#f8fafc',
                                  border: `1.5px solid ${note ? '#e9d5ff' : '#cbd5e1'}`,
                                  color: note ? '#7e22ce' : '#64748b',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}
                                title="Öğretmen Gözlem Notu Ekle"
                              >
                                <MessageSquare size={13} /> {note ? 'Not Var' : 'Not'}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedStudentForReport(std);
                                  setShowReportCardModal(true);
                                }}
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.5rem',
                                  background: '#f0f9ff',
                                  border: '1.5px solid #bae6fd',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 900
                                }}
                                title="Bireysel Karne & Gelişim Raporunu Aç"
                              >
                                <Printer size={13} /> Karne
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <div className="scale-glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Calendar size={40} style={{ color: '#0284c7', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Bu Ölçek İçin Henüz Seans Başlatılmadı</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.5rem 0 1.25rem 0' }}>
              Değerlendirme yapabilmek için lütfen bir seans (tarih) oluşturun.
            </p>
            <button
              onClick={() => setShowCreateSession(true)}
              style={{ padding: '0.65rem 1.4rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}
            >
              <Plus size={16} /> İlk Seansı Başlat
            </button>
          </div>
        )
      ) : viewTab === 'analytics' ? (
        /* ════ TAB 2: CLASS & CRITERIA ANALYTICS ════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Criteria Success Breakdown */}
            <div className="scale-glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.15rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} style={{ color: '#4f46e5' }} /> Kriter Bazında Sınıf Başarısı
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {criterionStats.map(crit => {
                  const pct = crit.avg || 0;
                  return (
                    <div key={crit.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        <span style={{ color: '#0f172a' }}>{crit.name}</span>
                        <span style={{ color: pct >= 70 ? '#15803d' : pct >= 45 ? '#b45309' : '#dc2626' }}>
                          %{pct}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: pct >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' : pct >= 45 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                            borderRadius: '1rem',
                            transition: 'width 0.6s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student Leaderboard / Ranking */}
            <div className="scale-glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.15rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} style={{ color: '#d97706' }} /> Öğrenci Başarı Sıralaması
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }} className="custom-scrollbar">
                {studentStats.map((std, rank) => (
                  <div
                    key={std.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      background: rank === 0 ? '#fffbeb' : '#f8fafc',
                      border: `1.5px solid ${rank === 0 ? '#fde68a' : '#e2e8f0'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, width: '24px', color: rank === 0 ? '#b45309' : rank === 1 ? '#475569' : rank === 2 ? '#c2410c' : '#94a3b8' }}>
                        #{rank + 1}
                      </span>
                      <Av name={std.name} idx={rank} size={28} />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{std.name} {std.surname || ''}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{std.className || 'Öğrenci'}</div>
                      </div>
                    </div>

                    <div>
                      {std.avg !== null ? (
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: std.avg >= 70 ? '#15803d' : std.avg >= 45 ? '#b45309' : '#dc2626' }}>
                          %{std.avg}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ════ TAB 3: HISTORICAL DEVELOPMENT TREND ════ */
        <div className="scale-glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LineChart size={22} style={{ color: '#0284c7' }} /> Seanslar Arası Öğrenci Gelişim Analizi
          </h3>

          {(activeScale?.sessions?.length || 0) < 2 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Gelişim trendi hesaplayabilmek için en az 2 farklı seans oluşturup puanlamış olmanız gerekir.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1.5px solid #e2e8f0', background: '#ffffff' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0f172a' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Öğrenci</th>
                    {(activeScale.sessions || []).map((sess) => (
                      <th key={sess.id} style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        {sess.label}
                      </th>
                    ))}
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Son Gelişim Trendi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((std, si) => {
                    const trendVal = studentTrend[std.id];
                    const isEven = si % 2 === 0;
                    return (
                      <tr key={std.id} style={{ borderBottom: '1px solid #e2e8f0', background: isEven ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Av name={std.name} idx={si} size={28} />
                          <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>{std.name} {std.surname || ''}</span>
                        </td>
                        {(activeScale.sessions || []).map(sess => {
                          const vals = activeScale.criteria.map(c => {
                            const v = sess.scores?.[std.id]?.[c.id];
                            return v != null ? normalizeScore(c.type, v) : null;
                          }).filter(x => x !== null);
                          const sAvg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                          return (
                            <td key={sess.id} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                              {sAvg !== null ? `%{sAvg}` : '—'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {trendVal !== undefined ? (
                            <span style={{
                              padding: '0.2rem 0.65rem',
                              borderRadius: '1rem',
                              fontWeight: 900,
                              fontSize: '0.82rem',
                              background: trendVal > 0 ? '#f0fdf4' : trendVal < 0 ? '#fef2f2' : '#f1f5f9',
                              color: trendVal > 0 ? '#15803d' : trendVal < 0 ? '#dc2626' : '#64748b',
                              border: `1px solid ${trendVal > 0 ? '#bbf7d0' : trendVal < 0 ? '#fecaca' : '#cbd5e1'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {trendVal > 0 ? `↗ +%${trendVal}` : trendVal < 0 ? `↘ %${trendVal}` : `➔ 0%`}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: YENİ ÖLÇEK OLUŞTUR / DÜZENLE ── */}
      {showCreateScale && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '680px', maxHeight: '90vh', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                  {editingScaleId ? 'Ölçeği Düzenle' : 'Yeni Değerlendirme Ölçeği Oluştur'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Ölçeğin adını ve değerlendirilecek kriterleri tanımlayın.
                </p>
              </div>
              <button onClick={() => setShowCreateScale(false)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.35rem 1.6rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.15rem' }} className="custom-scrollbar">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Ölçek Adı *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Örn: 8. Sınıf Fen Bilimleri Katılım Ölçeği, Sınav Kaygısı Değerlendirme..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Açıklama (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Bu ölçeğin amacı ve kullanım alanı..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Kriter Ekleme Paneli */}
              <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>Kriterler ({formCriteria.length})</div>
                  <div style={{ display: 'flex', background: '#ffffff', borderRadius: '0.5rem', padding: '0.2rem', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => setCriteriaTab('single')}
                      style={{ padding: '0.25rem 0.65rem', borderRadius: '0.4rem', border: 'none', background: criteriaTab === 'single' ? '#6366f1' : 'none', color: criteriaTab === 'single' ? '#ffffff' : '#475569', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Tek Tek Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setCriteriaTab('bulk')}
                      style={{ padding: '0.25rem 0.65rem', borderRadius: '0.4rem', border: 'none', background: criteriaTab === 'bulk' ? '#6366f1' : 'none', color: criteriaTab === 'bulk' ? '#ffffff' : '#475569', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Toplu Metin
                    </button>
                  </div>
                </div>

                {criteriaTab === 'single' ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={singleCritName}
                        onChange={(e) => setSingleCritName(e.target.value)}
                        placeholder="Kriter adı yazın..."
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.84rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <select
                        value={singleCritType}
                        onChange={(e) => setSingleCritType(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '0.55rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.84rem', fontWeight: 800 }}
                      >
                        {CRITERION_TYPES.map(ct => (
                          <option key={ct.id} value={ct.id}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!singleCritName.trim()) return;
                        setFormCriteria(prev => [...prev, { id: `c_${Date.now()}_${Math.random()}`, name: singleCritName.trim(), type: singleCritType }]);
                        setSingleCritName('');
                      }}
                      style={{ padding: '0.55rem 0.95rem', borderRadius: '0.55rem', background: '#6366f1', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer' }}
                    >
                      Ekle
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>Tümüne Tür:</span>
                      <select
                        value={bulkCritType}
                        onChange={(e) => setBulkCritType(e.target.value)}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.78rem', fontWeight: 800 }}
                      >
                        {CRITERION_TYPES.map(ct => (
                          <option key={ct.id} value={ct.id}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={bulkCritText}
                      onChange={(e) => setBulkCritText(e.target.value)}
                      placeholder={'Derse hazırlıklı gelme\nAktif katılım\nÖdev teslimi\nDikkat süresi'}
                      rows={4}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const lines = bulkCritText.split('\n').map(l => l.trim()).filter(Boolean);
                        if (!lines.length) return;
                        setFormCriteria(prev => [...prev, ...lines.map(name => ({ id: `c_${Date.now()}_${Math.random()}`, name, type: bulkCritType }))]);
                        setBulkCritText('');
                      }}
                      style={{ marginTop: '0.35rem', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', background: '#0ea5e9', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Satırları Kriter Olarak Ekle
                    </button>
                  </div>
                )}

                {/* Criteria List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto' }} className="custom-scrollbar">
                  {formCriteria.map((crit, idx) => (
                    <div key={crit.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', borderRadius: '0.55rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', width: '20px' }}>#{idx + 1}</span>
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) => {
                          const updated = [...formCriteria];
                          updated[idx].name = e.target.value;
                          setFormCriteria(updated);
                        }}
                        style={{ flex: 1, background: 'none', border: 'none', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                      />
                      <select
                        value={crit.type}
                        onChange={(e) => {
                          const updated = [...formCriteria];
                          updated[idx].type = e.target.value;
                          setFormCriteria(updated);
                        }}
                        style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0284c7', fontSize: '0.74rem', borderRadius: '0.4rem', padding: '0.25rem 0.45rem', fontWeight: 800 }}
                      >
                        {CRITERION_TYPES.map(ct => (
                          <option key={ct.id} value={ct.id}>{ct.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setFormCriteria(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowCreateScale(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleSaveScale}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
              >
                Kaydet &amp; Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: YENİ SEANS OLUŞTUR ── */}
      {showCreateSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '440px', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Yeni Seans Başlat</h3>
              <button onClick={() => setShowCreateSession(false)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Seans Etiketi / Adı</label>
                <input
                  type="text"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  placeholder="Örn: 2. Hafta Değerlendirmesi, Kasım Ayı Gözlemi..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Seans Tarihi</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowCreateSession(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleCreateSession}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}
              >
                Seansı Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ÖĞRETMEN GÖZLEM NOTU ── */}
      {showNoteModal && selectedStudentForNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '500px', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Öğretmen Gözlem Notu</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#6366f1', fontSize: '0.84rem', fontWeight: 700 }}>
                  {selectedStudentForNote.name} {selectedStudentForNote.surname || ''}
                </p>
              </div>
              <button onClick={() => setShowNoteModal(false)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.35rem 1.6rem' }}>
              <textarea
                value={studentObservationNote}
                onChange={(e) => setStudentObservationNote(e.target.value)}
                placeholder="Öğrencinin ders içi tutumu, gelişimi, güçlü yönleri veya veliye/koça iletilecek özel gözlem..."
                rows={5}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveObservationNote}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ÖĞRENCİ BİREYSEL GELİŞİM KARNESİ / RAPORU (YAZDIRILABİLİR) ── */}
      {showReportCardModal && selectedStudentForReport && activeScale && activeSess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '640px', maxHeight: '92vh', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', color: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Printer size={22} style={{ color: '#0284c7' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Öğrenci Gelişim &amp; Değerlendirme Karnesi</h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>{activeScale.name} • {activeSess.label}</p>
                </div>
              </div>
              <button onClick={() => setShowReportCardModal(false)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Printable Report Card Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="custom-scrollbar">
              
              {/* Student Hero Info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Av name={selectedStudentForReport.name} size={42} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      {selectedStudentForReport.name} {selectedStudentForReport.surname || ''}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {selectedStudentForReport.className || selectedStudentForReport.grade || 'Öğrenci'} {selectedStudentForReport.email && `• ${selectedStudentForReport.email}`}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {(() => {
                    const sc = activeSess.scores?.[selectedStudentForReport.id] || {};
                    const norms = activeScale.criteria.map(c => sc[c.id] != null ? normalizeScore(c.type, sc[c.id]) : null).filter(x => x !== null);
                    const avg = norms.length ? Math.round(norms.reduce((a, b) => a + b, 0) / norms.length) : null;
                    return (
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: avg >= 70 ? '#16a34a' : avg >= 45 ? '#d97706' : '#dc2626' }}>
                          {avg !== null ? `%{avg}` : '—'}
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Genel Başarı</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Criteria Scores Grid */}
              <div>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                  Kriter Değerlendirme Sonuçları
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeScale.criteria.map(crit => {
                    const rawVal = activeSess.scores?.[selectedStudentForReport.id]?.[crit.id];
                    const norm = rawVal != null ? normalizeScore(crit.type, rawVal) : null;
                    const color = scoreColor(crit.type, rawVal);

                    return (
                      <div
                        key={crit.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.7rem 0.95rem',
                          borderRadius: '0.75rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{crit.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {CRITERION_TYPES.find(t => t.id === crit.type)?.label}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 900, color }}>
                            {scoreToDisplay(crit.type, rawVal)}
                          </span>
                          {norm !== null && (
                            <span style={{ fontSize: '0.78rem', fontWeight: 900, background: color + '22', color, padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: `1px solid ${color}44` }}>
                              %{norm}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher Observation Note */}
              {activeSess.notes?.[selectedStudentForReport.id] && (
                <div style={{ background: '#faf5ff', padding: '1rem', borderRadius: '0.85rem', border: '1px solid #e9d5ff' }}>
                  <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 900, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MessageSquare size={14} /> Öğretmen / Koç Notu:
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.4 }}>
                    {activeSess.notes[selectedStudentForReport.id]}
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowReportCardModal(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Kapat
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}
              >
                <Printer size={15} /> Yazdır / PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
