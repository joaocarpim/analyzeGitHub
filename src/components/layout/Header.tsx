import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();
  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/")}>
        <div className="logo-icon">
          <Github />
        </div>
        <h1 className="logo-text">Followers Analyzer</h1>
      </div>
    </header>
  );
};
