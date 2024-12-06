import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

export default function HandTracking() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const runHandpose = async () => {
      // Load the handpose model
      const model = await handpose.load();
      
      // Setup webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be loaded
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
          };

          // Make sure video is fully loaded and has dimensions
          videoRef.current.onloadeddata = () => {
            // Set canvas dimensions to match video
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              detect(); // Start detection only after video is fully loaded and dimensions are set
            }
          };
        }
      }

      // Detection function
      const detect = async () => {
        if (
          videoRef.current && 
          canvasRef.current && 
          videoRef.current.readyState === 4 // Make sure video is ready
        ) {
          // Get predictions
          const predictions = await model.estimateHands(videoRef.current);
          
          // Get canvas context
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw video frame
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          
          // Draw circle around hand
          if (predictions.length > 0) {
            const palmBase = predictions[0].landmarks[0];
            ctx.beginPath();
            ctx.arc(palmBase[0], palmBase[1], 50, 0, 2 * Math.PI);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        }
        
        requestAnimationFrame(detect);
      };
    };

    runHandpose();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        style={{
          transform: 'scaleX(-1)', // Mirror the video
          WebkitTransform: 'scaleX(-1)',
          width: '100%',
          maxWidth: '640px',
          height: 'auto'
        }}
        autoPlay
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'scaleX(-1)', // Mirror the canvas
          WebkitTransform: 'scaleX(-1)',
          width: '100%',
          maxWidth: '640px',
          height: 'auto'
        }}
      />
    </div>
  );
}
