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
      // hw.targetIds contains student IDs
      const assignedStudents = hw.targetIds || [];
      
      assignedStudents.forEach(studentId => {
        const student = users.find(u => u.id === studentId);
        if (!student) return;

        const hwDueDate = new Date(hw.dueDate);
        const isOverdue = hwDueDate < now;
        
        let status = 'pending'; // pending, completed, overdue
        let score = null;
        let mistakes = 0;
        let blanks = 0;
        let completedAt = null;

        // hw.tests is an array of test IDs.
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
                        // Pending evaluation
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
        // If same status, sort newest to oldest (yeniden eskiye) by assignment date
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
    <div className="admin-homework-tracker">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Öğrenci veya ödev ara..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
                    />
                </div>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', background: 'white' }}
                >
                    <option value="all">Tüm Durumlar</option>
                    <option value="completed">Çözüldü</option>
                    <option value="pending">Bekliyor</option>
                    <option value="overdue">Süresi Geçti</option>
                </select>
            </div>
            
            <button className="btn btn-primary" onClick={handleDownloadExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileOutput size={18} /> Excel İndir
            </button>
        </div>

        <div className="card glass" style={{ overflowX: 'auto', padding: 0 }}>
            {filteredData.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)' }}>Öğrenci</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)' }}>Ödev Başlığı</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)' }}>Durum</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)' }}>Atanma / Teslim</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Puan</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Yanlış/Boş</th>
                            <th style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(row => {
                            let statusColor, StatusIcon, statusText;
                            if (row.status === 'completed') { statusColor = 'var(--color-success)'; StatusIcon = CheckCircle; statusText = 'Çözüldü'; }
                            else if (row.status === 'overdue') { statusColor = 'var(--color-error)'; StatusIcon = XCircle; statusText = 'Süresi Geçti'; }
                            else { statusColor = 'var(--color-secondary)'; StatusIcon = Clock3; statusText = 'Bekliyor'; }

                            return (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.studentName}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 500, marginBottom: '0.2rem' }}>{row.hwTitle}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{row.sourceType === 'trackedBook' ? 'Fiziki Kitap' : 'Dijital Test'}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: `color-mix(in srgb, ${statusColor} 10%, transparent)`, color: statusColor, padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <StatusIcon size={14} /> {statusText}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                        <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>A: {new Date(row.assignedAt).toLocaleDateString('tr-TR')}</div>
                                        <div style={{ color: row.status === 'overdue' ? 'var(--color-error)' : 'inherit', fontWeight: row.status === 'overdue' ? 600 : 'normal' }}>
                                            T: {new Date(row.dueDate).toLocaleDateString('tr-TR')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: row.score ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                        {row.score ?? '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600 }}>
                                        {row.status === 'completed' ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <span style={{ color: 'var(--color-error)' }}>{row.mistakes} Y</span>
                                                <span style={{ color: 'var(--color-text-muted)' }}>{row.blanks} B</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        {row.submissionIds && row.submissionIds.length > 0 && (
                                            <button 
                                                className="btn btn-outline" 
                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                onClick={() => {
                                                    if (row.status === 'pending') {
                                                        navigate('/evaluations');
                                                    } else {
                                                        navigate(`/review/${row.submissionIds[0]}`);
                                                    }
                                                }}
                                            >
                                                <Eye size={14} /> {row.status === 'pending' ? 'Düzelt / Notlandır' : 'İncele'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
                    <Search size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
                    <p>Kriterlere uygun ödev ataması bulunamadı.</p>
                </div>
            )}
        </div>
    </div>
  );
}
