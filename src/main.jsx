import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CurriculumProvider } from './context/CurriculumContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { QuestionBankProvider } from './context/QuestionBankContext.jsx'
import { HomeworkProvider } from './context/HomeworkContext.jsx'
import { EvaluationProvider } from './context/EvaluationContext.jsx'
import { TrackedBookProvider } from './context/TrackedBookContext.jsx'
import { StudyPlanProvider } from './context/StudyPlanContext.jsx'
import { GoalProvider } from './context/GoalContext.jsx'
import { ScheduleProvider } from './context/ScheduleContext.jsx'
import { CoachingProvider } from './context/CoachingContext.jsx'
import { ScaleProvider } from './context/ScaleContext.jsx'
import { SummaryProvider } from './context/SummaryContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <AuthProvider>
          <CurriculumProvider>
            <SummaryProvider>
              <QuestionBankProvider>
                <HomeworkProvider>
                  <EvaluationProvider>
                    <TrackedBookProvider>
                      <StudyPlanProvider>
                        <GoalProvider>
                          <ScheduleProvider>
                            <CoachingProvider>
                              <ScaleProvider>
                                <App />
                              </ScaleProvider>
                            </CoachingProvider>
                          </ScheduleProvider>
                        </GoalProvider>
                      </StudyPlanProvider>
                    </TrackedBookProvider>
                  </EvaluationProvider>
                </HomeworkProvider>
              </QuestionBankProvider>
            </SummaryProvider>
          </CurriculumProvider>
        </AuthProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration error:', err);
    });
  });
}