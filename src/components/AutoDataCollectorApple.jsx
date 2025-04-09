// AutoDataCollector with Mediapipe BlazePose (x, y, z, score) + New Exercises latets

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { downloadJSON } from "../utils/savePoseData";
import {
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Grid
} from "@mui/material";

export default function AutoDataCollector() {
  const videoRef = useRef(null);
  const skeletonCanvasRef = useRef(null);
  const detectorRef = useRef(null);
  const smoothedKeypointsRef = useRef([]);
  const [data, setData] = useState([]);
  const [label, setLabel] = useState("good");
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const exerciseRef = useRef("left_bicep");
  const labelRef = useRef("good");
  const [exercise, setExercise] = useState("left_bicep");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("⏳ Loading...");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [poseQuality, setPoseQuality] = useState(0);
  const smoothPoseQuality = useRef(0);
  const [step, setStep] = useState(0);

  const steps = ["Select Label", "Record Poses", "Download Dataset"];

  useEffect(() => {
    const init = async () => {
      await tf.setBackend("webgl");
      await tf.ready();
      detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
        runtime: "tfjs",
        modelType: "full",
      });
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setTimeout(() => setReady(true), 800); // soft stepper delay
          detectLoop();
        };
      }
    };
    init();
  }, []);

  const updateExercise = (value) => { setExercise(value); exerciseRef.current = value; };
  const updateLabel = (value) => { setLabel(value); labelRef.current = value; };
  const startRecording = () => { recordingRef.current = true; setRecording(true); setStep(1); setSnackbar({ open: true, message: "Recording Started", severity: "success" }); };
  const stopRecording = () => { recordingRef.current = false; setRecording(false); setStep(2); setSnackbar({ open: true, message: "Recording Stopped", severity: "warning" }); };
  const resetSession = () => { setStep(0); setData([]); setSnackbar({ open: true, message: "Session Reset", severity: "info" }); };

  const smoothKeypoints = (newKeypoints, alpha = 0.2) => {
    if (smoothedKeypointsRef.current.length === 0) {
      smoothedKeypointsRef.current = newKeypoints.map(kp => ({ ...kp }));
      return newKeypoints;
    }
    smoothedKeypointsRef.current = newKeypoints.map((kp, i) => ({
      x: alpha * kp.x + (1 - alpha) * smoothedKeypointsRef.current[i].x,
      y: alpha * kp.y + (1 - alpha) * smoothedKeypointsRef.current[i].y,
      z: alpha * kp.z + (1 - alpha) * smoothedKeypointsRef.current[i].z,
      score: alpha * kp.score + (1 - alpha) * smoothedKeypointsRef.current[i].score,
    }));
    return smoothedKeypointsRef.current;
  };

  const drawSkeleton = (ctx, keypoints) => {
    const pairs = [
      [0,1],[1,2],[2,3],[3,7], [0,4],[4,5],[5,6],[6,8],
      [9,10],[11,12],[11,13],[13,15],[12,14],[14,16]
    ];

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Smooth background
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Smooth lines
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    pairs.forEach(([i, j]) => {
      if (keypoints[i] && keypoints[j] && keypoints[i].score > 0.5 && keypoints[j].score > 0.5) {
        ctx.beginPath();
        ctx.moveTo((keypoints[i].x + 1) / 2 * ctx.canvas.width, (keypoints[i].y + 1) / 2 * ctx.canvas.height);
        ctx.lineTo((keypoints[j].x + 1) / 2 * ctx.canvas.width, (keypoints[j].y + 1) / 2 * ctx.canvas.height);
        ctx.stroke();
      }
    });

    // Glow points
    keypoints.forEach((kp) => {
      if (kp.score > 0.5) {
        const x = (kp.x + 1) / 2 * ctx.canvas.width;
        const y = (kp.y + 1) / 2 * ctx.canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();
      }
    });

    ctx.restore();
  };

  const detectLoop = async () => {
    if (!detectorRef.current || !videoRef.current) return;
    const skeletonCtx = skeletonCanvasRef.current.getContext("2d");

    const detect = async () => {
      if (videoRef.current.readyState >= 4) {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        if (poses[0]) {
          const keypoints = smoothKeypoints(poses[0].keypoints3D || []);
          drawSkeleton(skeletonCtx, keypoints);

          const goodPoints = keypoints.filter((kp) => kp.score > 0.5);

          const newPoseQuality = (goodPoints.length / 33) * 100
          
         // Smooth the value using linear interpolation
          smoothPoseQuality.current = smoothPoseQuality.current + 0.1 * (newPoseQuality - smoothPoseQuality.current);

         // Only update poseQuality state if it has changed significantly
          if (Math.abs(smoothPoseQuality.current - poseQuality) > 0.1) {
            setPoseQuality(smoothPoseQuality.current);
          }

          if (goodPoints.length >= 25) {
            setStatus("✅ Most keypoints detected, ready to capture");
          } else {
            setStatus("⚠️ Step back / adjust position");
          }

          if (recordingRef.current && goodPoints.length >= 25) {
            const flatKeypoints = keypoints.flatMap((kp) => [kp.x, kp.y, kp.z, kp.score]);
            const fullLabel = `${exerciseRef.current}_${labelRef.current}`;
            setData((prev) => [...prev, { label: fullLabel, keypoints: flatKeypoints }]);
            console.log(`Captured ${fullLabel} pose #${data.length + 1}`);
          }
        } else {
          setStatus("⚠️ No pose detected");
          setPoseQuality(0);
        }
      }
      requestAnimationFrame(detect);
    };
    detect();
  };

  return (
    <Stack spacing={3} alignItems="center" sx={{ p: 3 }}>
      <Stepper activeStep={step} sx={{ width: "100%", maxWidth: 500 }}>
        {steps.map((label, i) => (<Step key={i}><StepLabel>{label}</StepLabel></Step>))}
      </Stepper>

      <Grid container spacing={2} justifyContent="center">
        <Grid item><Paper elevation={3}><video ref={videoRef} autoPlay playsInline muted width={480} height={360} /></Paper></Grid>
        <Grid item><Paper elevation={3}><canvas ref={skeletonCanvasRef} width={480} height={360} /></Paper></Grid>
      </Grid>

      <Chip label={status} color={status.includes("✅") ? "success" : "warning"} />
      <Stack sx={{ width: "100%", maxWidth: 500 }}>
        <Typography variant="caption">Pose Quality</Typography>
        <LinearProgress variant="determinate" value={smoothPoseQuality.current} sx={{ borderRadius: 1, transition: "all 0.5s ease" }} />
      </Stack>

      <Stack direction="row" spacing={2}>
        {["left_bicep", "right_bicep", "left_shoulder", "right_shoulder", "rest"].map((ex) => (
          <Button key={ex} variant={exercise === ex ? "contained" : "outlined"} color="primary" onClick={() => updateExercise(ex)}>{ex.replace("_", " ")}</Button>
        ))}
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button variant={label === "good" ? "contained" : "outlined"} color="success" onClick={() => updateLabel("good")}>Good</Button>
        <Button variant={label === "bad" ? "contained" : "outlined"} color="error" onClick={() => updateLabel("bad")}>Bad</Button>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={startRecording} disabled={!ready || recording}>{ready ? "Start Recording" : <CircularProgress size={20} />}</Button>
        <Button variant="contained" color="error" onClick={stopRecording} disabled={!recording}>Stop Recording</Button>
      </Stack>

      <Typography variant="body1" fontWeight="500">Captured Samples: {data.length}</Typography>

      {step === 2 && (<Button variant="outlined" color="secondary" onClick={resetSession}>Reset Session & Start New</Button>)}

      <Button variant="contained" color="secondary" onClick={() => { downloadJSON(data); setSnackbar({ open: true, message: "Dataset Downloaded", severity: "info" }); }}>Download Dataset</Button>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
