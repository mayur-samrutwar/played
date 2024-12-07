import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import gamesABI from '../../contract/abi/games.json';

const GAMES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAMES_CONTRACT_ADDRESS_BASE;
const FRUIT_NINJA_GAME_ID = 0;

export default function FruitNinja({ 
  showLeaderboard = false,
  isBattleMode = false,
  onSubmitScore = null,
  onClose = null
}) {
  const { writeContract, data: hash } = useWriteContract();
  const { 
    isLoading: isSubmitting,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });
  
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
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const createBall = () => {
    const radius = 20;
    return {
      x: Math.random() * (canvasRef.current?.width - 2 * radius) + radius,
      y: -radius,
      speed: 4,
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
    if (isGameOver) return;
    
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

  const resetGame = () => {
    setLives(3);
    setScore(0);
    setIsGameOver(false);
    setFinalScore(0);
    ballsRef.current = [];
    zapsRef.current = [];
  };

  const closeGame = () => {
    setIsGameStarted(false);
    setIsGameOver(false);
    setScore(0);
    setLives(3);
    setFinalScore(0);
    ballsRef.current = [];
    zapsRef.current = [];
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSubmitScore = async (score) => {
    if (!score) return;
    
    setSubmitError(null);
    
    try {
      if (isBattleMode && onSubmitScore) {
        await onSubmitScore(score);
      } else if (GAMES_CONTRACT_ADDRESS) {
        const hash = await writeContract({
          address: GAMES_CONTRACT_ADDRESS,
          abi: gamesABI,
          functionName: 'submitScore',
          args: [FRUIT_NINJA_GAME_ID, score],
        });
        console.log('Transaction Hash:', hash);
      } else {
        throw new Error('Contract address is not defined');
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      setSubmitError(error.message || 'Failed to submit score. Please try again.');
    }
  };

  // Add effect to handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      console.log('Transaction confirmed with hash:', hash);
      closeGame();
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (!isGameStarted) return;

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
  }, [isGameStarted]);

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

  useEffect(() => {
    if (lives === 0) {
      // Stop the camera and clean up immediately
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setFinalScore(score);
      setIsGameOver(true);
      ballsRef.current = [];
      zapsRef.current = [];
      
      // Stop background music
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }, [lives, score, backgroundMusic]);

  const LeaderboardComponent = () => (
    <div className="flex flex-col bg-white rounded-3xl p-8 shadow-lg h-full">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Global Leaderboard
      </h2>

      {/* Header */}
      <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200">
        <div className="w-12">#</div>
        <div className="flex-1">Player</div>
        <div className="w-24 text-right">Score</div>
      </div>

      {/* Leaderboard entries */}
      <div className="flex flex-col">
        {[
          { rank: 1, address: '0x1234...5678', score: 2547 },
          { rank: 2, address: '0x8765...4321', score: 2123 },
          { rank: 3, address: '0x9876...1234', score: 1987 },
          { rank: 4, address: '0x4567...8901', score: 1654 },
          { rank: 5, address: '0x3456...7890', score: 1432 }
        ].map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              entry.rank === 1 ? 'bg-amber-50 hover:bg-amber-100' : ''
            }`}
          >
            <div className="w-12">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                entry.rank === 1 ? 'bg-yellow-400 text-white' :
                entry.rank === 2 ? 'bg-gray-300 text-white' :
                entry.rank === 3 ? 'bg-amber-700 text-white' :
                'bg-gray-100 text-gray-600'
              }`}>
                {entry.rank}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-base font-medium text-gray-900">
                {entry.address}
              </div>
            </div>
            <div className="w-24 text-right">
              <div className="text-lg font-semibold text-gray-900">
                {entry.score.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative flex items-start p-8 max-w-[1400px] mx-auto gap-10">
      {!isGameStarted ? (
        // Start Game Screen
        <div className="w-full flex gap-10">
          <div className="flex-1 flex items-center justify-center min-h-[600px]">
            <button
              onClick={() => setIsGameStarted(true)}
              className="bg-blue-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                cursor-pointer transition-all duration-200 outline-none
                hover:bg-blue-700 active:scale-[0.98]"
            >
              Start Now
            </button>
          </div>

          {/* Show leaderboard only in non-battle mode */}
          {showLeaderboard && !isBattleMode && (
            <div className="min-w-[320px]">
              <LeaderboardComponent />
            </div>
          )}
        </div>
      ) : (
        // Game Screen
        <>
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

          {/* Show stats and leaderboard only in non-battle mode */}
          {showLeaderboard && !isBattleMode && (
            <div className="min-w-[320px] flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square p-4 bg-white rounded-xl shadow-md flex flex-col items-center justify-center">
                  <h2 className="text-sm font-medium uppercase tracking-wider text-gray-600 mb-1">
                    Score
                  </h2>
                  <div className="text-3xl font-semibold text-gray-900">
                    {score.toLocaleString()}
                  </div>
                </div>

                <div className="aspect-square p-4 bg-white rounded-xl shadow-md flex flex-col items-center justify-center">
                  <h2 className="text-sm font-medium uppercase tracking-wider text-gray-600 mb-1">
                    Lives
                  </h2>
                  <div className={`text-3xl font-semibold ${
                    lives > 1 ? 'text-gray-900' : 'text-red-500'
                  }`}>
                    {lives}
                  </div>
                </div>
              </div>

              <LeaderboardComponent />
            </div>
          )}

          {/* Battle mode score display */}
          {isBattleMode && (
            <div className="absolute top-4 right-4 bg-white/90 rounded-xl p-4 shadow-lg">
              <div className="text-sm font-medium text-gray-600">Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {score.toLocaleString()}
              </div>
              <div className="mt-2 text-sm font-medium text-gray-600">Lives</div>
              <div className={`text-2xl font-bold ${
                lives > 1 ? 'text-gray-900' : 'text-red-500'
              }`}>
                {lives}
              </div>
            </div>
          )}
        </>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-10 text-center max-w-[400px] w-[90%] shadow-2xl relative">
            {/* Close button - only show in non-battle mode */}
            {!isBattleMode && (
              <button 
                onClick={closeGame}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <h2 className="mb-2 text-3xl font-semibold text-gray-900">
              Game Over!
            </h2>
            
            <p className="mb-8 text-lg text-gray-600">
              Final Score: {finalScore.toLocaleString()}
            </p>
            
            {submitError && (
              <p className="mb-4 text-sm text-red-600">
                {submitError}
              </p>
            )}
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={async () => {
                  try {
                    await handleSubmitScore(finalScore);
                  } catch (error) {
                    // Error is handled in handleSubmitScore
                  }
                }}
                disabled={isSubmitting}
                className={`
                  bg-blue-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                  cursor-pointer transition-all duration-200 outline-none
                  hover:bg-blue-700 active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center
                `}
              >
                {isSubmitting ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting Score...
                  </>
                ) : (
                  'Submit Score'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
