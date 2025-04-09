import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import {
  Stack,
  Paper,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";

export default function PredictPage() {
  const videoRef = useRef(null);
  const skeletonCanvasRef = useRef(null);
  const detectorRef = useRef(null);
  const modelRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Please upload model + labels");
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [labels, setLabels] = useState([]);
  const labelsRef = useRef([]);
  const predictionBuffer = useRef([]);
  const lastSpokenRef = useRef(0);
  const lastPredictionSpokenRef = useRef(0);
  const lastPredictionRef = useRef("");

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
          setReady(true);
        };
      }
    };
    init();
  }, []);

  useEffect(() => {
    const now = Date.now();

    if (
      prediction &&
      !status.includes("Step back") &&
      prediction !== lastPredictionRef.current &&
      now - lastPredictionSpokenRef.current > 5000
    ) {
        if (!prediction.toLowerCase().includes("good")) {
            speak(`Detected ${prediction}`);
          }
      lastPredictionRef.current = prediction;
      lastPredictionSpokenRef.current = now;
    }
  }, [prediction, status]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth.speaking) {
      const cleaned = text.replace(/[^\w\s]/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1;
      utterance.pitch = 1;
      synth.speak(utterance);
    }
  };

  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files);

    const jsonFile = files.find(f => f.name.endsWith(".json") && f.name !== "labels.json");
    const binFile = files.find(f => f.name.endsWith(".bin"));
    const labelsFile = files.find(f => f.name === "labels.json");


    if (!jsonFile || !binFile || !labelsFile) {
      alert("Please upload model.json, weights.bin, and labels.json together.");
      return;
    }

    // Load labels.json
    const labelsText = await labelsFile.text();
    const parsedLabels = JSON.parse(labelsText);
    if (!Array.isArray(parsedLabels)) {
      alert("labels.json is invalid.");
      return;
    }
    setLabels(parsedLabels);
    labelsRef.current = parsedLabels;

    // Load Model
    try {
      const model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, binFile]));
      modelRef.current = model;
      setStatus(`✅ Model & Labels Loaded (${parsedLabels.length} classes)`);
      detectLoop();
    } catch (error) {
      console.error(error);
      alert("Failed to load model. Please check your files.");
    }
  };

  const drawSkeleton = (ctx, keypoints) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;

    // Updated pairs based on AutoDataCollector for squat detection
    const pairs = [
        [11,12], [11,13], [12,14], [13,15], [14,16], [11,23], [12,24], 
        [23,25], [24,26], [25,27], [26,28],
      ];

    // Draw lines for the pairs (skeleton)
    pairs.forEach(([i, j]) => {
      if (keypoints[i] && keypoints[j] && keypoints[i].score > 0.5 && keypoints[j].score > 0.5) {
        ctx.beginPath();
        ctx.moveTo((keypoints[i].x + 1) / 2 * ctx.canvas.width, (keypoints[i].y + 1) / 2 * ctx.canvas.height);
        ctx.lineTo((keypoints[j].x + 1) / 2 * ctx.canvas.width, (keypoints[j].y + 1) / 2 * ctx.canvas.height);
        ctx.stroke();
      }
    });

    // Draw keypoints
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
    if (!detectorRef.current || !modelRef.current || !videoRef.current) return;
    const ctx = skeletonCanvasRef.current.getContext("2d");

    const detect = async () => {
        
      if (videoRef.current.readyState >= 4) {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        if (poses[0]) {
          const keypoints = poses[0].keypoints3D || [];
          drawSkeleton(ctx, keypoints);

          const goodPoints = keypoints.filter((kp) => kp.score > 0.5);
          if (goodPoints.length >= 25) {
            setStatus("✅ Pose Detected");

            const input = tf.tensor([keypoints.flatMap(kp => [kp.x, kp.y, kp.z, kp.score])]);
            const output = modelRef.current.predict(input);
            const predictionIndex = output.argMax(-1).dataSync()[0];
            const confidenceScore = output.max().dataSync()[0];
            input.dispose();
            output.dispose();

            predictionBuffer.current.push(predictionIndex);
            if (predictionBuffer.current.length > 10) predictionBuffer.current.shift();
            const mostCommon = predictionBuffer.current.sort((a, b) =>
              predictionBuffer.current.filter(v => v === a).length - predictionBuffer.current.filter(v => v === b).length
            ).pop();
            setPrediction(labelsRef.current[mostCommon] || `Class ${mostCommon}`);
            setConfidence(confidenceScore);
          } else {
            setStatus("⚠️ Step Back / Adjust Pose");
            setPrediction("");
          }
        } else {
          const msg = "Step back or adjust position";
          setStatus(msg);
          setPrediction("");

          const now = Date.now();
          if (now - lastSpokenRef.current > 5000) {
            speak(msg);
            lastSpokenRef.current = now;
          }
        }
      }
      requestAnimationFrame(detect);
    };
    detect();
  };

  return (
    <Stack spacing={3} alignItems="center" sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="500">AI Fitness Predict Page</Typography>

      <Button variant="outlined" component="label">
        Upload Model (model.json + weights.bin + labels.json)
        <input hidden type="file" accept=".json,.bin" multiple onChange={handleFilesUpload} />
      </Button>

      <Paper elevation={3}>
        <Stack direction="row" spacing={2}>
          <video ref={videoRef} autoPlay playsInline muted width={480} height={360} />
          <canvas ref={skeletonCanvasRef} width={480} height={360} />
        </Stack>
      </Paper>

      <Chip label={status} color={status.includes("✅") ? "success" : "warning"} />

      {prediction &&
        <Alert severity="info" sx={{ fontSize: "1.1rem", fontWeight: 500 }}>
          Prediction: {prediction} <br />
          Confidence: {(confidence * 100).toFixed(2)}%
        </Alert>
      }

      {!ready && <CircularProgress />}

      <Button variant="outlined" onClick={() => window.location.reload()}>Restart</Button>
    </Stack>
  );
}
