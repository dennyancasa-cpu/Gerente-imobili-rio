import { GoogleGenAI } from "@google/genai";

export const getDriveAgentResponse = async (diagnostics: any, userMessage?: string) => {
  // Check for both possible secret names
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  
  console.log("Gemini Key detected:", apiKey ? "Yes (starts with " + apiKey.substring(0, 5) + "...)" : "No");

  // Check if the key is missing or is the placeholder
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ **Chave de API não encontrada.**\n\nPara que eu possa te ajudar, você precisa configurar sua chave do Gemini:\n1. Clique no ícone de **Secrets** (ao lado de 'Versions') no topo do AI Studio.\n2. Adicione uma nova chave chamada `MY_GEMINI_KEY` com o seu valor da API do Google AI.\n3. Clique em **Apply changes**.\n4. Recarregue o aplicativo.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      Você é o "Assistente de Integração ImobiManager", um agente especializado em ajudar o usuário a conectar o Google Drive ao aplicativo.
      
      CONTEXTO TÉCNICO ATUAL:
      ${JSON.stringify(diagnostics, null, 2)}
      
      SUA MISSÃO:
      1. Analisar os dados técnicos acima.
      2. Explicar ao usuário, de forma simples e amigável em Português, por que a conexão pode estar falhando.
      3. Se o usuário estiver em um IFRAME (isIframe: true), ele DEVE clicar no botão laranja "Abrir App em Nova Aba". O Google bloqueia o login dentro do AI Studio.
      4. Se o usuário já estiver em uma aba separada (isIframe: false) mas não estiver conectado:
         - Peça para ele clicar no botão verde **"Conectar Agora"**.
         - Se ele já clicou e deu erro, peça para ele verificar se a **Redirect URI** (que ele pode copiar no botão azul abaixo) está cadastrada exatamente igual no Google Cloud Console.
      5. Se houver um erro de "sem tokens na sessão", explique que o navegador pode estar bloqueando cookies e sugira usar o botão "Testar Conexão" ou abrir em uma nova aba.
      6. Se estiver conectado, parabenize o usuário e explique que agora os recibos serão salvos automaticamente.
      7. Seja conciso e direto. Use emojis para ser amigável.
      
      DIRETRIZES:
      - Se isIframe for true, FOQUE em dizer para abrir em nova aba.
      - Se isIframe for false, FOQUE em dizer para clicar em "Conectar Agora".
      - Nunca peça a chave de API ao usuário.
      - Se o ID de sessão estiver mudando, é um sinal claro de bloqueio de cookies de terceiros.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage || "Analise meu status atual e me dê uma orientação.",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Não consegui gerar uma resposta. Tente novamente em instantes.";
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    if (error.message?.includes("API key not valid")) {
      return "❌ **Chave de API Inválida.**\n\nA chave configurada nos 'Secrets' parece estar incorreta ou expirada. Por favor, verifique-a nas configurações.";
    }
    
    if (error.message?.includes("User location is not supported")) {
      return "❌ **Localização não suportada.**\n\nO Gemini ainda não está disponível em todas as regiões. Tente usar uma VPN ou verifique as restrições do Google AI.";
    }

    return `Tive um problema técnico ao acessar a inteligência artificial: ${error.message || "Erro desconhecido"}. Verifique sua conexão e tente novamente. 😕`;
  }
};
