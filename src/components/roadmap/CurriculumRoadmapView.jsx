import React, { useState, useMemo } from 'react';
import { 
  Check, PlayCircle, Calendar, Sparkles, BookOpen, Compass, 
  ChevronRight, Award, Layers, Target, CheckCircle2, RotateCcw, 
  Plus, ArrowRight, Star, Flame, Trophy
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

export default function CurriculumRoadmapView({
  topicPool = [],
  setTopicPool,
  onAssignTopic,
  isDark: propIsDark = null
}) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark !== null ? propIsDark : themeIsDark;
  const { data: curriculumData } = useCurriculum() || {};

  // Selected Grade / Curriculum Source
  const [selectedSourceKey, setSelectedSourceKey] = useState('pool'); // 'pool' or gradeId
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Convert Curriculum Data to structured Roadmap items if a grade is picked
  const availableGrades = useMemo(() => {
    return curriculumData?.grades || [];
  }, [curriculumData]);

  // Active Subject List depending on source
  const currentRoadmapSubjects = useMemo(() => {
    if (selectedSourceKey === 'pool') {
      return (topicPool || []).map(sub => ({
        id: sub.id,
        name: sub.name,
        color: sub.color || '#6366f1',
        topics: sub.topics || []
      }));
    }

    // From Curriculum Grade
    if (!curriculumData) return [];
    const gradeSubs = (curriculumData.subjects || []).filter(s => String(s.gradeId) === String(selectedSourceKey));
    return gradeSubs.map(s => {
      const units = (curriculumData.units || []).filter(u => String(u.subjectId) === String(s.id));
      const unitIds = new Set(units.map(u => u.id));
      const topics = (curriculumData.topics || []).filter(t => String(t.subjectId) === String(s.id) || unitIds.has(t.unitId));

      // Match status from topicPool if exists
      const poolSub = (topicPool || []).find(ps => ps.name.toLowerCase() === s.name.toLowerCase());

      return {
        id: s.id,
        name: s.name,
        color: SUBJECT_COLORS[s.name]?.color || '#6366f1',
        units: units.map(u => ({
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
        })),
        topics: topics.map(t => {
          const poolTopic = poolSub?.topics?.find(pt => pt.name.toLowerCase() === t.name.toLowerCase());
          return {
            id: t.id,
            name: t.name,
            status: poolTopic?.status || 'Başlanmadı'
          };
        })
      };
    });
  }, [selectedSourceKey, topicPool, curriculumData]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    if (selectedSubjectFilter === 'all') return currentRoadmapSubjects;
    return currentRoadmapSubjects.filter(s => s.name === selectedSubjectFilter);
  }, [currentRoadmapSubjects, selectedSubjectFilter]);

  // Overall Roadmap Metrics
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let nextTopic = null;

    currentRoadmapSubjects.forEach(s => {
      (s.topics || []).forEach(t => {
        total += 1;
        if (t.status === 'Tamamlandı') done += 1;
        else if (t.status === 'Başlandı' || t.status === 'Öğrenildi') {
          inProgress += 1;
          if (!nextTopic) nextTopic = { ...t, subjectName: s.name };
        } else if (!nextTopic) {
          nextTopic = { ...t, subjectName: s.name };
        }
      });
    });

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, pct, nextTopic };
  }, [currentRoadmapSubjects]);

  // Toggle Topic Status
  const handleToggleTopicStatus = (subjectName, topicName, currentStatus) => {
    if (!setTopicPool) return;

    const nextStatus = currentStatus === 'Tamamlandı' 
      ? 'Başlanmadı' 
      : currentStatus === 'Başlandı' 
      ? 'Tamamlandı' 
      : 'Başlandı';

    setTopicPool(prevPool => {
      const nextPool = [...(prevPool || [])];
      let subObj = nextPool.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
      
      if (!subObj) {
        subObj = {
          id: `sub_${Date.now()}`,
          name: subjectName,
          color: SUBJECT_COLORS[subjectName]?.color || '#6366f1',
          topics: []
        };
        nextPool.push(subObj);
      }

      const existingTopic = (subObj.topics || []).find(t => t.name.toLowerCase() === topicName.toLowerCase());
      if (existingTopic) {
        existingTopic.status = nextStatus;
      } else {
        subObj.topics.push({
          id: `top_${Date.now()}`,
          name: topicName,
          status: nextStatus
        });
      }

      return nextPool;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── 1. ÜST KONTROL & SEÇİCİ BAR ── */}
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
                Ders & Konu Yol Haritası
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Müfredat hedeflerini adım adım patika üzerinden tamamla
              </span>
            </div>
          </div>

          {/* Sınıf / Kaynak Seçici */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#64748b' }}>
              Kaynak:
            </span>
            <select
              value={selectedSourceKey}
              onChange={e => {
                setSelectedSourceKey(e.target.value);
                setSelectedSubjectFilter('all');
              }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '0.65rem',
                border: isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="pool" style={{ background: '#0f172a', color: '#ffffff' }}>⭐ Benim Konu Havuzum</option>
              {availableGrades.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                  🏫 {g.name} Müfredatı
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 2. OYUNLAŞTIRILMIŞ KPI & İLERLEME BANDI ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          background: isDark ? 'rgba(0,0,0,0.25)' : '#f8fafc',
          padding: '0.85rem 1rem',
          borderRadius: '0.95rem',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'
        }}>
          {/* İlerleme Yüzdesi */}
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

          {/* Çalışılan Konular */}
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

          {/* Kalan Konu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '1rem' }}>
              🎯
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#6366f1' }}>
                {Math.max(0, stats.total - stats.done)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Kalan Hedef
              </div>
            </div>
          </div>

          {/* Sıradaki Hedef Önerisi */}
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
                <strong>Sıradaki Adım:</strong> {stats.nextTopic.subjectName} › {stats.nextTopic.name}
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
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            Tüm Dersler ({currentRoadmapSubjects.length})
          </button>

          {currentRoadmapSubjects.map(sub => {
            const isSel = selectedSubjectFilter === sub.name;
            const subColor = sub.color || '#6366f1';
            const icon = SUBJECT_COLORS[sub.name]?.icon || '📚';
            const subDoneCount = (sub.topics || []).filter(t => t.status === 'Tamamlandı').length;

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
                  gap: 5,
                  transition: 'all 0.15s ease'
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
                  {subDoneCount}/{sub.topics.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. İNTERAKTİF YOL HARİTASI PATİKASI (VISUAL LEARNING TRAIL) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredSubjects.length === 0 ? (
          <div style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: '1.25rem',
            border: '1.5px dashed var(--color-border)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🗺️</div>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Bu filtrede konu bulunamadı</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Üstteki şablon yükle veya müfredat seçicisini kullanarak ders ve konuları ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          filteredSubjects.map((sub, sIdx) => {
            const subColor = sub.color || '#6366f1';
            const icon = SUBJECT_COLORS[sub.name]?.icon || '📖';
            const topics = sub.topics || [];
            const doneCount = topics.filter(t => t.status === 'Tamamlandı').length;
            const subPct = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

            return (
              <div
                key={sub.id || sub.name}
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(24, 24, 48, 0.88))' : '#ffffff',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0',
                  borderRadius: '1.35rem',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 10px 32px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.04)'
                }}
              >
                {/* Ders Başlık Şeridi & İstasyon Rozeti */}
                <div style={{
                  padding: '1rem 1.35rem',
                  background: isDark ? `${subColor}18` : `${subColor}12`,
                  borderBottom: `1.5px solid ${subColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: subColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      boxShadow: `0 3px 10px ${subColor}40`
                    }}>
                      {icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        {sub.name}
                      </h3>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        {doneCount} / {topics.length} Konu Tamamlandı
                      </span>
                    </div>
                  </div>

                  {/* Yüzde Barı */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 100,
                      height: 8,
                      borderRadius: 99,
                      background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${subPct}%`,
                        background: subColor,
                        borderRadius: 99,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: subColor }}>
                      %{subPct}
                    </span>
                  </div>
                </div>

                {/* ── DİKEY PATİKA LİSTESİ (ROADMAP TIMELINE) ── */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  position: 'relative'
                }}>
                  {/* Patika Çizgisi */}
                  <div style={{
                    position: 'absolute',
                    top: 30,
                    bottom: 30,
                    left: 36,
                    width: 3,
                    background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                    borderRadius: 99,
                    zIndex: 0
                  }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
                    {topics.map((topic, tIdx) => {
                      const isCompleted = topic.status === 'Tamamlandı';
                      const isInProgress = topic.status === 'Başlandı' || topic.status === 'Öğrenildi';
                      const cfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG['Başlanmadı'];

                      return (
                        <div
                          key={topic.id || `${topic.name}_${tIdx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem'
                          }}
                        >
                          {/* Kilometre Taşı Rozeti (Milestone Circle Node) */}
                          <button
                            type="button"
                            onClick={() => handleToggleTopicStatus(sub.name, topic.name, topic.status)}
                            title="Durumu değiştirmek için tıklayın"
                            style={{
                              width: 36,
                              height: 36,
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
                              fontSize: isCompleted ? '1rem' : '0.78rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                              transition: 'all 0.2s ease',
                              marginTop: 2
                            }}
                          >
                            {isCompleted ? <Check size={18} strokeWidth={3} /> : tIdx + 1}
                          </button>

                          {/* Konu Kartı */}
                          <div style={{
                            flex: 1,
                            padding: '0.85rem 1.15rem',
                            borderRadius: '1rem',
                            background: isCompleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)')
                              : isInProgress
                              ? (isDark ? 'rgba(99, 102, 241, 0.1)' : '#f8fafc')
                              : (isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'),
                            border: isCompleted
                              ? '1.5px solid rgba(16, 185, 129, 0.3)'
                              : isInProgress
                              ? `1.5px solid ${subColor}50`
                              : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'),
                            boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            transition: 'all 0.2s ease'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  color: isCompleted ? '#10b981' : subColor
                                }}>
                                  Adım {tIdx + 1}
                                </span>
                                
                                <span style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 800,
                                  padding: '1px 7px',
                                  borderRadius: 99,
                                  background: cfg.bg,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.border}`
                                }}>
                                  {cfg.icon} {cfg.label}
                                </span>
                              </div>

                              <h4 style={{
                                margin: 0,
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text)',
                                textDecoration: isCompleted ? 'line-through' : 'none'
                              }}>
                                {topic.name}
                              </h4>
                            </div>

                            {/* Hızlı Aksiyon Butonları */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                              {onAssignTopic && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onAssignTopic({ subjectName: sub.name, topicName: topic.name, taskType: 'konu' })}
                                    style={{
                                      padding: '4px 9px',
                                      borderRadius: '0.5rem',
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
                                      padding: '4px 9px',
                                      borderRadius: '0.5rem',
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

                              {/* Tamamlandı / Geri Al Butonu */}
                              <button
                                type="button"
                                onClick={() => handleToggleTopicStatus(sub.name, topic.name, topic.status)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '0.5rem',
                                  border: isCompleted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)',
                                  background: isCompleted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.15)',
                                  color: isCompleted ? '#ef4444' : '#10b981',
                                  fontSize: '0.7rem',
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
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
