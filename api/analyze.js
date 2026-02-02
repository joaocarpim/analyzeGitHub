export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ GROQ_API_KEY não configurada");
      return res.status(500).json({ error: "API Key não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData)
      return res.status(400).json({ error: "profileData ausente" });

    // 🎭 PERSONALIDADE
    let personality = `
Tom profissional, técnico e honesto.
`;

    if (aiMode === "friendly") {
      personality = `
Tom amigável, encorajador e motivador.
Use emojis com moderação 😊
`;
    }

    if (aiMode === "liar") {
      personality = `
Tom exagerado, inflado e claramente otimista.
`;
    }

    if (aiMode === "roast") {
      personality = `
Você é um recrutador experiente, direto e impaciente.
Avalie como se tivesse apenas 30 segundos.
Seja brutal, sarcástico e extremamente honesto.
`;
    }

    // 🔥 PROMPT FINAL APLICADO
    const prompt = `
Você é um **Tech Recruiter Sênior e Mentor de Carreira em Software**,
especialista em avaliar perfis públicos do GitHub.

Objetivo:
Avaliar este perfil como se fosse um candidato real ao mercado.

Regras:
- Seja tecnicamente honesto
- Não invente informações
- Baseie-se apenas nos dados fornecidos
- Use exemplos práticos

Critérios de avaliação:
- Qualidade dos projetos
- Consistência de commits
- Clareza e organização
- Diversidade técnica
- Potencial de crescimento

${personality}

Formato da resposta (OBRIGATÓRIO):

## Visão Geral do Perfil
## Pontos Fortes Técnicos
## Pontos de Atenção / Fraquezas
## Sugestões Práticas (próximos 30 dias)
## Roadmap Personalizado (3–6 meses)
## Score de Empregabilidade (0 a 10) com justificativa

Dados do perfil:
${JSON.stringify(profileData, null, 2)}

Responda em PT-BR usando Markdown.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Erro Groq:", error);
      return res.status(500).json({
        error: "Erro na API Groq",
        details: error,
      });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    return res.status(200).json({
      result: text,
    });
  } catch (err) {
    console.error("❌ Erro geral:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}
