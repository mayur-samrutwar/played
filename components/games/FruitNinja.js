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
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

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

  const drawBaseLogo = (ctx, x, y, radius) => {
    ctx.save();
    
    // Scale everything relative to the desired radius (original SVG is 146x146)
    const scale = (radius * 2) / 146;
    ctx.translate(x - radius, y - radius);
    ctx.scale(-scale, scale); // Negative x scale to flip horizontally
    ctx.translate(-146, 0);   // Translate back after the flip
    
    // Draw the blue circle
    ctx.beginPath();
    ctx.arc(73, 73, 73, 0, 2 * Math.PI);
    ctx.fillStyle = '#0052FF';
    ctx.fill();
    
    // Draw the white path using the exact SVG path
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.moveTo(73.323, 123.729);
    ctx.bezierCurveTo(101.617, 123.729, 124.553, 100.832, 124.553, 72.5875);
    ctx.bezierCurveTo(124.553, 44.343, 101.617, 21.4463, 73.323, 21.4463);
    ctx.bezierCurveTo(46.4795, 21.4463, 24.4581, 42.0558, 22.271, 68.2887);
    ctx.lineTo(89.9859, 68.2887);
    ctx.lineTo(89.9859, 76.8864);
    ctx.lineTo(22.271, 76.8864);
    ctx.bezierCurveTo(24.4581, 103.119, 46.4795, 123.729, 73.323, 123.729);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
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
        // Draw Base logo using the exact SVG path
        drawBaseLogo(ctx, ball.x, ball.y, ball.radius);

        // Remove ball and reduce lives when it touches bottom
        if (ball.y > canvasRef.current.height + ball.radius) {
          balls.splice(i, 1);
          setLives(prev => {
            const newLives = Math.max(0, prev - 1);
            if (newLives === 0) {
              setIsGameOver(true);
              setFinalScore(score);
              ballsRef.current = [];
            }
            return newLives;
          });
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

  const resetGame = () => {
    setLives(3);
    setScore(0);
    setIsGameOver(false);
    ballsRef.current = [];
    zapsRef.current = [];
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
    <div style={{ 
      position: 'relative', 
      display: 'flex', 
      alignItems: 'flex-start',
      padding: '32px',
      maxWidth: '1400px',
      margin: '0 auto',
      gap: '40px'
    }}>
      {/* Game viewport container */}
      <div style={{ 
        position: 'relative',
        flex: '1',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
      }}>
        <video
          ref={videoRef}
          style={{
            transform: 'scaleX(-1)',
            WebkitTransform: 'scaleX(-1)',
            width: '100%',
            height: 'auto',
            display: 'block'
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
            height: '100%'
          }}
        />
      </div>

      {/* Game stats container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        minWidth: '280px'
      }}>
        {/* Score card */}
        <div style={{
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#666'
          }}>Score</h2>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: '600',
            color: '#111',
            lineHeight: '1'
          }}>{score}</div>
        </div>

        {/* Lives card */}
        <div style={{
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#666'
          }}>Lives</h2>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: '600',
            color: lives > 1 ? '#111' : '#ff4444',
            lineHeight: '1'
          }}>{lives}</div>
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '32px',
              fontWeight: '600',
              color: '#111'
            }}>Game Over!</h2>
            
            <p style={{
              margin: '0 0 32px 0',
              fontSize: '18px',
              color: '#666'
            }}>Final Score: {finalScore}</p>
            
            <button 
              onClick={resetGame}
              style={{
                backgroundColor: '#111',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.1s ease-in-out, background-color 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#333'}
              onMouseLeave={e => e.target.style.backgroundColor = '#111'}
              onMouseDown={e => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.target.style.transform = 'scale(1)'}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
