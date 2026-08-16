import React, { useMemo } from 'react';
import './SummaryHtmlViewer.css';

export default function SummaryHtmlViewer({
  htmlContent = '',
  fontSize = 16,
  title = '',
  targetType = 'topic',
  emptyMessage = 'Bu bölüm için henüz özet veya konu anlatımı eklenmemiş.'
}) {
  // Sanitize and enhance HTML if needed
  const processedHtml = useMemo(() => {
    if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
      return null;
    }

    let cleaned = htmlContent;

    // Strip harmful script tags
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    return cleaned;
  }, [htmlContent]);

  if (!processedHtml) {
    return (
      <div className="summary-empty-state">
        <div className="summary-empty-icon">📖</div>
        <h3>{targetType === 'unit' ? 'Ünite Genel Özeti Bulunamadı' : 'Konu Özeti Bulunamadı'}</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="summary-html-container"
      style={{ fontSize: `${fontSize}px` }}
    >
      <div
        className="summary-html-content custom-content-typography"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </div>
  );
}
