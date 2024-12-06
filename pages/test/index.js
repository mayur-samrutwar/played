import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function PoseTracking() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const runPoseDetection = async () => {
      try {
        // Initialize TensorFlow.js
        await tf.ready();
        
        // Set backend to 'webgl'
        await tf.setBackend('webgl');
        
        // Load the movenet model
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
          }
        );
        
        // Setup webcam
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
              if (canvasRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                detect(detector);
              }
            };
          }
        }

        const detect = async (detector) => {
          if (
            videoRef.current && 
            canvasRef.current && 
            videoRef.current.readyState === 4
          ) {
            // Get poses
            const poses = await detector.estimatePoses(videoRef.current);
            
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

            // Draw skeleton
            drawSkeleton(ctx, poses);
          }
          
          requestAnimationFrame(() => detect(detector));
        };
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    runPoseDetection();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const drawSkeleton = (ctx, poses) => {
    poses.forEach(pose => {
      const keypoints = pose.keypoints;
      
      // Draw points
      keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();
        }
      });

      // Define connections for skeleton
      const connections = [
        ['nose', 'left_eye'], ['left_eye', 'left_ear'],
        ['nose', 'right_eye'], ['right_eye', 'right_ear'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
      ];

      // Draw lines
      connections.forEach(([start, end]) => {
        const startPoint = keypoints.find(kp => kp.name === start);
        const endPoint = keypoints.find(kp => kp.name === end);

        if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#00ff00';
          ctx.stroke();
        }
      });
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        style={{
          transform: 'scaleX(-1)',
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
          transform: 'scaleX(-1)',
          WebkitTransform: 'scaleX(-1)',
          width: '100%',
          maxWidth: '640px',
          height: 'auto'
        }}
      />
    </div>
  );
}
