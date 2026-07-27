import { GoogleGenAI } from "@google/genai";
import { Property, Tenant, Payment, Expense, Agreement } from "../types";

const formatAIError = (error: any): string => {
  const msg = error?.message || String(error);
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
    return "O servidor da Inteligência Artificial está com alta demanda no momento. Por favor, aguarde alguns instantes e tente novamente.";
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
    return "O limite de uso foi atingido temporariamente. Por favor, aguarde e tente novamente mais tarde.";
  }
  try {
    const jsonMatch = msg.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    }
  } catch(e) {}
  return msg;
};

export const getDriveAgentResponse = async (diagnostics: any, userMessage?: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ **Configuração Necessária.**";
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userMessage || "Diagnosticar conexão drive."
    });
    return response.text || "Sem resposta.";
  } catch (e: any) {
    return "Erro: " + e.message;
  }
};

export const scanInvoice = async (base64Image: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  // Remove data:image/...;base64, part if present
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

  const prompt = `Analise a imagem desta conta, fatura ou boleto.
Extraia as seguintes informações e retorne APENAS um JSON válido, sem mais nenhum texto:
{
  "amount": <valor total em numero (não string), use formato float como 150.50>,
  "description": "<descrição curta do que se trata, ex: Conta de Luz (Enel)>",
  "date": "<data de vencimento ou emissão no formato YYYY-MM-DD>"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]
  });

  const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
  if (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse", text);
        return null;
    }
  }
  return null;
};

export const generateLeaseContract = async (tenantData: any, propertyData?: any, documentType: string = 'Contrato de Locação') => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Format additional occupants/residents (moradores)
  let additionalOccupantsInfo = "Nenhum outro morador informado";
  if (tenantData?.additionalResidents && Array.isArray(tenantData.additionalResidents) && tenantData.additionalResidents.length > 0) {
    additionalOccupantsInfo = tenantData.additionalResidents.map((r: any) => 
      `- ${r.name || '[Nome pendente]'} (${r.relation || 'Outro'}${r.cpf ? `, CPF: ${r.cpf}` : ''}${r.age ? `, Idade: ${r.age}` : ''})`
    ).join('\n');
  }

  // Format Caução / Garantia (Deposit info)
  let guaranteeInfo = "Sem caução inicial cadastrada.";
  const hasDeposit = (tenantData?.depositValue && Number(tenantData.depositValue) > 0) || 
                      (tenantData?.initialPaymentType === 'deposit' && tenantData?.depositValue);
  
  if (hasDeposit) {
    const value = tenantData.depositValue;
    const installments = tenantData.depositInstallments || 1;
    const dueDay = tenantData.depositDay || tenantData.paymentDay || 1;
    guaranteeInfo = `Depósito Caução (Garantia Locatícia) no valor total de R$ ${value}, a ser pago/parcelado em ${installments}x, com dia de vencimento todo dia ${dueDay} do mês.`;
  }

  // Format Property rules and details
  const rulesText = propertyData?.rules || 'Sem regras/restrições adicionais cadastradas no imóvel.';
  const alertsText = propertyData?.alerts || propertyData?.observations || 'Nenhuma observação ou alerta de infraestrutura cadastrado no imóvel.';
  const allowPetsText = propertyData?.allowPets === true ? 'Permitido animais de estimação.' : propertyData?.allowPets === false ? 'Proibido manter animais de estimação no imóvel.' : 'Sujeito às regras normais do condomínio.';
  const allowSmokingText = propertyData?.allowSmoking === true ? 'Permitido fumar.' : propertyData?.allowSmoking === false ? 'Proibido fumar nas dependências do imóvel.' : 'Não especificado.';
  const maxResidentsText = propertyData?.maxResidents ? `Máximo permitido de moradores: ${propertyData.maxResidents}` : 'Não especificado na ficha do imóvel.';

  const spouseText = tenantData?.spouse ? `Cônjuge/Coparticipe: ${tenantData.spouse}` : 'Não informado';
  const childrenText = tenantData?.children ? `Filhos: ${tenantData.children}` : 'Nenhum informado';
  const petsText = tenantData?.pets ? `Animais de Estimação do Inquilino: ${tenantData.pets}` : 'Nenhum informado';
  const vehicleText = tenantData?.hasVehicles ? `Veículos: Sim (${tenantData.vehicleDetails || 'Não detalhado'})` : 'Não possui/informa veículos';
  const smokerText = tenantData?.isSmoker ? 'Inquilino é fumante.' : 'Inquilino não é fumante.';
  const tenantObs = tenantData?.tenantObservations || tenantData?.observations || 'Nenhuma observação de perfil de inquilino informada.';
  const contractObs = tenantData?.observations && tenantData?.observations !== tenantData?.tenantObservations ? tenantData.observations : '';

  const prompt = `
  Você é um advogado especialista em direito imobiliário no Brasil (Lei do Inquilinato nº 8.245/1991).
  Crie um(a) ${documentType} claro(a), moderno(a) e conciso(a) extremamente seguro e juridicamente válido contendo as seguintes informações detalhadas das partes e do negócio:
  
  INQUILINO/PARTE:
  - Nome: ${tenantData?.name || '[Pendente]'}
  - CPF: ${tenantData?.cpf || '[Pendente]'}
  - Contato: ${tenantData?.contact || '[Pendente]'}
  - Estado Civil / Cônjuge: ${spouseText}
  - Filhos/Dependentes: ${childrenText}
  - Animais de estimação informados pelo inquilino: ${petsText}
  - Informações de veículos: ${vehicleText}
  - Hábito de fumar: ${smokerText}
  - Quantidade total de ocupantes: ${tenantData?.residentCount || 1} morador(es) no total.
  - Outros moradores autorizados a residir (Ocupantes secundários):
  ${additionalOccupantsInfo}
  - Observações do Perfil do Inquilino: ${tenantObs}
  
  IMÓVEL:
  - Nome: ${propertyData?.name || '[Pendente]'}
  - Endereço: ${propertyData?.address || '[Pendente]'}
  - Valor do Aluguel: R$ ${tenantData?.rentValue || propertyData?.rentValue || '[Pendente]'}
  - Dia de Vencimento: ${tenantData?.paymentDay || propertyData?.paymentDay || '[Pendente]'}
  - Juros e Multa por atraso: ${tenantData?.chargeLateFees || propertyData?.chargeLateFees ? `Multa fixa de R$ ${tenantData?.lateFeePenalty || propertyData?.lateFeePenalty || 10} e Mora diária de ${tenantData?.lateFeeDaily || propertyData?.lateFeeDaily || 0.033}% sobre o aluguel` : 'Não especificado no imóvel.'}
  - Regras e Restrições do Imóvel: ${rulesText}
  - Alertas/Observações de Estado sobre o Imóvel: ${alertsText}
  - Animais de estimação permitidos no imóvel (Regra): ${allowPetsText}
  - Fumo permitido no imóvel (Regra): ${allowSmokingText}
  - Limite máximo de moradores (Regra): ${maxResidentsText}
  
  TERMOS DE CONTRATO / FORMULÁRIO:
  - Data de Início do Aluguel: ${tenantData?.startDate || 'Data de assinatura'}
  - Data de Término do Aluguel: ${tenantData?.endDate || 'Prazo conforme legislação (Ex: 12 ou 30 meses)'}
  - Duração do Aluguel: ${tenantData?.leaseDurationMonths ? `${tenantData.leaseDurationMonths} meses` : 'Não especificado'}
  - Observações Extras customizadas para o contrato: ${contractObs}
  
  GARANTIA INICIAL / CAUÇÃO:
  - Detalhe de Garantia: ${guaranteeInfo}
  
  DIRETRIZES IMPORTANTES PARA A CRIAÇÃO DE CLÁUSULAS:
  1. Use as regras de animais, fumo, veículos/garagem e limite de residentes para criar cláusulas específicas em "Destinação do Imóvel" ou "Obrigações do Locatário".
  2. Adicione explicitamente o nome dos outros moradores autorizados como ocupantes permitidos para habitar o imóvel.
  3. No caso de haver caução, crie uma cláusula detalhando a entrega da caução, seu reajuste e as regras para sua devolução.
  4. Para CADA CLÁUSULA do contrato, adicione um pequeno texto citando a base jurídica correspondente na Lei do Inquilinato (ex: Segundo o Art 22 da Lei...).
  5. Você DEVE formatar a saída em **HTML rico**, usando a tag <mark> para os destaques. 
     - Para informações COPIADAS dos dados acima (Nome, CPF, Valor do aluguel, etc), envolva em <mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 4px;"> (Marca texto amarelo).
     - Para novos pontos importantes que você (IA) criou (regras adaptadas, obrigações extras), ou citações da base jurídica, envolva em <mark style="background-color: #bbf7d0; padding: 2px 4px; border-radius: 4px;"> (Marca texto verde).
     
  Crie APENAS O CÓDIGO HTML DO DOCUMENTO (usando tags como <h1>, <h2>, <p>, <strong> e <mark>), pronto para ser renderizado. NÃO envolva em markdown \`\`\`html, retorne os elementos diretamente. Não responda com introduções como "Aqui está o documento".
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt
  });

  return response.text?.replace(/```html/g, '').replace(/```/g, '').trim() || '';
};

export const getLegalConsultantResponse = async (userMessage: string, history: {role: 'user' | 'assistant' | 'system', content: string}[] = []) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ **Configuração Necessária.** Configure sua `GEMINI_API_KEY` para acessar o Consultor Jurídico.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      Você é um "Consultor Jurídico Imobiliário", uma IA integrada ao aplicativo "Gerente Imobiliário".
      Você deve orientar e fornecer embasamento utilizando a Busca do Google (legislação como a Lei do Inquilinato nº 8.245, Código Civil, etc.).
      
      SEU PAPEL E ESTILO DE COMUNICAÇÃO:
      - Seja extremamente direto, conversacional e amigável.
      - DÊ RESPOSTAS CURTAS E OBJETIVAS (como em um bate-papo de WhatsApp). Não mande textos enormes.
      - Evite juridiquês complicado; explique com palavras do dia a dia.
      
      PRECISÃO E CONTEXTO:
      - ANTES de dar uma resposta definitiva sobre prazos, multas, impostos ou leis específicas, verifique se a informação pode variar de acordo com o estado ou município do imóvel.
      - Se você precisar de mais contexto para dar uma orientação precisa (ex: cidade/estado, tipo de contrato, cláusulas específicas), FAÇA PERGUNTAS ao usuário antes de concluir.
      - Não invente informações nem forneça respostas genéricas que possam induzir o usuário ao erro caso a regra local seja diferente. Diga: "Para te dar a resposta exata, preciso saber em qual cidade/estado o imóvel fica, pois [motivo] pode variar...".

      FOCO NA AÇÃO DENTRO DO APLICATIVO:
      - Além de tirar a dúvida, FAÇA UMA RECOMENDAÇÃO PRÁTICA sobre como usar o aplicativo "Gerente Imobiliário" para gerenciar o que foi falado.
      - O aplicativo tem as seções: "Imóveis" (adicionar casas/salas), "Inquilinos", "Financeiro/Recebimentos", "Alertas" e "Assistente IA".
      - Exemplo: "Após adicionar a casa, vá na aba Inquilinos e registre a pessoa vinculando o contrato e o valor da caução". Crie pequenos passo a passos (bullet points) sugerindo ao usuário o que clicar.
      - Se a pergunta envolver contrato gerado e envio, sugira que ele preencha as informações na tela de Inquilinos do app.
    `;

    // Format history into strictly alternating user/model sequence
    const finalSequence: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const h of history) {
      if (!h.content) continue;
      const role = h.role === 'assistant' ? 'model' : 'user';
      if (finalSequence.length === 0) {
        if (role === 'user') finalSequence.push({ role, parts: [{ text: h.content }] });
      } else {
        const last = finalSequence[finalSequence.length - 1];
        if (last.role === role) {
          last.parts[0].text += '\n\n' + h.content;
        } else {
          finalSequence.push({ role, parts: [{ text: h.content }] });
        }
      }
    }

    if (finalSequence.length === 0 || finalSequence[finalSequence.length - 1].role === 'model') {
       finalSequence.push({
         role: 'user',
         parts: [{ text: userMessage || "Olá!" }]
       });
    } else if (finalSequence[finalSequence.length - 1].role === 'user') {
       finalSequence[finalSequence.length - 1].parts[0].text += '\n\n' + (userMessage || "Olá!");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalSequence,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }] // Enabled Grounding
      }
    });

    return response.text || "Desculpe, não consegui obter essa informação agora.";
  } catch (error: any) {
    console.error("Legal Consultant Error:", error);
    return `Desculpe, ocorreu um erro temporal: ${formatAIError(error)}`;
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

    const systemInstruction = `
      Você é o "Especialista Imobiliário", o Assistente de Inteligência Artificial oficial e braço direito do usuário no aplicativo "Gerente Imobiliário". 
      Você é uma IA altamente capaz, confiável e essencial para a administração imobiliária. Como a "voz" da plataforma, sua missão é transmitir segurança, domínio e eficiência, sempre pronto para solucionar problemas e otimizar a gestão do usuário.

      SEU PAPEL CENTRAL E AUTORIDADE:
      - Comunique-se com profissionalismo, clareza e autoridade, mas sem perder a empatia e a utilidade prática. Mostre que você domina o aplicativo e os conceitos imobiliários.
      - Atue como um consultor proativo: não apenas responda, mas sugira as melhores práticas de gestão usando exatamente o que a plataforma oferece.
      - Seu foco é guiar o usuário em suas verdadeiras ferramentas disponíveis HOJE no sistema:
         🏠 Gestão de Imóveis e Inquilinos (cadastros, vínculo, histórico).
         💰 Financeiro (acompanhamento de Recebimentos e Despesas).
         🔔 Alertas Inteligentes (inadimplência e vencimento de contratos).
         📝 Contratos (criação e organização de modelos básicos e templates).
      
      COMO LIDAR COM O QUE O APP NÃO FAZ (Elegância e Posicionamento):
      - NUNCA crie falsas expectativas sobre funcionalidades que não existem (ex: gráficos complexos de análise preditiva, automação contábil).
      - Se o usuário pedir insights de mercado, tendências ou índices, NÃO dê respostas ríspidas focadas apenas nas limitações do app. Em vez disso, mostre o seu valor como IA Inteligente: FAÇA a pesquisa usando a ferramenta Google Search e entregue um resumo de excelência.
      - Ao entregar insights externos, deixe claro o seu papel consultivo. Ex: "Pesquisei os dados mais recentes do mercado e a tendência atual é X. Sabendo disso, podemos aproveitar a aba de Contratos do nosso aplicativo para realizar o reajuste dos inquilinos."
      - Seja resolutivo: Ensine fluxos na plataforma para adaptar necessidades externas aos recursos gerenciais que já existem.

      FERRAMENTAS E BUSCAS EXTERNAS:
      - Enriqueça a conversa ativamente pesquisando leis do inquilinato (Lei nº 8.245), índices financeiros reais (IGP-M, IPCA) e melhores práticas de negociação.

      DADOS GERAIS DO SISTEMA ATUAL (Seu campo de visão):
      - Imóveis: ${context.properties.length} cadastrados.
      - Inquilinos: ${context.tenants.length} cadastrados.
      - Lançamentos Financeiros de Recebimentos: ${context.payments.length}.
      
      TOM DE VOZ NA CONVERSA:
      - Confiante, solícito e direto ao ponto. Você é experiente.
      - Use linguagem de parceria: "Vamos organizar isso", "Aqui está a solução".
      - Use emojis com moderação para manter uma leitura agradável e moderna.
    `;

    // Format history into strictly alternating user/model sequence
    const finalSequence: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const h of history) {
      if (!h.content) continue;
      const role = h.role === 'assistant' ? 'model' : 'user';
      if (finalSequence.length === 0) {
        if (role === 'user') finalSequence.push({ role, parts: [{ text: h.content }] });
      } else {
        const last = finalSequence[finalSequence.length - 1];
        if (last.role === role) {
          last.parts[0].text += '\n\n' + h.content;
        } else {
          finalSequence.push({ role, parts: [{ text: h.content }] });
        }
      }
    }

    if (finalSequence.length === 0 || finalSequence[finalSequence.length - 1].role === 'model') {
       finalSequence.push({
         role: 'user',
         parts: [{ text: userMessage || "Olá!" }]
       });
    } else if (finalSequence[finalSequence.length - 1].role === 'user') {
       finalSequence[finalSequence.length - 1].parts[0].text += '\n\n' + (userMessage || "Olá!");
    }

    const apiTools: any[] = [{ googleSearch: {} }];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalSequence,
      config: {
        systemInstruction,
        tools: apiTools
      }
    });

    return response.text || "Não consegui processar sua mensagem.";
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    return `Desculpe, tive um erro ao processar sua solicitação: ${formatAIError(error)}`;
  }
};

export const generateBackupSummary = async (systemData: any, reason: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Você é um assistente de gestão imobiliária. O gerente está realizando um backup e "resetando" o sistema. 
Motivo do administrador: ${reason}

Resuma de forma altamente profissional, inteligente e concisa a situação geral da carteira ANTES deste reset. O seu texto será salvo no relatório PDF do sistema.

Dados (em JSON restrito): 
Imóveis: ${systemData.properties} cadastrados
Inquilinos: ${systemData.tenants} ativos
Acordos: ${systemData.agreements} em andamento
Tickets: ${systemData.tickets} abertos/processados
Total em pagamentos processados (aprox): ${systemData.payments.count} registros.

Gere um relatório textual (2 a 4 parágrafos) em Português-BR para ir no topo da ata de encerramento do ciclo. Não use marcadores markdown excessivos, apenas texto direto, e use tom contábil e elegante.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3
      }
    });

    return response.text;
  } catch (err) {
    console.error('Error generating backup summary:', err);
    return `Relatório de encerramento gerado por rotina do sistema. Motivo declarado pelo usuário: ${reason}. Ciclo concluído.`;
  }
};

export const generateFinancialAudit = async (data: any) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY nas configurações.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Você é um Analista Financeiro e Auditor especializado em gestão imobiliária. 
O usuário te enviou os dados atuais do aplicativo dele (imóveis, inquilinos, pagamentos, saídas/despesas e acordos).

Sua missão:
1. Apresentar um resumo claro do fluxo de caixa atual (total de receitas pendentes vs recebidas, e volume de despesas).
2. Identificar potenciais "furos" financeiros (ex: pagamentos muito atrasados, inquilinos com inadimplência cronica, pagamentos de caução pendentes).
3. Avaliar as regras de multas e juros cadastradas. Elas estão ativas? Fazem sentido? (Lembrando que no Brasil, a praxe de mercado para aluguel permite multa moratória de até 10% e juros de 1% ao mês, mas você pode usar o bom senso).
4. Gerar relatórios e dicas acionáveis focadas em evitar perdas. 
Linguagem: Direta, respeitosa profissional e em português brasileiro formatado em Markdown para fácil leitura. Use listas (bullet points) e negrito para destacar valores.

Dados para Análise (JSON estruturado):
${JSON.stringify({ 
  properties: data.properties,
  tenants: data.tenants,
  payments: data.payments,
  expenses: data.expenses,
  agreements: data.agreements
}, null, 2).substring(0, 50000)} // Limite de segurança de caracteres
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3
      }
    });
    return response.text;
  } catch (err) {
    console.error('Error generating financial audit:', err);
    throw err;
  }
};

export const parseContractFromText = async (text: string, base64Image?: string, mimeType?: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Analise o seguinte documento (pode ser um contrato de aluguel em formato texto, foto, PDF ou dados colados de uma planilha/tabela de controle de aluguel).
Se for uma planilha com vários inquilinos, extraia o PRIMEIRO ou PRINCIPAL registro válido que você encontrar.
1. Extraia o máximo possível das seguintes informações em formato JSON rigoroso:
{
  "property": {
    "name": "<nome descritivo curto, ex: Casa Centro, Apto 202>",
    "address": "<endereço completo do imóvel>",
    "rentValue": <valor numérico do aluguel (float), ex: 1500.00>,
    "paymentDay": <dia do mês do vencimento (int)>,
    "rules": "<extraia as regras adicionais do imóvel, como restrições, horários silêncio, lixo, etc, ou vazio>"
  },
  "tenant": {
    "name": "<nome completo do inquilino>",
    "cpf": "<cpf apenas números ou formatado>",
    "contact": "<telefone de contato>",
    "spouse": "<nome completo do cônjuge/companheiro, ou vazio>",
    "children": "<quantidade e/ou nome/idade dos filhos, ou vazio>",
    "pets": "<quantidade, espécie ou porte dos animais, ou vazio>",
    "vehicles": "<informações sobre vaga de garagem ou veículos informados, se houver, ou vazio>",
    "observations": "<texto reunindo informações implícitas ou explícitas como: outras regras, etc.>"
  },
  "contract": {
    "startDate": "<data de início do contrato no formato YYYY-MM-DD, ou vazio>",
    "endDate": "<data de fim do contrato no formato YYYY-MM-DD, ou vazio>"
  },
  "deposit": {
    "hasDeposit": <boolean, true se houver caução/garantia>,
    "depositValue": <valor numérico total do caução (float), ex: 3000.00>,
    "depositInstallments": <número de vezes que o caução foi/será parcelado (int), ex: 3. Se for à vista, coloque 1>,
    "depositDueDate": "<data combinada para pagamento do caução, formato YYYY-MM-DD. Se não houver, deixe vazio>"
  },
  "feedback": {
    "missingInfo": ["<lista de string apontando informações vitais faltantes no contrato>"],
    "improvements": ["<lista de strings com dicas de como melhorar e corrigir erros no contrato baseadas na Lei do Inquilinato>"]
  }
}

2. Regras:
- Retorne APENAS o JSON válido, sem " \`\`\`json " e sem mais nenhum texto.
- Se não achar algum dado, deixe como string vazia "", ou 0 para números, ou false para booleanos.
- No 'feedback', aja como um consultor jurídico imobiliário e aponte brechas ou falhas técnicas.
- 'observations' deve consolidar tudo de importante e peculiar que achar sobre os moradores ou a locação.

Texto extraído ou provido:
${text}
`;

  const contents: any[] = [{ text: prompt }];

  if (base64Image) {
    const base64Data = base64Image.split(',')[1] || base64Image;
    contents.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType || "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: contents
  });

  const responseText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
  if (responseText) {
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse contract JSON", responseText);
      return null;
    }
  }
  return null;
};

export const parseTicketFromText = async (textToParse: string, properties: Property[], tenants: Tenant[]) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const propertiesJson = JSON.stringify(properties.map(p => ({ id: p.id, name: p.name })));
  const tenantsJson = JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name, propertyId: t.propertyId })));

  const prompt = `Analise a seguinte mensagem enviada (possivelmente por um inquilino) relatando um problema ou solicitação:
"${textToParse}"

Extraia as seguintes informações para abrir um chamado de manutenção e retorne APENAS um JSON válido:
{
  "title": "<título curto e descritivo para o chamado>",
  "description": "<descrição detalhada baseada na mensagem original>",
  "category": "<uma das opções: 'plumbing', 'electrical', 'structural', 'appliance', 'keys', 'other'>",
  "priority": "<uma das opções: 'low', 'medium', 'high', 'urgent'>",
  "suggestedPropertyId": "<id do imóvel, se conseguir deduzir deduzir pelos nomes, ou null>",
  "suggestedTenantId": "<id do inquilino, se conseguir deduzir pelos nomes, ou null>"
}

Imóveis cadastrados: ${propertiesJson}
Inquilinos cadastrados: ${tenantsJson}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt
  });

  const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
  if (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse ticket JSON", text);
        return null;
    }
  }
  return null;
};

export const parseMultipleRecordsFromText = async (text: string, base64File?: string, mimeType?: string) => {
  const apiKey = process.env.MY_GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("⚠️ Configuração Necessária. Configure sua GEMINI_API_KEY.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Você recebeu um texto (ou documento/PDF) que pode ser uma cópia de uma planilha do Excel, AppSheet ou CSV contendo dados de N inquilinos e/ou imóveis.
Extraia os dados de forma inteligente.
Se houver colunas misturadas ou informações bagunçadas, tente ao máximo mapear o nome do inquilino, o valor do aluguel, o dia de pagamento e o nome do imóvel, além de dados sobre a entrada, gastos ou histórico.

Retorne APENAS UM OBJETO JSON VÁLIDO neste exato formato:
{
  "summary": {
    "message": "Mensagem amigável explicando o que você encontrou. Ex: 'Entendi que você colou uma tabela antiga. Consegui identificar 5 imóveis e 6 inquilinos. Veja abaixo a lista do que foi extraído para você conferir.'",
    "propertiesCount": 0,
    "tenantsCount": 0
  },
  "records": [
    {
      "property": {
        "name": "Nome do imóvel",
        "address": "Endereço ou vazio",
        "rentValue": 1500.00,
        "paymentDay": 10,
        "expenses": "Descrição de gastos/manutenções se houver, de forma resumida, ou vazio"
      },
      "tenant": {
        "name": "Nome do inquilino",
        "cpf": "",
        "contact": "",
        "occupancyDate": "Data de ocupação/entrada (ex: 20/05/2023) ou vazio",
        "paymentsInfo": "Resumo de histórico/quantidades de pagamentos ou vazio"
      }
    }
  ]
}

Texto recebido:
${text}
`;

  const contents: any[] = [{ text: prompt }];

  if (base64File) {
    const base64Data = base64File.split(',')[1] || base64File;
    contents.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType || "application/pdf"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: contents
  });

  const responseText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
  if (responseText) {
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        // Fallback backward compatibility just in case
        return { summary: { message: "Registros extraídos.", propertiesCount: parsed.length, tenantsCount: parsed.length }, records: parsed };
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse multiple generic JSON", responseText);
      return null;
    }
  }
  return null;
};
