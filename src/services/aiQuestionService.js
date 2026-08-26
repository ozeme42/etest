import { pdfjs } from 'react-pdf';

if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: '⚡ Gemini 3.6 Flash (En Hızlı & En Kararlı • Önerilen)' },
  { id: 'gemini-3.5-flash', name: '🚀 Gemini 3.5 Flash (Yüksek Muhakeme & Hızlı)' },
  { id: 'gemini-3.7-flash', name: '⭐ Gemini 3.7 Flash (En Yeni Nesil Muhakeme)' },
  { id: 'gemini-3.1-flash-lite', name: '💡 Gemini 3.1 Flash-Lite (Ultra Hızlı)' },
  { id: 'gemini-flash-latest', name: '📦 Gemini Flash Latest (Otomatik Güncel)' }
];

/**
 * Fetch available Gemini models supported for generateContent directly from user API Key
 */
export async function getAvailableGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return DEFAULT_GEMINI_MODELS;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || [])
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: m.displayName ? `${m.displayName} (${id})` : id
          };
        });

      if (models.length > 0) {
        return models.sort((a, b) => {
          if (a.id.includes('3.6')) return -1;
          if (b.id.includes('3.6')) return 1;
          if (a.id.includes('3.5')) return -1;
          if (b.id.includes('3.5')) return 1;
          if (a.id.includes('3.7')) return -1;
          if (b.id.includes('3.7')) return 1;
          return a.id.localeCompare(b.id);
        });
      }
    }
  } catch (err) {
    console.warn('[aiQuestionService] Could not list models from Google:', err.message);
  }

  return DEFAULT_GEMINI_MODELS;
}

/**
 * Extract text content from an uploaded PDF file
 */
export async function extractTextFromPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';
    const maxPages = Math.min(pdfDoc.numPages, 25);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `\n[Sayfa ${i}]\n${pageText}\n`;
      }
    }
    return fullText.trim();
  } catch (err) {
    console.error('[aiQuestionService] PDF text extraction error:', err);
    throw new Error('PDF içeriği ayıklanamadı: ' + (err.message || err));
  }
}

/**
 * Generate questions using Google Gemini API
 */
export async function generateQuestionsWithGemini({
  apiKey,
  model = 'gemini-3.6-flash',
  subject = 'Matematik',
  grade = '8. Sınıf',
  topic = '',
  sourceType = 'text', // 'text' | 'pdf' | 'topic_only'
  sourceContent = '',
  questionCount = 5,
  optionCount = 4,
  difficulty = 'Orta',
  questionType = 'coktan_secmeli', // 'coktan_secmeli' | 'acik_uclu'
  includeExplanation = true
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Lütfen geçerli bir Google Gemini API anahtarı giriniz.');
  }

  const optionLetters = optionCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
  const isMultipleChoice = questionType === 'coktan_secmeli';

  const systemInstruction = `Sen Türkiye MEB müfredatına ve ÖSYM/LGS sınav standartlarına son derece hakim, uzman bir eğitim bilimci ve soru yazarısın.
Görevin: Verilen ders, sınıf, konu ve kaynak materyale TAM UYUMLU, pedagojik olarak kusursuz ${questionCount} adet soru içeren bir soru paketi hazırlamaktır.

Pedagojik Öğrenme Hedefleri İlkesi:
- Soru açıklamaları ("explanation") ve hedefler doğrudan öğrenci merkezli olmalı, öğrencinin kazanımını hedeflemelidir ("Bu soruyu tamamladığınızda [kavramı] açıklayabileceksiniz, tanımlayabileceksiniz, hesaplayabileceksiniz, ayırt edebileceksiniz").

Kurallar:
1. Sorular ${grade} seviyesinde ve ${subject} dersi için olmalıdır.
2. Zorluk seviyesi: ${difficulty}. (Yeni Nesil seçilmişse mantık-muhakeme, tablo/grafik yorumlama, gerçek yaşam senaryoları ve öncüllü soru tipleri kullan).
3. ${isMultipleChoice ? `Her soru TAM ${optionCount} şıktan (${optionLetters.join(', ')}) oluşmalıdır. Şıklar çeldirici nitelikte ve mantıklı olmalıdır.` : 'Sorular açık uçlu / klasik yanıt formatında olmalıdır.'}
4. Soru köklerinde kalın harf ("altı çizili", "değildir", "ulaşılamaz", "hangisidir") vurgularını **bold** yap.
5. Matematik ve Fen formüllerinde LaTeX matematik gösterimi kullan (örn: $x^2 + y^2 = z^2$, $\\frac{a}{b}$, $\\sqrt{x}$).
6. ${includeExplanation ? 'Her soru için "Bu soruyu çözdüğünüzde [ilgili kazanımı] açıklayabileceksiniz / tanımlayabileceksiniz" formatında öğrenme hedefini ve adım adım çözüm yolunu içeren detaylı ("explanation") ekle.' : ''}
7. Yanıtını YALNIZCA ve YALNIZCA geçerli bir JSON array olarak döndür. Markdown backtick veya ekstra açıklama yazma.`;

  let prompt = `Aşağıdaki kriterlere göre ${questionCount} adet soru üret:\n\n`;
  prompt += `Ders: ${subject}\n`;
  prompt += `Sınıf Seviyesi: ${grade}\n`;
  if (topic) prompt += `Konu: ${topic}\n`;
  prompt += `Zorluk: ${difficulty}\n`;
  prompt += `Şık Sayısı: ${optionCount} (${optionLetters.join(', ')})\n\n`;

  if (sourceType !== 'topic_only' && sourceContent && sourceContent.trim()) {
    prompt += `KAYNAK MATERYAL (Soruları doğrudan bu metne/özete dayandır):\n"""\n${sourceContent.slice(0, 15000)}\n"""\n\n`;
  }

  prompt += `Döndürülecek JSON Şeması:
[
  {
    "questionText": "Soru metni veya öncülleri...",
    "options": ${isMultipleChoice ? JSON.stringify(optionLetters.map(l => `${l}) Şık metni`)) : '[]'},
    "correctAnswer": 0, // Doğru şıkkın indexi (0=A, 1=B, 2=C, 3=D, 4=E)
    "correctAnswerLetter": "A",
    "explanation": "Detaylı çözüm rehberi ve doğru cevabın nedeni...",
    "difficulty": "${difficulty}",
    "topic": "${topic || subject}"
  }
]`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemInstruction + '\n\n' + prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  const modelsToTry = [
    model,
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;
  let responseData = null;

  for (const currentModel of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      responseData = await res.json();
      if (responseData) break;
    } catch (err) {
      console.warn(`[aiQuestionService] Model ${currentModel} failed:`, err.message);
      lastError = err;
    }
  }

  if (!responseData) {
    throw new Error(lastError?.message || 'Gemini API yanıt vermedi. Lütfen API anahtarınızı ve internet bağlantınızı kontrol ediniz.');
  }

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawText) {
    throw new Error('Yapay zeka boş bir yanıt döndürdü.');
  }

  let cleanJson = rawText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsedQuestions = JSON.parse(cleanJson);
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Dönen yanıt bir soru listesi içermiyor.');
    }

    return parsedQuestions.map((q, idx) => {
      let cAns = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      if (q.correctAnswerLetter) {
        const letterIdx = optionLetters.indexOf(String(q.correctAnswerLetter).trim().toUpperCase());
        if (letterIdx !== -1) cAns = letterIdx;
      }

      let opts = Array.isArray(q.options) ? q.options : [];
      if (isMultipleChoice && opts.length < optionCount) {
        for (let i = opts.length; i < optionCount; i++) {
          opts.push(`${optionLetters[i]}) Şık ${optionLetters[i]}`);
        }
      } else if (isMultipleChoice && opts.length > optionCount) {
        opts = opts.slice(0, optionCount);
      }

      return {
        id: `ai_q_${Date.now()}_${idx + 1}`,
        questionText: q.questionText || `Soru ${idx + 1}`,
        options: opts,
        correctAnswer: cAns,
        correctAnswerLetter: optionLetters[cAns] || 'A',
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty,
        topic: q.topic || topic || subject,
        subject: subject,
        grade: grade,
        optionCount: optionCount,
        questionType: questionType
      };
    });
  } catch (parseErr) {
    console.error('[aiQuestionService] JSON parse error:', parseErr, cleanJson);
    throw new Error('Yapay zekanın ürettiği sorular JSON formatına dönüştürülemedi. Lütfen tekrar deneyiniz.');
  }
}
