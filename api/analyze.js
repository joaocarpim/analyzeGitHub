export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    console.log("🔑 GROQ_API_KEY existe?", !!apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: "API Key não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "profileData ausente" });
    }

    let personality = "Seja um analista técnico e profissional.";
    if (aiMode === "friendly") personality = "Seja amigável e motivador.";
    if (aiMode === "liar") personality = "Exagere positivamente tudo.";
    if (aiMode === "roast") personality = "Seja crítico e direto.";

    const MODEL = "llama-3.1-8b-instant";

    console.log("🧠 MODELO GROQ EM USO:", MODEL);

    const prompt = `
${personality}

Analise o perfil GitHub abaixo e entregue:
- Resumo
- Pontos fortes
- Pontos fracos
- Sugestões de melhoria

Dados:
${JSON.stringify(profileData, null, 2)}

Responda em PT-BR e Markdown.
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
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ ERRO GROQ:", data);
      return res.status(500).json({
        error: "Erro na API Groq",
        details: data,
      });
    }

    return res.status(200).json({
      result: data.choices[0].message.content,
    });
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
