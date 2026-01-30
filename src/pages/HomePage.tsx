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
          <span className="pulse-dot"></span>Nova Feature: Análise com IA 🤖
        </div>
        <h1 className="hero-title">
          Domine seu Círculo <br />
          <span className="text-gradient">Profissional no GitHub</span>
        </h1>
        <p className="hero-subtitle">
          Descubra quem não te segue de volta e receba uma mentoria de carreira
          com IA.
        </p>
        <div className="hero-search-container">
          <form onSubmit={handleSubmit} className="landing-search">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Digite seu username (ex: diego3g)"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Analisar <ArrowLeft size={16} className="rotate-180" />
            </button>
          </form>
          <p className="hero-disclaimer">
            <Lock size={12} style={{ marginRight: 4 }} /> 100% Seguro.
          </p>
        </div>
      </section>
      <footer className="landing-footer">
        <p>Desenvolvido para devs que buscam evoluir.</p>
      </footer>
    </div>
  );
};
