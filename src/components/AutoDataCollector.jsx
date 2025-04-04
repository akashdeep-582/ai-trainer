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
} from "@mui/material";

export default function AutoDataCollector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [data, setData] = useState([]);
  const [label, setLabel] = useState("good");
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const exerciseRef = useRef("squat");
  const labelRef = useRef("good");
  const [exercise, setExercise] = useState("squat");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("⏳ Loading...");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [poseQuality, setPoseQuality] = useState(0);
  const [step, setStep] = useState(0);

  const steps = ["Select Label", "Record Poses", "Download Dataset"];

  useEffect(() => {
    const init = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setReady(true);
          detectLoop();
        };
      }
    };

    init();
  }, []);

  const updateExercise = (value) => {
    setExercise(value);
    exerciseRef.current = value;
  };

  const updateLabel = (value) => {
    setLabel(value);
    labelRef.current = value;
  };

  const startRecording = () => {
    recordingRef.current = true;
    setRecording(true);
    setStep(1);
    setSnackbar({
      open: true,
      message: "Recording Started",
      severity: "success",
    });
  };

  const stopRecording = () => {
    recordingRef.current = false;
    setRecording(false);
    setStep(2);
    setSnackbar({
      open: true,
      message: "Recording Stopped",
      severity: "warning",
    });
  };

  const resetSession = () => {
    setStep(0);
    setData([]);
    setSnackbar({ open: true, message: "Session Reset", severity: "info" });
  };

  const detectLoop = async () => {
    if (!detectorRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    const detect = async () => {
      if (videoRef.current.readyState >= 4) {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        if (poses[0]) {
          const keypoints = poses[0].keypoints;

          // Draw keypoints
          keypoints.forEach((kp) => {
            if (kp.score > 0.5) {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
              ctx.fillStyle = "red";
              ctx.fill();
            }
          });

          const goodPoints = keypoints.filter((kp) => kp.score > 0.5);
          setPoseQuality((goodPoints.length / 17) * 100);

          if (goodPoints.length >= 15) {
            setStatus("✅ All keypoints detected, ready to capture");
          } else {
            setStatus("⚠️ Step back / adjust position");
          }
          if (recordingRef.current && goodPoints.length >= 15) {
            const flatKeypoints = keypoints.flatMap((kp) => [
              kp.x,
              kp.y,
              kp.score,
            ]);
            const fullLabel = `${exerciseRef.current}_${labelRef.current}`;
            setData((prev) => [
              ...prev,
              { label: fullLabel, keypoints: flatKeypoints },
            ]);
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
        {steps.map((label, i) => (
          <Step key={i}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper
        elevation={3}
        sx={{ position: "relative", overflow: "hidden", borderRadius: 3 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width={640}
          height={360}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </Paper>

      <Chip
        label={status}
        color={status.includes("✅") ? "success" : "warning"}
      />

      <Stack sx={{ width: "100%", maxWidth: 500 }}>
        <Typography variant="caption">Pose Quality</Typography>
        <LinearProgress
          variant="determinate"
          value={poseQuality}
          sx={{ borderRadius: 1 }}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Button
          variant={exercise === "squat" ? "contained" : "outlined"}
          color="primary"
          onClick={() => updateExercise("squat")}
        >
          Squat
        </Button>
        <Button
          variant={exercise === "pushup" ? "contained" : "outlined"}
          color="primary"
          onClick={() => updateExercise("pushup")}
        >
          Pushup
        </Button>
        <Button
          variant={exercise === "plank" ? "contained" : "outlined"}
          color="primary"
          onClick={() => updateExercise("plank")}
        >
          Plank
        </Button>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button
          variant={label === "good" ? "contained" : "outlined"}
          color="success"
          onClick={() => updateLabel("good")}
        >
          Good
        </Button>
        <Button
          variant={label === "bad" ? "contained" : "outlined"}
          color="error"
          onClick={() => updateLabel("bad")}
        >
          Bad
        </Button>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={startRecording}
          disabled={!ready || recording}
        >
          {ready ? "Start Recording" : <CircularProgress size={20} />}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={stopRecording}
          disabled={!recording}
        >
          Stop Recording
        </Button>
      </Stack>

      <Typography variant="body1">Captured Samples: {data.length}</Typography>

      {step === 2 && (
        <Button variant="outlined" color="secondary" onClick={resetSession}>
          Reset Session & Start New
        </Button>
      )}

      <Button
        variant="contained"
        color="secondary"
        onClick={() => {
          downloadJSON(data);
          setSnackbar({
            open: true,
            message: "Dataset Downloaded",
            severity: "info",
          });
        }}
      >
        Download Dataset
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
