export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // --------------------
  // CORS
  // --------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // --------------------
    // API KEY
    // --------------------
    let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      apiKey = apiKey.trim().replace(/^['"]|['"]$/g, "");
    }

    if (!apiKey) {
      console.error("❌ API Key não configurada");
      return res.status(500).json({
        error: "API Key do Gemini não configurada",
      });
    }

    // --------------------
    // BODY
    // --------------------
    const { profileData, aiMode } = req.body;

    if (!profileData || typeof profileData !== "object") {
      return res.status(400).json({
        error: "profileData ausente ou inválido",
      });
    }

    // --------------------
    // PERSONALIDADE DA IA
    // --------------------
    let personality = "Aja como um analista técnico neutro e profissional.";

    if (aiMode === "friendly") {
      personality =
        "Aja como um mentor amigável, positivo e construtivo. Use emojis moderadamente 😊.";
    } else if (aiMode === "liar") {
      personality =
        "Aja como um influencer exagerado, otimista demais e pouco crítico 🤥✨.";
    } else if (aiMode === "roast") {
      personality =
        "Aja como um recrutador técnico exigente, direto e sarcástico 🔥.";
    }

    // --------------------
    // PROMPT FINAL
    // --------------------
    const prompt = `
Você receberá dados públicos de um perfil do GitHub em formato JSON.

Objetivo:
- Avaliar o perfil tecnicamente
- Identificar pontos fortes
- Identificar pontos fracos
- Sugerir melhorias realistas para carreira e projetos

${personality}

Dados do perfil:
${JSON.stringify(profileData, null, 2)}

Regras:
- Responda em Português do Brasil
- Use Markdown
- Não invente dados
- Seja claro, estruturado e útil
`;

    // --------------------
    // GEMINI REQUEST (MODELO QUE FUNCIONA)
    // --------------------
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro Gemini:", errorData);

      return res.status(500).json({
        error: "Erro ao gerar análise com IA",
        details: errorData,
      });
    }

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("❌ Resposta inválida da IA:", data);
      return res.status(500).json({
        error: "Resposta inválida da IA",
      });
    }

    // --------------------
    // SUCESSO
    // --------------------
    return res.status(200).json({
      result: text,
    });
  } catch (error) {
    console.error("❌ Erro interno:", error);

    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
}
