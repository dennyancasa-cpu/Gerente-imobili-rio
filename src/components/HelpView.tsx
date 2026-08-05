import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Send, BookText, ChevronRight, CheckCircle2, MessageSquare, AlertCircle, 
  Home, Users, DollarSign, Calendar, CheckSquare, Sparkles, Scale, Archive, 
  Wrench, Cloud, Bell, Smartphone, RefreshCw, FileText, ArrowRightLeft, Search,
  Zap, LifeBuoy, FileSearch, TrendingUp, ShieldCheck, GraduationCap, Compass,
  ChevronDown, ArrowRight, Play, Settings, Layers, Building2, Check, HelpCircle
} from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const getBotResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  const prefix = "Mestre IA: ";

  // Primeiro passos / Começar do zero
  if (lowerInput.includes('começar') || lowerInput.includes('comecar') || lowerInput.includes('primeiro passo') || lowerInput.includes('iniciante') || lowerInput.includes('do zero') || lowerInput.includes('tutorial') || lowerInput.includes('como usar')) {
    return prefix + 'Seja muito bem-vindo! Para começar a usar o sistema **do zero**, siga estes 3 passos simples:\n\n' +
      '**1º Passo — Cadastre o Imóvel:** Vá no menu **"Imóveis"** e clique em **"Novo Imóvel"**. Informe o nome do imóvel (ex: Apt 102 - Bloco A), endereço, valor base do aluguel e o dia de vencimento desejado.\n\n' +
      '**2º Passo — Cadastre e Aloque o Inquilino:** Vá no menu **"Inquilinos"**, clique em **"Novo Inquilino"** e preencha os dados dele (nome, CPF, WhatsApp). Em seguida, altere o status dele para **"Alocado"**, selecione o imóvel cadastrado e defina se a entrada é **Caução** (garantia) ou **Primeiro Aluguel**.\n\n' +
      '**3º Passo — Acompanhe o Financeiro:** Vá no menu **"Financeiro"**. O sistema criará a cobrança mensal automaticamente no cronograma. Quando o inquilino pagar, basta clicar em **"Confirmar Pagamento"** ou **"Gerar Recibo"**!';
  }

  // Como cadastrar Imóvel
  if (lowerInput.includes('cadastrar imóvel') || lowerInput.includes('cadastrar imovel') || lowerInput.includes('novo imóvel') || lowerInput.includes('novo imovel') || lowerInput.includes('adicionar imóvel')) {
    return prefix + 'Para cadastrar um imóvel:\n\n1. Clique no menu lateral **"Imóveis"**.\n2. Clique no botão azul **"Novo Imóvel"** no topo da página.\n3. Preencha o identificador (ex: Casa da Rua das Flores, 123), valor da mensalidade e dia padrão de vencimento (ex: dia 10).\n4. Salve. Se o imóvel já tiver contrato ativo, você poderá associar um inquilino logo em seguida!';
  }

  // Como cadastrar Inquilino
  if (lowerInput.includes('cadastrar inquilino') || lowerInput.includes('novo inquilino') || lowerInput.includes('alocar') || lowerInput.includes('adicionar inquilino')) {
    return prefix + 'Para cadastrar um novo inquilino:\n\n1. Clique no menu lateral **"Inquilinos"**.\n2. Clique em **"Novo Inquilino"**.\n3. Digite o nome, telefone/WhatsApp e dados de contato.\n4. Para vinculá-lo a uma moradia, selecione o imóvel desejado e mude o status para **"Alocado"**.\n5. Escolha se o valor cobrado na entrada é **Caução** (retido como garantia) ou **Primeiro Aluguel** (mês vigente pago adiantado).';
  }

  // Como dar baixa / confirmar pagamento
  if (lowerInput.includes('baixa') || lowerInput.includes('confirmar pagamento') || lowerInput.includes('receber aluguel') || lowerInput.includes('pago') || lowerInput.includes('recebi')) {
    return prefix + 'Para registrar um pagamento recebido:\n\n1. Acesse o menu **"Financeiro"**.\n2. Localize o lançamento correspondente na lista do mês.\n3. Clique em **"Confirmar Pagamento"**.\n4. Se o valor pago for menor que o valor total (ex: pagou R$ 800 de R$ 1.000), o sistema perguntará se você deseja registrar uma **Baixa Parcial**, criando o saldo pendente de R$ 200 automaticamente!';
  }

  // Google Tasks
  if (lowerInput.includes('tasks') || lowerInput.includes('tarefas') || lowerInput.includes('google tasks') || lowerInput.includes('afazeres') || lowerInput.includes('pendências do dia')) {
    return prefix + 'A integração com o **Google Tasks** permite sincronizar os afazeres da gestão imobiliária diretamente com o app Google Tasks no seu celular ou computador!\n\n**Como usar:**\n1. Acesse a aba **"Google Tasks"** no menu lateral e faça login na sua conta Google.\n2. Crie tarefas operacionais (ex: "Cobrar aluguel de Fulano", "Agendar vistoria no Imóvel B", "Enviar termo de renovação").\n3. Defina a data limite. A tarefa aparecerá instantaneamente no seu widget do Google Tasks no celular, Gmail e Google Agenda, permitindo marcar como concluída com 1 clique no smartphone!';
  }

  // Google Calendar / Agenda
  if (lowerInput.includes('agenda') || lowerInput.includes('calendar') || lowerInput.includes('google agenda') || lowerInput.includes('google calendar') || lowerInput.includes('sincronizar') || lowerInput.includes('calendário') || lowerInput.includes('calendario')) {
    return prefix + 'A **Sincronização com o Google Calendar** envia automaticamente os vencimentos de aluguéis, vencimentos de contratos e lembretes para a sua agenda Google.\n\n**Benefícios:**\n• Lembretes visuais de quando cada aluguel vai vencer.\n• Alertas no celular nos dias de recebimento.\n• Evita o esquecimento de prazos de renovação contratual.';
  }

  // Reajuste do Banco Central (BCB)
  if (lowerInput.includes('reajuste') || lowerInput.includes('bcb') || lowerInput.includes('ipca') || lowerInput.includes('igpm') || lowerInput.includes('igp-m') || lowerInput.includes('selic') || lowerInput.includes('índice') || lowerInput.includes('indice') || lowerInput.includes('inflação')) {
    return prefix + 'O sistema possui integração direta com o **Webservice do Banco Central do Brasil (BCB)** para reajuste automático de aluguéis!\n\n**Como funciona:**\n1. Na aba **"Financeiro"**, acesse a opção de Reajuste de Aluguel.\n2. Escolha o índice acumulado do período (IPCA, IGP-M ou Selic).\n3. O sistema consulta as taxas oficiais do BCB em tempo real, calcula o novo valor atualizado e permite atualizar a mensalidade do contrato com total precisão legal.';
  }

  // Chamados / Tickets / Manutenção
  if (lowerInput.includes('ticket') || lowerInput.includes('chamado') || lowerInput.includes('manutenção') || lowerInput.includes('manutencao') || lowerInput.includes('reparo') || lowerInput.includes('suporte') || lowerInput.includes('atendimento') || lowerInput.includes('solicitação')) {
    return prefix + 'O módulo de **Chamados e Atendimentos (Tickets)** permite centralizar os pedidos dos seus inquilinos (solicitações de reparos, vistorias, dúvidas e boletos).\n\n**Como usar:**\n1. Acesse **"Chamados"** no menu lateral.\n2. Registre novos chamados definindo a categoria (Manutenção, Financeiro, Vistoria, Outros) e o nível de prioridade (Alta, Média, Baixa).\n3. Acompanhe a evolução do status (**Aberto**, **Em Andamento**, **Concluído**) até a resolução final.';
  }

  // Contratos & Jurídico / Renovação
  if (lowerInput.includes('contrato') || lowerInput.includes('renov') || lowerInput.includes('termo aditivo') || lowerInput.includes('minuta') || lowerInput.includes('jurídico') || lowerInput.includes('juridico') || lowerInput.includes('legal')) {
    return prefix + 'Para gerenciar contratos e documentos jurídicos:\n\n1. **Renovação Simplificada:** Na aba **"Contratos"**, selecione o contrato ativo e clique em **"Renovação de Aluguel"** para estender o prazo gerando um Termo Aditivo automático sem precisar reescrever o contrato do zero.\n2. **Minutas com IA:** Na aba **"Minutas & Contratos"**, utilize nossa IA Jurídica para elaborar minutas personalizadas de contratos residenciais, comerciais, depósitos e notificações extrajudiciais.\n3. **Impressão & PDF:** Exporte e imprima qualquer documento com 1 clique.';
  }

  // Importação por IA / Central IA
  if (lowerInput.includes('import') || lowerInput.includes('central ia') || lowerInput.includes('pdf') || lowerInput.includes('imagem') || lowerInput.includes('ocr') || lowerInput.includes('foto do contrato')) {
    return prefix + 'A **Central IA (Importação por Inteligência Artificial)** lê contratos pré-existentes de forma automática:\n\n1. Acesse **"Central IA"** no menu lateral.\n2. Cole o texto do contrato ou faça upload de fotos/PDFs do documento físico.\n3. A IA processa o documento, extrai o imóvel, o inquilino, valor, dia de vencimento e cláusulas.\n4. Com apenas **1 clique**, o sistema cadastra tudo automaticamente e ainda roda uma **Auditoria Jurídica** apontando cláusulas abusivas ou pontos de atenção!';
  }

  // Recibo & Comprovante
  if (lowerInput.includes('recibo') || lowerInput.includes('comprovante') || lowerInput.includes('quitação') || lowerInput.includes('quitacao')) {
    return prefix + 'Para **gerar recibos profissionais**:\n1. Vá na aba **"Financeiro"**, selecione o pagamento confirmado.\n2. Clique em **"Gerar Recibo"**.\n3. Escolha entre o **Recibo Simples** ou o **Recibo Detalhado** (com discriminação completa do imóvel, período e inquilino).\n4. Baixe o PDF ou imprima. O comprovante anexado fica salvo na sua **Central Cloud (Google Drive)**!';
  }

  // Garagem / Storage / Depósito
  if (lowerInput.includes('garagem') || lowerInput.includes('depósito') || lowerInput.includes('deposito') || lowerInput.includes('storage') || lowerInput.includes('box') || lowerInput.includes('galpão') || lowerInput.includes('galpao') || lowerInput.includes('espaço') || lowerInput.includes('espaco')) {
    return prefix + 'O módulo **Aluguel de Espaço (Garagens e Depósitos)** é feito sob medida para gerenciar a locação de boxes, vagas, galpões e depósitos:\n\n1. Acesse **"Aluguel de Espaço"** no menu.\n2. Cadastre o espaço, contratante, vigência e valor.\n3. Clique em **"Gerar Cobranças"** para preencher o cronograma financeiro.\n4. Para facilitar a diferenciação visual rápida no fluxo financeiro, esses recebimentos utilizam a cor **Azul Indigo**!';
  }

  // Imóvel & Vistoria
  if (lowerInput.includes('imóvel') || lowerInput.includes('imovel') || lowerInput.includes('vistoria') || lowerInput.includes('laudo') || lowerInput.includes('foto')) {
    return prefix + 'Na aba **"Imóveis"**, você cadastra seu patrimônio com valor base e dia de vencimento.\n\n**Vistorias:** Você pode realizar laudos de vistoria registrando o estado de conservação e anexando fotos do imóvel na entrada e saída do inquilino para evitar disputas no fim do contrato!';
  }

  // Inquilino & Caução vs 1º Aluguel
  if (lowerInput.includes('inquilino') || lowerInput.includes('caução') || lowerInput.includes('caucao') || lowerInput.includes('morador') || lowerInput.includes('garantia')) {
    return prefix + 'Na aba **"Inquilinos"**:\n1. Cadastre novos moradores com dados completos e contato de WhatsApp.\n2. Ao alterar o status para **"Alocado"**, vincule-o ao imóvel e escolha se o valor inicial é **Caução** (garantia retida) ou **Primeiro Aluguel** (mês adiantado).\n3. O sistema cria a linha do tempo financeira individual e permite enviar lembretes diretos pelo WhatsApp!';
  }

  // Acordos & Renegociações
  if (lowerInput.includes('acordo') || lowerInput.includes('renegoc') || lowerInput.includes('atrasad') || lowerInput.includes('parcela') || lowerInput.includes('dívida') || lowerInput.includes('divida')) {
    return prefix + 'Se o inquilino acumular dívidas, use o recurso **"Realizar Acordo"** na aba Financeiro:\n• Consolida débitos vencidos em um novo plano de parcelamento.\n• Define o número de parcelas e novas datas de vencimento.\n• Atualiza automaticamente a linha do tempo de recebimentos mantendo o controle total da dívida renegociada.';
  }

  // IA Financeira
  if (lowerInput.includes('ia financeira') || lowerInput.includes('diagnóstico') || lowerInput.includes('diagnostico') || lowerInput.includes('previsão') || lowerInput.includes('lucro') || lowerInput.includes('balanço')) {
    return prefix + 'A **IA Financeira** (no menu lateral) analisa o desempenho da sua carteira imobiliária:\n• Diagnósticos automáticos sobre taxa de ocupação e inadimplência.\n• Dicas personalizadas para aumentar sua rentabilidade líquida.\n• Projeção de receitas futuras e balanço detalhado entre ganhos e despesas de manutenção.';
  }

  // Central Cloud / Google Drive
  if (lowerInput.includes('drive') || lowerInput.includes('cloud') || lowerInput.includes('nuvem') || lowerInput.includes('anexo')) {
    return prefix + 'A **Central Cloud** sincroniza o app ao seu **Google Drive** pessoal:\n• Fotos de recibos, comprovantes de PIX, laudos de vistoria e PDFs de contratos são salvos na nuvem em pastas organizadas.\n• Não ocupa memória no seu dispositivo e garante cópia de segurança permanente.';
  }

  // PWA / Instalação
  if (lowerInput.includes('instalar') || lowerInput.includes('pwa') || lowerInput.includes('aplicativo') || lowerInput.includes('offline') || lowerInput.includes('celular')) {
    return prefix + 'O aplicativo é **PWA (Progressive Web App)** e funciona também **Offline**!\n\n**Como instalar:**\n• **Android (Chrome):** Toque nos 3 pontinhos no canto superior e selecione **"Instalar aplicativo"**.\n• **iPhone/iOS (Safari):** Toque no botão de Compartilhar e escolha **"Adicionar à Tela de Início"**.\n• **Computador:** Clique no ícone de instalação na barra do navegador.';
  }

  // Alertas e Snooze
  if (lowerInput.includes('alerta') || lowerInput.includes('notifica') || lowerInput.includes('snooze') || lowerInput.includes('adiar')) {
    return prefix + 'O sistema conta com um **Central de Alertas Inteligente**:\n• Notifica sobre aluguéis prestes a vencer, vencidos e contratos no fim do prazo.\n• Você pode usar o recurso **Snooze (Adiar Alerta)** para ser relembrado mais tarde sem perder o foco das suas tarefas prioritárias do dia.';
  }

  // Cumprimento genérico
  if (lowerInput.includes('oi') || lowerInput.includes('olá') || lowerInput.includes('ola') || lowerInput.includes('bom dia') || lowerInput.includes('boa tarde') || lowerInput.includes('boa noite')) {
    return prefix + 'Olá! Sou o especialista de ajuda do Gerente Imobiliário. Como posso te apoiar com a gestão dos seus imóveis, contratos, finanças ou integrações hoje?';
  }

  return prefix + 'Sou sua inteligência especialista de suporte! Posso te orientar desde o básico (**primeiros passos, cadastrar imóvel/inquilino, confirmar pagamento**) até recursos avançados (**Google Tasks**, **Reajuste BCB**, **Chamados**, **Central IA**, **Garagens**, **Minutas**, **IA Financeira**). O que você gostaria de aprender agora?';
};

export function HelpView() {
  const [activeTab, setActiveTab] = useState<'learning' | 'pages' | 'manual' | 'agent'>('learning');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o especialista da Central de Ajuda do Gerente Imobiliário. Como posso te orientar do básico ao avançado hoje?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg && lastMsg.role === 'model') {
      setTimeout(() => {
        const container = scrollRef.current;
        const lastMsgEl = document.getElementById(`help-message-${messages.length - 1}`);
        if (container && lastMsgEl) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = lastMsgEl.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({
            top: relativeTop - 16,
            behavior: 'smooth'
          });
        }
      }, 50);
    } else {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const responseText = getBotResponse(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (questionText: string) => {
    setActiveTab('agent');
    setInputText(questionText);
  };

  // Trilha de Aprendizado Progressivo (Do Zero ao Avançado)
  const learningLevels = [
    {
      level: 'Passo 1 • Nível Iniciante',
      badgeColor: 'bg-emerald-500 text-white',
      borderAccent: 'border-emerald-200 bg-emerald-50/30',
      title: 'Primeiro Contato com o Sistema (O Básico do Dia a Dia)',
      description: 'Aprenda a cadastrar seu primeiro patrimônio, vincular um morador e dar baixa no primeiro aluguel.',
      icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
      items: [
        {
          title: '1. Cadastrando seu Primeiro Imóvel',
          text: 'Vá na aba "Imóveis" no menu lateral e clique em "Novo Imóvel". Preencha o nome (ex: Apt 101), endereço, valor do aluguel e o dia do mês desejado para vencimento.',
          actionText: 'Perguntar como cadastrar imóvel'
        },
        {
          title: '2. Cadastrando e Alocando o Inquilino',
          text: 'Vá na aba "Inquilinos", clique em "Novo Inquilino" e insira o nome e WhatsApp. Em seguida, mude o status para "Alocado", vincule ao imóvel e defina se a garantia é Caução ou Mês Adiantado.',
          actionText: 'Perguntar como alocar inquilino'
        },
        {
          title: '3. Registrando o Recebimento de Aluguel (Baixa)',
          text: 'Na aba "Financeiro", você verá a cobrança mensal criada automaticamente. Quando receber o valor via PIX ou dinheiro, clique em "Confirmar Pagamento". Se o morador pagar só uma parte, faça a "Baixa Parcial".',
          actionText: 'Perguntar sobre baixa e pagamentos'
        }
      ]
    },
    {
      level: 'Passo 2 • Nível Intermediário',
      badgeColor: 'bg-indigo-500 text-white',
      borderAccent: 'border-indigo-200 bg-indigo-50/30',
      title: 'Gestão Completa, Recibos & Atendimento ao Cliente',
      description: 'Aprenda a emitir recibos profissionais, gerenciar garagens/depósitos e controlar chamados de manutenção.',
      icon: <Compass className="w-6 h-6 text-indigo-600" />,
      items: [
        {
          title: '1. Emissão de Recibos Detalhados com QR Code',
          text: 'Após confirmar um pagamento no Financeiro, clique em "Gerar Recibo". Escolha o Recibo Detalhado (que descrimina imóvel, período e taxa) e envie o PDF pelo WhatsApp com 1 clique.',
          actionText: 'Como emitir recibo em PDF'
        },
        {
          title: '2. Aluguel de Espaço (Garagens, Boxes & Depósitos)',
          text: 'Acesse "Aluguel de Espaço" para gerenciar locação de vagas de garagem e depósitos comerciais. Os recebimentos são destacados em tom Azul Indigo no fluxo de caixa.',
          actionText: 'Como funciona Aluguel de Espaço'
        },
        {
          title: '3. Central de Chamados & Manutenção (Tickets)',
          text: 'Receba solicitações de reparos ou dúvidas dos inquilinos na aba "Chamados". Organize o andamento de "Aberto" para "Em Andamento" e "Concluído", registrando todos os custos.',
          actionText: 'Como gerenciar Chamados'
        }
      ]
    },
    {
      level: 'Passo 3 • Nível Avançado',
      badgeColor: 'bg-purple-500 text-white',
      borderAccent: 'border-purple-200 bg-purple-50/30',
      title: 'Automações Inteligentes, Banco Central (BCB) & Nuvem',
      description: 'Dobre sua produtividade com leitura de contratos por IA, reajuste de inflação oficial e sincronização Google.',
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      items: [
        {
          title: '1. Leitura e Importação de Contratos com Central IA',
          text: 'Acesse "Central IA". Cole o texto do contrato físico ou envie uma foto/PDF. A inteligência extrai morador, valor e datas automaticamente, efetuando o cadastro completo em 1 clique.',
          actionText: 'Como usar a Central IA'
        },
        {
          title: '2. Reajuste de Aluguel pelo Webservice do Banco Central (BCB)',
          text: 'Na aba Financeiro, use o Reajuste BCB. O sistema consulta o Banco Central para buscar o IPCA ou IGP-M acumulado e calcula a correção da mensalidade com amparo legal imediato.',
          actionText: 'Como funciona o Reajuste BCB'
        },
        {
          title: '3. Sincronização Google Tasks, Google Calendar & Google Drive',
          text: 'Conecte sua conta no menu Configurações ou Google Tasks. Seus lembretes de cobrança irão para a agenda e suas tarefas diárias sincronizam direto com seu celular Android ou iPhone.',
          actionText: 'Como sincronizar com o Google'
        }
      ]
    }
  ];

  // Guia Tela por Tela (Mapeamento do Menu Lateral)
  const pageDirectory = [
    {
      name: '1. Dashboard (Início)',
      icon: <Home className="w-5 h-5 text-indigo-600" />,
      tag: 'Primeira Tela',
      desc: 'Visão geral do seu negócio imobiliário. Apresenta faturamento do mês, ocupação, atalhos rápidos e resumo das principais pendências.'
    },
    {
      name: '2. Hub Jurídico IA',
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      tag: 'Consultor IA & Leitura',
      desc: 'Central inteligente que abriga o Consultor Jurídico IA (Lei do Inquilinato), Leitor de Contratos em PDF/foto por OCR, Importação em Lote e Gerador de Minutas.'
    },
    {
      name: '3. Inteligência e Alertas',
      icon: <Bell className="w-5 h-5 text-amber-500" />,
      tag: 'Alertas & Google Tasks',
      desc: 'Painel de notificações urgentes, lembretes de cobrança, botão direto para o Google Tasks no seu celular e criação de chamados de atendimento.'
    },
    {
      name: '4. Imóveis',
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
      tag: 'Patrimônio',
      desc: 'Cadastro de moradias, salas comerciais e apartamentos. Permite anexar laudos de vistoria completos com fotos de entrada e saída.'
    },
    {
      name: '5. Inquilinos',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      tag: 'Moradores',
      desc: 'Gestão de inquilinos, envio de lembretes via WhatsApp, alocação com Caução ou Mês Adiantado e histórico individual de pagamentos.'
    },
    {
      name: '6. Contratos',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
      tag: 'Vigência Legal',
      desc: 'Acompanhamento de prazos de locação, alertas de encerramento e botão de Renovação Simplificada que gera o Termo Aditivo automático.'
    },
    {
      name: '7. Financeiro',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      tag: 'Caixa & Reajuste BCB',
      desc: 'Painel unificado com Panorama Geral, Recebimentos, Despesas, Emissão de Recibos em PDF, Baixas Parciais e Reajuste Automático via Banco Central (BCB).'
    },
    {
      name: '8. Espaço & Ativos (Garagens)',
      icon: <Archive className="w-5 h-5 text-indigo-600" />,
      tag: 'Espaços & Boxes',
      desc: 'Gestão de vagas de garagem, boxes e depósitos comerciais com destaque visual em tom Azul Indigo no fluxo de caixa.'
    },
    {
      name: '9. Configurações',
      icon: <Settings className="w-5 h-5 text-slate-700" />,
      tag: 'Permissões & Conexões',
      desc: 'Central Unificada para gerenciar o login Google (Drive/Calendar/Tasks), Notificações Push, Permissões do Sistema, aplicativo PWA e Backup.'
    }
  ];

  const manualSections = [
    {
      id: 'tasks-calendar',
      badge: 'Integrações Google',
      badgeColor: 'bg-emerald-500 text-white',
      title: 'Google Tasks & Google Calendar',
      icon: <CheckSquare className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
      description: 'Sincronize vencimentos de cobranças na agenda e gerencie listas operacionais de tarefas pelo seu celular.',
      steps: [
        'Acesse a aba "Google Tasks" ou "Calendar Sync" e conecte sua Conta Google.',
        'Os vencimentos de aluguéis e prazos de contrato são injetados automaticamente no seu Google Agenda.',
        'Crie listas de afazeres no Google Tasks (ex: enviar recibo, vistoriar imóvel, negociar renovação).',
        'Suas tarefas sincronizam instantaneamente com o aplicativo Google Tasks e Gmail no seu smartphone!'
      ]
    },
    {
      id: 'bcb-reajuste',
      badge: 'Economia & Finanças',
      badgeColor: 'bg-blue-500 text-white',
      title: 'Reajuste pelo Banco Central (BCB)',
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50/50 border-blue-100',
      description: 'Atualize os valores de aluguel acumulados de forma automática com os índices oficiais do Banco Central.',
      steps: [
        'Na aba "Financeiro", clique em Reajuste de Aluguel.',
        'Selecione o índice contratual desejado (IPCA, IGP-M ou Selic).',
        'O sistema consulta o webservice do Banco Central do Brasil para buscar a inflação do período.',
        'O cálculo da correção é efetuado e você pode atualizar o valor da mensalidade com respaldo legal imediato.'
      ]
    },
    {
      id: 'tickets',
      badge: 'Atendimento & Manutenção',
      badgeColor: 'bg-amber-500 text-white',
      title: 'Central de Chamados (Tickets)',
      icon: <Wrench className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-50/50 border-amber-100',
      description: 'Centralize solicitações de reparos, vistorias, dúvidas e boletos enviadas por inquilinos.',
      steps: [
        'Vá na aba "Chamados" no menu lateral.',
        'Abra um novo chamado associando o imóvel, inquilino, tipo (Manutenção, Financeiro, Vistoria) e prioridade.',
        'Acompanhe o andamento alterando o status para "Em Andamento" ou "Concluído".',
        'Mantenha o histórico transparente de todos os reparos e custos efetuados no imóvel.'
      ]
    },
    {
      id: 'central-ia-import',
      badge: 'Inteligência Artificial',
      badgeColor: 'bg-purple-500 text-white',
      title: 'Central IA & Leitura de Contratos por OCR/Texto',
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50/50 border-purple-100',
      description: 'Importe contratos antigos colando o texto ou enviando foto/PDF para cadastro automático.',
      steps: [
        'Acesse a aba "Central IA" no menu lateral.',
        'Cole o texto do contrato ou faça upload do documento em PDF ou imagem.',
        'A IA analisa as cláusulas e extrai: Imóvel, Inquilino, Valor do Aluguel, Caução e Dia de Vencimento.',
        'Clique em "Importar Dados" para criar tudo no sistema e visualize a Auditoria Jurídica de Cláusulas Abusivas!'
      ]
    },
    {
      id: 'espacos-garagens',
      badge: 'Aluguel de Espaço',
      badgeColor: 'bg-indigo-500 text-white',
      title: 'Garagens, Depósitos & Galpões (Azul Indigo)',
      icon: <Archive className="w-6 h-6 text-indigo-600" />,
      bg: 'bg-indigo-50/50 border-indigo-100',
      description: 'Módulo dedicado para gerenciar a locação de vagas, boxes, galpões e depósitos comerciais.',
      steps: [
        'Acesse "Aluguel de Espaço" e clique em "Cadastrar Novo Espaço".',
        'Preencha os dados de vigência, contratante, valor e dia de vencimento.',
        'Clique em "Gerar Cobranças" para criar as mensalidades do cronograma.',
        'No fluxo financeiro geral, esses recebimentos são destacados em Azul Indigo para diferenciação rápida!'
      ]
    },
    {
      id: 'contratos-renovacao',
      badge: 'Gestão Contratual',
      badgeColor: 'bg-emerald-500 text-white',
      title: 'Minutas Jurídicas & Renovação de Aluguel',
      icon: <FileText className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
      description: 'Elabore contratos completos com IA e estenda vigências com Termos Aditivos em 1 clique.',
      steps: [
        'Na aba "Contratos", selecione um contrato vencendo para gerar o Termo de Renovação de Aluguel.',
        'O sistema cria o termo aditivo mantendo as regras e aplicando novos prazos sem precisar refazer do zero.',
        'Na aba "Minutas & Contratos", utilize o gerador de minutas por IA para criar contratos residenciais e comerciais personalizados.'
      ]
    },
    {
      id: 'financeiro-recibos-acordos',
      badge: 'Financeiro & Recibos',
      badgeColor: 'bg-blue-500 text-white',
      title: 'Baixa Parcial, Recibos & Acordos de Dívida',
      icon: <DollarSign className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50/50 border-blue-100',
      description: 'Gerencie recebimentos, emita recibos em PDF com QR Code e renegocie débitos com parcelamento.',
      steps: [
        'Confirmação Total ou Parcial: Se o inquilino pagar apenas parte do valor, o sistema cria o "Saldo Pendente".',
        'Emissão de Recibo: Gere Recibos Simples ou Detalhados com dados do imóvel e envie via WhatsApp ou PDF.',
        'Realizar Acordo: Consolide dívidas antigas em parcelas mensais organizadas com novas datas de vencimento.',
        'Lançamento de Despesas: Registre gastos com obras, IPTU e manutenção para calcular o seu Lucro Líquido Real.'
      ]
    },
    {
      id: 'ia-financeira',
      badge: 'Análise Estratégica',
      badgeColor: 'bg-purple-500 text-white',
      title: 'IA Financeira & Diagnóstico de Portfólio',
      icon: <Zap className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50/50 border-purple-100',
      description: 'Obtenha relatórios inteligentes e análises preditivas para otimizar os lucros do seu patrimônio.',
      steps: [
        'Acesse a aba "IA Financeira" para visualizar o diagnóstico em tempo real da sua carteira.',
        'Receba conselhos da IA para reduzir a inadimplência e ajustar preços com base na média do mercado.',
        'Acompanhe projeções semestrais de faturamento x despesas de manutenção.'
      ]
    },
    {
      id: 'drive-pwa',
      badge: 'Nuvem & App PWA',
      badgeColor: 'bg-slate-700 text-white',
      title: 'Central Cloud (Google Drive) & App PWA Offline',
      icon: <Cloud className="w-6 h-6 text-slate-700" />,
      bg: 'bg-slate-50 border-slate-200',
      description: 'Armazene comprovantes no seu Google Drive e instale o app no celular com suporte offline.',
      steps: [
        'Conecte o Google Drive para que comprovantes, laudos e recibos fiquem salvos na sua nuvem pessoal.',
        'Instale o app na tela inicial do celular (Android via Chrome / iOS via Safari "Compartilhar").',
        'O sistema armazena dados localmente e funciona mesmo quando você estiver sem internet!'
      ]
    }
  ];

  const filteredSections = manualSections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <LifeBuoy className="w-4 h-4 text-indigo-600" />
          Central Especialista de Ajuda & Suporte
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Aprenda no seu ritmo — Do Zero ao Avançado
        </h1>
        <p className="text-slate-600 text-base md:text-lg max-w-3xl leading-relaxed">
          Navegue pela trilha de aprendizado simples, entenda o que cada tela faz ou tire suas dúvidas diretamente com nossa inteligência artificial pré-treinada.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border shadow-sm w-fit gap-1">
        <button
          onClick={() => setActiveTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'learning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Passo a Passo (Do Zero ao Avançado)
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'pages' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          Guia Tela por Tela
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookText className="w-4 h-4" />
          Manual de Recursos
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'agent' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          Mestre IA (Tirar Dúvidas)
        </button>
      </div>

      {/* TAB 1: Trilha de Aprendizado Progressivo */}
      {activeTab === 'learning' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <GraduationCap className="w-48 h-48 text-white" />
            </div>
            <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-bold uppercase tracking-widest inline-block">
              Método Simplificado de Aprendizado
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Aprenda a Usar o Sistema em 3 Passos Lógicos
            </h2>
            <p className="text-indigo-100 text-sm sm:text-base max-w-2xl leading-relaxed">
              Você não precisa aprender tudo de uma vez. Comece pelo **Passo 1** para colocar seus imóveis para rodar hoje mesmo!
            </p>
          </div>

          <div className="space-y-6">
            {learningLevels.map((lvl, idx) => (
              <div 
                key={idx}
                className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 ${lvl.borderAccent}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
                      {lvl.icon}
                    </div>
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${lvl.badgeColor}`}>
                        {lvl.level}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-1">{lvl.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600">{lvl.description}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lvl.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.text}
                        </p>
                      </div>

                      <button
                        onClick={() => handleQuickQuestion(item.actionText)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group pt-2 border-t border-slate-100"
                      >
                        {item.actionText}
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Guia Tela por Tela */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border shadow-sm space-y-3">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Compass className="w-7 h-7 text-indigo-600" />
              Guia Completo Tela por Tela (Mapeamento do Menu)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              Abaixo está a explicação direta do papel de cada item no menu lateral do sistema, listados do topo (Dashboard) até o rodapé (Configurações).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pageDirectory.map((page, idx) => (
              <div 
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shrink-0 mt-1">
                  {page.icon}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900">{page.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {page.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {page.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Manual de Recursos Especialistas */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar no manual (ex: Google Tasks, Reajuste BCB, Minutas, Recibos, Garagens)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="font-bold text-slate-500 mr-1">Tópicos Frequentes:</span>
            {[
              'Primeiros Passos', 'Google Tasks', 'Reajuste BCB', 'Chamados', 'Renovação', 
              'Central IA', 'Aluguel de Espaço', 'Recibo Detalhado', 'Acordos'
            ].map((topic, idx) => (
              <button
                key={idx}
                onClick={() => setSearchQuery(topic)}
                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors font-medium"
              >
                {topic}
              </button>
            ))}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-bold"
              >
                Limpar busca
              </button>
            )}
          </div>

          {/* Grid of Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSections.map((sec) => (
              <div 
                key={sec.id}
                className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${sec.bg}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      {sec.icon}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${sec.badgeColor}`}>
                      {sec.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">{sec.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{sec.description}</p>

                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                    {sec.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-normal">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-end">
                  <button
                    onClick={() => handleQuickQuestion(`Como funciona ${sec.title}?`)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 group"
                  >
                    Perguntar para a IA sobre isso
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}

            {filteredSections.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white border border-dashed rounded-3xl space-y-3">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-medium">Nenhum tópico encontrado para "{searchQuery}".</p>
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
                >
                  Ver todos os tópicos
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Mestre IA */}
      {activeTab === 'agent' && (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="bg-indigo-600 border-b p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">Mestre IA - Especialista Imobiliário</h2>
                <p className="text-xs text-indigo-100 font-medium">Tire dúvidas do básico (primeiros passos) ao avançado</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-400 text-emerald-950 font-bold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse" /> Online
            </span>
          </div>

          {/* Quick Prompts */}
          <div className="bg-indigo-50/60 p-2.5 border-b flex gap-2 overflow-x-auto text-xs shrink-0">
            {[
              'Por onde começar do zero?',
              'Como cadastrar meu 1º imóvel?',
              'Como dar baixa no aluguel?',
              'Como usar o Google Tasks?',
              'Como reajustar pelo Banco Central?',
              'Como funciona os Chamados?'
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText(q);
                }}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl whitespace-nowrap font-medium transition-colors shrink-0 shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, i) => (
              <div id={`help-message-${i}`} key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none font-medium' 
                      : 'bg-white border text-slate-800 rounded-bl-none space-y-2'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: msg.role === 'user' 
                      ? msg.text 
                      : msg.text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>') 
                  }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-none px-5 py-4 bg-white border shadow-sm flex gap-2 items-center">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                   <span className="text-xs text-slate-400 font-medium ml-2">Consultando módulo de ajuda...</span>
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="p-4 bg-white border-t">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Pergunte sobre primeiros passos, imóveis, baixa, Google Tasks, BCB..."
                className="w-full pl-4 pr-14 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-inner"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
