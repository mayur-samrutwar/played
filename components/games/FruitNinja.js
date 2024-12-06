import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function FruitNinja() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const ballsRef = useRef([]);
  const animationFrameRef = useRef();
  const zapsRef = useRef([]);
  const [lives, setLives] = useState(3);

  const createBall = () => {
    const radius = 20;
    return {
      x: Math.random() * (canvasRef.current?.width - 2 * radius) + radius,
      y: -radius,
      speed: 2,
      radius
    };
  };

  const createZap = (x, y, angle) => {
    return {
      x,
      y,
      angle,
      radius: 5,
      sliceLength: 40,
      opacity: 1,
      particles: Array.from({ length: 8 }, () => ({
        x: x,
        y: y,
        speed: Math.random() * 3 + 2,
        angle: angle + (Math.random() - 0.5) * 0.8, // Spread particles in a cone
        size: Math.random() * 4 + 2
      }))
    };
  };

  const updateAndDrawBalls = (ctx, poses) => {
    const balls = ballsRef.current;
    const zaps = zapsRef.current;
    
    // Add new balls randomly
    if (Math.random() < 0.01) { // 1% chance each frame
      balls.push(createBall());
    }
    
    // Get wrist positions if available
    let wrists = [];
    if (poses && poses[0]) {
      const leftWrist = poses[0].keypoints.find(kp => kp.name === 'left_wrist');
      const rightWrist = poses[0].keypoints.find(kp => kp.name === 'right_wrist');
      
      if (leftWrist?.score > 0.3) {
        wrists.push(leftWrist);
        // Draw impact area for left wrist
        ctx.beginPath();
        ctx.arc(leftWrist.x, leftWrist.y, 30, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (rightWrist?.score > 0.3) {
        wrists.push(rightWrist);
        // Draw impact area for right wrist
        ctx.beginPath();
        ctx.arc(rightWrist.x, rightWrist.y, 30, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Update and draw balls
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      ball.y += ball.speed;

      // Check collision with wrists
      let collision = false;
      wrists.forEach(wrist => {
        const dx = ball.x - wrist.x;
        const dy = ball.y - wrist.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ball.radius + 30) { // 30px collision radius
          collision = true;
          const angle = Math.atan2(dy, dx);
          zaps.push(createZap(ball.x, ball.y, angle));
          balls.splice(i, 1);
          setScore(prev => prev + 1);
          return;
        }
      });

      if (!collision) {
        // Draw ball if no collision
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();

        // Remove ball and reduce lives when it touches bottom
        if (ball.y > canvasRef.current.height + ball.radius) {
          balls.splice(i, 1);
          setLives(prev => Math.max(0, prev - 1));
        }
      }
    }

    // Draw zap effects
    drawZaps(ctx, zaps);
  };

  const drawZaps = (ctx, zaps) => {
    for (let i = zaps.length - 1; i >= 0; i--) {
      const zap = zaps[i];
      
      // Draw main slice effect
      ctx.beginPath();
      const startX = zap.x - Math.cos(zap.angle) * zap.sliceLength;
      const startY = zap.y - Math.sin(zap.angle) * zap.sliceLength;
      const endX = zap.x + Math.cos(zap.angle) * zap.sliceLength;
      const endY = zap.y + Math.sin(zap.angle) * zap.sliceLength;
      
      // Create gradient for slice
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `rgba(255, 255, 0, 0)`);
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${zap.opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 0, 0)`);
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw particles
      zap.particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 0, ${zap.opacity})`;
        ctx.fill();

        // Update particle position
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;
        particle.size *= 0.95;
      });

      // Update animation
      zap.sliceLength += 8;
      zap.opacity -= 0.06;

      if (zap.opacity <= 0) {
        zaps.splice(i, 1);
      }
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

            // Update and draw balls
            updateAndDrawBalls(ctx, poses);

            // Draw zap effects
            drawZaps(ctx, zapsRef.current);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div style={{
          marginLeft: '20px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          minWidth: '200px'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Lives</h2>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{lives}</div>
        </div>
      </div>
    </div>
  );
}
