import { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import dataset from "../../data.json";
import { Line } from "react-chartjs-2";
import { Button, Typography, LinearProgress } from "@mui/material";
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
  const [labelList, setLabelList] = useState([]);

  const prepareData = () => {
    const labels = [...new Set(dataset.map((d) => d.label))];
    setLabelList(labels);

    const labelToOneHot = labels.reduce((acc, label, i) => {
      acc[label] = tf.oneHot(i, labels.length).arraySync();
      return acc;
    }, {});

    const X = dataset.map((d) => d.keypoints);
    const y = dataset.map((d) => labelToOneHot[d.label]);

    return {
      xs: tf.tensor2d(X),
      ys: tf.tensor2d(y),
    };
  };

  const trainModel = async () => {
    const { xs, ys } = prepareData();

    const m = tf.sequential();
    m.add(tf.layers.dense({ inputShape: [51], units: 64, activation: "relu" }));
    m.add(tf.layers.dense({ units: 32, activation: "relu" }));
    m.add(tf.layers.dense({ units: labelList.length, activation: "softmax" }));

    m.compile({
      optimizer: tf.train.adam(0.001),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

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
        onTrainEnd: () => {
          setTrainingStatus("✅ Training Completed");
        },
      },
    });
  };

  const exportModel = async () => {
    if (!model) return;
    await model.save("downloads://pose_classifier_model");
    alert("Model downloaded!");
  };

  return (
    <div className="p-6 space-y-6">
      <Typography variant="h5">AI Trainer — Model Training</Typography>

      <Button variant="contained" onClick={trainModel} disabled={trainingStatus !== "Idle"}>
        Start Training
      </Button>

      <Typography>Status: {trainingStatus}</Typography>
      <LinearProgress variant="determinate" value={progress} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Typography>Loss Curve</Typography>
          <Line
            data={{
              labels: lossData.map((_, i) => i + 1),
              datasets: [{ label: "Loss", data: lossData, borderColor: "red" }],
            }}
          />
        </div>
        <div>
          <Typography>Accuracy Curve</Typography>
          <Line
            data={{
              labels: accData.map((_, i) => i + 1),
              datasets: [{ label: "Accuracy", data: accData, borderColor: "green" }],
            }}
          />
        </div>
      </div>

      <Button variant="contained" color="secondary" onClick={exportModel} disabled={trainingStatus !== "✅ Training Completed"}>
        Download Trained Model
      </Button>
    </div>
  );
}
