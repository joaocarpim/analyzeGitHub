export const config = {
  maxDuration: 60,
};

// rate limit simples (memória)
let lastRequestTime = 0;

export default async function handler(req, res) {
  // ===============================
  // 🌐 CORS
  // ===============================
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
    // ===============================
    // ⏱️ RATE LIMIT (3s)
    // ===============================
    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      return res.status(429).json({
        error: "Aguarde alguns segundos antes de gerar nova análise.",
      });
    }
    lastRequestTime = now;

    // ===============================
    // 🔑 API KEY
    // ===============================
    const apiKey = process.env.GROQ_API_KEY;

    console.log("🔑 DEBUG GROQ_API_KEY existe?", !!apiKey);

    if (!apiKey) {
      console.error("❌ GROQ_API_KEY não configurada");
      return res.status(500).json({ error: "API Key não configurada" });
    }

    // ===============================
    // 📦 BODY
    // ===============================
    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "profileData ausente" });
    }

    // ===============================
    // 🧠 PERSONALIDADE
    // ===============================
    let personality = "Seja um analista técnico, direto e profissional.";
    if (aiMode === "friendly")
      personality = "Seja um mentor amigável, motivador e use emojis.";
    if (aiMode === "liar")
      personality =
        "Seja um influencer exagerado, extremamente otimista e teatral.";
    if (aiMode === "roast")
      personality = "Seja um recrutador brutal, sarcástico e sem paciência.";

    // ===============================
    // 📝 PROMPT
    // ===============================
    const prompt = `
Você é um especialista em GitHub, carreira em tecnologia e análise de perfis públicos.

${personality}

Analise os dados abaixo (JSON público do GitHub) e entregue:

1. Resumo geral do perfil
2. Pontos fortes
3. Pontos fracos
4. O que melhoraria para crescer profissionalmente
5. Impressão final (curta)

Dados do perfil:
${JSON.stringify(profileData, null, 2)}

Responda em Português do Brasil.
Use Markdown.
`;

    // ===============================
    // 🚀 GROQ API
    // ===============================
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // ✅ MODELO ATIVO E GRÁTIS
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
        }),
      },
    );

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error("❌ Erro Groq:", errorData);
      return res.status(500).json({
        error: "Erro na API Groq",
        details: errorData,
      });
    }

    const data = await groqResponse.json();
    const text = data.choices?.[0]?.message?.content;

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("❌ ERRO GERAL:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
}
