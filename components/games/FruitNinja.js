import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function FruitNinja({ showLeaderboard = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const ballsRef = useRef([]);
  const animationFrameRef = useRef();
  const zapsRef = useRef([]);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [backgroundMusic] = useState(new Audio('/sounds/game-music.mp3'));
  const [sliceSound] = useState(new Audio('/sounds/slice.wav'));

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
          sliceSound.currentTime = 0; // Reset sound to start
          sliceSound.play().catch(e => console.log('Audio play failed:', e));
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
              setFinalScore(score);
              setIsGameOver(true);
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

  useEffect(() => {
    if (!isGameOver) {
      backgroundMusic.loop = true;
      backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
    } else {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
    
    return () => {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    };
  }, [isGameOver, backgroundMusic]);

  return (
    <div className="relative flex items-start p-8 max-w-[1400px] mx-auto gap-10">
      {/* Game viewport container */}
      <div className="relative flex-1 rounded-2xl overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          className="w-full h-auto block scale-x-[-1]"
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full scale-x-[-1]"
        />
      </div>

      {/* Right side container */}
      {showLeaderboard ? (
        <div className="flex flex-col gap-6 min-w-[320px]">
          {/* Stats container */}
          <div className="flex gap-4">
            {/* Score card */}
            <div className="flex-1 p-6 bg-white rounded-2xl shadow-md text-center">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-gray-600">
                Score
              </h2>
              <div className="text-3xl font-semibold text-gray-900 leading-none">
                {score}
              </div>
            </div>

            {/* Lives card */}
            <div className="flex-1 p-6 bg-white rounded-2xl shadow-md text-center">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-gray-600">
                Lives
              </h2>
              <div className={`text-3xl font-semibold leading-none ${
                lives > 1 ? 'text-gray-900' : 'text-red-500'
              }`}>
                {lives}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="flex flex-col bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Global Leaderboard
            </h2>

            {/* Leaderboard List */}
            <div className="flex flex-col gap-3">
              {[
                { rank: 1, address: '0x1234...5678', score: 2547 },
                { rank: 2, address: '0x8765...4321', score: 2123 },
                { rank: 3, address: '0x9876...1234', score: 1987 },
                { rank: 4, address: '0x4567...8901', score: 1654 },
                { rank: 5, address: '0x3456...7890', score: 1432 }
              ].map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center p-4 rounded-xl border border-gray-200 ${
                    entry.rank === 1 ? 'bg-amber-50' : 'bg-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    entry.rank === 1 ? 'bg-yellow-400 text-white' :
                    entry.rank === 2 ? 'bg-gray-300 text-white' :
                    entry.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="text-base font-medium text-gray-900 mb-1">
                      {entry.address}
                    </div>
                    <div className="text-sm text-gray-600">
                      Score: {entry.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 min-w-[280px]">
          {/* Original score and lives cards */}
          <div className="p-8 bg-white rounded-2xl shadow-md text-center">
            <h2 className="mb-4 text-lg font-medium uppercase tracking-wider text-gray-600">
              Score
            </h2>
            <div className="text-5xl font-semibold text-gray-900 leading-none">
              {score}
            </div>
          </div>

          <div className="p-8 bg-white rounded-2xl shadow-md text-center">
            <h2 className="mb-4 text-lg font-medium uppercase tracking-wider text-gray-600">
              Lives
            </h2>
            <div className={`text-5xl font-semibold leading-none ${
              lives > 1 ? 'text-gray-900' : 'text-red-500'
            }`}>
              {lives}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-10 text-center max-w-[400px] w-[90%] shadow-2xl">
            <h2 className="mb-2 text-3xl font-semibold text-gray-900">
              Game Over!
            </h2>
            
            <p className="mb-8 text-lg text-gray-600">
              Final Score: {finalScore}
            </p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => {/* Add submit score logic */}}
                className="bg-blue-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                  cursor-pointer transition-all duration-200 outline-none
                  hover:bg-blue-700 active:scale-[0.98]"
              >
                Submit Score
              </button>
              
              <button 
                onClick={resetGame}
                className="bg-gray-900 text-white rounded-xl px-8 py-4 text-lg font-medium
                  cursor-pointer transition-all duration-200 outline-none
                  hover:bg-gray-700 active:scale-[0.98]"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
