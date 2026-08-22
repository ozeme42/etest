import {
  GraduationCap, Ruler, TestTube2, BookCopy, Globe,
  MessageSquare, Sparkles, Layers, BookOpen, School
} from 'lucide-react';

export const JSON_TEMPLATE = `[
  {
    "questionText": "1) Türkiye'nin başkenti hangi şehirdir?",
    "options": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "correctAnswer": "B"
  },
  {
    "questionText": "2) Aşağıdakilerden hangisi asal sayıdır?",
    "options": ["4", "9", "13", "15"],
    "correctAnswer": "C"
  }
]`;

export const subjectThemes = {
  'all_subjects': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 12px 28px -5px rgba(79,70,229,0.45)'
  },
  'Matematik': {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    icon: Ruler,
    color: '#2563eb',
    shadow: '0 10px 25px -5px rgba(37,99,235,0.4)'
  },
  'Fen Bilimleri': {
    bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    icon: TestTube2,
    color: '#0d9488',
    shadow: '0 10px 25px -5px rgba(13,148,136,0.4)'
  },
  'Türkçe': {
    bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    icon: BookCopy,
    color: '#ea580c',
    shadow: '0 10px 25px -5px rgba(234,88,12,0.4)'
  },
  'Sosyal Bilgiler': {
    bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    icon: Globe,
    color: '#9333ea',
    shadow: '0 10px 25px -5px rgba(147,51,234,0.4)'
  },
  'T.C. İnkılap Tarihi ve Atatürkçülük': {
    bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    icon: Globe,
    color: '#7c3aed',
    shadow: '0 10px 25px -5px rgba(124,58,237,0.4)'
  },
  'İngilizce': {
    bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    icon: MessageSquare,
    color: '#e11d48',
    shadow: '0 10px 25px -5px rgba(225,29,72,0.4)'
  },
  'Din Kültürü ve Ahlak Bilgisi': {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    icon: Sparkles,
    color: '#0284c7',
    shadow: '0 10px 25px -5px rgba(2,132,199,0.4)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: Layers,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};

export const gradeThemes = {
  '5. Sınıf': {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    icon: Sparkles,
    color: '#0284c7',
    shadow: '0 10px 25px -5px rgba(2,132,199,0.4)'
  },
  '6. Sınıf': {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    icon: BookOpen,
    color: '#059669',
    shadow: '0 10px 25px -5px rgba(5,150,105,0.4)'
  },
  '7. Sınıf': {
    bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    icon: Layers,
    color: '#d97706',
    shadow: '0 10px 25px -5px rgba(217,119,6,0.4)'
  },
  '8. Sınıf': {
    bg: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    icon: GraduationCap,
    color: '#4f46e5',
    shadow: '0 10px 25px -5px rgba(79,70,229,0.45)'
  },
  'LGS Hazırlık': {
    bg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    icon: School,
    color: '#7c3aed',
    shadow: '0 10px 25px -5px rgba(124,58,237,0.45)'
  },
  'Diğer': {
    bg: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
    icon: School,
    color: '#475569',
    shadow: '0 10px 25px -5px rgba(71,85,105,0.4)'
  }
};
