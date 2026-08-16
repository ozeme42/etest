import { useState, useMemo } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { dbAddUser } from '../services/supabaseService';
import {
  FolderTree, Trash2, Plus, ArrowRight, Edit, X, UserPlus, Check, Clock, Users,
  GraduationCap, ShieldCheck, FileJson, Search, BookOpen, Sparkles, CheckCircle2,
  AlertTriangle, Key, Copy, RefreshCw, Layers, ChevronRight, BarChart3, FileText,
  BookOpenCheck, Shield, UserCheck
} from 'lucide-react';
import AdminHomeworkTracker from '../components/AdminHomeworkTracker';
import SummaryManagerPage from './SummaryManagerPage';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum', 'users', 'matrix', 'summaries', 'homeworks'
  const { data: curData } = useCurriculum();
  const { users } = useUser();
  const { submissions = [] } = useEvaluation();

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const teachers = useMemo(() => users.filter(u => u.role === 'teacher'), [users]);
  const pendingTeachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.isApproved === false), [users]);
  const unassignedStudents = useMemo(() => students.filter(s => !s.teacherId || !teachers.some(t => t.id === s.teacherId)), [students, teachers]);

  const totalGrades = curData?.grades?.length || 0;
  const totalSubjects = curData?.subjects?.length || 0;
  const totalUnits = curData?.units?.length || 0;
  const totalTopics = curData?.topics?.length || 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(180deg, #070a12 0%, #0d1224 35%, #13112c 70%, #070a12 100%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f8fafc',
      padding: '1.5rem 1rem 5rem 1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* TOP CONTROL CENTER HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '1.5rem',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              flexShrink: 0
            }}>
              <ShieldCheck size={28} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Admin Kontrol Merkezi
                </h1>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', border: '1px solid rgba(165, 180, 252, 0.35)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                  PRO CONTROL
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                Müfredat Hiyerarşisi, Kullanıcı Yetkilendirmeleri, Öğretmen-Öğrenci Eşleşmeleri ve Sistem Yönetimi
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {pendingTeachers.length > 0 && (
              <button
                onClick={() => setActiveTab('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.85rem',
                  background: 'rgba(245, 158, 11, 0.18)',
                  border: '1.5px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  animation: 'pulse 2s infinite'
                }}
              >
                <Clock size={15} /> {pendingTeachers.length} Onay Bekleyen Öğretmen
              </button>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.45rem 0.85rem',
              borderRadius: '0.85rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <CheckCircle2 size={15} /> Sistem Aktif & Senkronize
            </div>
          </div>
        </div>

        {/* 5 GLOWING KPI METRIC CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Kayıtlı Kullanıcı', value: `${users.length} Kişi`, sub: `${students.length} Öğrenci · ${teachers.length} Öğretmen`, icon: Users, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
            { label: 'Öğrenci Sayısı', value: `${students.length} Öğrenci`, sub: unassignedStudents.length > 0 ? `⚠️ ${unassignedStudents.length} Atanmamış` : '✅ Tümü Atanmış', icon: GraduationCap, color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' },
            { label: 'Aktif Öğretmen', value: `${teachers.length} Öğretmen`, sub: pendingTeachers.length > 0 ? `⏳ ${pendingTeachers.length} Onay Bekliyor` : 'Tüm Kayıtlar Aktif', icon: UserCheck, color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
            { label: 'Müfredat Kapsamı', value: `${totalGrades} Sınıf · ${totalSubjects} Ders`, sub: `${totalUnits} Ünite · ${totalTopics} Konu`, icon: Layers, color: '#fb7185', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)' },
            { label: 'Çözülen Sınavlar', value: `${submissions.length} Sınav`, sub: 'Öğrenci Değerlendirmeleri', icon: BarChart3, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
                border: `1.5px solid ${kpi.border}`,
                borderRadius: '1.25rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ width: 46, height: 46, borderRadius: '0.85rem', background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.72rem', color: kpi.sub.includes('⚠️') || kpi.sub.includes('⏳') ? '#fbbf24' : 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{kpi.sub}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* HIGH-TECH GLASS TAB NAVIGATION BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '0.45rem',
          borderRadius: '1.25rem',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'curriculum', label: 'Müfredat Hiyerarşisi', icon: FolderTree, count: `${totalGrades} Sınıf` },
            { id: 'users', label: 'Kullanıcılar & Onaylar', icon: Users, count: `${users.length}`, alert: pendingTeachers.length },
            { id: 'matrix', label: 'Öğretmen & Öğrenci Eşleşmeleri', icon: GraduationCap, count: `${teachers.length} Öğretmen`, alert: unassignedStudents.length },
            { id: 'summaries', label: 'Ders Özetleri Modülü', icon: BookOpen, count: 'Editör' },
            { id: 'homeworks', label: 'Ödev Takip Merkezi', icon: BarChart3, count: 'Rapor' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '0.9rem',
                  border: isActive ? '1.5px solid rgba(165, 180, 252, 0.5)' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 18px rgba(99, 102, 241, 0.45)' : 'none'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 99,
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'
                  }}>
                    {tab.count}
                  </span>
                )}
                {tab.alert > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 99,
                    background: '#f59e0b',
                    color: '#0f172a',
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                  }}>
                    {tab.alert}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ACTIVE TAB CONTENT CONTAINER */}
        <div style={{ minHeight: 400 }}>
          {activeTab === 'curriculum' && <CurriculumManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'matrix' && <TeacherStudentMatrix />}
          {activeTab === 'summaries' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '1.5rem',
              padding: '1.25rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(20px)'
            }}>
              <SummaryManagerPage />
            </div>
          )}
          {activeTab === 'homeworks' && <AdminHomeworkTracker />}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. MÜFREDAT HİYERARŞİSİ & YÖNETİMİ COMPONENT (PRO MILLER FLOW)
═══════════════════════════════════════════════════════════ */
function CurriculumManager() {
  const { data, addGrade, addSubject, addUnit, addTopic, deleteItem, bulkAddCurriculum } = useCurriculum();
  
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [newItemName, setNewItemName] = useState('');
  const [targetColumn, setTargetColumn] = useState('grade'); // 'grade', 'subject', 'unit', 'topic'
  const [jsonModal, setJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = useMemo(() => data.subjects.filter(s => s.gradeId === selectedGrade), [data.subjects, selectedGrade]);
  const filteredUnits = useMemo(() => data.units.filter(u => u.subjectId === selectedSubject), [data.units, selectedSubject]);
  const filteredTopics = useMemo(() => data.topics.filter(t => t.unitId === selectedUnit), [data.topics, selectedUnit]);

  // Selected names for breadcrumb
  const currentGradeObj = data.grades.find(g => g.id === selectedGrade);
  const currentSubjectObj = data.subjects.find(s => s.id === selectedSubject);
  const currentUnitObj = data.units.find(u => u.id === selectedUnit);

  const handleAdd = (type, parentId, inputVal) => {
    const raw = inputVal || newItemName;
    if (!raw.trim()) return;
    
    const names = raw.split(',').map(n => n.trim()).filter(Boolean);
    
    names.forEach(name => {
      switch(type) {
        case 'grade': addGrade(name); break;
        case 'subject': addSubject(parentId, name); break;
        case 'unit': addUnit(parentId, name); break;
        case 'topic': addTopic(parentId, name); break;
        default: break;
      }
    });
    setNewItemName('');
  };

  const handleJsonImport = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        await bulkAddCurriculum(parsed);
        setJsonModal(false);
        setJsonText('');
        alert('Müfredat başarıyla eklendi!');
      } else {
        alert('Geçersiz JSON formatı. En dışta bir dizi (array) olmalıdır.');
      }
    } catch (e) {
      alert('JSON parse hatası: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ACTION & BREADCRUMB BAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.25rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📍 Aktif Yol:
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedGrade ? '#ffffff' : 'rgba(255,255,255,0.4)', background: selectedGrade ? 'rgba(99, 102, 241, 0.2)' : 'transparent', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedGrade ? '1px solid rgba(165, 180, 252, 0.3)' : 'none' }}>
            {currentGradeObj?.name || 'Sınıf Seçilmedi'}
          </span>
          {selectedGrade && (
            <>
              <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedSubject ? '#ffffff' : 'rgba(255,255,255,0.4)', background: selectedSubject ? 'rgba(56, 189, 248, 0.2)' : 'transparent', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedSubject ? '1px solid rgba(56, 189, 248, 0.3)' : 'none' }}>
                {currentSubjectObj?.name || 'Ders Seçilmedi'}
              </span>
            </>
          )}
          {selectedSubject && (
            <>
              <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedUnit ? '#ffffff' : 'rgba(255,255,255,0.4)', background: selectedUnit ? 'rgba(192, 132, 252, 0.2)' : 'transparent', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedUnit ? '1px solid rgba(192, 132, 252, 0.3)' : 'none' }}>
                {currentUnitObj?.name || 'Ünite Seçilmedi'}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {(selectedGrade || selectedSubject || selectedUnit) && (
            <button
              onClick={() => { setSelectedGrade(null); setSelectedSubject(null); setSelectedUnit(null); }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🔄 Seçimi Sıfırla
            </button>
          )}
          <button
            onClick={() => setJsonModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.55rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
            }}
          >
            <FileJson size={16} /> Toplu JSON Müfredat Ekle
          </button>
        </div>
      </div>

      {/* 4-COLUMN MILLER HIERARCHY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'start' }}>
        
        {/* COLUMN 1: GRADES */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <FolderTree size={18} /> 1. Sınıflar / Düzeyler
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
              {data.grades.length} Sınıf
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
            {data.grades.map(grade => {
              const count = data.subjects.filter(s => s.gradeId === grade.id).length;
              const isActive = selectedGrade === grade.id;
              return (
                <div
                  key={grade.id}
                  onClick={() => { setSelectedGrade(grade.id); setSelectedSubject(null); setSelectedUnit(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.85rem',
                    background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? '1.5px solid rgba(165, 180, 252, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{grade.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.15rem 0.45rem', borderRadius: 99 }}>
                      {count} Ders
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem('grades', grade.id); }}
                      style={{ background: 'none', border: 'none', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', padding: 2, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight size={14} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('grade', null, val); e.target.elements.addInput.value = ''; }}
            style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <input
              name="addInput"
              type="text"
              placeholder="+ Sınıf ekle (virgülle çoklu)"
              style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
            />
            <button
              type="submit"
              style={{ padding: '0.55rem 0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
            >
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* COLUMN 2: SUBJECTS */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <BookOpen size={18} /> 2. Dersler
            </div>
            {selectedGrade && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(56, 189, 248, 0.25)', color: '#bae6fd', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
                {filteredSubjects.length} Ders
              </span>
            )}
          </div>

          {selectedGrade ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredSubjects.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu sınıfa ait henüz ders eklenmemiş.</p>
                ) : (
                  filteredSubjects.map(subject => {
                    const unitCount = data.units.filter(u => u.subjectId === subject.id).length;
                    const isActive = selectedSubject === subject.id;
                    return (
                      <div
                        key={subject.id}
                        onClick={() => { setSelectedSubject(subject.id); setSelectedUnit(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '0.85rem',
                          background: isActive ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'rgba(255, 255, 255, 0.05)',
                          border: isActive ? '1.5px solid rgba(125, 211, 252, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 4px 14px rgba(14, 165, 233, 0.4)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{subject.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.15rem 0.45rem', borderRadius: 99 }}>
                            {unitCount} Ünite
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteItem('subjects', subject.id); }}
                            style={{ background: 'none', border: 'none', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', padding: 2, cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                          >
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={14} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('subject', selectedGrade, val); e.target.elements.addInput.value = ''; }}
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Ders ekle (Örn: Matematik, Fen)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir sınıf seçin.</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: UNITS */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(192, 132, 252, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c084fc', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <Layers size={18} /> 3. Üniteler
            </div>
            {selectedSubject && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(192, 132, 252, 0.25)', color: '#e9d5ff', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
                {filteredUnits.length} Ünite
              </span>
            )}
          </div>

          {selectedSubject ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredUnits.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu derse ait henüz ünite eklenmemiş.</p>
                ) : (
                  filteredUnits.map(unit => {
                    const topicCount = data.topics.filter(t => t.unitId === unit.id).length;
                    const isActive = selectedUnit === unit.id;
                    return (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '0.85rem',
                          background: isActive ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255, 255, 255, 0.05)',
                          border: isActive ? '1.5px solid rgba(196, 181, 253, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{unit.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.15rem 0.45rem', borderRadius: 99 }}>
                            {topicCount} Konu
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteItem('units', unit.id); }}
                            style={{ background: 'none', border: 'none', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', padding: 2, cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                          >
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={14} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('unit', selectedSubject, val); e.target.elements.addInput.value = ''; }}
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Ünite ekle (Örn: 1. Ünite - Çarpanlar)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir ders seçin.</p>
            </div>
          )}
        </div>

        {/* COLUMN 4: TOPICS */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(244, 63, 94, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb7185', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <FileText size={18} /> 4. Konular
            </div>
            {selectedUnit && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(244, 63, 94, 0.25)', color: '#fecdd3', padding: '0.15rem 0.55rem', borderRadius: 99 }}>
                {filteredTopics.length} Konu
              </span>
            )}
          </div>

          {selectedUnit ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredTopics.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu üniteye ait henüz konu eklenmemiş.</p>
                ) : (
                  filteredTopics.map(topic => (
                    <div
                      key={topic.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>{topic.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => deleteItem('topics', topic.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 2, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('topic', selectedUnit, val); e.target.elements.addInput.value = ''; }}
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Konu ekle (virgülle çoklu)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir ünite seçin.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: TOPLU JSON MÜFREDAT YÜKLE */}
      {jsonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 620,
            border: '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: '#ffffff', fontSize: '1.15rem' }}>Toplu JSON Müfredat Ekle</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>Sınıf, Ders, Ünite ve Konu hiyerarşisini JSON formatında içe aktarın.</p>
              </div>
              <button onClick={() => setJsonModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.75rem', borderRadius: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>JSON Şablonu</span>
              <button
                onClick={() => setJsonText('[\n  {\n    "grade": "5. Sınıf",\n    "subjects": [\n      {\n        "name": "Matematik",\n        "units": [\n          {\n            "name": "1. Ünite - Doğal Sayılar",\n            "topics": [\n              "Doğal Sayıların Okunuşu ve Yazılışı",\n              "Milyonlar Bölüğü"\n            ]\n          }\n        ]\n      }\n    ]\n  }\n]')}
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(165, 180, 252, 0.4)', color: '#c7d2fe', fontWeight: 800, cursor: 'pointer' }}
              >
                Örnek Şablonu Doldur
              </button>
            </div>

            <textarea
              rows={10}
              placeholder="Buraya JSON yapıştırın..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.35)', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button onClick={() => setJsonModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>İptal</button>
              <button onClick={handleJsonImport} style={{ padding: '0.55rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)' }}>İçe Aktar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. KULLANICI YÖNETİMİ & ONAYLAR COMPONENT (PRO TABLE & FILTERS)
═══════════════════════════════════════════════════════════ */
function UserManager() {
  const { users, addUser, updateUser, deleteUser } = useUser();
  const { data: curData } = useCurriculum();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFilter, setUserFilter] = useState('all'); // 'all', 'student', 'teacher', 'admin', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '123456', role: 'student', gradeId: '', teacherId: '', isApproved: true });

  const teachers = users.filter(u => u.role === 'teacher');
  const pendingTeachers = users.filter(u => u.role === 'teacher' && u.isApproved === false);

  const handleApproveTeacher = async (user) => {
    const updated = { ...user, isApproved: true };
    await updateUser(user.id, updated);
    await dbAddUser(updated);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUserId(user.id);
      const matchedGrade = curData?.grades?.find(g => String(g.id) === String(user.gradeId) || String(g.id) === String(user.classId))
        || curData?.grades?.find(g => g.name === user.gradeId || g.name === user.grade || g.name === user.className);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: user.password || '123456',
        role: user.role || 'student',
        gradeId: matchedGrade ? matchedGrade.id : (user.gradeId || curData?.grades?.[0]?.id || ''),
        teacherId: user.teacherId || '',
        isApproved: user.isApproved !== undefined ? user.isApproved : true
      });
    } else {
      setEditingUserId(null);
      setFormData({ 
        name: '', 
        email: '', 
        password: Math.random().toString(36).slice(-6), 
        role: 'student', 
        gradeId: curData?.grades?.[0]?.id || '', 
        teacherId: '', 
        isApproved: true 
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const selectedGradeId = formData.gradeId || curData?.grades?.[0]?.id || 'g1';
    const gradeObj = curData?.grades?.find(g => String(g.id) === String(selectedGradeId) || g.name === selectedGradeId);
    const gradeName = gradeObj ? gradeObj.name : selectedGradeId;

    const userPayload = {
      ...formData,
      gradeId: selectedGradeId,
      classId: selectedGradeId,
      grade: gradeName
    };

    if (editingUserId) {
      await updateUser(editingUserId, userPayload);
      await dbAddUser({ id: editingUserId, ...userPayload });
    } else {
      const newUser = await addUser(userPayload);
      if (newUser) await dbAddUser({ ...newUser, ...userPayload });
    }
    setShowModal(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (userFilter === 'student' && user.role !== 'student') return false;
      if (userFilter === 'teacher' && user.role !== 'teacher') return false;
      if (userFilter === 'admin' && user.role !== 'admin') return false;
      if (userFilter === 'pending' && !(user.role === 'teacher' && user.isApproved === false)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = user.name?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchGrade = user.grade?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchGrade) return false;
      }

      return true;
    });
  }, [users, userFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* PENDING TEACHER APPROVALS ALERT CARD */}
      {pendingTeachers.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(120, 53, 15, 0.4) 0%, rgba(30, 27, 75, 0.7) 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <Clock size={22} color="#fbbf24" className="animate-spin" style={{ animationDuration: '6s' }} />
            <h3 style={{ margin: 0, color: '#fbbf24', fontWeight: 900, fontSize: '1rem' }}>
              Onay Bekleyen Öğretmen Kayıtları ({pendingTeachers.length})
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {pendingTeachers.map(teacher => (
              <div key={teacher.id} style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '0.85rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem' }}>{teacher.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>📧 {teacher.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => handleApproveTeacher(teacher)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.65rem',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Check size={14} /> Onayla
                  </button>
                  <button
                    onClick={() => deleteUser(teacher.id)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '0.65rem',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      cursor: 'pointer'
                    }}
                    title="Talebi Reddet ve Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.25rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
          {[
            { id: 'all', label: `Tümü (${users.length})` },
            { id: 'student', label: `Öğrenciler (${users.filter(u => u.role === 'student').length})` },
            { id: 'teacher', label: `Öğretmenler (${teachers.length})` },
            { id: 'admin', label: `Yöneticiler (${users.filter(u => u.role === 'admin').length})` },
            { id: 'pending', label: `Onay Bekleyen (${pendingTeachers.length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setUserFilter(f.id)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '0.65rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: 'none',
                background: userFilter === f.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255, 255, 255, 0.06)',
                color: userFilter === f.id ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="İsim veya e-posta ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.55rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              border: 'none',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)'
            }}
          >
            <UserPlus size={16} /> Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      {/* USERS GLASS TABLE */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.25rem',
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(20px)',
        overflowX: 'auto',
        padding: 0
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Kullanıcı</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta / Kullanıcı Adı</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Rol</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Bağlı Öğretmen</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Durum</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const roleBadge = user.role === 'admin' 
                ? { bg: 'rgba(244, 63, 94, 0.2)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.4)', label: 'Yönetici' }
                : user.role === 'teacher'
                ? { bg: 'rgba(99, 102, 241, 0.2)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.4)', label: 'Öğretmen' }
                : { bg: 'rgba(56, 189, 248, 0.2)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)', label: 'Öğrenci' };

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}>
                  {/* User Initial + Name */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: roleBadge.bg, color: roleBadge.text, border: `1px solid ${roleBadge.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem' }}>{user.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {user.email}
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 900, background: roleBadge.bg, color: roleBadge.text, border: `1px solid ${roleBadge.border}` }}>
                      {roleBadge.label}
                    </span>
                  </td>

                  {/* Grade Selector (Student) */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {user.role === 'student' ? (() => {
                      const userGradeObj = curData?.grades?.find(g => String(g.id) === String(user.gradeId) || String(g.id) === String(user.classId))
                        || curData?.grades?.find(g => g.name === user.gradeId || g.name === user.grade || g.name === user.className);
                      const currentGradeVal = userGradeObj ? userGradeObj.id : (user.gradeId || '');
                      return (
                        <select
                          value={currentGradeVal}
                          onChange={async (e) => {
                            const newGradeId = e.target.value;
                            const gradeObj = curData?.grades?.find(g => String(g.id) === String(newGradeId));
                            const gradeName = gradeObj ? gradeObj.name : newGradeId;
                            const updated = { ...user, gradeId: newGradeId, classId: newGradeId, grade: gradeName, className: gradeName };
                            await updateUser(user.id, updated);
                            await dbAddUser(updated);
                          }}
                          style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid rgba(255,255,255,0.18)', fontSize: '0.75rem', background: currentGradeVal ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)', color: currentGradeVal ? '#7dd3fc' : 'rgba(255,255,255,0.5)', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>— Sınıf Seçin</option>
                          {curData.grades.map(g => (
                            <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#ffffff' }}>{g.name}</option>
                          ))}
                        </select>
                      );
                    })() : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
                  </td>

                  {/* Assigned Teacher (Student) */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {user.role === 'student' ? (
                      <select
                        value={user.teacherId || ''}
                        onChange={async (e) => {
                          const updated = { ...user, teacherId: e.target.value || null };
                          await updateUser(user.id, updated);
                          await dbAddUser(updated);
                        }}
                        style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid rgba(255,255,255,0.18)', fontSize: '0.75rem', background: user.teacherId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: user.teacherId ? '#a5b4fc' : '#fbbf24', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>— Atanmamış</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id} style={{ background: '#0f172a', color: '#ffffff' }}>👨‍🏫 {t.name}</option>
                        ))}
                      </select>
                    ) : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
                  </td>

                  {/* Password Pill */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Key size={11} /> {user.password || '123456'}
                    </span>
                  </td>

                  {/* Status (Teacher Approval) */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {user.role === 'teacher' ? (
                      user.isApproved !== false ? (
                        <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Onaylı
                        </span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} /> Bekliyor
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.78rem' }}>Aktif</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => handleOpenModal(user)}
                        style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', cursor: 'pointer' }}
                        title="Düzenle"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', cursor: 'pointer' }}
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'rgba(255,255,255,0.4)' }}>
                  <Users size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem auto' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Seçilen kriterlere uygun kullanıcı bulunamadı.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: KULLANICI EKLE / DÜZENLE */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 440,
            border: '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#fb7185" />
                <h3 style={{ margin: 0, fontWeight: 900, color: '#ffffff', fontSize: '1.1rem' }}>
                  {editingUserId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder="Örn: ahmet@okul.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Rol</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value, gradeId: e.target.value === 'student' ? formData.gradeId : '', teacherId: e.target.value === 'student' ? formData.teacherId : '' })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="student">Öğrenci</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="admin">Yönetici (Admin)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              {formData.role === 'student' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıfı</label>
                    <select
                      value={formData.gradeId}
                      onChange={e => setFormData({ ...formData, gradeId: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                      required
                    >
                      <option value="">Sınıf Seçiniz</option>
                      {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Bağlı Öğretmen</label>
                    <select
                      value={formData.teacherId}
                      onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Bağlı Öğretmen Seçiniz (Opsiyonel)</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ padding: '0.55rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.4)' }}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. ÖĞRETMEN & ÖĞRENCİ EŞLEŞMELERİ COMPONENT (PRO MATRIX CARDS)
═══════════════════════════════════════════════════════════ */
function TeacherStudentMatrix() {
  const { users, updateUser } = useUser();
  const { data: curData } = useCurriculum();
  const { submissions = [] } = useEvaluation();
  const [searchQ, setSearchQ] = useState('');

  const teachers = useMemo(() => users.filter(u => u.role === 'teacher'), [users]);
  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);

  const handleAssignTeacher = async (studentId, teacherId) => {
    const student = users.find(u => u.id === studentId);
    if (student) {
      const updated = { ...student, teacherId: teacherId || null };
      await updateUser(studentId, updated);
      await dbAddUser(updated);
    }
  };

  const getGradeName = (gradeId) => {
    const grade = curData.grades.find(g => String(g.id) === String(gradeId) || g.name === gradeId);
    return grade ? grade.name : '—';
  };

  const unassignedStudents = useMemo(() => {
    return students.filter(s => !s.teacherId || !teachers.some(t => t.id === s.teacherId));
  }, [students, teachers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER & SEARCH BAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.25rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users color="#818cf8" size={22} /> Öğretmen & Öğrenci Eşleşme Dağılımı
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)' }}>
            Hangi öğretmenin hangi öğrencileri olduğunu görün ve anlık olarak öğrenci aktarımı yapın.
          </p>
        </div>
        <div style={{ position: 'relative', minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Öğrenci veya öğretmen ara..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* UNASSIGNED STUDENTS ALERT CARD */}
      {unassignedStudents.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(120, 53, 15, 0.4) 0%, rgba(30, 27, 75, 0.7) 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Henüz Öğretmeni Atanmamış Öğrenciler ({unassignedStudents.length})
            </h4>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Şifre</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Öğretmen Ata</th>
                </tr>
              </thead>
              <tbody>
                {unassignedStudents.map(std => (
                  <tr key={std.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>{std.name}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#7dd3fc', fontSize: '0.78rem', fontWeight: 700 }}>{getGradeName(std.gradeId)}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem' }}>{std.email}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: 4, fontFamily: 'monospace' }}>
                        🔑 {std.password || '123456'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                      <select
                        value=""
                        onChange={e => handleAssignTeacher(std.id, e.target.value)}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '0.55rem', border: '1px solid rgba(245, 158, 11, 0.5)', fontSize: '0.75rem', background: 'rgba(15,23,42,0.95)', fontWeight: 800, color: '#fbbf24', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>Öğretmen Seçiniz...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id} style={{ background: '#0f172a', color: '#ffffff' }}>👨‍🏫 {t.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEACHER CARDS GRID */}
      {teachers.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
          border: '1.5px dashed rgba(255,255,255,0.2)',
          borderRadius: '1.25rem',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 700
        }}>
          Sistemde henüz kayıtlı öğretmen bulunmuyor.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {teachers.map(teacher => {
            const teacherStudents = students.filter(s => s.teacherId === teacher.id && (!searchQ || s.name.toLowerCase().includes(searchQ.toLowerCase()) || s.email.toLowerCase().includes(searchQ.toLowerCase())));
            
            if (searchQ && teacherStudents.length === 0 && !teacher.name.toLowerCase().includes(searchQ.toLowerCase())) {
              return null;
            }

            return (
              <div key={teacher.id} style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '1.25rem',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 0 14px rgba(99,102,241,0.4)' }}>
                      {teacher.name?.charAt(0) || 'Ö'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>{teacher.name}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>📧 {teacher.email}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', border: '1px solid rgba(165, 180, 252, 0.35)', padding: '0.3rem 0.85rem', borderRadius: 99 }}>
                      🎓 {teacherStudents.length} Bağlı Öğrenci
                    </span>
                  </div>
                </div>

                {teacherStudents.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: '0.5rem 0' }}>Bu öğretmene henüz bağlı öğrenci bulunmuyor.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Çözülen Sınav</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Öğretmeni Değiştir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherStudents.map(std => {
                          const solvedCount = submissions.filter(sub => sub.studentId === std.id).length;
                          return (
                            <tr key={std.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>{std.name}</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '0.2rem 0.55rem', borderRadius: 99, fontWeight: 800, border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                                  {getGradeName(std.gradeId)}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem' }}>{std.email}</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: 4, fontFamily: 'monospace' }}>
                                  🔑 {std.password || '123456'}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 900, color: solvedCount > 0 ? '#34d399' : 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                {solvedCount}
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                <select
                                  value={std.teacherId || ''}
                                  onChange={e => handleAssignTeacher(std.id, e.target.value)}
                                  style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid rgba(255,255,255,0.18)', fontSize: '0.75rem', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                                >
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id} style={{ background: '#0f172a', color: '#ffffff' }}>👨‍🏫 {t.name}</option>
                                  ))}
                                  <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>Atanmamış Yap</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
