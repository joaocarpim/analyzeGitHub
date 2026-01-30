import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  maxDuration: 60, // Permite que a IA demore até 60s sem dar timeout (Vercel Pro/Hobby)
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. Configura permissões (CORS) para evitar erros de bloqueio
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Se for apenas uma verificação de "ping" do navegador, responde OK
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Garante que só aceitamos POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido (Use POST)" });
  }

  try {
    // 3. Pega a chave da API
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Chave de API não configurada na Vercel." });
    }

    // 4. No 'Pages Router', os dados vêm em req.body diretamente
    const { profile, repos, mode } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "Perfil não encontrado no envio." });
    }

    // 5. Configura o Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 6. Define a personalidade
    let promptInstruction = "Aja como um analista técnico neutro.";
    if (mode === "friendly")
      promptInstruction =
        "Aja como um mentor Senior gentil e motivador. Use emojis 🥰.";
    else if (mode === "liar")
      promptInstruction =
        "Aja como um 'Influencer de LinkedIn' exagerado e mentiroso. 🤥";
    else if (mode === "roast")
      promptInstruction =
        "Aja como um recrutador 'savage'. Dê um choque de realidade. 🔥";

    // 7. Cria o Prompt
    const prompt = `
      Analise este perfil JSON do GitHub:
      DADOS: ${JSON.stringify(profile)}
      REPOS: ${JSON.stringify(repos ? repos.slice(0, 5) : [])}
      
      PERSONALIDADE: ${promptInstruction}
      
      Responda em Português do Brasil usando Markdown.
    `;

    // 8. Gera o conteúdo
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error: any) {
    console.error("Erro no Servidor:", error);
    return res.status(500).json({ error: "Erro interno: " + error.message });
  }
}
