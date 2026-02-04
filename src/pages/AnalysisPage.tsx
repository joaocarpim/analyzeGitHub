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

/* ================= LÓGICA DE PROMPTS ================= */

const generateAnalysisPrompt = (mode: AIMode) => {
  // Configuração da Personalidade
  let toneInstruction = "";

  switch (mode) {
    case "friendly":
      toneInstruction = `
        - **PERSONA**: Você é um amigo dev muito gente boa. 
        - **TOM**: Use MUITOS emojis 😊, linguagem simples e acessível. Evite termos técnicos difíceis ("deploy", "CI/CD") ou explique-os de forma fofa.
        - **FOCO**: Seja motivador, mesmo se o código for ruim. Diga que "o importante é tentar".
      `;
      break;
    case "liar":
      toneInstruction = `
        - **PERSONA**: Você é um humorista de stand-up sarcástico e exagerado.
        - **TOM**: Seja engraçado, irônico e "mentiroso" no sentido de fazer piada com os dados.
        - **FOCO**: Se tiver poucos commits, diga que é "estratégia de silêncio". Se tiver muitos, diga que a pessoa "não tem vida social". Invente títulos engraçados para a nota. O objetivo é o entretenimento.
      `;
      break;
    case "roast":
      toneInstruction = `
        - **PERSONA**: Você é um Recrutador Técnico Sênior extremamente exigente e frio.
        - **TOM**: Profissional, direto, crítico e realista. Sem "parabéns" desnecessários.
        - **FOCO**: Julgue a qualidade dos commits, a falta de documentação e a relevância real dos projetos para o mercado.
      `;
      break;
  }

  return `
    ${toneInstruction}

    **OBJETIVO: RAIO-X DO PERFIL ATUAL (Passado e Presente)**
    Analise os dados fornecidos (Bio, Repositórios, Linguagens, Datas).

    **ESTRUTURA DA RESPOSTA (Use Markdown):**

    1. 📊 **Análise de Métricas**:
       - **Commits**: Analise a frequência (baseado nas datas de update). São consistentes ou esporádicos? Parecem commits de qualidade ou só "update readme"?
       - **Projetos e Techs**: Quais tecnologias dominam? Há diversidade ou é mono-stack?
       - **Relevância**: Tem Estrelas? Tem Forks? O perfil tem impacto na comunidade ou é "fantasma"?

    2. 🏆 **Nota do Perfil (0 a 10)**:
       - Dê uma nota baseada *apenas* no que existe hoje.
       - Justifique a nota em 1 frase curta (no tom da persona escolhida).

    3. 🕵️ **Veredito Final**:
       - Resuma a impressão que esse perfil passa para quem visita hoje.
       - Cite 1 ponto forte e 1 ponto fraco CRÍTICO que precisa de atenção imediata (ex: "Falta Readme", "Projetos antigos").

    **REGRA:** NÃO CRIE PLANO DE ESTUDOS. NÃO DÊ IDEIAS DE PROJETOS FUTUROS. FALE DO QUE JÁ EXISTE.
  `;
};

const ROADMAP_PROMPT = `
  Você é um Mentor de Carreira de Elite.
  O usuário quer um **PLANO DE AÇÃO** para o futuro.
  
  Estruture a resposta assim:
  
  1. 🎯 **Nível Identificado**: (Júnior, Pleno, etc, baseado na stack atual).
  
  2. 🗺️ **Roadmap de 3 Meses (O que fazer agora)**:
     - Mês 1: Foco técnico (o que falta aprender).
     - Mês 2: Foco prático (ferramentas).
     - Mês 3: Consolidação.
  
  3. 💡 **Sugestão de Projetos (Para melhorar o portfólio)**:
     - Dê 2 ideias de projetos ORIGINAIS que usam a tecnologia que o usuário já sabe, mas elevando o nível.
     
  4. 🚀 **Dica de Ouro**: Como se destacar em entrevistas.
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

  const openAnalysisModal = () => {
    setModalType("analysis");
    setAiResult("");
    setShowAIModal(true);
  };

  const openRoadmapModal = () => {
    setModalType("roadmap");
    setAiResult("");
    setShowAIModal(true);
  };

  const handleGenerate = async () => {
    if (!profile || !repos) return;
    setAiLoading(true);
    setAiResult("");

    try {
      let prompt = "";
      let modeToSend = aiMode;

      if (modalType === "analysis") {
        prompt = generateAnalysisPrompt(aiMode);
      } else {
        // Roadmap usa tom padrão "Mentor Amigável/Sério"
        modeToSend = "friendly";
        prompt = ROADMAP_PROMPT;
      }

      const result = await aiService.generateFeedback({
        profile,
        repos,
        mode: modeToSend,
        customPrompt: prompt,
      });

      setAiResult(result);

      // (Opcional) Salvar score no gráfico se a resposta contiver nota
      if (modalType === "analysis") {
        // Se quiser extrair a nota da análise para o gráfico, a lógica iria aqui
      }
    } catch {
      setAiResult("Ocorreu um erro ao gerar a resposta. Tente novamente.");
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
          <span>Roteiro & Ideias</span>
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

      {/* ================= MODAL ÚNICO ================= */}
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
                <>
                  <h2 style={{ color: "#ec4899" }}>✨ Análise de Perfil</h2>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "14px",
                      marginTop: "8px",
                    }}
                  >
                    Descubra como seu perfil é visto hoje: qualidade dos
                    commits, techs, estrelas e uma nota geral.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ color: "#8b5cf6" }}>🗺️ Roteiro & Ideias</h2>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "14px",
                      marginTop: "8px",
                    }}
                  >
                    Receba um plano de estudos personalizado e ideias de
                    projetos para evoluir sua carreira.
                  </p>
                </>
              )}
            </div>

            {/* SELEÇÃO DE MODO (Apenas para Análise) */}
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

            {/* BOX DE SEGURANÇA (Antes do botão de gerar) */}
            <div className="security-box" style={{ marginBottom: "16px" }}>
              <Lock size={14} />
              <span>
                Seus dados são processados em tempo real pela IA e descartados
                após a análise. Nada é salvo.
              </span>
            </div>

            <button
              className={modalType === "analysis" ? "btn-ai" : "btn-purple"}
              style={{ width: "100%", minHeight: "50px", flexDirection: "row" }}
              onClick={handleGenerate}
              disabled={aiLoading}
            >
              {aiLoading
                ? "Processando..."
                : modalType === "analysis"
                  ? "Gerar Análise"
                  : "Criar Roteiro"}
            </button>

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
