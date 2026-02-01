export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  console.log("ENV KEYS:", Object.keys(process.env));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY não configurada");
      return res.status(500).json({ error: "API Key não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "Dados do perfil ausentes" });
    }

    // --- PERSONALIDADE DA IA ---
    let systemPrompt =
      "Você é um analista técnico de carreira em tecnologia, neutro e objetivo.";

    if (aiMode === "friendly") {
      systemPrompt =
        "Você é um mentor gentil, encorajador e positivo. Use emojis com moderação 😊.";
    } else if (aiMode === "liar") {
      systemPrompt =
        "Você é um influencer exagerado, otimista demais e claramente mentiroso 🤥.";
    } else if (aiMode === "roast") {
      systemPrompt =
        "Você é um recrutador técnico brutal, sarcástico e direto. Sem passar pano 🔥.";
    }

    const userPrompt = `
Analise o seguinte perfil público do GitHub (JSON):

${JSON.stringify(profileData, null, 2)}

Forneça:
- Avaliação geral do perfil
- Pontos fortes
- Pontos fracos
- Sugestões práticas de melhoria
- Opinião sobre maturidade profissional

Responda em Português do Brasil.
Use Markdown.
    `;

    // --- CHAMADA OPENAI (GPT-4o) ---
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro OpenAI:", errorData);
      return res.status(500).json({
        error: "Erro ao gerar análise com IA",
        details: errorData,
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: "Resposta vazia da IA" });
    }

    return res.status(200).json({ result: text });
  } catch (err) {
    console.error("❌ Erro interno:", err);
    return res.status(500).json({
      error: err.message || "Erro interno do servidor",
    });
  }
}
