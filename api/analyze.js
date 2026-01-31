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
    let apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) apiKey = apiKey.trim().replace(/^["']|["']$/g, "");

    if (!apiKey) {
      console.error("❌ API Key não encontrada!");
      return res.status(500).json({ error: "Chave API não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "Dados do perfil ausentes" });
    }

    let promptInstruction = "Aja como um analista técnico neutro.";
    if (aiMode === "friendly")
      promptInstruction = "Seja um mentor gentil e use emojis 🥰.";
    else if (aiMode === "liar")
      promptInstruction = "Seja um influencer mentiroso e exagerado 🤥.";
    else if (aiMode === "roast")
      promptInstruction = "Seja um recrutador brutal e sarcástico 🔥.";

    const prompt = `
      Analise este perfil JSON do GitHub:
      ${JSON.stringify(profileData)}
      
      Instrução de Personalidade: ${promptInstruction}
      
      Responda em Português do Brasil usando Markdown.
    `;

    // ✅ USANDO GEMINI-PRO
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro da API Gemini:", errorData);
      throw new Error(`API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("❌ Erro na API:", error);
    return res.status(500).json({
      error: error.message || "Erro interno do servidor",
    });
  }
}
