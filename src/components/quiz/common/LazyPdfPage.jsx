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
    const zoomMultiplier = (!isNaN(currentScale) && currentScale > 0) ? currentScale : 1;
    
    // Fit-to-width base calculation (leave comfortable margin inside container)
    const margin = (numWidth && numWidth < 600) ? 16 : 32;
    const baseWidth = (numWidth && numWidth > 100) ? Math.max(260, numWidth - margin) : 720;
    const effectiveWidth = Math.round(baseWidth * zoomMultiplier);

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
        <div id={`pdf-page-${pageNo}`} ref={containerRef} style={{ 
            position: 'relative', 
            marginBottom: '1.25rem', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)', 
            borderRadius: '6px', 
            background: 'white',
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: effectiveWidth ? `${effectiveWidth}px` : 'auto',
            maxWidth: zoomMultiplier <= 1 ? '100%' : 'none',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            {hasIntersected ? (
                <>
                    <Page 
                        pageNumber={pageNo} 
                        width={effectiveWidth}
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
