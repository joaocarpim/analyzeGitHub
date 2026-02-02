export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS
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
    console.log("🔍 DEBUG ENV KEYS:", Object.keys(process.env));
    console.log("🔑 DEBUG GROQ_API_KEY existe?", !!process.env.GROQ_API_KEY);

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("❌ GROQ_API_KEY não configurada");
      return res.status(500).json({ error: "API Key não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "Dados do perfil ausentes" });
    }

    let personality = "Aja como um analista técnico profissional.";
    if (aiMode === "friendly")
      personality = "Seja um mentor amigável e encorajador, use emojis 🥰.";
    if (aiMode === "liar")
      personality =
        "Seja um influencer exagerado, elogie demais e seja claramente mentiroso 🤥.";
    if (aiMode === "roast")
      personality =
        "Seja um recrutador brutal, direto e sarcástico, sem piedade 🔥.";

    const prompt = `
Analise o seguinte perfil público do GitHub (JSON):

${JSON.stringify(profileData, null, 2)}

Instrução de personalidade:
${personality}

Regras:
- Responda em Português do Brasil
- Use Markdown
- Dê feedback técnico, carreira e presença no GitHub
`;

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
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
      const err = await groqResponse.json();
      console.error("❌ Erro Groq:", err);
      return res.status(500).json({ error: "Erro na API Groq", details: err });
    }

    const data = await groqResponse.json();
    const text = data.choices[0].message.content;

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("❌ Erro interno:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}
