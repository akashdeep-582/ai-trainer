// Minimalist & Motion-Enhanced TrainingPage.jsx with label fix

import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import dataset from "../../data.json";
import { Line } from "react-chartjs-2";
import {
  Button,
  Typography,
  LinearProgress,
  Paper,
  Stack,
  Divider
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TrainingPage() {
  const [trainingStatus, setTrainingStatus] = useState("Idle");
  const [lossData, setLossData] = useState([]);
  const [accData, setAccData] = useState([]);
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState(null);
  const [tfReady, setTfReady] = useState(false);

  useEffect(() => {
    const initTF = async () => {
      await tf.setBackend("webgl");
      await tf.ready();
      console.log("TensorFlow ready with backend:", tf.getBackend());
      setTfReady(true);
    };
    initTF();
  }, []);

  const prepareData = () => {
    if (!tfReady) throw new Error("TensorFlow not ready yet");

    const labels = [...new Set(dataset.map((d) => d.label))];
    const labelToOneHot = labels.reduce((acc, label, i) => {
      acc[label] = tf.oneHot(i, labels.length).arraySync();
      return acc;
    }, {});
    const X = dataset.map((d) => d.keypoints);
    const y = dataset.map((d) => labelToOneHot[d.label]);
    return {
      xs: tf.tensor2d(X),
      ys: tf.tensor2d(y),
      labels
    };
  };

  const trainModel = async () => {
    const { xs, ys, labels } = prepareData();
    const m = tf.sequential();
    m.add(tf.layers.dense({ inputShape: [51], units: 64, activation: "relu" }));
    m.add(tf.layers.dense({ units: 32, activation: "relu" }));
    m.add(tf.layers.dense({ units: labels.length, activation: "softmax" }));
    m.compile({ optimizer: tf.train.adam(0.001), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
    setModel(m);
    setTrainingStatus("Training...");
    await m.fit(xs, ys, {
      epochs: 50,
      batchSize: 16,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          setLossData((prev) => [...prev, logs.loss]);
          setAccData((prev) => [...prev, logs.acc || logs.accuracy]);
          setProgress(((epoch + 1) / 50) * 100);
        },
        onTrainEnd: () => setTrainingStatus("✅ Training Completed"),
      },
    });
  };

  const exportModel = async () => {
    if (!model) return;
    await model.save("downloads://pose_classifier_model");
    alert("Model downloaded!");
  };

  return (
    <Stack
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      spacing={4}
      sx={{ p: 6, bgcolor: '#fff', color: '#000' }}
      alignItems="center"
    >
      <Typography
        component={motion.h1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
        variant="h4"
        fontWeight={600}
      >
        Model Trainer
      </Typography>

      {!tfReady ? (
        <Typography variant="body2">TensorFlow loading...</Typography>
      ) : (
        <Button
          component={motion.button}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeInOut" }}
          variant="contained"
          color="inherit"
          onClick={trainModel}
          disabled={trainingStatus !== "Idle"}
          sx={{ borderRadius: 8, px: 4, bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}
        >
          Start Training
        </Button>
      )}

      <Typography>Status: {trainingStatus}</Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, height: 8, bgcolor: '#eee', width: '100%', maxWidth: 600 }} />

      <Divider flexItem />

      <Stack direction="row" spacing={4} sx={{ width: '100%', maxWidth: 1000 }}>
        <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #ddd', borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={600} mb={1}>Loss Curve</Typography>
          <Line data={{ labels: lossData.map((_, i) => i + 1), datasets: [{ label: "Loss", data: lossData, borderColor: "#000", borderWidth: 2, fill: false }] }} />
        </Paper>

        <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #ddd', borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={600} mb={1}>Accuracy Curve</Typography>
          <Line data={{ labels: accData.map((_, i) => i + 1), datasets: [{ label: "Accuracy", data: accData, borderColor: "#000", borderWidth: 2, fill: false }] }} />
        </Paper>
      </Stack>

      <Button
        component={motion.button}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: "easeInOut" }}
        variant="outlined"
        color="inherit"
        onClick={exportModel}
        disabled={trainingStatus !== "✅ Training Completed"}
        sx={{ borderRadius: 8 }}
      >
        Download Trained Model
      </Button>
    </Stack>
  );
}