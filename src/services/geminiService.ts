import { GoogleGenAI } from "@google/genai";
import { Property, Tenant, Payment, Expense, Agreement } from "../types";
import { formatOfficialAddress } from "../utils/addressHelpers";

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
      model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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

export const generateStandardResidenceDeclaration = (tenantData: any, propertyData?: any) => {
  // Extract Landlord info
  const savedLandlord = typeof localStorage !== 'undefined' ? localStorage.getItem("imob_landlord_profile") : null;
  let lp: any = {};
  if (savedLandlord) {
    try { lp = JSON.parse(savedLandlord) || {}; } catch(e){}
  }

  const landlordName = tenantData?.landlordName || lp.name || 'Nome do(a) Locador(a) / Proprietário(a)';
  const landlordCpf = tenantData?.landlordCpf || lp.cpfCnpj || '';
  const landlordRg = tenantData?.landlordRg || lp.rg || '';
  const landlordQual = tenantData?.landlordQualification || lp.qualification || 'Brasileiro(a), Proprietário(a)';
  const landlordAddress = tenantData?.landlordAddress || lp.address || '';
  const landlordPhone = tenantData?.landlordPhone || lp.phone || '';
  const landlordEmail = tenantData?.landlordEmail || lp.email || '';

  // Extract Tenant info
  const tenantName = tenantData?.name || tenantData?.tenantName || 'Nome do(a) Inquilino(a) Titular';
  const tenantCpf = tenantData?.cpf || tenantData?.tenantCpf || '';
  const tenantPhone = tenantData?.contact || tenantData?.phone || tenantData?.tenantPhone || '';

  // Extract Property info
  const propertyName = propertyData?.name || tenantData?.propertyName || 'Imóvel Residencial';
  const officialAddr = formatOfficialAddress(propertyData) || propertyData?.officialAddress || propertyData?.address || tenantData?.propertyAddress || '';
  const propertyAddress = officialAddr || 'Endereço do Imóvel';
  
  // Extract CEP
  const cepMatch = propertyAddress ? (propertyAddress.match(/CEP[:\s]*([0-9]{5}-?[0-9]{3})/i) || propertyAddress.match(/([0-9]{5}-?[0-9]{3})/)) : null;
  const propertyCep = propertyData?.cep || (cepMatch ? cepMatch[1] : (tenantData?.cep || ''));

  // Extract Contract dates
  const startDate = tenantData?.startDate || 'Data de Assinatura';
  const durationText = tenantData?.leaseDurationMonths ? `${tenantData.leaseDurationMonths} meses` : '12 meses (Residencial)';

  // Additional Residents
  let residentsHtml = '';
  if (tenantData?.additionalResidents && Array.isArray(tenantData.additionalResidents) && tenantData.additionalResidents.length > 0) {
    const listItems = tenantData.additionalResidents.map((r: any) => 
      `<p style="margin: 4px 0;">• <strong>${r.name || 'Morador'}</strong>${r.relation ? ` (${r.relation})` : ''}${r.cpf ? ` - CPF: ${r.cpf}` : ''}${r.age ? ` - Idade: ${r.age} anos` : ''}</p>`
    ).join('');
    residentsHtml = `
      <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
        1.3. DOS DEMAIS MORADORES E OCUPANTES AUTORIZADOS:
      </h3>
      <div style="margin-left: 12px; margin-bottom: 16px;">
        ${listItems}
      </div>
    `;
  } else if (tenantData?.additionalOccupantsText) {
    residentsHtml = `
      <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
        1.3. DOS DEMAIS MORADORES E OCUPANTES AUTORIZADOS:
      </h3>
      <div style="margin-left: 12px; margin-bottom: 16px;">
        <p style="margin: 4px 0;">${tenantData.additionalOccupantsText}</p>
      </div>
    `;
  }

  // Format today's date in Portuguese
  const today = new Date();
  const day = today.getDate();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthStr = monthNames[today.getMonth()];
  const year = today.getFullYear();

  // City from landlord or property address
  let city = 'São Paulo - SP';
  if (propertyAddress && propertyAddress !== 'Endereço do Imóvel') {
    if (propertyAddress.toLowerCase().includes('embu das artes')) {
      city = 'Embu das Artes - SP';
    } else if (propertyAddress.toLowerCase().includes('são paulo') || propertyAddress.toLowerCase().includes('sao paulo')) {
      city = 'São Paulo - SP';
    } else if (propertyAddress.includes('-')) {
      const parts = propertyAddress.split('-');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.length >= 2 && lastPart.length <= 30) {
        city = lastPart;
      }
    }
  } else if (landlordAddress) {
    if (landlordAddress.toLowerCase().includes('embu das artes')) {
      city = 'Embu das Artes - SP';
    } else if (landlordAddress.toLowerCase().includes('são paulo') || landlordAddress.toLowerCase().includes('sao paulo')) {
      city = 'São Paulo - SP';
    }
  }

  return `
<div style="font-family: 'Times New Roman', Times, Georgia, serif; color: #0f172a; line-height: 1.6; font-size: 11pt;" id="residence-declaration-standard">

  <div style="text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #0f172a;">
    <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px; text-align: center; color: #0f172a;">
      DECLARAÇÃO FORMAL DE RESIDÊNCIA E VÍNCULO LOCATÍCIO (USO OFICIAL)
    </h1>
  </div>

  <p style="text-align: justify; text-indent: 2em; margin-bottom: 20px; line-height: 1.6;">
    Pelo presente instrumento particular, para todos os fins de direito e sob as penas da lei, em especial as dispostas no <strong>Artigo 299 do Código Penal Brasileiro (Falsidade Ideológica)</strong>, o(a) <strong>LOCADOR(A)/PROPRIETÁRIO(A)</strong> abaixo qualificado(a) declara, de forma expressa e irrevogável, que o(a) <strong>LOCATÁRIO(A)/INQUILINO(A) TITULAR</strong> e demais ocupantes igualmente qualificados residem de forma habitual e permanente no imóvel adiante descrito, estabelecendo nele seu domicílio civil.
  </p>

  <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; color: #0f172a;">
    1. DAS PARTES DECLARANTES
  </h2>

  <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
    1.1. DO(A) LOCADOR(A) / PROPRIETÁRIO(A) DECLARANTE:
  </h3>
  <div style="margin-left: 12px; margin-bottom: 16px;">
    <p style="margin: 4px 0;"><strong>Nome/Razão Social:</strong> ${landlordName}</p>
    ${landlordCpf ? `<p style="margin: 4px 0;"><strong>CPF/CNPJ:</strong> ${landlordCpf}</p>` : ''}
    ${landlordRg ? `<p style="margin: 4px 0;"><strong>RG:</strong> ${landlordRg}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Nacionalidade e Qualificação:</strong> ${landlordQual}</p>
    ${landlordAddress ? `<p style="margin: 4px 0;"><strong>Endereço Residencial/Comercial:</strong> ${landlordAddress}</p>` : ''}
    ${landlordPhone ? `<p style="margin: 4px 0;"><strong>Telefone:</strong> ${landlordPhone}</p>` : ''}
    ${landlordEmail ? `<p style="margin: 4px 0;"><strong>E-mail:</strong> ${landlordEmail}</p>` : ''}
  </div>

  <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
    1.2. DO(A) LOCATÁRIO(A) / INQUILINO(A) TITULAR:
  </h3>
  <div style="margin-left: 12px; margin-bottom: 16px;">
    <p style="margin: 4px 0;"><strong>Nome Completo:</strong> ${tenantName}</p>
    ${tenantCpf ? `<p style="margin: 4px 0;"><strong>CPF:</strong> ${tenantCpf}</p>` : ''}
    ${tenantPhone ? `<p style="margin: 4px 0;"><strong>Contato/Telefone:</strong> ${tenantPhone}</p>` : ''}
  </div>

  ${residentsHtml}

  <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; color: #0f172a;">
    2. DO IMÓVEL E VÍNCULO LOCATÍCIO
  </h2>

  <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
    2.1. DO IMÓVEL OBJETO DA LOCAÇÃO:
  </h3>
  <div style="margin-left: 12px; margin-bottom: 16px;">
    <p style="margin: 4px 0;"><strong>Identificação/Nome:</strong> ${propertyName}</p>
    <p style="margin: 4px 0;"><strong>Endereço Completo:</strong> ${propertyAddress}</p>
    ${propertyCep ? `<p style="margin: 4px 0;"><strong>CEP:</strong> ${propertyCep}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Finalidade:</strong> Exclusivamente residencial.</p>
  </div>

  <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 16px; margin-bottom: 8px; color: #0f172a;">
    2.2. DO VÍNCULO LOCATÍCIO:
  </h3>
  <p style="text-align: justify; margin-left: 12px; margin-bottom: 12px; line-height: 1.6;">
    O(A) LOCADOR(A) declara que existe um contrato de locação formalmente celebrado com o(a) LOCATÁRIO(A) <strong>${tenantName}</strong> para o imóvel acima especificado. Este contrato encontra-se ativo e regular, com as seguintes condições:
  </p>
  <div style="margin-left: 24px; margin-bottom: 20px;">
    <p style="margin: 4px 0;">• <strong>Data de Início da Locação:</strong> ${startDate}</p>
    <p style="margin: 4px 0;">• <strong>Duração / Vigência:</strong> ${durationText}</p>
    <p style="margin: 4px 0;">• <strong>Situação Contratual:</strong> Ativo, regular e em pleno vigor legal.</p>
  </div>

  <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; color: #0f172a;">
    3. DA FINALIDADE E VALIDADE JURÍDICA
  </h2>
  <p style="text-align: justify; text-indent: 2em; margin-bottom: 16px; line-height: 1.6;">
    A presente declaração é expedida a pedido do(a) interessado(a), com plena validade probatória para comprovação de endereço e residência habitual perante órgãos públicos federais, estaduais e municipais, concessionárias de serviços públicos (água, energia elétrica, gás), instituições de ensino, entidades bancárias, órgãos de trânsito (DETRAN/Poupatempo) e repartições de saúde/SUS.
  </p>
  <p style="text-align: justify; text-indent: 2em; margin-bottom: 24px; line-height: 1.6;">
    Por ser a expressão fiel da verdade, e cientes das responsabilidades civis e criminais advindas de declarações falsas, firma-se a presente declaração para que produza os seus jurídicos e legais efeitos.
  </p>

  <div style="margin-top: 32px; margin-bottom: 40px; text-align: right;">
    <p style="margin: 0; font-weight: 500;">${city}, ${day} de ${monthStr} de ${year}.</p>
  </div>

  <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center; page-break-inside: avoid;" class="signature-block">
    <div style="border-top: 1px solid #475569; padding-top: 8px;">
      <p style="font-weight: bold; margin: 0; font-size: 10pt; text-transform: uppercase; color: #0f172a;">${landlordName}</p>
      <p style="font-size: 9pt; color: #475569; margin: 2px 0 0 0;">LOCADOR(A) / PROPRIETÁRIO(A)</p>
      ${landlordCpf ? `<p style="font-size: 8.5pt; color: #64748b; margin: 2px 0 0 0;">CPF/CNPJ: ${landlordCpf}</p>` : ''}
    </div>
    <div style="border-top: 1px solid #475569; padding-top: 8px;">
      <p style="font-weight: bold; margin: 0; font-size: 10pt; text-transform: uppercase; color: #0f172a;">${tenantName}</p>
      <p style="font-size: 9pt; color: #475569; margin: 2px 0 0 0;">LOCATÁRIO(A) / INQUILINO(A) TITULAR</p>
      ${tenantCpf ? `<p style="font-size: 8.5pt; color: #64748b; margin: 2px 0 0 0;">CPF: ${tenantCpf}</p>` : ''}
    </div>
  </div>

</div>
`.trim();
};

export const generateLeaseContract = async (tenantData: any, propertyData?: any, documentType: string = 'Contrato de Locação') => {
  const docLower = (documentType || '').toLowerCase();
  
  // Directly use standard template for Residence Declaration to guarantee strict wording, laws, sections and structure
  if (docLower.includes('declaração de residência') || docLower.includes('declaracao de residencia') || docLower.includes('residencia') || docLower.includes('residência')) {
    return generateStandardResidenceDeclaration(tenantData, propertyData);
  }

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
  } else if (tenantData?.additionalOccupantsText && typeof tenantData.additionalOccupantsText === 'string' && tenantData.additionalOccupantsText.trim()) {
    additionalOccupantsInfo = tenantData.additionalOccupantsText.trim();
  } else if (tenantData?.additionalResidentsText && typeof tenantData.additionalResidentsText === 'string' && tenantData.additionalResidentsText.trim()) {
    additionalOccupantsInfo = tenantData.additionalResidentsText.trim();
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
  const officialPropertyAddress = formatOfficialAddress(propertyData) || propertyData?.officialAddress || propertyData?.address || '[Pendente]';

  const spouseText = tenantData?.spouse ? `Cônjuge/Coparticipe: ${tenantData.spouse}` : 'Não informado';
  const childrenText = tenantData?.children ? `Filhos: ${tenantData.children}` : 'Nenhum informado';
  const petsText = tenantData?.pets ? `Animais de Estimação do Inquilino: ${tenantData.pets}` : 'Nenhum informado';
  const vehicleText = tenantData?.hasVehicles ? `Veículos: Sim (${tenantData.vehicleDetails || 'Não detalhado'})` : 'Não possui/informa veículos';
  const smokerText = tenantData?.isSmoker ? 'Inquilino é fumante.' : 'Inquilino não é fumante.';
  const tenantObs = tenantData?.tenantObservations || tenantData?.observations || 'Nenhuma observação de perfil de inquilino informada.';
  const contractObs = tenantData?.observations && tenantData?.observations !== tenantData?.tenantObservations ? tenantData.observations : '';

  // Format Landlord / Proprietario info
  const savedLandlord = typeof localStorage !== 'undefined' ? localStorage.getItem("imob_landlord_profile") : null;
  let landlordDetails = "";
  if (tenantData?.landlordName) {
    landlordDetails = `LOCADOR / PROPRIETÁRIO (LOCADOR 1):
  - Nome/Razão Social: ${tenantData.landlordName}
  - CPF/CNPJ: ${tenantData.landlordCpf || '[Pendente]'}
  - RG: ${tenantData.landlordRg || '[Pendente]'}
  - Qualificação: ${tenantData.landlordQualification || 'brasileiro(a), proprietário(a)'}
  - Endereço Completo: ${tenantData.landlordAddress || '[Pendente]'}
  - Telefone: ${tenantData.landlordPhone || ''}
  - Email: ${tenantData.landlordEmail || ''}`;
  } else if (savedLandlord) {
    try {
      const lp = JSON.parse(savedLandlord);
      if (lp.name) {
        landlordDetails = `LOCADOR / PROPRIETÁRIO (LOCADOR 1):
  - Nome/Razão Social: ${lp.name}
  - CPF/CNPJ: ${lp.cpfCnpj || '[Pendente]'}
  - RG: ${lp.rg || '[Pendente]'}
  - Qualificação: ${lp.qualification || 'brasileiro(a), proprietário(a)'}
  - Endereço Completo: ${lp.address || '[Pendente]'}
  - Telefone: ${lp.phone || ''}
  - Email: ${lp.email || ''}`;
      }
    } catch(e) {}
  }

  const secondOwnerObj = tenantData?.secondOwner || propertyData?.secondOwner;
  if (secondOwnerObj && secondOwnerObj.name) {
    landlordDetails += `\n\nSEGUNDO PROPRIETÁRIO / COPROPRIETÁRIO (LOCADOR 2):
  - Nome/Razão Social: ${secondOwnerObj.name}
  - CPF/CNPJ: ${secondOwnerObj.cpfCnpj || '[Pendente]'}
  - RG: ${secondOwnerObj.rg || '[Pendente]'}
  - Qualificação: ${secondOwnerObj.qualification || 'brasileiro(a), coproprietário(a)'}
  - Endereço Completo: ${secondOwnerObj.address || 'Mesmo do Locador 1'}
  - Telefone/Contato: ${secondOwnerObj.phone || ''}
  - Email: ${secondOwnerObj.email || ''}
  - Chave PIX / Participação: ${secondOwnerObj.pixKey ? `PIX: ${secondOwnerObj.pixKey}` : ''} ${secondOwnerObj.sharePercentage ? `(${secondOwnerObj.sharePercentage}% de participação)` : ''}`;
  }

  const specialClausesList = tenantData?.specialClauses || propertyData?.specialClauses;
  let specialClausesText = "";
  if (specialClausesList && Array.isArray(specialClausesList) && specialClausesList.length > 0) {
    specialClausesText = `\n\nCLÁUSULAS ESPECIAIS E PARTICULARES OBRIGATÓRIAS A INCLUIR NO DOCUMENTO:\n` +
      specialClausesList.map((c: string, i: number) => `   - Cláusula Especial ${i + 1}: ${c}`).join('\n');
  }

  let specificDocInstructions = '';
  if (documentType.toLowerCase().includes('declaração de residência') || documentType.toLowerCase().includes('declaracao de residencia')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA DECLARAÇÃO FORMAL DE RESIDÊNCIA E VÍNCULO LOCATÍCIO:
    - Título Solene: DECLARAÇÃO FORMAL DE RESIDÊNCIA E VÍNCULO LOCATÍCIO (USO OFICIAL)
    - BASE LEGAL OBRIGATÓRIA A CITAR DETALHADAMENTE NO TEXTO:
      * Lei Federal nº 8.245/1991 (Lei do Inquilinato - Regulamenta as locações de imóveis urbanos);
      * Lei Federal nº 10.406/2002 (Código Civil Brasileiro - Arts. 70 a 78 sobre Domicílio e Residência Habitual);
      * Artigo 299 do Código Penal Brasileiro (Falsidade Ideológica - Declaração prestada sob as penas da lei);
      * Validade e eficácia jurídica plena em todo o Estado de São Paulo e território nacional.
    - OBRIGATÓRIO - ROL COMPLETO DE MORADORES E HABITANTES DO IMÓVEL:
      * Declarar nominalmente o Inquilino Titular (Locatário principal) com Nome Completo, CPF e RG.
      * INCLUIR UMA SEÇÃO EXPLICITA E DESTACADA LISTANDO TODOS OS DEMAIS MORADORES, DEPENDENTES, CÔNJUGE E CO-HABITANTES AUTORIZADOS DO IMÓVEL (com Nomes, Parentesco/Grau de Vínculo, CPF e/ou Idades informados). Se houver moradores na lista "Ocupantes Secundários Autorizados", TODOS DEVEM SER CITADOS NOMINALMENTE NA DECLARAÇÃO.
      * Atestar categoricamente sob as penas da lei que o Inquilino Titular E TODOS os demais moradores acima qualificados residem, cohabitam e mantêm domicílio habitual permanente no referido imóvel.
    - INDICAÇÃO DO IMÓVEL E CONTRATO:
      * Endereço Completo do Imóvel (Logradouro, Número, Complemento, Bairro, CEP, Cidade/UF).
      * Vigência e vigência do Contrato de Locação (Data de início e confirmação de contrato ativo e regular).
    - FINALIDADE E ACEITAÇÃO AMPLA:
      * Atestado com valor probatório formal para comprovação de residência perante órgãos públicos federais, estaduais (Estado de São Paulo), prefeituras, repartições de trânsito (DETRAN/Poupatempo), instituições de ensino (escolas e universidades), postos de saúde/SUS, bancos, concessionárias de água/luz/gás (Sabesp, Enel, Comgás) e entidades privadas.
    - FECHAMENTO E ASSINATURAS:
      * Local e Data atualizados.
      * Campos distintos para assinatura do LOCADOR/PROPRIETÁRIO (com CPF/CNPJ) e do LOCATÁRIO/INQUILINO TITULAR (com CPF).
    `;
  } else if (documentType.toLowerCase().includes('recibo de aluguel')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA RECIBO DE ALUGUEL:
    - Fundamentação no Art. 22, inciso VI da Lei Federal nº 8.245/1991 (Dever do locador de fornecer recibo discriminado).
    - Descriminação clara do valor do aluguel, mês de referência, condomínio, IPTU e outros encargos quitados.
    - Declaração de quitação da respectiva parcela mensal.
    `;
  } else if (documentType.toLowerCase().includes('recibo caução') || documentType.toLowerCase().includes('recibo caucao')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA RECIBO DE CAUÇÃO:
    - Fundamentação no Art. 38, § 2º da Lei Federal nº 8.245/1991 (Garantia por Caução em dinheiro).
    - Declaração do recebimento da quantia dada em caução pelo locatário.
    - Menção expressa sobre o depósito em caderneta de poupança vinculada e devolução ao término do contrato com rendimentos do período.
    `;
  } else if (documentType.toLowerCase().includes('vistoria')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA TERMO DE VISTORIA DO IMÓVEL:
    - Fundamentação no Art. 22, V e Art. 23, III da Lei Federal nº 8.245/1991.
    - Descrição detalhada do estado de conservação de pinturas, instalações elétricas, hidráulicas, pisos, vidros e chaves entregues.
    `;
  } else if (documentType.toLowerCase().includes('renovação') || documentType.toLowerCase().includes('renovacao')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA TERMO DE RENOVAÇÃO DE ALUGUEL:
    - Fundamentação na Lei Federal nº 8.245/1991 (Art. 18 e Art. 47) e Código Civil.
    - Aditivo prorrogando a vigência contratual, estipulando o novo valor reajustado e mantendo as demais cláusulas ativas.
    `;
  } else if (documentType.toLowerCase().includes('reajuste')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA NOTIFICAÇÃO DE REAJUSTE DE ALUGUEL:
    - Fundamentação no Art. 18 da Lei Federal nº 8.245/1991.
    - Comunicação formal informando o índice acumulado (IPCA/IGP-M) e o novo valor do aluguel a vigorar a partir do próximo vencimento.
    `;
  } else if (documentType.toLowerCase().includes('desocupação') || documentType.toLowerCase().includes('desocupacao')) {
    specificDocInstructions = `
    ESTRUTURA ESPECÍFICA PARA AVISO DE DESOCUPAÇÃO / DEVOLUÇÃO DO IMÓVEL:
    - Fundamentação nos Arts. 6º, 46 ou 57 da Lei Federal nº 8.245/1991.
    - Notificação formal concedendo/comunicando o prazo de 30 dias para entrega do imóvel livre de pessoas e bens e agendamento da vistoria final.
    `;
  }

  const prompt = `
  Você é um jurista e advogado especialista sênior em Direito Imobiliário brasileiro (Lei do Inquilinato nº 8.245/1991 e Código Civil nº 10.406/2002).
  Crie um(a) ${documentType} completo(a), extremamente seguro(a), moderno(a), detalhado(a) e juridicamente irrefutável contendo todas as cláusulas essenciais e específicas:
  
  ${specificDocInstructions}

  LOCADOR / PROPRIETÁRIO:
  ${landlordDetails || '- Dados do Locador a preencher conforme perfil do usuário'}

  INQUILINO / LOCATÁRIO / PARTE:
  - Nome: ${tenantData?.name || '[Pendente]'}
  - CPF: ${tenantData?.cpf || '[Pendente]'}
  - Contato/Telefone: ${tenantData?.contact || '[Pendente]'}
  - Estado Civil / Cônjuge: ${spouseText}
  - Filhos / Dependentes: ${childrenText}
  - Animais de estimação do Inquilino: ${petsText}
  - Veículos / Garagem: ${vehicleText}
  - Hábito de fumar: ${smokerText}
  - Quantidade total de moradores: ${tenantData?.residentCount || 1} morador(es).
  - Ocupantes Secundários Autorizados:
  ${additionalOccupantsInfo}
  - Observações do Perfil: ${tenantObs}
  
  IMÓVEL / LOCADOR / OBJETO:
  - Identificação/Nome: ${propertyData?.name || '[Pendente]'}
  - Endereço Oficial Completo: ${officialPropertyAddress}
  - CEP do Imóvel: ${propertyData?.cep || (officialPropertyAddress.match(/CEP[:\s]*([0-9]{5}-?[0-9]{3})/i)?.[1] || 'Conforme endereço oficial')}
  - Valor do Aluguel Mensal: R$ ${tenantData?.rentValue || propertyData?.rentValue || '[Pendente]'}
  - Dia de Vencimento: Todo dia ${tenantData?.paymentDay || propertyData?.paymentDay || '[Pendente]'} de cada mês
  - Cláusula de Penalidades por Atraso: ${tenantData?.chargeLateFees || propertyData?.chargeLateFees ? `Multa moratória de ${tenantData?.lateFeePenalty || propertyData?.lateFeePenalty || 10}% sobre o valor devido e Juros de mora de ${tenantData?.lateFeeDaily || propertyData?.lateFeeDaily || 0.033}% ao dia` : 'Multa padrão de 10% e juros moratórios de 1% ao mês (Art. 406 CC).'}
  - Regras e Restrições do Imóvel: ${rulesText}
  - Observações de Estado e Conservação: ${alertsText}
  - Permissão para Animais: ${allowPetsText}
  - Permissão para Fumo: ${allowSmokingText}
  - Limite de Moradores: ${maxResidentsText}
  
  PRAZOS E REAJUSTES:
  - Data de Início: ${tenantData?.startDate || 'Data da assinatura'}
  - Data de Término: ${tenantData?.endDate || 'A definir'}
  - Duração do Contrato: ${tenantData?.leaseDurationMonths ? `${tenantData.leaseDurationMonths} meses` : '12 meses'}
  - Reajuste Anual: Índice acumulado IPCA ou IGP-M da FGV conforme Art. 18 da Lei 8.245/91
  - Observações Customizadas: ${contractObs}
  
  GARANTIA LOCATÍCIA:
  - Detalhe da Garantia: ${guaranteeInfo}
  ${specialClausesText}
  
  CLÁUSULAS E REQUISITOS JURÍDICOS OBRIGATÓRIOS:
  1. Adequação total da linguagem e artigos ao tipo do documento (${documentType}).
  2. Citação expressa das fundamentações legais federais pertinentes (Lei nº 8.245/1991, Código Civil Lei 10.406/2002).
  3. Formatação impecável para impressão/PDF de comprovante oficial.
  
  ESTILIZAÇÃO E FORMATO DO DOCUMENTO (HTML FORMAL A4):
  - Retorne APENAS CÓDIGO HTML limpo e elegante (usando tags semânticas como <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, <tr>, <td>).
  - NUNCA use a tag <mark>, NUNCA adicione estilos de background-color (fundo amarelo/verde), e NUNCA adicione blocos coloridos. O documento deve ser 100% LIMPO E PROFISSIONAL para impressão em papel timbrado/A4.
  - Para títulos, utilize h1 e h2 centralizados e em caixa alta.
  - Para seções de cláusulas e itens, utilize numeração clara e negrito no início dos parágrafos.
  - Para linhas de assinatura no final do documento, crie um bloco flexível ou tabela com borda superior para as assinaturas do LOCADOR, LOCATÁRIO e TESTEMUNHAS.
  - Não use blocos de código markdown \`\`\`html. Retorne a estrutura HTML diretamente.
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  const rawHtml = response.text?.replace(/```html/g, '').replace(/```/g, '').trim() || '';

  // Remove any remaining <mark> tags or background-color inline styles to ensure pristine legal formatting
  return rawHtml
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/style="[^"]*background-color:[^"]*"/gi, '');
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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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
      model: 'gemini-2.5-flash',
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
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2
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
  
  const prompt = `Você é um especialista em direito imobiliário e auditoria contratual.
Analise minunciosamente o documento fornecido (pode ser um contrato de aluguel em formato texto, foto, PDF ou dados colados de uma planilha).
Extraia com alta precisão e profundidade todas as informações estruturadas em formato JSON estrito:

{
  "property": {
    "name": "<nome descritivo curto do imóvel, ex: Casa Centro, Apto 202 Bloco B>",
    "address": "<endereço completo do imóvel com rua, número, bairro, cidade e estado>",
    "cep": "<CEP do imóvel no formato 00000-000, se houver>",
    "rentValue": <valor numérico float do aluguel, ex: 1800.00>,
    "paymentDay": <dia do mês de vencimento int, ex: 5>,
    "rules": "<extraia todas as regras e restrições do imóvel, como horários de silêncio, proibições, uso exclusivo residencial/comercial, etc.>",
    "alerts": "<observações de estado do imóvel, conservação, vistoria ou infraestrutura mencionada>",
    "allowPets": <boolean ou null se não especificado>,
    "allowSmoking": <boolean ou null se não especificado>,
    "maxResidents": <int ou null se não especificado>,
    "chargeLateFees": <boolean, true se houver cláusula de multa por atraso>,
    "lateFeePenalty": <float da porcentagem de multa por atraso, ex: 10>,
    "lateFeeDaily": <float dos juros diários por atraso %, ex: 0.033>
  },
  "tenant": {
    "name": "<nome completo do inquilino/locatário principal>",
    "cpf": "<CPF do inquilino, apenas números ou formatado>",
    "contact": "<telefone/WhatsApp de contato>",
    "spouse": "<nome e CPF do cônjuge/companheiro ou copartícipe, se houver>",
    "children": "<detalhes de filhos e dependentes mencionados>",
    "pets": "<detalhes dos animais de estimação do inquilino>",
    "vehicles": "<detalhes dos veículos e vagas de garagem informadas>",
    "isSmoker": <boolean, true se mencionado que o inquilino fuma>,
    "residentCount": <int com a quantidade total de moradores no imóvel>,
    "additionalResidents": [
      {
        "name": "<nome do ocupante secundário>",
        "relation": "<grau de parentesco ou relação>",
        "cpf": "<CPF se houver>",
        "age": "<idade se houver>"
      }
    ],
    "observations": "<resumo completo do perfil, notas especiais, fiadores, hábitos ou observações extraídas do documento>"
  },
  "contract": {
    "startDate": "<data de início da locação no formato YYYY-MM-DD>",
    "endDate": "<data de término da locação no formato YYYY-MM-DD>",
    "leaseDurationMonths": <int da duração em meses, ex: 12 ou 30>,
    "readjustmentIndex": "<índice de reajuste anual mencionado: 'IPCA', 'IGPM' ou 'Outro'>",
    "rescissionFine": "<detalhes da cláusula de multa por rescisão antecipada>",
    "guaranteeType": "<tipo de garantia: 'caucao', 'fiador', 'seguro_fianca' ou 'sem_garantia'>",
    "fiadorInfo": "<dados do fiador se houver (nome, CPF, endereço)>"
  },
  "deposit": {
    "hasDeposit": <boolean, true se houver qualquer caução/depósito/garantia em dinheiro mencionada no contrato>,
    "depositValue": <valor numérico float total da caução em R$, ex: 3600.00>,
    "depositInstallments": <int de parcelas da caução (ex: 1 se for à vista, 2, 3, 4, 6, etc.)>,
    "depositDueDate": "<data combinada para pagamento da caução no formato YYYY-MM-DD ou vazio>",
    "depositIsPaid": <boolean, true se o contrato indicar que a caução já foi paga/entregue no ato ou na assinatura>
  },
  "secondOwner": {
    "hasSecondOwner": <boolean, true se houver segundo proprietário, locador 2, coproprietário ou cônjuge do proprietário/locador no contrato>,
    "name": "<nome completo do segundo proprietário/coproprietário>",
    "cpfCnpj": "<CPF ou CNPJ do segundo proprietário>",
    "phone": "<telefone/contato>",
    "email": "<email>",
    "pixKey": "<chave PIX do segundo proprietário se houver>",
    "sharePercentage": <porcentagem de participação, ex: 50>
  },
  "specialClauses": [
    "<extraia cláusulas específicas e personalizadas encontradas no contrato, ex: 'Permitida benfeitoria com desconto no aluguel', 'Devolução com pintura nova em tinta látex branca', 'Uso proibido para sublocação ou Airbnb'>"
  ],
  "extractedClauses": [
    {
      "title": "<título da cláusula, ex: Cláusula de Rescisão e Multa>",
      "summary": "<resumo explicativo do que a cláusula determina>",
      "legalBasis": "<base legal correspondente na Lei 8.245/91 ou Código Civil, ex: Artigo 4º da Lei do Inquilinato>"
    }
  ],
  "feedback": {
    "missingInfo": ["<lista de pontos vitais faltantes ou ambíguos no contrato>"],
    "improvements": ["<recomendações jurídicas para mitigar riscos para o locador conforme a Lei do Inquilinato>"]
  }
}

REGRAS RÍGIDAS DE SAÍDA:
- Retorne APENAS o JSON válido acima, sem formatação markdown extra fora do JSON.
- Se algum dado numérico não for encontrado, coloque 0. Se texto não for encontrado, coloque string vazia "". Se boolean não for encontrado, coloque false.
- A lista 'extractedClauses' deve conter de 3 a 7 das cláusulas mais importantes extraídas do contrato (Objeto/Destinação, Valor/Atraso, Rescisão/Multa, Caução/Garantia, Conservação/Vistoria, Reajuste).

Texto/Documento analisado:
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
