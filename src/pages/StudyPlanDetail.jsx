import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Users, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ChevronRight,
  Link as LinkIcon, Calendar, FileJson, X, ListPlus, Sparkles, Hash,
  Layers, FileText, CheckCircle, CheckCircle2, Clock, Zap, BookOpen, Search, Globe, Check, Lock,
  Compass, FolderPlus, ExternalLink, TrendingUp, Eye, EyeOff, Award
} from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './StudyPlan.css';

export const STANDARD_SUBJECTS = [
  'Matematik',
  'Türkçe',
  'Fen Bilimleri',
  'Sosyal Bilgiler',
  'İnkılap Tarihi',
  'İngilizce',
  'Din Kültürü',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Geometri',
  'Tarih',
  'Coğrafya',
  'Felsefe'
];

export const SUBJECT_THEMES = {
  'Türkçe': { color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.3)', icon: '📖' },
  'Matematik': { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', border: 'rgba(37, 99, 235, 0.3)', icon: '📐' },
  'Fen Bilimleri': { color: '#059669', bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.3)', icon: '🔬' },
  'Sosyal Bilgiler': { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.3)', icon: '🌍' },
  'İnkılap Tarihi': { color: '#b91c1c', bg: 'rgba(185, 28, 28, 0.08)', border: 'rgba(185, 28, 28, 0.3)', icon: '🇹🇷' },
  'İngilizce': { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)', border: 'rgba(8, 145, 178, 0.3)', icon: '🇬🇧' },
  'Din Kültürü': { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)', icon: '🕌' },
  'Fizik': { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)', border: 'rgba(2, 132, 199, 0.3)', icon: '⚡' },
  'Kimya': { color: '#db2777', bg: 'rgba(219, 39, 119, 0.08)', border: 'rgba(219, 39, 119, 0.3)', icon: '🧪' },
  'Biyoloji': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', icon: '🧬' },
  'Geometri': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.3)', icon: '📏' },
  'Tarih': { color: '#b45309', bg: 'rgba(180, 83, 9, 0.08)', border: 'rgba(180, 83, 9, 0.3)', icon: '📜' },
  'Coğrafya': { color: '#047857', bg: 'rgba(4, 120, 87, 0.08)', border: 'rgba(4, 120, 87, 0.3)', icon: '🗺️' },
  'Felsefe': { color: '#6b21a8', bg: 'rgba(107, 33, 168, 0.08)', border: 'rgba(107, 33, 168, 0.3)', icon: '💭' },
  'Genel': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.3)', icon: '📚' }
};

export function getSubjectTheme(subjName) {
  if (!subjName) return SUBJECT_THEMES['Genel'];
  for (const [key, val] of Object.entries(SUBJECT_THEMES)) {
    if (subjName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(subjName.toLowerCase())) {
      return val;
    }
  }
  return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.3)', icon: '📚' };
}

export default function StudyPlanDetail() {
  const { id: planId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { studyPlans, updateStudyPlan, addStudyAssignment, updateStudyAssignment, deleteStudyAssignment, studyAssignments } = useStudyPlan();
  const { users } = useUser();

  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';

  const plan = studyPlans?.find((p) => p.id === planId);
  const subjects = plan?.subjects || [];

  // Check if current user is the owner of this plan
  const isOwner = useMemo(() => {
    if (!plan || !currentUser) return false;
    if (isAdmin) return true;
    if (isTeacher) {
      const teacherId = String(currentUser.id || '');
      const teacherUsername = String(currentUser.username || '').toLowerCase();
      const teacherEmail = String(currentUser.email || '').toLowerCase();
      const teacherName = String(currentUser.name || '').toLowerCase();
      const createdBy = String(plan.createdBy || '');
      const pTeacherId = String(plan.teacherId || '');
      const pTeacherUsername = String(plan.teacherUsername || '').toLowerCase();
      const pTeacherEmail = String(plan.teacherEmail || '').toLowerCase();
      const pTeacherName = String(plan.teacherName || '').toLowerCase();

      return (
        (teacherId && (createdBy === teacherId || pTeacherId === teacherId)) ||
        (teacherUsername && (createdBy.toLowerCase() === teacherUsername || pTeacherUsername === teacherUsername || pTeacherId.toLowerCase() === teacherUsername)) ||
        (teacherEmail && (pTeacherEmail === teacherEmail || createdBy.toLowerCase() === teacherEmail)) ||
        (teacherName && (pTeacherName === teacherName))
      );
    }
    return true; // students see plans assigned to them
  }, [plan, currentUser, isTeacher, isAdmin]);

  // Responsive
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Collect all unique Ders (subjects) defined in this plan
  const planDersList = useMemo(() => {
    const list = [];
    if (Array.isArray(plan?.definedSubjects)) {
      plan.definedSubjects.forEach(d => {
        const trimmed = (d || '').trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    subjects.forEach(u => {
      const sName = (u.subject || '').trim();
      if (sName && !list.includes(sName)) {
        list.push(sName);
      }
    });
    if (list.length === 0 && subjects.length > 0) {
      list.push('Genel');
    }
    return list;
  }, [plan?.definedSubjects, subjects]);

  const unitsByDers = useMemo(() => {
    const map = {};
    planDersList.forEach(d => {
      map[d] = [];
    });
    subjects.forEach(unit => {
      const d = (unit.subject || '').trim() || (planDersList[0] || 'Genel');
      if (!map[d]) map[d] = [];
      map[d].push(unit);
    });
    return map;
  }, [planDersList, subjects]);

  // Expanded Units & Ders State
  const [expandedUnits, setExpandedUnits] = useState([]);
  const [expandedDersler, setExpandedDersler] = useState([]);
  const [isDerslerInitialized, setIsDerslerInitialized] = useState(false);

  useEffect(() => {
    if (!isDerslerInitialized && planDersList.length > 0) {
      setExpandedDersler([...planDersList]);
      setIsDerslerInitialized(true);
    }
  }, [planDersList, isDerslerInitialized]);

  // Modals
  const [dersModal, setDersModal] = useState({ isOpen: false, isEditing: false, oldDersName: '', dersName: '', initialUnitName: '1. Ünite' });
  const [unitModal, setUnitModal] = useState({ isOpen: false, unit: null, defaultSubject: '' });
  const [topicModal, setTopicModal] = useState({ isOpen: false, unitId: null, topic: null });
  const [bulkTopicModal, setBulkTopicModal] = useState({ isOpen: false, unitId: null });
  const [assignModal, setAssignModal] = useState(false);
  const [jsonModal, setJsonModal] = useState(false);
  const [bulkMode, setBulkMode] = useState('text'); // 'text' or 'json'
  const [bulkText, setBulkText] = useState('');

  // Form states
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [unitForm, setUnitForm] = useState({ subject: '', name: '', dueDate: '', resourceUrl: '' });
  const [topicForm, setTopicForm] = useState({ name: '', day: '', dueDate: '', resourceUrl: '' });
  const [bulkTopicText, setBulkTopicText] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [jsonText, setJsonText] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // Selected student for detailed curriculum inspection (null = general view)
  const [selectedStudentProgressId, setSelectedStudentProgressId] = useState(null);
  const [studentProgressSearch, setStudentProgressSearch] = useState('');

  // Total topics count
  const totalTopicsCount = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
  }, [subjects]);

  // All topics in the plan flattened
  const allPlanTopics = useMemo(() => {
    const list = [];
    subjects.forEach(unit => {
      (unit.topics || []).forEach(t => {
        list.push({
          ...t,
          unitId: unit.id,
          unitName: unit.name,
          subject: unit.subject || 'Genel'
        });
      });
    });
    return list;
  }, [subjects]);

  // All assignments for this specific plan
  const planAssignments = useMemo(() => {
    return (studyAssignments || []).filter(a => String(a.planId || a.studyPlanId) === String(planId));
  }, [studyAssignments, planId]);

  // Assigned student count for this plan
  const assignedCount = useMemo(() => {
    return planAssignments.length;
  }, [planAssignments]);

  // Assigned students with their progress calculations
  const assignedStudentsList = useMemo(() => {
    return planAssignments.map(assignment => {
      const student = (users || []).find(u => String(u.id) === String(assignment.studentId)) || {
        id: assignment.studentId,
        name: assignment.studentName || 'Öğrenci',
        surname: assignment.studentSurname || '',
        username: assignment.studentUsername || assignment.studentId,
        className: assignment.className || ''
      };

      let completedTopicsRaw = assignment.completedTopics;
      if (typeof completedTopicsRaw === 'string') {
        try {
          completedTopicsRaw = JSON.parse(completedTopicsRaw);
        } catch {
          completedTopicsRaw = [];
        }
      }
      if (!Array.isArray(completedTopicsRaw)) {
        completedTopicsRaw = [];
      }

      const completedSet = new Set(completedTopicsRaw.map(String));

      let completedCount = 0;
      allPlanTopics.forEach(t => {
        if (completedSet.has(String(t.id)) || (t.name && completedSet.has(t.name))) {
          completedCount++;
        }
      });

      const totalTopics = allPlanTopics.length;
      const progressPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

      let status = 'not_started';
      if (progressPct === 100 && totalTopics > 0) {
        status = 'completed';
      } else if (progressPct > 0 || completedCount > 0) {
        status = 'in_progress';
      }

      return {
        assignment,
        student,
        completedTopicsRaw,
        completedSet,
        completedCount,
        totalTopics,
        progressPct,
        status,
        assignedAt: assignment.createdAt || assignment.assignedAt
      };
    });
  }, [planAssignments, users, allPlanTopics]);

  // Aggregate completion stats
  const completionStats = useMemo(() => {
    const total = assignedStudentsList.length;
    if (total === 0) {
      return { total: 0, avgProgress: 0, completedCount: 0, inProgressCount: 0, notStartedCount: 0 };
    }
    const sumProgress = assignedStudentsList.reduce((acc, s) => acc + s.progressPct, 0);
    const avgProgress = Math.round(sumProgress / total);
    const completedCount = assignedStudentsList.filter(s => s.status === 'completed').length;
    const inProgressCount = assignedStudentsList.filter(s => s.status === 'in_progress').length;
    const notStartedCount = assignedStudentsList.filter(s => s.status === 'not_started').length;

    return {
      total,
      avgProgress,
      completedCount,
      inProgressCount,
      notStartedCount
    };
  }, [assignedStudentsList]);

  // Active student being inspected in curriculum tree
  const activeStudentProgress = useMemo(() => {
    if (!selectedStudentProgressId) return null;
    return assignedStudentsList.find(s => 
      String(s.assignment.id) === String(selectedStudentProgressId) || 
      String(s.student.id) === String(selectedStudentProgressId)
    ) || null;
  }, [selectedStudentProgressId, assignedStudentsList]);

  // Filtered by search in student cards
  const filteredAssignedStudents = useMemo(() => {
    if (!studentProgressSearch.trim()) return assignedStudentsList;
    const q = studentProgressSearch.toLowerCase().trim();
    return assignedStudentsList.filter(s => {
      const fullName = `${s.student.name || ''} ${s.student.surname || ''}`.toLowerCase();
      const username = (s.student.username || '').toLowerCase();
      const className = (s.student.className || '').toLowerCase();
      return fullName.includes(q) || username.includes(q) || className.includes(q);
    });
  }, [assignedStudentsList, studentProgressSearch]);

  if (!plan) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '460px' }}>
          <Compass size={48} style={{ color: '#818cf8', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--color-text, #0f172a)', fontWeight: 900, fontSize: '1.4rem' }}>Plan Bulunamadı</h2>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            İstediğiniz çalışma yol haritası silinmiş veya taşınmış olabilir.
          </p>
          <button 
            onClick={() => navigate('/study-plans')}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
          >
            ← Yol Haritalarına Dön
          </button>
        </div>
      </div>
    );
  }

  // If a teacher tries to access another teacher's plan
  if (isTeacher && !isOwner) {
    return (
      <div className="study-plans-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="study-glass-card" style={{ padding: '3rem 2.5rem', maxWidth: '480px' }}>
          <Lock size={48} style={{ color: '#f87171', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--color-text, #0f172a)', fontWeight: 900, fontSize: '1.4rem' }}>Yetkisiz Erişim</h2>
          <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Bu yol haritası başka bir öğretmene aittir. Yalnızca kendi oluşturduğunuz veya eklediğiniz yol haritalarını görüntüleyebilir ve düzenleyebilirsiniz.
          </p>
          <button 
            onClick={() => navigate('/study-plans')}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.75rem', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
          >
            ← Kendi Yol Haritalarıma Dön
          </button>
        </div>
      </div>
    );
  }

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => 
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const toggleDers = (dersName) => {
    setExpandedDersler((prev) =>
      prev.includes(dersName) ? prev.filter(d => d !== dersName) : [...prev, dersName]
    );
  };

  const handleExpandAll = () => {
    setExpandedDersler([...planDersList]);
    setExpandedUnits(subjects.map(s => s.id));
  };

  const handleCollapseAll = () => {
    setExpandedDersler([]);
    setExpandedUnits([]);
  };

  // Ders Actions
  const openDersModal = (dersToEdit = null) => {
    if (dersToEdit) {
      setDersModal({
        isOpen: true,
        isEditing: true,
        oldDersName: dersToEdit,
        dersName: dersToEdit,
        initialUnitName: ''
      });
    } else {
      setDersModal({
        isOpen: true,
        isEditing: false,
        oldDersName: '',
        dersName: '',
        initialUnitName: '1. Ünite'
      });
    }
  };

  const saveDers = () => {
    const trimmedDers = dersModal.dersName.trim();
    if (!trimmedDers) {
      showToast('Lütfen bir ders adı giriniz.', 'error');
      return;
    }

    if (dersModal.isEditing) {
      const oldName = dersModal.oldDersName;
      if (oldName === trimmedDers) {
        setDersModal({ isOpen: false, isEditing: false, oldDersName: '', dersName: '', initialUnitName: '' });
        return;
      }
      const currentDefined = Array.isArray(plan.definedSubjects) ? plan.definedSubjects : planDersList;
      const newDefined = currentDefined.map(d => d === oldName ? trimmedDers : d);
      if (!newDefined.includes(trimmedDers)) newDefined.push(trimmedDers);

      const newSubjects = subjects.map(u => {
        const uSub = (u.subject || '').trim() || (planDersList[0] || 'Genel');
        if (uSub === oldName) {
          return { ...u, subject: trimmedDers };
        }
        return u;
      });

      updateStudyPlan(plan.id, { definedSubjects: newDefined, subjects: newSubjects });
      showToast(`Ders adı "${trimmedDers}" olarak güncellendi.`);
    } else {
      const currentDefined = Array.isArray(plan.definedSubjects) ? [...plan.definedSubjects] : [...planDersList];
      if (!currentDefined.includes(trimmedDers)) {
        currentDefined.push(trimmedDers);
      }

      let newSubjects = [...subjects];
      const initialUnit = dersModal.initialUnitName.trim();
      if (initialUnit) {
        const newUnitId = `sub_${Date.now()}`;
        newSubjects.push({
          id: newUnitId,
          subject: trimmedDers,
          name: initialUnit,
          dueDate: '',
          resourceUrl: '',
          topics: []
        });
        setExpandedUnits(prev => [...prev, newUnitId]);
      }

      updateStudyPlan(plan.id, { definedSubjects: currentDefined, subjects: newSubjects });
      if (!expandedDersler.includes(trimmedDers)) {
        setExpandedDersler(prev => [...prev, trimmedDers]);
      }
      showToast(`"${trimmedDers}" dersi başarıyla eklendi! 📚`);
    }

    setDersModal({ isOpen: false, isEditing: false, oldDersName: '', dersName: '', initialUnitName: '' });
  };

  const deleteDers = (dersName) => {
    const dersUnits = unitsByDers[dersName] || [];
    const confirmMsg = dersUnits.length > 0
      ? `"${dersName}" dersini ve bu derse ait ${dersUnits.length} üniteyi (tüm konularıyla birlikte) silmek istediğinize emin misiniz?`
      : `"${dersName}" dersini silmek istediğinize emin misiniz?`;
    if (!window.confirm(confirmMsg)) return;

    const currentDefined = Array.isArray(plan.definedSubjects) ? plan.definedSubjects : planDersList;
    const newDefined = currentDefined.filter(d => d !== dersName);
    const newSubjects = subjects.filter(u => {
      const uSub = (u.subject || '').trim() || (planDersList[0] || 'Genel');
      return uSub !== dersName;
    });

    updateStudyPlan(plan.id, { definedSubjects: newDefined, subjects: newSubjects });
    showToast(`"${dersName}" dersi silindi.`);
  };

  // Unit Actions
  const openUnitModal = (unit = null, defaultSubject = '') => {
    const activeSubject = unit?.subject || defaultSubject || planDersList[0] || 'Matematik';
    setUnitForm(unit ? { 
      subject: activeSubject,
      name: unit.name, 
      dueDate: unit.dueDate || '', 
      resourceUrl: unit.resourceUrl || '' 
    } : { 
      subject: activeSubject,
      name: '', 
      dueDate: '', 
      resourceUrl: '' 
    });
    setIsCustomSubject(false);
    setCustomSubjectInput('');
    setUnitModal({ isOpen: true, unit, defaultSubject });
  };

  const saveUnit = () => {
    if (!unitForm.name.trim()) return;
    const finalSubject = (isCustomSubject && customSubjectInput.trim()) 
      ? customSubjectInput.trim() 
      : (unitForm.subject.trim() || planDersList[0] || 'Matematik');
    
    let newSubjects = [...subjects];
    if (unitModal.unit) {
      newSubjects = newSubjects.map(s => s.id === unitModal.unit.id ? { 
        ...s, 
        ...unitForm,
        subject: finalSubject 
      } : s);
      showToast('Ünite başarıyla güncellendi.');
    } else {
      const newUnitId = `sub_${Date.now()}`;
      newSubjects.push({
        id: newUnitId,
        subject: finalSubject,
        name: unitForm.name.trim(),
        dueDate: unitForm.dueDate,
        resourceUrl: unitForm.resourceUrl,
        topics: []
      });
      setExpandedUnits(prev => [...prev, newUnitId]);
      showToast('Yeni ünite başarıyla eklendi.');
    }
    
    const currentDefined = Array.isArray(plan.definedSubjects) ? [...plan.definedSubjects] : [...planDersList];
    if (!currentDefined.includes(finalSubject)) {
      currentDefined.push(finalSubject);
    }

    updateStudyPlan(plan.id, { definedSubjects: currentDefined, subjects: newSubjects });
    setUnitModal({ isOpen: false, unit: null });
  };

  const deleteUnit = (unitId) => {
    if (!window.confirm('Bu üniteyi ve altındaki tüm konuları silmek istediğinize emin misiniz?')) return;
    const newSubjects = subjects.filter(s => s.id !== unitId);
    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast('Ünite başarıyla silindi.');
  };

  // Topic Actions
  const openTopicModal = (unitId, topic = null) => {
    setTopicForm(topic ? { name: topic.name || '', day: topic.day || '', dueDate: topic.dueDate || '', resourceUrl: topic.resourceUrl || '' } : { name: '', day: '', dueDate: '', resourceUrl: '' });
    setTopicModal({ isOpen: true, unitId, topic });
  };

  const saveTopic = () => {
    if (!topicForm.name.trim()) return;

    const newSubjects = subjects.map(s => {
      if (s.id === topicModal.unitId) {
        let newTopics = [...(s.topics || [])];
        if (topicModal.topic) {
          newTopics = newTopics.map(t => t.id === topicModal.topic.id ? { ...t, ...topicForm } : t);
          showToast('Konu güncellendi.');
        } else {
          newTopics.push({
            id: `top_${Date.now()}`,
            ...topicForm
          });
          showToast('Yeni konu eklendi.');
        }
        return { ...s, topics: newTopics };
      }
      return s;
    });

    updateStudyPlan(plan.id, { subjects: newSubjects });
    setTopicModal({ isOpen: false, unitId: null, topic: null });
  };

  const saveBulkTopics = () => {
    if (!bulkTopicText.trim()) return;
    
    const lines = bulkTopicText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    let newSubjects = [...subjects];

    if (bulkTopicModal.unitId === 'auto_create') {
      const newTopics = lines.map((line, idx) => ({
        id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${idx}`,
        name: line
      }));
      const newUnitId = `sub_${Date.now()}`;
      newSubjects.push({
        id: newUnitId,
        name: 'Genel Müfredat',
        topics: newTopics
      });
      setExpandedUnits(prev => [...prev, newUnitId]);
    } else {
      newSubjects = subjects.map(s => {
        if (s.id === bulkTopicModal.unitId) {
          let newTopics = [...(s.topics || [])];
          lines.forEach((line, idx) => {
            newTopics.push({
              id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${idx}`,
              name: line
            });
          });
          return { ...s, topics: newTopics };
        }
        return s;
      });
    }

    updateStudyPlan(plan.id, { subjects: newSubjects });
    setBulkTopicModal({ isOpen: false, unitId: null });
    setBulkTopicText('');
    showToast(`${lines.length} konu başarıyla eklendi! 🚀`);
  };

  const deleteTopic = (unitId, topicId) => {
    if (!window.confirm('Bu konuyu silmek istediğinize emin misiniz?')) return;
    const newSubjects = subjects.map(s => {
      if (s.id === unitId) {
        return { ...s, topics: (s.topics || []).filter(t => t.id !== topicId) };
      }
      return s;
    });
    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast('Konu silindi.');
  };

  const handleAutoNumberDays = (targetUnitId = null) => {
    let dayCounter = 1;
    const newSubjects = subjects.map(unit => {
      if (targetUnitId && unit.id !== targetUnitId) return unit;
      const newTopics = (unit.topics || []).map(t => {
        const updated = { ...t, day: String(dayCounter) };
        dayCounter++;
        return updated;
      });
      return { ...unit, topics: newTopics };
    });

    updateStudyPlan(plan.id, { subjects: newSubjects });
    showToast(`Konular Gün 1'den Gün ${dayCounter - 1}'e kadar sırayla otomatik numaralandırıldı! ✨`);
  };

  const handleSetTopicDay = (unitId, topicId, newDayStr) => {
    const newSubjects = subjects.map(s => {
      if (s.id === unitId) {
        const newTopics = (s.topics || []).map(t => {
          if (t.id === topicId) {
            return { ...t, day: newDayStr };
          }
          return t;
        });
        return { ...s, topics: newTopics };
      }
      return s;
    });
    updateStudyPlan(plan.id, { subjects: newSubjects });
  };

  // Assign Actions
  const handleAssign = async () => {
    const existingAssignments = (studyAssignments || []).filter(a => String(a.planId || a.studyPlanId) === String(plan.id));
    const existingStudentIds = new Set(existingAssignments.map(a => String(a.studentId)));

    let addedCount = 0;
    for (const studentId of selectedStudents) {
      if (!existingStudentIds.has(String(studentId))) {
        await addStudyAssignment({ 
          studentId, 
          planId: plan.id, 
          studyPlanId: plan.id,
          teacherId: currentUser?.id || currentUser?.username,
          teacherUsername: currentUser?.username,
          teacherName: currentUser?.name || currentUser?.username,
          completedTopics: [] 
        });
        addedCount++;
      }
    }
    setAssignModal(false);
    setSelectedStudents([]);
    showToast(addedCount > 0 ? `${addedCount} yeni öğrenciye yol haritası başarıyla atandı! 🎉` : 'Öğrenci atamaları güncellendi.');
  };

  const handleToggleStudentTopic = async (assignmentId, topicId, willBeDone) => {
    const target = assignedStudentsList.find(s => String(s.assignment.id) === String(assignmentId));
    if (!target) return;
    const currentList = [...target.completedTopicsRaw];
    let updatedList;
    if (willBeDone) {
      if (!currentList.includes(topicId)) updatedList = [...currentList, topicId];
      else updatedList = currentList;
    } else {
      updatedList = currentList.filter(id => String(id) !== String(topicId));
    }

    const newPct = allPlanTopics.length > 0 ? Math.round((updatedList.length / allPlanTopics.length) * 100) : 0;
    const newStatus = (newPct === 100 && allPlanTopics.length > 0) ? 'completed' : (newPct > 0 ? 'in_progress' : 'assigned');

    await updateStudyAssignment(assignmentId, {
      completedTopics: updatedList,
      status: newStatus
    });
    showToast(willBeDone ? 'Konu tamamlandı olarak işaretlendi! ✅' : 'Konu tamamlanmadı olarak işaretlendi.');
  };

  const handleUnassignStudent = async (assignmentId, studentName) => {
    if (!window.confirm(`"${studentName}" adlı öğrencinin bu yol haritası atamasını kaldırmak istediğinize emin misiniz?`)) {
      return;
    }
    if (deleteStudyAssignment) {
      await deleteStudyAssignment(assignmentId);
    }
    if (String(selectedStudentProgressId) === String(assignmentId)) {
      setSelectedStudentProgressId(null);
    }
    showToast(`${studentName} ataması kaldırıldı.`);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Bulk Import Actions
  const parseBulkText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const units = [];
    let currentDers = planDersList[0] || 'Genel';
    let currentUnit = null;

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if ((lower.includes('gün') && lower.includes('içerik')) || /^gün\s*içerik/i.test(line)) {
        return;
      }

      // Check if line is a Ders header: e.g. "Ders: Matematik" or "[Matematik]" or "# Matematik"
      if (/^ders\s*[:=]/i.test(line) || (/^\[.+\]$/.test(line) && !line.includes(':')) || /^#\s+/i.test(line)) {
        const dersName = line.replace(/^(ders\s*[:=]|#+\s*|\[)/i, '').replace(/\]$/, '').trim();
        if (dersName) {
          currentDers = dersName;
          currentUnit = null;
          return;
        }
      }

      if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const dName = parts[0];
          const uName = parts[1];
          const tName = parts.slice(2).join('>').trim();
          let uObj = units.find(u => (u.subject || '').toLowerCase() === dName.toLowerCase() && u.name.toLowerCase() === uName.toLowerCase());
          if (!uObj) {
            uObj = { id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, subject: dName, name: uName, topics: [] };
            units.push(uObj);
          }
          if (tName) {
            uObj.topics.push({ id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: tName });
          }
          return;
        } else if (parts.length === 2) {
          const uName = parts[0];
          const tName = parts[1];
          let uObj = units.find(u => u.name.toLowerCase() === uName.toLowerCase());
          if (!uObj) {
            uObj = { id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, subject: currentDers, name: uName, topics: [] };
            units.push(uObj);
          }
          if (tName) {
            uObj.topics.push({ id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: tName });
          }
          return;
        }
      }

      const isUnitLine = (
        /^\d+[\.\s]*ünite/i.test(line) ||
        /^ünite\s*\d+/i.test(line) ||
        (line.toLowerCase().includes('ünite') && !line.includes('\t') && !line.includes('•')) ||
        (line.endsWith(':') && !line.includes('http'))
      );

      if (isUnitLine) {
        const unitName = line.replace(/:$/, '').trim();
        currentUnit = {
          id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          subject: currentDers,
          name: unitName,
          topics: []
        };
        units.push(currentUnit);
        return;
      }

      const tabParts = line.split(/\t+|\s{3,}/).map(p => p.trim()).filter(Boolean);
      if (tabParts.length >= 2 && (/^\d+$/.test(tabParts[0]) || /^gün\s*\d+/i.test(tabParts[0]))) {
        const dayStr = tabParts[0].toLowerCase().startsWith('gün') ? tabParts[0] : `Gün ${tabParts[0]}`;
        const content = tabParts[1];
        const pageInfo = tabParts[2] ? ` (s. ${tabParts[2]})` : '';
        const topicName = `${dayStr}: ${content}${pageInfo}`;

        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            subject: currentDers,
            name: '1. Ünite',
            topics: []
          };
          units.push(currentUnit);
        }

        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          name: topicName
        });
        return;
      }

      const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
      const cleanLine = line.replace(/^[-*•\d+\.\s]+/, '').trim();

      if (cleanLine) {
        if (!currentUnit) {
          currentUnit = {
            id: `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            subject: currentDers,
            name: 'Genel Ünite',
            topics: []
          };
          units.push(currentUnit);
        }
        currentUnit.topics.push({
          id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          name: isBullet ? cleanLine : line
        });
      }
    });

    return units;
  };

  const handleBulkImport = () => {
    let importedSubjects = [];
    if (bulkMode === 'text') {
      if (!bulkText.trim()) return;
      importedSubjects = parseBulkText(bulkText);
    } else {
      if (!jsonText.trim()) return;
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          importedSubjects = parsed.map(unit => ({
            ...unit,
            subject: unit.subject || planDersList[0] || 'Genel',
            id: unit.id || `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            topics: (unit.topics || []).map(t => typeof t === 'string' ? { id: `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, name: t } : {
              ...t,
              id: t.id || `top_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
            })
          }));
        } else {
          showToast('Geçersiz JSON formatı. Bir liste (dizi) olmalıdır.', 'error');
          return;
        }
      } catch (e) {
        showToast('JSON parse hatası: ' + e.message, 'error');
        return;
      }
    }

    if (importedSubjects.length === 0) {
      showToast('Hiç ünite veya konu okunamadı. Girişi kontrol edin.', 'error');
      return;
    }

    const newSubjects = [...subjects, ...importedSubjects];
    const newDefined = Array.from(new Set([
      ...(plan.definedSubjects || []),
      ...planDersList,
      ...importedSubjects.map(u => u.subject).filter(Boolean)
    ]));
    updateStudyPlan(plan.id, { definedSubjects: newDefined, subjects: newSubjects });
    setJsonModal(false);
    setBulkText('');
    setJsonText('');
    showToast(`${importedSubjects.length} ünite ve konuları başarıyla eklendi! 🎉`);
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
      <div className="study-glass-card" style={{ padding: isMobile ? '0.85rem' : '1.5rem 1.75rem', marginBottom: isMobile ? '0.85rem' : '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? '0.75rem' : '1.25rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', width: isMobile ? '100%' : 'auto' }}>
          <button 
            onClick={() => navigate('/study-plans')}
            style={{
              padding: isMobile ? '0.5rem' : '0.7rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              background: 'var(--color-surface-hover, #f1f5f9)',
              border: '1.5px solid var(--color-border, #cbd5e1)',
              color: 'var(--color-text, #0f172a)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title="Yol Haritalarına Dön"
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>
          
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.15rem' : '1.75rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                {plan.title}
              </h1>
              <span style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 900, background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.15rem 0.55rem', borderRadius: '1rem', border: '1px solid rgba(165,180,252,0.3)' }}>
                {planDersList.length > 0 ? `${planDersList.length} Ders • ` : ''}{subjects.length} Ünite • {totalTopicsCount} Konu
              </span>
              {assignedCount > 0 && (
                <span style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 900, background: 'rgba(236,72,153,0.12)', color: '#ec4899', padding: '0.15rem 0.55rem', borderRadius: '1rem', border: '1px solid rgba(244,114,182,0.3)' }}>
                  👥 {assignedCount} Öğrenci
                </span>
              )}
            </div>
            {!isMobile && (
              <p style={{ margin: '0.35rem 0 0 0', color: 'var(--color-text-muted, #64748b)', fontSize: '0.88rem', fontWeight: 600 }}>
                {plan.description || 'Yol haritasındaki dersleri, üniteleri, konuları, hedef tarihleri ve ders kaynaklarını düzenleyin.'}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? (subjects.length > 0 ? '1fr 1fr' : '1fr') : 'auto', width: isMobile ? '100%' : 'auto', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => openDersModal()}
            style={{
              padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.74rem' : '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
            }}
          >
            <BookOpen size={14} /> + Yeni Ders Ekle
          </button>

          {subjects.length > 0 && (
            <button
              onClick={() => handleAutoNumberDays()}
              style={{
                padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1.5px solid rgba(192, 132, 252, 0.4)',
                color: '#a855f7',
                fontWeight: 800,
                fontSize: isMobile ? '0.74rem' : '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
              title="Tüm konulara sırayla Gün 1, Gün 2, Gün 3... atar"
            >
              <Sparkles size={14} style={{ color: '#fbbf24' }} /> {isMobile ? 'Gün Sırala' : 'Günleri Otomatik Sırala (1..N)'}
            </button>
          )}

          <button
            onClick={() => setJsonModal(true)}
            style={{
              padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              color: '#0284c7',
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <ListPlus size={14} /> {isMobile ? 'Toplu Ekle' : 'Toplu Ünite & Konu Ekle'}
          </button>

          <button
            onClick={() => {
              const alreadyAssigned = (studyAssignments || [])
                .filter(a => String(a.planId || a.studyPlanId) === String(plan.id))
                .map(a => String(a.studentId));
              setSelectedStudents(alreadyAssigned);
              setAssignModal(true);
            }}
            style={{
              gridColumn: isMobile ? 'span 2' : 'auto',
              padding: isMobile ? '0.55rem 0.85rem' : '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236,72,153,0.35)'
            }}
          >
            <Users size={15} /> Öğrenciye Ata
          </button>
        </div>

      </div>

      {/* ── ASSIGNED STUDENTS & COMPLETION STATUS SECTION ── */}
      <div id="assigned-students-section" className="study-glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '0.85rem' : '1.5rem' }}>
        
        {/* Header with Search and Assign Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.15rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.25rem', color: 'var(--color-text, #0f172a)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={isMobile ? 20 : 22} style={{ color: '#ec4899' }} /> Atanan Öğrenciler ve İlerleme Durumu
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 900,
                color: '#ec4899',
                background: 'rgba(236,72,153,0.12)',
                border: '1px solid rgba(236,72,153,0.3)',
                padding: '0.15rem 0.55rem',
                borderRadius: '0.5rem'
              }}>
                {assignedStudentsList.length} Öğrenci
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 600 }}>
              Öğrencilerin bu yol haritasındaki genel ve konu bazlı tamamlama oranlarını buradan canlı olarak takip edebilirsiniz.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {assignedStudentsList.length > 0 && (
              <div style={{ position: 'relative', flex: isMobile ? 1 : 'none', minWidth: isMobile ? '140px' : '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted, #94a3b8)' }} />
                <input
                  type="text"
                  placeholder="Öğrenci ara..."
                  value={studentProgressSearch}
                  onChange={(e) => setStudentProgressSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.82rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-surface, #ffffff)',
                    color: 'var(--color-text, #0f172a)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {studentProgressSearch && (
                  <button
                    onClick={() => setStudentProgressSearch('')}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => {
                const alreadyAssigned = (studyAssignments || [])
                  .filter(a => String(a.planId || a.studyPlanId) === String(plan.id))
                  .map(a => String(a.studentId));
                setSelectedStudents(alreadyAssigned);
                setAssignModal(true);
              }}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 3px 10px rgba(236,72,153,0.3)',
                flex: isMobile && assignedStudentsList.length === 0 ? 1 : 'none',
                justifyContent: 'center'
              }}
            >
              <Users size={15} /> + Öğrenci Ata
            </button>
          </div>
        </div>

        {/* Empty State when no students assigned */}
        {assignedStudentsList.length === 0 ? (
          <div style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--color-surface-hover, #f8fafc)',
            borderRadius: '1rem',
            border: '1.5px dashed var(--color-border, #cbd5e1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
              <Users size={26} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                Bu Yol Haritasına Henüz Öğrenci Atanmadı
              </h4>
              <p style={{ margin: 0, color: 'var(--color-text-muted, #64748b)', fontSize: '0.86rem', maxWidth: '500px' }}>
                Öğrencilerinize bu planı atayarak tamamlama durumlarını, yüzdelerini ve adım adım ilerlemelerini bu panelden anlık olarak takip edebilirsiniz.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStudents([]);
                setAssignModal(true);
              }}
              style={{
                marginTop: '0.5rem',
                padding: '0.65rem 1.35rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Users size={16} /> Hemen Öğrenciye Ata
            </button>
          </div>
        ) : (
          <>
            {/* KPI Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.25rem'
            }}>
              {/* Card 1: Total */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.65rem', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', lineHeight: 1.1 }}>
                    {completionStats.total}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Atanan Öğrenci
                  </div>
                </div>
              </div>

              {/* Card 2: Avg Progress */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.65rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
                    %{completionStats.avgProgress}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ortalama İlerleme
                  </div>
                </div>
              </div>

              {/* Card 3: Completed */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.65rem', background: 'rgba(5,150,105,0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
                    {completionStats.completedCount}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tamamlayan (%100)
                  </div>
                </div>
              </div>

              {/* Card 4: In Progress */}
              <div style={{
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #e2e8f0)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.65rem', background: 'rgba(37,99,235,0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb', lineHeight: 1.1 }}>
                    {completionStats.inProgressCount}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Devam Eden
                  </div>
                </div>
              </div>
            </div>

            {/* Student Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '0.85rem'
            }}>
              {filteredAssignedStudents.map(item => {
                const isSelected = String(selectedStudentProgressId) === String(item.assignment.id);
                const sName = `${item.student.name || ''} ${item.student.surname || ''}`.trim() || item.student.username || 'Öğrenci';

                let statusBadge = {
                  text: `%${item.progressPct} Devam Ediyor`,
                  bg: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  border: 'rgba(37, 99, 235, 0.3)',
                  icon: '⚡'
                };
                if (item.status === 'completed') {
                  statusBadge = {
                    text: 'Tamamlandı (%100)',
                    bg: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    border: 'rgba(16, 185, 129, 0.35)',
                    icon: '✅'
                  };
                } else if (item.status === 'not_started') {
                  statusBadge = {
                    text: 'Başlanmadı (%0)',
                    bg: 'rgba(148, 163, 184, 0.12)',
                    color: '#64748b',
                    border: 'rgba(148, 163, 184, 0.3)',
                    icon: '⏳'
                  };
                }

                const barColor = item.status === 'completed'
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : (item.progressPct > 50
                    ? 'linear-gradient(90deg, #3b82f6, #10b981)'
                    : 'linear-gradient(90deg, #6366f1, #3b82f6)');

                return (
                  <div
                    key={item.assignment.id}
                    style={{
                      border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: '1rem',
                      padding: '1rem',
                      background: isSelected ? 'rgba(37, 99, 235, 0.03)' : 'var(--color-surface, #ffffff)',
                      boxShadow: isSelected ? '0 6px 20px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Avatar + Name + Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(99,102,241,0.25)'
                        }}>
                          {sName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sName}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                            {item.student.className ? `${item.student.className} • ` : ''}@{item.student.username || 'ogrenci'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.45rem',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        flexShrink: 0
                      }}>
                        <span>{statusBadge.icon}</span> {statusBadge.text}
                      </span>
                    </div>

                    {/* Progress Bar & Topic Stats */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 800 }}>
                        <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Tamamlama Durumu</span>
                        <span style={{ color: item.status === 'completed' ? '#059669' : '#2563eb', fontWeight: 900 }}>
                          {item.completedCount} / {item.totalTopics} Konu (%{item.progressPct})
                        </span>
                      </div>
                      
                      <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-hover, #f1f5f9)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--color-border, #e2e8f0)' }}>
                        <div style={{
                          width: `${item.progressPct}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: '999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', borderTop: '1px solid var(--color-border, #f1f5f9)', paddingTop: '0.65rem' }}>
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStudentProgressId(null);
                          } else {
                            setSelectedStudentProgressId(item.assignment.id);
                            const el = document.getElementById('curriculum-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.38rem 0.65rem',
                          borderRadius: '0.55rem',
                          background: isSelected ? '#2563eb' : 'var(--color-surface-hover, #f8fafc)',
                          color: isSelected ? '#ffffff' : '#2563eb',
                          border: isSelected ? 'none' : '1px solid rgba(37, 99, 235, 0.3)',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
                        }}
                        title="Bu öğrencinin konu detaylarını aşağıdaki müfredat ağacında aç"
                      >
                        {isSelected ? <EyeOff size={13} /> : <Eye size={13} />}
                        {isSelected ? 'İncelemeyi Kapat' : 'Müfredatta İncele'}
                      </button>

                      <button
                        onClick={() => window.open(`/student/study-plan/${item.assignment.id}`, '_blank')}
                        style={{
                          padding: '0.38rem 0.65rem',
                          borderRadius: '0.55rem',
                          background: 'var(--color-surface-hover, #f8fafc)',
                          color: 'var(--color-text, #0f172a)',
                          border: '1px solid var(--color-border, #cbd5e1)',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                        title="Öğrencinin kendi ekranındaki görünümünü yeni sekmede aç"
                      >
                        <ExternalLink size={13} /> Öğrenci Ekranı
                      </button>

                      <button
                        onClick={() => handleUnassignStudent(item.assignment.id, sName)}
                        style={{
                          padding: '0.38rem 0.5rem',
                          borderRadius: '0.55rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Öğrencinin bu yol haritası atamasını kaldır"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Search Empty Fallback */}
            {filteredAssignedStudents.length === 0 && studentProgressSearch && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted, #64748b)', fontSize: '0.88rem' }}>
                "{studentProgressSearch}" aramasıyla eşleşen atanan öğrenci bulunamadı.
              </div>
            )}
          </>
        )}

      </div>

      {/* ── UNITS & TOPICS SECTION ── */}
      <div id="curriculum-section" className="study-glass-card" style={{ padding: isMobile ? '0.85rem' : '1.75rem' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border, #e2e8f0)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.15rem', color: 'var(--color-text, #0f172a)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={isMobile ? 18 : 20} style={{ color: '#2563eb' }} /> Dersler ve Üniteler
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#2563eb', background: 'rgba(37,99,235,0.12)', padding: '0.15rem 0.5rem', borderRadius: '0.5rem', fontWeight: 800 }}>
              {planDersList.length} Ders • {subjects.length} Ünite
            </span>

            {/* Student Selector in Header */}
            {assignedStudentsList.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)' }}>
                  İnceleme:
                </span>
                <select
                  value={selectedStudentProgressId || 'all'}
                  onChange={(e) => setSelectedStudentProgressId(e.target.value === 'all' ? null : e.target.value)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '0.55rem',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    background: selectedStudentProgressId ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-surface, #ffffff)',
                    color: selectedStudentProgressId ? '#2563eb' : 'var(--color-text, #0f172a)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all">👥 Genel Müfredat Görünümü</option>
                  {assignedStudentsList.map(s => {
                    const name = `${s.student.name || ''} ${s.student.surname || ''}`.trim() || s.student.username;
                    return (
                      <option key={s.assignment.id} value={s.assignment.id}>
                        👤 {name} (%{s.progressPct} - {s.completedCount}/{s.totalTopics})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            {(planDersList.length > 0 || subjects.length > 0) && (
              <>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', padding: '0.35rem 0.6rem', fontWeight: 800, borderRadius: '0.55rem', background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text, #0f172a)', border: '1px solid var(--color-border, #cbd5e1)', cursor: 'pointer' }}
                >
                  📂 Tümünü Aç
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', padding: '0.35rem 0.6rem', fontWeight: 800, borderRadius: '0.55rem', background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text, #0f172a)', border: '1px solid var(--color-border, #cbd5e1)', cursor: 'pointer' }}
                >
                  📁 Kapat
                </button>
              </>
            )}
            <button
              onClick={() => openDersModal()}
              style={{ flex: isMobile ? 1 : 'none', fontSize: isMobile ? '0.76rem' : '0.82rem', padding: '0.4rem 0.85rem', fontWeight: 900, borderRadius: '0.55rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
            >
              <BookOpen size={15} /> + Yeni Ders Ekle
            </button>
            <button
              onClick={() => openUnitModal()}
              style={{ flex: isMobile ? 1 : 'none', fontSize: isMobile ? '0.76rem' : '0.82rem', padding: '0.4rem 0.85rem', fontWeight: 900, borderRadius: '0.55rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <Plus size={15} /> + Yeni Ünite Ekle
            </button>
          </div>
        </div>

        {/* Active Student Inspection Banner */}
        {activeStudentProgress && (
          <div style={{
            margin: '0 0 1rem 0',
            padding: '0.75rem 1rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.08))',
            border: '1.5px solid rgba(37,99,235,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                {(activeStudentProgress.student.name || 'Ö').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span>{activeStudentProgress.student.name} {activeStudentProgress.student.surname}</span>
                  <span style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 800 }}>
                    • %{activeStudentProgress.progressPct} Tamamlandı ({activeStudentProgress.completedCount} / {activeStudentProgress.totalTopics} Konu)
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 600, marginTop: '0.1rem' }}>
                  💡 Konuların yanındaki "Tamamlandı" butonuna tıklayarak öğrenci adına konuyu anında güncelleyebilirsiniz.
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudentProgressId(null)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.55rem',
                background: 'var(--color-surface, #ffffff)',
                border: '1px solid var(--color-border, #cbd5e1)',
                color: 'var(--color-text, #0f172a)',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <X size={13} /> Genel Görünüme Dön
            </button>
          </div>
        )}

        {/* Units List Grouped by Ders */}
        {planDersList.length === 0 && subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: '1rem', border: '1.5px dashed var(--color-border, #cbd5e1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>
              Bu yol haritasına henüz bir ders, ünite veya konu eklenmemiş.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => openDersModal()}
                style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '0.65rem', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
              >
                <BookOpen size={16} /> + Önce Ders Ekle
              </button>
              <button
                onClick={() => openUnitModal()}
                style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '0.65rem', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
              >
                <Plus size={16} /> Direkt Ünite Ekle
              </button>
              <button
                onClick={() => { setBulkTopicModal({ isOpen: true, unitId: 'auto_create' }); setBulkTopicText(''); }}
                style={{ padding: '0.65rem 1.25rem', background: 'rgba(56,189,248,0.12)', border: '1.5px solid rgba(56,189,248,0.4)', borderRadius: '0.65rem', color: '#0284c7', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ListPlus size={16} /> Direkt Satır Satır Konu Yapıştır
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {planDersList.map((dersName) => {
              const theme = getSubjectTheme(dersName);
              const dersUnits = unitsByDers[dersName] || [];
              const isDersExpanded = expandedDersler.includes(dersName);
              const dersTopicsCount = dersUnits.reduce((sum, u) => sum + (u.topics?.length || 0), 0);

              return (
                <div 
                  key={dersName} 
                  style={{
                    border: `1.5px solid ${theme.border || 'var(--color-border, #e2e8f0)'}`,
                    borderRadius: '1.15rem',
                    overflow: 'hidden',
                    background: 'var(--color-surface, #ffffff)',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Ders Header */}
                  <div
                    onClick={() => toggleDers(dersName)}
                    style={{
                      background: theme.bg || 'var(--color-surface-hover, #f8fafc)',
                      borderBottom: isDersExpanded ? `1.5px solid ${theme.border || 'var(--color-border, #e2e8f0)'}` : 'none',
                      padding: isMobile ? '0.75rem 0.95rem' : '0.95rem 1.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      flexWrap: 'wrap',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                      {isDersExpanded ? (
                        <ChevronDown size={20} style={{ color: theme.color || '#6366f1', flexShrink: 0 }} />
                      ) : (
                        <ChevronRight size={20} style={{ color: theme.color || '#6366f1', flexShrink: 0 }} />
                      )}
                      
                      <div style={{ width: 34, height: 34, borderRadius: '0.65rem', background: '#ffffff', border: `1.5px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                        {theme.icon || '📚'}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.color, background: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: `1px solid ${theme.border}` }}>
                            DERS
                          </span>
                          <h3 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                            {dersName}
                          </h3>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.color, background: '#ffffff', padding: '0.12rem 0.5rem', borderRadius: '0.45rem', border: `1px solid ${theme.border}` }}>
                            {dersUnits.length} Ünite • {dersTopicsCount} Konu
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ders Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openUnitModal(null, dersName)}
                        style={{
                          padding: isMobile ? '0.35rem 0.65rem' : '0.4rem 0.85rem',
                          borderRadius: '0.55rem',
                          background: theme.color,
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: isMobile ? '0.74rem' : '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: `0 3px 8px ${theme.color}35`
                        }}
                        title={`${dersName} dersine yeni ünite ekle`}
                      >
                        <Plus size={14} /> {isMobile ? 'Ünite Ekle' : '+ Bu Derse Ünite Ekle'}
                      </button>

                      <button
                        onClick={() => openDersModal(dersName)}
                        style={{
                          padding: '0.4rem 0.55rem',
                          borderRadius: '0.55rem',
                          background: 'var(--color-surface, #ffffff)',
                          border: '1px solid var(--color-border, #cbd5e1)',
                          color: 'var(--color-text, #0f172a)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Ders Adını Düzenle"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => deleteDers(dersName)}
                        style={{
                          padding: '0.4rem 0.55rem',
                          borderRadius: '0.55rem',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Dersi ve Ünitelerini Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Units of this Ders */}
                  {isDersExpanded && (
                    <div style={{ padding: isMobile ? '0.75rem' : '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', background: 'var(--color-surface-hover, #f8fafc)' }}>
                      {dersUnits.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface, #ffffff)', borderRadius: '0.85rem', border: '1.5px dashed var(--color-border, #cbd5e1)' }}>
                          <p style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-muted, #64748b)', fontSize: '0.88rem', fontWeight: 700 }}>
                            "{dersName}" dersi için henüz bir ünite eklenmedi.
                          </p>
                          <button
                            onClick={() => openUnitModal(null, dersName)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.6rem', background: theme.color, color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}
                          >
                            <Plus size={14} /> + İlk Üniteyi Ekle
                          </button>
                        </div>
                      ) : (
                        dersUnits.map((unit) => {
                          const isExpanded = expandedUnits.includes(unit.id);
                          const topics = unit.topics || [];

                          return (
                            <div key={unit.id} style={{ border: '1.5px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', overflow: 'hidden', background: 'var(--color-surface, #ffffff)' }}>
                              {/* Unit Header */}
                              <div 
                                onClick={() => toggleUnit(unit.id)}
                                style={{
                                  background: 'var(--color-surface, #ffffff)',
                                  padding: '0.85rem 1.15rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  borderBottom: isExpanded ? '1px solid var(--color-border, #e2e8f0)' : 'none',
                                  flexWrap: 'wrap',
                                  gap: '0.65rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                                  {isExpanded ? <ChevronDown size={18} style={{ color: theme.color || '#6366f1' }} /> : <ChevronRight size={18} style={{ color: theme.color || '#6366f1' }} />}
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                      <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--color-text, #0f172a)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Layers size={16} style={{ color: theme.color || '#6366f1' }} /> {unit.name}
                                      </h4>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '0.12rem 0.5rem', borderRadius: '0.45rem', border: '1px solid rgba(165,180,252,0.3)' }}>
                                        {topics.length} Konu Adımı
                                      </span>

                                      {/* If a student is being inspected, show their unit progress */}
                                      {activeStudentProgress && (() => {
                                        const unitDoneCount = topics.filter(t => activeStudentProgress.completedSet.has(String(t.id)) || (t.name && activeStudentProgress.completedSet.has(t.name))).length;
                                        const unitPct = topics.length > 0 ? Math.round((unitDoneCount / topics.length) * 100) : 0;
                                        const isAllUnitDone = unitDoneCount === topics.length && topics.length > 0;
                                        return (
                                          <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 900,
                                            background: isAllUnitDone ? 'rgba(16,185,129,0.15)' : (unitDoneCount > 0 ? 'rgba(37,99,235,0.12)' : 'var(--color-surface-hover, #f1f5f9)'),
                                            color: isAllUnitDone ? '#059669' : (unitDoneCount > 0 ? '#2563eb' : 'var(--color-text-muted, #64748b)'),
                                            padding: '0.12rem 0.55rem',
                                            borderRadius: '0.45rem',
                                            border: `1px solid ${isAllUnitDone ? 'rgba(16,185,129,0.35)' : (unitDoneCount > 0 ? 'rgba(37,99,235,0.3)' : 'var(--color-border, #cbd5e1)')}`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                          }}>
                                            {isAllUnitDone ? <CheckCircle2 size={12} /> : null}
                                            {unitDoneCount}/{topics.length} Tamamlandı (%{unitPct})
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                      {unit.dueDate && (
                                        <span style={{ fontSize: '0.74rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                                          <Calendar size={13} /> Hedef: {unit.dueDate}
                                        </span>
                                      )}
                                      {unit.resourceUrl && (
                                        <a
                                          href={unit.resourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800, textDecoration: 'none' }}
                                        >
                                          <Globe size={13} /> Genel Kaynak Linki ↗
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Unit Toolbar Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => { setBulkTopicModal({ isOpen: true, unitId: unit.id }); setBulkTopicText(''); }}
                                    style={{ padding: '0.32rem 0.6rem', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '0.5rem', color: '#0284c7', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Toplu Konu Ekle (Satır Satır)"
                                  >
                                    <ListPlus size={13} /> Toplu Ekle
                                  </button>
                                  <button
                                    onClick={() => openTopicModal(unit.id)}
                                    style={{ padding: '0.32rem 0.6rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '0.5rem', color: '#10b981', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Konu Ekle"
                                  >
                                    <Plus size={13} /> Konu Ekle
                                  </button>
                                  <button
                                    onClick={() => openUnitModal(unit)}
                                    style={{ padding: '0.32rem 0.5rem', background: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: '0.5rem', color: 'var(--color-text, #0f172a)', cursor: 'pointer' }}
                                    title="Üniteyi Düzenle"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => deleteUnit(unit.id)}
                                    style={{ padding: '0.32rem 0.5rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer' }}
                                    title="Üniteyi Sil"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Topics List (Expanded Only) */}
                              {isExpanded && (
                                <div style={{ padding: '1rem', background: 'var(--color-surface-hover, #f8fafc)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                  {topics.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.4rem 0' }}>
                                      Bu ünitede henüz konu bulunmuyor. Yukarıdaki "Konu Ekle" butonunu kullanabilirsiniz.
                                    </p>
                                  ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                                        {topics.map(topic => {
                                          const isTopicDone = activeStudentProgress ? (
                                            activeStudentProgress.completedSet.has(String(topic.id)) || (topic.name && activeStudentProgress.completedSet.has(topic.name))
                                          ) : false;

                                          const totalStudentsCompletedThisTopic = (!activeStudentProgress && assignedStudentsList.length > 0)
                                            ? assignedStudentsList.filter(s => s.completedSet.has(String(topic.id)) || (topic.name && s.completedSet.has(topic.name))).length
                                            : 0;

                                          return (
                                            <div 
                                              key={topic.id}
                                              style={{
                                                padding: '0.75rem 0.95rem',
                                                borderRadius: '0.75rem',
                                                background: isTopicDone ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface, #ffffff)',
                                                border: isTopicDone ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--color-border, #e2e8f0)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '0.65rem',
                                                boxShadow: isTopicDone ? '0 2px 8px rgba(16, 185, 129, 0.08)' : 'none',
                                                transition: 'all 0.2s ease'
                                              }}
                                            >
                                              <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                  {topic.day && (
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(165,180,252,0.3)', flexShrink: 0 }}>
                                                      {topic.day.toLowerCase().startsWith('gün') ? topic.day : `Gün ${topic.day}`}
                                                    </span>
                                                  )}
                                                  <span style={{
                                                    fontWeight: 800,
                                                    fontSize: '0.88rem',
                                                    color: isTopicDone ? '#047857' : 'var(--color-text, #0f172a)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    {topic.name}
                                                  </span>

                                                  {/* Active Student Completion Toggle */}
                                                  {activeStudentProgress && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStudentTopic(activeStudentProgress.assignment.id, topic.id, !isTopicDone);
                                                      }}
                                                      style={{
                                                        background: isTopicDone ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-hover, #f1f5f9)',
                                                        color: isTopicDone ? '#059669' : 'var(--color-text-muted, #64748b)',
                                                        border: `1px solid ${isTopicDone ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border, #cbd5e1)'}`,
                                                        borderRadius: '0.4rem',
                                                        padding: '0.12rem 0.5rem',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 900,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        transition: 'all 0.15s ease'
                                                      }}
                                                      title={isTopicDone ? 'Öğrenci için tamamlanmadı olarak işaretle' : 'Öğrenci için tamamlandı olarak işaretle'}
                                                    >
                                                      {isTopicDone ? (
                                                        <>
                                                          <CheckCircle2 size={12} style={{ color: '#059669' }} />
                                                          <span>Tamamlandı</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Clock size={11} />
                                                          <span>Bekliyor</span>
                                                        </>
                                                      )}
                                                    </button>
                                                  )}

                                                  {/* General View: Overall student count */}
                                                  {!activeStudentProgress && assignedStudentsList.length > 0 && (
                                                    <span style={{
                                                      fontSize: '0.68rem',
                                                      fontWeight: 800,
                                                      background: totalStudentsCompletedThisTopic === assignedStudentsList.length ? 'rgba(16,185,129,0.12)' : (totalStudentsCompletedThisTopic > 0 ? 'rgba(37,99,235,0.08)' : 'var(--color-surface-hover, #f1f5f9)'),
                                                      color: totalStudentsCompletedThisTopic === assignedStudentsList.length ? '#059669' : (totalStudentsCompletedThisTopic > 0 ? '#2563eb' : 'var(--color-text-muted, #94a3b8)'),
                                                      border: `1px solid ${totalStudentsCompletedThisTopic === assignedStudentsList.length ? 'rgba(16,185,129,0.3)' : (totalStudentsCompletedThisTopic > 0 ? 'rgba(37,99,235,0.2)' : 'var(--color-border, #e2e8f0)')}`,
                                                      padding: '0.1rem 0.4rem',
                                                      borderRadius: '0.35rem',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '0.2rem'
                                                    }}>
                                                      <Users size={10} />
                                                      {totalStudentsCompletedThisTopic}/{assignedStudentsList.length} öğrenci
                                                    </span>
                                                  )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                                  {topic.dueDate && (
                                                    <span style={{ fontSize: '0.72rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                                                      <Calendar size={12} /> {topic.dueDate}
                                                    </span>
                                                  )}
                                                  {topic.resourceUrl && (
                                                    <a
                                                      href={topic.resourceUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 800 }}
                                                    >
                                                      <LinkIcon size={12} /> Link ↗
                                                    </a>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Day Stepper & Actions */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-hover, #f1f5f9)', borderRadius: '0.45rem', border: '1px solid var(--color-border, #cbd5e1)', padding: '0.1rem 0.25rem' }}>
                                                  <button
                                                    onClick={() => {
                                                      const cur = parseInt(String(topic.day || '1').replace(/\D/g, ''), 10) || 1;
                                                      handleSetTopicDay(unit.id, topic.id, String(Math.max(1, cur - 1)));
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer', fontWeight: 900, padding: '0.15rem 0.35rem' }}
                                                    title="Günü Azalt"
                                                  >
                                                    -
                                                  </button>
                                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#6366f1', padding: '0 0.2rem' }}>
                                                    {topic.day ? (topic.day.toLowerCase().startsWith('gün') ? topic.day : `G${topic.day}`) : '+G'}
                                                  </span>
                                                  <button
                                                    onClick={() => {
                                                      const cur = parseInt(String(topic.day || '0').replace(/\D/g, ''), 10) || 0;
                                                      handleSetTopicDay(unit.id, topic.id, String(cur + 1));
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer', fontWeight: 900, padding: '0.15rem 0.35rem' }}
                                                    title="Günü Artır"
                                                  >
                                                    +
                                                  </button>
                                                </div>

                                                <button
                                                  onClick={() => openTopicModal(unit.id, topic)}
                                                  style={{ padding: '0.3rem', background: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: '0.45rem', color: 'var(--color-text, #0f172a)', cursor: 'pointer' }}
                                                  title="Konuyu Düzenle"
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                                <button
                                                  onClick={() => deleteTopic(unit.id, topic.id)}
                                                  style={{ padding: '0.3rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.45rem', color: '#ef4444', cursor: 'pointer' }}
                                                  title="Konuyu Sil"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── MODAL: DERS EKLE / DÜZENLE ── */}
      {dersModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '480px', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BookOpen size={20} style={{ color: '#2563eb' }} />
                {dersModal.isEditing ? 'Ders Adını Düzenle' : 'Yeni Ders Ekle'}
              </h3>
              <button onClick={() => setDersModal({ isOpen: false, isEditing: false, oldDersName: '', dersName: '', initialUnitName: '' })} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Quick select chips */}
              {!dersModal.isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted, #64748b)', marginBottom: '0.4rem' }}>
                    ⚡ Hızlı Ders Seçimi:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {STANDARD_SUBJECTS.map(sub => {
                      const th = getSubjectTheme(sub);
                      const isSelected = dersModal.dersName.toLowerCase() === sub.toLowerCase();
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setDersModal(prev => ({ ...prev, dersName: sub }))}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: isSelected ? th.color : th.bg,
                            color: isSelected ? '#ffffff' : th.color,
                            border: `1.5px solid ${th.border}`
                          }}
                        >
                          {th.icon} {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>
                  Ders Adı *
                </label>
                <input
                  type="text"
                  value={dersModal.dersName}
                  onChange={(e) => setDersModal(prev => ({ ...prev, dersName: e.target.value }))}
                  placeholder="Örn: Matematik, Fen Bilimleri, Türkçe..."
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              {!dersModal.isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>
                    İlk Ünite Adı (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={dersModal.initialUnitName}
                    onChange={(e) => setDersModal(prev => ({ ...prev, initialUnitName: e.target.value }))}
                    placeholder="Örn: 1. Ünite (Boş bırakılabilir)"
                    style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', marginTop: '0.2rem', display: 'block' }}>
                    Dersi oluştururken ilk ünitesini de otomatik ekleyebilirsiniz.
                  </span>
                </div>
              )}
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setDersModal({ isOpen: false, isEditing: false, oldDersName: '', dersName: '', initialUnitName: '' })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveDers}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}
              >
                {dersModal.isEditing ? 'Değişiklikleri Kaydet' : 'Dersi Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ÜNİTE EKLE / DÜZENLE ── */}
      {unitModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '480px', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                {unitModal.unit ? 'Üniteyi Düzenle' : 'Yeni Ünite Ekle'}
              </h3>
              <button onClick={() => setUnitModal({ isOpen: false, unit: null })} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Ders Seçimi */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>
                  Bağlı Olduğu Ders *
                </label>
                
                {!isCustomSubject ? (
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <select
                      value={unitForm.subject}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomSubject(true);
                          setCustomSubjectInput('');
                        } else {
                          setUnitForm({ ...unitForm, subject: e.target.value });
                        }
                      }}
                      style={{ flex: 1, padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 800, boxSizing: 'border-box' }}
                    >
                      <optgroup label="Bu Plandaki Dersler">
                        {planDersList.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Standart Müfredat Dersleri">
                        {STANDARD_SUBJECTS.filter(s => !planDersList.includes(s)).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                      <option value="__NEW__">+ Yeni Ders Yaz...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubject(true);
                        setCustomSubjectInput('');
                      }}
                      style={{ padding: '0 0.85rem', borderRadius: '0.65rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(165,180,252,0.3)', color: '#6366f1', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      + Farklı Ders
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <input
                      type="text"
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      placeholder="Yeni Ders Adını Yazın (Örn: Matematik)"
                      autoFocus
                      style={{ flex: 1, padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 800, boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomSubject(false)}
                      style={{ padding: '0 0.85rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                    >
                      Listeden Seç
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Ünite Adı *</label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                  placeholder="Örn: 1. Ünite - Çarpanlar ve Katlar"
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Hedef Bitirme Tarihi (İsteğe Bağlı)</label>
                <input
                  type="date"
                  value={unitForm.dueDate}
                  onChange={(e) => setUnitForm({...unitForm, dueDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Genel Kaynak / Video Linki (İsteğe Bağlı)</label>
                <input
                  type="url"
                  value={unitForm.resourceUrl}
                  onChange={(e) => setUnitForm({...unitForm, resourceUrl: e.target.value})}
                  placeholder="https://youtube.com/..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setUnitModal({ isOpen: false, unit: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveUnit}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: KONU EKLE / DÜZENLE ── */}
      {topicModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '480px', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                {topicModal.topic ? 'Konuyu Düzenle' : 'Yeni Konu Adımı Ekle'}
              </h3>
              <button onClick={() => setTopicModal({ isOpen: false, unitId: null, topic: null })} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Konu Adı *</label>
                <input
                  type="text"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                  placeholder="Örn: Pozitif Tam Sayıların Çarpanları"
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Gün Numarası / Etiketi (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={topicForm.day || ''}
                  onChange={(e) => setTopicForm({...topicForm, day: e.target.value})}
                  placeholder="Örn: 1 veya Gün 1"
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Hedef Tarih (İsteğe Bağlı)</label>
                <input
                  type="date"
                  value={topicForm.dueDate}
                  onChange={(e) => setTopicForm({...topicForm, dueDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text, #0f172a)', marginBottom: '0.35rem' }}>Kaynak Linki (İsteğe Bağlı)</label>
                <input
                  type="url"
                  value={topicForm.resourceUrl}
                  onChange={(e) => setTopicForm({...topicForm, resourceUrl: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setTopicModal({ isOpen: false, unitId: null, topic: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveTopic}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOPLU KONU EKLE (SATIR SATIR) ── */}
      {bulkTopicModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '540px', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', overflow: 'hidden' }}>
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text, #0f172a)' }}>
                  Toplu Konu Ekle
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem' }}>
                  Her satıra bir konu gelecek şekilde yapıştırın.
                </p>
              </div>
              <button onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.35rem 1.6rem' }}>
              <textarea
                value={bulkTopicText}
                onChange={(e) => setBulkTopicText(e.target.value)}
                placeholder="Çarpanlar ve Asal Çarpanlar&#10;EBOB ve EKOK Problemleri&#10;Tam Sayıların Kuvvetleri&#10;Üslü İfadelerle İşlemler"
                rows={8}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.9rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setBulkTopicModal({ isOpen: false, unitId: null })}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={saveBulkTopics}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(14,165,233,0.35)' }}
              >
                Satırları Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOPLU ÜNİTE & KONU İÇE AKTAR (TEXT / JSON) ── */}
      {jsonModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '680px', maxHeight: '90vh', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ListPlus size={22} style={{ color: '#0284c7' }} /> Toplu Ünite &amp; Konu İçe Aktar
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted, #64748b)', fontSize: '0.82rem' }}>
                  Düz metin veya JSON şablonu ile tüm müfredatı tek seferde yükleyin.
                </p>
              </div>
              <button onClick={() => setJsonModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher & Example Buttons */}
            <div style={{ padding: '1rem 1.6rem 0.5rem 1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', background: 'var(--color-surface-hover, #f1f5f9)', borderRadius: '0.65rem', padding: '0.25rem', border: '1px solid var(--color-border, #cbd5e1)' }}>
                <button
                  onClick={() => setBulkMode('text')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '0.5rem', background: bulkMode === 'text' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none', border: 'none', color: bulkMode === 'text' ? '#ffffff' : 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  📝 Düz Metin İle
                </button>
                <button
                  onClick={() => setBulkMode('json')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '0.5rem', background: bulkMode === 'json' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'none', border: 'none', color: bulkMode === 'json' ? '#ffffff' : 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {'{ }'} JSON İle
                </button>
              </div>

              {bulkMode === 'text' ? (
                <button
                  type="button"
                  onClick={() => setBulkText(`1. Ünite: Doğal Sayılar\n- Doğal Sayılarla İşlemler\n- Üslü Nicelikler\n- İşlem Önceliği\n\n2. Ünite: Çarpanlar ve Katlar\n- Asal Sayılar\n- Ortak Bölgenler ve Katlar`)}
                  style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0284c7', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  ⚡ Örnek Şablon Yükle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setJsonText(`[\n  {\n    "name": "1. Ünite: Doğal Sayılar",\n    "topics": [\n      { "name": "Doğal Sayılarla İşlemler" },\n      { "name": "Üslü Nicelikler" }\n    ]\n  }\n]`)}
                  style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0284c7', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  ⚡ Örnek JSON Yükle
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0.75rem 1.6rem', overflowY: 'auto', flex: 1 }}>
              {bulkMode === 'text' ? (
                <div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`1. Ünite: Üslü İfadeler\n- Üslü Nicelikler\n- Üslü Sayılarda Çarpma\n\n2. Ünite: Kareköklü İfadeler\n- Tam Kare Sayılar\n- Karekök Alma\n\n(veya Ünite > Konu formatında satır satır yapıştırabilirsiniz)`}
                    rows={10}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.88rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', marginTop: '0.45rem', lineHeight: 1.4 }}>
                    💡 <strong>İpucu:</strong> <span style={{ color: '#6366f1' }}>Ünite İsmi:</span> yazdıktan sonra tire (-) veya yıldız (*) ile altındaki konuları yazabilirsiniz.
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder={'[\n  {\n    "name": "1. Ünite: Üslü Sayılar",\n    "dueDate": "2026-10-15",\n    "topics": [\n      { "name": "Konu 1", "dueDate": "2026-10-12" }\n    ]\n  }\n]'}
                    rows={10}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.88rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setJsonModal(false)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleBulkImport}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
              >
                İçeriği Aktar &amp; Ekle
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: ÖĞRENCİYE ATA ── */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.75))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '600px', maxHeight: '88vh', borderRadius: '1.5rem', background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', color: 'var(--color-text, #0f172a)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={22} style={{ color: '#ec4899' }} /> Yol Haritasını Öğrenciye Ata
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#6366f1', fontSize: '0.84rem', fontWeight: 700 }}>
                  {plan.title}
                </p>
              </div>
              <button onClick={() => setAssignModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Search & Select All */}
            <div style={{ padding: '0.85rem 1.6rem 0.35rem 1.6rem', display: 'flex', gap: '0.65rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted, #94a3b8)' }} />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Öğrenci ara..."
                  style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.3rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border-input, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = students
                    .filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()))
                    .map(s => s.id);
                  const allSelected = filteredIds.every(id => selectedStudents.includes(id));
                  if (allSelected) {
                    setSelectedStudents(prev => prev.filter(id => !filteredIds.includes(id)));
                  } else {
                    setSelectedStudents(prev => Array.from(new Set([...prev, ...filteredIds])));
                  }
                }}
                style={{ padding: '0.6rem 0.85rem', borderRadius: '0.6rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(165,180,252,0.3)', color: '#6366f1', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Tümünü Seç / Kaldır
              </button>
            </div>

            <div style={{ padding: '0.75rem 1.6rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
              {students
                .filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()))
                .map(student => {
                  const isChecked = selectedStudents.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      style={{
                        padding: '0.7rem 0.95rem',
                        borderRadius: '0.7rem',
                        background: isChecked ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-hover, #f8fafc)',
                        border: `1.5px solid ${isChecked ? 'rgba(165,180,252,0.6)' : 'var(--color-border, #e2e8f0)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                          style={{ width: '1.1rem', height: '1.1rem', accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text, #0f172a)' }}>
                            {student.name} {student.surname || ''}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)' }}>
                            {student.className || student.grade || 'Öğrenci'}
                          </div>
                        </div>
                      </div>

                      {isChecked && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.12rem 0.45rem', borderRadius: '0.35rem' }}>
                          Seçildi
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>

            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6366f1' }}>
                {selectedStudents.length} Öğrenci Seçildi
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => setAssignModal(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover, #f1f5f9)', border: '1px solid var(--color-border, #cbd5e1)', color: 'var(--color-text, #0f172a)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  onClick={handleAssign}
                  disabled={selectedStudents.length === 0}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #ec4899, #d946ef)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(236,72,153,0.35)', opacity: selectedStudents.length === 0 ? 0.5 : 1 }}
                >
                  Öğrencilere Ata ({selectedStudents.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

