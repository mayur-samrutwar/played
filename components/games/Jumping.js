import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function Jumping() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const obstaclesRef = useRef([]);
  const speedRef = useRef(5);
  const baselineYRef = useRef(0);
  const isJumpingRef = useRef(false);

  const drawSkeleton = (ctx, poses) => {
    if (!poses || poses.length === 0) return;
    
    const pose = poses[0]; // Get the first detected pose
    
    // Draw connections between keypoints
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = pose.keypoints.find(kp => kp.name === start);
      const endPoint = pose.keypoints.find(kp => kp.name === end);

      if (startPoint?.score > 0.3 && endPoint?.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Draw keypoints
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      }
    });
  };

  const createObstacle = () => {
    return {
      x: canvasRef.current.width,
      y: baselineYRef.current - 40, // Place obstacle just above baseline
      width: 30,
      height: 40,
      passed: false
    };
  };

  const drawGame = (ctx, poses) => {
    // Clear canvas and mirror video
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-ctx.canvas.width, 0);
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Draw positioning box
    const boxWidth = 200;
    const boxHeight = 120;
    baselineYRef.current = ctx.canvas.height * 0.9;
    const boxX = ctx.canvas.width - boxWidth - 50;
    const boxY = baselineYRef.current - boxHeight;

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Only show the box instruction, remove other text from camera view
    ctx.fillStyle = 'red';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Stand here', boxX + boxWidth/2, boxY - 10);

    // Draw skeleton in mirrored context
    if (poses && poses.length > 0) {
      drawSkeleton(ctx, poses);
      
      // Add live debug info
      const pose = poses[0];
      const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
      const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle');
      
      if (leftAnkle && rightAnkle) {
        // Draw debug points for ankles
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(leftAnkle.x, leftAnkle.y, 8, 0, 2 * Math.PI);
        ctx.arc(rightAnkle.x, rightAnkle.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Show ankle coordinates and box boundaries for debugging
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`L: (${Math.round(leftAnkle.x)}, ${Math.round(leftAnkle.y)})`, leftAnkle.x, leftAnkle.y - 10);
        ctx.fillText(`R: (${Math.round(rightAnkle.x)}, ${Math.round(rightAnkle.y)})`, rightAnkle.x, rightAnkle.y - 10);
      }
    }

    ctx.restore();

    // Draw score and lives (not mirrored)
    if (gameStarted) {
      ctx.fillStyle = '#333';
      ctx.font = '24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.fillText(`Lives: ${lives}`, 20, 70);
    }
  };

  // Update player position check to use box boundaries
  const checkPlayerPosition = (poses) => {
    if (!poses || poses.length === 0) return false;
    
    const pose = poses[0];
    const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle');

    // Ensure both ankles are detected with good confidence
    if (!leftAnkle?.score || !rightAnkle?.score || 
        leftAnkle.score < 0.3 || rightAnkle.score < 0.3) {
      setIsReady(false);
      return false;
    }

    // Define box boundaries
    const boxWidth = 200;
    const boxHeight = 120;
    const boxX = canvasRef.current.width - boxWidth - 50;
    const boxY = baselineYRef.current - boxHeight;

    // Mirror the ankle coordinates to match the display
    const mirrorX = (x) => canvasRef.current.width - x;
    
    // Check if both ankles are inside the box using mirrored coordinates
    const leftAnkleInBox = 
      mirrorX(leftAnkle.x) >= boxX && 
      mirrorX(leftAnkle.x) <= (boxX + boxWidth) && 
      leftAnkle.y >= boxY && 
      leftAnkle.y <= (boxY + boxHeight);

    const rightAnkleInBox = 
      mirrorX(rightAnkle.x) >= boxX && 
      mirrorX(rightAnkle.x) <= (boxX + boxWidth) && 
      rightAnkle.y >= boxY && 
      rightAnkle.y <= (boxY + boxHeight);

    // Rest of the function remains the same
    if (leftAnkleInBox && rightAnkleInBox && !gameStarted && !gameOver) {
      if (!isReady) {
        setIsReady(true);
        setTimeout(() => {
          if (isReady) {
            setGameStarted(true);
          }
        }, 2000);
      }
    } else {
      setIsReady(false);
    }

    return leftAnkleInBox && rightAnkleInBox;
  };

  useEffect(() => {
    const runPoseDetection = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
          }
        );
        
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
          if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
            const poses = await detector.estimatePoses(videoRef.current);
            const ctx = canvasRef.current.getContext('2d');
            
            drawGame(ctx, poses);
          }
          
          if (!gameOver) {
            animationFrameRef.current = requestAnimationFrame(() => detect(detector));
          }
        };
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    runPoseDetection();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameOver]);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          style={{
            transform: 'scaleX(-1)',
            WebkitTransform: 'scaleX(-1)',
            width: '100%',
            maxWidth: '2000px',
            height: 'auto',
            visibility: 'hidden'
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
            width: '100%',
            maxWidth: '2000px',
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
          minWidth: '300px'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Jump Runner</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{score}</div>
          {!isReady && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#fff3e0',
              borderRadius: '4px'
            }}>
              <strong>Not Ready:</strong> Move both feet inside the red box
            </div>
          )}
          {isReady && !gameStarted && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px'
            }}>
              <strong>Ready!</strong> Hold position for 2 seconds to start...
            </div>
          )}
        </div>

        <div style={{
          marginLeft: '20px',
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px'
        }}>
          <h3>Position Status</h3>
          <div style={{ 
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            {isReady ? '✅ Position correct' : '❌ Adjust position'}
          </div>
          <div style={{ 
            marginTop: '10px',
            fontSize: '14px',
            color: '#666'
          }}>
            Make sure both feet are clearly visible and inside the red box
          </div>
        </div>

        <div style={{
          marginLeft: '20px',
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px'
        }}>
          <h3>How to Play</h3>
          <ol style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Stand back so camera can see your full body</li>
            <li>Place both feet inside the red box</li>
            <li>Hold still for 2 seconds to start</li>
            <li>Jump over obstacles to score points!</li>
            <li>Don&apos;t hit the obstacles - you have 3 lives</li>
          </ol>
        </div>

        {gameOver && (
          <div style={{
            marginLeft: '20px',
            padding: '20px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#2196f3',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
