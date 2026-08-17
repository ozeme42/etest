import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { 
  Plus, Edit, Trash2, ArrowLeft, Target, ChevronRight, Layers, 
  FileText, CheckCircle, Search, Sparkles, BookOpen, Users, 
  Calendar, Clock, Check, X, ShieldCheck, Zap, Compass, Filter, 
  ArrowUpRight, BookmarkCheck, Award, Eye, Flame, Share2
import './StudyPlanManager.css';

// Curated Ready-Made Templates for Teachers
const PRESET_TEMPLATES = [
  {
    id: 'lgs_math',
    title: '8. Sınıf LGS Matematik Tam Müfredat Yol Haritası',
    desc: 'LGS sınavına hazırlık için tüm ünite ve kazanımları kapsayan eksiksiz çalışma programı.',
    category: 'LGS / 8. Sınıf',
    subjects: [
      {
        id: 'sub_m1',
        name: '1. Ünite: Çarpanlar ve Katlar & Üslü İfadeler',
        dueDate: '',
        topics: [
          { id: 'top_m1_1', name: 'Çarpanlar ve Asal Çarpanlara Ayırma', day: '1' },
          { id: 'top_m1_2', name: 'EBOB ve EKOK Problemleri', day: '2' },
          { id: 'top_m1_3', name: 'Tam Sayıların Tam Sayı Kuvvetleri', day: '3' },
          { id: 'top_m1_4', name: 'Üslü İfadelerle Çarpma ve Bölme', day: '4' },
          { id: 'top_m1_5', name: 'Ondalık Gösterimlerin Çözümlenmesi & Bilimsel Gösterim', day: '5' }
        ]
      },
      {
        id: 'sub_m2',
        name: '2. Ünite: Kareköklü İfadeler & Veri Analizi',
        dueDate: '',
        topics: [
          { id: 'top_m2_1', name: 'Tam Kare Sayılar ve Karekök Kavramı', day: '6' },
          { id: 'top_m2_2', name: 'Kareköklü İfadelerde Çarpma ve Bölme', day: '7' },
          { id: 'top_m2_3', name: 'Kareköklü İfadelerde Toplama ve Çıkarma', day: '8' },
          { id: 'top_m2_4', name: 'Gerçek Sayılar (İrrasyonel & Rasyonel)', day: '9' },
          { id: 'top_m2_5', name: 'Çizgi, Sütun ve Daire Grafiği Yorumlama', day: '10' }
        ]
      },
      {
        id: 'sub_m3',
        name: '3. Ünite: Basit Olayların Olasılığı & Cebirsel İfadeler',
        dueDate: '',
        topics: [
          { id: 'top_m3_1', name: 'Olasılık Kavramı ve Hesaplamaları', day: '11' },
          { id: 'top_m3_2', name: 'Cebirsel İfadeler ve Modelleme', day: '12' },
          { id: 'top_m3_3', name: 'Özdeşlikler (İki Kare Farkı & Tam Kare)', day: '13' },
          { id: 'top_m3_4', name: 'Cebirsel İfadeleri Çarpanlara Ayırma', day: '14' }
        ]
      },
      {
        id: 'sub_m4',
        name: '4. Ünite: Doğrusal Denklemler & Eşitsizlikler',
        dueDate: '',
        topics: [
          { id: 'top_m4_1', name: 'Birinci Dereceden Bir Bilinmeyenli Denklemler', day: '15' },
          { id: 'top_m4_2', name: 'Koordinat Sistemi ve Doğrusal İlişki Grafikleri', day: '16' },
          { id: 'top_m4_3', name: 'Doğrunun Eğimi ve Yorumlanması', day: '17' },
          { id: 'top_m4_4', name: 'Birinci Dereceden Bir Bilinmeyenli Eşitsizlikler', day: '18' }
        ]
      },
      {
        id: 'sub_m5',
        name: '5. Ünite: Üçgenler & Eşlik ve Benzerlik',
        dueDate: '',
        topics: [
          { id: 'top_m5_1', name: 'Üçgende Kenarortay, Açıortay ve Yükseklik', day: '19' },
          { id: 'top_m5_2', name: 'Üçgen Eşitsizliği ve Kenar-Açı Bağıntıları', day: '20' },
          { id: 'top_m5_3', name: 'Pisagor Bağıntısı ve Özel Üçgenler', day: '21' },
          { id: 'top_m5_4', name: 'Benzerlik Oranı ve Eşlik Bağıntıları', day: '22' }
        ]
      },
      {
        id: 'sub_m6',
        name: '6. Ünite: Dönüşüm Geometrisi & Geometrik Cisimler',
        dueDate: '',
        topics: [
          { id: 'top_m6_1', name: 'Öteleme ve Yansıma Hareketleri', day: '23' },
          { id: 'top_m6_2', name: 'Dik Prizmalar ve Dik Dairesel Silindir', day: '24' },
          { id: 'top_m6_3', name: 'Dik Piramit ve Dik Koni', day: '25' }
        ]
      }
    ]
  },
  {
    id: 'lgs_fen',
    title: '8. Sınıf LGS Fen Bilimleri Adım Adım Kamp',
    desc: 'LGS Fen Bilimleri dersinin 7 ünitesini aşama aşama kavramayı sağlayan özel koçluk planı.',
    category: 'LGS / 8. Sınıf',
    subjects: [
      {
        id: 'sub_f1',
        name: '1. Ünite: Mevsimler ve İklim',
        dueDate: '',
        topics: [
          { id: 'top_f1_1', name: 'Mevsimlerin Oluşumu ve Eksen Eğikliği', day: '1' },
          { id: 'top_f1_2', name: 'İklim ve Hava Hareketleri, Küresel İklim Değişikliği', day: '2' }
        ]
      },
      {
        id: 'sub_f2',
        name: '2. Ünite: DNA ve Genetik Kod',
        dueDate: '',
        topics: [
          { id: 'top_f2_1', name: 'DNA ve Genetik Kod Yapısı, Nükleotidler', day: '3' },
          { id: 'top_f2_2', name: 'Kalıtım, Tek Karakter Çaprazlamaları ve Akraba Evliliği', day: '4' },
          { id: 'top_f2_3', name: 'Mutasyon ve Modifikasyon', day: '5' },
          { id: 'top_f2_4', name: 'Adaptasyon ve Doğal Seçilim', day: '6' },
          { id: 'top_f2_5', name: 'Biyoteknoloji ve Genetik Mühendisliği', day: '7' }
        ]
      },
      {
        id: 'sub_f3',
        name: '3. Ünite: Basınç',
        dueDate: '',
        topics: [
          { id: 'top_f3_1', name: 'Katı Basıncı ve Etki Eden Değişkenler', day: '8' },
          { id: 'top_f3_2', name: 'Sıvı Basıncı ve Pascal Prensibi', day: '9' },
          { id: 'top_f3_3', name: 'Açık Hava ve Gaz Basıncı Uygulamaları', day: '10' }
        ]
      },
      {
        id: 'sub_f4',
        name: '4. Ünite: Madde ve Endüstri',
        dueDate: '',
        topics: [
          { id: 'top_f4_1', name: 'Periyodik Sistem ve Elementlerin Sınıflandırılması', day: '11' },
          { id: 'top_f4_2', name: 'Fiziksel ve Kimyasal Değişimler', day: '12' },
          { id: 'top_f4_3', name: 'Kimyasal Tepkimeler ve Kütlenin Korunumu', day: '13' },
          { id: 'top_f4_4', name: 'Asitler, Bazlar ve Asit Yağmurları', day: '14' },
          { id: 'top_f4_5', name: 'Maddenin Isı ile Etkileşimi (Özısı, Hal Değişimi)', day: '15' }
        ]
      },
      {
        id: 'sub_f5',
        name: '5. Ünite: Basit Makineler',
        dueDate: '',
        topics: [
          { id: 'top_f5_1', name: 'Makaralar (Sabit, Hareketli ve Palanga)', day: '16' },
          { id: 'top_f5_2', name: 'Kaldıraçlar ve Eğik Düzlem', day: '17' },
          { id: 'top_f5_3', name: 'Çıkrık, Dişli Çarklar, Kasnaklar ve Vida', day: '18' }
        ]
      }
    ]
  },
  {
    id: 'paragraf_kamp',
    title: '30 Günde LGS / TYT Paragraf ve Sözel Mantık Kampı',
    desc: 'Okuduğunu anlama, çıkarım yapma, sözel mantık ve hızlı soru çözme stratejileri.',
    category: 'Türkçe / Paragraf',
    subjects: [
      {
        id: 'sub_p1',
        name: '1. Hafta: Sözcük ve Cümlede Anlam Temelleri',
        dueDate: '',
        topics: [
          { id: 'top_p1_1', name: 'Gün 1: Sözcükte Anlam, Mecaz & Terim Anlamlar', day: '1' },
          { id: 'top_p1_2', name: 'Gün 2: Deyimler, Atasözleri ve Söz Grupları', day: '2' },
          { id: 'top_p1_3', name: 'Gün 3: Cümlenin Anlamı ve Çıkarım Yapma', day: '3' },
          { id: 'top_p1_4', name: 'Gün 4: Neden-Sonuç, Amaç-Sonuç ve Koşul Cümleleri', day: '4' },
          { id: 'top_p1_5', name: 'Gün 5: Örtülü Anlam ve Cümle Birleştirme', day: '5' }
        ]
      },
      {
        id: 'sub_p2',
        name: '2. Hafta: Paragrafta Yapı ve Anlatım Teknikleri',
        dueDate: '',
        topics: [
          { id: 'top_p2_1', name: 'Gün 6: Paragrafın Ana Düşüncesi ve Başlık', day: '6' },
          { id: 'top_p2_2', name: 'Gün 7: Yardımcı Düşünceler ve Değinilmemiştir Soruları', day: '7' },
          { id: 'top_p2_3', name: 'Gün 8: Paragrafta Yapı: Giriş, Gelişme, Sonuç', day: '8' },
          { id: 'top_p2_4', name: 'Gün 9: Akışı Bozan Cümle & Paragrafı İkiye Bölme', day: '9' },
          { id: 'top_p2_5', name: 'Gün 10: Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları', day: '10' }
        ]
      },
      {
        id: 'sub_p3',
        name: '3. Hafta: Sözel Mantık ve Grafik/Görsel Yorumlama',
        dueDate: '',
        topics: [
          { id: 'top_p3_1', name: 'Gün 11: Tablo ve Grafik Yorumlama Taktikleri', day: '11' },
          { id: 'top_p3_2', name: 'Gün 12: İnfografik ve Görsel Okuma', day: '12' },
          { id: 'top_p3_3', name: 'Gün 13: Sıralama ve Yerleştirme Mantık Soruları', day: '13' },
          { id: 'top_p3_4', name: 'Gün 14: Şifreleme ve Çok Değişkenli Tablolar', day: '14' },
          { id: 'top_p3_5', name: 'Gün 15: Karışık Sözel Mantık Denemesi', day: '15' }
        ]
      }
    ]
  }
];

export default function StudyPlanManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { 
    studyPlans: allStudyPlans, 
    addStudyPlan, 
    deleteStudyPlan,
    studyAssignments,
    addStudyAssignment
  } = useStudyPlan();

  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';
  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // Filter study plans so a teacher ONLY sees study plans they added / created themselves
  const studyPlans = useMemo(() => {
    const plans = allStudyPlans || [];
    if (isAdmin) return plans; // Admin can see all plans
    if (isTeacher) {
      const teacherId = String(currentUser?.id || '');
      const teacherUsername = String(currentUser?.username || '').toLowerCase();
      const teacherEmail = String(currentUser?.email || '').toLowerCase();
      const teacherName = String(currentUser?.name || '').toLowerCase();

      return plans.filter(p => {
        const createdBy = String(p.createdBy || '');
        const pTeacherId = String(p.teacherId || '');
        const pTeacherUsername = String(p.teacherUsername || '').toLowerCase();
        const pTeacherName = String(p.teacherName || '').toLowerCase();
        const pTeacherEmail = String(p.teacherEmail || '').toLowerCase();

        return (
          (teacherId && (createdBy === teacherId || pTeacherId === teacherId)) ||
          (teacherUsername && (createdBy.toLowerCase() === teacherUsername || pTeacherUsername === teacherUsername || pTeacherId.toLowerCase() === teacherUsername)) ||
          (teacherEmail && (pTeacherEmail === teacherEmail || createdBy.toLowerCase() === teacherEmail)) ||
          (teacherName && (pTeacherName === teacherName))
        );
      });
    }
    return plans;
  }, [allStudyPlans, isTeacher, isAdmin, currentUser]);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetPlanForAssign, setTargetPlanForAssign] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // KPI Calculations
  const totalPlansCount = studyPlans.length;
  const totalUnitsCount = useMemo(() => {
    return studyPlans.reduce((sum, p) => sum + (p.subjects?.length || 0), 0);
  }, [studyPlans]);

  const totalTopicsCount = useMemo(() => {
    return studyPlans.reduce((sum, p) => {
      const pTopics = (p.subjects || []).reduce((sSum, s) => sSum + (s.topics?.length || 0), 0);
      return sum + pTopics;
    }, 0);
  }, [studyPlans]);

  const totalAssignedCount = useMemo(() => {
    const myPlanIds = new Set(studyPlans.map(p => String(p.id)));
    return (studyAssignments || []).filter(a => myPlanIds.has(String(a.planId || a.studyPlanId))).length;
  }, [studyAssignments, studyPlans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return studyPlans.filter(plan => {
      const matchesSearch = (plan.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.subjects || []).some(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [studyPlans, searchQuery]);

  // Create Plan Action
  const handleCreatePlan = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Lütfen yol haritası için bir başlık giriniz.', 'error');
      return;
    }

    const created = await addStudyPlan({
      title: newTitle.trim(),
      description: newDescription.trim(),
      subjects: [],
      createdBy: currentUser?.id || currentUser?.username,
      teacherId: currentUser?.id || currentUser?.username,
      teacherUsername: currentUser?.username,
      teacherName: currentUser?.name || currentUser?.username,
      teacherEmail: currentUser?.email
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    showToast('Yeni yol haritası başarıyla oluşturuldu! ✨');
    if (created?.id) {
      navigate(`/study-plans/${created.id}`);
    }
  };

  // Load Preset Template
  const handleLoadTemplate = async (template) => {
    const created = await addStudyPlan({
      title: template.title,
      description: template.desc || template.description,
      category: template.category,
      subjects: template.subjects,
      createdBy: currentUser?.id || currentUser?.username,
      teacherId: currentUser?.id || currentUser?.username,
      teacherUsername: currentUser?.username,
      teacherName: currentUser?.name || currentUser?.username,
      teacherEmail: currentUser?.email
    });

    showToast(`"${template.title}" şablonu başarıyla yüklendi! 🚀`);
    if (created?.id) {
      navigate(`/study-plans/${created.id}`);
    }
  };

  // Delete Plan Action
  const handleDelete = async (id, title) => {
    if (window.confirm(`"${title}" adlı yol haritasını silmek istediğinize emin misiniz?`)) {
      await deleteStudyPlan(id);
      showToast('Yol haritası başarıyla silindi.');
    }
  };

  // Open Quick Assign Modal
  const openQuickAssign = (plan) => {
    setTargetPlanForAssign(plan);
    // Find currently assigned students for this plan
    const alreadyAssigned = (studyAssignments || [])
      .filter(a => String(a.planId || a.studyPlanId) === String(plan.id))
      .map(a => String(a.studentId));
    setSelectedStudentIds(alreadyAssigned);
    setAssignSearch('');
    setIsAssignModalOpen(true);
  };

  // Save Assignment
  const handleSaveAssignments = async () => {
    if (!targetPlanForAssign) return;

    // Get current assignments for this plan
    const currentAssignments = (studyAssignments || []).filter(
      a => String(a.planId || a.studyPlanId) === String(targetPlanForAssign.id)
    );
    const currentStudentIds = currentAssignments.map(a => String(a.studentId));

    // Newly added students
    const newlyAdded = selectedStudentIds.filter(id => !currentStudentIds.includes(String(id)));

    for (const studentId of newlyAdded) {
      await addStudyAssignment({
        studentId,
        planId: targetPlanForAssign.id,
        studyPlanId: targetPlanForAssign.id,
        teacherId: currentUser?.id || currentUser?.username,
        teacherUsername: currentUser?.username,
        teacherName: currentUser?.name || currentUser?.username,
        completedTopics: []
      });
    }

    showToast(`${newlyAdded.length} yeni öğrenciye yol haritası başarıyla atandı! 🎉`);
    setIsAssignModalOpen(false);
    setTargetPlanForAssign(null);
  };

  return (
    <div className="study-plans-page-container custom-scrollbar">
      
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
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* ── TOP HERO HEADER ── */}
      <div className="study-header-card">
        <div className="study-header-left">
          <button 
            onClick={() => navigate(-1)}
            style={{
              padding: '0.7rem',
              borderRadius: '1rem',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Target size={30} style={{ color: '#818cf8' }} /> Çalışma Planları &amp; Yol Haritaları
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.3))', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.4)', padding: '0.2rem 0.75rem', borderRadius: '1rem', letterSpacing: '0.05em' }}>
                PRO KOÇLUK SİSTEMİ
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.92rem', fontWeight: 600 }}>
              Öğrencileriniz için adım adım konu anlatımı, soru çözme ve çalışma takvimi yol haritaları tasarlayın.
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="study-header-actions">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="study-btn-add-main"
          >
            <Plus size={18} /> Yeni Yol Haritası Ekle
          </button>
        </div>
      </div>

      {/* ── 4 LIVE KPI HERO CARDS (2x2 ON MOBILE) ── */}
      <div className="study-kpi-grid">
        <div className="study-kpi-card">
          <div className="study-kpi-icon" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.35))', color: '#818cf8', border: '1px solid rgba(165,180,252,0.3)' }}>
            <Compass size={26} />
          </div>
          <div>
            <div className="study-kpi-val">{totalPlansCount}</div>
            <div className="study-kpi-lbl">Toplam Yol Haritası</div>
          </div>
        </div>

        <div className="study-kpi-card">
          <div className="study-kpi-icon" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(2,132,199,0.35))', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
            <Layers size={26} />
          </div>
          <div>
            <div className="study-kpi-val">{totalUnitsCount}</div>
            <div className="study-kpi-lbl">Toplam Ünite &amp; Bölüm</div>
          </div>
        </div>

        <div className="study-kpi-card">
          <div className="study-kpi-icon" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.35))', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
            <BookmarkCheck size={26} />
          </div>
          <div>
            <div className="study-kpi-val">{totalTopicsCount}</div>
            <div className="study-kpi-lbl">Konu / Çalışma Adımı</div>
          </div>
        </div>

        <div className="study-kpi-card">
          <div className="study-kpi-icon" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(219,39,119,0.35))', color: '#f472b6', border: '1px solid rgba(244,114,182,0.3)' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="study-kpi-val">{totalAssignedCount}</div>
            <div className="study-kpi-lbl">Öğrenci Görevi</div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & READY PRESETS BAR ── */}
      <div className="study-glass-card study-search-presets-bar">
        
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Yol haritası, ünite veya konu ara..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              borderRadius: '0.85rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid rgba(255, 255, 255, 0.14)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Ready-Made Templates Chips */}
        <div className="study-presets-container">
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={16} style={{ color: '#fbbf24' }} /> Hazır Şablon Yükle:
          </span>
          {PRESET_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => handleLoadTemplate(tmpl)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.45rem 0.85rem',
                borderRadius: '0.75rem',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(165, 180, 252, 0.3)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s'
              }}
              title={tmpl.desc}
            >
              <Zap size={13} style={{ color: '#38bdf8' }} /> {tmpl.category}
            </button>
          ))}
        </div>

      </div>

      {/* ── ROADMAPS GRID ── */}
      {filteredPlans.length > 0 ? (
        <div className="study-roadmaps-grid">
          {filteredPlans.map(plan => {
            const planSubjects = plan.subjects || [];
            const planTopicsCount = planSubjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
            const assignedStudentsCount = (studyAssignments || []).filter(
              a => String(a.planId || a.studyPlanId) === String(plan.id)
            ).length;

            return (
              <div key={plan.id} className="roadmap-card">
                
                {/* Top Row: Category & Badges */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '0.85rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))', border: '1px solid rgba(165,180,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc' }}>
                        <Target size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '0.15rem 0.55rem', borderRadius: '0.45rem', border: '1px solid rgba(56,189,248,0.3)' }}>
                          YOL HARİTASI
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleDelete(plan.id, plan.title)}
                        style={{ padding: '0.45rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.6rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Yol Haritasını Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Plan Title & Desc */}
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.3 }}>
                    {plan.title}
                  </h3>
                  {plan.description && (
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {plan.description}
                    </p>
                  )}

                  {/* Mini Stats Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.85rem', padding: '0.75rem 0.5rem', margin: '1rem 0', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#818cf8' }}>{planSubjects.length}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Ünite</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>{planTopicsCount}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Konu / Adım</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f472b6' }}>{assignedStudentsCount}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Öğrenci</div>
                    </div>
                  </div>

                  {/* Units & Topics Preview */}
                  {planSubjects.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>İÇERİK ÖN İZLEME:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {planSubjects.slice(0, 3).map((subj, idx) => (
                          <span key={subj.id || idx} style={{ fontSize: '0.74rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', padding: '0.2rem 0.55rem', borderRadius: '0.45rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            📚 {subj.name}
                          </span>
                        ))}
                        {planSubjects.length > 3 && (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#c7d2fe', padding: '0.2rem 0.4rem' }}>
                            +{planSubjects.length - 3} ünite daha...
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', padding: '0.5rem 0' }}>
                      Henüz ünite eklenmemiş. İçeriği yönet butonuna tıklayarak ekleyebilirsiniz.
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="roadmap-card-actions">
                  <button
                    onClick={() => openQuickAssign(plan)}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1.5px solid rgba(165, 180, 252, 0.3)',
                      color: '#c7d2fe',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Users size={15} /> Öğrenciye Ata
                  </button>

                  <button
                    onClick={() => navigate(`/study-plans/${plan.id}`)}
                    style={{
                      flex: 1.3,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Edit size={15} /> İçeriği Yönet <ChevronRight size={15} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="study-glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2))', border: '1.5px solid rgba(165,180,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc' }}>
            <Compass size={40} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>
              {searchQuery ? 'Arama Kriterine Uygun Yol Haritası Bulunamadı' : 'Henüz Bir Yol Haritası Oluşturulmadı'}
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', fontSize: '0.92rem' }}>
              {searchQuery 
                ? `"${searchQuery}" kelimesi ile eşleşen bir plan bulunamadı. Aramanızı temizleyebilir veya yeni bir plan oluşturabilirsiniz.`
                : 'Öğrencileriniz için adım adım takip edebilecekleri ders üniteleri, konu anlatımları ve soru hedefleri oluşturun.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)'
              }}
            >
              <Plus size={18} /> İlk Yol Haritasını Oluştur
            </button>
            <button
              onClick={() => handleLoadTemplate(PRESET_TEMPLATES[0])}
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '0.85rem',
                background: 'rgba(255,255,255,0.08)',
                color: '#c7d2fe',
                border: '1.5px solid rgba(165,180,252,0.3)',
                fontWeight: 800,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={17} style={{ color: '#fbbf24' }} /> LGS Matematik Şablonuyla Başla
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: YENİ YOL HARİTASI OLUŞTUR ── */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '580px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={24} style={{ color: '#818cf8' }} /> Yeni Yol Haritası Oluştur
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  Öğrenciler için çalışma ve konu takip planı tanımlayın.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePlan} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.4rem' }}>
                  Yol Haritası Başlığı *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Örn: 8. Sınıf LGS Matematik Hızlandırma, TYT Paragraf Kampı..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe', marginBottom: '0.4rem' }}>
                  Açıklama / Hedef (İsteğe Bağlı)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Bu yol haritasının amacı, öğrenciden beklenenler veya çalışma önerileri..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Quick Preset Template Inserters */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: '0.45rem' }}>
                  💡 Veya hazır şablon başlıklarından seçin:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['8. Sınıf LGS Matematik', '8. Sınıf LGS Fen Bilimleri', 'LGS Türkçe & Paragraf', '7. Sınıf Matematik', 'TYT Matematik Kampı'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewTitle(tag)}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(165,180,252,0.3)',
                        color: '#c7d2fe',
                        cursor: 'pointer'
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.6rem',
                    borderRadius: '0.65rem',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
                  }}
                >
                  Oluştur ve İçeriği Düzenle →
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL: ÖĞRENCİYE HIZLI ATA ── */}
      {isAssignModalOpen && targetPlanForAssign && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '620px', maxHeight: '88vh', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)', border: '1.5px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={24} style={{ color: '#f472b6' }} /> Yol Haritasını Öğrenciye Ata
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', color: '#c7d2fe', fontSize: '0.88rem', fontWeight: 700 }}>
                  {targetPlanForAssign.title}
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Student Search & Select All */}
            <div style={{ padding: '1rem 1.75rem 0.5rem 1.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Öğrenci adı veya sınıf ara..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.4rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const filteredStudentIds = students
                    .filter(s => (s.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || (s.className || '').toLowerCase().includes(assignSearch.toLowerCase()))
                    .map(s => String(s.id));
                  
                  const allSelected = filteredStudentIds.every(id => selectedStudentIds.includes(id));
                  if (allSelected) {
                    setSelectedStudentIds(prev => prev.filter(id => !filteredStudentIds.includes(id)));
                  } else {
                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredStudentIds])));
                  }
                }}
                style={{ padding: '0.65rem 0.95rem', borderRadius: '0.65rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(165,180,252,0.3)', color: '#c7d2fe', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Tümünü Seç / Kaldır
              </button>
            </div>

            {/* Student List */}
            <div style={{ padding: '0.75rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
              {students
                .filter(s => (s.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || (s.className || '').toLowerCase().includes(assignSearch.toLowerCase()))
                .map(student => {
                  const isChecked = selectedStudentIds.includes(String(student.id));
                  return (
                    <label
                      key={student.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        background: isChecked ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isChecked ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const sid = String(student.id);
                            setSelectedStudentIds(prev => prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]);
                          }}
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>
                            {student.name} {student.surname || ''}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                            <span>{student.className || student.grade || 'Sınıf Belirtilmemiş'}</span>
                            {student.email && <span>• {student.email}</span>}
                          </div>
                        </div>
                      </div>

                      {isChecked && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(52,211,153,0.35)' }}>
                          Seçildi
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c7d2fe' }}>
                {selectedStudentIds.length} Öğrenci Seçildi
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.65rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '0.65rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                >
                  Öğrencilere Ata ({selectedStudentIds.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
