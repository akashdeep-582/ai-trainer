import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { downloadJSON } from "../utils/savePoseData";

export default function AutoDataCollector() {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const [data, setData] = useState([]);
  const [label, setLabel] = useState("good");
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

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
            setReady(true); // ✅ Mark system ready AFTER everything is initialized
        };
      }
    };

    init();
  }, []);

  const startRecording = () => {
    if (recording) return;
    setRecording(true);
    setCount(0);
    captureLoop();
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const captureLoop = async () => {
    console.log('js', detectorRef.current, videoRef.current);
    if (!recording || !detectorRef.current || !videoRef.current) return;
    console.log('hi')
  
    // ✅ Wait until the video is fully ready
    if (videoRef.current.readyState < 4) {
      setTimeout(captureLoop, 500);
      return;
    }
  
    const poses = await detectorRef.current.estimatePoses(videoRef.current);
    if (poses[0] && poses[0].keypoints.length > 0) {
      const flatKeypoints = poses[0].keypoints.flatMap(kp => [kp.x, kp.y, kp.score]);
      setData(prev => [...prev, { keypoints: flatKeypoints, label }]);
      setCount(prev => prev + 1);
      console.log("Captured Pose #", count + 1);
    } else {
      console.warn("Pose not detected, skipping...");
    }
  
    setTimeout(() => captureLoop(), 1000); // capture every second
  };
  

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <video ref={videoRef} autoPlay playsInline muted className="rounded-xl w-96 h-64 object-cover" />

      <div className="space-x-2">
        <button onClick={() => setLabel("good")} className={`px-4 py-2 rounded ${label === "good" ? "bg-green-600" : "bg-green-400"}`}>Good</button>
        <button onClick={() => setLabel("bad")} className={`px-4 py-2 rounded ${label === "bad" ? "bg-red-600" : "bg-red-400"}`}>Bad</button>
      </div>

      <div className="space-x-2">
        <button onClick={startRecording} className="bg-blue-500 px-4 py-2 rounded" disabled={ recording || !ready}>Start Recording</button>
        <button onClick={stopRecording} className="bg-red-500 px-4 py-2 rounded" disabled={!recording}>Stop Recording</button>
      </div>

      <p>Captured Samples: {data.length}</p>

      <button onClick={() => downloadJSON(data)} className="bg-yellow-500 px-4 py-2 rounded">Download Dataset</button>
    </div>
  );
}
