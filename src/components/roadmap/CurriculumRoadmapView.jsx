import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, Calendar, Sparkles, BookOpen, Compass, 
  ChevronRight, ChevronDown, ChevronUp, Layers, Target, 
  CheckCircle2, Plus, Edit2, Trash2, X, Save,
  Star, Flag, FolderPlus
} from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useTheme } from '../../context/ThemeContext';

export const STATUS_CONFIG = {
  'Başlanmadı':    { label: 'Başlanmadı', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: '#cbd5e1', icon: '○' },
  'Başlandı':      { label: 'Çalışılıyor', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#fde68a', icon: '⚡' },
  'Öğrenildi':     { label: 'Öğrenildi', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: '#bae6fd', icon: '✦' },
  'Tekrar Yapıldı':{ label: 'Tekrar Yapıldı', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: '#ddd6fe', icon: '🔄' },
  'Tamamlandı':    { label: 'Tamamlandı', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#a7f3d0', icon: '✓' },
};

const SUBJECT_COLORS = {
  'Matematik': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '📐' },
  'Türkçe': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '📖' },
  'Fen Bilimleri': { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '🔬' },
  'Sosyal Bilgiler': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🌍' },
  'İnkılap Tarihi': { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: '🇹🇷' },
  'İngilizce': { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🇬🇧' },
  'Din Kültürü': { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: '🕌' },
  'Fizik': { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: '⚡' },
  'Kimya': { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', icon: '🧪' },
  'Biyoloji': { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: '🧬' },
  'Geometri': { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '📏' }
};

const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Helper: Normalize subject into 3 levels (Ders -> Ünite -> Konu)
function normalizeTo3Levels(subjects) {
  return (subjects || []).map((sub, sIdx) => {
    const subId = String(sub.id || `sub_${sIdx}`);
    const color = sub.color || SUBJECT_COLORS[sub.name]?.color || '#6366f1';

    // If subject already has structured units:
    if (Array.isArray(sub.units) && sub.units.length > 0) {
      return {
        ...sub,
        id: subId,
        color,
        units: sub.units.map((u, uIdx) => ({
          ...u,
          id: String(u.id || `unit_${subId}_${uIdx}`),
          name: u.name || `${uIdx + 1}. Ünite`,
          topics: (u.topics || []).map((t, tIdx) => {
            if (typeof t === 'string') {
              return { id: `top_${subId}_${uIdx}_${tIdx}`, name: t, status: 'Başlanmadı' };
            }
            return {
              ...t,
              id: String(t.id || `top_${subId}_${uIdx}_${tIdx}`),
              name: t.name || `Konu ${tIdx + 1}`,
              status: t.status || 'Başlanmadı'
            };
          })
        }))
      };
    }

    // Fallback: If legacy subject only has flat topics, wrap into a default unit
    const flatTopics = (sub.topics || []).map((t, tIdx) => {
      if (typeof t === 'string') {
        return { id: `top_${subId}_0_${tIdx}`, name: t, status: 'Başlanmadı' };
      }
      return {
        ...t,
        id: String(t.id || `top_${subId}_0_${tIdx}`),
        name: t.name || `Konu ${tIdx + 1}`,
        status: t.status || 'Başlanmadı'
      };
    });

    return {
      ...sub,
      id: subId,
      color,
      units: [
        {
          id: `unit_${subId}_default`,
          name: '1. Ünite: Temel Konular',
          topics: flatTopics
        }
      ],
      topics: flatTopics
    };
  });
}

export default function CurriculumRoadmapView({
  topicPool = [],
  setTopicPool,
  onAssignTopic,
  isDark: propIsDark = null
}) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark !== null ? propIsDark : themeIsDark;
  const { data: curriculumData } = useCurriculum() || {};

  // Selected Grade / Curriculum Source ('pool' or gradeId)
  const [selectedSourceKey, setSelectedSourceKey] = useState('pool');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Accordion State: "hepsi kapalı gelsin önce" -> both default to empty {}!
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  // Inline Editing State
  const [editingItem, setEditingItem] = useState(null); // { level: 'subject'|'unit'|'topic', subId, unitId, topicId, name }
  
  // Adding New Items State
  const [newUnitNames, setNewUnitNames] = useState({}); // { [subId]: string }
  const [newTopicNames, setNewTopicNames] = useState({}); // { [unitId]: string }
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  const availableGrades = useMemo(() => {
    return curriculumData?.grades || [];
  }, [curriculumData]);

  // Transform raw data into structured 3-level tree
  const currentRoadmapSubjects = useMemo(() => {
    if (selectedSourceKey === 'pool') {
      return normalizeTo3Levels(topicPool);
    }

    // From Curriculum Grade
    if (!curriculumData) return [];
    const gradeSubs = (curriculumData.subjects || []).filter(s => String(s.gradeId) === String(selectedSourceKey));
    
    const tree = gradeSubs.map(s => {
      const units = (curriculumData.units || []).filter(u => String(u.subjectId) === String(s.id));
      const unitIds = new Set(units.map(u => u.id));
      const topics = (curriculumData.topics || []).filter(t => String(t.subjectId) === String(s.id) || unitIds.has(t.unitId));

      // Match status from topicPool if available
      const poolSub = (topicPool || []).find(ps => ps.name.toLowerCase() === s.name.toLowerCase());

      return {
        id: s.id,
        name: s.name,
        color: SUBJECT_COLORS[s.name]?.color || '#6366f1',
        units: units.length > 0 ? units.map(u => ({
          id: u.id,
          name: u.name,
          topics: topics.filter(t => t.unitId === u.id).map(t => {
            const poolTopic = poolSub?.topics?.find(pt => pt.name.toLowerCase() === t.name.toLowerCase());
            return {
              id: t.id,
              name: t.name,
              status: poolTopic?.status || 'Başlanmadı'
            };
          })
        })) : [
          {
            id: `unit_${s.id}_default`,
            name: '1. Ünite: Temel Konular',
            topics: topics.map(t => {
              const poolTopic = poolSub?.topics?.find(pt => pt.name.toLowerCase() === t.name.toLowerCase());
              return {
                id: t.id,
                name: t.name,
                status: poolTopic?.status || 'Başlanmadı'
              };
            })
          }
        ]
      };
    });

    return normalizeTo3Levels(tree);
  }, [selectedSourceKey, topicPool, curriculumData]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    if (selectedSubjectFilter === 'all') return currentRoadmapSubjects;
    return currentRoadmapSubjects.filter(s => s.name === selectedSubjectFilter);
  }, [currentRoadmapSubjects, selectedSubjectFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let totalUnits = 0;
    let nextTopic = null;

    currentRoadmapSubjects.forEach(s => {
      (s.units || []).forEach(u => {
        totalUnits += 1;
        (u.topics || []).forEach(t => {
          total += 1;
          if (t.status === 'Tamamlandı') done += 1;
          else if (t.status === 'Başlandı' || t.status === 'Öğrenildi') {
            inProgress += 1;
            if (!nextTopic) nextTopic = { ...t, subjectName: s.name, unitName: u.name };
          } else if (!nextTopic) {
            nextTopic = { ...t, subjectName: s.name, unitName: u.name };
          }
        });
      });
    });

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, totalUnits, pct, nextTopic };
  }, [currentRoadmapSubjects]);

  // Expand / Collapse Toggles
  const toggleSubject = (subId) => {
    setExpandedSubjects(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const handleExpandAll = () => {
    const allSubs = {};
    const allUnits = {};
    currentRoadmapSubjects.forEach(s => {
      allSubs[s.id] = true;
      (s.units || []).forEach(u => {
        allUnits[u.id] = true;
      });
    });
    setExpandedSubjects(allSubs);
    setExpandedUnits(allUnits);
  };

  const handleCollapseAll = () => {
    setExpandedSubjects({});
    setExpandedUnits({});
  };

  // ── MUTATION HELPERS (Save directly to topicPool & DB) ──
  const updateTree = (updater) => {
    if (!setTopicPool) return;
    const baseTree = currentRoadmapSubjects.map(s => ({
      ...s,
      units: (s.units || []).map(u => ({
        ...u,
        topics: (u.topics || []).map(t => ({ ...t }))
      }))
    }));
    
    const newTree = updater(baseTree);
    
    // Maintain flat topics for backward compatibility
    const finalizedTree = newTree.map(s => ({
      ...s,
      topics: (s.units || []).flatMap(u => u.topics || [])
    }));

    setTopicPool(finalizedTree);
    if (selectedSourceKey !== 'pool') {
      setSelectedSourceKey('pool');
    }
  };

  // 1. Durum Değiştirme
  const handleToggleTopicStatus = (subId, unitId, topicId, currentStatus) => {
    const nextStatus = currentStatus === 'Tamamlandı' 
      ? 'Başlanmadı' 
      : currentStatus === 'Başlandı' 
      ? 'Tamamlandı' 
      : 'Başlandı';

    updateTree(tree => {
      const sub = tree.find(s => String(s.id) === String(subId));
      if (!sub) return tree;
      const unit = (sub.units || []).find(u => String(u.id) === String(unitId));
      if (!unit) return tree;
      const topic = (unit.topics || []).find(t => String(t.id) === String(topicId));
      if (topic) topic.status = nextStatus;
      return tree;
    });
  };

  // 2. Düzenleme Kaydetme (Edit Save)
  const handleSaveEdit = () => {
    if (!editingItem || !editingItem.name.trim()) {
      setEditingItem(null);
      return;
    }

    const { level, subId, unitId, topicId, name } = editingItem;
    const cleanName = name.trim();

    updateTree(tree => {
      const sub = tree.find(s => String(s.id) === String(subId));
      if (!sub) return tree;

      if (level === 'subject') {
        sub.name = cleanName;
        return tree;
      }

      const unit = (sub.units || []).find(u => String(u.id) === String(unitId));
      if (!unit) return tree;

      if (level === 'unit') {
        unit.name = cleanName;
        return tree;
      }

      if (level === 'topic') {
        const topic = (unit.topics || []).find(t => String(t.id) === String(topicId));
        if (topic) topic.name = cleanName;
      }

      return tree;
    });

    setEditingItem(null);
  };

  // 3. Silme (Delete)
  const handleDeleteItem = (level, subId, unitId = null, topicId = null, title = '') => {
    const label = level === 'subject' ? `"${title}" dersini ve içindeki tüm üniteleri` 
      : level === 'unit' ? `"${title}" ünitesini ve içindeki tüm konuları`
      : `"${title}" konusunu`;

    if (!window.confirm(`${label} silmek istediğinize emin misiniz?`)) return;

    updateTree(tree => {
      if (level === 'subject') {
        return tree.filter(s => String(s.id) !== String(subId));
      }

      const sub = tree.find(s => String(s.id) === String(subId));
      if (!sub) return tree;

      if (level === 'unit') {
        sub.units = (sub.units || []).filter(u => String(u.id) !== String(unitId));
        return tree;
      }

      if (level === 'topic') {
        const unit = (sub.units || []).find(u => String(u.id) === String(unitId));
        if (unit) {
          unit.topics = (unit.topics || []).filter(t => String(t.id) !== String(topicId));
        }
      }

      return tree;
    });
  };

  // 4. Yeni Ders Ekleme
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const colors = ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];
    const color = colors[currentRoadmapSubjects.length % colors.length];

    updateTree(tree => {
      return [
        ...tree,
        {
          id: uid(),
          name: newSubjectName.trim(),
          color,
          units: [
            {
              id: uid(),
              name: '1. Ünite: Temel Konular',
              topics: []
            }
          ]
        }
      ];
    });

    setNewSubjectName('');
    setShowAddSubjectModal(false);
  };

  // 5. Yeni Ünite Ekleme
  const handleAddUnit = (subId) => {
    const uName = (newUnitNames[subId] || '').trim();
    if (!uName) return;

    updateTree(tree => {
      const sub = tree.find(s => String(s.id) === String(subId));
      if (!sub) return tree;
      if (!sub.units) sub.units = [];
      sub.units.push({
        id: uid(),
        name: uName,
        topics: []
      });
      return tree;
    });

    setNewUnitNames(prev => ({ ...prev, [subId]: '' }));
    // Automatically expand the subject so user sees the newly added unit
    setExpandedSubjects(prev => ({ ...prev, [subId]: true }));
  };

  // 6. Yeni Konu Ekleme
  const handleAddTopic = (subId, unitId) => {
    const tName = (newTopicNames[unitId] || '').trim();
    if (!tName) return;

    updateTree(tree => {
      const sub = tree.find(s => String(s.id) === String(subId));
      if (!sub) return tree;
      const unit = (sub.units || []).find(u => String(u.id) === String(unitId));
      if (!unit) return tree;
      if (!unit.topics) unit.topics = [];
      unit.topics.push({
        id: uid(),
        name: tName,
        status: 'Başlanmadı'
      });
      return tree;
    });

    setNewTopicNames(prev => ({ ...prev, [unitId]: '' }));
    setExpandedUnits(prev => ({ ...prev, [unitId]: true }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── 1. ÜST PANEL & SEÇİCİ KONTROLLER ── */}
      <div style={{
        background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))' : '#ffffff',
        border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.15rem 1.35rem',
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              color: '#ffffff'
            }}>
              🗺️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Ders ➔ Ünite ➔ Konu Yol Haritası
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {stats.totalUnits} Ünite, {stats.total} Konu • Adım adım patika takibi
              </span>
            </div>
          </div>

          {/* Aksiyon Butonları: Tümünü Aç/Kapat & Yeni Ders */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExpandAll}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                color: 'var(--color-text)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Tüm ders ve üniteleri aç"
            >
              <ChevronDown size={13} /> Tümünü Aç
            </button>

            <button
              type="button"
              onClick={handleCollapseAll}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                color: 'var(--color-text)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Tüm ders ve üniteleri kapat"
            >
              <ChevronUp size={13} /> Tümünü Kapat
            </button>

            <button
              type="button"
              onClick={() => setShowAddSubjectModal(true)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.55rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Plus size={14} /> + Ders Ekle
            </button>

            {/* Sınıf / Kaynak Seçici */}
            <select
              value={selectedSourceKey}
              onChange={e => {
                setSelectedSourceKey(e.target.value);
                setSelectedSubjectFilter('all');
                setExpandedSubjects({});
                setExpandedUnits({});
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.55rem',
                border: isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="pool" style={{ background: '#0f172a', color: '#ffffff' }}>⭐ Benim Yol Haritam</option>
              {availableGrades.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                  🏫 {g.name} Müfredatı
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 2. OYUNLAŞTIRILMIŞ KPI & MOTİVASYON BARI ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          background: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
          padding: '0.85rem 1rem',
          borderRadius: '0.95rem',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.95rem',
              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
            }}>
              %{stats.pct}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Genel İlerleme
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {stats.done} / {stats.total} Konu
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', fontSize: '1rem' }}>
              🚩
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#7c3aed' }}>
                {stats.totalUnits}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Toplam Ünite
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '1rem' }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#f59e0b' }}>
                {stats.inProgress}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Çalışılıyor
              </div>
            </div>
          </div>

          {stats.nextTopic && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.45rem 0.8rem',
              borderRadius: '0.65rem',
              background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
              border: '1px solid rgba(99, 102, 241, 0.25)'
            }}>
              <Star size={14} color="#6366f1" />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text)', fontWeight: 700 }}>
                <strong>Sıradaki Adım:</strong> {stats.nextTopic.subjectName} › {stats.nextTopic.unitName} › {stats.nextTopic.name}
              </span>
              {onAssignTopic && (
                <button
                  onClick={() => onAssignTopic({ subjectName: stats.nextTopic.subjectName, topicName: stats.nextTopic.name, taskType: 'konu' })}
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  📅 Programa Ekle
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 3. DERS FİLTRE ÇİPLERİ ── */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none'
        }}>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 99,
              border: selectedSubjectFilter === 'all' ? '1.5px solid #7c3aed' : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
              background: selectedSubjectFilter === 'all' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
              color: selectedSubjectFilter === 'all' ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Tüm Dersler ({currentRoadmapSubjects.length})
          </button>

          {currentRoadmapSubjects.map(sub => {
            const isSel = selectedSubjectFilter === sub.name;
            const subColor = sub.color || '#6366f1';
            const icon = SUBJECT_COLORS[sub.name]?.icon || '📚';
            const totalSubTopics = (sub.units || []).reduce((sum, u) => sum + (u.topics?.length || 0), 0);
            const doneSubTopics = (sub.units || []).reduce((sum, u) => sum + (u.topics?.filter(t => t.status === 'Tamamlandı').length || 0), 0);

            return (
              <button
                key={sub.id || sub.name}
                type="button"
                onClick={() => setSelectedSubjectFilter(sub.name)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 99,
                  border: isSel ? `1.5px solid ${subColor}` : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                  background: isSel ? subColor : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                  color: isSel ? '#ffffff' : 'var(--color-text)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>{icon}</span>
                <span>{sub.name}</span>
                <span style={{
                  fontSize: '0.65rem',
                  opacity: 0.85,
                  background: isSel ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'),
                  padding: '1px 5px',
                  borderRadius: 99
                }}>
                  {doneSubTopics}/{totalSubTopics}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. YENİ DERS EKLEME AÇILIR KUTUSU ── */}
      {showAddSubjectModal && (
        <div style={{
          background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))' : '#ffffff',
          border: '1.5px solid #10b981',
          borderRadius: '1rem',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
        }}>
          <BookOpen size={20} color="#10b981" />
          <input
            type="text"
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
            placeholder="Yeni ders adı girin (Örn: Geometri, Din Kültürü)..."
            autoFocus
            style={{
              flex: 1,
              padding: '0.5rem 0.8rem',
              borderRadius: '0.65rem',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #cbd5e1',
              background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 700,
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAddSubject}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => setShowAddSubjectModal(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── 5. HİYERARŞİK DERS ➔ ÜNİTE ➔ KONU AĞACI (DEFAULT: ALL CLOSED) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredSubjects.length === 0 ? (
          <div style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: '1.25rem',
            border: '1.5px dashed var(--color-border)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🗺️</div>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Bu filtrede ders bulunamadı</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Üstteki "+ Ders Ekle" veya şablon yükle butonunu kullanarak ders oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          filteredSubjects.map(sub => {
            const isSubExpanded = Boolean(expandedSubjects[sub.id]);
            const subColor = sub.color || '#6366f1';
            const icon = SUBJECT_COLORS[sub.name]?.icon || '📖';
            const units = sub.units || [];
            
            const totalSubTopics = units.reduce((s, u) => s + (u.topics?.length || 0), 0);
            const doneSubTopics = units.reduce((s, u) => s + (u.topics?.filter(t => t.status === 'Tamamlandı').length || 0), 0);
            const subPct = totalSubTopics > 0 ? Math.round((doneSubTopics / totalSubTopics) * 100) : 0;

            const isEditingSub = editingItem?.level === 'subject' && editingItem.subId === sub.id;

            return (
              <div
                key={sub.id}
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(24, 24, 48, 0.92))' : '#ffffff',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0',
                  borderRadius: '1.35rem',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 10px 32px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.04)'
                }}
              >
                {/* ── LEVEL 1: DERS BAŞLIĞI (SUBJECT HEADER) ── */}
                <div
                  onClick={() => toggleSubject(sub.id)}
                  style={{
                    padding: '0.95rem 1.25rem',
                    background: isDark ? `${subColor}22` : `${subColor}10`,
                    borderBottom: isSubExpanded ? `1.5px solid ${subColor}35` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: subColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      boxShadow: `0 3px 10px ${subColor}40`,
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    <div style={{ flex: 1 }}>
                      {isEditingSub ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingItem.name}
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                            autoFocus
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '0.5rem',
                              border: `1.5px solid ${subColor}`,
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              background: isDark ? '#0f172a' : '#ffffff',
                              color: 'var(--color-text)',
                              outline: 'none'
                            }}
                          />
                          <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '4px 8px', cursor: 'pointer' }}><Check size={14}/></button>
                          <button onClick={() => setEditingItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '4px 8px', cursor: 'pointer' }}><X size={14}/></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: 'var(--color-text)' }}>
                            {sub.name}
                          </h3>
                          <button
                            type="button"
                            title="Ders Adını Düzenle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({ level: 'subject', subId: sub.id, name: sub.name });
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            title="Dersi Sil"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem('subject', sub.id, null, null, sub.name);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                        {units.length} Ünite • {doneSubTopics} / {totalSubTopics} Konu Tamamlandı
                      </div>
                    </div>
                  </div>

                  {/* Sağ Taraf: İlerleme Barı ve Aç/Kapa Oku */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 85, height: 7, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${subPct}%`, background: subColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, color: subColor }}>
                        %{subPct}
                      </span>
                    </div>

                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#c7d2fe' : '#64748b'
                    }}>
                      {isSubExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── LEVEL 2: DERS AÇILDIĞINDA ÜNİTELER (UNITS CONTAINER) ── */}
                {isSubExpanded && (
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Üniteler Listesi */}
                    {units.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                        Bu derse henüz ünite eklenmemiş.
                      </div>
                    ) : (
                      units.map((unit, uIdx) => {
                        const isUnitExpanded = Boolean(expandedUnits[unit.id]);
                        const topics = unit.topics || [];
                        const doneUnitTopics = topics.filter(t => t.status === 'Tamamlandı').length;
                        const unitPct = topics.length > 0 ? Math.round((doneUnitTopics / topics.length) * 100) : 0;
                        const isEditingUnit = editingItem?.level === 'unit' && editingItem.unitId === unit.id;

                        return (
                          <div
                            key={unit.id}
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e2e8f0',
                              borderRadius: '1.1rem',
                              overflow: 'hidden'
                            }}
                          >
                            {/* ── ÜNİTE BAŞLIĞI (UNIT HEADER) ── */}
                            <div
                              onClick={() => toggleUnit(unit.id)}
                              style={{
                                padding: '0.75rem 1rem',
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                borderBottom: isUnitExpanded ? (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0') : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
                                <Flag size={15} color={subColor} />
                                
                                <div style={{ flex: 1 }}>
                                  {isEditingUnit ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={editingItem.name}
                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                        autoFocus
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          borderRadius: '0.4rem',
                                          border: `1.5px solid ${subColor}`,
                                          fontSize: '0.85rem',
                                          fontWeight: 700,
                                          background: isDark ? '#0f172a' : '#ffffff',
                                          color: 'var(--color-text)',
                                          outline: 'none'
                                        }}
                                      />
                                      <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><Check size={13}/></button>
                                      <button onClick={() => setEditingItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><X size={13}/></button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)' }}>
                                        {unit.name}
                                      </span>
                                      <button
                                        type="button"
                                        title="Üniteyi Düzenle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingItem({ level: 'unit', subId: sub.id, unitId: unit.id, name: unit.name });
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Üniteyi Sil"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteItem('unit', sub.id, unit.id, null, unit.name);
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}

                                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                    {doneUnitTopics}/{topics.length} Konu Tamamlandı (%{unitPct})
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 99,
                                  background: unitPct === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                                  color: unitPct === 100 ? '#10b981' : '#6366f1'
                                }}>
                                  %{unitPct}
                                </span>

                                <div style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-text-muted)'
                                }}>
                                  {isUnitExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </div>
                              </div>
                            </div>

                            {/* ── LEVEL 3: ÜNİTE AÇILDIĞINDA İNTERAKTİF KONU PATİKASI (TOPICS ROADMAP TRAIL) ── */}
                            {isUnitExpanded && (
                              <div style={{ padding: '1rem 1.25rem', position: 'relative' }}>
                                {/* Patika Çizgisi */}
                                {topics.length > 1 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 28,
                                    bottom: 40,
                                    left: 32,
                                    width: 3,
                                    background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                    borderRadius: 99,
                                    zIndex: 0
                                  }} />
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', zIndex: 1 }}>
                                  {topics.map((topic, tIdx) => {
                                    const isCompleted = topic.status === 'Tamamlandı';
                                    const isInProgress = topic.status === 'Başlandı' || topic.status === 'Öğrenildi';
                                    const cfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG['Başlanmadı'];
                                    const isEditingTopic = editingItem?.level === 'topic' && editingItem.topicId === topic.id;

                                    return (
                                      <div
                                        key={topic.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '0.85rem'
                                        }}
                                      >
                                        {/* Kilometre Taşı Rozeti (Milestone Circle) */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTopicStatus(sub.id, unit.id, topic.id, topic.status)}
                                          title="Durumu tamamla / geri al"
                                          style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            border: isCompleted
                                              ? 'none'
                                              : isInProgress
                                              ? `2px solid ${cfg.color}`
                                              : (isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #cbd5e1'),
                                            background: isCompleted
                                              ? 'linear-gradient(135deg, #10b981, #059669)'
                                              : isInProgress
                                              ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                                              : (isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff'),
                                            color: isCompleted ? '#ffffff' : cfg.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: isCompleted ? '0.9rem' : '0.74rem',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            boxShadow: isCompleted ? '0 3px 10px rgba(16, 185, 129, 0.35)' : 'none',
                                            transition: 'all 0.15s ease',
                                            marginTop: 3
                                          }}
                                        >
                                          {isCompleted ? <Check size={16} strokeWidth={3} /> : tIdx + 1}
                                        </button>

                                        {/* Konu Kartı */}
                                        <div style={{
                                          flex: 1,
                                          padding: '0.65rem 0.95rem',
                                          borderRadius: '0.85rem',
                                          background: isCompleted
                                            ? (isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.04)')
                                            : isInProgress
                                            ? (isDark ? 'rgba(99, 102, 241, 0.1)' : '#ffffff')
                                            : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                                          border: isCompleted
                                            ? '1.5px solid rgba(16, 185, 129, 0.3)'
                                            : isInProgress
                                            ? `1.5px solid ${subColor}50`
                                            : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'),
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: 8
                                        }}>
                                          <div style={{ flex: 1, minWidth: 160 }}>
                                            {isEditingTopic ? (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                  type="text"
                                                  value={editingItem.name}
                                                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                                  autoFocus
                                                  style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '0.4rem',
                                                    border: `1.5px solid ${subColor}`,
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    background: isDark ? '#0f172a' : '#ffffff',
                                                    color: 'var(--color-text)',
                                                    outline: 'none',
                                                    flex: 1
                                                  }}
                                                />
                                                <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><Check size={12}/></button>
                                                <button onClick={() => setEditingItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><X size={12}/></button>
                                              </div>
                                            ) : (
                                              <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: isCompleted ? '#10b981' : subColor, textTransform: 'uppercase' }}>
                                                    Adım {tIdx + 1}
                                                  </span>
                                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                                    {cfg.icon} {cfg.label}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    title="Konu Adını Düzenle"
                                                    onClick={() => setEditingItem({ level: 'topic', subId: sub.id, unitId: unit.id, topicId: topic.id, name: topic.name })}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                                  >
                                                    <Edit2 size={11} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    title="Konuyu Sil"
                                                    onClick={() => handleDeleteItem('topic', sub.id, unit.id, topic.id, topic.name)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                                  >
                                                    <Trash2 size={11} />
                                                  </button>
                                                </div>

                                                <h4 style={{
                                                  margin: 0,
                                                  fontSize: '0.88rem',
                                                  fontWeight: 800,
                                                  color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text)',
                                                  textDecoration: isCompleted ? 'line-through' : 'none'
                                                }}>
                                                  {topic.name}
                                                </h4>
                                              </div>
                                            )}
                                          </div>

                                          {/* Aksiyon Çipleri */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                            {onAssignTopic && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => onAssignTopic({ subjectName: sub.name, topicName: topic.name, taskType: 'konu' })}
                                                  style={{
                                                    padding: '3px 7px',
                                                    borderRadius: '0.4rem',
                                                    border: '1px solid rgba(99,102,241,0.3)',
                                                    background: 'rgba(99,102,241,0.15)',
                                                    color: '#6366f1',
                                                    fontSize: '0.67rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  📖 Çalış
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => onAssignTopic({ subjectName: sub.name, topicName: topic.name, taskType: 'soru' })}
                                                  style={{
                                                    padding: '3px 7px',
                                                    borderRadius: '0.4rem',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    background: 'rgba(16,185,129,0.15)',
                                                    color: '#10b981',
                                                    fontSize: '0.67rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  ✏️ Soru
                                                </button>
                                              </>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => handleToggleTopicStatus(sub.id, unit.id, topic.id, topic.status)}
                                              style={{
                                                padding: '3px 8px',
                                                borderRadius: '0.4rem',
                                                border: isCompleted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)',
                                                background: isCompleted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.15)',
                                                color: isCompleted ? '#ef4444' : '#10b981',
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                              }}
                                            >
                                              {isCompleted ? 'Geri Al' : '✓ Tamamla'}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Ünite İçine Yeni Konu Ekleme Kutusu */}
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4, paddingLeft: 40 }}>
                                    <input
                                      type="text"
                                      value={newTopicNames[unit.id] || ''}
                                      onChange={e => setNewTopicNames({ ...newTopicNames, [unit.id]: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && handleAddTopic(sub.id, unit.id)}
                                      placeholder="Bu üniteye yeni konu ekle..."
                                      style={{
                                        flex: 1,
                                        padding: '0.35rem 0.65rem',
                                        borderRadius: '0.5rem',
                                        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                        color: 'var(--color-text)',
                                        fontSize: '0.78rem',
                                        outline: 'none'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddTopic(sub.id, unit.id)}
                                      style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        background: subColor,
                                        color: '#ffffff',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + Konu Ekle
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Ders İçine Yeni Ünite Ekleme Kutusu */}
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.85rem',
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#f1f5f9',
                      border: isDark ? '1px dashed rgba(255,255,255,0.15)' : '1.5px dashed #cbd5e1',
                      alignItems: 'center'
                    }}>
                      <FolderPlus size={16} color={subColor} />
                      <input
                        type="text"
                        value={newUnitNames[sub.id] || ''}
                        onChange={e => setNewUnitNames({ ...newUnitNames, [sub.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAddUnit(sub.id)}
                        placeholder={`"${sub.name}" için yeni ünite adı girin (Örn: 2. Ünite: Kesirler)...`}
                        style={{
                          flex: 1,
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: 'var(--color-text)',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddUnit(sub.id)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          background: subColor,
                          color: '#ffffff',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        + Ünite Ekle
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
