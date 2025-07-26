import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Alert,
  Chip
} from "@mui/material";
import { Line } from "react-chartjs-2";
import 'chart.js/auto';
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";

export default function TrainingPage() {
  const [data, setData] = useState([]);
  const [model, setModel] = useState(null);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [lossHistory, setLossHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [labelList, setLabelList] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSmoothProgress(prev => prev + 0.05 * (progress - prev));
    }, 50);
    return () => clearInterval(interval);
  }, [progress]);

  useEffect(() => {
    tf.ready().then(() => console.log("✅ TensorFlow Ready (TrainingPage)"));
  }, []);

  const handleUpload = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const jsonData = JSON.parse(fileReader.result);
      setData(jsonData);

      const uniqueLabels = [...new Set(jsonData.map(d => d.label))];
      setLabelList(uniqueLabels);
      setMessage(`✅ Dataset Loaded (${uniqueLabels.length} classes detected)`);
    };
    fileReader.readAsText(e.target.files[0]);
  };

  // Prepare Data
  const prepareData = () => {
    const inputs = [];
    const labels = [];
    data.forEach(sample => {
      inputs.push(sample.keypoints);
      labels.push(labelList.indexOf(sample.label));
    });

    const xs = tf.tensor2d(inputs);
    const ys = tf.oneHot(tf.tensor1d(labels, "int32"), labelList.length);
    return { xs, ys };
  };

  // Train Model
  const trainModel = async () => {
    setTraining(true);
    const { xs, ys } = prepareData();

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [132], units: 128, activation: "relu" }));
    model.add(tf.layers.dense({ units: 64, activation: "relu" }));
    model.add(tf.layers.dense({ units: labelList.length, activation: "softmax" }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

    setModel(model);

    await model.fit(xs, ys, {
      epochs: 30,
      batchSize: 32,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setProgress(((epoch + 1) / 30) * 100);
          setLossHistory(prev => [...prev, { x: epoch + 1, y: logs.loss }]);
        },
        onTrainEnd: () => {
          setMessage("✅ Training Completed");
          setTraining(false);
          xs.dispose();
          ys.dispose();
        },
      },
    });
  };

  // Save Model + Labels
  const saveModelAndLabels = async () => {
    if (!model) return;
    await model.save("downloads://pose-classifier");

    const blob = new Blob([JSON.stringify(labelList)], { type: "application/json" });
    saveAs(blob, "labels.json");

    setMessage("✅ Model & Labels Downloaded");
  };

  return (
    <Stack spacing={3} alignItems="center" sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      <Typography variant="h5" fontWeight="500">Training Page</Typography>

      <Button variant="outlined" component="label">
        Upload Dataset (JSON)
        <input hidden type="file" accept=".json" onChange={handleUpload} />
      </Button>

      <Typography variant="subtitle2">Detected Labels:</Typography>
      {labelList.map((l, i) => (
        <Chip key={i} label={l} sx={{ m: 0.5 }} />
      ))}

      <Button variant="contained" color="primary" disabled={!data.length || training} onClick={trainModel}>
        {training ? <CircularProgress size={20} /> : "Start Training"}
      </Button>

      <LinearProgress variant="determinate" value={smoothProgress} sx={{ width: "100%", borderRadius: 1, transition: "all 0.5s ease" }} />

      <Paper elevation={2} sx={{ p: 2, width: "100%" }}>
        <Typography variant="subtitle2">Loss Curve</Typography>
        <Line
          data={{
            datasets: [{
              label: "Loss",
              data: lossHistory,
              borderColor: "black",
              tension: 0.3,
            }],
          }}
          options={{
            responsive: true,
            scales: {
              x: { title: { display: true, text: "Epoch" } },
              y: { title: { display: true, text: "Loss" } }
            }
          }}
        />
      </Paper>

      {/* Link to Predict Page, disable until model is ready */}
      <Link to={training || !model ? "#" : "/predict"} style={{ textDecoration: 'none' }}>
        <Button 
          variant="contained" 
          color="success" 
          onClick={saveModelAndLabels} 
          disabled={training || !model} 
          style={{
            pointerEvents: training || !model ? "none" : "auto", 
            opacity: training || !model ? 0.5 : 1
          }}
        >
          Save Model + Labels
        </Button>
      </Link>

      {message && <Alert severity="info">{message}</Alert>}
    </Stack>
  );
}
