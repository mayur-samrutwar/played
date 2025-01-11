import { useEffect, useRef, useState, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import gamesABI from '../../contract/abi/games.json';
import Image from 'next/image';
import { parseEther } from 'viem';

const GAMES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAMES_CONTRACT_ADDRESS_BASE;
const FRUIT_NINJA_GAME_ID = 0;
const STAKE_AMOUNT = 0.00025; // Match contract's STAKE_AMOUNT

export default function FruitNinja({ 
  showLeaderboard = false,
  isBattleMode = false,
  onSubmitScore = null,
  onClose = null
}) {
  const { writeContract, data: hash } = useWriteContract();
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: txError,
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
  const [gameMode, setGameMode] = useState(null); // 'free' or 'earn'
  const [showEarnDialog, setShowEarnDialog] = useState(false);
  const earnAnimationsRef = useRef([]);
  const [txHash, setTxHash] = useState(null);
  const [isStaking, setIsStaking] = useState(false);
  const [stakeError, setStakeError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: leaderboardData } = useReadContract({
    address: GAMES_CONTRACT_ADDRESS,
    abi: gamesABI,
    functionName: 'getGameLeaderboard',
    args: [FRUIT_NINJA_GAME_ID],
    watch: true,
  });

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

  const createEarnAnimation = (x, y) => {
    return {
      x,
      y,
      opacity: 1,
      offsetY: 0
    };
  };

  const drawBaseLogo = (ctx, x, y, radius) => {
    ctx.save();
    
    // Scale everything relative to the desired radius (original SVG is 32x32)
    const scale = (radius * 2) / 32;
    ctx.translate(x - radius, y - radius);
    ctx.scale(-scale, scale); // Negative x scale to flip horizontally
    ctx.translate(-32, 0);    // Translate back after the flip
    
    // Draw the purple path using the exact SVG path
    ctx.beginPath();
    ctx.fillStyle = '#836EF9';
    ctx.moveTo(16, 0);
    ctx.bezierCurveTo(11.3795, 0, 0, 11.3792, 0, 15.9999);
    ctx.bezierCurveTo(0, 20.6206, 11.3795, 32, 15.9999, 32);
    ctx.bezierCurveTo(20.6203, 32, 32, 20.6204, 32, 15.9999);
    ctx.bezierCurveTo(32, 11.3794, 20.6205, 0, 15.9999, 0);
    ctx.closePath();
    
    ctx.moveTo(13.5066, 25.1492);
    ctx.bezierCurveTo(11.5582, 24.6183, 6.31981, 15.455, 6.85083, 13.5066);
    ctx.bezierCurveTo(7.38185, 11.5581, 16.545, 6.31979, 18.4933, 6.8508);
    ctx.bezierCurveTo(20.4418, 7.38173, 25.6802, 16.5449, 25.1492, 18.4934);
    ctx.bezierCurveTo(24.6182, 20.4418, 15.455, 25.6802, 13.5066, 25.1492);
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
          
          if (gameMode === 'earn') {
            earnAnimationsRef.current.push(createEarnAnimation(ball.x, ball.y));
          }
          
          balls.splice(i, 1);
          setScore(prev => prev + 1);
          sliceSound.currentTime = 0;
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

    drawEarnAnimations(ctx);
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

  const drawEarnAnimations = (ctx) => {
    const animations = earnAnimationsRef.current;
    
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      
      // Draw the text with a flip
      ctx.save();
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = `rgba(0, 82, 255, ${anim.opacity})`; // Changed to Base blue (#0052FF)
      ctx.textAlign = 'center';
      ctx.translate(anim.x, anim.y - anim.offsetY);
      ctx.scale(-1, 1); // This flips the text horizontally
      ctx.fillText('+0.0000025 ETH', 0, 0);
      ctx.restore();

      // Update animation
      anim.opacity -= 0.02;
      anim.offsetY += 1;

      // Remove animation when fully faded
      if (anim.opacity <= 0) {
        animations.splice(i, 1);
      }
    }
  };

  const resetGame = async () => {
    setIsLoading(true); // Start loading

    // Stop current camera stream if it exists
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Reset all state variables
    setLives(3);
    setScore(0);
    setIsGameOver(false);
    setFinalScore(0);
    ballsRef.current = [];
    zapsRef.current = [];
    earnAnimationsRef.current = [];
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Re-initialize game state
    if (gameMode === 'free') {
      setIsGameStarted(true);
    } else {
      setShowEarnDialog(true);
    }
  };

  const closeGame = () => {
    setIsGameStarted(false);
    setIsGameOver(false);
    setScore(0);
    setLives(3);
    setFinalScore(0);
    ballsRef.current = [];
    zapsRef.current = [];
    earnAnimationsRef.current = [];
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (onClose) {
      onClose();
    }
  };

  const handleStakeAndPlay = async () => {
    setStakeError(null);
    setIsStaking(true);
    
    try {
      if (!GAMES_CONTRACT_ADDRESS) {
        throw new Error('Contract address is not defined');
      }

      const tx = await writeContract({
        address: GAMES_CONTRACT_ADDRESS,
        abi: gamesABI,
        functionName: 'playGame',
        args: [FRUIT_NINJA_GAME_ID],
        value: parseEther(STAKE_AMOUNT.toString()),
      });

      console.log('Stake transaction submitted:', tx);
      
      // Don't close dialog or start game yet - wait for confirmation
    } catch (error) {
      console.error('Error staking:', error);
      setStakeError(error.message || 'Failed to stake. Please try again.');
      setIsStaking(false);
    }
  };

  const handleSubmitScore = async (score) => {
    if (!score) return;
    
    setSubmitError(null);
    setTxHash(null);
    
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
        setTxHash(hash);
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
      // Transaction confirmed successfully
      setIsStaking(false);
      setShowEarnDialog(false);
      setGameMode('earn');
      setIsGameStarted(true);
    } else if (txError) {
      // Transaction failed
      console.error('Transaction failed:', txError);
      setStakeError(txError.message || 'Transaction failed. Please try again.');
      setIsStaking(false);
    }
  }, [isConfirmed, txError]);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;

    const runPoseDetection = async () => {
      setIsLoading(true); // Start loading when initialization begins
      
      try {
        // Initialize TensorFlow.js
        await tf.ready();
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
                setIsLoading(false); // Stop loading once everything is ready
              }
            };
          }
        }

        const detect = async (detector) => {
          if (
            videoRef.current && 
            canvasRef.current && 
            videoRef.current.readyState === 4 &&
            !isGameOver // Add check for game over state
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
          
          if (!isGameOver) { // Only request next frame if game is not over
            animationFrameRef.current = requestAnimationFrame(() => detect(detector));
          }
        };
      } catch (error) {
        console.error("Error initializing:", error);
        setIsLoading(false); // Make sure to stop loading if there's an error
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
  }, [isGameStarted, isGameOver]);

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

  const LeaderboardComponent = () => {
    // Process and sort leaderboard data
    const sortedLeaderboard = useMemo(() => {
      if (!leaderboardData) return [];
      
      return [...leaderboardData]
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 5) // Get top 5 scores
        .map((entry, index) => ({
          rank: index + 1,
          address: entry.player,
          score: Number(entry.score),
          timestamp: Number(entry.timestamp)
        }));
    }, [leaderboardData]);

    const formatAddress = (address) => {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
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
          {sortedLeaderboard.length > 0 ? (
            sortedLeaderboard.map((entry) => (
              <div
                key={`${entry.address}-${entry.timestamp}`}
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
                    {formatAddress(entry.address)}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No scores recorded yet
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add this new component for the earn dialog
  const EarnDialog = () => (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-10 max-w-[500px] w-[90%] shadow-2xl relative">
        <button 
          onClick={() => setShowEarnDialog(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isStaking}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-[var(--primary)] text-white rounded-full text-sm">Reward Challenge</span>
          <Image 
            src="/monadlogo.svg"
            alt="Challenge Icon"
            width={40}
            height={40}
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Base Ninja Master</h2>
        <p className="text-gray-600 mb-6">
          Earn {STAKE_AMOUNT * 0.01} ETH for every Base token you slice in the Base Ninja game!
        </p>

        {stakeError && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {stakeError}
          </div>
        )}

        <button 
          onClick={handleStakeAndPlay}
          disabled={isStaking || isConfirming}
          className={`
            w-full bg-[var(--primary)] text-white rounded-xl px-8 py-4 text-lg font-medium
            cursor-pointer transition-all duration-200 outline-none
            hover:bg-[var(--primary-dark)] active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          `}
        >
          {(isStaking || isConfirming) ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isConfirming ? 'Confirming Transaction...' : 'Staking ETH...'}
            </>
          ) : (
            `Stake ${STAKE_AMOUNT} ETH and Play`
          )}
        </button>
      </div>
    </div>
  );

  // Add LoadingScreen component
  const LoadingScreen = () => (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-40">
      <div className="w-16 h-16 border-4 border-gray-400 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
      <p className="text-white text-lg font-medium">Loading Game...</p>
      <p className="text-gray-400 text-sm mt-2">Please wait while we setup your camera</p>
    </div>
  );

  // Modify the start screen JSX
  if (!isGameStarted) {
    return (
      <div className="relative flex items-start p-8 max-w-[1400px] mx-auto gap-10">
        <div className="w-full flex gap-10">
          <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] gap-4">
            <button
              onClick={() => {
                setGameMode('free');
                setIsGameStarted(true);
              }}
              disabled={isLoading}
              className="bg-gray-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                cursor-pointer transition-all duration-200 outline-none
                hover:bg-gray-700 active:scale-[0.98] w-48
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Play for Free'}
            </button>
            <button
              onClick={() => setShowEarnDialog(true)}
              className="bg-[var(--primary)] text-white rounded-xl px-8 py-4 text-lg font-medium
                cursor-pointer transition-all duration-200 outline-none
                hover:bg-[var(--primary-dark)] active:scale-[0.98] w-48"
            >
              Play to Earn
            </button>
          </div>

          {showLeaderboard && !isBattleMode && (
            <div className="min-w-[320px]">
              <LeaderboardComponent />
            </div>
          )}
        </div>

        {showEarnDialog && <EarnDialog />}
      </div>
    );
  }

  // Modify the game over modal to only show submit button in earn mode
  const GameOverModal = () => (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-10 text-center max-w-[400px] w-[90%] shadow-2xl relative">
        {!isBattleMode && (
          <button 
            onClick={closeGame}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            disabled={isConfirming}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <h2 className="mb-2 text-3xl font-semibold text-gray-900">
          Game Over!
        </h2>
        
        <p className="mb-2 text-lg text-gray-600">
          Final Score: {finalScore.toLocaleString()}
        </p>

        {gameMode === 'earn' && (
          <p className="mb-8 text-lg text-[var(--primary)] font-medium">
            Total Earned: {(finalScore * 0.0000025).toFixed(7)} ETH
          </p>
        )}
        
        {submitError && (
          <p className="mb-4 text-sm text-red-600">
            {submitError}
          </p>
        )}
        
        {gameMode === 'earn' ? (
          <div className="flex flex-col gap-4">
            {txHash ? (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-2">Score submitted successfully!</p>
                <a 
                  href={`https://base-sepolia.blockscout.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  View Transaction
                </a>
                <div className="flex flex-col gap-4 mt-4">
                  <button
                    onClick={() => {
                      resetGame();
                    }}
                    className="w-full bg-[var(--primary)] text-white rounded-xl px-8 py-4 text-lg font-medium
                      cursor-pointer transition-all duration-200 outline-none
                      hover:bg-[var(--primary-dark)] active:scale-[0.98]"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={closeGame}
                    className="w-full bg-gray-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                      cursor-pointer transition-all duration-200 outline-none
                      hover:bg-gray-700 active:scale-[0.98]"
                  >
                    Close Game
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => handleSubmitScore(finalScore)}
                disabled={isConfirming}
                className={`
                  w-full bg-[var(--primary)] text-white rounded-xl px-8 py-4 text-lg font-medium
                  cursor-pointer transition-all duration-200 outline-none
                  hover:bg-[var(--primary-dark)] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center
                `}
              >
                {isConfirming ? (
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
            )}
          </div>
        ) : (
          // Free play mode buttons
          <div className="flex flex-col gap-4 mt-8">
            <button
              onClick={() => {
                resetGame();
              }}
              className="w-full bg-[var(--primary)] text-white rounded-xl px-8 py-4 text-lg font-medium
                cursor-pointer transition-all duration-200 outline-none
                hover:bg-[var(--primary-dark)] active:scale-[0.98]"
            >
              Play Again
            </button>
            <button
              onClick={closeGame}
              className="w-full bg-gray-600 text-white rounded-xl px-8 py-4 text-lg font-medium
                cursor-pointer transition-all duration-200 outline-none
                hover:bg-gray-700 active:scale-[0.98]"
            >
              Close Game
            </button>
          </div>
        )}
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
            {isLoading && <LoadingScreen />}
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
                  {gameMode === 'earn' && (
                    <div className="text-sm font-medium text-[var(--primary)] mt-1">
                      {(score * 0.0000025).toFixed(7)} ETH
                    </div>
                  )}
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
              {gameMode === 'earn' && (
                <div className="text-sm font-medium text-[var(--primary)]">
                  {(score * 0.0000025).toFixed(7)} ETH
                </div>
              )}
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
        <GameOverModal />
      )}
    </div>
  );
}
