const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

// The logic we need to insert to compute allExamsList and overallStats:
const injectLogic = `
  const [mockExams, setMockExams] = useState([]);
  
  React.useEffect(() => {
    if (studentId) {
      getMockExamsForStudent(studentId).then(data => {
        setMockExams(data || []);
      }).catch(console.error);
    }
  }, [studentId, getMockExamsForStudent]);

  // Compute allExamsList by combining mockExams and completed exam books
  const allExamsList = useMemo(() => {
    const list = [];
    
    // 1. Add mock exams
    mockExams.forEach(mock => {
      // Sadece onaylanmış olanlar (veya koç atamamışsa hepsi) chart'a yansıyabilir
      if (mock.approvalStatus === 'rejected') return;
      
      list.push({
        id: mock.id,
        title: mock.title,
        date: mock.date || mock.createdAt?.slice(0, 10),
        totalCorrect: mock.totalCorrect,
        totalWrong: mock.totalWrong,
        totalEmpty: mock.totalEmpty,
        totalNet: mock.totalNet,
        isManualMock: true,
        scores: mock.scores || {}
      });
    });

    // 2. Add completed book assignments (Fiziki Denemeler)
    assignedBooks.forEach(book => {
      // Sadece tamamlanmış denemeler
      const pct = book.totalAssignedTests > 0 ? Math.round((book.totalSolvedTests / book.totalAssignedTests) * 100) : 0;
      if (pct < 100) return;

      const penaltyRatio = /lgs|bursluluk/i.test(book.title) ? 3 : 4;
      const net = (book.totalCorrect || 0) - ((book.totalWrong || 0) / penaltyRatio);
      
      // Calculate subject-specific nets from the book's subjects and test submissions
      const bestSubs = [];
      studentSubmissions.forEach(sub => {
         const testId = sub.testId || sub.bookTestId || sub.id;
         if (book.allAssignedTestIds.has(String(testId))) {
             bestSubs.push(sub);
         }
      });

      list.push({
        id: book.id,
        title: book.title,
        date: book.assignedHomeworks?.[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        totalCorrect: book.totalCorrect,
        totalWrong: book.totalWrong,
        totalEmpty: book.totalBlank,
        totalNet: parseFloat(net.toFixed(2)),
        isManualMock: false,
        bestSubs: bestSubs,
        subjects: book.subjects
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [mockExams, assignedBooks, studentSubmissions]);

  // Compute overallStats
  const overallStats = useMemo(() => {
    let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
    let maxNet = 0;
    
    // Subject distribution
    const subMap = {};

    allExamsList.forEach(exam => {
       totalD += (exam.totalCorrect || 0);
       totalY += (exam.totalWrong || 0);
       totalB += (exam.totalEmpty || 0);
       totalNet += parseFloat(exam.totalNet || 0);
       if (parseFloat(exam.totalNet || 0) > maxNet) {
         maxNet = parseFloat(exam.totalNet || 0);
       }

       if (exam.isManualMock && exam.scores) {
         Object.entries(exam.scores).forEach(([sName, sc]) => {
           if (!subMap[sName]) subMap[sName] = { name: sName, net: 0, count: 0 };
           subMap[sName].net += parseFloat(sc.net || 0);
           subMap[sName].count += 1;
         });
       } else if (!exam.isManualMock && exam.bestSubs) {
         const penaltyRatio = /lgs|bursluluk/i.test(exam.title) ? 3 : 4;
         exam.bestSubs.forEach(sub => {
            const testId = sub.testId || sub.bookTestId || sub.id;
            const bookTest = bookTests.find(t => String(t.id) === String(testId));
            if (bookTest && exam.subjects) {
              const subject = exam.subjects.find(s => String(s.id) === String(bookTest.subjectId));
              const subjName = subject ? subject.name : 'Genel';
              if (!subMap[subjName]) subMap[subjName] = { name: subjName, net: 0, count: 0 };
              
              const c = sub.correctCount || 0;
              const w = sub.wrongCount || 0;
              const n = c - (w / penaltyRatio);
              
              subMap[subjName].net += n;
              subMap[subjName].count += 1;
            }
         });
       }
    });

    const totalExams = allExamsList.length;

    return {
      totalExams,
      avgNet: totalExams > 0 ? (totalNet / totalExams).toFixed(1) : 0,
      maxNet: maxNet.toFixed(1),
      lastExamDate: totalExams > 0 ? allExamsList[0].date : '-',
      totalD, totalY, totalB,
      subjects: Object.values(subMap).sort((a,b) => b.net - a.net)
    };
  }, [allExamsList, bookTests]);
`;

// Insert the logic before the return statement of StudentExamsPage
if (!code.includes('allExamsList')) {
  code = code.replace(
    /  return \(\s*<div/,
    injectLogic + '\n  return (\n    <div'
  );
}

// Now the UI for the banner and chart
const bannerAndChart = `
      {/* STATISTICS BANNER */}
      {allExamsList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Toplam Deneme', value: overallStats.totalExams, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Ortalama Net', value: overallStats.avgNet, color: '#10b981', bg: '#ecfdf5' },
            { label: 'En Yüksek Net', value: overallStats.maxNet, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Son Deneme', value: overallStats.lastExamDate, color: '#8b5cf6', bg: '#f5f3ff' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, padding: '0.85rem', borderRadius: '0.85rem', textAlign: 'center', border: '1px solid rgba(255,255,255,1)' }}>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* TREND CHART */}
      {allExamsList.length > 0 && (
        <div className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} /> Net Gelişim Grafiği
            </h2>
            <select 
              value={chartMetric} 
              onChange={(e) => setChartMetric(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Toplam Net">Genel (Toplam Net)</option>
              {overallStats.subjects.map(s => (
                <option key={s.name} value={s.name}>{s.name} Net</option>
              ))}
            </select>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...allExamsList].reverse().map((exam, i) => {
                const penaltyRatio = /lgs|bursluluk/i.test(exam.title) ? 3 : 4;
                let net = 0;
                if (chartMetric === 'Toplam Net') {
                   net = (exam.totalCorrect || 0) - ((exam.totalWrong || 0) / penaltyRatio);
                } else {
                   if (exam.isManualMock) {
                      if (exam.scores && exam.scores[chartMetric]) {
                         const sc = exam.scores[chartMetric];
                         net = sc.net !== undefined && sc.net !== null ? parseFloat(sc.net) : ((sc.correct || 0) - ((sc.wrong || 0) / penaltyRatio));
                      }
                   } else {
                      let c = 0, w = 0;
                      exam.bestSubs?.forEach(sub => {
                        const testId = sub.testId || sub.bookTestId || sub.id;
                        const bookTest = bookTests.find(t => String(t.id) === String(testId));
                        if (bookTest && exam.subjects) {
                          const subject = exam.subjects.find(s => String(s.id) === String(bookTest.subjectId));
                          const subjName = subject ? subject.name : 'Genel';
                          if (subjName === chartMetric) {
                            c += sub.correctCount || 0;
                            w += sub.wrongCount || 0;
                          }
                        }
                      });
                      net = c - (w / penaltyRatio);
                   }
                }
                
                return { name: \`D\${i + 1}\`, Net: parseFloat(net.toFixed(2)), fullName: exam.title };
              })}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '0.85rem', fontWeight: 700 }}
                  formatter={(value) => [\`\${value} Net\`, 'Sonuç']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Line type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
`;

// Replace the previous chart implementation which was buggy/incomplete with the complete banner and chart
// Wait, since the previous regex in script 1 FAILED to add the chart (because there was no {/* STATISTICS BANNER */}), 
// I will just insert it right after the </header>
if (!code.includes('STATISTICS BANNER')) {
  code = code.replace(
    /<\/header>/,
    '</header>\n' + bannerAndChart
  );
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', code);
console.log('Update script 3 finished successfully.');
