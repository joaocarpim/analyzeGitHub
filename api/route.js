import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// IMPORTANTE: No Next.js App Router, a função DEVE se chamar POST
export async function POST(request) {
  try {
    // 1. Pega a chave da Vercel ou do .env local
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave de API não configurada na Vercel." },
        { status: 500 },
      );
    }

    // 2. Lê os dados que o Front-end mandou
    // Atenção: No App Router usa-se request.json(), não req.body
    const { profile, repos, mode } = await request.json();

    if (!profile) {
      return NextResponse.json(
        { error: "Dados do perfil não chegaram no servidor." },
        { status: 400 },
      );
    }

    // 3. Configura o Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 4. Define a personalidade baseada no 'mode' recebido
    let promptInstruction = "Aja como um analista técnico neutro.";

    if (mode === "friendly") {
      promptInstruction =
        "Aja como um mentor de carreira Senior muito gentil e motivador. Use emojis 🥰.";
    } else if (mode === "liar") {
      promptInstruction =
        "Aja como um 'Influencer de LinkedIn' exagerado e mentiroso. Aumente tudo. Se o código for ruim, diga que é 'inovação disruptiva'. 🤥";
    } else if (mode === "roast") {
      promptInstruction =
        "Aja como um recrutador Senior impaciente e 'savage'. Dê um choque de realidade. Critique a bio e a falta de projetos reais. 🔥";
    }

    // 5. Cria o Prompt
    const prompt = `
      Analise este perfil JSON do GitHub:
      DADOS DO USUÁRIO: ${JSON.stringify(profile)}
      
      PRINCIPAIS REPOSITÓRIOS: ${JSON.stringify(repos ? repos.slice(0, 5) : [])}
      
      SUA PERSONALIDADE: ${promptInstruction}
      
      INSTRUÇÕES:
      - O feedback deve ser em Português do Brasil.
      - Use Markdown (negrito, listas, títulos).
      - Seja direto e reaja aos dados fornecidos.
    `;

    // 6. Gera a resposta
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 7. Retorna para o Frontend
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("Erro no Backend:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor: " + error.message },
      { status: 500 },
    );
  }
}
