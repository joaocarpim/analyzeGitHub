import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
// Adicionado o ícone Lock na importação
import { ArrowLeft, UserMinus, Sparkles, X, Lock } from "lucide-react";
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
    try {
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: aiMode,
      });
      setAiResult(result);
    } catch (err) {
      setAiResult(
        "**Erro:** O servidor não conseguiu processar sua solicitação.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  if (loadingProfile || loadingRelations) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="error-state">
        <h3 className="state-title">Erro ao buscar dados</h3>
        <button onClick={() => navigate("/")} className="btn btn-primary">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="analysis-container">
      <button
        onClick={() => navigate("/")}
        className="user-link"
        style={{
          marginBottom: 20,
          background: "none",
          border: "none",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={16} style={{ display: "inline", marginRight: 5 }} />{" "}
        Voltar
      </button>

      {profile && (
        <>
          <div className="profile-summary">
            <img
              src={profile.avatar_url}
              alt={profile.login}
              className="profile-summary-avatar"
            />
            <div className="profile-summary-info">
              <h2>{profile.name || profile.login}</h2>
              <p>@{profile.login}</p>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard label="Seguidores" value={profile.followers} />
            <StatCard label="Seguindo" value={profile.following} />
            <StatCard
              label="Não seguem volta"
              value={analyzedData.nonFollowers.length}
              highlight
            />
          </div>

          <div className="ai-trigger-container">
            <button className="btn btn-ai" onClick={() => setShowAIModal(true)}>
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
          <UserMinus size={18} /> Não seguem de volta{" "}
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
            <div
              className="modal-header"
              style={{
                position: "relative",
                background: "transparent",
                padding: 0,
                border: "none",
              }}
            >
              <h2>Análise de Perfil com IA 🤖</h2>
              <button
                className="modal-close"
                style={{ top: -10, right: -10 }}
                onClick={() => setShowAIModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              {/* NOVA BOX DE SEGURANÇA / PRIVACIDADE */}
              <div
                style={{
                  border: "1px solid rgba(139, 92, 246, 0.4)", // Borda roxa suave
                  background: "rgba(139, 92, 246, 0.1)", // Fundo roxo bem leve
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "24px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <Lock size={16} color="#a78bfa" />
                  <span
                    style={{
                      color: "#a78bfa",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Privacidade de Dados
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  A análise utiliza apenas os dados <strong>públicos</strong> do
                  seu GitHub. Seus repositórios privados e informações sensíveis
                  permanecem seguros e inacessíveis.
                </p>
              </div>

              <div className="ai-options">
                <button
                  className={`btn-option ${aiMode === "friendly" ? "selected friendly" : ""}`}
                  onClick={() => setAiMode("friendly")}
                >
                  🥰 Amigável
                </button>
                <button
                  className={`btn-option ${aiMode === "liar" ? "selected liar" : ""}`}
                  onClick={() => setAiMode("liar")}
                >
                  🤥 Mentiroso
                </button>
                <button
                  className={`btn-option ${aiMode === "roast" ? "selected roast" : ""}`}
                  onClick={() => setAiMode("roast")}
                >
                  🔥 Acorda pra vida
                </button>
              </div>

              <button
                className="btn btn-primary"
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
        </div>
      )}
    </div>
  );
};
