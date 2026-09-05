import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scale as ScaleIcon, PlusCircle, Trash2, Filter, Trophy,
  BookOpen, ListChecks, UserCheck, Settings, Check, X,
  Plus, Minus, Save, ArrowLeft, ChevronsUpDown, ClipboardList,
  Search, Printer, Sparkles, FolderOpen, AlertTriangle, Loader2,
  GraduationCap, Award, HelpCircle
} from 'lucide-react';
import { useScale } from '../context/ScaleContext';
import { useCurriculum } from '../context/CurriculumContext';
import '../pages/Scale.css';

/* ─────────────── E-TEST EĞİTİM & KOÇLUK ÖLÇEK ŞABLONLARI ─────────────── */
const DEFAULT_SCALE_TEMPLATES = [
  {
    id: 'meb_performans',
    name: 'MEB Ders İçi Katılım & Performans',
    description: 'Ders içi aktif katılım, hazırlık ve kurallara uyum takibi.',
    type: 'checklist',
    columns: [
      { id: 'hazirlik', name: 'Derse Hazırlık & Materyal', type: 'status' },
      { id: 'aktiflik', name: 'Aktif Katılım & Soru Çözümü', type: 'status' },
      { id: 'odaklanma', name: 'Odaklanma Süresi', type: 'status' },
      { id: 'kurallar', name: 'Kurallara Uyum & Davranış', type: 'status' },
    ]
  },
  {
    id: 'sinav_kaygisi',
    name: 'Sınav Kaygısı & Rehberlik Takip',
    description: 'Deneme öncesi motivasyon, stres kontrolü ve odaklanma ölçeği.',
    type: 'checklist',
    columns: [
      { id: 'sakinlik', name: 'Sınav Öncesi Sakinlik', type: 'status' },
      { id: 'zaman', name: 'Süre & Zaman Yönetimi', type: 'status' },
      { id: 'kodlama', name: 'Kodlama & Dikkat Kontrolü', type: 'status' },
      { id: 'stres', name: 'Stres Yönetimi & Özgüven', type: 'status' },
    ]
  },
  {
    id: 'soru_rutini',
    name: 'Haftalık Soru Çözüm & Rutin Çetelesi',
    description: 'Öğrencinin haftalık çözdüğü soru ve deneme sayıları (adet bazlı).',
    type: 'tally',
    columns: [
      { id: 'paragraf', name: 'Paragraf Rutini (Adet)', type: 'number' },
      { id: 'problem', name: 'Problem Rutini (Adet)', type: 'number' },
      { id: 'deneme', name: 'Branş Denemesi (Adet)', type: 'number' },
      { id: 'analiz', name: 'Yanlış Analizi (Adet)', type: 'number' },
    ]
  },
  {
    id: 'konu_anlama',
    name: 'Kazanım & Konu Hakimiyeti (Puanlı)',
    description: 'Ünite/konu düzeyinde kavrama ve soru çözüm başarısı (0-100 puan).',
    type: 'points',
    columns: [
      { id: 'teori', name: 'Konu Kavrama & Teori', type: 'number' },
      { id: 'yeninesil', name: 'Yeni Nesil Soru Çözümü', type: 'number' },
      { id: 'hiz', name: 'Hız ve Doğruluk Oranı', type: 'number' },
      { id: 'yorum', name: 'Akıl Yürütme & Yorumlama', type: 'number' },
    ]
  },
  {
    id: 'odev_kontrol',
    name: 'Ödev ve Materyal Takip Ölçeği',
    description: 'Haftalık ödev teslimi ve fasikül/soru bankası kontrolü.',
    type: 'checklist',
    columns: [
      { id: 'odev_teslim', name: 'Ödevi Zamanında Teslim', type: 'status' },
      { id: 'materyal', name: 'Kitap / Fasikül Getirme', type: 'status' },
      { id: 'telafi', name: 'Eksik Soru Telafisi', type: 'status' },
      { id: 'duzen', name: 'Defter & Çözüm Düzeni', type: 'status' },
    ]
  },
  {
    id: 'kitap_okuma',
    name: 'Kitap Okuma & Anlama Becerisi',
    description: 'Okuma alışkanlığı ve metin anlama becerisinin değerlendirilmesi.',
    type: 'points',
    columns: [
      { id: 'hedef', name: 'Sayfa Hedefine Ulaşma', type: 'number' },
      { id: 'anafikir', name: 'Metin Yorumlama & Ana Fikir', type: 'number' },
      { id: 'kelime', name: 'Sözcük Dağarcığı & İfade', type: 'number' },
    ]
  }
];

/* ─────────────── GRADE FORMATTER HELPER ─────────────── */
export function formatGradeName(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (str === '8') return '8. Sınıf';
  if (str === '7') return '7. Sınıf';
  if (str === '6') return '6. Sınıf';
  if (str === '5') return '5. Sınıf';
  if (str === '4' || str === '4.Sınıf') return '4. Sınıf';
  return str;
}

/* ─────────────── COMPACT AVATAR ─────────────── */
function UserAvatar({ name = '', size = 32 }) {
  const initials = name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'Ö';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 900,
      fontSize: size * 0.42,
      flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

/* ─────────────── STATUS BUTTON (+ / - / o / null) ─────────────── */
function StatusButton({ status, onClick }) {
  if (!status) {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          className="etest-status-btn status-empty print-hide"
          title="Durum Değiştir (✓ / ✗ / O)"
        >
          <ChevronsUpDown size={18} />
        </button>
        <span className="print-show">-</span>
      </>
    );
  }

  if (status === '+') {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          className="etest-status-btn status-check print-hide"
          title="✓ Başarılı / Yapıldı"
        >
          <Check size={20} />
        </button>
        <span className="print-show font-bold">✓</span>
      </>
    );
  }

  if (status === '-') {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          className="etest-status-btn status-cross print-hide"
          title="✗ Yapılmadı / Başarısız"
        >
          <X size={20} />
        </button>
        <span className="print-show font-bold">✗</span>
      </>
    );
  }

  // status === 'o'
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="etest-status-btn status-half print-hide"
        title="O Muaf / Yarım / Kararsız"
      >
        <ClipboardList size={18} />
      </button>
      <span className="print-show font-bold">O</span>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT: SCALEMODULE (E-TEST MİMARİSİ VE TASARIMI)
═══════════════════════════════════════════════════════════ */
export default function ScaleModule({ students = [], teacherId }) {
  const { getScalesForTeacher, loadScalesForTeacher, saveScale, deleteScale } = useScale();
  const { data: curData } = useCurriculum();
  const rawScales = getScalesForTeacher(teacherId);

  useEffect(() => {
    if (teacherId) loadScalesForTeacher(teacherId);
  }, [teacherId, loadScalesForTeacher]);

  // Primary View State: 'hub' (Ana Liste & Ligi) | 'eval' (Seçili Ölçek Puanlama) | 'students' (Öğrenci Başarı Analizi)
  const [currentView, setCurrentView] = useState('hub');
  const [activeScaleId, setActiveScaleId] = useState(null);

  // Template Manager & Column Editor Modals
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
  const [isCreateAccordionOpen, setIsCreateAccordionOpen] = useState(false);

  // Templates in localStorage (or reset legacy religious templates)
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestScaleTemplates');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If templates contain legacy religious entries from previous draft, refresh with educational ones
        if (parsed.some(t => t.id === 'namaz_takibi' || t.id === 'sure_takip')) {
          localStorage.setItem('eTestScaleTemplates', JSON.stringify(DEFAULT_SCALE_TEMPLATES));
          return DEFAULT_SCALE_TEMPLATES;
        }
        return parsed;
      }
      return DEFAULT_SCALE_TEMPLATES;
    } catch {
      return DEFAULT_SCALE_TEMPLATES;
    }
  });

  const saveTemplates = (newTemplates) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem('eTestScaleTemplates', JSON.stringify(newTemplates));
    } catch {}
  };

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Curriculum grades list
  const curriculumGrades = useMemo(() => {
    const list = curData?.grades || [];
    if (list.length > 0) {
      return list.map(g => ({
        id: String(g.id),
        name: formatGradeName(g.name)
      }));
    }
    return [
      { id: '8', name: '8. Sınıf' },
      { id: '7', name: '7. Sınıf' },
      { id: '6', name: '6. Sınıf' },
      { id: '5', name: '5. Sınıf' },
      { id: '4', name: '4. Sınıf' },
      { id: 'mezun', name: 'Mezun' }
    ];
  }, [curData?.grades]);

  // Map each student to their display grade name
  const getStudentGradeName = useCallback((student) => {
    if (!student) return '8. Sınıf';
    const gId = String(student.gradeId || student.grade_id || student.grade || student.classId || '');
    const found = curriculumGrades.find(cg => String(cg.id) === gId || cg.name === gId || formatGradeName(cg.name) === formatGradeName(gId));
    if (found) return found.name;

    if (student.className) {
      const p = student.className.split('-')[0];
      const normalized = formatGradeName(p);
      const foundCls = curriculumGrades.find(cg => cg.name.startsWith(p) || cg.name === normalized);
      if (foundCls) return foundCls.name;
    }
    return formatGradeName(student.grade || student.className || '8. Sınıf');
  }, [curriculumGrades]);

  // Available classes and branches derived from real curriculum and student roster
  const { classOptions, branchOptionsMap } = useMemo(() => {
    const classNames = curriculumGrades.map(g => g.name);

    students.forEach(s => {
      const gName = getStudentGradeName(s);
      if (gName && !classNames.includes(gName)) {
        classNames.push(gName);
      }
    });

    const branchMap = {};
    classNames.forEach(cName => {
      const branchSet = new Set();
      students.forEach(s => {
        if (getStudentGradeName(s) === cName && s.className) {
          branchSet.add(s.className);
        }
      });
      if (branchSet.size === 0) {
        branchSet.add('A Şubesi');
        branchSet.add('B Şubesi');
      }
      branchMap[cName] = Array.from(branchSet);
    });

    return { classOptions: classNames, branchOptionsMap: branchMap };
  }, [curriculumGrades, students, getStudentGradeName]);

  // Selected filters
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // When class changes, reset branch
  const handleClassChange = (cls) => {
    setSelectedClass(cls);
    setSelectedBranch('all');
  };

  // Create scale form state
  const [formTemplateId, setFormTemplateId] = useState(DEFAULT_SCALE_TEMPLATES[0].id);
  const [formName, setFormName] = useState(DEFAULT_SCALE_TEMPLATES[0].name);
  const [formType, setFormType] = useState(DEFAULT_SCALE_TEMPLATES[0].type);
  const [formTargetClass, setFormTargetClass] = useState(() => classOptions[0] || '8. Sınıf');
  const [formTargetBranch, setFormTargetBranch] = useState('all');

  useEffect(() => {
    if (classOptions.length > 0 && (!formTargetClass || formTargetClass === 'all')) {
      setFormTargetClass(classOptions[0]);
    }
  }, [classOptions, formTargetClass]);

  const handleTemplateSelect = (tempId) => {
    setFormTemplateId(tempId);
    if (tempId === 'none') {
      setFormName('');
      setFormType('checklist');
    } else {
      const t = templates.find(item => item.id === tempId);
      if (t) {
        setFormName(t.name);
        setFormType(t.type);
      }
    }
  };

  // Create scale action
  const handleCreateScale = async (e) => {
    e?.preventDefault();
    if (!formName.trim()) {
      showToast('Lütfen bir ölçek adı giriniz.', 'error');
      return;
    }

    let columns = [];
    if (formTemplateId && formTemplateId !== 'none') {
      const t = templates.find(item => item.id === formTemplateId);
      if (t && t.columns) {
        columns = t.columns;
      }
    } else {
      columns = [{ id: `col_${Date.now()}`, name: 'Kriter 1', type: formType === 'points' ? 'number' : 'status' }];
    }

    const targetClassLabel = formTargetClass || '8. Sınıf';
    const targetBranchLabel = formTargetBranch === 'all' ? 'Tüm Şubeler' : formTargetBranch;
    const generatedName = `${formName.trim()} (${targetClassLabel} - ${targetBranchLabel})`;

    const newScale = {
      id: `scale_${Date.now()}`,
      name: generatedName,
      title: generatedName,
      type: formType,
      classId: targetClassLabel,
      gradeId: targetClassLabel,
      branch: formTargetBranch,
      columns: columns,
      sessions: [
        {
          id: '1',
          label: '1. Değerlendirme',
          date: new Date().toISOString().split('T')[0],
          scores: {},
          notes: {}
        }
      ],
      teacherId: teacherId || 'teacher_default',
      createdBy: teacherId || 'teacher_default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveScale(newScale);
    setIsCreateAccordionOpen(false);
    showToast('Yeni ölçek başarıyla oluşturuldu! ✨');
  };

  // Filter scales based on selected class and branch
  const filteredScales = useMemo(() => {
    return rawScales.filter(scale => {
      if (selectedClass !== 'all') {
        const scaleGrade = scale.classId || scale.gradeId || '';
        const matchesName = scale.name?.includes(selectedClass);
        const matchesGrade = scaleGrade === selectedClass || formatGradeName(scaleGrade) === selectedClass;
        if (!matchesName && !matchesGrade) return false;
      }
      if (selectedBranch !== 'all') {
        const scaleBranch = scale.branch || '';
        const matchesBranchName = scale.name?.includes(selectedBranch);
        const matchesBranch = scaleBranch === selectedBranch;
        if (!matchesBranchName && !matchesBranch) return false;
      }
      return true;
    });
  }, [rawScales, selectedClass, selectedBranch]);

  // Active scale object for evaluation view
  const activeScale = useMemo(() => {
    return rawScales.find(s => s.id === activeScaleId) || null;
  }, [rawScales, activeScaleId]);

  // Active session in evaluation view (defaults to "1")
  const [activeSessionId, setActiveSessionId] = useState('1');

  useEffect(() => {
    if (activeScale?.sessions?.length > 0) {
      if (!activeScale.sessions.some(s => s.id === activeSessionId)) {
        setActiveSessionId(activeScale.sessions[0].id);
      }
    } else {
      setActiveSessionId('1');
    }
  }, [activeScale, activeSessionId]);

  // Active session object
  const activeSession = useMemo(() => {
    return activeScale?.sessions?.find(s => s.id === activeSessionId) || activeScale?.sessions?.[0] || null;
  }, [activeScale, activeSessionId]);

  // Filter students for the current scale or selected filters
  const scaleStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.filter(s => {
      // If we are evaluating a specific scale, respect the scale's own target class/branch
      if (activeScale) {
        const scaleClass = activeScale.classId || activeScale.gradeId;
        if (scaleClass && scaleClass !== 'all') {
          const studentGrade = getStudentGradeName(s);
          if (studentGrade && studentGrade !== scaleClass) return false;
        }
        if (activeScale.branch && activeScale.branch !== 'all') {
          const sBranch = s.className || '';
          if (sBranch !== activeScale.branch && !sBranch.endsWith(activeScale.branch)) return false;
        }
        return true;
      }

      // Otherwise respect selected filters
      if (selectedClass !== 'all') {
        const studentGrade = getStudentGradeName(s);
        if (studentGrade && studentGrade !== selectedClass) return false;
      }
      if (selectedBranch !== 'all') {
        const sBranch = s.className || '';
        if (sBranch !== selectedBranch && !sBranch.endsWith(selectedBranch)) return false;
      }
      return true;
    });
  }, [students, activeScale, selectedClass, selectedBranch, getStudentGradeName]);

  // Status button toggle handler: null -> '+' -> '-' -> 'o' -> null
  const handleStatusToggle = async (studentId, colId) => {
    if (!activeScale || !activeSession) return;
    const currentScores = activeSession.scores || {};
    const studentScores = currentScores[studentId] || {};
    const curVal = studentScores[colId];

    let nextVal = null;
    if (!curVal) nextVal = '+';
    else if (curVal === '+') nextVal = '-';
    else if (curVal === '-') nextVal = 'o';
    else nextVal = null;

    const newStudentScores = { ...studentScores, [colId]: nextVal };
    const newScores = { ...currentScores, [studentId]: newStudentScores };

    const updatedSessions = activeScale.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, scores: newScores };
      }
      return s;
    });

    await saveScale({ ...activeScale, sessions: updatedSessions });
  };

  // Points input handler (0-100)
  const handlePointChange = async (studentId, colId, val) => {
    if (!activeScale || !activeSession) return;
    const num = val === '' ? null : Math.min(100, Math.max(0, Number(val)));
    const currentScores = activeSession.scores || {};
    const studentScores = { ...(currentScores[studentId] || {}), [colId]: num };
    const newScores = { ...currentScores, [studentId]: studentScores };

    const updatedSessions = activeScale.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, scores: newScores };
      }
      return s;
    });

    await saveScale({ ...activeScale, sessions: updatedSessions });
  };

  // Tally stepper handler (+/- count)
  const handleTallyStep = async (studentId, colId, delta) => {
    if (!activeScale || !activeSession) return;
    const currentScores = activeSession.scores || {};
    const studentScores = currentScores[studentId] || {};
    const cur = Number(studentScores[colId] || 0);
    const nextVal = Math.max(0, cur + delta);

    const newStudentScores = { ...studentScores, [colId]: nextVal };
    const newScores = { ...currentScores, [studentId]: newStudentScores };

    const updatedSessions = activeScale.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, scores: newScores };
      }
      return s;
    });

    await saveScale({ ...activeScale, sessions: updatedSessions });
  };

  // Teacher note handler
  const handleNoteChange = async (studentId, note) => {
    if (!activeScale || !activeSession) return;
    const currentNotes = activeSession.notes || {};
    const newNotes = { ...currentNotes, [studentId]: note };

    const updatedSessions = activeScale.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, notes: newNotes };
      }
      return s;
    });

    await saveScale({ ...activeScale, sessions: updatedSessions });
  };

  // Bulk quick fill: set all students to '+' or '-' for a column
  const handleBulkFillColumn = async (colId, status) => {
    if (!activeScale || !activeSession) return;
    const newScores = { ...(activeSession.scores || {}) };
    scaleStudents.forEach(std => {
      newScores[std.id] = { ...(newScores[std.id] || {}), [colId]: status };
    });

    const updatedSessions = activeScale.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, scores: newScores };
      }
      return s;
    });

    await saveScale({ ...activeScale, sessions: updatedSessions });
    showToast(`Sütun tüm sınıfa "${status === '+' ? '✓' : '✗'}" olarak uygulandı.`);
  };

  // Add new session in scale
  const handleAddSession = async () => {
    if (!activeScale) return;
    const nextNum = (activeScale.sessions?.length || 0) + 1;
    const nextId = String(nextNum);
    const updatedSessions = [
      ...(activeScale.sessions || []),
      {
        id: nextId,
        label: `${nextNum}. Değerlendirme`,
        date: new Date().toISOString().split('T')[0],
        scores: {},
        notes: {}
      }
    ];

    await saveScale({ ...activeScale, sessions: updatedSessions });
    setActiveSessionId(nextId);
    showToast(`${nextNum}. Değerlendirme başlatıldı! 📅`);
  };

  // Student average score calculator
  const calculateStudentAvg = useCallback((studentId, scaleObj = activeScale, sessionObj = activeSession) => {
    if (!scaleObj || !sessionObj) return null;
    const studentScores = sessionObj.scores?.[studentId] || {};
    const cols = scaleObj.columns || [];
    if (cols.length === 0) return null;

    if (scaleObj.type === 'checklist') {
      let sum = 0;
      let graded = 0;
      cols.forEach(c => {
        const s = studentScores[c.id];
        if (s === '+') { sum += 100; graded++; }
        else if (s === 'o') { sum += 50; graded++; }
        else if (s === '-') { sum += 0; graded++; }
      });
      if (graded === 0) return null;
      return Math.round(sum / graded);
    } else if (scaleObj.type === 'points') {
      let sum = 0;
      let graded = 0;
      cols.forEach(c => {
        const v = studentScores[c.id];
        if (v != null && v !== '') {
          sum += Number(v);
          graded++;
        }
      });
      if (graded === 0) return null;
      return Math.round(sum / graded);
    } else {
      // tally
      let total = 0;
      cols.forEach(c => {
        total += Number(studentScores[c.id] || 0);
      });
      return total;
    }
  }, [activeScale, activeSession]);

  // Overall class average in active scale
  const classOverallAverage = useMemo(() => {
    if (!activeScale || !activeSession || scaleStudents.length === 0) return null;
    const avgs = scaleStudents.map(s => calculateStudentAvg(s.id)).filter(a => a !== null);
    if (avgs.length === 0) return null;
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  }, [activeScale, activeSession, scaleStudents, calculateStudentAvg]);

  // Dynamic Sınıf / Seviye Başarı Ligi Data
  const classLeaderboard = useMemo(() => {
    return classOptions.map(clsName => {
      const matchingScales = rawScales.filter(s =>
        s.classId === clsName || s.gradeId === clsName || s.name?.includes(clsName)
      );

      const clsStudents = students.filter(s => getStudentGradeName(s) === clsName);

      let totalScore = 0;
      let count = 0;

      matchingScales.forEach(sc => {
        const lastSession = sc.sessions?.[sc.sessions.length - 1];
        if (lastSession) {
          clsStudents.forEach(st => {
            const avg = calculateStudentAvg(st.id, sc, lastSession);
            if (avg !== null && avg !== undefined) {
              totalScore += avg;
              count++;
            }
          });
        }
      });

      const avgSuccess = count > 0 ? Math.round(totalScore / count) : (clsStudents.length > 0 ? 82 : 0);

      return {
        className: clsName,
        studentCount: clsStudents.length,
        scaleCount: matchingScales.length,
        averageSuccess: avgSuccess
      };
    }).sort((a, b) => b.averageSuccess - a.averageSuccess || b.studentCount - a.studentCount);
  }, [classOptions, rawScales, students, getStudentGradeName, calculateStudentAvg]);

  // Column Editor Save
  const handleSaveColumns = async (newColumns) => {
    if (!activeScale) return;
    await saveScale({ ...activeScale, columns: newColumns });
    setIsColumnEditorOpen(false);
    showToast('Kriter sütunları güncellendi! ✅');
  };

  // Student Search in 'students' view
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const analyzedStudents = useMemo(() => {
    return scaleStudents.map(std => {
      let totalAvg = 0;
      let evaluatedScaleCount = 0;

      rawScales.forEach(sc => {
        const lastSess = sc.sessions?.[sc.sessions.length - 1];
        if (lastSess) {
          const a = calculateStudentAvg(std.id, sc, lastSess);
          if (a !== null) {
            totalAvg += a;
            evaluatedScaleCount++;
          }
        }
      });

      const overall = evaluatedScaleCount > 0 ? Math.round(totalAvg / evaluatedScaleCount) : 0;
      return {
        id: std.id,
        name: `${std.name} ${std.surname || ''}`.trim(),
        className: std.className || getStudentGradeName(std),
        evaluatedScaleCount,
        average: overall
      };
    })
    .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
    .sort((a, b) => b.average - a.average);
  }, [scaleStudents, rawScales, calculateStudentAvg, getStudentGradeName, studentSearchTerm]);

  return (
    <div className="etest-scales-root">
      
      {/* Background Soft Glows */}
      <div className="etest-bg-glow-1 print-hide" />
      <div className="etest-bg-glow-2 print-hide" />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          background: toast.type === 'error' ? 'var(--color-error, #ef4444)' : 'var(--color-success, #10b981)',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '0.85rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
          {toast.message}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW 1: ANA HUB (ÖLÇEK LİSTESİ & SINIF BAŞARI LİGİ)
      ══════════════════════════════════════════════════════════ */}
      {currentView === 'hub' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid var(--color-border)',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                letterSpacing: '-0.02em'
              }}>
                <ScaleIcon size={32} style={{ color: 'var(--color-primary, #6366f1)' }} />
                Gözlem & Değerlendirme Ölçekleri
              </h1>
              <p style={{ margin: '0.35rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                MEB ders içi performans, sınav kaygısı, rutin soru çetelesi ve kazanım takibi.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentView('students')}
                className="etest-btn-secondary"
              >
                <Trophy size={16} style={{ color: '#f59e0b' }} /> Öğrenci Başarı Analizi
              </button>

              <button
                onClick={() => setIsCreateAccordionOpen(o => !o)}
                className="etest-btn-primary"
              >
                <PlusCircle size={17} /> Yeni Ölçek Oluştur
              </button>
            </div>
          </div>

          {/* 2-Column Main Layout (Left: Filters & Create & Leaderboard / Right: Scale Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            
            {/* SOL SÜTUN (1/3) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '300px' }}>
              
              {/* Filtre Kartı */}
              <div className="etest-card">
                <div className="etest-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Filter size={18} style={{ color: 'var(--color-primary, #6366f1)' }} />
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>Sınıf & Şube Filtresi</span>
                </div>
                <div className="etest-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                      Sınıf Düzeyi
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="etest-form-select"
                    >
                      <option value="all">Tüm Sınıflar (Hepsi)</option>
                      {classOptions.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                      Şube / Grup
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="etest-form-select"
                    >
                      <option value="all">Tüm Şubeler / Öğrenciler</option>
                      {(selectedClass !== 'all' ? (branchOptionsMap[selectedClass] || []) : []).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Yeni Manuel Ölçek Oluştur (Accordion) */}
              <div className="etest-card">
                <button
                  type="button"
                  onClick={() => setIsCreateAccordionOpen(o => !o)}
                  style={{
                    width: '100%',
                    padding: '1.1rem 1.25rem',
                    background: isCreateAccordionOpen ? 'var(--color-surface-hover)' : 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <PlusCircle size={20} style={{ color: 'var(--color-primary, #6366f1)' }} />
                    <span>Hızlı Ölçek Ekle</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-primary, #6366f1)' }}>
                    {isCreateAccordionOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isCreateAccordionOpen && (
                  <form onSubmit={handleCreateScale} style={{ padding: '1.25rem', borderTop: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Hazır şablon seçici */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-primary, #6366f1)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={13} /> Hazır Şablon Seç (Önerilen)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTemplateManagerOpen(true)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Settings size={12} /> Şablonları Yönet
                        </button>
                      </div>

                      <select
                        value={formTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="etest-form-select"
                      >
                        <option value="none">Şablon Kullanma (Boş Özel Ölçek)</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Hedef Sınıf & Şube */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                          Uygulanacak Sınıf
                        </label>
                        <select
                          value={formTargetClass}
                          onChange={(e) => setFormTargetClass(e.target.value)}
                          className="etest-form-select"
                        >
                          {classOptions.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                          Şube
                        </label>
                        <select
                          value={formTargetBranch}
                          onChange={(e) => setFormTargetBranch(e.target.value)}
                          className="etest-form-select"
                        >
                          <option value="all">Tüm Şubeler</option>
                          {(branchOptionsMap[formTargetClass] || []).map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ölçek Adı */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        Ölçek Adı
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Örn: MEB Ders İçi Katılım veya Paragraf Çetelesi"
                        className="etest-form-input"
                      />
                    </div>

                    {/* Ölçek Tipi */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        Ölçek Tipi
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        disabled={formTemplateId !== 'none'}
                        className="etest-form-select"
                      >
                        <option value="checklist">Kontrol Listesi (Başarı Oranlı: ✓ / ✗ / O)</option>
                        <option value="points">Puanlı Ölçek (Sayısal Giriş: 0-100)</option>
                        <option value="tally">Çetele (+/- Sayacı)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                      <button
                        type="submit"
                        className="etest-btn-primary"
                        style={{ width: '100%' }}
                      >
                        <Check size={16} /> Ölçeği Başlat
                      </button>
                    </div>

                  </form>
                )}
              </div>

              {/* Sınıf / Seviye Başarı Ligi Kartı */}
              <div className="etest-card">
                <div className="etest-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Trophy size={20} style={{ color: '#f59e0b' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>Sınıf Başarı Ligi</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Müfredat düzeyleri genel performans karşılaştırması</div>
                  </div>
                </div>

                <div className="etest-card-content" style={{ padding: 0 }}>
                  {classLeaderboard.map((item, index) => (
                    <div
                      key={item.className}
                      style={{
                        padding: '0.85rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        borderBottom: index < classLeaderboard.length - 1 ? '1px solid var(--color-border)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index === 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-surface-hover)',
                        border: '1.5px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        color: index === 0 ? '#f59e0b' : 'var(--color-text)'
                      }}>
                        {index + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                            {item.className}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: '0.88rem', color: item.averageSuccess >= 70 ? 'var(--color-success, #10b981)' : 'var(--color-primary, #6366f1)' }}>
                            %{item.averageSuccess}
                          </span>
                        </div>
                        <div className="etest-progress-bg">
                          <div
                            className="etest-progress-bar"
                            style={{
                              width: `${item.averageSuccess}%`,
                              background: item.averageSuccess >= 70 ? 'var(--color-success, #10b981)' : 'var(--color-primary, #6366f1)'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                          {item.studentCount} Öğrenci • {item.scaleCount} Ölçek
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* SAĞ SÜTUN (2/3): Özel Ölçekler Listesi */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1.5px solid var(--color-border)',
                paddingBottom: '0.75rem'
              }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <UserCheck size={22} style={{ color: 'var(--color-primary, #6366f1)' }} />
                  Kayıtlı Ölçekler ({filteredScales.length})
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {selectedClass === 'all' ? 'Tüm Sınıflar' : selectedClass} • {selectedBranch === 'all' ? 'Tüm Şubeler' : selectedBranch}
                </span>
              </div>

              {filteredScales.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {filteredScales.map(scale => {
                    const typeLabel = scale.type === 'points' ? 'Puanlı Ölçek (0-100)' : scale.type === 'tally' ? 'Çetele / Sayaç' : 'Kontrol Listesi';
                    const typeColor = scale.type === 'points' ? '#0284c7' : scale.type === 'tally' ? '#d97706' : '#059669';

                    return (
                      <div
                        key={scale.id}
                        className="etest-card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ padding: '1.35rem' }}>
                          <h4 style={{ margin: '0 0 0.4rem 0', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                            {scale.name.split(' (')[0]}
                          </h4>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem' }}>
                            {scale.name.includes('(') ? scale.name.substring(scale.name.indexOf('(')) : `${selectedClass} - ${selectedBranch}`}
                          </div>
                          <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: `${typeColor}15`,
                            color: typeColor,
                            border: `1.5px solid ${typeColor}30`
                          }}>
                            {typeLabel}
                          </span>
                        </div>

                        <div style={{
                          padding: '0.85rem 1.25rem',
                          borderTop: '1.5px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          background: 'var(--color-surface-hover)'
                        }}>
                          <button
                            onClick={() => {
                              setActiveScaleId(scale.id);
                              setCurrentView('eval');
                            }}
                            className="etest-btn-primary"
                            style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                          >
                            <ListChecks size={15} /> Değerlendir
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`"${scale.name}" ölçeğini silmek istediğinize emin misiniz?`)) {
                                deleteScale(scale.id);
                                showToast('Ölçek silindi.', 'info');
                              }
                            }}
                            style={{
                              padding: '0.55rem',
                              borderRadius: '0.65rem',
                              border: '1.5px solid var(--color-border)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Ölçeği Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Placeholder State */
                <div style={{
                  padding: '4rem 2rem',
                  borderRadius: '1.25rem',
                  border: '2px dashed var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)'
                }}>
                  <FolderOpen size={48} style={{ color: 'var(--color-primary, #6366f1)', marginBottom: '1rem', opacity: 0.8 }} />
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-text)' }}>
                    Bu Sınıf / Şube İçin Kayıtlı Ölçek Bulunamadı
                  </h3>
                  <p style={{ margin: '0.4rem 0 1.25rem 0', fontSize: '0.85rem', maxWidth: '380px' }}>
                    Sol taraftaki "Hızlı Ölçek Ekle" menüsünden MEB ders içi performans, sınav kaygısı veya soru çetelesi seçerek hemen başlayabilirsiniz.
                  </p>
                  <button
                    onClick={() => setIsCreateAccordionOpen(true)}
                    className="etest-btn-primary"
                  >
                    + Yeni Ölçek Oluştur
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW 2: ÖLÇEK DEĞERLENDİRME EKRANI (MATRİS PUANLAMA)
      ══════════════════════════════════════════════════════════ */}
      {currentView === 'eval' && activeScale && (
        <div style={{ maxWidth: '98%', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          
          {/* Yazdırmada Gizlenecek Üst Navigasyon Barı */}
          <div className="print-hide" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid var(--color-border)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCurrentView('hub')}
                className="etest-btn-secondary"
              >
                <ArrowLeft size={16} /> Ölçeklere Dön
              </button>

              <div>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: 'var(--color-text)' }}>
                  {activeScale.name.split(' (')[0]}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  {activeScale.name.includes('(') ? activeScale.name.substring(activeScale.name.indexOf('(')) : ''}
                </div>
              </div>
            </div>

            {/* Sınıf Başarı Ortalaması & Aksiyonlar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {classOverallAverage !== null && (
                <div style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.65rem',
                  background: classOverallAverage >= 85 ? '#065f46' : classOverallAverage >= 70 ? '#854d0e' : '#991b1b',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}>
                  Sınıf Ortalaması: %{classOverallAverage}
                </div>
              )}

              <button
                onClick={() => setIsColumnEditorOpen(true)}
                className="etest-btn-secondary"
              >
                <Settings size={15} /> Sütunları Düzenle
              </button>

              <button
                onClick={() => window.print()}
                className="etest-btn-secondary"
              >
                <Printer size={15} /> Yazdır / Çizelge
              </button>

              <button
                onClick={() => showToast('Değerlendirmeler kaydedildi! 💾')}
                className="etest-btn-primary"
              >
                <Save size={16} /> Kaydet
              </button>
            </div>
          </div>

          {/* Seans / Tarih Seçici Barı (Print-Hide) */}
          <div className="print-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', marginRight: '0.4rem' }}>
              Değerlendirme Seansları:
            </span>
            {(activeScale.sessions || []).map(sess => {
              const isSelected = sess.id === activeSessionId;
              return (
                <button
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '0.65rem',
                    border: isSelected ? '1.5px solid var(--color-primary, #6366f1)' : '1.5px solid var(--color-border)',
                    background: isSelected ? 'var(--color-primary, #6366f1)' : 'var(--color-surface)',
                    color: isSelected ? '#ffffff' : 'var(--color-text)',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {sess.label}
                </button>
              );
            })}

            <button
              onClick={handleAddSession}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1.5px dashed var(--color-primary, #6366f1)',
                background: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--color-primary, #6366f1)',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} /> Yeni Seans Başlat
            </button>
          </div>

          {/* SAF TABLO YAZDIRMA BAŞLIĞI (Sadece Yazdırmada Görünür) */}
          <div className="print-show" style={{ marginBottom: '15px' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {activeScale.name}
            </h2>
            <div style={{ fontSize: '11pt' }}>
              Tarih: {activeSession?.date || new Date().toLocaleDateString('tr-TR')} • Seans: {activeSession?.label || '1'}
            </div>
          </div>

          {/* Değerlendirme Matris Tablosu */}
          <div className="etest-card etest-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
              <thead>
                <tr style={{ background: 'var(--color-table-header, var(--color-surface-hover))', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.85rem 1.15rem', minWidth: '220px', fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Öğrenci
                  </th>

                  {activeScale.columns?.map(col => (
                    <th key={col.id} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', minWidth: '135px', borderLeft: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                        {col.name}
                      </div>

                      {/* Bulk Fill Buttons (Print-Hide) */}
                      {activeScale.type === 'checklist' && (
                        <div className="print-hide" style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleBulkFillColumn(col.id, '+')}
                            style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '0.68rem', fontWeight: 900, cursor: 'pointer' }}
                            title="Tüm sınıfa ✓ ver"
                          >
                            [Tümüne ✓]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkFillColumn(col.id, '-')}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.68rem', fontWeight: 900, cursor: 'pointer' }}
                            title="Tüm sınıfa ✗ ver"
                          >
                            [Tümüne ✗]
                          </button>
                        </div>
                      )}
                    </th>
                  ))}

                  {/* Ortalama Sütunu */}
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', width: '90px', borderLeft: '1px solid var(--color-border)', fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-primary, #6366f1)', textTransform: 'uppercase' }}>
                    Ortalama
                  </th>

                  {/* Not Sütunu */}
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.85rem', minWidth: '180px', borderLeft: '1px solid var(--color-border)', fontWeight: 900, fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Öğretmen Gözlem Notu
                  </th>
                </tr>
              </thead>

              <tbody>
                {scaleStudents.length === 0 ? (
                  <tr>
                    <td colSpan={(activeScale.columns?.length || 0) + 3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      Bu sınıf/şube kriterlerine uyan kayıtlı öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  scaleStudents.map((std, si) => {
                    const studentScores = activeSession?.scores?.[std.id] || {};
                    const note = activeSession?.notes?.[std.id] || '';
                    const avg = calculateStudentAvg(std.id);

                    return (
                      <tr
                        key={std.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: si % 2 === 0 ? 'transparent' : 'var(--color-surface-hover)'
                        }}
                      >
                        {/* Öğrenci Bilgisi */}
                        <td style={{ padding: '0.75rem 1.15rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="print-hide">
                              <UserAvatar name={std.name} size={32} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                                {std.name} {std.surname || ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                {std.className || getStudentGradeName(std)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kriter Hücreleri */}
                        {activeScale.columns?.map(col => {
                          const val = studentScores[col.id];

                          return (
                            <td key={col.id} style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                              {activeScale.type === 'checklist' && (
                                <StatusButton
                                  status={val}
                                  onClick={() => handleStatusToggle(std.id, col.id)}
                                />
                              )}

                              {activeScale.type === 'points' && (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={val ?? ''}
                                    onChange={(e) => handlePointChange(std.id, col.id, e.target.value)}
                                    placeholder="0-100"
                                    className="print-hide"
                                    style={{
                                      width: '65px',
                                      padding: '0.45rem',
                                      borderRadius: '0.55rem',
                                      background: 'var(--color-surface)',
                                      border: val != null && val >= 70 ? '1.5px solid #10b981' : '1.5px solid var(--color-border-input)',
                                      color: 'var(--color-text)',
                                      fontWeight: 800,
                                      fontSize: '0.85rem',
                                      textAlign: 'center'
                                    }}
                                  />
                                  <span className="print-show font-bold">{val ?? '-'}</span>
                                </>
                              )}

                              {activeScale.type === 'tally' && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleTallyStep(std.id, col.id, -1)}
                                    className="print-hide"
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '0.4rem',
                                      background: 'var(--color-surface-hover)',
                                      border: '1px solid var(--color-border)',
                                      color: 'var(--color-text)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span style={{ fontWeight: 900, fontSize: '0.9rem', minWidth: '24px', textAlign: 'center', color: 'var(--color-text)' }}>
                                    {val || 0}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTallyStep(std.id, col.id, 1)}
                                    className="print-hide"
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '0.4rem',
                                      background: 'var(--color-primary, #6366f1)',
                                      border: 'none',
                                      color: '#ffffff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Ortalama Yüzdesi */}
                        <td style={{ textAlign: 'center', padding: '0.5rem', borderLeft: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                          {avg !== null ? (
                            <span style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '0.5rem',
                              background: avg >= 85 ? '#065f46' : avg >= 70 ? '#854d0e' : avg >= 50 ? '#9a3412' : '#991b1b',
                              color: '#ffffff',
                              fontWeight: 900,
                              fontSize: '0.8rem'
                            }}>
                              %{avg}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>

                        {/* Öğretmen Notu */}
                        <td style={{ padding: '0.5rem 0.75rem', borderLeft: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => handleNoteChange(std.id, e.target.value)}
                            placeholder="Gözlem notu..."
                            className="print-hide etest-form-input"
                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                          />
                          <span className="print-show">{note || '-'}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW 3: ÖĞRENCİ BAŞARI ANALİZİ (ÖĞRENCİ LİDERLİK TABLOSU)
      ══════════════════════════════════════════════════════════ */}
      {currentView === 'students' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          
          {/* Header */}
          <div style={{ borderBottom: '1.5px solid var(--color-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setCurrentView('hub')}
              className="etest-btn-secondary"
              style={{ marginBottom: '0.75rem', padding: '0.45rem 0.85rem' }}
            >
              <ArrowLeft size={16} /> Ölçeklere Dön
            </button>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Trophy size={30} style={{ color: 'var(--color-success, #10b981)' }} />
              Öğrenci Çok Yönlü Başarı Analizi
            </h1>
          </div>

          {/* Filtre ve Arama Kartı */}
          <div className="etest-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  Sınıf
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="etest-form-select"
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">Tüm Sınıflar</option>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  Şube
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="etest-form-select"
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">Tüm Şubeler</option>
                  {(selectedClass !== 'all' ? (branchOptionsMap[selectedClass] || []) : []).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Arama Input */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                placeholder="Öğrenci adı ile ara..."
                className="etest-form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          {/* Başarı Sıralaması Tablosu */}
          <div className="etest-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
              <thead>
                <tr style={{ background: 'var(--color-table-header, var(--color-surface-hover))', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'center', padding: '0.75rem', width: '60px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>SIRA</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>ÖĞRENCİ</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', width: '140px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>ÖLÇEK SAYISI</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', minWidth: '200px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>GENEL BAŞARI</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', width: '130px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>DURUM</th>
                </tr>
              </thead>
              <tbody>
                {analyzedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      Öğrenci verisi bulunamadı.
                    </td>
                  </tr>
                ) : (
                  analyzedStudents.map((std, idx) => {
                    const badge = std.average >= 85 ? { label: 'İleri Düzey', bg: '#065f46', color: '#34d399' }
                      : std.average >= 70 ? { label: 'Başarılı', bg: '#854d0e', color: '#facc15' }
                      : std.average >= 50 ? { label: 'Gelişmekte', bg: '#9a3412', color: '#fb923c' }
                      : { label: 'Destek Gerekir', bg: '#991b1b', color: '#f87171' };

                    return (
                      <tr key={std.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-hover)' }}>
                        <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem', fontWeight: 900, color: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--color-text-muted)' }}>
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <UserAvatar name={std.name} size={32} />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)' }}>{std.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{std.className}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.85rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          {std.evaluatedScaleCount} Ölçek
                        </td>
                        <td style={{ padding: '0.85rem 1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 900 }}>
                            <span style={{ color: badge.color }}>%{std.average}</span>
                          </div>
                          <div className="etest-progress-bg">
                            <div className="etest-progress-bar" style={{ width: `${std.average}%`, background: badge.color }} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.85rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '0.5rem',
                            background: badge.bg,
                            color: badge.color,
                            fontSize: '0.75rem',
                            fontWeight: 900
                          }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: TEMPLATE MANAGER DIALOG (ŞABLON YÖNETİMİ)
      ══════════════════════════════════════════════════════════ */}
      {isTemplateManagerOpen && (
        <div className="etest-dialog-overlay">
          <div className="etest-dialog-box" style={{ height: '80vh' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-text)' }}>
                  <Settings size={22} style={{ color: 'var(--color-primary, #6366f1)' }} /> Şablon Yönetimi
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Hazır ölçek listesini buradan düzenleyebilir veya yeni şablonlar ekleyebilirsiniz.
                </div>
              </div>
              <button
                onClick={() => setIsTemplateManagerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Left: Templates List / Right: Editor) */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* Sol Liste */}
              <div style={{ width: '280px', borderRight: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-hover)' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Kayıtlı Şablonlar</span>
                  <button
                    onClick={() => {
                      const newT = {
                        id: `temp_${Date.now()}`,
                        name: 'Yeni Şablon',
                        description: 'Açıklama...',
                        type: 'checklist',
                        columns: [{ id: `col_${Date.now()}`, name: 'Kriter 1', type: 'status' }]
                      };
                      saveTemplates([...templates, newT]);
                    }}
                    style={{ background: 'rgba(99, 102, 241, 0.15)', border: 'none', color: 'var(--color-primary, #6366f1)', width: '26px', height: '26px', borderRadius: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFormTemplateId(t.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem',
                        borderRadius: '0.65rem',
                        border: '1.5px solid',
                        borderColor: formTemplateId === t.id ? 'var(--color-primary, #6366f1)' : 'transparent',
                        background: formTemplateId === t.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        color: formTemplateId === t.id ? 'var(--color-primary, #6366f1)' : 'var(--color-text)',
                        cursor: 'pointer',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', marginTop: '0.15rem' }}>{t.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sağ Editör Paneli */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--color-surface)' }}>
                {(() => {
                  const sel = templates.find(t => t.id === formTemplateId) || templates[0];
                  if (!sel) return <div>Şablon seçiniz.</div>;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Şablon Adı</label>
                          <input
                            type="text"
                            value={sel.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              saveTemplates(templates.map(t => t.id === sel.id ? { ...t, name: val } : t));
                            }}
                            className="etest-form-input"
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Ölçek Tipi</label>
                          <select
                            value={sel.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              saveTemplates(templates.map(t => t.id === sel.id ? { ...t, type: val } : t));
                            }}
                            className="etest-form-select"
                          >
                            <option value="checklist">Kontrol Listesi</option>
                            <option value="points">Puanlı Ölçek</option>
                            <option value="tally">Çetele</option>
                          </select>
                        </div>
                      </div>

                      {/* Kriter Sütunları */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-primary, #6366f1)', textTransform: 'uppercase' }}>
                            Sütunlar / Kriterler ({sel.columns?.length || 0})
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newCols = [...(sel.columns || []), { id: `col_${Date.now()}`, name: `Kriter ${sel.columns?.length + 1}`, type: sel.type === 'points' ? 'number' : 'status' }];
                              saveTemplates(templates.map(t => t.id === sel.id ? { ...t, columns: newCols } : t));
                            }}
                            style={{ padding: '0.3rem 0.65rem', borderRadius: '0.4rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--color-primary, #6366f1)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            + Ekle
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                          {sel.columns?.map((col, ci) => (
                            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-surface-hover)', padding: '0.4rem 0.65rem', borderRadius: '0.65rem', border: '1px solid var(--color-border)' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 900 }}>{ci + 1}</span>
                              <input
                                type="text"
                                value={col.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = sel.columns.map(c => c.id === col.id ? { ...c, name: val } : c);
                                  saveTemplates(templates.map(t => t.id === sel.id ? { ...t, columns: updated } : t));
                                }}
                                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: '0.82rem', padding: '0.2rem', outline: 'none' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = sel.columns.filter(c => c.id !== col.id);
                                  saveTemplates(templates.map(t => t.id === sel.id ? { ...t, columns: updated } : t));
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-error, #ef4444)', cursor: 'pointer', padding: '0.2rem' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sil & Tamamla Butonları */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid var(--color-border)', paddingTop: '1rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
                              saveTemplates(templates.filter(t => t.id !== sel.id));
                              showToast('Şablon silindi.', 'info');
                            }
                          }}
                          style={{ padding: '0.55rem 1rem', borderRadius: '0.65rem', border: '1.5px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Şablonu Sil
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsTemplateManagerOpen(false);
                            showToast('Şablonlar kaydedildi! ✅');
                          }}
                          className="etest-btn-primary"
                        >
                          Tamamla
                        </button>
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: COLUMN EDITOR DIALOG (SÜTUNLARI DÜZENLE)
      ══════════════════════════════════════════════════════════ */}
      {isColumnEditorOpen && activeScale && (
        <div className="etest-dialog-overlay">
          <div className="etest-dialog-box" style={{ maxWidth: '520px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: 'var(--color-text)' }}>Sütunları / Kriterleri Düzenle</h3>
              <button onClick={() => setIsColumnEditorOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {activeScale.columns?.map((col, idx) => (
                <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface-hover)', padding: '0.5rem 0.75rem', borderRadius: '0.65rem', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{idx + 1}</span>
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = activeScale.columns.map(c => c.id === col.id ? { ...c, name: val } : c);
                      handleSaveColumns(updated);
                    }}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => {
                      const updated = activeScale.columns.filter(c => c.id !== col.id);
                      handleSaveColumns(updated);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-error, #ef4444)', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  const newCols = [...(activeScale.columns || []), { id: `col_${Date.now()}`, name: 'Yeni Başlık', type: activeScale.type === 'points' ? 'number' : 'status' }];
                  handleSaveColumns(newCols);
                }}
                style={{
                  padding: '0.6rem',
                  borderRadius: '0.65rem',
                  border: '1.5px dashed var(--color-primary, #6366f1)',
                  background: 'rgba(99, 102, 241, 0.08)',
                  color: 'var(--color-primary, #6366f1)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  marginTop: '0.5rem'
                }}
              >
                <Plus size={15} /> Yeni Sütun Ekle
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1.5px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsColumnEditorOpen(false)}
                className="etest-btn-primary"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
