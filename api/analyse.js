import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // LOG 1: Início
  console.log("--> [API] Iniciando handler /api/analyze");

  // Configuração CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // LOG 2: Verificando Chave
  const API_KEY = process.env.GEMINI_API_KEY;
  console.log(`--> [API] Chave configurada? ${API_KEY ? "SIM" : "NÃO"}`);

  if (!API_KEY) {
    console.error("--> [API] ERRO: Variável de ambiente GEMINI_API_KEY vazia.");
    return res
      .status(500)
      .json({ error: "Configuração de servidor ausente (Chave API)." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { profileData, aiMode } = req.body;

    console.log("--> [API] Payload recebido:", {
      aiMode,
      username: profileData?.name || "Desconhecido",
    });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let promptInstruction = "";
    if (aiMode === "friendly") {
      promptInstruction =
        "Aja como um mentor de carreira Senior muito gentil e motivador. Dê feedback construtivo.";
    } else if (aiMode === "liar") {
      promptInstruction =
        "Aja como um 'Influencer de LinkedIn' exagerado e meio mentiroso. Use jargões corporativos vazios.";
    } else if (aiMode === "roast") {
      promptInstruction =
        "Aja como um recrutador Senior impaciente e 'savage' (brutalmente honesto). Dê um choque de realidade.";
    }

    const prompt = `
      Analise este perfil JSON do GitHub: ${JSON.stringify(profileData)}
      
      ${promptInstruction}
      
      O feedback deve ser completo, formatado em Markdown com títulos, tópicos e uma conclusão. Fale em Português do Brasil.
    `;

    console.log("--> [API] Enviando prompt ao Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("--> [API] Sucesso! Tamanho da resposta:", text.length);
    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("--> [API] ERRO FATAL:", error);
    return res.status(500).json({
      error: "Erro interno no servidor de IA.",
      details: error.message,
    });
  }
}
