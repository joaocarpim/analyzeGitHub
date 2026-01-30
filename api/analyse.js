import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS Headers
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
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Chave de API não configurada." });
  }

  try {
    // CORREÇÃO AQUI: Extraindo 'profile', 'repos' e 'mode' igual ao frontend manda
    const { profile, repos, mode } = req.body;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let promptInstruction = "";
    if (mode === "friendly") {
      promptInstruction =
        "Aja como um mentor de carreira Senior muito gentil e motivador. Dê feedback construtivo, elogie os pontos fortes e sugira melhorias com carinho. Use emojis.";
    } else if (mode === "liar") {
      promptInstruction =
        "Aja como um 'Influencer de LinkedIn' exagerado e meio mentiroso. Aumente tudo o que ver no perfil. Se o código for ruim, diga que é 'inovação disruptiva'. Use jargões corporativos vazios. Seja engraçado.";
    } else if (mode === "roast") {
      promptInstruction =
        "Aja como um recrutador Senior impaciente e 'savage' (brutalmente honesto). Dê um choque de realidade ('Acorda pra vida'). Critique a bio, a proporção de seguidores e linguagens. Seja duro, mas sarcástico.";
    }

    const prompt = `
      Analise este perfil JSON do GitHub: ${JSON.stringify(profile)}
      E estes repositórios: ${JSON.stringify(repos)}
      
      ${promptInstruction}
      
      O feedback deve ser completo, formatado em Markdown com títulos, tópicos e uma conclusão. Fale em Português do Brasil.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    return res.status(500).json({ error: "Falha ao processar com a IA." });
  }
}
