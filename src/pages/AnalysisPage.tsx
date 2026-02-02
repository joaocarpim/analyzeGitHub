import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, X, TrendingUp, Users } from "lucide-react";

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

/* ================= TYPES ================= */

type EvolutionPoint = {
  date: string;
  score: number;
};

type ViewMode = "followers" | "following" | "mutual";

/* ================= PROMPT ================= */

const RECRUITER_CRUEL_PROMPT = `
Você é um recrutador técnico EXTREMAMENTE exigente.

Analise o GitHub abaixo e retorne APENAS neste formato:

Score de Empregabilidade: X/10
Nível Profissional: Estagiário | Júnior | Pleno | Sênior | Staff

Roadmap Personalizado (6 meses):
- Mês 1: ...
- Mês 2: ...
- Mês 3: ...
- Mês 4: ...
- Mês 5: ...
- Mês 6: ...

Seja crítico, direto e realista. Não seja educado.
`;

/* ================= COMPONENT ================= */

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
  const [employabilityScore, setEmployabilityScore] = useState<number | null>(
    null,
  );
  const [roadmap, setRoadmap] = useState("");

  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("followers");

  /* ================= DATA ================= */

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

  /* ================= COMPUTED ================= */

  const nonFollowersCount = useMemo(() => {
    if (!relations) return 0;

    const followers = new Set(
      relations.followers.map((u) => u.login.toLowerCase()),
    );

    return relations.following.filter(
      (u) => !followers.has(u.login.toLowerCase()),
    ).length;
  }, [relations]);

  const usersToRender = useMemo(() => {
    if (!relations) return [];

    if (viewMode === "followers") return relations.followers;
    if (viewMode === "following") return relations.following;

    return relations.followers.filter((f) =>
      relations.following.some(
        (fo) => fo.login.toLowerCase() === f.login.toLowerCase(),
      ),
    );
  }, [relations, viewMode]);

  /* ================= STORAGE ================= */

  useEffect(() => {
    if (!profile) return;

    const saved = localStorage.getItem(`evolution-${profile.login}`);
    if (saved) {
      setEvolutionData(JSON.parse(saved));
    }
  }, [profile]);

  const extractScore = (text: string): number | null => {
    const match = text.match(/Score de Empregabilidade:\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  /* ================= IA ================= */

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
    } catch {
      setAiResult("Erro ao gerar análise.");
    } finally {
      setAiLoading(false);
    }
  };

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

      const score = extractScore(result);
      if (score !== null) {
        setEmployabilityScore(score);

        const updated = [
          ...evolutionData,
          {
            date: new Date().toLocaleDateString("pt-BR"),
            score,
          },
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

  /* ================= STATES ================= */

  if (loadingProfile || loadingRelations) return <SkeletonLoader />;

  if (error || !profile) {
    return (
      <div className="error-state">
        <h3>Erro ao buscar dados</h3>
        <button onClick={() => navigate("/")}>Voltar</button>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="analysis-container">
      {/* ===== VOLTAR ===== */}
      <button className="btn btn-link" onClick={() => navigate("/")}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* ===== PERFIL ===== */}
      <div className="profile-summary">
        <img
          src={profile.avatar_url}
          alt={profile.login}
          className="profile-avatar"
        />
        <div>
          <h2 className="profile-name">{profile.name || profile.login}</h2>
          <p className="profile-username">@{profile.login}</p>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-grid">
        <StatCard label="Seguidores" value={profile.followers} />
        <StatCard label="Seguindo" value={profile.following} />
        <StatCard
          label="Não seguem de volta"
          value={nonFollowersCount}
          highlight
        />
      </div>

      {/* ===== ACTIONS ===== */}
      <div className="actions-row">
        <button className="btn btn-ai" onClick={() => setShowAIModal(true)}>
          <Sparkles size={18} /> Análise com IA
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleEmployabilityAnalysis}
          disabled={loadingExtraAI}
        >
          🧠 Score & Roadmap
        </button>

        {evolutionData.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowEvolution((v) => !v)}
          >
            <TrendingUp size={16} /> Evolução
          </button>
        )}
      </div>

      {/* ===== GRAPH ===== */}
      {showEvolution && (
        <div className="chart-wrapper">
          <ResponsiveContainer>
            <LineChart data={evolutionData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line
                dataKey="score"
                stroke="var(--accent-primary)"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== USERS FLOW ===== */}
      <div className="section-header">
        <Users size={18} />
        <h3>Conexões</h3>
      </div>

      <div className="btn-group">
        <button
          className={viewMode === "followers" ? "active" : ""}
          onClick={() => setViewMode("followers")}
        >
          Seguidores
        </button>
        <button
          className={viewMode === "following" ? "active" : ""}
          onClick={() => setViewMode("following")}
        >
          Seguindo
        </button>
        <button
          className={viewMode === "mutual" ? "active" : ""}
          onClick={() => setViewMode("mutual")}
        >
          Mútuos
        </button>
      </div>

      <div className="users-grid">
        {usersToRender.map((u) => (
          <UserCard key={u.login} user={u} />
        ))}
      </div>

      {/* ===== IA MODAL ===== */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div
            className="ai-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Análise de Perfil com IA</h2>

            <div className="ai-options">
              {(["friendly", "liar", "roast"] as AIMode[]).map((mode) => (
                <button
                  key={mode}
                  className={aiMode === mode ? "active" : ""}
                  onClick={() => setAiMode(mode)}
                >
                  {mode === "friendly" && "🥰 Amigável"}
                  {mode === "liar" && "🤥 Mentiroso"}
                  {mode === "roast" && "🔥 Recrutador"}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGenerateFeedback}
              disabled={aiLoading}
            >
              {aiLoading ? "Processando..." : "Gerar Análise"}
            </button>

            {aiResult && (
              <div className="ai-result-box">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            )}

            <button
              className="modal-close"
              onClick={() => setShowAIModal(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ===== SCORE MODAL ===== */}
      {showScoreModal && (
        <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div
            className="ai-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>📊 Empregabilidade</h2>

            {employabilityScore !== null && (
              <div className="score-badge">
                Empregabilidade: {employabilityScore}/10
              </div>
            )}

            {roadmap && (
              <div className="ai-result-box">
                <ReactMarkdown>{roadmap}</ReactMarkdown>
              </div>
            )}

            <button
              className="modal-close"
              onClick={() => setShowScoreModal(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
