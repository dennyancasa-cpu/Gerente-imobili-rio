import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Send, BookText, ChevronRight, CheckCircle2, MessageSquare, AlertCircle, 
  Home, Users, DollarSign, Calendar, CheckSquare, Sparkles, Scale, Archive, 
  Wrench, Cloud, Bell, Smartphone, RefreshCw, FileText, ArrowRightLeft, Search,
  Zap, LifeBuoy, FileSearch, TrendingUp, ShieldCheck, GraduationCap, Compass,
  ChevronDown, ArrowRight, Play, Settings, Layers, Building2, Check, HelpCircle,
  MapPin, Volume2, ExternalLink, QrCode, Warehouse, DatabaseBackup, RotateCcw, History
} from 'lucide-react';
import { Payment, Property, Tenant } from '../types';
import { SetupGuideModal } from './SetupGuideModal';

export interface HelpViewProps {
  payments?: Payment[];
  properties?: Property[];
  tenants?: Tenant[];
  isDriveConnected?: boolean;
  onConnectDrive?: () => void;
  onDriveStatusChanged?: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const getBotResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  const prefix = "Mestre IA: ";

  // Novidades / Atualizações / Versão
  if (lowerInput.includes('novidade') || lowerInput.includes('atualiza') || lowerInput.includes('o que mudou') || lowerInput.includes('versão') || lowerInput.includes('versao') || lowerInput.includes('recente')) {
    return prefix + 'Aqui estão as principais **Novas Atualizações do Gerente Imobiliário (v6.9.0)**:\n\n' +
      '• **Google Maps Platform:** Preenchimento automático inteligente de endereços por Autocomplete ao digitar ruas ou condomínios, geocodificação de latitude/longitude e mapa interativo com pin clicável e botão para abrir rotas no Google Maps.\n\n' +
      '• **Notificações Nativas em Segundo Plano:** Avisos sonoros e push na central de notificações do celular ou PC mesmo com a aba fechada/minimizada via Service Worker, com disparo no vencimento do aluguel e botão de teste imediato.\n\n' +
      '• **Assistente Robô Inteligente:** Mascote animado que rastreia preventivamente cobranças dos próximos 5 dias, chamados em aberto e contratos a renovar.\n\n' +
      '• **Hub Jurídico IA & OCR:** Leitor de fotos ou PDFs de contratos antigos que extrai tudo e realiza **Auditoria Jurídica de Cláusulas Abusivas** conforme a Lei do Inquilinato (Lei nº 8.245/1991).\n\n' +
      '• **Google Tasks & Google Agenda:** Sincronização direta com seus afazeres e calendário do smartphone.\n\n' +
      '• **Reajuste Banco Central (BCB):** Atualização automática com IPCA, IGP-M e Selic oficiais em tempo real.';
  }

  // Google Maps / Endereço / Localização / Pin
  if (lowerInput.includes('mapa') || lowerInput.includes('maps') || lowerInput.includes('endereço') || lowerInput.includes('endereco') || lowerInput.includes('localização') || lowerInput.includes('localizacao') || lowerInput.includes('pin') || lowerInput.includes('cep') || lowerInput.includes('autocomplete')) {
    return prefix + 'A nova integração com a **Google Maps Platform** traz agilidade no cadastro e acompanhamento de imóveis:\n\n' +
      '1. **Preenchimento Automático (Autocomplete):** Ao cadastrar ou editar um imóvel, comece digitando o nome da rua, condomínio ou bairro. O sistema busca no Google Maps e preenche logradouro, número, bairro, cidade, estado e CEP instantaneamente!\n\n' +
      '2. **Pin Interativo:** O sistema obtém as coordenadas exatas por satélite e exibe o mapa interativo. Se quiser, você pode clicar no mapa para reposicionar o pin com precisão milimétrica.\n\n' +
      '3. **Abrir Rota:** Na visualização do imóvel, há o botão "Abrir no Google Maps" para traçar rotas de visita ou vistoria no Waze e GPS!';
  }

  // Notificações Nativas / Push / Segundo Plano
  if (lowerInput.includes('notifica') || lowerInput.includes('push') || lowerInput.includes('segundo plano') || lowerInput.includes('som') || lowerInput.includes('vencimento hoje') || lowerInput.includes('aviso')) {
    return prefix + 'O sistema conta com a **Central de Notificações Nativas e em Segundo Plano**:\n\n' +
      '• **Disparo Automático:** O sistema monitora as cobranças e envia uma notificação logo pela manhã para todos os aluguéis ou acordos que vencem na data de hoje.\n\n' +
      '• **Funcionamento em Segundo Plano:** Graças ao Service Worker PWA, você recebe os avisos na barra de notificações do seu celular (Android/iOS) ou do computador (Windows/Mac) mesmo se o aplicativo estiver fechado ou minimizado.\n\n' +
      '• **Como Testar:** Acesse **"Configurações"** ou clique no botão "Disparar Teste de Notificação" para ouvir o som e ver o alerta nativo aparecer no seu aparelho.';
  }

  // Robô Assistente / Mascote
  if (lowerInput.includes('robô') || lowerInput.includes('robo') || lowerInput.includes('mascote') || lowerInput.includes('boneco') || lowerInput.includes('assistente')) {
    return prefix + 'O **Robô Assistente** é seu copiloto inteligente no canto inferior da tela:\n\n' +
      '• **Alertas Proativos:** O robô varre sua carteira e avisa quando há cobranças vencendo nos próximos 5 dias, inquilinos em atraso ou contratos encerrando.\n\n' +
      '• **8 Estados Emocionais:** Ele muda de animação e postura de acordo com o que você está fazendo: Boas-vindas, Pensando, Jurídico, Trabalhando, Sucesso ou Carregando.\n\n' +
      '• **Ajuda Instantânea:** Clique nele para ver um resumo do que requer sua atenção ou para navegar direto até a cobrança pendente.';
  }

  // Guia de Configuração / Setup
  if (lowerInput.includes('guia') || lowerInput.includes('setup') || lowerInput.includes('passo a passo') && lowerInput.includes('configura')) {
    return prefix + 'O **Guia de Configuração Interativo (Setup Guide)** orienta você pelos 5 passos essenciais:\n\n' +
      '1. **Passo 1 (Notificações Nativas):** Permissão de alertas automáticos no celular e desktop.\n' +
      '2. **Passo 2 (Google Drive & Agenda):** Conexão OAuth 2.0 segura para salvar recibos e vencimentos.\n' +
      '3. **Passo 3 (Google Maps Platform):** Autocomplete de endereços e mapa com pin interativo.\n' +
      '4. **Passo 4 (Hub Jurídico IA & Robô):** Leitor OCR de contratos e alertas preventivos.\n' +
      '5. **Passo 5 (Conclusão):** Painel 100% pronto e integrado!\n\n' +
      'Clique no botão **"Abrir Guia de Configuração Interativo"** no topo desta tela para iniciá-lo!';
  }

  // Primeiro passos / Começar do zero
  if (lowerInput.includes('começar') || lowerInput.includes('comecar') || lowerInput.includes('primeiro passo') || lowerInput.includes('iniciante') || lowerInput.includes('do zero') || lowerInput.includes('tutorial') || lowerInput.includes('como usar')) {
    return prefix + 'Seja muito bem-vindo! Para começar a usar o sistema **do zero**, siga estes 3 passos simples:\n\n' +
      '**1º Passo — Cadastre o Imóvel:** Vá no menu **"Imóveis"** e clique em **"Novo Imóvel"**. Utilize a busca do **Google Maps** para preencher o endereço automaticamente, digite o valor base do aluguel e o dia de vencimento desejado.\n\n' +
      '**2º Passo — Cadastre e Aloque o Inquilino:** Vá no menu **"Inquilinos"**, clique em **"Novo Inquilino"** e preencha os dados dele (nome, CPF, WhatsApp). Em seguida, altere o status dele para **"Alocado"**, selecione o imóvel cadastrado e defina se a entrada é **Caução** (garantia) ou **Primeiro Aluguel**.\n\n' +
      '**3º Passo — Acompanhe o Financeiro:** Vá no menu **"Financeiro"**. O sistema criará a cobrança mensal automaticamente no cronograma. Quando o inquilino pagar, basta clicar em **"Confirmar Pagamento"** ou **"Gerar Recibo"**!';
  }

  // Como cadastrar Imóvel
  if (lowerInput.includes('cadastrar imóvel') || lowerInput.includes('cadastrar imovel') || lowerInput.includes('novo imóvel') || lowerInput.includes('novo imovel') || lowerInput.includes('adicionar imóvel')) {
    return prefix + 'Para cadastrar um imóvel com a nova busca do Google Maps:\n\n1. Clique no menu lateral **"Imóveis"**.\n2. Clique no botão azul **"Novo Imóvel"** no topo da página.\n3. Digite o nome ou condomínio no campo **"Preenchimento Automático via Google Maps"** para preencher rua, bairro, CEP e cidade automaticamente.\n4. Defina o valor da mensalidade e dia padrão de vencimento (ex: dia 10).\n5. Salve. Se o imóvel já tiver contrato ativo, você poderá associar um inquilino logo em seguida!';
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

  // Importação por IA / Central IA / Hub Jurídico
  if (lowerInput.includes('import') || lowerInput.includes('central ia') || lowerInput.includes('hub jurídico') || lowerInput.includes('pdf') || lowerInput.includes('imagem') || lowerInput.includes('ocr') || lowerInput.includes('foto do contrato')) {
    return prefix + 'O **Hub Jurídico IA / Central IA** lê contratos pré-existentes de forma automática:\n\n1. Acesse **"Hub Jurídico IA"** no menu lateral.\n2. Cole o texto do contrato ou faça upload de fotos/PDFs do documento físico.\n3. A IA processa o documento, extrai o imóvel, o inquilino, valor, dia de vencimento e cláusulas.\n4. Com apenas **1 clique**, o sistema cadastra tudo automaticamente e ainda roda uma **Auditoria Jurídica** apontando cláusulas abusivas ou pontos de atenção conforme a Lei nº 8.245/1991!';
  }

  // Recibo & Comprovante
  if (lowerInput.includes('recibo') || lowerInput.includes('comprovante') || lowerInput.includes('quitação') || lowerInput.includes('quitacao')) {
    return prefix + 'Para **gerar recibos profissionais**:\n1. Vá na aba **"Financeiro"**, selecione o pagamento confirmado.\n2. Clique em **"Gerar Recibo"**.\n3. Escolha entre o **Recibo Simples** ou o **Recibo Detalhado** (com discriminação completa do imóvel, período e inquilino).\n4. Baixe o PDF ou imprima. O comprovante anexado fica salvo na sua **Central Cloud (Google Drive)**!';
  }

  // Garagem / Storage / Depósito
  if (lowerInput.includes('garagem') || lowerInput.includes('depósito') || lowerInput.includes('deposito') || lowerInput.includes('storage') || lowerInput.includes('box') || lowerInput.includes('galpão') || lowerInput.includes('galpao') || lowerInput.includes('espaço') || lowerInput.includes('espaco')) {
    return prefix + 'O módulo **Espaço & Ativos (Garagens e Depósitos)** é feito sob medida para gerenciar a locação de boxes, vagas, galpões e depósitos:\n\n1. Acesse **"Espaço & Ativos"** no menu.\n2. Cadastre o espaço, contratante, vigência e valor.\n3. Clique em **"Gerar Cobranças"** para preencher o cronograma financeiro.\n4. Para facilitar a diferenciação visual rápida no fluxo financeiro, esses recebimentos utilizam a cor **Azul Indigo**!';
  }

  // Imóvel & Vistoria
  if (lowerInput.includes('imóvel') || lowerInput.includes('imovel') || lowerInput.includes('vistoria') || lowerInput.includes('laudo') || lowerInput.includes('foto')) {
    return prefix + 'Na aba **"Imóveis"**, você cadastra seu patrimônio com busca dinâmica do Google Maps, valor base e dia de vencimento.\n\n**Vistorias:** Você pode realizar laudos de vistoria registrando o estado de conservação e anexando fotos do imóvel na entrada e saída do inquilino para evitar disputas no fim do contrato!';
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
    return prefix + 'A **IA Financeira** analisa o desempenho da sua carteira imobiliária:\n• Diagnósticos automáticos sobre taxa de ocupação e inadimplência.\n• Dicas personalizadas para aumentar sua rentabilidade líquida.\n• Projeção de receitas futuras e balanço detalhado entre ganhos e despesas de manutenção.';
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
  if (lowerInput.includes('alerta') || lowerInput.includes('snooze') || lowerInput.includes('adiar')) {
    return prefix + 'O sistema conta com um **Central de Alertas Inteligente**:\n• Notifica sobre aluguéis prestes a vencer, vencidos e contratos no fim do prazo.\n• Você pode usar o recurso **Snooze (Adiar Alerta)** para ser relembrado mais tarde sem perder o foco das suas tarefas prioritárias do dia.';
  }

  // Cumprimento genérico
  if (lowerInput.includes('oi') || lowerInput.includes('olá') || lowerInput.includes('ola') || lowerInput.includes('bom dia') || lowerInput.includes('boa tarde') || lowerInput.includes('boa noite')) {
    return prefix + 'Olá! Sou o especialista de ajuda do Gerente Imobiliário. Como posso te apoiar com as novas ferramentas (Google Maps, Notificações Nativas, Robô Assistente, Hub Jurídico IA, Google Tasks ou Reajuste BCB) hoje?';
  }

  return prefix + 'Sou sua inteligência especialista de suporte! Posso te orientar desde o básico (**primeiros passos, cadastrar imóvel com Google Maps, inquilinos, confirmar pagamento**) até as novas atualizações (**Notificações em Segundo Plano**, **Robô Assistente**, **Google Tasks**, **Reajuste BCB**, **Hub Jurídico OCR**). O que você gostaria de explorar agora?';
};

export function HelpView({
  payments = [],
  properties = [],
  tenants = [],
  isDriveConnected = false,
  onConnectDrive,
  onDriveStatusChanged,
}: HelpViewProps) {
  const [activeTab, setActiveTab] = useState<'updates' | 'learning' | 'pages' | 'manual' | 'agent'>('updates');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o especialista da Central de Ajuda do Gerente Imobiliário. Conheça as novas atualizações da versão v6.9.0 ou tire qualquer dúvida comigo!' }
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
      await new Promise(resolve => setTimeout(resolve, 500));
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

  // 8 Pilares de Novas Atualizações
  const recentUpdates = [
    {
      id: 'update-maps',
      tag: 'Google Maps Platform',
      badgeColor: 'bg-emerald-500 text-white',
      borderColor: 'border-emerald-200 bg-emerald-50/20',
      icon: <MapPin className="w-6 h-6 text-emerald-600" />,
      title: 'Busca Inteligente de Endereços & Mapa com Pin',
      description: 'Integração oficial com a Google Maps Platform (Places Autocomplete & Maps JavaScript API).',
      highlights: [
        'Preenchimento automático instantâneo de rua, bairro, cidade, estado e CEP ao digitar no cadastro de imóveis.',
        'Geocodificação por satélite: o sistema detecta a latitude e longitude exatas da propriedade.',
        'Mapa interativo de alta definição com pin reposicionável e botão de rota direta no Google Maps/Waze.'
      ],
      actionQuestion: 'Como funciona o Google Maps no cadastro de imóveis?'
    },
    {
      id: 'update-notif',
      tag: 'Notificações Nativas',
      badgeColor: 'bg-amber-500 text-white',
      borderColor: 'border-amber-200 bg-amber-50/20',
      icon: <Bell className="w-6 h-6 text-amber-600" />,
      title: 'Alertas em Segundo Plano & Vencimentos Automáticos',
      description: 'Disparos prioritários no celular e computador mesmo com o navegador minimizado ou fechado.',
      highlights: [
        'Service Worker inteligente que checa vencimentos matinais e alerta cobranças do dia sem consumir bateria.',
        'Avisos com vibração e áudio no padrão do sistema operacional (Android, iOS, Windows e Mac).',
        'Botão de teste imediato e controle total de preferências na aba Configurações.'
      ],
      actionQuestion: 'Como ativar as notificações em segundo plano?'
    },
    {
      id: 'update-robot',
      tag: 'Mascote Interativo',
      badgeColor: 'bg-indigo-500 text-white',
      borderColor: 'border-indigo-200 bg-indigo-50/20',
      icon: <Bot className="w-6 h-6 text-indigo-600" />,
      title: 'Assistente Robô com Varredura Preventiva de 5 Dias',
      description: 'Copiloto visual dinâmico com 8 expressões que monitora prazos e guia sua operação.',
      highlights: [
        'Varredura preventiva contínua: o robô avisa com antecedência sobre cobranças que vencem nos próximos 5 dias.',
        'Estados visuais expressivos: Boas-vindas, Trabalhando, Pensando, Jurídico, Sucesso e Alerta.',
        'Balão interativo com atalhos de 1 clique para navegar direto à pendência ou tirar dúvidas no suporte.'
      ],
      actionQuestion: 'Como o Robô Assistente me ajuda no dia a dia?'
    },
    {
      id: 'update-juridico',
      tag: 'Inteligência Artificial',
      badgeColor: 'bg-purple-500 text-white',
      borderColor: 'border-purple-200 bg-purple-50/20',
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      title: 'Hub Jurídico IA: OCR de Contratos & Auditoria Legal',
      description: 'Leitura de documentos físicos por foto/PDF e verificação de cláusulas conforme a Lei nº 8.245/1991.',
      highlights: [
        'Envie fotos ou PDFs de contratos antigos: a IA extrai inquilino, imóvel, aluguel, caução e datas em 1 clique.',
        'Auditoria Jurídica Inteligente: aponta cláusulas abusivas de rescisão, multas excessivas e riscos contratuais.',
        'Elaborador de minutas personalizadas e termos de renovação rápida sem refazer o contrato do zero.'
      ],
      actionQuestion: 'Como funciona a leitura de contratos por OCR no Hub Jurídico?'
    },
    {
      id: 'update-tasks',
      tag: 'Google Workspace',
      badgeColor: 'bg-blue-500 text-white',
      borderColor: 'border-blue-200 bg-blue-50/20',
      icon: <CheckSquare className="w-6 h-6 text-blue-600" />,
      title: 'Sincronização com Google Tasks & Google Agenda',
      description: 'Controle de afazeres operacionais e datas de cobrança sincronizadas com seu smartphone.',
      highlights: [
        'Crie afazeres (ex: vistoriar imóvel, cobrar inquilino) e marque como feito pelo app Google Tasks no celular.',
        'Vencimentos de aluguéis e renovações injetados diretamente na sua Google Agenda com lembretes diários.',
        'Conexão segura com OAuth 2.0 que integra com Gmail, Google Agenda e Google Drive.'
      ],
      actionQuestion: 'Como sincronizar com o Google Tasks e Google Agenda?'
    },
    {
      id: 'update-bcb',
      tag: 'Economia Oficial',
      badgeColor: 'bg-emerald-600 text-white',
      borderColor: 'border-emerald-200 bg-emerald-50/20',
      icon: <TrendingUp className="w-6 h-6 text-emerald-700" />,
      title: 'Reajuste Automático pelo Banco Central (BCB)',
      description: 'Correção de mensalidades com taxas oficiais em tempo real (IPCA, IGP-M e Selic).',
      highlights: [
        'Consulta direta ao webservice do Banco Central do Brasil para buscar a inflação acumulada do período.',
        'Cálculo exato do percentual de reajuste com auditoria e amparo na Lei do Inquilinato.',
        'Atualização instantânea das parcelas futuras do contrato sem necessidade de recálculo manual.'
      ],
      actionQuestion: 'Como fazer o reajuste de aluguel pelo Banco Central?'
    },
    {
      id: 'update-storage',
      tag: 'Espaço & Ativos',
      badgeColor: 'bg-indigo-600 text-white',
      borderColor: 'border-indigo-200 bg-indigo-50/20',
      icon: <Warehouse className="w-6 h-6 text-indigo-700" />,
      title: 'Locação de Garagens, Boxes & Depósitos (Azul Indigo)',
      description: 'Gestão especializada para aluguel de vagas e depósitos com destaque no fluxo de caixa.',
      highlights: [
        'Diferenciação cromática em tom Azul Indigo no fluxo de caixa para separar moradias de garagens.',
        'Controle de caução de chaves e controles de portão com status de devolução transparente.',
        'Cronograma automático de cobranças mensais e recibos dedicados.'
      ],
      actionQuestion: 'Como funciona o Aluguel de Espaço e Garagens?'
    },
    {
      id: 'update-backup-restore',
      tag: 'Segurança & Versões',
      badgeColor: 'bg-emerald-600 text-white',
      borderColor: 'border-emerald-200 bg-emerald-50/50',
      icon: <DatabaseBackup className="w-6 h-6 text-emerald-600" />,
      title: 'Backup Inteligente, Restauração & Versões de Contratos',
      description: 'Gere backup em 1 clique, restaure bancos a partir de JSON/Drive e recupere vias antigas de contratos.',
      highlights: [
        'Backup sem burocracia: gere cópia oficial JSON e relatório IA em PDF com 1 clique, sem digitação de e-mail.',
        'Assistente de Restauração: suba o arquivo .json ou puxe do Google Drive com prévia de contadores antes de aplicar.',
        'Histórico e Restauração de Contratos: ao trocar a via de um contrato, a anterior é preservada e pode ser recuperada a qualquer momento.'
      ],
      actionQuestion: 'Como funciona a restauração de backup e versões de contratos?'
    },
    {
      id: 'update-pwa',
      tag: 'App Offline & Nuvem',
      badgeColor: 'bg-slate-700 text-white',
      borderColor: 'border-slate-200 bg-slate-50',
      icon: <Cloud className="w-6 h-6 text-slate-700" />,
      title: 'PWA Nativo, Modo Offline & Nuvem Google',
      description: 'Aplicativo instalável na tela de início com funcionamento sem internet e sincronização segura.',
      highlights: [
        'Instalação no Android (Chrome), iOS (Safari "Adicionar à Tela de Início") e Desktop como app nativo.',
        'Cache offline completo via Service Worker v14: acesse seus imóveis mesmo sem sinal de internet.',
        'Backup automático de recibos, laudos de vistoria com fotos e contratos na sua nuvem Google Drive.'
      ],
      actionQuestion: 'Como instalar o aplicativo no celular e usar offline?'
    }
  ];

  // Trilha de Aprendizado Progressivo (Do Zero ao Avançado)
  const learningLevels = [
    {
      level: 'Passo 1 • Nível Iniciante',
      badgeColor: 'bg-emerald-500 text-white',
      borderAccent: 'border-emerald-200 bg-emerald-50/30',
      title: 'Primeiro Contato com o Sistema (O Básico do Dia a Dia)',
      description: 'Aprenda a cadastrar seu primeiro patrimônio com Google Maps, vincular um morador e dar baixa no primeiro aluguel.',
      icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
      items: [
        {
          title: '1. Cadastro de Imóvel com Google Maps',
          text: 'Vá na aba "Imóveis" e clique em "Novo Imóvel". Use o preenchimento automático do Google Maps para localizar o endereço instantaneamente, definindo valor e vencimento.',
          actionText: 'Como cadastrar imóvel com Google Maps'
        },
        {
          title: '2. Cadastrando e Alocando o Inquilino',
          text: 'Vá na aba "Inquilinos", clique em "Novo Inquilino" e insira nome e WhatsApp. Em seguida, mude o status para "Alocado", vincule ao imóvel e defina se a garantia é Caução ou Mês Adiantado.',
          actionText: 'Perguntar como alocar inquilino'
        },
        {
          title: '3. Registrando o Recebimento de Aluguel (Baixa)',
          text: 'Na aba "Financeiro", localize a cobrança gerada automaticamente. Ao receber via PIX ou dinheiro, clique em "Confirmar Pagamento". Se o pagamento for menor, registre a "Baixa Parcial".',
          actionText: 'Perguntar sobre baixa e pagamentos'
        }
      ]
    },
    {
      level: 'Passo 2 • Nível Intermediário',
      badgeColor: 'bg-indigo-500 text-white',
      borderAccent: 'border-indigo-200 bg-indigo-50/30',
      title: 'Notificações, Recibos & Atendimento ao Cliente',
      description: 'Ative notificações nativas de vencimento, emita recibos detalhados e gerencie garagens/depósitos.',
      icon: <Compass className="w-6 h-6 text-indigo-600" />,
      items: [
        {
          title: '1. Ativação de Notificações em Segundo Plano',
          text: 'Nas Configurações ou pelo Guia de Setup, autorize notificações push. O sistema enviará avisos automáticos na barra do celular e PC no dia em que qualquer cobrança vencer.',
          actionText: 'Como ativar as notificações de vencimento'
        },
        {
          title: '2. Emissão de Recibos Detalhados com QR Code',
          text: 'Após confirmar um pagamento no Financeiro, clique em "Gerar Recibo". Escolha o Recibo Detalhado (que discrimina imóvel, período e taxa) e envie o PDF pelo WhatsApp com 1 clique.',
          actionText: 'Como emitir recibo em PDF'
        },
        {
          title: '3. Garagens e Espaços (Azul Indigo)',
          text: 'Acesse "Espaço & Ativos" para gerenciar locação de vagas de garagem e depósitos comerciais. Os recebimentos são destacados em tom Azul Indigo no fluxo de caixa.',
          actionText: 'Como funciona Aluguel de Espaço'
        }
      ]
    },
    {
      level: 'Passo 3 • Nível Avançado',
      badgeColor: 'bg-purple-500 text-white',
      borderAccent: 'border-purple-200 bg-purple-50/30',
      title: 'Automações Inteligentes, Banco Central (BCB) & Nuvem',
      description: 'Dobre sua produtividade com leitura de contratos por IA, reajuste de inflação oficial e sincronização Google Tasks.',
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      items: [
        {
          title: '1. Leitura de Contratos com Hub Jurídico IA',
          text: 'Acesse "Hub Jurídico IA". Cole o texto do contrato físico ou envie uma foto/PDF. A inteligência extrai morador, valor e datas automaticamente, cadastrando tudo em 1 clique.',
          actionText: 'Como usar o Hub Jurídico IA'
        },
        {
          title: '2. Reajuste de Aluguel pelo Banco Central (BCB)',
          text: 'Na aba Financeiro, use o Reajuste BCB. O sistema consulta o Banco Central para buscar o IPCA ou IGP-M acumulado e calcula a correção da mensalidade com amparo legal imediato.',
          actionText: 'Como funciona o Reajuste BCB'
        },
        {
          title: '3. Google Tasks & Google Agenda no Celular',
          text: 'Conecte sua conta Google para sincronizar os vencimentos no Google Calendar e gerenciar pendências operacionais diretamente pelo app Google Tasks no seu smartphone.',
          actionText: 'Como sincronizar com o Google'
        }
      ]
    }
  ];

  // Guia Tela por Tela (Mapeamento Atualizado do Menu Lateral)
  const pageDirectory = [
    {
      name: '1. Dashboard (Início)',
      icon: <Home className="w-5 h-5 text-indigo-600" />,
      tag: 'Painel Central',
      desc: 'Visão geral do negócio: total a receber no mês, taxa de ocupação, atalhos rápidos e resumo financeiro unificado.'
    },
    {
      name: '2. Hub Jurídico IA',
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      tag: 'OCR & Auditoria Legal',
      desc: 'Leitor OCR de contratos em PDF/foto, consultor da Lei do Inquilinato (Lei nº 8.245/1991), auditoria de cláusulas abusivas e gerador de minutas personalizadas.'
    },
    {
      name: '3. Alertas & Inteligência',
      icon: <Bell className="w-5 h-5 text-amber-500" />,
      tag: 'Alertas & Google Tasks',
      desc: 'Central de notificações urgentes, lembretes de cobrança com botão Snooze (Adiar), atalho para o Google Tasks e chamados de manutenção.'
    },
    {
      name: '4. Imóveis',
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
      tag: 'Google Maps Integrado',
      desc: 'Cadastro com preenchimento automático via Google Maps (Places API), mapa interativo com pin reposicionável e laudos de vistoria com fotos de entrada e saída.'
    },
    {
      name: '5. Inquilinos',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      tag: 'Moradores & WhatsApp',
      desc: 'Gestão de inquilinos, envio de cobranças e recibos pelo WhatsApp, alocação com Caução vs Primeiro Aluguel e histórico completo.'
    },
    {
      name: '6. Contratos',
      icon: <FileText className="w-5 h-5 text-amber-600" />,
      tag: 'Prazos & Renovação',
      desc: 'Acompanhamento de prazos com contagem regressiva, alertas de encerramento e botão de Renovação Simplificada que gera o Termo Aditivo automático.'
    },
    {
      name: '7. Financeiro',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      tag: 'Caixa & Reajuste BCB',
      desc: 'Panorama de receitas e despesas, emissão de recibos em PDF com QR Code, baixas parciais e reajuste automático de aluguéis via webservice do Banco Central (BCB).'
    },
    {
      name: '8. Espaço & Ativos (Garagens)',
      icon: <Archive className="w-5 h-5 text-indigo-600" />,
      tag: 'Tom Azul Indigo',
      desc: 'Locação especializada de vagas de garagem, boxes e depósitos com destaque visual Azul Indigo no fluxo de caixa e caução de controles/chaves.'
    },
    {
      name: '9. Configurações',
      icon: <Settings className="w-5 h-5 text-slate-700" />,
      tag: 'Notificações & Google',
      desc: 'Central Unificada para gerenciar Notificações Nativas em segundo plano, login Google (Drive/Calendar/Tasks), aplicativo PWA offline e dados cadastrais.'
    },
    {
      name: '10. Central de Ajuda & Guia',
      icon: <LifeBuoy className="w-5 h-5 text-indigo-600" />,
      tag: 'Suporte & Mestre IA',
      desc: 'Base de conhecimento completa, novidades da versão, guia interativo passo a passo, trilha de aprendizado e inteligência artificial para tirar dúvidas.'
    }
  ];

  // Manual de Recursos Especialistas
  const manualSections = [
    {
      id: 'maps-geolocation',
      badge: 'Google Maps Platform',
      badgeColor: 'bg-emerald-500 text-white',
      title: 'Google Maps & Autocomplete de Endereços',
      icon: <MapPin className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
      description: 'Preencha endereços com agilidade e visualize seus imóveis com pins interativos de satélite.',
      steps: [
        'No formulário de Novo Imóvel, comece digitando o nome da rua, praça ou condomínio no campo Google Maps.',
        'Selecione a sugestão para preencher logradouro, número, bairro, cidade, estado e CEP automaticamente.',
        'O mapa interativo exibe o local exato com pin de coordenadas e permite ajuste fino com 1 clique.',
        'Na ficha do imóvel, use o botão "Abrir no Google Maps" para traçar rotas de visita e vistorias no seu GPS!'
      ]
    },
    {
      id: 'notifications-native',
      badge: 'Notificações Push',
      badgeColor: 'bg-amber-500 text-white',
      title: 'Notificações Nativas & Alertas em Segundo Plano',
      icon: <Bell className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-50/50 border-amber-100',
      description: 'Nunca perca uma cobrança com avisos na tela do celular e PC mesmo com a aba fechada.',
      steps: [
        'Acesse a aba "Configurações" e clique em "Ativar Alertas Nativos" ou utilize o Guia de Configuração.',
        'Autorize a permissão no navegador para que o Service Worker opere em segundo plano.',
        'No dia do vencimento de aluguéis ou acordos, o sistema dispara um alerta prioritário com som e vibração.',
        'Utilize o botão "Testar Notificação Agora" para verificar o som e a exibição instantânea no seu aparelho.'
      ]
    },
    {
      id: 'robot-assistant-info',
      badge: 'Mascote Proativo',
      badgeColor: 'bg-indigo-500 text-white',
      title: 'Robô Assistente & Varredura Preventiva',
      icon: <Bot className="w-6 h-6 text-indigo-600" />,
      bg: 'bg-indigo-50/50 border-indigo-100',
      description: 'Copiloto inteligente que monitora sua carteira e aponta cobranças nos próximos 5 dias.',
      steps: [
        'O robô fica posicionado no canto inferior direito da tela com animações e expressões dinâmicas.',
        'Ele analisa sua base de dados e avisa proativamente quando há vencimentos nos próximos 5 dias.',
        'Clique no balão de fala do robô para visualizar o resumo das pendências e navegar com 1 clique.',
        'Ele também ajuda a responder dúvidas jurídicas e operacionais a qualquer momento.'
      ]
    },
    {
      id: 'tasks-calendar',
      badge: 'Integrações Google',
      badgeColor: 'bg-blue-500 text-white',
      title: 'Google Tasks & Google Calendar',
      icon: <CheckSquare className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50/50 border-blue-100',
      description: 'Sincronize vencimentos de cobranças na agenda e gerencie listas operacionais pelo celular.',
      steps: [
        'Acesse a aba "Google Tasks" ou "Configurações" e conecte sua Conta Google com OAuth 2.0 seguro.',
        'Os vencimentos de aluguéis e prazos de contrato são injetados automaticamente no seu Google Agenda.',
        'Crie listas de afazeres no Google Tasks (ex: enviar recibo, vistoriar imóvel, negociar renovação).',
        'Suas tarefas sincronizam instantaneamente com o aplicativo Google Tasks e Gmail no seu smartphone!'
      ]
    },
    {
      id: 'bcb-reajuste',
      badge: 'Economia & Finanças',
      badgeColor: 'bg-emerald-600 text-white',
      title: 'Reajuste pelo Banco Central (BCB)',
      icon: <TrendingUp className="w-6 h-6 text-emerald-700" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
      description: 'Atualize os valores de aluguel de forma automática com os índices oficiais do Banco Central.',
      steps: [
        'Na aba "Financeiro", clique em Reajuste de Aluguel.',
        'Selecione o índice contratual desejado (IPCA, IGP-M ou Selic).',
        'O sistema consulta o webservice do Banco Central do Brasil para buscar a inflação acumulada.',
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
        'Vá na aba "Chamados" no menu lateral ou atalho de Alertas.',
        'Abra um novo chamado associando imóvel, inquilino, categoria (Manutenção, Financeiro) e prioridade.',
        'Acompanhe o andamento alterando o status para "Em Andamento" ou "Concluído".',
        'Mantenha o histórico transparente de todos os reparos e custos efetuados no imóvel.'
      ]
    },
    {
      id: 'central-ia-import',
      badge: 'Inteligência Artificial',
      badgeColor: 'bg-purple-500 text-white',
      title: 'Hub Jurídico & Leitor de Contratos OCR',
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50/50 border-purple-100',
      description: 'Importe contratos antigos colando texto ou enviando foto/PDF com auditoria de cláusulas.',
      steps: [
        'Acesse a aba "Hub Jurídico IA" no menu lateral.',
        'Cole o texto do contrato ou faça upload do documento em PDF ou imagem fotográfica.',
        'A IA analisa as cláusulas e extrai: Imóvel, Inquilino, Valor do Aluguel, Caução e Dia de Vencimento.',
        'Clique em "Importar Dados" para criar tudo no sistema e visualize a Auditoria de Cláusulas Abusivas!'
      ]
    },
    {
      id: 'espacos-garagens',
      badge: 'Espaço & Ativos',
      badgeColor: 'bg-indigo-500 text-white',
      title: 'Garagens, Depósitos & Galpões (Azul Indigo)',
      icon: <Archive className="w-6 h-6 text-indigo-600" />,
      bg: 'bg-indigo-50/50 border-indigo-100',
      description: 'Módulo dedicado para gerenciar locação de vagas, boxes, galpões e depósitos comerciais.',
      steps: [
        'Acesse "Espaço & Ativos" e clique em "Cadastrar Novo Espaço".',
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
        'No Hub Jurídico, utilize o gerador de minutas por IA para criar contratos residenciais e comerciais personalizados.'
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
    },
    {
      id: 'backup-restore-system',
      badge: 'Segurança & Recuperação',
      badgeColor: 'bg-emerald-600 text-white',
      title: 'Backup Inteligente, Restauração & Versões de Contratos',
      icon: <DatabaseBackup className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
      description: 'Cópia preventiva em 1 clique, restauração de dados via JSON ou Google Drive e histórico de vias de contratos.',
      steps: [
        'Backup sem Burocracia: Abra o modal de Backup e clique em "Gerar e Baixar Backup Agora". O pacote .json e o relatório PDF com IA são gerados instantaneamente e baixados localmente, além de sincronizados com o Drive.',
        'Backup Automático Mensal: A cada 30 dias uma cópia atualizada é enviada silenciosamente para o Google Drive sem ocupar espaço no seu celular.',
        'Restauração de Dados (Restore): Na aba "Restaurar Backup", envie seu arquivo .json ou clique em "Buscar do Drive". O sistema exibe um resumo com a contagem de imóveis, inquilinos, contratos e pagamentos antes de aplicar a mesclagem segura.',
        'Histórico de Versões do Contrato: Ao editar um contrato e anexar uma nova via, a versão anterior fica guardada automaticamente. Na lista de contratos, clique no botão de versões para visualizar ou restaurar vias antigas com 1 clique!'
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
      {/* Header com Banner & Ações */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <LifeBuoy className="w-4 h-4 text-indigo-600" />
            Central de Ajuda, Guia & Novidades
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> v6.9.0 Estável
            </span>

            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-100 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Abrir Guia Interativo (Passo a Passo)
            </button>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Central de Ajuda & Guia Completo do Sistema
        </h1>
        <p className="text-slate-600 text-base md:text-lg max-w-3xl leading-relaxed">
          Descubra todas as novas atualizações, siga a trilha de aprendizado do zero ao avançado ou consulte nosso assistente inteligente com suporte a dúvidas em tempo real.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border shadow-sm w-fit gap-1">
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'updates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Novidades & Atualizações
          <span className="px-1.5 py-0.2 bg-emerald-400 text-emerald-950 rounded-full text-[10px] font-black uppercase">
            Novo
          </span>
        </button>
        <button
          onClick={() => setActiveTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'learning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Passo a Passo (Do Zero)
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

      {/* TAB 0: NOVIDADES & ATUALIZAÇÕES */}
      {activeTab === 'updates' && (
        <div className="space-y-8">
          {/* Banner Hero */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-white" />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-black uppercase tracking-widest inline-block">
                Versão v6.9.0 Estável
              </span>
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-bold uppercase tracking-wider inline-block">
                8 Novas Grandes Ferramentas
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight max-w-2xl">
              Confira tudo o que foi atualizado e aprimorado no Gerente Imobiliário
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              O sistema agora conta com preenchimento via Google Maps, alertas sonoros e nativos em segundo plano, Robô Assistente inteligente, Leitor de Contratos OCR com Auditoria e sincronização completa com o ecossistema Google.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" /> Iniciar Guia de Configuração
              </button>
              <button
                onClick={() => handleQuickQuestion('Quais são as principais novidades da versão?')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <Bot className="w-4 h-4 text-emerald-400" /> Perguntar para a IA
              </button>
            </div>
          </div>

          {/* Grid dos 8 Pilares de Atualização */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentUpdates.map((item) => (
              <div
                key={item.id}
                className={`p-6 sm:p-7 rounded-3xl border shadow-sm transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${item.borderColor}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      {item.icon}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${item.badgeColor}`}>
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    {item.description}
                  </p>

                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Principais Benefícios:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex justify-end">
                  <button
                    onClick={() => handleQuickQuestion(item.actionQuestion)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                  >
                    Ver detalhes com a IA
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              Guia Completo Tela por Tela (Mapeamento do Menu Lateral)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              Abaixo está a explicação direta do papel de cada uma das 10 telas do menu lateral do sistema, listadas do topo (Dashboard) até as Configurações e Ajuda.
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
              placeholder="Buscar no manual (ex: Google Maps, Notificações, Robô, Google Tasks, BCB, Hub Jurídico)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="font-bold text-slate-500 mr-1">Tópicos Frequentes:</span>
            {[
              'Google Maps', 'Notificações', 'Robô', 'Primeiros Passos', 'Google Tasks', 
              'Reajuste BCB', 'Hub Jurídico', 'Garagens', 'Recibo Detalhado', 'Acordos'
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
                <p className="text-xs text-indigo-100 font-medium">Tire dúvidas sobre as novidades, rotinas diárias e recursos avançados</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-400 text-emerald-950 font-bold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse" /> Online
            </span>
          </div>

          {/* Quick Prompts */}
          <div className="bg-indigo-50/60 p-2.5 border-b flex gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
            {[
              'O que há de novo na versão?',
              'Como usar o Google Maps?',
              'Como ativar as Notificações?',
              'Como funciona o Robô?',
              'Como ler contrato por foto/PDF?',
              'Como usar o Google Tasks?',
              'Como reajustar pelo Banco Central?'
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
                placeholder="Pergunte sobre novidades, Google Maps, notificações, robô, contratos, BCB..."
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

      {/* Modal Guia Interativo de Configuração */}
      <SetupGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        isDriveConnected={isDriveConnected}
        onConnectDrive={onConnectDrive}
        onDriveStatusChanged={onDriveStatusChanged}
        payments={payments}
        properties={properties}
        tenants={tenants}
      />
    </div>
  );
}
