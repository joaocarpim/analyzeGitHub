import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Chave API não configurada" });
    }

    const { profileData, aiMode } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: "Dados do perfil ausentes" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // --- NOME DO MODELO ---
    // Usando a versão exata '001' que é a mais compatível atualmente.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("❌ Erro na API:", error);
    return res.status(500).json({
      error: error.message || "Erro interno do servidor",
    });
  }
}
