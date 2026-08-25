import { useState, useMemo } from 'react';
import { useCurriculum, naturalSort } from '../context/CurriculumContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { dbAddUser } from '../services/supabaseService';
import { migrateAllLocalDataToSupabase } from '../services/migrationService';
import { createFullBackup, restoreFullBackup } from '../services/backupService';
import { ClipboardCheck, Download, Upload, FileCheck, CheckCheck } from 'lucide-react';
import { UploadCloud, Database, CheckCircle, AlertCircle } from 'lucide-react';
import {
  FolderTree, Trash2, Plus, ArrowRight, Edit, X, UserPlus, Check, Clock, Users,
  GraduationCap, ShieldCheck, FileJson, Search, BookOpen, Sparkles, CheckCircle2,
  AlertTriangle, Key, Copy, RefreshCw, Layers, ChevronRight, BarChart3, FileText,
  BookOpenCheck, Shield, UserCheck
} from 'lucide-react';
import AdminHomeworkTracker from '../components/AdminHomeworkTracker';
import SummaryManagerPage from './SummaryManagerPage';
import StudentResultsPage from './StudentResultsPage';
import { Award } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('curriculum');
  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [migrationStatus, setMigrationStatus] = useState('idle'); // 'idle', 'running', 'success', 'error'

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreModalInfo, setRestoreModalInfo] = useState(null); // { stats } or null
  const [restoreError, setRestoreError] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [isPastingRestore, setIsPastingRestore] = useState(false);

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const stats = await createFullBackup();
      alert(`✅ Tam Yedek Başarıyla İndirildi!\n\n📊 İçerik Özeti:\n• ${stats.submissionCount} Sınav ve Test Sonucu\n• ${stats.userCount} Kullanıcı Hesabı\n• ${stats.questionCount} Soru Bankası Sorusu\n• ${stats.homeworkCount} Ödev & Görev\n• ${stats.bookCount} Kitap Takibi`);
    } catch (err) {
      alert(`❌ Yedek indirilirken hata oluştu: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromPastedText = async () => {
    if (!pastedJsonText.trim()) return;
    setIsPastingRestore(true);
    setRestoreError(null);
    try {
      const stats = await restoreFullBackup(pastedJsonText.trim());
      setRestoreModalInfo({ stats, fileName: 'Panodan Yapıştırılan Yedek' });
      setShowPasteModal(false);
      setPastedJsonText('');
    } catch (err) {
      setRestoreError(err.message);
    } finally {
      setIsPastingRestore(false);
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const stats = await restoreFullBackup(text);
        setRestoreModalInfo({ stats, fileName: file.name });
        setRestoreError(null);
      } catch (err) {
        setRestoreError(err.message);
        setRestoreModalInfo(null);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setMigrationStatus('running');
    setShowMigrationModal(true);
    setMigrationLogs([]);

    try {
      await migrateAllLocalDataToSupabase((msg, logs) => {
        setMigrationLogs([...logs]);
      });
      setMigrationStatus('success');
    } catch (err) {
      setMigrationStatus('error');
      setMigrationLogs(prev => [...prev, `❌ Hata: ${err.message}`]);
    } finally {
      setIsMigrating(false);
    }
  }; // 'curriculum', 'users', 'matrix', 'summaries', 'homeworks'
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
      background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), var(--color-bg)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'var(--color-text)',
      padding: '1.5rem 1rem 5rem 1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* TOP CONTROL CENTER HEADER */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.5rem',
          padding: '1.25rem 1.75rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              border: '2px solid var(--color-surface)',
              flexShrink: 0
            }}>
              <ShieldCheck size={26} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  Admin Kontrol Merkezi
                </h1>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                  PRO CONTROL
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                Müfredat Hiyerarşisi, Kullanıcı Yetkilendirmeleri, Öğretmen-Öğrenci Eşleşmeleri ve Sistem Yönetimi
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              title="Tüm verilerin (66 sınav, sorular, kullanıcılar, ödevler) eksiksiz .json yedeğini bilgisayara indirir"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.55rem 1rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: isBackingUp ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <Download size={15} /> {isBackingUp ? 'İndiriliyor...' : '📥 Tam Yedeği İndir (.JSON)'}
            </button>

            <label
              title="Daha önce indirilen .json yedeğini sisteme eksiksiz geri yükler"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.55rem 1rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={15} /> 📤 Dosya Yükle (.JSON)
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={() => { setShowPasteModal(true); setRestoreError(null); }}
              title="Kopyalanan JSON çıktısını direkt yapıştırarak geri yükler"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.55rem 1rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#fff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <ClipboardCheck size={15} /> 📋 JSON Yapıştır & Yükle
            </button>

            <button
              onClick={handleStartMigration}
              disabled={isMigrating}
              title="Tüm yerel verileri yeni Supabase veritabanına otomatik aktarır"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0.55rem 1.15rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: isMigrating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <UploadCloud size={16} /> {isMigrating ? 'Aktarılıyor...' : '🚀 Yeni Supabase’e Aktar'}
            </button>
            {pendingTeachers.length > 0 && (
              <button
                onClick={() => setActiveTab('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.85rem',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
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
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
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
            { label: 'Kayıtlı Kullanıcı', value: `${users.length} Kişi`, sub: `${students.length} Öğrenci · ${teachers.length} Öğretmen`, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
            { label: 'Öğrenci Sayısı', value: `${students.length} Öğrenci`, sub: unassignedStudents.length > 0 ? `⚠️ ${unassignedStudents.length} Atanmamış` : '✅ Tümü Atanmış', icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },
            { label: 'Aktif Öğretmen', value: `${teachers.length} Öğretmen`, sub: pendingTeachers.length > 0 ? `⏳ ${pendingTeachers.length} Onay Bekliyor` : 'Tüm Kayıtlar Aktif', icon: UserCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
            { label: 'Müfredat Kapsamı', value: `${totalGrades} Sınıf · ${totalSubjects} Ders`, sub: `${totalUnits} Ünite · ${totalTopics} Konu`, icon: Layers, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' },
            { label: 'Çözülen Sınavlar', value: `${submissions.length} Sınav`, sub: 'Öğrenci Değerlendirmeleri (Görüntüle)', icon: BarChart3, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', onClick: () => setActiveTab('results') },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} onClick={kpi.onClick} style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                cursor: kpi.onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s ease'
              }}>
                <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: kpi.bg, color: kpi.color, border: `1px solid ${kpi.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{kpi.label}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.2 }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.72rem', color: kpi.sub.includes('⚠️') || kpi.sub.includes('⏳') ? '#f59e0b' : 'var(--color-text-muted)', fontWeight: 600 }}>{kpi.sub}</span>
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
          background: 'var(--color-surface)',
          padding: '0.45rem',
          borderRadius: '1.25rem',
          border: '1.5px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'curriculum', label: 'Müfredat Hiyerarşisi', icon: FolderTree, count: `${totalGrades} Sınıf` },
            { id: 'users', label: 'Kullanıcılar & Onaylar', icon: Users, count: `${users.length}`, alert: pendingTeachers.length },
            { id: 'matrix', label: 'Öğretmen & Öğrenci Eşleşmeleri', icon: GraduationCap, count: `${teachers.length} Öğretmen`, alert: unassignedStudents.length },
            { id: 'summaries', label: 'Ders Özetleri Modülü', icon: BookOpen, count: 'Editör' },
            { id: 'homeworks', label: 'Ödev Takip Merkezi', icon: BarChart3, count: 'Rapor' },
            { id: 'results', label: 'Tüm Sınav & Test Sonuçları', icon: Award, count: `${submissions.length} Sonuç` },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '0.9rem',
                  border: active ? '1.5px solid rgba(99, 102, 241, 0.4)' : '1.5px solid transparent',
                  background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: active ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={16} color={active ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                <span>{tab.label}</span>
                {tab.count && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 99,
                    background: active ? 'rgba(99, 102, 241, 0.25)' : 'var(--color-surface-hover)',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                  }}>
                    {tab.count}
                  </span>
                )}
                {Boolean(tab.alert) && (
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    boxShadow: '0 0 8px #f59e0b'
                  }} />
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
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.5rem',
              padding: '1.25rem',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
            }}>
              <SummaryManagerPage />
            </div>
          )}
          {activeTab === 'homeworks' && <AdminHomeworkTracker />}
        </div>


        
        {/* ══════════ RESTORE RESULT MODAL ══════════ */}
        {/* PASTE JSON MODAL */}
      {showPasteModal && (
        <div id="paste-json-modal" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '2px solid #0ea5e9',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '650px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '1rem', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck size={24} color="#0ea5e9" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    JSON Metnini Yapıştırarak Geri Yükle
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Supabase'den veya başka bir kaynaktan kopyaladığınız JSON metnini buraya yapıştırın.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {restoreError && (
              <div style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}>
                ⚠️ {restoreError}
              </div>
            )}

            <textarea
              placeholder='Kopyaladığınız JSON metnini buraya yapıştırın (Ctrl + V)...'
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              rows={10}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.85rem',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowPasteModal(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                İptal
              </button>
              <button
                onClick={handleRestoreFromPastedText}
                disabled={isPastingRestore || !pastedJsonText.trim()}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: (isPastingRestore || !pastedJsonText.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                {isPastingRestore ? 'Yükleniyor...' : '📥 Verileri Yükle & Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreModalInfo && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div style={{
              background: 'var(--color-surface, #ffffff)',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              borderRadius: '1.5rem', width: '100%', maxWidth: '520px',
              padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '1rem',
                  background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <CheckCheck size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Yedek Başarıyla Geri Yüklendi!
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Dosya: <strong>{restoreModalInfo.fileName}</strong>
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface-hover, #f8fafc)',
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: '1rem', padding: '1rem',
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem'
              }}>
                <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: '0.6rem', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Sınav & Testler</span>
                  <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{restoreModalInfo.stats.submissionCount} Adet</strong>
                </div>
                <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: '0.6rem', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Kullanıcı Hesapları</span>
                  <strong style={{ fontSize: '1.1rem', color: '#3b82f6' }}>{restoreModalInfo.stats.userCount} Kişi</strong>
                </div>
                <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: '0.6rem', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Soru Bankası</span>
                  <strong style={{ fontSize: '1.1rem', color: '#8b5cf6' }}>{restoreModalInfo.stats.questionCount} Soru</strong>
                </div>
                <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: '0.6rem', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Ödevler & Kitaplar</span>
                  <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{restoreModalInfo.stats.homeworkCount + restoreModalInfo.stats.bookCount} Adet</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '0.65rem 1.35rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  🔄 Sayfayı Yenile & Verileri Gör
                </button>
              </div>
            </div>
          </div>
        )}

        {restoreError && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div style={{
              background: 'var(--color-surface, #ffffff)',
              border: '1.5px solid #ef4444', borderRadius: '1.5rem',
              width: '100%', maxWidth: '450px', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontWeight: 900 }}>Geri Yükleme Hatası</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)' }}>{restoreError}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setRestoreError(null)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ MIGRATION PROGRESS MODAL ══════════ */}
        {showMigrationModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div style={{
              background: 'var(--color-surface, #ffffff)',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              borderRadius: '1.5rem', width: '100%', maxWidth: '600px',
              padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '0.75rem',
                    background: migrationStatus === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: migrationStatus === 'success' ? '#10b981' : '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {migrationStatus === 'success' ? <CheckCircle size={22} /> : <UploadCloud size={22} />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      {migrationStatus === 'success' ? 'Aktarım Başarıyla Tamamlandı!' : 'Yeni Supabase’e Veri Aktarımı'}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Tarayıcınızdaki yerel veriler yeni veritabanına eşitleniyor
                    </p>
                  </div>
                </div>
                {!isMigrating && (
                  <button onClick={() => setShowMigrationModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Progress Console */}
              <div style={{
                background: '#0f172a', borderRadius: '1rem', padding: '1rem',
                maxHeight: '260px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem',
                color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.4rem'
              }}>
                {migrationLogs.map((l, i) => (
                  <div key={i} style={{ color: l.includes('❌') ? '#f87171' : l.includes('✅') ? '#4ade80' : l.includes('⚠️') ? '#fbbf24' : '#94a3b8' }}>
                    {l}
                  </div>
                ))}
                {isMigrating && (
                  <div style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={13} className="spin" /> İşleniyor, lütfen bekleyin...
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                {migrationStatus === 'error' && (
                  <button
                    onClick={handleStartMigration}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                      border: 'none', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer'
                    }}
                  >
                    Tekrar Dene
                  </button>
                )}
                {!isMigrating && (
                  <button
                    onClick={() => setShowMigrationModal(false)}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                      background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text)',
                      border: '1px solid var(--color-border)', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer'
                    }}
                  >
                    Kapat
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. MÜFREDAT HİYERARŞİSİ & YÖNETİMİ COMPONENT (PRO MILLER FLOW)
═══════════════════════════════════════════════════════════ */
function CurriculumManager() {
  const { data, addGrade, addSubject, addUnit, addTopic, updateItem, deleteItem, bulkAddCurriculum } = useCurriculum();
  
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [newItemName, setNewItemName] = useState('');
  const [jsonModal, setJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [editModal, setEditModal] = useState({ open: false, type: '', typeLabel: '', id: '', name: '' });

  const sortedGrades = useMemo(() => [...(data.grades || [])].sort(naturalSort), [data.grades]);
  const filteredSubjects = useMemo(() => data.subjects.filter(s => s.gradeId === selectedGrade).sort(naturalSort), [data.subjects, selectedGrade]);
  const filteredUnits = useMemo(() => data.units.filter(u => u.subjectId === selectedSubject).sort(naturalSort), [data.units, selectedSubject]);
  const filteredTopics = useMemo(() => data.topics.filter(t => t.unitId === selectedUnit).sort(naturalSort), [data.topics, selectedUnit]);

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
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📍 Aktif Yol:
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedGrade ? '#3b82f6' : 'var(--color-text-muted)', background: selectedGrade ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-hover)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedGrade ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--color-border)' }}>
            {currentGradeObj?.name || 'Sınıf Seçilmedi'}
          </span>
          {selectedGrade && (
            <>
              <ChevronRight size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedSubject ? '#0284c7' : 'var(--color-text-muted)', background: selectedSubject ? 'rgba(2, 132, 199, 0.15)' : 'var(--color-surface-hover)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedSubject ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid var(--color-border)' }}>
                {currentSubjectObj?.name || 'Ders Seçilmedi'}
              </span>
            </>
          )}
          {selectedSubject && (
            <>
              <ChevronRight size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedUnit ? '#8b5cf6' : 'var(--color-text-muted)', background: selectedUnit ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-surface-hover)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: selectedUnit ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--color-border)' }}>
                {currentUnitObj?.name || 'Ünite Seçilmedi'}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => setJsonModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1.5px solid rgba(59, 130, 246, 0.35)',
              color: '#3b82f6',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s'
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
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <FolderTree size={18} /> 1. Sınıflar / Düzeyler
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.15rem 0.55rem', borderRadius: 99, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              {sortedGrades.length} Sınıf
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
            {sortedGrades.map(grade => {
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
                    background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--color-surface-hover)',
                    border: isActive ? '1.5px solid #4338ca' : '1px solid var(--color-border)',
                    color: isActive ? '#ffffff' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.25)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{grade.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--color-surface)', color: isActive ? '#ffffff' : 'var(--color-text-secondary)', padding: '0.15rem 0.45rem', borderRadius: 99, border: isActive ? 'none' : '1px solid var(--color-border)' }}>
                      {count} Ders
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModal({ open: true, type: 'grades', typeLabel: 'Sınıf / Düzey', id: grade.id, name: grade.name });
                      }}
                      style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                      title="Sınıfı Düzenle"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem('grades', grade.id); }}
                      style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      title="Sınıfı Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight size={14} color={isActive ? '#ffffff' : 'var(--color-text-muted)'} />
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('grade', null, val); e.target.elements.addInput.value = ''; }}
            style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}
          >
            <input
              name="addInput"
              type="text"
              placeholder="+ Sınıf ekle (virgülle çoklu)"
              style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
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
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <BookOpen size={18} /> 2. Dersler
            </div>
            {selectedGrade && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', padding: '0.15rem 0.55rem', borderRadius: 99, border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                {filteredSubjects.length} Ders
              </span>
            )}
          </div>

          {selectedGrade ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredSubjects.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu sınıfa ait henüz ders eklenmemiş.</p>
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
                          background: isActive ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'var(--color-surface-hover)',
                          border: isActive ? '1.5px solid #0369a1' : '1px solid var(--color-border)',
                          color: isActive ? '#ffffff' : 'var(--color-text)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 4px 14px rgba(14, 165, 233, 0.25)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{subject.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--color-surface)', color: isActive ? '#ffffff' : 'var(--color-text-secondary)', padding: '0.15rem 0.45rem', borderRadius: 99, border: isActive ? 'none' : '1px solid var(--color-border)' }}>
                            {unitCount} Ünite
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModal({ open: true, type: 'subjects', typeLabel: 'Ders', id: subject.id, name: subject.name });
                            }}
                            style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                            title="Dersi Düzenle"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteItem('subjects', subject.id); }}
                            style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            title="Dersi Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={14} color={isActive ? '#ffffff' : 'var(--color-text-muted)'} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('subject', selectedGrade, val); e.target.elements.addInput.value = ''; }}
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Ders ekle (Örn: Matematik, Fen)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir sınıf seçin.</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: UNITS */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b5cf6', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <Layers size={18} /> 3. Üniteler
            </div>
            {selectedSubject && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '0.15rem 0.55rem', borderRadius: 99, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                {filteredUnits.length} Ünite
              </span>
            )}
          </div>

          {selectedSubject ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredUnits.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu derse ait henüz ünite eklenmemiş.</p>
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
                          background: isActive ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'var(--color-surface-hover)',
                          border: isActive ? '1.5px solid #6d28d9' : '1px solid var(--color-border)',
                          color: isActive ? '#ffffff' : 'var(--color-text)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 4px 14px rgba(124, 58, 237, 0.25)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{unit.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--color-surface)', color: isActive ? '#ffffff' : 'var(--color-text-secondary)', padding: '0.15rem 0.45rem', borderRadius: 99, border: isActive ? 'none' : '1px solid var(--color-border)' }}>
                            {topicCount} Konu
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModal({ open: true, type: 'units', typeLabel: 'Ünite', id: unit.id, name: unit.name });
                            }}
                            style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#c084fc'}
                            title="Üniteyi Düzenle"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteItem('units', unit.id); }}
                            style={{ background: 'none', border: 'none', color: isActive ? '#ffffff' : 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            title="Üniteyi Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={14} color={isActive ? '#ffffff' : 'var(--color-text-muted)'} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); const val = e.target.elements.addInput.value; handleAdd('unit', selectedSubject, val); e.target.elements.addInput.value = ''; }}
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Ünite ekle (Örn: 1. Ünite - Çarpanlar)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir ders seçin.</p>
            </div>
          )}
        </div>

        {/* COLUMN 4: TOPICS */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 460,
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f43f5e', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <FileText size={18} /> 4. Konular
            </div>
            {selectedUnit && (
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', padding: '0.15rem 0.55rem', borderRadius: 99, border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                {filteredTopics.length} Konu
              </span>
            )}
          </div>

          {selectedUnit ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, paddingRight: 4 }}>
                {filteredTopics.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto', textAlign: 'center' }}>Bu üniteye ait henüz konu eklenmemiş.</p>
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
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>{topic.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => setEditModal({ open: true, type: 'topics', typeLabel: 'Konu', id: topic.id, name: topic.name })}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                          title="Konuyu Düzenle"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => deleteItem('topics', topic.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          title="Konuyu Sil"
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
                style={{ display: 'flex', gap: 6, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}
              >
                <input
                  name="addInput"
                  type="text"
                  placeholder="+ Konu ekle (virgülle çoklu)"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
              <ArrowRight size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Lütfen soldan bir ünite seçin.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: MÜFREDAT ELEMANINI DÜZENLE */}
      {editModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 420,
            border: '1.5px solid var(--color-border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.1rem' }}>
                  {editModal.typeLabel} Düzenle
                </h3>
              </div>
              <button onClick={() => setEditModal({ open: false, type: '', typeLabel: '', id: '', name: '' })} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editModal.name.trim()) return;
                await updateItem(editModal.type, editModal.id, editModal.name.trim());
                setEditModal({ open: false, type: '', typeLabel: '', id: '', name: '' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {editModal.typeLabel} Adı
                </label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  autoFocus
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, type: '', typeLabel: '', id: '', name: '' })}
                  style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOPLU JSON MÜFREDAT YÜKLE */}
      {jsonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 620,
            border: '1.5px solid var(--color-border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.15rem' }}>Toplu JSON Müfredat Ekle</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Sınıf, Ders, Ünite ve Konu hiyerarşisini JSON formatında içe aktarın.</p>
              </div>
              <button onClick={() => setJsonModal(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-hover)', padding: '0.4rem 0.75rem', borderRadius: '0.65rem', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>JSON Şablonu</span>
              <button
                onClick={() => setJsonText('[\n  {\n    "grade": "5. Sınıf",\n    "subjects": [\n      {\n        "name": "Matematik",\n        "units": [\n          {\n            "name": "1. Ünite - Doğal Sayılar",\n            "topics": [\n              "Doğal Sayıların Okunuşu ve Yazılışı",\n              "Milyonlar Bölüğü"\n            ]\n          }\n        ]\n      }\n    ]\n  }\n]')}
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', fontWeight: 800, cursor: 'pointer' }}
              >
                Örnek Şablonu Doldur
              </button>
            </div>

            <textarea
              rows={10}
              placeholder="Buraya JSON yapıştırın..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '0.85rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button onClick={() => setJsonModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>İptal</button>
              <button onClick={handleJsonImport} style={{ padding: '0.55rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)' }}>İçe Aktar</button>
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
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <Clock size={22} color="#f59e0b" />
            <h3 style={{ margin: 0, color: '#f59e0b', fontWeight: 900, fontSize: '1rem' }}>
              Onay Bekleyen Öğretmen Kayıtları ({pendingTeachers.length})
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {pendingTeachers.map(teacher => (
              <div key={teacher.id} style={{
                background: 'var(--color-surface)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '0.85rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.88rem' }}>{teacher.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📧 {teacher.email}</div>
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
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
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
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
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
                background: userFilter === f.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-hover)',
                color: userFilter === f.id ? '#ffffff' : 'var(--color-text-secondary)',
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
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="İsim veya e-posta ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
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
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
        overflowX: 'auto',
        padding: 0
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Kullanıcı</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta / Kullanıcı Adı</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Rol</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Bağlı Öğretmen</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Durum</th>
              <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const roleBadge = user.role === 'admin' 
                ? { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', label: 'Yönetici' }
                : user.role === 'teacher'
                ? { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', label: 'Öğretmen' }
                : { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)', label: 'Öğrenci' };

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}>
                  {/* User Initial + Name */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: roleBadge.bg, color: roleBadge.text, border: `1px solid ${roleBadge.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.88rem' }}>{user.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
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
                          style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid var(--color-border-input)', fontSize: '0.75rem', background: currentGradeVal ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-hover)', color: currentGradeVal ? '#3b82f6' : 'var(--color-text-muted)', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>— Sınıf Seçin</option>
                          {curData.grades.map(g => (
                            <option key={g.id} value={g.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>{g.name}</option>
                          ))}
                        </select>
                      );
                    })() : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
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
                        style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid var(--color-border-input)', fontSize: '0.75rem', background: user.teacherId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: user.teacherId ? '#3b82f6' : '#f59e0b', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>— Atanmamış</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>👨‍🏫 {t.name}</option>
                        ))}
                      </select>
                    ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>

                  {/* Password Pill */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Key size={11} /> {user.password || '123456'}
                    </span>
                  </td>

                  {/* Status (Teacher Approval) */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {user.role === 'teacher' ? (
                      user.isApproved !== false ? (
                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Onaylı
                        </span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} /> Bekliyor
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.78rem' }}>Aktif</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => handleOpenModal(user)}
                        style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', cursor: 'pointer' }}
                        title="Düzenle"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer' }}
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
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-muted)' }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 440,
            border: '1.5px solid var(--color-border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#f43f5e" />
                <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.1rem' }}>
                  {editingUserId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>E-Posta / Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder="Örn: ahmet@okul.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Rol</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value, gradeId: e.target.value === 'student' ? formData.gradeId : '', teacherId: e.target.value === 'student' ? formData.teacherId : '' })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="student" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Öğrenci</option>
                    <option value="teacher" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Öğretmen</option>
                    <option value="admin" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Yönetici (Admin)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Giriş Şifresi</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              {formData.role === 'student' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Sınıfı</label>
                    <select
                      value={formData.gradeId}
                      onChange={e => setFormData({ ...formData, gradeId: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                      required
                    >
                      <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Sınıf Seçiniz</option>
                      {curData.grades.map(g => <option key={g.id} value={g.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>{g.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Bağlı Öğretmen</label>
                    <select
                      value={formData.teacherId}
                      onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Bağlı Öğretmen Seçiniz (Opsiyonel)</option>
                      {teachers.map(t => <option key={t.id} value={t.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>{t.name} ({t.email})</option>)}
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>İptal</button>
                <button type="submit" style={{ padding: '0.55rem 1.4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.3)' }}>Kaydet</button>
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
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users color="var(--color-primary)" size={22} /> Öğretmen & Öğrenci Eşleşme Dağılımı
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Hangi öğretmenin hangi öğrencileri olduğunu görün ve anlık olarak öğrenci aktarımı yapın.
          </p>
        </div>
        <div style={{ position: 'relative', minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Öğrenci veya öğretmen ara..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* UNASSIGNED STUDENTS ALERT CARD */}
      {unassignedStudents.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Henüz Öğretmeni Atanmamış Öğrenciler ({unassignedStudents.length})
            </h4>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.2)' }}>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Şifre</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Öğretmen Ata</th>
                </tr>
              </thead>
              <tbody>
                {unassignedStudents.map(std => (
                  <tr key={std.id} style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: 'var(--color-text)', fontSize: '0.85rem' }}>{std.name}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 700 }}>{getGradeName(std.gradeId)}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>{std.email}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.15rem 0.45rem', borderRadius: 4, fontFamily: 'monospace', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                        🔑 {std.password || '123456'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                      <select
                        value=""
                        onChange={e => handleAssignTeacher(std.id, e.target.value)}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '0.55rem', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: '0.75rem', background: 'var(--color-surface)', fontWeight: 800, color: '#f59e0b', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Öğretmen Seçiniz...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>👨‍🏫 {t.name}</option>
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
          background: 'var(--color-surface)',
          border: '1.5px dashed var(--color-border-input)',
          borderRadius: '1.25rem',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
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
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
                      {teacher.name?.charAt(0) || 'Ö'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>{teacher.name}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>📧 {teacher.email}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.3rem 0.85rem', borderRadius: 99 }}>
                      🎓 {teacherStudents.length} Bağlı Öğrenci
                    </span>
                  </div>
                </div>

                {teacherStudents.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>Bu öğretmene henüz bağlı öğrenci bulunmuyor.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci Adı</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Sınıfı</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>E-Posta</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Giriş Şifresi</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Çözülen Sınav</th>
                          <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Öğretmeni Değiştir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherStudents.map(std => {
                          const solvedCount = submissions.filter(sub => sub.studentId === std.id).length;
                          return (
                            <tr key={std.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: 'var(--color-text)', fontSize: '0.85rem' }}>{std.name}</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.55rem', borderRadius: 99, fontWeight: 800, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                  {getGradeName(std.gradeId)}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>{std.email}</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.15rem 0.45rem', borderRadius: 4, fontFamily: 'monospace', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                  🔑 {std.password || '123456'}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: 900, color: solvedCount > 0 ? '#10b981' : 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                {solvedCount}
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                <select
                                  value={std.teacherId || ''}
                                  onChange={e => handleAssignTeacher(std.id, e.target.value)}
                                  style={{ padding: '0.35rem 0.6rem', borderRadius: '0.55rem', border: '1px solid var(--color-border-input)', fontSize: '0.75rem', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                                >
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>👨‍🏫 {t.name}</option>
                                  ))}
                                  <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>Atanmamış Yap</option>
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
