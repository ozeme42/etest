import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, BookOpen, Layers, Check, Sparkles, ClipboardList, Table, HelpCircle } from 'lucide-react';
import { READING_CATEGORIES, BOOK_COLORS } from '../../context/ReadingContext';

const DEFAULT_CATEGORIES = READING_CATEGORIES || [
  'Roman', 'Dünya Klasikleri', 'Türk Klasikleri', 'Hikaye / Öykü',
  'Bilim & Teknoloji', 'Tarih', 'Felsefe & Düşünce', 'Kişisel Gelişim', 'Diğer'
];

export default function BulkAddBooksModal({
  isOpen,
  onClose,
  onAddBulk,
  isDark,
  isMobile
}) {
  const [mode, setMode] = useState('table'); // 'table' | 'paste'
  const [targetStatus, setTargetStatus] = useState('to_read'); // 'to_read' | 'reading'

  // Table rows state (initial 4 empty rows)
  const [rows, setRows] = useState([
    { title: '', author: '', totalPages: '200', category: 'Roman' },
    { title: '', author: '', totalPages: '200', category: 'Roman' },
    { title: '', author: '', totalPages: '200', category: 'Roman' },
    { title: '', author: '', totalPages: '200', category: 'Roman' },
  ]);

  // Paste textarea state
  const [pasteText, setPasteText] = useState('');

  // Row operations
  const handleRowChange = (index, field, value) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = (count = 1) => {
    setRows(prev => {
      const newItems = Array.from({ length: count }, () => ({
        title: '',
        author: '',
        totalPages: '200',
        category: 'Roman'
      }));
      return [...prev, ...newItems];
    });
  };

  const handleRemoveRow = (index) => {
    setRows(prev => {
      if (prev.length <= 1) {
        return [{ title: '', author: '', totalPages: '200', category: 'Roman' }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Parser for pasted text
  const parsedPasteBooks = useMemo(() => {
    if (!pasteText.trim()) return [];

    const lines = pasteText.split('\n');
    const results = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let title = '';
      let author = '';
      let totalPages = 200;
      let category = 'Roman';

      // 1. Tab separated (Excel / Google Sheets)
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        title = parts[0] || '';
        author = parts[1] || '';
        const numPart = parts.find(p => /^\d+$/.test(p)) || parts[2];
        if (numPart && !isNaN(Number(numPart))) totalPages = Number(numPart);
      }
      // 2. Delimiters: comma, semicolon, dash, slash
      else {
        let parts = [];
        if (line.includes(';')) parts = line.split(';');
        else if (line.includes(',')) parts = line.split(',');
        else if (line.includes(' - ')) parts = line.split(' - ');
        else if (line.includes(' / ')) parts = line.split(' / ');
        else if (line.includes('-')) parts = line.split('-');
        else parts = [line];

        parts = parts.map(p => p.trim()).filter(Boolean);

        if (parts.length >= 3) {
          title = parts[0];
          author = parts[1];
          const parsedNum = parseInt(parts[2].replace(/\D/g, ''), 10);
          if (parsedNum > 0) totalPages = parsedNum;
        } else if (parts.length === 2) {
          title = parts[0];
          const numMatch = parts[1].match(/(\d+)\s*(?:sayfa|sf|p)?/i);
          if (numMatch) {
            totalPages = parseInt(numMatch[1], 10);
          } else {
            author = parts[1];
          }
        } else if (parts.length === 1) {
          // Check for page inside parenthesis e.g. "Beyaz Diş (240 sayfa) Jack London"
          const pageMatch = line.match(/\((\d+)\s*(?:sayfa|sf|p)?\)/i);
          if (pageMatch) {
            totalPages = parseInt(pageMatch[1], 10);
            title = line.replace(pageMatch[0], '').trim();
          } else {
            title = line;
          }
        }
      }

      if (title.trim()) {
        results.push({
          title: title.trim(),
          author: author.trim(),
          totalPages: Math.max(1, totalPages || 100),
          category
        });
      }
    }

    return results;
  }, [pasteText]);

  // Valid books to submit based on active mode
  const validBooks = useMemo(() => {
    if (mode === 'paste') {
      return parsedPasteBooks;
    }
    return rows
      .filter(r => r.title.trim().length > 0)
      .map(r => ({
        title: r.title.trim(),
        author: (r.author || '').trim(),
        totalPages: Math.max(1, Number(r.totalPages) || 100),
        category: r.category || 'Roman'
      }));
  }, [mode, rows, parsedPasteBooks]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validBooks.length === 0) return;

    const booksToInsert = validBooks.map(b => ({
      ...b,
      status: targetStatus
    }));

    onAddBulk(booksToInsert);
    onClose();
  };

  const handlePasteSample = () => {
    setPasteText(
`Simyacı, Paulo Coelho, 184
Beyaz Diş, Jack London, 240
Suç ve Ceza, Fyodor Dostoyevski, 680
Kürk Mantolu Madonna, Sabahattin Ali, 160
Küçük Prens, Antoine de Saint-Exupéry, 112`
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: isDark ? 'rgba(3, 7, 18, 0.85)' : 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : '1rem'
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(180deg, #131722 0%, #0d111d 100%)' : '#ffffff',
        borderRadius: isMobile ? '1.75rem 1.75rem 0 0' : '1.5rem',
        width: '100%',
        maxWidth: isMobile ? '100%' : 760,
        boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08)' : '0 25px 60px rgba(0,0,0,0.25)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
        color: isDark ? '#f8fafc' : '#0f172a',
        maxHeight: isMobile ? '92vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: isMobile ? 'sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'modalPop 0.2s ease-out'
      }}>
        {/* ── HEADER ── */}
        <div style={{
          padding: isMobile ? '1.1rem 1.25rem 0.85rem' : '1.25rem 1.5rem 1rem',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '0.85rem',
              background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.25rem',
              boxShadow: '0 4px 14px rgba(236,72,153,0.35)'
            }}>
              📚
            </div>
            <div>
              <h2 style={{ fontSize: isMobile ? '1.15rem' : '1.25rem', fontWeight: 900, margin: 0 }}>
                Toplu Kitap Ekle
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                Birden fazla kitabı tek seferde okuma veya istek listenize ekleyin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              color: isDark ? '#cbd5e1' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── TOOLBAR / CONTROLS ── */}
        <div style={{
          padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.5rem',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #eef2f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          {/* Giriş Modu Switcher (Tablo vs Metin) */}
          <div style={{
            display: 'flex',
            background: isDark ? 'rgba(0,0,0,0.3)' : '#e2e8f0',
            padding: 3,
            borderRadius: '0.75rem',
            gap: 2
          }}>
            <button
              type="button"
              onClick={() => setMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.4rem 0.85rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: mode === 'table' ? (isDark ? '#222838' : '#ffffff') : 'transparent',
                color: mode === 'table' ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: mode === 'table' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Table size={14} color={mode === 'table' ? '#ec4899' : 'currentColor'} />
              <span>Satır Satır Tablo</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('paste')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.4rem 0.85rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: mode === 'paste' ? (isDark ? '#222838' : '#ffffff') : 'transparent',
                color: mode === 'paste' ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: mode === 'paste' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <ClipboardList size={14} color={mode === 'paste' ? '#ec4899' : 'currentColor'} />
              <span>Hızlı Metin / Excel</span>
            </button>
          </div>

          {/* Hedef Liste Seçimi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b' }}>
              Eklenecek Liste:
            </span>
            <div style={{
              display: 'flex',
              background: isDark ? 'rgba(0,0,0,0.3)' : '#e2e8f0',
              padding: 3,
              borderRadius: '0.75rem',
              gap: 2
            }}>
              <button
                type="button"
                onClick={() => setTargetStatus('to_read')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  background: targetStatus === 'to_read' ? '#6366f1' : 'transparent',
                  color: targetStatus === 'to_read' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ⏳ Okuyacaklarım
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('reading')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: 'none',
                  background: targetStatus === 'reading' ? '#ec4899' : 'transparent',
                  color: targetStatus === 'reading' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                📖 Şu An Okuyorum
              </button>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '1rem' : '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {mode === 'table' ? (
            /* 1. TABLO MODU */
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isDark ? '#f472b6' : '#db2777' }}>
                  Aşağıdaki satırlara eklemek istediğiniz kitapları yazın:
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: validBooks.length > 0 ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'),
                  background: validBooks.length > 0 ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {validBooks.length} kitap hazır
                </span>
              </div>

              {/* Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {rows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '32px 2.2fr 1.6fr 1fr 1.2fr 34px',
                      gap: isMobile ? '0.45rem' : '0.55rem',
                      alignItems: 'center',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      padding: isMobile ? '0.75rem' : '0.55rem 0.75rem',
                      borderRadius: '0.85rem',
                      border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Index Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      color: isDark ? '#cbd5e1' : '#64748b'
                    }}>
                      {idx + 1}
                    </div>

                    {/* Kitap Adı */}
                    <div>
                      {isMobile && <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8' }}>KİTAP ADI *</label>}
                      <input
                        type="text"
                        value={row.title}
                        onChange={e => handleRowChange(idx, 'title', e.target.value)}
                        placeholder="Kitap Adı (Örn: Beyaz Diş)..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Yazarı */}
                    <div>
                      {isMobile && <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8' }}>YAZARI</label>}
                      <input
                        type="text"
                        value={row.author}
                        onChange={e => handleRowChange(idx, 'author', e.target.value)}
                        placeholder="Yazar (Örn: Jack London)..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Sayfa Sayısı */}
                    <div>
                      {isMobile && <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8' }}>SAYFA</label>}
                      <input
                        type="number"
                        min="1"
                        value={row.totalPages}
                        onChange={e => handleRowChange(idx, 'totalPages', e.target.value)}
                        placeholder="Sayfa"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.65rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          outline: 'none',
                          boxSizing: 'border-box',
                          textAlign: isMobile ? 'left' : 'center'
                        }}
                      />
                    </div>

                    {/* Kategori */}
                    <div>
                      {isMobile && <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8' }}>KATEGORİ</label>}
                      <select
                        value={row.category}
                        onChange={e => handleRowChange(idx, 'category', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.65rem',
                          borderRadius: '0.65rem',
                          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                          background: isDark ? '#1a1f2e' : '#ffffff',
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        {DEFAULT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delete Row Button */}
                    <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        title="Satırı Sil"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: 'none',
                          background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Rows Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAddRow(1)}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '0.7rem',
                    border: isDark ? '1.5px dashed rgba(255,255,255,0.2)' : '1.5px dashed #cbd5e1',
                    background: 'transparent',
                    color: isDark ? '#f472b6' : '#db2777',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Plus size={14} /> +1 Satır Ekle
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow(3)}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '0.7rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Plus size={14} /> +3 Satır Ekle
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow(5)}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '0.7rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Plus size={14} /> +5 Satır Ekle
                </button>
              </div>
            </div>
          ) : (
            /* 2. METİN / EXCEL KOPYALA-YAPIŞTIR MODU */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isDark ? '#f472b6' : '#db2777' }}>
                  Kitap listenizi her satıra bir kitap gelecek şekilde yapıştırın:
                </span>
                <button
                  type="button"
                  onClick={handlePasteSample}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Örnek Veri Yükle
                </button>
              </div>

              <div style={{
                background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #c7d2fe',
                borderRadius: '0.75rem',
                padding: '0.65rem 0.85rem',
                fontSize: '0.74rem',
                color: isDark ? '#c7d2fe' : '#3730a3',
                lineHeight: 1.4
              }}>
                💡 <strong>Desteklenen Formatlar:</strong><br />
                • <code>Kitap Adı, Yazar, Sayfa Sayısı</code> (Virgüllü)<br />
                • <code>Kitap Adı - Yazar - Sayfa Sayısı</code> (Tireli)<br />
                • Excel veya Google Tablolar'dan kopyalayıp doğrudan buraya yapıştırabilirsiniz (Tab sütunları otomatik ayrıştırılır).
              </div>

              <textarea
                rows={isMobile ? 6 : 8}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Örnek:&#10;Simyacı, Paulo Coelho, 184&#10;Beyaz Diş, Jack London, 240&#10;Suç ve Ceza, Dostoyevski, 680"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.85rem',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a',
                  fontSize: '0.84rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {/* Canlı Algılanan Kitaplar Önizlemesi */}
              {parsedPasteBooks.length > 0 && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '0.85rem',
                  background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                  border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#10b981' }}>
                      ✓ Algılanan Kitaplar ({parsedPasteBooks.length} Adet)
                    </span>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {parsedPasteBooks.map((b, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                          fontSize: '0.76rem'
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>
                          📖 {b.title} {b.author ? <span style={{ opacity: 0.7, fontWeight: 600 }}>— {b.author}</span> : ''}
                        </span>
                        <span style={{ fontWeight: 800, color: '#ec4899', flexShrink: 0 }}>
                          {b.totalPages} sf
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: isMobile ? '0.85rem 1.25rem' : '1rem 1.5rem',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '0.75rem',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
              background: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Vazgeç
          </button>

          <button
            type="button"
            disabled={validBooks.length === 0}
            onClick={handleSubmit}
            style={{
              padding: '0.7rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: validBooks.length > 0
                ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
              color: validBooks.length > 0 ? '#ffffff' : (isDark ? '#64748b' : '#94a3b8'),
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: validBooks.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: validBooks.length > 0 ? '0 4px 16px rgba(236,72,153,0.4)' : 'none'
            }}
          >
            <Check size={16} strokeWidth={3} />
            {validBooks.length > 0
              ? `${validBooks.length} Kitabı ${targetStatus === 'to_read' ? 'Okuyacaklarıma' : 'Listeme'} Ekle`
              : 'Kitapları Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
