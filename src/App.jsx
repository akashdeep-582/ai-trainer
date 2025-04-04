import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// import AutoDataCollector from "./components/AutoDataCollector";
import AutoDataCollectorApple from "./components/AutoDataCollectorApple";
import TrainingPage from "./components/TrainingPage";
import TrainingPageApple from "./components/TrainingPageApple";
import AutoDataCollector from "./components/DataCollector"
import Home from "./components/Home";
import Navigation from "./components/Navigation";

import { Box } from "@mui/material";
import PredictPage from "./components/PredictPage";


function App() {
  return (
    <Router>
      <Navigation />
      <Box sx={{ pt: 10 }}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/collect" element={<AutoDataCollectorApple />} />
          <Route path="/train" element={<TrainingPageApple />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </Box>
    </Router>
  );
}


export default App;
