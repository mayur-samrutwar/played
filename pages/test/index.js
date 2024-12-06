import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function PoseTracking() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const ballsRef = useRef([]);
  const animationFrameRef = useRef();

  const createBall = () => {
    const radius = 10;
    return {
      x: Math.random() * (canvasRef.current?.width - 2 * radius) + radius,
      y: -radius,
      speed: 1,
      radius
    };
  };

  const updateAndDrawBalls = (ctx) => {
    const balls = ballsRef.current;
    
    // Update ball positions and check for bottom touches
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      ball.y += ball.speed;

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

      // Check if ball touched bottom
      if (ball.y > canvasRef.current.height + ball.radius) {
        balls.splice(i, 1);
        setScore(prev => prev + 1);
      }
    }

    // Add new ball randomly
    if (Math.random() < 0.01) {
      balls.push(createBall());
    }
  };

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

            // Update and draw balls
            updateAndDrawBalls(ctx);
          }
          
          animationFrameRef.current = requestAnimationFrame(() => detect(detector));
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawSkeleton = (ctx, poses) => {
    poses.forEach(pose => {
      const keypoints = pose.keypoints;
      
      // Draw points and labels
      keypoints.forEach(keypoint => {
        if (keypoint.score > 0.3) {
          // Draw point
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();

          // Draw label
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.font = '16px Arial';
          
          // Format the label text (convert snake_case to Title Case)
          const label = keypoint.name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Draw text with black outline for better visibility
          ctx.strokeText(label, keypoint.x + 10, keypoint.y + 5);
          ctx.fillText(label, keypoint.x + 10, keypoint.y + 5);
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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          style={{
            transform: 'scaleX(-1)',
            WebkitTransform: 'scaleX(-1)',
            width: '100%',
            maxWidth: '1000px',
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
            maxWidth: '1000px',
            height: 'auto'
          }}
        />
      </div>
      <div style={{
        marginLeft: '20px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        minWidth: '200px'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Score</h2>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{score}</div>
      </div>
    </div>
  );
}
