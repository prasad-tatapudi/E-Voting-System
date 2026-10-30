import { BrowserRouter, Routes, Route } from "react-router-dom";
import RolePortal from "./pages/RolePortal";
import Register from "./pages/Register";
import FaceVerification from "./pages/FaceVerification";
import LivenessCheck from "./pages/Livenesscheck";
import LivenessDetection from "./pages/LivenessDetection";
import Eligibility from "./pages/Eligibility";
import Voting from "./pages/Voting";
import Confirmation from "./pages/Confirmation";
import Results from "./pages/Results";

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<RolePortal />} />
    <Route path="/register" element={<RolePortal />} />
    <Route path="/legacy-register" element={<Register />} />
    <Route path="/face-verification" element={<FaceVerification />} />
    <Route path="/liveness-check" element={<LivenessCheck />} />
    <Route path="/liveness-detection" element={<LivenessDetection />} />
    <Route path="/eligibility" element={<Eligibility />} />
    <Route path="/voting" element={<Voting />} />
    <Route path="/confirmation" element={<Confirmation />} />
    <Route path="/results" element={<Results />} />
  </Routes></BrowserRouter>;
}
