
import { useState, useRef, useContext } from 'react';
import '../App.css';
import Board from './Board.jsx';
import Tooltip from './Tooltip.jsx';
import WhiteboardContext from '../contexts/WhiteboardContext.jsx';

const CanvasDrawing = () => {
    const { socket, users } = useContext(WhiteboardContext);

    const canvasRef = useRef(null);
    const [brushColor, setBrushColor] = useState('black');
    const [brushSize, setBrushSize] = useState(5);
    const [showTextInput, setShowTextInput] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [tool, setTool] = useState('pen');
    const [isDrawing, setIsDrawing] = useState(false);
    const [start, setStart] = useState({ x: 0, y: 0 });
    const getContext = () => canvasRef.current.getContext("2d");

    const clearCanvas = () => {
        const context = getContext();
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit('clearCanvas'); // Notify other clients
    };

    const changeTool = (tool) => {
        setTool(tool);
        if (tool === "text") {
            setShowTextInput(true);
        } else {
            setShowTextInput(false);
        }
    };

    const handleAddText = () => {
        socket.emit('draw', {
            type: 'text',
            x: start.x + 100,
            y: start.y + 100,
            color: brushColor,
            font: "32px Roboto",
            text: textInput
        });
        setTextInput("");
        setShowTextInput(false);
    };

    return (
        <div className="flex justify-center items-center h-screen bg-blue-100">
            <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-8">
                <h1 className="text-3xl font-semibold mb-4 text-center">Collaborative Whiteboard</h1>
                <h4 className="text-base font-semibold mb-8 text-center">
                    Active Users: {users.length}
                </h4>
                <div className="border border-blue-300 rounded-lg mb-6 relative">
                    <Board
                        socket={socket}
                        isDrawing={isDrawing}
                        setIsDrawing={setIsDrawing}
                        tool={tool}
                        canvasRef={canvasRef}
                        brushColor={brushColor}
                        start={start}
                        setStart={setStart}
                        brushSize={brushSize} />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex justify-start items-center">
                        <Tooltip message={'Pen'}>
                            <button
                                onClick={() => changeTool('pen')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                        </Tooltip>
                        <Tooltip message={'Eraser'}>
                            <button
                                onClick={() => changeTool('eraser')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-solid fa-eraser"></i>
                            </button>
                        </Tooltip>
                        <Tooltip message={'Circle'}>
                            <button
                                onClick={() => changeTool('circle')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-regular fa-circle"></i>
                            </button>
                        </Tooltip>
                        <Tooltip message={'Rectangle'}>
                            <button
                                onClick={() => changeTool('rectangle')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-regular fa-square"></i>
                            </button>
                        </Tooltip>
                        <Tooltip message={'Line'}>
                            <button
                                onClick={() => changeTool('line')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-solid fa-slash" ></i>
                            </button>
                        </Tooltip>
                        <Tooltip message={'Text'}>
                            <button
                                onClick={() => changeTool('text')}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                                <i class="fa-solid fa-text-height"></i>
                            </button>
                        </Tooltip>
                    </div>

                    <div>

                        <button
                            onClick={clearCanvas}
                            className="text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                            Clear
                        </button>
                    </div>
                </div>
                <div className='flex justify-between items-center'>
                    <div className='flex justify-start items-center'>
                        <div className='flex justify-start mr-6'>
                            <Tooltip message={'Pick Color'}>
                                <i class="fa-solid fa-droplet mr-2"></i>
                            </Tooltip>
                            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
                        </div>
                        <div className='flex justify-start'>
                            <Tooltip message={'Brush Size'}>
                                <i class="fa-solid fa-circle mr-2"></i>
                            </Tooltip>
                            <input type="range" color='#fac176' className='mr-2'
                                min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
                            <span className='font-semibold'>{brushSize}</span>
                        </div>
                    </div>
                    {showTextInput && (
                        <div className='flex justify-end items-center'>
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
                                placeholder="Enter text"
                            />
                            <button
                                onClick={handleAddText}
                                className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center ml-2">
                                Add Text
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CanvasDrawing;