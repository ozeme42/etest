import React from 'react';
import { ThemeProvider } from './ThemeContext.jsx';
import { UserProvider } from './UserContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { CurriculumProvider } from './CurriculumContext.jsx';
import { SummaryProvider } from './SummaryContext.jsx';
import { QuestionBankProvider } from './QuestionBankContext.jsx';
import { HomeworkProvider } from './HomeworkContext.jsx';
import { EvaluationProvider } from './EvaluationContext.jsx';
import { TrackedBookProvider } from './TrackedBookContext.jsx';
import { StudyPlanProvider } from './StudyPlanContext.jsx';
import { GoalProvider } from './GoalContext.jsx';
import { ScheduleProvider } from './ScheduleContext.jsx';
import { CoachingProvider } from './CoachingContext.jsx';
import { ScaleProvider } from './ScaleContext.jsx';

const providers = [
  ThemeProvider,
  UserProvider,
  AuthProvider,
  CurriculumProvider,
  SummaryProvider,
  QuestionBankProvider,
  HomeworkProvider,
  EvaluationProvider,
  TrackedBookProvider,
  StudyPlanProvider,
  GoalProvider,
  ScheduleProvider,
  CoachingProvider,
  ScaleProvider
];

/**
 * Composite App Providers
 * Flattens the 14-level deep context pyramid into a single clean wrapper.
 */
export default function CompositeAppProviders({ children }) {
  return providers.reduceRight((acc, Provider) => {
    return <Provider>{acc}</Provider>;
  }, children);
}
