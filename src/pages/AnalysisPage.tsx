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
import "./AnalysisPage.css";

/* ================= PROMPTS DIFERENCIADOS ================= */

// Prompt 1: Análise de Perfil (Botão Rosa)
const generateAnalysisPrompt = (mode: string) => {
  return `
    Você é um especialista em análise de desenvolvedores no GitHub.
    MODO: ${mode === "roast" ? "Recrutador Brutal (Critique severamente)" : mode === "liar" ? "Mentiroso Exagerado (Elogie absurdamente)" : "Amigável e Construtivo"}.
    
    Analise este perfil com base na Bio, Repositórios e Linguagens.
    O QUE ENTREGAR:
    - Uma visão geral da "vibe" do perfil.
    - Pontos fortes técnicos aparentes.
    - Pontos fracos ou o que está faltando (ex: falta de documentação, projetos parados).
    - Conclusão rápida.

    NÃO ENTREGAR ROADMAP NESTA RESPOSTA. APENAS ANÁLISE.
  `;
};

// Prompt 2: Roteiro e Ideias (Botão Roxo)
const ROADMAP_PROMPT = `
  Você é um Mentor de Carreira Sênior Tech.
  Com base nos dados deste perfil (linguagens e projetos atuais), crie um plano de ação.
  
  O QUE ENTREGAR (Use Markdown, seja direto):
  
  1. 🎯 **Objetivo Identificado**: (Deduza o nível atual: Jr/Pleno/Senior e o foco).
  
  2. 🗺️ **Roadmap de Estudos (3 Meses)**:
     - Mês 1: O que estudar para tapar buracos.
     - Mês 2: Tecnologias para avançar.
     - Mês 3: Consolidação.
  
  3. 💡 **Ideias de Projetos para o Portfólio**:
     - Sugira 2 projetos práticos que combinem com a stack do usuário mas elevem o nível (ex: se usa React, sugira um SaaS com Next.js e Stripe).
     
  4. 🚀 **Conselho de Ouro**: Uma dica final para conseguir vaga ou clientes.
`;

type ViewMode = "followers" | "following" | "mutual" | "nonFollowers";

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
  const [modalType, setModalType] = useState<"analysis" | "roadmap" | null>(
    null,
  );
  const [aiMode, setAiMode] = useState<AIMode>("friendly");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
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

  // Handler 1: Análise de Perfil (Botão Rosa)
  const openAnalysisModal = () => {
    setModalType("analysis");
    setAiResult("");
    setShowAIModal(true);
  };

  const handleGenerateAnalysis = async () => {
    if (!profile || !repos) return;
    setAiLoading(true);
    try {
      const customPrompt = generateAnalysisPrompt(aiMode);
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: aiMode,
        customPrompt,
      });
      setAiResult(result);
    } catch {
      setAiResult("Erro ao gerar análise.");
    } finally {
      setAiLoading(false);
    }
  };

  // Handler 2: Roteiro e Projetos (Botão Roxo)
  const openRoadmapModal = () => {
    setModalType("roadmap");
    setAiResult("");
    setShowAIModal(true);
    // Dispara automaticamente ou espera clique? Vamos esperar clique para padronizar
    // handleGenerateRoadmap();
  };

  const handleGenerateRoadmap = async () => {
    if (!profile || !repos) return;
    setAiLoading(true);
    try {
      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: "friendly",
        customPrompt: ROADMAP_PROMPT,
      });
      setAiResult(result);
    } catch {
      setAiResult("Erro ao gerar roteiro.");
    } finally {
      setAiLoading(false);
    }
  };

  /* ================= RENDER ================= */

  if (loadingProfile || loadingRelations) return <SkeletonLoader />;
  if (error || !profile)
    return <div className="error-state">Perfil não encontrado</div>;

  return (
    <div className="analysis-container animate-fade-in">
      {/* 1. Botão Voltar */}
      <button className="btn-back" onClick={() => navigate("/")}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* 2. Perfil */}
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

      {/* 3. Stats Grid */}
      <div className="stats-grid">
        <StatCard label="Seguidores" value={profile.followers} />
        <StatCard label="Seguindo" value={profile.following} />
        <StatCard
          label="Não Seguem de Volta"
          value={nonFollowersCount}
          highlight
        />
      </div>

      {/* 4. Botões de Ação */}
      <div className="actions-row">
        <button className="btn-ai" onClick={openAnalysisModal}>
          <Sparkles size={20} />
          <span>Análise com IA</span>
        </button>

        <button className="btn-purple" onClick={openRoadmapModal}>
          <BrainCircuit size={20} />
          <span>Roteiro</span>
        </button>

        {evolutionData.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setShowEvolution((v) => !v)}
          >
            <TrendingUp size={20} />
          </button>
        )}
      </div>

      {/* Gráfico */}
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
              <Tooltip
                contentStyle={{
                  background: "#333",
                  border: "none",
                  color: "#fff",
                }}
              />
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

      {/* 5. Abas de Conexões */}
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
          <p
            style={{
              color: "#666",
              gridColumn: "1/-1",
              textAlign: "center",
              padding: 20,
            }}
          >
            Nenhum usuário encontrado.
          </p>
        )}
      </div>

      {/* ================= MODAL ÚNICO (DINÂMICO) ================= */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowAIModal(false)}
            >
              <X size={18} />
            </button>

            <div className="modal-header">
              {modalType === "analysis" ? (
                <h2 style={{ color: "#ec4899" }}>✨ Análise de Perfil</h2>
              ) : (
                <h2 style={{ color: "#8b5cf6" }}>🗺️ Roteiro & Ideias</h2>
              )}
            </div>

            {/* Opções só aparecem na Análise */}
            {modalType === "analysis" && (
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
            )}

            <button
              className={modalType === "analysis" ? "btn-ai" : "btn-purple"}
              style={{ width: "100%", minHeight: "50px", flexDirection: "row" }}
              onClick={
                modalType === "analysis"
                  ? handleGenerateAnalysis
                  : handleGenerateRoadmap
              }
              disabled={aiLoading}
            >
              {aiLoading
                ? "Processando..."
                : modalType === "analysis"
                  ? "Gerar Análise"
                  : "Criar Roteiro"}
            </button>

            <div className="security-box">
              <Lock size={14} />
              <span>Análise em tempo real. Nada fica salvo.</span>
            </div>

            {aiResult && (
              <div className="ai-result animate-fade-in">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
