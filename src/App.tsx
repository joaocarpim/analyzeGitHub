import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  Github,
  Users,
  UserPlus,
  UserMinus,
  ArrowLeft,
  Sparkles,
  X,
  Eye,
  EyeOff,
  Lock,
  Zap,
} from "lucide-react";
import "./App.css";

const GITHUB_API_BASE = "https://api.github.com";

// --- Types ---
interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface UserProfile extends GitHubUser {
  name: string;
  bio: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  location: string;
  company: string;
  blog: string;
}

interface Repo {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
}

// --- Fetch Functions ---
const fetchAllPages = async (url: string): Promise<GitHubUser[]> => {
  let allData: GitHubUser[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(`${url}?per_page=${perPage}&page=${page}`);
    if (!response.ok) {
      if (response.status === 403) throw new Error("RATE_LIMIT");
      if (response.status === 404) throw new Error("NOT_FOUND");
      throw new Error("GENERIC_ERROR");
    }
    const data: GitHubUser[] = await response.json();
    if (data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < perPage) break;
    page++;
  }
  return allData;
};

const fetchProfile = async (username: string): Promise<UserProfile> => {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}`);
  if (!response.ok) {
    if (response.status === 403) throw new Error("RATE_LIMIT");
    throw new Error("NOT_FOUND");
  }
  return response.json();
};

const fetchRepos = async (username: string): Promise<Repo[]> => {
  const response = await fetch(
    `${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=10`,
  );
  if (!response.ok) return [];
  return response.json();
};

// --- Components ---

function AnalysisPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "nonFollowers" | "fans" | "mutuals"
  >("nonFollowers");
  const [filterText, setFilterText] = useState("");

  // AI States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMode, setAiMode] = useState<"friendly" | "liar" | "roast">(
    "friendly",
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  // API Key & Security UX States
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("gemini_key") || "",
  );
  const [showKey, setShowKey] = useState(false);

  // 1. Queries
  const {
    data: profile,
    error: profileError,
    isLoading: loadingProfile,
  } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfile(username!),
    enabled: !!username,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: repos } = useQuery({
    queryKey: ["repos", username],
    queryFn: () => fetchRepos(username!),
    enabled: !!username,
    refetchOnWindowFocus: false,
  });

  const {
    data: relationshipData,
    error: relationshipError,
    isLoading: loadingRelationships,
  } = useQuery({
    queryKey: ["relationships", username],
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        fetchAllPages(`${GITHUB_API_BASE}/users/${username}/followers`),
        fetchAllPages(`${GITHUB_API_BASE}/users/${username}/following`),
      ]);
      return { followers, following };
    },
    enabled: !!profile,
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 2. Logic
  const analyzedData = useMemo(() => {
    if (!relationshipData) return { nonFollowers: [], fans: [], mutuals: [] };
    const { followers, following } = relationshipData;
    const followerLogins = new Set(followers.map((u) => u.login.toLowerCase()));
    const followingLogins = new Set(
      following.map((u) => u.login.toLowerCase()),
    );
    return {
      nonFollowers: following.filter(
        (u) => !followerLogins.has(u.login.toLowerCase()),
      ),
      fans: followers.filter(
        (u) => !followingLogins.has(u.login.toLowerCase()),
      ),
      mutuals: following.filter((u) =>
        followerLogins.has(u.login.toLowerCase()),
      ),
    };
  }, [relationshipData]);

  const displayedUsers = useMemo(() => {
    const list = analyzedData[activeTab];
    if (!filterText) return list;
    return list.filter((u) =>
      u.login.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [analyzedData, activeTab, filterText]);

  // 3. AI Generation Function
  const generateFeedback = async () => {
    if (!apiKey) {
      alert("Por favor, insira uma chave de API do Google Gemini.");
      return;
    }

    // Save locally for better UX
    localStorage.setItem("gemini_key", apiKey);

    setAiLoading(true);
    setAiResult("");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const profileData = {
        name: profile?.name,
        bio: profile?.bio,
        stats: {
          followers: profile?.followers,
          following: profile?.following,
          repos: profile?.public_repos,
        },
        location: profile?.location,
        company: profile?.company,
        created_at: profile?.created_at,
        recent_repos: repos?.map((r) => ({
          name: r.name,
          lang: r.language,
          desc: r.description,
          stars: r.stargazers_count,
        })),
      };

      let promptInstruction = "";
      if (aiMode === "friendly") {
        promptInstruction =
          "Aja como um mentor de carreira Senior muito gentil e motivador. Dê feedback construtivo, elogie os pontos fortes e sugira melhorias com carinho. Use emojis.";
      } else if (aiMode === "liar") {
        promptInstruction =
          "Aja como um 'Influencer de LinkedIn' exagerado e meio mentiroso. Aumente tudo o que ver no perfil. Se o código for ruim, diga que é 'inovação disruptiva'. Use jargões corporativos vazios (mindset, synergy, deep dive). Seja engraçado e bajulador.";
      } else if (aiMode === "roast") {
        promptInstruction =
          "Aja como um recrutador Senior impaciente e 'savage' (brutalmente honesto). Dê um choque de realidade ('Acorda pra vida'). Critique a bio, a proporção de seguidores, as linguagens usadas e a falta de projetos reais. Seja duro, mas profissionalmente sarcástico.";
      }

      const prompt = `
        Analise este perfil JSON do GitHub: ${JSON.stringify(profileData)}
        
        ${promptInstruction}
        
        O feedback deve ser completo, formatado em Markdown com títulos, tópicos e uma conclusão. Fale em Português do Brasil.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResult(response.text());
    } catch (error) {
      console.error(error);
      setAiResult(
        "**Erro:** Falha ao gerar análise. Verifique se sua chave API está correta e se possui cotas gratuitas.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  if (loadingProfile || loadingRelationships) {
    return (
      <div className="animate-fade-in">
        <div
          className="skeleton skeleton-text"
          style={{ width: "200px", margin: "0 auto 20px", height: "40px" }}
        />
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton skeleton-card"
              style={{ height: "100px" }}
            />
          ))}
        </div>
        <div className="users-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  const error = profileError || relationshipError;
  if (error) {
    const isRateLimit = error.message === "RATE_LIMIT";
    return (
      <div className="error-state">
        <span className="state-icon">{isRateLimit ? "⏳" : "⚠️"}</span>
        <h3 className="state-title">
          {isRateLimit ? "Limite da API Excedido" : "Erro ao buscar dados"}
        </h3>
        <p className="state-desc">
          {isRateLimit
            ? "Você atingiu o limite de requisições da API pública do GitHub (60/hora). Aguarde alguns minutos."
            : "Verifique se o usuário existe e tente novamente."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn btn-primary"
          style={{ marginTop: 20 }}
        >
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
          cursor: "pointer",
          background: "none",
          border: "none",
          fontSize: 16,
        }}
      >
        <ArrowLeft size={16} style={{ display: "inline", marginRight: 5 }} />{" "}
        Voltar
      </button>

      {/* Profile Header */}
      {profile && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{profile.followers}</div>
              <div className="stat-label">Seguidores</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.following}</div>
              <div className="stat-label">Seguindo</div>
            </div>
            <div
              className="stat-card"
              style={{ borderColor: "var(--accent-primary)" }}
            >
              <div className="stat-value">
                {analyzedData.nonFollowers.length}
              </div>
              <div className="stat-label">Não seguem de volta</div>
            </div>
          </div>

          {/* AI Trigger */}
          <div className="ai-trigger-container">
            <button className="btn btn-ai" onClick={() => setShowAIModal(true)}>
              <Sparkles size={18} />
              Gerar Feedback com IA
            </button>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === "nonFollowers" ? "active" : ""}`}
          onClick={() => setActiveTab("nonFollowers")}
        >
          <UserMinus size={18} />
          Não seguem de volta
          <span className="badge">{analyzedData.nonFollowers.length}</span>
        </button>
        <button
          className={`tab ${activeTab === "fans" ? "active" : ""}`}
          onClick={() => setActiveTab("fans")}
        >
          <UserPlus size={18} />
          Fãs
          <span className="badge">{analyzedData.fans.length}</span>
        </button>
        <button
          className={`tab ${activeTab === "mutuals" ? "active" : ""}`}
          onClick={() => setActiveTab("mutuals")}
        >
          <Users size={18} />
          Mútuos
          <span className="badge">{analyzedData.mutuals.length}</span>
        </button>
      </div>

      {/* Filter */}
      <div className="filter-section">
        <input
          type="text"
          className="search-input"
          placeholder={`Filtrar lista de ${activeTab === "nonFollowers" ? "quem não segue" : activeTab}...`}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="users-grid">
        {displayedUsers.map((user) => (
          <a
            key={user.id}
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="user-card"
          >
            <img
              src={user.avatar_url}
              alt={user.login}
              className="user-avatar"
            />
            <div>
              <div className="user-name">{user.login}</div>
              <div className="user-login">@{user.login}</div>
            </div>
          </a>
        ))}
      </div>

      {/* AI Modal */}
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

            {/* Security Notice */}
            {!localStorage.getItem("gemini_key") && !apiKey && (
              <div
                style={{
                  marginBottom: 20,
                  padding: 16,
                  background: "rgba(123, 97, 255, 0.1)",
                  borderRadius: 12,
                  border: "1px solid var(--accent-secondary)",
                  fontSize: 14,
                  display: "flex",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <Lock
                  size={20}
                  style={{
                    color: "var(--accent-secondary)",
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      marginBottom: 4,
                      color: "var(--text-primary)",
                    }}
                  >
                    Segurança Primeiro
                  </strong>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      display: "block",
                    }}
                  >
                    Sua chave é armazenada{" "}
                    <strong>apenas no seu navegador</strong> (LocalStorage).
                    Nenhuma informação é enviada para servidores externos além
                    da própria API do Google.
                  </span>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-primary)",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Obter chave gratuita <Sparkles size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Google Gemini API Key
              </label>

              {/* Secure Input */}
              <div style={{ position: "relative", marginBottom: 20 }}>
                <input
                  type={showKey ? "text" : "password"}
                  className="api-key-input"
                  placeholder="Cole sua chave aqui (começa com AIza...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ paddingRight: 50, marginBottom: 0 }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  type="button"
                >
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Format Validation */}
              {apiKey && !apiKey.startsWith("AIza") && (
                <p
                  style={{
                    color: "var(--accent-danger)",
                    fontSize: 12,
                    marginTop: -12,
                    marginBottom: 16,
                  }}
                >
                  ⚠️ Esta chave parece inválida. Chaves do Google geralmente
                  começam com "AIza".
                </p>
              )}

              <p
                style={{
                  marginBottom: 8,
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                Escolha a personalidade da análise:
              </p>
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
                style={{ width: "100%", marginBottom: 20 }}
                onClick={generateFeedback}
                disabled={aiLoading || !apiKey}
              >
                {aiLoading ? "Analisando seu perfil..." : "Gerar Feedback"}
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
}

// --- LANDING PAGE (PROFISSIONAL) ---
function HomePage() {
  const [inputUser, setInputUser] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser.trim()) {
      navigate(`/analyze/${inputUser}`);
    }
  };

  return (
    <div className="landing-page animate-fade-in">
      {/* Hero Section */}
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
          receba uma mentoria de carreira (ou um choque de realidade) com nossa
          Inteligência Artificial.
        </p>

        {/* Hero Search */}
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
            100% Seguro. Não pedimos sua senha.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon-box blue">
            <Users size={24} />
          </div>
          <h3>Gestão de Conexões</h3>
          <p>
            Visualize instantaneamente quem você segue mas não te segue de
            volta. Limpe seu feed e foque em conexões mútuas.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box purple">
            <Zap size={24} />
          </div>
          <h3>Feedback de IA</h3>
          <p>
            Nossa IA analisa sua bio, repositórios e stacks para gerar um
            feedback de carreira em 3 níveis de personalidade.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box green">
            <Github size={24} />
          </div>
          <h3>Dados em Tempo Real</h3>
          <p>
            Conexão direta com a API do GitHub. Sem armazenamento de dados
            sensíveis. Rápido, transparente e seguro.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Desenvolvido para devs que buscam evoluir.</p>
      </footer>
    </div>
  );
}

// --- MAIN LAYOUT ---
function App() {
  return (
    <BrowserRouter>
      <div className="bg-effect">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="app-container">
        <header className="header">
          <div className="logo" onClick={() => (window.location.href = "/")}>
            <div className="logo-icon">
              <Github />
            </div>
            <h1 className="logo-text">Followers Analyzer</h1>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze/:username" element={<AnalysisPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
export default App;
