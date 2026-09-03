import React, { useState, useMemo } from 'react';
import { 
  Check, Calendar, Sparkles, BookOpen, Compass, 
  ChevronRight, ChevronDown, ChevronUp, Layers, Target, 
  CheckCircle2, Plus, Edit2, Trash2, X, Save,
  Star, Flag, FolderPlus, Settings
} from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useTheme } from '../../context/ThemeContext';
import { sortSubjectsByMebOrder, sortUnitsNaturally } from '../../utils/testResolver';

export const STATUS_CONFIG = {
  'Başlanmadı':    { label: 'Başlanmadı', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: '#cbd5e1', icon: '○' },
  'Başlandı':      { label: 'Çalışılıyor', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#fde68a', icon: '⚡' },
  'Öğrenildi':     { label: 'Öğrenildi', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: '#bae6fd', icon: '✦' },
  'Tekrar Yapıldı':{ label: 'Tekrar Yapıldı', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: '#ddd6fe', icon: '🔄' },
  'Tamamlandı':    { label: 'Tamamlandı', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#a7f3d0', icon: '✓' },
};

// MEB & ÖSYM Resmi Sınav Ders Sıralaması ve Renkleri:
const SUBJECT_COLORS = {
  'Türkçe': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '📖' },
  'Matematik': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '📐' },
  'Fen Bilimleri': { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: '🔬' },
  'Sosyal Bilgiler': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🌍' },
  'İnkılap Tarihi': { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: '🇹🇷' },
  'İngilizce': { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🇬🇧' },
  'Din Kültürü': { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: '🕌' },
  'Fizik': { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: '⚡' },
  'Kimya': { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', icon: '🧪' },
  'Biyoloji': { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: '🧬' },
  'Geometri': { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '📏' },
  'Tarih': { color: '#b45309', bg: '#fef3c7', border: '#fde68a', icon: '📜' },
  'Coğrafya': { color: '#047857', bg: '#d1fae5', border: '#a7f3d0', icon: '🗺️' },
  'Felsefe': { color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', icon: '💭' }
};

const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Helper: Normalize subject into 3 levels (Ders -> Ünite -> Konu) sorted in MEB / ÖSYM order
function normalizeTo3Levels(subjects) {
  const normalized = (subjects || []).map((sub, sIdx) => {
    const subId = String(sub.id || `sub_${sIdx}`);
    const color = sub.color || SUBJECT_COLORS[sub.name]?.color || '#6366f1';

    // If subject already has structured units:
    if (Array.isArray(sub.units) && sub.units.length > 0) {
      const sortedUnits = [...sub.units].sort(sortUnitsNaturally).map((u, uIdx) => ({
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
      }));

      return {
        ...sub,
        id: subId,
        color,
        units: sortedUnits,
        topics: sortedUnits.flatMap(u => u.topics || [])
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

  // Sort subjects in MEB & ÖSYM official exam order: Türkçe -> Matematik -> Fen -> Sosyal -> İngilizce -> Din...
  return normalized.sort(sortSubjectsByMebOrder);
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
  const [successNotice, setSuccessNotice] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

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
  const handleSaveCurriculumAsMyRoadmap = () => {
    const selectedGradeObj = availableGrades.find(g => String(g.id) === String(selectedSourceKey));
    const gradeName = selectedGradeObj?.name || 'Seçili Sınıf';

    if (!window.confirm(`"${gradeName}" müfredatını tüm dersleri, üniteleri ve konularıyla kişisel yol haritanız olarak kaydetmek istediğinize emin misiniz?`)) {
      return;
    }

    const clone = currentRoadmapSubjects.map(sub => ({
      id: uid(),
      name: sub.name,
      color: sub.color || '#6366f1',
      units: (sub.units || []).map((u, uIdx) => ({
        id: uid(),
        name: u.name || `${uIdx + 1}. Ünite`,
        topics: (u.topics || []).map(t => ({
          id: uid(),
          name: t.name,
          status: t.status || 'Başlanmadı'
        }))
      })),
      topics: (sub.units || []).flatMap(u => (u.topics || []).map(t => ({
        id: uid(),
        name: t.name,
        status: t.status || 'Başlanmadı'
      })))
    }));

    if (setTopicPool) {
      setTopicPool(clone);
    }
    setSelectedSourceKey('pool');
    setSuccessNotice(`🎉 "${gradeName}" müfredatı tüm ders, ünite ve konularıyla kişisel yol haritanıza başarıyla kaydedildi!`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

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
      setSuccessNotice('⭐ Yaptığınız düzenleme kişisel yol haritanıza kaydedildi!');
      setTimeout(() => setSuccessNotice(''), 4000);
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
    <div className="roadmap-root" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* ── RESPONSIVE MOBILE APP STYLES ── */}
      <style>{`
        .roadmap-root {
          width: 100%;
          box-sizing: border-box;
        }
        .roadmap-header-card {
          background: ${isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))' : '#ffffff'};
          border: ${isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'};
          border-radius: 1.25rem;
          padding: 1.15rem 1.25rem;
          box-shadow: ${isDark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)'};
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .roadmap-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .roadmap-controls-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .roadmap-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .roadmap-select-box {
          padding: 0.45rem 0.85rem;
          border-radius: 0.65rem;
          border: ${isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1'};
          background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'};
          color: ${isDark ? '#ffffff' : '#0f172a'};
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          outline: none;
          font-family: inherit;
        }
        .roadmap-kpi-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: ${isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc'};
          padding: 0.85rem;
          border-radius: 1rem;
          border: ${isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'};
        }
        .roadmap-kpi-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px;
        }
        .roadmap-filter-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
        }
        .roadmap-filter-scroll::-webkit-scrollbar {
          display: none;
        }
        .roadmap-filter-btn {
          scroll-snap-align: start;
          flex-shrink: 0;
        }
        .roadmap-topic-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .roadmap-topic-card-inner {
          flex: 1;
          padding: 0.75rem 0.95rem;
          border-radius: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .roadmap-topic-actions-bar {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        /* 📱 MOBİL EKRANLAR (App Arayüzü Modu) */
        @media (max-width: 640px) {
          .roadmap-header-card {
            padding: 0.85rem !important;
            border-radius: 1rem !important;
            gap: 0.75rem !important;
          }
          .roadmap-top-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .roadmap-controls-group {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .roadmap-source-wrapper {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
          .roadmap-select-box {
            width: 100% !important;
            height: 42px !important;
            font-size: 0.82rem !important;
          }
          .roadmap-save-curriculum-btn {
            width: 100% !important;
            height: 40px !important;
            justify-content: center !important;
            font-size: 0.8rem !important;
          }
          .roadmap-pills-row {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .roadmap-pills-row button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 0.45rem 0.2rem !important;
            height: 38px !important;
            font-size: 0.73rem !important;
            white-space: nowrap !important;
          }
          .roadmap-kpi-container {
            grid-template-columns: repeat(3, 1fr) !important;
            padding: 0.65rem 0.5rem !important;
            gap: 4px !important;
          }
          .roadmap-kpi-card {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 4px !important;
            padding: 2px !important;
          }
          .roadmap-kpi-badge {
            width: 36px !important;
            height: 36px !important;
            font-size: 0.85rem !important;
          }
          .roadmap-next-step-box {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .roadmap-next-step-box button {
            width: 100% !important;
            height: 36px !important;
            justify-content: center !important;
            font-size: 0.75rem !important;
          }
          .roadmap-topic-row {
            gap: 0.5rem !important;
          }
          .roadmap-topic-card-inner {
            padding: 0.65rem 0.75rem !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .roadmap-topic-actions-bar {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: stretch !important;
            gap: 6px !important;
            border-top: ${isDark ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed #e2e8f0'};
            padding-top: 6px !important;
          }
          .roadmap-topic-actions-bar button {
            flex: 1 !important;
            justify-content: center !important;
            height: 34px !important;
            font-size: 0.72rem !important;
          }
          .roadmap-trail-line {
            left: 21px !important;
          }
        }
      `}</style>
      
      {/* ── 1. ÜST PANEL & SEÇİCİ KONTROLLER ── */}
      <div className="roadmap-header-card">
        <div className="roadmap-top-row">
          
          {/* Başlık ve İkon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              color: '#ffffff',
              flexShrink: 0
            }}>
              🗺️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
                Ders ➔ Ünite ➔ Konu Yol Haritası
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {stats.totalUnits} Ünite, {stats.total} Konu • Adım adım patika takibi
              </span>
            </div>
          </div>

          {/* Kontrol Butonları & Sınıf Seçici Grubu */}
          <div className="roadmap-controls-group">
            
            {/* Kaynak Seçici Kutusu */}
            <div className="roadmap-source-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={selectedSourceKey}
                onChange={e => {
                  setSelectedSourceKey(e.target.value);
                  setSelectedSubjectFilter('all');
                  setExpandedSubjects({});
                  setExpandedUnits({});
                }}
                className="roadmap-select-box"
              >
                <option value="pool" style={{ background: '#0f172a', color: '#ffffff' }}>⭐ Benim Yol Haritam</option>
                {availableGrades.map(g => (
                  <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                    🏫 {g.name} Müfredatı
                  </option>
                ))}
              </select>

              {/* Eğer Kayıtlı Sınıf Seçiliyse: "Bu Müfredatı Yol Haritam Olarak Kaydet" */}
              {selectedSourceKey !== 'pool' && (
                <button
                  type="button"
                  onClick={handleSaveCurriculumAsMyRoadmap}
                  className="roadmap-save-curriculum-btn"
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Sparkles size={14} /> ⭐ Yol Haritam Olarak Kaydet
                </button>
              )}
            </div>

            {/* Hızlı Butonlar: Aç / Kapat / Düzenle */}
            <div className="roadmap-pills-row">
              <button
                type="button"
                onClick={handleExpandAll}
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: '0.6rem',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                  color: 'var(--color-text)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
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
                  padding: '0.4rem 0.65rem',
                  borderRadius: '0.6rem',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                  color: 'var(--color-text)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Tüm ders ve üniteleri kapat"
              >
                <ChevronUp size={13} /> Kapat
              </button>

              {/* ⚙️ Düzenleme Modu Aç/Kapat Butonu */}
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(p => !p);
                  if (isEditMode) {
                    setEditingItem(null);
                    setShowAddSubjectModal(false);
                  }
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: isEditMode ? '1.5px solid #10b981' : (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1'),
                  background: isEditMode ? 'linear-gradient(135deg, #10b981, #059669)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'),
                  color: isEditMode ? '#ffffff' : 'var(--color-text)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: isEditMode ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title={isEditMode ? 'Düzenleme modunu kapat' : 'Müfredatı düzenle / sil'}
              >
                {isEditMode ? (
                  <>
                    <Check size={14} strokeWidth={3} /> Bitti
                  </>
                ) : (
                  <>
                    <Settings size={13} /> Düzenle
                  </>
                )}
              </button>

              {/* Yalnızca Düzenleme Modu Açıkken: "+ Ders" Butonu */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(true)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Plus size={14} /> + Ders
                </button>
              )}
            </div>

          </div>
        </div>

        {/* DÜZENLEME MODU AKTİF BİLGİLENDİRME BANNERI */}
        {isEditMode && (
          <div style={{
            background: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
            border: '1.5px solid #6366f1',
            borderRadius: '0.85rem',
            padding: '0.65rem 0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: isDark ? '#c7d2fe' : '#4338ca',
            fontSize: '0.78rem',
            fontWeight: 800,
            gap: 8,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={16} color="#6366f1" style={{ flexShrink: 0 }} />
              <span>⚙️ Düzenleme Modu Açık — İstediğiniz ders veya üniteyi yeniden adlandırabilir veya silebilirsiniz.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                setEditingItem(null);
                setShowAddSubjectModal(false);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '0.45rem',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              ✓ Bitti
            </button>
          </div>
        )}

        {/* BAŞARI BİLDİRİM BANNERI */}
        {successNotice && (
          <div style={{
            background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: '0.85rem',
            padding: '0.65rem 0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: isDark ? '#6ee7b7' : '#065f46',
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice('')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── 2. OYUNLAŞTIRILMIŞ KPI & MOTİVASYON BARI ── */}
        <div className="roadmap-kpi-container">
          
          {/* KPI 1: Genel İlerleme */}
          <div className="roadmap-kpi-card">
            <div className="roadmap-kpi-badge" style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.92rem',
              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
              flexShrink: 0
            }}>
              %{stats.pct}
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>
                İlerleme
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                {stats.done}/{stats.total} Konu
              </div>
            </div>
          </div>

          {/* KPI 2: Toplam Ünite */}
          <div className="roadmap-kpi-card">
            <div className="roadmap-kpi-badge" style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'rgba(124, 58, 237, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
              fontSize: '1rem',
              flexShrink: 0
            }}>
              🚩
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1.1 }}>
                {stats.totalUnits}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                Ünite
              </div>
            </div>
          </div>

          {/* KPI 3: Çalışılıyor */}
          <div className="roadmap-kpi-card">
            <div className="roadmap-kpi-badge" style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              fontSize: '1rem',
              flexShrink: 0
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1.1 }}>
                {stats.inProgress}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                Aktif
              </div>
            </div>
          </div>

          {/* Sıradaki Adım (Next Step) */}
          {stats.nextTopic && (
            <div className="roadmap-next-step-box" style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.8rem',
              borderRadius: '0.75rem',
              background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              marginTop: 2
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <Star size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.74rem',
                  color: 'var(--color-text)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  <strong>Sıradaki:</strong> {stats.nextTopic.subjectName} › {stats.nextTopic.unitName} › {stats.nextTopic.name}
                </span>
              </div>
              {onAssignTopic && (
                <button
                  type="button"
                  onClick={() => onAssignTopic({ subjectName: stats.nextTopic.subjectName, topicName: stats.nextTopic.name, taskType: 'konu' })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  📅 Programa Ekle
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 3. MEB SIRASINDA YATAY DERS FİLTRE ÇİPLERİ ── */}
        <div className="roadmap-filter-scroll">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className="roadmap-filter-btn"
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
                className="roadmap-filter-btn"
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
          padding: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
        }}>
          <BookOpen size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
            placeholder="Yeni ders adı (Örn: Geometri)..."
            autoFocus
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              borderRadius: '0.6rem',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #cbd5e1',
              background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
              color: 'var(--color-text)',
              fontSize: '0.82rem',
              fontWeight: 700,
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAddSubject}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredSubjects.length === 0 ? (
          <div style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: '1.25rem',
            border: '1.5px dashed var(--color-border)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🗺️</div>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)', fontSize: '1rem' }}>Bu filtrede ders bulunamadı</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Üstteki "+ Ders" butonunu veya kayıtlı bir sınıf müfredatını seçebilirsiniz.
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
                  borderRadius: '1.15rem',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.03)'
                }}
              >
                {/* ── LEVEL 1: DERS BAŞLIĞI (SUBJECT HEADER) ── */}
                <div
                  onClick={() => toggleSubject(sub.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    background: isDark ? `${subColor}20` : `${subColor}0c`,
                    borderBottom: isSubExpanded ? `1.5px solid ${subColor}30` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: subColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      boxShadow: `0 3px 10px ${subColor}40`,
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditingSub ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingItem.name}
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                            autoFocus
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.5rem',
                              border: `1.5px solid ${subColor}`,
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              background: isDark ? '#0f172a' : '#ffffff',
                              color: 'var(--color-text)',
                              outline: 'none',
                              width: '100%',
                              maxWidth: 160
                            }}
                          />
                          <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '4px 7px', cursor: 'pointer' }}><Check size={13}/></button>
                          <button onClick={() => setEditingItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '4px 7px', cursor: 'pointer' }}><X size={13}/></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '0.98rem',
                            fontWeight: 900,
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {sub.name}
                          </h3>
                          {isEditMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                type="button"
                                title="Ders Adını Düzenle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({ level: 'subject', subId: sub.id, name: sub.name });
                                }}
                                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', border: 'none', borderRadius: '0.35rem', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '3px 5px', display: 'flex' }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                title="Dersi Sil"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem('subject', sub.id, null, null, sub.name);
                                }}
                                style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: '0.35rem', color: '#ef4444', cursor: 'pointer', padding: '3px 5px', display: 'flex' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
                        {units.length} Ünite • {doneSubTopics}/{totalSubTopics} Konu
                      </div>
                    </div>
                  </div>

                  {/* Sağ Taraf: İlerleme Barı ve Aç/Kapa Oku */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: subPct === 100 ? 'rgba(16, 185, 129, 0.15)' : `${subColor}18`,
                      color: subPct === 100 ? '#10b981' : subColor,
                      fontSize: '0.74rem',
                      fontWeight: 900
                    }}>
                      %{subPct}
                    </div>

                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#c7d2fe' : '#64748b'
                    }}>
                      {isSubExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </div>

                {/* ── LEVEL 2: DERS AÇILDIĞINDA ÜNİTELER (UNITS CONTAINER) ── */}
                {isSubExpanded && (
                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    
                    {/* Üniteler Listesi */}
                    {units.length === 0 ? (
                      <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
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
                              borderRadius: '0.95rem',
                              overflow: 'hidden'
                            }}
                          >
                            {/* ── ÜNİTE BAŞLIĞI (UNIT HEADER) ── */}
                            <div
                              onClick={() => toggleUnit(unit.id)}
                              style={{
                                padding: '0.65rem 0.85rem',
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                borderBottom: isUnitExpanded ? (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0') : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                <Flag size={14} color={subColor} style={{ flexShrink: 0 }} />
                                
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {isEditingUnit ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
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
                                          width: '100%',
                                          maxWidth: 150
                                        }}
                                      />
                                      <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><Check size={12}/></button>
                                      <button onClick={() => setEditingItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '3px 6px', cursor: 'pointer' }}><X size={12}/></button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        color: 'var(--color-text)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {unit.name}
                                      </span>
                                      {isEditMode && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <button
                                            type="button"
                                            title="Üniteyi Düzenle"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingItem({ level: 'unit', subId: sub.id, unitId: unit.id, name: unit.name });
                                            }}
                                            style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', border: 'none', borderRadius: '0.35rem', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '3px 4px', display: 'flex' }}
                                          >
                                            <Edit2 size={11} />
                                          </button>
                                          <button
                                            type="button"
                                            title="Üniteyi Sil"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteItem('unit', sub.id, unit.id, null, unit.name);
                                            }}
                                            style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: '0.35rem', color: '#ef4444', cursor: 'pointer', padding: '3px 4px', display: 'flex' }}
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                    {doneUnitTopics}/{topics.length} Konu (%{unitPct})
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 99,
                                  background: unitPct === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                                  color: unitPct === 100 ? '#10b981' : '#6366f1'
                                }}>
                                  %{unitPct}
                                </span>

                                <div style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-text-muted)'
                                }}>
                                  {isUnitExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                              </div>
                            </div>

                            {/* ── LEVEL 3: ÜNİTE AÇILDIĞINDA İNTERAKTİF KONU PATİKASI ── */}
                            {isUnitExpanded && (
                              <div style={{ padding: '0.75rem 0.85rem', position: 'relative' }}>
                                {/* Patika Çizgisi */}
                                {topics.length > 1 && (
                                  <div className="roadmap-trail-line" style={{
                                    position: 'absolute',
                                    top: 24,
                                    bottom: 35,
                                    left: 27,
                                    width: 3,
                                    background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                    borderRadius: 99,
                                    zIndex: 0
                                  }} />
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                                  {topics.map((topic, tIdx) => {
                                    const isCompleted = topic.status === 'Tamamlandı';
                                    const isInProgress = topic.status === 'Başlandı' || topic.status === 'Öğrenildi';
                                    const cfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG['Başlanmadı'];
                                    const isEditingTopic = editingItem?.level === 'topic' && editingItem.topicId === topic.id;

                                    return (
                                      <div key={topic.id} className="roadmap-topic-row">
                                        {/* Kilometre Taşı Rozeti (Milestone Circle) */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTopicStatus(sub.id, unit.id, topic.id, topic.status)}
                                          title="Durumu tamamla / geri al"
                                          style={{
                                            width: 30,
                                            height: 30,
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
                                            fontSize: isCompleted ? '0.85rem' : '0.72rem',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            boxShadow: isCompleted ? '0 3px 10px rgba(16, 185, 129, 0.35)' : 'none',
                                            transition: 'all 0.15s ease',
                                            marginTop: 2
                                          }}
                                        >
                                          {isCompleted ? <Check size={15} strokeWidth={3} /> : tIdx + 1}
                                        </button>

                                        {/* Konu Kartı */}
                                        <div className="roadmap-topic-card-inner" style={{
                                          background: isCompleted
                                            ? (isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.04)')
                                            : isInProgress
                                            ? (isDark ? 'rgba(99, 102, 241, 0.1)' : '#ffffff')
                                            : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                                          border: isCompleted
                                            ? '1.5px solid rgba(16, 185, 129, 0.3)'
                                            : isInProgress
                                            ? `1.5px solid ${subColor}50`
                                            : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0')
                                        }}>
                                          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                                            {isEditingTopic ? (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                                    fontSize: '0.8rem',
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                                                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: isCompleted ? '#10b981' : subColor, textTransform: 'uppercase' }}>
                                                    Adım {tIdx + 1}
                                                  </span>
                                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                                    {cfg.icon} {cfg.label}
                                                  </span>
                                                  {isEditMode && (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 3 }}>
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
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                                      >
                                                        <Trash2 size={11} />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>

                                                <h4 style={{
                                                  margin: 0,
                                                  fontSize: '0.86rem',
                                                  fontWeight: 800,
                                                  color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text)',
                                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                                  lineHeight: 1.3
                                                }}>
                                                  {topic.name}
                                                </h4>
                                              </div>
                                            )}
                                          </div>

                                          {/* Aksiyon Çipleri (Mobilde alt satırda tam butonlar) */}
                                          <div className="roadmap-topic-actions-bar">
                                            {onAssignTopic && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => onAssignTopic({ subjectName: sub.name, topicName: topic.name, taskType: 'konu' })}
                                                  style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '0.45rem',
                                                    border: '1px solid rgba(99,102,241,0.3)',
                                                    background: 'rgba(99,102,241,0.15)',
                                                    color: '#6366f1',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                  }}
                                                >
                                                  📖 Çalış
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => onAssignTopic({ subjectName: sub.name, topicName: topic.name, taskType: 'soru' })}
                                                  style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '0.45rem',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    background: 'rgba(16,185,129,0.15)',
                                                    color: '#10b981',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
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
                                                padding: '4px 9px',
                                                borderRadius: '0.45rem',
                                                border: isCompleted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)',
                                                background: isCompleted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.15)',
                                                color: isCompleted ? '#ef4444' : '#10b981',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                              }}
                                            >
                                              {isCompleted ? 'Geri Al' : '✓ Tamamla'}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Ünite İçine Yeni Konu Ekleme (Yalnızca Düzenleme Modunda) */}
                                  {isEditMode && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                      <input
                                        type="text"
                                        value={newTopicNames[unit.id] || ''}
                                        onChange={e => setNewTopicNames({ ...newTopicNames, [unit.id]: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTopic(sub.id, unit.id)}
                                        placeholder="Bu üniteye yeni konu ekle..."
                                        style={{
                                          flex: 1,
                                          padding: '0.4rem 0.65rem',
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
                                          padding: '0.4rem 0.85rem',
                                          borderRadius: '0.5rem',
                                          border: 'none',
                                          background: subColor,
                                          color: '#ffffff',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        + Konu
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Ders İçine Yeni Ünite Ekleme (Yalnızca Düzenleme Modunda) */}
                    {isEditMode && (
                      <div style={{
                        display: 'flex',
                        gap: 6,
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.85rem',
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#f1f5f9',
                        border: isDark ? '1px dashed rgba(255,255,255,0.15)' : '1.5px dashed #cbd5e1',
                        alignItems: 'center'
                      }}>
                        <FolderPlus size={15} color={subColor} style={{ flexShrink: 0 }} />
                        <input
                          type="text"
                          value={newUnitNames[sub.id] || ''}
                          onChange={e => setNewUnitNames({ ...newUnitNames, [sub.id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleAddUnit(sub.id)}
                          placeholder={`"${sub.name}" için yeni ünite adı...`}
                          style={{
                            flex: 1,
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.5rem',
                            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            color: 'var(--color-text)',
                            fontSize: '0.78rem',
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
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          + Ünite
                        </button>
                      </div>
                    )}

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
