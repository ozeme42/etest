import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { safeSetItem } from '../utils/storageUtils';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  dbGetCoachingData,
  dbSaveCoachingNote,
  dbToggleCoachedStudent,
  dbGetMockExams,
  dbSaveMockExam,
  dbDeleteMockExam,
  dbGetCoachingMeetings,
  dbSaveCoachingMeeting,
  dbGetCoachingProfiles,
  dbSaveCoachingProfile,
  toUUID
} from '../services/supabaseService';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const CoachingContext = createContext();

export function useCoaching() {
  return useContext(CoachingContext);
}

export function CoachingProvider({ children }) {
  const [coachingLinks, setCoachingLinks] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingLinks');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachingNotes, setCoachingNotes] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingNotes');
    return saved ? JSON.parse(saved) : [];
  });

  const [mockExams, setMockExams] = useState(() => {
    const saved = localStorage.getItem('eTestMockExams');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachingMeetings, setCoachingMeetings] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingMeetings');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachingProfiles, setCoachingProfiles] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingProfiles');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncCoachingFromSupabase() {
      if (!isSupabaseConfigured()) return;
      if (isCacheValid('coaching', 30)) {
        return;
      }
      const res = await dbGetCoachingData();
      if (res) {
        if (res.links) setCoachingLinks(res.links);
        if (res.notes) setCoachingNotes(res.notes);
      }
      const dbExams = await dbGetMockExams();
      if (dbExams && Array.isArray(dbExams)) {
        setMockExams(dbExams);
        safeSetItem('eTestMockExams', JSON.stringify(dbExams));
      }

      const dbMeetings = await dbGetCoachingMeetings();
      if (dbMeetings && Array.isArray(dbMeetings)) {
        setCoachingMeetings(dbMeetings);
        safeSetItem('eTestCoachingMeetings', JSON.stringify(dbMeetings));
      }

      const dbProfiles = await dbGetCoachingProfiles();
      if (dbProfiles && Array.isArray(dbProfiles)) {
        setCoachingProfiles(dbProfiles);
        safeSetItem('eTestCoachingProfiles', JSON.stringify(dbProfiles));
      }
      touchCache('coaching');
    }
    syncCoachingFromSupabase();
  }, []);

  useEffect(() => {
    safeSetItem('eTestCoachingLinks', JSON.stringify(coachingLinks));
  }, [coachingLinks]);

  useEffect(() => {
    safeSetItem('eTestCoachingNotes', JSON.stringify(coachingNotes));
  }, [coachingNotes]);

  useEffect(() => {
    safeSetItem('eTestMockExams', JSON.stringify(mockExams));
  }, [mockExams]);

  useEffect(() => {
    safeSetItem('eTestCoachingMeetings', JSON.stringify(coachingMeetings));
  }, [coachingMeetings]);

  useEffect(() => {
    safeSetItem('eTestCoachingProfiles', JSON.stringify(coachingProfiles));
  }, [coachingProfiles]);

  const toggleCoachedStudent = async (teacherId, studentId) => {
    const exists = coachingLinks.some(l => l.teacherId === teacherId && l.studentId === studentId);
    let nextLinks = [];
    if (exists) {
      nextLinks = coachingLinks.filter(l => !(l.teacherId === teacherId && l.studentId === studentId));
    } else {
      nextLinks = [...coachingLinks, { id: `cl_${teacherId}_${studentId}`, teacherId, studentId, createdAt: new Date().toISOString() }];
    }
    setCoachingLinks(nextLinks);
    await dbToggleCoachedStudent(teacherId, studentId, !exists);
  };

  const saveCoachingNote = async (noteData) => {
    const noteId = noteData.id || `cn_${noteData.teacherId}_${noteData.studentId}`;
    const newNote = {
      id: noteId,
      createdAt: new Date().toISOString(),
      ...noteData
    };
    setCoachingNotes(prev => {
      const idx = prev.findIndex(n => n.studentId === noteData.studentId && n.teacherId === noteData.teacherId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newNote };
        return copy;
      }
      return [newNote, ...prev];
    });
    await dbSaveCoachingNote(newNote);
    return newNote;
  };

  const saveCoachingProfile = async (profileData) => {
    const studentId = profileData.studentId;
    const profileId = profileData.id || `cp_${studentId}`;
    const newProfile = {
      id: profileId,
      createdAt: new Date().toISOString(),
      ...profileData
    };
    const sidStr = String(studentId || '');
    const sidUuid = String(toUUID(sidStr) || '');

    setCoachingProfiles(prev => {
      const idx = prev.findIndex(p => {
        if (!p) return false;
        const pSid = String(p.studentId || p.userId || p.id || '');
        const pUuid = String(toUUID(pSid) || '');
        return pSid === sidStr || (sidUuid && pSid === sidUuid) || (pUuid && (pUuid === sidStr || pUuid === sidUuid));
      });
      let copy = [...prev];
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], ...newProfile };
      } else {
        copy = [newProfile, ...copy];
      }
      safeSetItem('eTestCoachingProfiles', JSON.stringify(copy));
      safeSetItem('etest_coaching_profiles', JSON.stringify(copy));
      return copy;
    });
    await dbSaveCoachingProfile(newProfile);
    return newProfile;
  };

  const addMockExam = async (examData) => {
    const newExam = {
      id: `me_${Date.now()}`,
      createdAt: new Date().toISOString(),
      approvalStatus: examData.createdBy === 'student' ? 'pending' : 'approved',
      ...examData
    };
    setMockExams(prev => [newExam, ...prev]);
    await dbSaveMockExam(newExam);
    return newExam;
  };

  const updateMockExam = async (id, updateData) => {
    let updatedExam = null;
    setMockExams(prev => prev.map(m => {
      if (m.id === id) {
        updatedExam = { ...m, ...updateData };
        return updatedExam;
      }
      return m;
    }));
    if (updatedExam) {
      await dbSaveMockExam(updatedExam);
    }
  };

  const approveMockExam = async (id) => {
    await updateMockExam(id, { approvalStatus: 'approved', approvedAt: new Date().toISOString() });
  };

  const rejectMockExam = async (id, reason = '') => {
    await updateMockExam(id, { approvalStatus: 'rejected', rejectedReason: reason, rejectedAt: new Date().toISOString() });
  };

  const deleteMockExam = async (id) => {
    if (!id) return;
    const idStr = String(id);
    const idUuid = toUUID(idStr);

    setMockExams(prev => {
      const remaining = prev.filter(m => String(m.id) !== idStr && (!idUuid || String(toUUID(m.id)) !== idUuid));
      safeSetItem('eTestMockExams', JSON.stringify(remaining));
      return remaining;
    });

    await dbDeleteMockExam(id);
  };

  const addCoachingMeeting = async (meetingData) => {
    const newMeeting = {
      id: `cm_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...meetingData
    };
    setCoachingMeetings(prev => [newMeeting, ...prev]);
    await dbSaveCoachingMeeting(newMeeting);
    return newMeeting;
  };

  const getCoachedStudentIds = (teacherId) => {
    return coachingLinks.filter(l => l.teacherId === teacherId).map(l => l.studentId);
  };

  const getCoachingNoteForStudent = useCallback((studentId) => {
    return coachingNotes.find(n => String(n.studentId) === String(studentId)) || null;
  }, [coachingNotes]);

  const getCoachingProfileForStudent = useCallback((studentId) => {
    if (!studentId) return null;
    const sidStr = String(studentId);
    const sidUuid = String(toUUID(sidStr) || '');
    return coachingProfiles.find(p => {
      if (!p) return false;
      const pSid = String(p.studentId || p.userId || p.id || '');
      const pUuid = String(toUUID(pSid) || '');
      return pSid === sidStr || (sidUuid && pSid === sidUuid) || (pUuid && (pUuid === sidStr || pUuid === sidUuid));
    }) || null;
  }, [coachingProfiles]);

  const getMockExamsForStudent = useCallback((studentId) => {
    return mockExams.filter(m => String(m.studentId) === String(studentId));
  }, [mockExams]);

  const getMeetingsForStudent = useCallback((studentId) => {
    return coachingMeetings.filter(m => String(m.studentId) === String(studentId));
  }, [coachingMeetings]);

  const isStudentCoached = useCallback((studentId) => {
    if (!studentId) return false;
    return coachingLinks.some(l => String(l.studentId) === String(studentId));
  }, [coachingLinks]);

  const addStudentError = async (studentId, errorData) => {
    const profile = getCoachingProfileForStudent(studentId) || { studentId, errors: [] };
    const newError = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...errorData
    };
    const updatedErrors = [newError, ...(profile.errors || [])];
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
    return newError;
  };

  const updateStudentError = async (studentId, errorId, updates) => {
    const profile = getCoachingProfileForStudent(studentId);
    if (!profile) return;
    const updatedErrors = (profile.errors || []).map(e => e.id === errorId ? { ...e, ...updates } : e);
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
  };

  const deleteStudentError = async (studentId, errorId) => {
    const profile = getCoachingProfileForStudent(studentId);
    if (!profile) return;
    const updatedErrors = (profile.errors || []).filter(e => e.id !== errorId);
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
  };

  const value = useMemo(() => ({
    coachingLinks,
    coachingNotes,
    mockExams,
    coachingMeetings,
    coachingProfiles,
    toggleCoachedStudent,
    saveCoachingNote,
    saveCoachingProfile,
    addMockExam,
    updateMockExam,
    approveMockExam,
    rejectMockExam,
    deleteMockExam,
    addCoachingMeeting,
    getCoachedStudentIds,
    isStudentCoached,
    getCoachingNoteForStudent,
    getCoachingProfileForStudent,
    getMockExamsForStudent,
    getMeetingsForStudent,
    addStudentError,
    updateStudentError,
    deleteStudentError
  }), [coachingLinks, coachingNotes, mockExams, coachingMeetings, coachingProfiles]);

  return (
    <CoachingContext.Provider value={value}>
      {children}
    </CoachingContext.Provider>
  );
}