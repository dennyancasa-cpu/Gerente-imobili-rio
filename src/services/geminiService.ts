import { GoogleGenAI } from "@google/genai";
import { Property, Tenant, Payment, Expense, Agreement } from "../types";

export const getDriveAgentResponse = async (diagnostics: any, userMessage?: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ **Configuração Necessária.**";
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage || "Diagnosticar conexão drive."
    });
    return response.text || "Sem resposta.";
  } catch (e: any) {
    return "Erro: " + e.message;
  }
};

export const getManagerAgentResponse = async (context: {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  authDiagnostics?: any;
}, userMessage?: string, history: {role: 'user' | 'assistant' | 'system', content: string}[] = []) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ **Configuração Necessária.**\n\nConfigure sua `GEMINI_API_KEY` nos Secrets para ativar o Assistente Inteligente.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Defining tools for @google/genai
    const tools: any = [
      {
        functionDeclarations: [
          {
            name: "create_property",
            description: "Cria um novo imóvel no sistema.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome do imóvel (Ex: Casa 01)" },
                address: { type: "string", description: "Endereço completo" },
                rentValue: { type: "number", description: "Valor do aluguel mensal" },
                status: { type: "string", enum: ["vacant", "rented", "renovation"], description: "Status inicial" }
              },
              required: ["name", "rentValue", "status"]
            }
          },
          {
            name: "create_tenant",
            description: "Cadastra um novo inquilino.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome completo do inquilino" },
                contact: { type: "string", description: "Telefone ou e-mail de contato" },
                cpf: { type: "string", description: "CPF do inquilino" }
              },
              required: ["name", "contact"]
            }
          },
          {
            name: "generate_missing_info_report",
            description: "Gera um relatório de quais inquilinos ou casas estão com dados incompletos.",
          }
        ]
      }
    ];

    const systemInstruction = `
      Você é o "Assistente IA do GERENTE IMOBILIÁRIO", um co-piloto inteligente e amigável para administradores de imóveis.
      
      SEU PAPEL:
      1. Coletar informações de forma conversacional e passo-a-passo.
      2. Quando o usuário quiser criar um Imóvel ou Inquilino, NÃO peça tudo de uma vez. Faça uma pergunta por vez.
      3. Para campos com opções (como Status), ofereça alternativas claras (ex: A, B, C ou 1, 2, 3).
      4. Só execute as funções (create_property, create_tenant) quando tiver coletado TODOS os dados necessários (incluindo status).
      5. Ajude com insights financeiros e alertas de dados faltantes (inquilinos sem CPF, etc).
      
      ESTRATÉGIA DE COLETA (FLUXO PARA IMÓVEL):
      - Início: "Entendido, vamos criar um novo imóvel. Qual o nome que deseja dar a ele e o endereço?"
      - Após resposta: "Ótimo. Agora, qual o valor do aluguel mensal?"
      - Após resposta: "Para finalizar, qual o status atual deste imóvel?
        A) Vago (vacant)
        B) Alugado (rented)
        C) Em Reforma (renovation)"
      - Após a escolha: "Perfeito! Estou criando o imóvel agora..." (Aqui você chama a função create_property).
      
      DADOS ATUAIS DO SISTEMA:
      - Imóveis: ${context.properties.length} cadastrados.
      - Inquilinos: ${context.tenants.length} cadastrados.
      
      INSTRUÇÕES DE TOM DE VOZ:
      - Educado, prestativo e focado em produtividade.
      - Use emojis para tornar a conversa leve.
    `;

    // Map history to the format expected by the API
    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage || "Olá!" }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config: {
        systemInstruction,
        tools
      }
    });

    // Check for function calls
    const toolCall = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
    if (toolCall && toolCall.functionCall) {
      return {
        type: "tool_call",
        calls: [toolCall.functionCall]
      };
    }

    return response.text || "Não consegui processar sua mensagem.";
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    return `Desculpe, tive um erro ao processar sua solicitação: ${error.message}`;
  }
};
