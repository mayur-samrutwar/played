import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function PushupCounter() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [pushupCount, setPushupCount] = useState(0);
  const [isDown, setIsDown] = useState(false);
  const animationFrameRef = useRef();
  const [feedback, setFeedback] = useState('Position yourself facing the camera from the side');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [isReady, setIsReady] = useState(false);
  
  // Add debounce to prevent too frequent feedback updates
  const lastFeedbackRef = useRef('');
  const feedbackTimeoutRef = useRef(null);

  const drawSkeleton = (ctx, pose) => {
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
    ];

    ctx.strokeStyle = 'yellow';
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
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });
  };

  const addFeedback = (message) => {
    // Only update if message is different and 1 second has passed since last update
    if (message !== lastFeedbackRef.current) {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      
      feedbackTimeoutRef.current = setTimeout(() => {
        lastFeedbackRef.current = message;
        setFeedback(message);
        setFeedbackHistory(prev => {
          const newHistory = [...prev, {
            id: Date.now(),
            message,
            timestamp: new Date().toLocaleTimeString()
          }].slice(-3);
          return newHistory;
        });
      }, 1000); // 1 second delay between feedback updates
    }
  };

  const checkPushupForm = (pose) => {
    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
    const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
    const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
    const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');

    // Check if key points are visible
    if (![leftShoulder, leftElbow, leftWrist, leftHip, rightShoulder, rightElbow, rightWrist]
        .every(point => point?.score > 0.3)) {
      addFeedback('Cannot see your full upper body. Please adjust your position.');
      setIsReady(false);
      return;
    }

    // Calculate body alignment
    const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
    const shoulderWidth = canvasRef.current?.width || 1000;
    
    // Check if user is facing sideways (shoulders should be aligned)
    if (shoulderDistance > shoulderWidth * 0.2) {
      addFeedback('⚠️ Turn sideways - face left or right side to the camera');
      setIsReady(false);
      return;
    }

    setIsReady(true);

    // Calculate angles
    const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const backAngle = calculateBackAngle(leftShoulder, leftHip);

    // Improved pushup detection logic
    if (!isDown) {
      // Check for down position
      if (leftAngle <= 90 && rightAngle <= 90 && backAngle <= 30) {
        setIsDown(true);
        addFeedback('✅ Good depth! Now push up');
      } else if (backAngle > 30) {
        addFeedback('⚠️ Keep your back straight');
      } else if (leftAngle > 90 || rightAngle > 90) {
        addFeedback('↓ Lower your body more - get your arms to 90°');
      }
    } else {
      // Check for up position
      if (leftAngle >= 160 && rightAngle >= 160 && backAngle <= 30) {
        setIsDown(false);
        setPushupCount(prev => prev + 1);
        addFeedback('🎉 Perfect pushup! Keep going');
      } else if (backAngle > 30) {
        addFeedback('⚠️ Keep your back straight as you push up');
      } else if (leftAngle < 160 || rightAngle < 160) {
        addFeedback('↑ Push up fully - extend your arms');
      }
    }
  };

  // Improved angle calculation using three points
  const calculateAngle = (point1, point2, point3) => {
    const angle1 = Math.atan2(point2.y - point1.y, point2.x - point1.x);
    const angle2 = Math.atan2(point3.y - point2.y, point3.x - point2.x);
    let angle = Math.abs((angle1 - angle2) * (180 / Math.PI));
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  const calculateBackAngle = (shoulder, hip) => {
    const dx = hip.x - shoulder.x;
    const dy = hip.y - shoulder.y;
    const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
    return angle;
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
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            if (poses[0]) {
              drawSkeleton(ctx, poses[0]);
              checkPushupForm(poses[0]);
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(() => detect(detector));
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
          minWidth: '300px'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Pushup Counter</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{pushupCount}</div>
          <div style={{ 
            marginTop: '10px', 
            padding: '8px',
            backgroundColor: isDown ? '#e8f5e9' : '#fff3e0',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: 'bold' 
          }}>
            {isDown ? '⬇️ DOWN' : '⬆️ UP'}
          </div>
        </div>
        
        <div style={{
          marginLeft: '20px',
          padding: '20px',
          backgroundColor: isReady ? '#e8f5e9' : '#fff3e0',
          borderRadius: '8px',
          minWidth: '300px'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Current Status</h2>
          <div style={{
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center',
            color: isReady ? '#2e7d32' : '#ed6c02'
          }}>
            {isReady ? '✅ Ready to count pushups' : '⚠️ Please adjust position'}
          </div>

          <h3 style={{ margin: '15px 0 10px 0' }}>Instructions</h3>
          <div style={{
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Face <strong>sideways</strong> to the camera</li>
              <li>Keep your <strong>back straight</strong></li>
              <li>Lower until arms are at <strong>90°</strong></li>
              <li>Push up until arms are <strong>fully straight</strong></li>
            </ol>
          </div>

          <h3 style={{ margin: '15px 0 10px 0' }}>Feedback</h3>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {feedbackHistory.map((item, index) => (
              <div key={item.id} style={{
                padding: '12px',
                borderBottom: index !== feedbackHistory.length - 1 ? '1px solid #eee' : 'none',
                opacity: index === feedbackHistory.length - 1 ? 1 : 0.6,
                fontSize: '16px',
                lineHeight: '1.4'
              }}>
                {item.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
