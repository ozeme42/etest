import React, { useState, useMemo } from 'react';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { CheckCircle, Clock3, XCircle, FileOutput, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminHomeworkTracker() {
  const { homeworks } = useHomework();
  const { users } = useUser();
  const { submissions } = useEvaluation();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const flattenedData = useMemo(() => {
    const rows = [];
    const now = new Date();

    homeworks.forEach(hw => {
      const assignedStudents = hw.targetIds || [];
      
      assignedStudents.forEach(studentId => {
        const student = users.find(u => u.id === studentId);
        if (!student) return;

        const hwDueDate = new Date(hw.dueDate);
        const isOverdue = hwDueDate < now;
        
        let status = 'pending';
        let score = null;
        let mistakes = 0;
        let blanks = 0;
        let completedAt = null;

        let testsCompleted = 0;
        let totalTests = hw.tests ? hw.tests.length : 1;
        let submissionIds = [];

        if (hw.tests) {
            hw.tests.forEach(testId => {
                const sub = submissions.find(s => s.testId === testId && s.studentId === studentId);
                if (sub) {
                    submissionIds.push(sub.id);
                    if (sub.status === 'completed') {
                        testsCompleted++;
                        if (!completedAt || new Date(sub.createdAt) > new Date(completedAt)) {
                            completedAt = sub.createdAt;
                        }
                        if (sub.score) {
                            score = (score || 0) + sub.score;
                        }
                    } else {
                        status = 'pending';
                    }
                    if (sub.answers) {
                        sub.answers.forEach(a => {
                            if (a.isCorrect === false) mistakes++;
                            if (a.userAnswer === null || a.userAnswer === undefined || a.userAnswer === "") blanks++;
                        });
                    }
                }
            });
        }

        if (testsCompleted === totalTests && totalTests > 0) {
            status = 'completed';
            score = Math.round(score / totalTests); 
        } else if (isOverdue) {
            status = 'overdue';
        }

        rows.push({
            id: `${hw.id}_${studentId}`,
            hwId: hw.id,
            hwTitle: hw.title,
            studentId,
            studentName: student.name,
            assignedAt: hw.createdAt,
            dueDate: hw.dueDate,
            completedAt,
            status,
            score: status === 'completed' ? score : null,
            mistakes: status === 'completed' ? mistakes : null,
            blanks: status === 'completed' ? blanks : null,
            sourceType: hw.sourceType || 'digital',
            submissionIds
        });
      });
    });

    return rows.sort((a, b) => {
        const statusOrder = { overdue: 1, pending: 2, completed: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.assignedAt) - new Date(a.assignedAt);
    });
  }, [homeworks, users, submissions]);

  const filteredData = useMemo(() => {
    return flattenedData.filter(row => {
        if (filterStatus !== 'all' && row.status !== filterStatus) return false;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!row.studentName.toLowerCase().includes(query) && !row.hwTitle.toLowerCase().includes(query)) {
                return false;
            }
        }
        
        return true;
    });
  }, [flattenedData, filterStatus, searchQuery]);

  const handleDownloadExcel = () => {
      let content = "Ogrenci Adi\tOdev Basligi\tDurum\tAtanma Tarihi\tSon Teslim Tarihi\tTamamlanma Tarihi\tPuan\tYanlis\tBos\n";
      
      filteredData.forEach(row => {
          const statusMap = { 'completed': 'Cozuldu', 'pending': 'Bekliyor', 'overdue': 'Suresi Gecti' };
          const formatDate = d => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
          
          content += `${row.studentName}\t${row.hwTitle}\t${statusMap[row.status]}\t${formatDate(row.assignedAt)}\t${formatDate(row.dueDate)}\t${formatDate(row.completedAt)}\t${row.score ?? '-'}\t${row.mistakes ?? '-'}\t${row.blanks ?? '-'}\n`;
      });

      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `odev-takip-raporu-${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input 
                        type="text" 
                        placeholder="Öğrenci veya ödev ara..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '0.65rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', outline: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                    <option value="all" style={{ background: '#0f172a', color: '#ffffff' }}>Tüm Durumlar</option>
                    <option value="completed" style={{ background: '#0f172a', color: '#ffffff' }}>Çözüldü</option>
                    <option value="pending" style={{ background: '#0f172a', color: '#ffffff' }}>Bekliyor</option>
                    <option value="overdue" style={{ background: '#0f172a', color: '#ffffff' }}>Süresi Geçti</option>
                </select>
            </div>
            
            <button
              onClick={handleDownloadExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
              }}
            >
              <FileOutput size={16} /> Excel Rapor İndir
            </button>
        </div>

        {/* Table Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '1.25rem',
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)',
          overflowX: 'auto',
          padding: 0
        }}>
            {filteredData.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Ödev Başlığı</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Durum</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Atanma / Teslim</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Puan</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>Yanlış/Boş</th>
                            <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(row => {
                            let statusBadgeStyle, StatusIcon, statusText;
                            if (row.status === 'completed') {
                                statusBadgeStyle = { background: 'rgba(5, 150, 105, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)' };
                                StatusIcon = CheckCircle;
                                statusText = 'Çözüldü';
                            } else if (row.status === 'overdue') {
                                statusBadgeStyle = { background: 'rgba(220, 38, 38, 0.2)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.4)' };
                                StatusIcon = XCircle;
                                statusText = 'Süresi Geçti';
                            } else {
                                statusBadgeStyle = { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)' };
                                StatusIcon = Clock3;
                                statusText = 'Bekliyor';
                            }

                            return (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}>
                                    <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#ffffff' }}>{row.studentName}</td>
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', marginBottom: 2 }}>{row.hwTitle}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{row.sourceType === 'trackedBook' ? '📚 Fiziki Kitap' : '💻 Dijital Test'}</div>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800, ...statusBadgeStyle }}>
                                            <StatusIcon size={13} /> {statusText}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.78rem' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Atanma: {new Date(row.assignedAt).toLocaleDateString('tr-TR')}</div>
                                        <div style={{ color: row.status === 'overdue' ? '#f87171' : 'rgba(255,255,255,0.85)', fontWeight: row.status === 'overdue' ? 800 : 600 }}>
                                            Son: {new Date(row.dueDate).toLocaleDateString('tr-TR')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, color: row.score !== null ? '#818cf8' : 'rgba(255,255,255,0.3)' }}>
                                        {row.score ?? '-'}
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700 }}>
                                        {row.status === 'completed' ? (
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                <span style={{ color: '#f87171' }}>{row.mistakes} Y</span>
                                                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{row.blanks} B</span>
                                            </div>
                                        ) : <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                                        {row.submissionIds && row.submissionIds.length > 0 && (
                                            <button 
                                                style={{
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '0.6rem',
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    border: '1px solid rgba(165, 180, 252, 0.35)',
                                                    color: '#c7d2fe',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    if (row.status === 'pending') {
                                                        navigate('/evaluations');
                                                    } else {
                                                        navigate(`/review/${row.submissionIds[0]}`);
                                                    }
                                                }}
                                            >
                                                <Eye size={13} /> {row.status === 'pending' ? 'Düzelt / Notlandır' : 'İncele'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'rgba(255,255,255,0.4)' }}>
                    <Search size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem auto' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>Kriterlere uygun ödev ataması bulunamadı.</p>
                </div>
            )}
        </div>
    </div>
  );
}
