import React, { useState, useRef, useEffect, forwardRef } from "react";
import { Page } from 'react-pdf';
import { DrawingOverlay } from './DrawingOverlay';

const LazyPdfPage = forwardRef(function LazyPdfPage({ 
    index = 0, 
    pageNumber,
    containerWidth = 0, 
    pdfScale, 
    scale,
    isDrawingMode = false, 
    isDrawingOpen = false,
    drawingTool = 'pencil', 
    drawingColor = '#ef4444',
    strokeWidth = 3, 
    stylusOnly = false, 
    overlayRef 
}, ref) {
    const rawPageNo = Number(pageNumber || (typeof index === 'number' ? index + 1 : 1));
    const pageNo = (!isNaN(rawPageNo) && rawPageNo > 0) ? rawPageNo : 1;
    const rawScale = Number(scale || pdfScale || 1);
    const currentScale = (!isNaN(rawScale) && rawScale > 0) ? rawScale : 1;
    const isDrawing = Boolean(isDrawingMode || isDrawingOpen);
    
    const numWidth = typeof containerWidth === 'number' ? containerWidth : Number(containerWidth);
    const effectiveWidth = (!isNaN(numWidth) && numWidth > 32) ? Math.round(numWidth - 32) : undefined;

    const [hasIntersected, setHasIntersected] = useState(pageNo <= 2);
    const containerRef = useRef(null);

    useEffect(() => {
        if (hasIntersected || !containerRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasIntersected(true);
                observer.disconnect();
            }
        }, { rootMargin: '2000px' });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [hasIntersected]);

    return (
        <div ref={containerRef} style={{ 
            position: 'relative', 
            marginBottom: '1rem', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', 
            borderRadius: '4px', 
            background: 'white',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: effectiveWidth ? `${effectiveWidth}px` : 'auto',
            maxWidth: '100%'
        }}>
            {hasIntersected ? (
                <>
                    <Page 
                        pageNumber={pageNo} 
                        width={effectiveWidth}
                        scale={currentScale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                    <DrawingOverlay 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                        ref={overlayRef || ref}
                        disabled={!isDrawing}
                        tool={drawingTool}
                        color={drawingColor}
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
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sayfa {pageNo} Yükleniyor...</span>
                </div>
            )}
        </div>
    );
});

export default LazyPdfPage;
