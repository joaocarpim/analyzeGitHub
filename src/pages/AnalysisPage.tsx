import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, UserMinus, Sparkles, X, Bot } from "lucide-react";

import {
  useGithubProfile,
  useGithubConnections,
  useGithubRepos,
} from "../hooks/useGithubData";
import { aiService } from "../services/aiService";
import type { AnalysisTab, AIMode } from "../types";

import { UserCard } from "../components/ui/UserCard";
import { StatCard } from "../components/ui/StatCard";
import { SkeletonLoader } from "../components/ui/SkeletonLoader";

export const AnalysisPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AnalysisTab>("nonFollowers");
  const [filterText, setFilterText] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("friendly");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const {
    data: profile,
    isLoading: loadingProfile,
    error,
  } = useGithubProfile(username!);
  const { data: repos } = useGithubRepos(username!);
  const { data: relations, isLoading: loadingRelations } = useGithubConnections(
    username!,
    !!profile,
  );

  const analyzedData = useMemo(() => {
    if (!relations) return { nonFollowers: [], fans: [], mutuals: [] };
    const followersSet = new Set(
      relations.followers.map((u) => u.login.toLowerCase()),
    );
    const followingSet = new Set(
      relations.following.map((u) => u.login.toLowerCase()),
    );
    return {
      nonFollowers: relations.following.filter(
        (u) => !followersSet.has(u.login.toLowerCase()),
      ),
      fans: relations.followers.filter(
        (u) => !followingSet.has(u.login.toLowerCase()),
      ),
      mutuals: relations.following.filter((u) =>
        followersSet.has(u.login.toLowerCase()),
      ),
    };
  }, [relations]);

  const displayedUsers = useMemo(() => {
    const list = analyzedData[activeTab];
    if (!filterText) return list;
    return list.filter((u) =>
      u.login.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [analyzedData, activeTab, filterText]);

  const handleGenerateFeedback = async () => {
    if (!profile || !repos) return;
    setAiLoading(true);
    setAiResult("");
    console.log("0. [Page] Clicou em Gerar");
    try {
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: aiMode,
      });
      setAiResult(result);
    } catch (err: any) {
      console.error("3. [Page] Erro capturado:", err);
      setAiResult(`**Erro:** ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (loadingProfile || loadingRelations) return <SkeletonLoader />;

  if (error)
    return (
      <div className="error-state">
        <h3 className="state-title">Erro ao buscar dados</h3>
        <button onClick={() => navigate("/")} className="btn-primary">
          Voltar
        </button>
      </div>
    );

  return (
    <div className="analysis-container">
      <button
        onClick={() => navigate("/")}
        style={{
          marginBottom: 20,
          background: "none",
          border: "none",
          fontSize: 16,
          cursor: "pointer",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <ArrowLeft size={16} style={{ marginRight: 5 }} /> Voltar
      </button>

      {profile && (
        <>
          {/* Header do Perfil */}
          <div className="profile-header">
            <img
              src={profile.avatar_url}
              alt={profile.login}
              className="profile-avatar"
            />
            <div className="profile-info">
              <h2>{profile.name || profile.login}</h2>
              <p>@{profile.login}</p>
            </div>
          </div>

          {/* Grid Compacto */}
          <div className="stats-grid">
            <StatCard label="Seguidores" value={profile.followers} />
            <StatCard label="Seguindo" value={profile.following} />
            <StatCard
              label="Não seguem"
              value={analyzedData.nonFollowers.length}
              highlight
            />
          </div>

          <div className="ai-trigger-container">
            <button className="btn-ai" onClick={() => setShowAIModal(true)}>
              <Sparkles size={18} /> Gerar Feedback com IA
            </button>
          </div>
        </>
      )}

      <div className="tabs-container">
        <button
          className={`tab ${activeTab === "nonFollowers" ? "active" : ""}`}
          onClick={() => setActiveTab("nonFollowers")}
        >
          <UserMinus size={18} /> Não seguem{" "}
          <span className="badge">{analyzedData.nonFollowers.length}</span>
        </button>
        <button
          className={`tab ${activeTab === "fans" ? "active" : ""}`}
          onClick={() => setActiveTab("fans")}
        >
          Fãs <span className="badge">{analyzedData.fans.length}</span>
        </button>
        <button
          className={`tab ${activeTab === "mutuals" ? "active" : ""}`}
          onClick={() => setActiveTab("mutuals")}
        >
          Mútuos <span className="badge">{analyzedData.mutuals.length}</span>
        </button>
      </div>

      <div className="filter-section">
        <input
          type="text"
          className="search-input"
          placeholder="Filtrar..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="users-grid">
        {displayedUsers.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>

      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div
            className="ai-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>IA Análise 🤖</h2>
              <button
                className="modal-close"
                onClick={() => setShowAIModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* --- CORREÇÃO AQUI: Usando o Bot que estava sobrando --- */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 24,
                padding: 20,
                background: "var(--bg-tertiary)",
                borderRadius: 16,
              }}
            >
              <Bot
                size={32}
                color="var(--accent-secondary)"
                style={{ marginBottom: 10 }}
              />
              <p style={{ fontSize: 15, color: "var(--text-primary)" }}>
                Nossa IA vai analisar seu perfil e repositórios.
              </p>
            </div>
            {/* ------------------------------------------------------- */}

            <div className="ai-options">
              <button
                className={`btn-option ${aiMode === "friendly" ? "selected" : ""}`}
                onClick={() => setAiMode("friendly")}
              >
                🥰 Amigável
              </button>
              <button
                className={`btn-option ${aiMode === "liar" ? "selected" : ""}`}
                onClick={() => setAiMode("liar")}
              >
                🤥 Mentiroso
              </button>
              <button
                className={`btn-option ${aiMode === "roast" ? "selected" : ""}`}
                onClick={() => setAiMode("roast")}
              >
                🔥 Acorda
              </button>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={handleGenerateFeedback}
              disabled={aiLoading}
            >
              {aiLoading ? "Processando..." : "Gerar Análise"}
            </button>

            {aiResult && (
              <div className="ai-result-box animate-fade-in">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
