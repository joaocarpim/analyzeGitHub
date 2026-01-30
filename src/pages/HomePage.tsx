import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Users, Zap, Github, Lock } from "lucide-react";

export const HomePage = () => {
  const [inputUser, setInputUser] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser.trim()) navigate(`/analyze/${inputUser}`);
  };

  return (
    <div className="landing-page animate-fade-in">
      <section className="hero-section">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          Nova Feature: Análise com IA 🤖
        </div>

        <h1 className="hero-title">
          Domine seu Círculo <br />
          <span className="text-gradient">Profissional no GitHub</span>
        </h1>

        <p className="hero-subtitle">
          Descubra quem não te segue de volta, encontre seus verdadeiros fãs e
          receba uma mentoria de carreira com nossa Inteligência Artificial.
        </p>

        <div className="hero-search-container">
          <form onSubmit={handleSubmit} className="search-form landing-search">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="Digite seu username (ex: diego3g)"
                value={inputUser}
                onChange={(e) => setInputUser(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Analisar Perfil <ArrowLeft size={16} className="rotate-180" />
            </button>
          </form>
          <p className="hero-disclaimer">
            <Lock size={12} style={{ display: "inline", marginRight: 4 }} />
            100% Seguro.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon-box blue">
            <Users size={24} />
          </div>
          <h3>Gestão de Conexões</h3>
          <p>Visualize quem você segue mas não te segue de volta.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-box purple">
            <Zap size={24} />
          </div>
          <h3>Feedback de IA</h3>
          <p>Receba dicas de carreira baseadas no seu perfil e stack.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-box green">
            <Github size={24} />
          </div>
          <h3>Segurança Total</h3>
          <p>Seus dados são processados e descartados. Zero tracking.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Desenvolvido para devs que buscam evoluir.</p>
      </footer>
    </div>
  );
};
