import { dbGetUserAiApiKey } from './supabaseService';

export const GEMINI_SOLVER_MODELS = [
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash'
];

/**
 * Get active Gemini API Key from localStorage, environment, or Supabase
 */
export async function getResolvedAiApiKey(userId) {
  try {
    const local = localStorage.getItem('gemini_api_key') || localStorage.getItem('eTestGeminiApiKey');
    if (local && local.trim()) return local.trim();

    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim()) return envKey.trim();

    if (userId) {
      const cloudKey = await dbGetUserAiApiKey(userId);
      if (cloudKey && cloudKey.trim()) {
        localStorage.setItem('eTestGeminiApiKey', cloudKey.trim());
        return cloudKey.trim();
      }
    }
  } catch (err) {
    console.warn('[aiSolutionService] Error getting API key:', err);
  }
  return '';
}

/**
 * Solve a single question using Gemini (Multimodal Vision / Text)
 * Zero database storage, processed strictly in-memory.
 */
export async function solveQuestionWithAi({
  apiKey,
  userId,
  imageBase64, // Cropped image / photo dataUrl or raw base64
  questionText = '',
  options = [],
  studentAnswer = '',
  correctAnswer = '',
  mistakeReason = '',
  subject = 'Genel',
  grade = '',
  topic = '',
  questionNo = 1,
  cacheKey = ''
}) {
  // 1. Check local cache first to avoid re-calling API (Zero API & DB cost)
  if (cacheKey) {
    try {
      const cached = localStorage.getItem(`ai_sol_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.steps || parsed.explanation || parsed.summary)) {
          return parsed;
        }
      }
    } catch {}
  }

  // 2. Resolve API key
  const effectiveKey = (apiKey && apiKey.trim()) || (await getResolvedAiApiKey(userId));
  if (!effectiveKey) {
    throw new Error('API_KEY_REQUIRED');
  }

  // 3. Prepare System Instruction & Prompt
  const cleanReason = mistakeReason || 'Hata Sebebi Belirtilmedi';
  
  const systemInstruction = `Sen Türkiye MEB müfredatına ve LGS/YKS/ÖSYM sınav standartlarına tam hakim, son derece pedagojik, cana yakın ve uzman bir öğretmensin.
Görevin: Öğrencinin yanlış yaptığı veya boş bıraktığı soruyu adım adım, tane tane ve en anlaşılır şekilde çözmek ve seçtiği hata sebebine göre özel bir koçluk tavsiyesi sunmaktır.

Kurallar:
1. Çözümü madde madde, adım adım ve net matematiksel/mantıksal akışla yaz.
2. Matematik veya Fen formüllerinde LaTeX formatını kullan (örn: $x^2 + y^2 = z^2$, $\\frac{a}{b}$, $\\sqrt{x}$).
3. Öğrencinin seçtiği HATA SEBEBİ (${cleanReason}) doğrultusunda:
   - "İşlem Hatası" ise: En sık hata yapılan işlem adımını ve işlem sırasını vurgula.
   - "Formül / Bilgi Unutuldu" ise: Kullanılan ana formülü veya kuralı 'Altın Kural' kutusunda net ver.
   - "Konu Eksiği" ise: Sorunun ait olduğu konunun 2-3 cümlelik mini konu özetini ve püf noktasını ekle.
   - "Dikkat / Yanlış Okuma" ise: Sorudaki çeldiricileri, olumsuz kökleri (değildir, çıkarılamaz vb.) ve dikkat edilmesi gereken anahtar kelimeleri göster.
   - "Zaman Yetmedi" ise: Soruyu 30 saniyede çözebileceği pratik kısayol taktiğini açıkla.
4. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`;

  let prompt = `Aşağıdaki soruyu incele ve ayrıntılı çözümünü üret:\n\n`;
  if (subject) prompt += `Ders: ${subject}\n`;
  if (grade) prompt += `Sınıf / Seviye: ${grade}\n`;
  if (topic) prompt += `Konu: ${topic}\n`;
  if (questionNo) prompt += `Soru Numarası: ${questionNo}\n`;
  if (studentAnswer) prompt += `Öğrencinin Yanıtı: ${studentAnswer}\n`;
  if (correctAnswer) prompt += `Doğru Yanıt: ${correctAnswer}\n`;
  if (cleanReason) prompt += `Öğrencinin Belirttiği Hata Sebebi: ${cleanReason}\n`;

  if (questionText && questionText.trim()) {
    prompt += `\nSORU METNİ:\n"""\n${questionText}\n"""\n`;
  }
  if (Array.isArray(options) && options.length > 0) {
    prompt += `\nŞIKLAR:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n`;
  }

  prompt += `\nDöndürülecek JSON Şeması:
{
  "correctAnswer": "A",
  "summary": "Sorunun 1-2 cümlelik özeti ve ana fikri",
  "steps": [
    "1. Adım: Verilenleri ve istenenleri belirleyelim...",
    "2. Adım: Formülü/kuralı uygulayalım...",
    "3. Adım: Sonucu hesaplayalım ve doğru şıkkı bulalım..."
  ],
  "mistakeAdvice": "Öğrencinin seçtiği '${cleanReason}' sebebine göre nokta atışı koçluk uyarısı ve tavsiyesi",
  "goldenRule": "Bu soruyu çözmek için gereken altın kural, formül veya püf nokta",
  "similarQuestion": {
    "questionText": "Öğrencinin bu konuyu pekiştirmesi için 1 adet benzer mini soru metni...",
    "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4"],
    "correctAnswerLetter": "B",
    "explanation": "Pekiştirme sorusunun kısa çözümü"
  }
}`;

  // 4. Prepare Parts (Multimodal Image + Text)
  const parts = [];

  if (imageBase64 && typeof imageBase64 === 'string') {
    let cleanB64 = imageBase64;
    let mimeType = 'image/jpeg';
    if (imageBase64.includes(';base64,')) {
      const split = imageBase64.split(';base64,');
      mimeType = split[0].replace('data:', '') || 'image/jpeg';
      cleanB64 = split[1];
    }
    parts.push({
      inlineData: {
        mimeType,
        data: cleanB64
      }
    });
  }

  parts.push({ text: systemInstruction + '\n\n' + prompt });

  const requestBody = {
    contents: [
      { parts }
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096
    }
  };

  let responseData = null;
  let lastError = null;

  for (const model of GEMINI_SOLVER_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      responseData = await res.json();
      if (responseData) break;
    } catch (err) {
      console.warn(`[aiSolutionService] Model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  if (!responseData) {
    throw new Error(lastError?.message || 'Yapay zeka soru çözümü üretemedi. Lütfen internet bağlantınızı veya API anahtarınızı kontrol ediniz.');
  }

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawText) {
    throw new Error('Gemini API boş yanıt döndürdü.');
  }

  // Parse JSON response
  let parsed = null;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {}
    }
  }

  if (!parsed || (!parsed.steps && !parsed.explanation && !parsed.summary)) {
    parsed = {
      correctAnswer: correctAnswer || 'Belirtilmedi',
      summary: 'Çözüm Başarıyla Üretildi',
      steps: rawText.split('\n').filter(l => l.trim().length > 0),
      mistakeAdvice: `Hata sebebi (${cleanReason}) analizi ve doğru çözüm adımları yukarıda sunulmuştur.`,
      goldenRule: 'Sorunun temel kazanımını ve çözüm adımlarını dikkatle inceleyiniz.'
    };
  }

  // Save to local cache with zero DB cost
  if (cacheKey && parsed) {
    try {
      localStorage.setItem(`ai_sol_${cacheKey}`, JSON.stringify(parsed));
    } catch {}
  }

  return parsed;
}
