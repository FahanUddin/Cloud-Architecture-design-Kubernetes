import React, { useEffect } from 'react';

const Board = ({ brushColor, brushSize, tool,
    canvasRef, isDrawing, setIsDrawing,
    socket, start, setStart }) => {

    useEffect(() => {
        socket.on('initialData', (data) => {
            const canvas = canvasRef?.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Clear the canvas before rendering initial data
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Render 'data' on the whiteboard canvas when receiving initial drawing data
                data.forEach((drawData) => {
                    drawOnCanvas(drawData); // Call a function to draw the received data on the canvas
                });
            }
        });

        socket.on('draw', (data) => {
            drawOnCanvas(data); // Draw the received data on the canvas
        });

        socket.on('clearCanvas', () => {
            const canvas = canvasRef?.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });

        // Listen for periodic updates
        socket.on('periodicUpdate', (updates) => {
            const canvas = canvasRef?.current;
            if (canvas) {
                updates.forEach((update) => {
                    drawOnCanvas(update); // Render each update on the canvas
                });
            }
        });

        return () => {
            socket.off('initialData');
            socket.off('draw');
            socket.off('clearCanvas');
            socket.off('periodicUpdate');
        };
    }, [socket]);

    function drawOnCanvas(data) {
        const canvas = canvasRef?.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const { type, x, y, prevX, prevY, width, height, radius, color, size, text, font } = data;
            if (type === 'line') {
                ctx.strokeStyle = color;
                ctx.lineWidth = size;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else if (type === 'rectangle') {

                ctx.strokeStyle = color;
                ctx.lineWidth = size;
                ctx.beginPath();
                ctx.strokeRect(prevX, prevY, width, height);

            } else if (type === 'circle') {

                ctx.strokeStyle = color;
                ctx.lineWidth = size;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (type === 'pen') {
                ctx.beginPath();
                ctx.lineWidth = size;
                ctx.strokeStyle = color;
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else if (type === 'eraser') {
                ctx.clearRect(x - size / 2, y - size / 2, size, size);
            } else if (type === 'text') {
                ctx.font = font;
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
            }
        }
    }

    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        setIsDrawing(true);
        let startX = e.clientX - canvas.getBoundingClientRect().left;
        let startY = e.clientY - canvas.getBoundingClientRect().top;
        setStart({ x: startX, y: startY });
    }

    const emitDrawingData = (data) => {
        socket.emit('draw', data);
    }

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;

        if (tool === 'pen') {
            let data = {
                type: 'pen',
                prevX: start.x,
                prevY: start.y,
                x: mouseX,
                y: mouseY,
                color: brushColor,
                size: brushSize
            };
            emitDrawingData(data);
            drawOnCanvas(data);
        } else if (tool === 'eraser') {
            let data = {
                type: 'eraser',
                x: mouseX,
                y: mouseY,
                size: 10
            };
            emitDrawingData(data);
            drawOnCanvas(data);
        }
        if (tool === 'pen' || tool === 'eraser') {
            setStart({ x: mouseX, y: mouseY });
        }
    }

    const handleMouseUp = (e) => {
        if (isDrawing) {
            const canvas = canvasRef.current;
            const endX = e.clientX - canvas.getBoundingClientRect().left;
            const endY = e.clientY - canvas.getBoundingClientRect().top;
            // Emit drawing data to the server based on the selected tool
            if (tool === 'line') {
                let data = {
                    type: 'line',
                    prevX: start.x,
                    prevY: start.y,
                    x: endX,
                    y: endY,
                    color: brushColor,
                    size: brushSize
                };
                emitDrawingData(data);
                drawOnCanvas(data);
            } else if (tool === 'rectangle') {
                const width = endX - start.x;
                const height = endY - start.y;
                let data = {
                    type: 'rectangle',
                    prevX: start.x,
                    prevY: start.y,
                    x: endX,
                    y: endY,
                    width,
                    height,
                    color: brushColor,
                    size: brushSize
                };
                emitDrawingData(data);
                drawOnCanvas(data);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(endX - start.x, 2) + Math.pow(endY - start.y, 2));
                let data = {
                    type: 'circle',
                    x: start.x,
                    y: start.y,
                    radius: radius,
                    color: brushColor,
                    size: brushSize
                };
                emitDrawingData(data);
                drawOnCanvas(data);
            }
            setIsDrawing(false);
        }
    }

    return (
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            width={window.innerWidth > 700 ? 700 : 300}
            height={window.innerHeight > 500 ? 500 : 200}
            className="border"
        />
    );
};

export default Board;