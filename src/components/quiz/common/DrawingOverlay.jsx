import React, { forwardRef, useRef, useCallback, useEffect, useImperativeHandle } from "react";

export const DrawingOverlay = forwardRef(({ className, style, disabled = false, tool = 'pencil', color = '#ef4444', strokeWidth = 3, stylusOnly = false, onChange }, ref) => {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const contextRef = useRef(null);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle high DPI displays for crisp drawing
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (!rect) return;

        // Check if already initialized with same size to prevent clear
        if (canvas.width === Math.floor(rect.width * window.devicePixelRatio) && canvas.height === Math.floor(rect.height * window.devicePixelRatio)) {
            return;
        }

        // Save existing content before resizing
        const currentData = canvas.toDataURL();

        canvas.width = Math.floor(rect.width * window.devicePixelRatio);
        canvas.height = Math.floor(rect.height * window.devicePixelRatio);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            contextRef.current = ctx;

            // Restore content
            if (currentData && currentData !== "data:,") {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = currentData;
            }
        }
    }, []);

    useEffect(() => {
        initCanvas();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        const observer = new ResizeObserver(() => {
            initCanvas();
        });
        observer.observe(parent);

        return () => observer.disconnect();
    }, [initCanvas]);

    useEffect(() => {
        if (contextRef.current) {
            if (tool === 'eraser') {
                contextRef.current.globalCompositeOperation = 'destination-out';
                contextRef.current.lineWidth = strokeWidth * 5; // Eraser is thicker
            } else {
                contextRef.current.globalCompositeOperation = 'source-over';
                contextRef.current.strokeStyle = color;
                contextRef.current.lineWidth = strokeWidth;
            }
        }
    }, [tool, color, strokeWidth]);

    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (onChange) onChange();
        },
        getDataURL: () => {
            if (!canvasRef.current) return "";
            return canvasRef.current.toDataURL();
        },
        loadDataURL: (dataURL) => {
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!dataURL) return;
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
            };
            img.src = dataURL;
        }
    }));

    const startDrawing = (e) => {
        if (disabled) return;
        if (stylusOnly && e.pointerType === 'touch') return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Release pointer capture to ensure we receive events if cursor moves outside quickly
        canvas.setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        contextRef.current?.beginPath();
        contextRef.current?.moveTo(x, y);
        isDrawingRef.current = true;
        e.preventDefault();
    };

    const draw = (e) => {
        if (!isDrawingRef.current || disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        contextRef.current?.lineTo(x, y);
        contextRef.current?.stroke();
        e.preventDefault();
    };

    const stopDrawing = (e) => {
        if (!isDrawingRef.current || disabled) return;
        isDrawingRef.current = false;
        
        const canvas = canvasRef.current;
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
        
        if (onChange) onChange();
    };

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className={className}
            style={{
                ...(style || {}),
                pointerEvents: disabled ? 'none' : 'auto',
                touchAction: 'none',
                cursor: disabled ? 'default' : (tool === 'eraser' ? 'cell' : 'crosshair')
            }}
        />
    );
});
