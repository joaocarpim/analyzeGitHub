import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { HomePage } from "./pages/HomePage";
import { AnalysisPage } from "./pages/AnalysisPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div className="bg-effect">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>
      <div className="app-container">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze/:username" element={<AnalysisPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
export default App;
