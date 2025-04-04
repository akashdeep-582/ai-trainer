// src/components/WebcamFeed.jsx
import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import { calculateAngle } from "../utils/utils";

const skeletonConnections = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

export default function WebcamFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [feedbackText, setFeedbackText] = useState("Waiting...");

  useEffect(() => {
    const setup = async () => {
      // Load backend

      await tf.setBackend("webgl");
      await tf.ready();
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );

      // Setup webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          videoRef.current.play();
          detectPose();
        };
      }
    };

    setup();
  }, []);

  const detectPose = async () => {
    if (!detectorRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    const detect = async () => {
      if (
        videoRef.current.readyState === 4 // video loaded
      ) {
        // Get pose
        const poses = await detectorRef.current.estimatePoses(videoRef.current);

        // Draw
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        if (poses && poses[0]) {
          drawKeypoints(poses[0].keypoints, ctx);

          // ✅ Simple example: check LEFT knee angle
          const leftHip = poses[0].keypoints.find((k) => k.name === "left_hip");
          const leftKnee = poses[0].keypoints.find(
            (k) => k.name === "left_knee"
          );
          const leftAnkle = poses[0].keypoints.find(
            (k) => k.name === "left_ankle"
          );

          // === Back Posture Check ===
          const leftShoulder = poses[0].keypoints.find(
            (k) => k.name === "left_shoulder"
          );

          if (
            leftShoulder &&
            leftHip &&
            leftKnee &&
            leftShoulder.score > 0.5 &&
            leftHip.score > 0.5 &&
            leftKnee.score > 0.5
          ) {
            const backAngle = calculateAngle(leftShoulder, leftHip, leftKnee);

            if (backAngle > 160) {
              setFeedbackText("✅ Back is straight");
            } else if (backAngle > 130) {
              setFeedbackText("⚠️ Slightly bend your back");
            } else {
              setFeedbackText("❌ Fix your back posture");
            }
          }

          if (
            leftHip &&
            leftKnee &&
            leftAnkle &&
            leftHip.score > 0.5 &&
            leftKnee.score > 0.5 &&
            leftAnkle.score > 0.5
          ) {
            const angle = calculateAngle(leftHip, leftKnee, leftAnkle);

            // ⚡ Example rule: if knee angle < 90°, consider it a deep squat
            if (angle < 100) {
              setFeedbackText("✅ Good Squat!");
            } else {
              setFeedbackText("⬇️ Go deeper!");
            }
          } else {
            setFeedbackText("Make sure your body is visible.");
          }
        }
      }

      requestAnimationFrame(detect);
    };

    detect();
  };

  const drawKeypoints = (keypoints, ctx) => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw keypoints
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });

    // Draw skeleton
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    skeletonConnections.forEach(([p1Name, p2Name]) => {
      const p1 = keypoints.find((k) => k.name === p1Name);
      const p2 = keypoints.find((k) => k.name === p2Name);

      if (p1 && p2 && p1.score > 0.5 && p2.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
  };

  return (
    <div className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="absolute top-0 left-0 w-full h-full"
      ></canvas>
      <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
        <p className="text-lg">{feedbackText}</p>
      </div>
    </div>
  );
}
