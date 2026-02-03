import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Sparkles,
  X,
  TrendingUp,
  BrainCircuit,
  Lock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  useGithubProfile,
  useGithubConnections,
  useGithubRepos,
} from "../hooks/useGithubData";
import { aiService } from "../services/aiService";
import type { AIMode } from "../types";

import { StatCard } from "../components/ui/StatCard";
import { SkeletonLoader } from "../components/ui/SkeletonLoader";
import { UserCard } from "../components/ui/UserCard";

/* ================= CONFIG ================= */
type ViewMode = "followers" | "following" | "mutual" | "nonFollowers";

const RECRUITER_CRUEL_PROMPT = `
Você é um recrutador técnico e mentor de carreira direto.
Analise o perfil e repositórios.
FOCO EXCLUSIVO: 
1. Dê uma nota de empregabilidade (0-10).
2. Crie um ROADMAP prático de estudos para os próximos 3 meses para aumentar essa nota.
Seja técnico e prático. Não fale sobre personalidade, fale sobre código e mercado.
`;

export const AnalysisPage = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  if (!username) {
    navigate("/");
    return null;
  }

  /* ================= STATES ================= */
  const [showAIModal, setShowAIModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("friendly");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const [loadingExtraAI, setLoadingExtraAI] = useState(false);
  const [roadmap, setRoadmap] = useState("");
  const [employabilityScore, setEmployabilityScore] = useState<number | null>(
    null,
  );

  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);

  // Novo estado de visualização
  const [viewMode, setViewMode] = useState<ViewMode>("followers");

  /* ================= DATA FETCHING ================= */
  const {
    data: profile,
    isLoading: loadingProfile,
    error,
  } = useGithubProfile(username);
  const { data: repos } = useGithubRepos(username);
  const { data: relations, isLoading: loadingRelations } = useGithubConnections(
    username,
    !!profile,
  );

  /* ================= COMPUTED LOGIC ================= */

  // Lógica para calcular quem não segue de volta
  const nonFollowersList = useMemo(() => {
    if (!relations) return [];
    const followersSet = new Set(
      relations.followers.map((u) => u.login.toLowerCase()),
    );
    return relations.following.filter(
      (u) => !followersSet.has(u.login.toLowerCase()),
    );
  }, [relations]);

  const nonFollowersCount = nonFollowersList.length;

  // Filtro da Grid de Usuários
  const usersToRender = useMemo(() => {
    if (!relations) return [];

    switch (viewMode) {
      case "followers":
        return relations.followers;
      case "following":
        return relations.following;
      case "mutual":
        return relations.followers.filter((f) =>
          relations.following.some(
            (fo) => fo.login.toLowerCase() === f.login.toLowerCase(),
          ),
        );
      case "nonFollowers":
        return nonFollowersList;
      default:
        return [];
    }
  }, [relations, viewMode, nonFollowersList]);

  /* ================= EFFECTS ================= */
  useEffect(() => {
    if (!profile) return;
    const saved = localStorage.getItem(`evolution-${profile.login}`);
    if (saved) setEvolutionData(JSON.parse(saved));
  }, [profile]);

  /* ================= HANDLERS ================= */

  // Handler 1: Análise de Perfil (Personalidade varia)
  const handleGenerateFeedback = async () => {
    if (!profile || !repos) return;
    setAiLoading(true);
    setAiResult("");

    try {
      // O backend já usa o 'aiMode' para decidir a personalidade
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: aiMode,
      });
      setAiResult(result);
    } catch {
      setAiResult("Erro ao gerar análise. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  // Handler 2: Score & Roteiro (Sempre técnico/recrutador)
  const handleEmployabilityAnalysis = async () => {
    if (!profile || !repos) return;
    setLoadingExtraAI(true);
    setEmployabilityScore(null);
    setRoadmap("");

    try {
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: "roast",
        customPrompt: RECRUITER_CRUEL_PROMPT,
      });

      setRoadmap(result);

      // Tenta extrair numero do texto
      const match = result.match(/(\d+)\/10/);
      if (match) {
        const score = Number(match[1]);
        setEmployabilityScore(score);
        const updated = [
          ...evolutionData,
          { date: new Date().toLocaleDateString("pt-BR"), score },
        ];
        setEvolutionData(updated);
        localStorage.setItem(
          `evolution-${profile.login}`,
          JSON.stringify(updated),
        );
      }
      setShowScoreModal(true);
    } finally {
      setLoadingExtraAI(false);
    }
  };

  /* ================= RENDER ================= */
  if (loadingProfile || loadingRelations) return <SkeletonLoader />;
  if (error || !profile)
    return <div className="error-state">Perfil não encontrado</div>;

  return (
    <div className="analysis-container animate-fade-in">
      {/* 1. Botão Voltar Estilizado */}
      <button className="btn-back" onClick={() => navigate("/")}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* 2. Perfil Ajustado */}
      <div className="profile-summary">
        <img
          src={profile.avatar_url}
          alt={profile.login}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h2>{profile.name || profile.login}</h2>
          <span className="profile-username">@{profile.login}</span>
        </div>
      </div>

      {/* 3. Cards de Estatística */}
      <div className="stats-grid">
        <StatCard label="Seguidores" value={profile.followers} />
        <StatCard label="Seguindo" value={profile.following} />
        <StatCard
          label="Não Seguem de Volta"
          value={nonFollowersCount}
          highlight
        />
      </div>

      {/* 4. Botões de Ação (Rosa e Roxo) */}
      <div className="actions-row">
        <button className="btn-ai" onClick={() => setShowAIModal(true)}>
          <Sparkles size={18} /> Análise com IA
        </button>

        <button
          className="btn-purple"
          onClick={handleEmployabilityAnalysis}
          disabled={loadingExtraAI}
        >
          {loadingExtraAI ? (
            "Calculando..."
          ) : (
            <>
              <BrainCircuit size={18} /> Pontuação e Roteiro
            </>
          )}
        </button>

        {evolutionData.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setShowEvolution((v) => !v)}
          >
            <TrendingUp size={18} />
          </button>
        )}
      </div>

      {/* Gráfico de Evolução */}
      {showEvolution && (
        <div
          className="chart-wrapper"
          style={{
            height: 300,
            marginBottom: 30,
            background: "var(--bg-card)",
            padding: 20,
            borderRadius: 16,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <XAxis dataKey="date" stroke="#666" />
              <YAxis domain={[0, 10]} stroke="#666" />
              <Tooltip contentStyle={{ background: "#333", border: "none" }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 5. Abas de Conexões (Incluindo Não Seguem) */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${viewMode === "followers" ? "active" : ""}`}
          onClick={() => setViewMode("followers")}
        >
          Seguidores ({profile.followers})
        </button>
        <button
          className={`tab-btn ${viewMode === "following" ? "active" : ""}`}
          onClick={() => setViewMode("following")}
        >
          Seguindo ({profile.following})
        </button>
        <button
          className={`tab-btn ${viewMode === "mutual" ? "active" : ""}`}
          onClick={() => setViewMode("mutual")}
        >
          Mútuos
        </button>
        <button
          className={`tab-btn ${viewMode === "nonFollowers" ? "active" : ""}`}
          onClick={() => setViewMode("nonFollowers")}
        >
          Não Seguem ({nonFollowersCount})
        </button>
      </div>

      {/* Grid de Usuários */}
      <div className="users-grid">
        {usersToRender.map((u) => (
          <UserCard key={u.login} user={u} />
        ))}
        {usersToRender.length === 0 && (
          <p style={{ color: "#666", gridColumn: "1/-1", textAlign: "center" }}>
            Nenhum usuário encontrado nesta categoria.
          </p>
        )}
      </div>

      {/* ================= MODAL ANÁLISE IA ================= */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowAIModal(false)}
            >
              <X />
            </button>

            <h2 style={{ marginBottom: 10 }}>Análise de Perfil com IA</h2>
            <p style={{ color: "#888", fontSize: 14 }}>
              Escolha a personalidade da IA:
            </p>

            <div className="ai-options">
              <button
                className={`btn-option ${aiMode === "friendly" ? "active" : ""}`}
                onClick={() => setAiMode("friendly")}
              >
                🥰 Amigável
              </button>
              <button
                className={`btn-option ${aiMode === "liar" ? "active" : ""}`}
                onClick={() => setAiMode("liar")}
              >
                🤥 Mentiroso
              </button>
              <button
                className={`btn-option ${aiMode === "roast" ? "active" : ""}`}
                onClick={() => setAiMode("roast")}
              >
                🔥 Recrutador
              </button>
            </div>

            <button
              className="btn-ai"
              style={{ width: "100%" }}
              onClick={handleGenerateFeedback}
              disabled={aiLoading}
            >
              {aiLoading ? "Gerando Análise..." : "Gerar Análise"}
            </button>

            {/* Box de Segurança */}
            <div className="security-box">
              <Lock size={14} />
              <span>
                Seus dados não são armazenados. Análise em tempo real.
              </span>
            </div>

            {aiResult && (
              <div className="ai-result animate-fade-in">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL SCORE ================= */}
      {showScoreModal && (
        <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowScoreModal(false)}
            >
              <X />
            </button>

            <h2
              style={{
                color: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <BrainCircuit /> Pontuação & Roteiro
            </h2>

            {employabilityScore !== null && (
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  textAlign: "center",
                  margin: "20px 0",
                  color: "#fff",
                }}
              >
                {employabilityScore}/10
              </div>
            )}

            <div className="ai-result animate-fade-in">
              <ReactMarkdown>{roadmap}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
