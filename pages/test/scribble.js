import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

export default function Scribble() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [tool, setTool] = useState('pencil'); // pencil, eraser
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const drawHand = (ctx, hand) => {
    if (hand.landmarks) {
      for (let i = 0; i < hand.landmarks.length; i++) {
        const point = hand.landmarks[i];
        ctx.beginPath();
        ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
      }
    }
  };

  const drawCursor = (ctx, x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.fill();
  };

  const detectPinch = (landmarks) => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow(thumbTip[0] - indexTip[0], 2) + 
      Math.pow(thumbTip[1] - indexTip[1], 2)
    );
    
    return distance < 40; // Adjust threshold as needed
  };

  const detectPalmGesture = (landmarks) => {
    const palmBase = landmarks[0];
    const middleTip = landmarks[12];

    const distance = (point1, point2) => Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) + 
      Math.pow(point1[1] - point2[1], 2)
    );

    // Detect palm by checking if the middle finger is extended
    return distance(palmBase, middleTip) > 100; // Adjust threshold as needed
  };

  const draw = (ctx, x, y) => {
    if (!isDrawingRef.current) {
      lastPosRef.current = { x, y };
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'pencil' ? color : '#FFFFFF';
    ctx.lineWidth = tool === 'pencil' ? lineWidth : lineWidth * 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    lastPosRef.current = { x, y };
  };

  useEffect(() => {
    const runHandDetection = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        
        const model = await handpose.load();
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
            };

            videoRef.current.onloadeddata = () => {
              if (canvasRef.current && drawingCanvasRef.current) {
                const width = videoRef.current.videoWidth;
                const height = videoRef.current.videoHeight;
                canvasRef.current.width = width;
                canvasRef.current.height = height;
                drawingCanvasRef.current.width = width;
                drawingCanvasRef.current.height = height;
                
                const drawingCtx = drawingCanvasRef.current.getContext('2d');
                drawingCtx.scale(-1, 1);
                drawingCtx.translate(-width, 0);
                
                detect(model);
              }
            };
          }
        }

        const detect = async (model) => {
          if (
            videoRef.current && 
            canvasRef.current && 
            drawingCanvasRef.current && 
            videoRef.current.readyState === 4
          ) {
            const hands = await model.estimateHands(videoRef.current);
            
            const ctx = canvasRef.current.getContext('2d');
            const drawingCtx = drawingCanvasRef.current.getContext('2d');
            
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-ctx.canvas.width, 0);
            
            ctx.drawImage(videoRef.current, 0, 0);

            if (hands.length > 0) {
              const hand = hands[0];
              
              const mirroredHand = {
                ...hand,
                landmarks: hand.landmarks.map(point => [
                  ctx.canvas.width - point[0],
                  point[1],
                  point[2]
                ])
              };
              
              drawHand(ctx, mirroredHand);
              
              const isPalm = detectPalmGesture(hand.landmarks);
              const isPinching = detectPinch(hand.landmarks);
              
              if (isPalm) {
                setTool('eraser');
                isDrawingRef.current = false;
              } else {
                setTool('pencil');
                isDrawingRef.current = isPinching;
              }
              
              const indexTip = hand.landmarks[8];
              const mirroredX = ctx.canvas.width - indexTip[0];
              
              ctx.save();
              ctx.scale(-1, 1);
              ctx.translate(-ctx.canvas.width, 0);
              drawCursor(ctx, mirroredX, indexTip[1]);
              ctx.restore();

              if (isPinching && !isPalm) {
                draw(drawingCtx, mirroredX, indexTip[1]);
              }
            }
            
            ctx.restore();
          }
          
          animationFrameRef.current = requestAnimationFrame(() => detect(model));
        };
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    runHandDetection();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [color, lineWidth]);

  return (
    <div className="relative flex items-start p-8 max-w-[1400px] mx-auto gap-10">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="w-full h-auto transform scale-x-[-1]"
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        <canvas
          ref={drawingCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>
      
      <div className="min-w-[200px] space-y-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-medium mb-2">Tools</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Line Width</label>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-medium mb-2">Gestures</h3>
          <ul className="space-y-2 text-sm">
            <li>👌 Pinch to draw</li>
            <li>🖐️ Palm to erase</li>
          </ul>
        </div>
      </div>
    </div>
  );
}