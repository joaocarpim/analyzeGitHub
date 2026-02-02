import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Sparkles, X, TrendingUp } from "lucide-react";

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

/* ------------------ TYPES ------------------ */

type EvolutionPoint = {
  date: string;
  score: number;
};

/* ------------------ PROMPT ------------------ */

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

/* ------------------ COMPONENT ------------------ */

export const AnalysisPage = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  /* ---------- GUARD (CRÍTICO PARA VERCEL) ---------- */

  if (!username) {
    navigate("/");
    return null;
  }

  /* ---------- UI STATE ---------- */

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>("friendly");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");

  const [loadingExtraAI, setLoadingExtraAI] = useState(false);
  const [employabilityScore, setEmployabilityScore] = useState<number | null>(
    null,
  );
  const [roadmap, setRoadmap] = useState<string>("");

  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);

  /* ---------- DATA ---------- */

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

  /* ---------- FOLLOW ANALYSIS ---------- */

  const nonFollowersCount = useMemo(() => {
    if (!relations?.followers || !relations?.following) return 0;

    const followers = new Set(
      relations.followers.map((u) => u.login.toLowerCase()),
    );

    return relations.following.filter(
      (u) => !followers.has(u.login.toLowerCase()),
    ).length;
  }, [relations]);

  /* ---------- EVOLUTION STORAGE ---------- */

  useEffect(() => {
    if (!profile) return;

    const saved = localStorage.getItem(`evolution-${profile.login}`);
    if (saved) {
      setEvolutionData(JSON.parse(saved) as EvolutionPoint[]);
    }
  }, [profile]);

  const extractScore = (text: string): number | null => {
    const match = text.match(/Score de Empregabilidade:\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  /* ---------- IA: NORMAL ---------- */

  const handleGenerateFeedback = async () => {
    if (!profile || !repos) return;

    setAiLoading(true);
    setAiResult("");

    try {
      const result: string = await aiService.generateFeedback({
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

  /* ---------- IA: SCORE + ROADMAP ---------- */

  const handleEmployabilityAnalysis = async () => {
    if (!profile || !repos) return;

    setLoadingExtraAI(true);
    setRoadmap("");
    setEmployabilityScore(null);

    try {
      const result: string = await aiService.generateFeedback({
        profile,
        repos,
        mode: "roast",
        customPrompt: RECRUITER_CRUEL_PROMPT,
      });

      setRoadmap(result);

      const score = extractScore(result);
      if (score !== null) {
        setEmployabilityScore(score);

        const point: EvolutionPoint = {
          date: new Date().toLocaleDateString("pt-BR"),
          score,
        };

        const updated = [...evolutionData, point];
        setEvolutionData(updated);

        localStorage.setItem(
          `evolution-${profile.login}`,
          JSON.stringify(updated),
        );
      }
    } catch {
      setRoadmap("Erro ao gerar análise de empregabilidade.");
    } finally {
      setLoadingExtraAI(false);
    }
  };

  /* ---------- STATES ---------- */

  if (loadingProfile || loadingRelations) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="error-state">
        <h3>Erro ao buscar dados</h3>
        <button onClick={() => navigate("/")}>Voltar</button>
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="analysis-container">
      <button onClick={() => navigate("/")} className="user-link">
        <ArrowLeft size={16} /> Voltar
      </button>

      {profile && (
        <>
          <div className="profile-summary">
            <img src={profile.avatar_url} alt={profile.login} />
            <div>
              <h2>{profile.name || profile.login}</h2>
              <p>@{profile.login}</p>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard label="Seguidores" value={profile.followers} />
            <StatCard label="Seguindo" value={profile.following} />
            <StatCard
              label="Não seguem de volta"
              value={nonFollowersCount}
              highlight
            />
          </div>

          {/* ---------- ACTION BUTTONS ---------- */}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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

          {/* ---------- SCORE BADGE ---------- */}

          {employabilityScore !== null && (
            <div className="score-badge">
              Empregabilidade: {employabilityScore}/10
            </div>
          )}

          {/* ---------- ROADMAP ---------- */}

          {roadmap && (
            <div className="ai-result-box animate-fade-in">
              <ReactMarkdown>{roadmap}</ReactMarkdown>
            </div>
          )}

          {/* ---------- GRAPH ---------- */}

          {showEvolution && evolutionData.length > 0 && (
            <div style={{ width: "100%", height: 260, marginTop: 24 }}>
              <ResponsiveContainer>
                <LineChart data={evolutionData}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line
                    dataKey="score"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ---------- IA MODAL ---------- */}

      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div
            className="ai-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Análise de Perfil com IA 🤖</h2>

            <div className="ai-options">
              <button onClick={() => setAiMode("friendly")}>🥰 Amigável</button>
              <button onClick={() => setAiMode("liar")}>🤥 Mentiroso</button>
              <button onClick={() => setAiMode("roast")}>🔥 Recrutador</button>
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
    </div>
  );
};
