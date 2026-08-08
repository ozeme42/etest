import React, { useState, useRef, useEffect } from "react";
import { Page } from 'react-pdf';
import { DrawingOverlay } from './DrawingOverlay';

export default function LazyPdfPage({ 
    index, 
    containerWidth, 
    pdfScale, 
    isDrawingMode, 
    drawingTool, 
    strokeWidth, 
    stylusOnly, 
    overlayRef 
}) {
    const [hasIntersected, setHasIntersected] = useState(index < 2); // İlk 2 sayfayı anında yükle
    const ref = useRef(null);

    useEffect(() => {
        if (hasIntersected || !ref.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasIntersected(true);
                observer.disconnect();
            }
        }, { rootMargin: '2000px' }); // 2000px önceden yüklemeye başla
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasIntersected]);

    return (
        <div ref={ref} style={{ 
            position: 'relative', 
            marginBottom: '1rem', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', 
            borderRadius: '4px', 
            background: 'white',
            minHeight: '800px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: containerWidth ? (containerWidth - 32) * pdfScale : 'auto'
        }}>
            {hasIntersected ? (
                <>
                    <Page 
                        pageNumber={index + 1} 
                        width={containerWidth ? (containerWidth - 32) * pdfScale : undefined}
                        scale={pdfScale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                    <DrawingOverlay 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                        ref={overlayRef}
                        disabled={!isDrawingMode}
                        tool={drawingTool}
                        strokeWidth={strokeWidth}
                        onChange={() => {}}
                        stylusOnly={stylusOnly}
                    />
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#94a3b8', padding: '10rem 0' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid transparent', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sayfa {index + 1} Yükleniyor...</span>
                </div>
            )}
        </div>
    );
}
