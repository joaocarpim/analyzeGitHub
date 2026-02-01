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
      console.error("❌ GEMINI_API_KEY não configurada");
      return res.status(500).json({
        error: "Chave da API Gemini não configurada",
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
    // PERSONALIDADE
    // --------------------
    let personality =
      "Aja como um analista técnico neutro, objetivo e profissional.";

    if (aiMode === "friendly") {
      personality =
        "Aja como um mentor amigável, encorajador e positivo. Use emojis moderadamente 😊.";
    } else if (aiMode === "liar") {
      personality =
        "Aja como um influencer exagerado, sensacionalista e pouco confiável 🤥🔥.";
    } else if (aiMode === "roast") {
      personality =
        "Aja como um recrutador técnico crítico, direto e sarcástico 🔥.";
    }

    // --------------------
    // PROMPT
    // --------------------
    const prompt = `
Você receberá dados públicos de um perfil do GitHub em formato JSON.

Objetivo:
- Avaliar o perfil tecnicamente
- Identificar pontos fortes
- Identificar pontos fracos
- Sugerir melhorias realistas

${personality}

Dados do perfil:
${JSON.stringify(profileData, null, 2)}

Regras:
- Responda em Português do Brasil
- Use Markdown
- Não invente dados
- Seja claro e estruturado
`;

    // --------------------
    // GEMINI REQUEST (CORRETO)
    // --------------------
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 900,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro Gemini:", errorData);

      return res.status(500).json({
        error: "Erro ao gerar resposta da IA",
        details: errorData,
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("❌ Resposta inválida:", data);
      return res.status(500).json({
        error: "Resposta inválida da IA",
      });
    }

    // --------------------
    // SUCCESS
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
