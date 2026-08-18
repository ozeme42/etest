import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export const MOTIVATION_QUOTES = [
  { quote: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier", category: "Disiplin" },
  { quote: "Gelecek, bugün ne yaptığına bağlıdır. Yarın değil, tam da şimdi!", author: "Mahatma Gandhi", category: "Eylem" },
  { quote: "Zirveye tırmanmak yorucudur ama oradaki manzara her şeye değer.", author: "Anonim", category: "Zafer" },
  { quote: "Disiplin, ne istediğin ile en çok ne istediğin arasındaki seçimdir.", author: "Abraham Lincoln", category: "Odak" },
  { quote: "Zafer, 'vazgeçmeyenlerindir'. Yapabileceğinin en iyisini yap!", author: "Mustafa Kemal Atatürk", category: "İnanç" },
  { quote: "Zorluklar, başarının değerini artıran süslerdir.", author: "Molière", category: "Mücadele" },
  { quote: "Büyük işler, bir anda değil, küçük şeylerin bir araya getirilmesiyle yapılır.", author: "Vincent van Gogh", category: "Disiplin" },
  { quote: "Sınırlarını zorlamayan biri, potansiyelinin ne olduğunu asla öğrenemez.", author: "Kobe Bryant", category: "Özgüven" },
  { quote: "Ter dökülmeyen zafer, zafer değildir.", author: "Anonim", category: "Disiplin" },
  { quote: "Şans, hazırlıklı zihinleri sever.", author: "Louis Pasteur", category: "Zeka" },
  { quote: "Yorulabilirsin, ama vazgeçemezsin. Zirve seni bekliyor!", author: "Koçluk Mottosu", category: "İnanç" },
  { quote: "Rüyalarınızı gerçekleştirmenin en iyi yolu uyanmaktır.", author: "Paul Valéry", category: "Eylem" },
  { quote: "Hata yapmaktan korkmayın; hiç denememiş olmaktan korkun.", author: "Albert Einstein", category: "Özgüven" },
  { quote: "Rüzgar ne kadar sert eserse esin, sağlam ağaç köklerinden kopmaz.", author: "Konfüçyüs", category: "Mücadele" },
  { quote: "Hedefine odaklan, gürültüyü kapat ve sadece işini yap!", author: "Anonim", category: "Odak" },
  { quote: "Sınavı kazandıran zeka değil, bıkmadan gösterilen sürekliliktir.", author: "YKS / LGS Derece Mottosu", category: "Disiplin" }
];

export default function CoachingQuoteCard() {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATION_QUOTES.length));

  const currentQuote = useMemo(() => MOTIVATION_QUOTES[quoteIndex] || MOTIVATION_QUOTES[0], [quoteIndex]);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
        borderRadius: '1.25rem',
        padding: '1.25rem 1.5rem',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '0.85rem',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, background: 'rgba(255, 255, 255, 0.25)', padding: '0.15rem 0.5rem', borderRadius: 99, textTransform: 'uppercase' }}>
              {currentQuote.category}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700 }}>Günün Motivasyon Mottosu</span>
          </div>
          <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.35 }}>
            "{currentQuote.quote}"
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>
            — {currentQuote.author}
          </p>
        </div>
      </div>

      <button
        onClick={handleNextQuote}
        title="Yeni Motto Getir"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '0.75rem',
          padding: '0.55rem',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s'
        }}
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
}
