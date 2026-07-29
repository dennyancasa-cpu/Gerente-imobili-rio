import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, BookText, ChevronRight, CheckCircle2, MessageSquare, AlertCircle, Home, Users, DollarSign } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const getBotResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  const prefix = "Mestre IA: ";
  
  if (lowerInput.includes('recibo') || lowerInput.includes('comprovante') || lowerInput.includes('quitação')) {
    return prefix + 'Para **gerar um recibo**, vá na aba "Financeiro", encontre o pagamento (em "Recebimentos" ou histórico) e clique em "Gerar Recibo". Você pode escolher entre o **Recibo Simples** ou o **Recibo Detalhado** (que inclui dados do imóvel e inquilino).';
  }
  if (lowerInput.includes('garagem') || lowerInput.includes('garagens') || lowerInput.includes('espaço') || lowerInput.includes('espaco') || lowerInput.includes('storage') || lowerInput.includes('galpão') || lowerInput.includes('galpao') || lowerInput.includes('box') || (lowerInput.includes('depósito') && !lowerInput.includes('caução') && !lowerInput.includes('garantia'))) {
    return prefix + 'Para gerenciar **Aluguel de Espaço (Depósitos e Garagens)**, utilize a aba dedicada no menu lateral. Lá você pode cadastrar novos espaços locados, automatizar a geração de mensalidades clicando em **"Gerar Cobranças"** e acompanhar/confirmar os pagamentos diretamente. O faturamento dessas locações utiliza a cor **Azul Indigo** para diferenciação visual rápida!';
  }
  if (lowerInput.includes('imóvel') || lowerInput.includes('imovel') || lowerInput.includes('casa') || lowerInput.includes('apartamento')) {
    return prefix + 'Para **cadastrar um imóvel**, utilize a aba "Imóveis" > "Novo Imóvel". Preencha os detalhes como endereço, valor base e dia de vencimento. Você também pode editar imóveis existentes para atualizar fotos ou valores.';
  }
  if (lowerInput.includes('inquilino') || lowerInput.includes('morador')) {
    return prefix + 'Na aba "Inquilinos", você pode cadastrar novos moradores. Lembre-se de mudar o status para **"Alocado"** e selecionar o imóvel correspondente para que o sistema comece a gerar as cobranças mensais.';
  }
  if (lowerInput.includes('caução') || lowerInput.includes('caucao') || lowerInput.includes('depósito de garantia') || lowerInput.includes('garantia')) {
    return prefix + 'O sistema permite registrar o **Caução** no momento da alocação do inquilino. Este valor fica registrado como um crédito ou garantia, facilitando o acerto de contas ao final do contrato.';
  }
  if (lowerInput.includes('acordo') || lowerInput.includes('renegoc') || lowerInput.includes('atrasad') || lowerInput.includes('parcela')) {
    return prefix + 'Se houver pendências, use a função **"Realizar Acordo"** na aba Financeiro. Isso permite consolidar dívidas e criar um novo parcelamento, automatizando as novas datas de vencimento.';
  }
  if (lowerInput.includes('dashboard') || lowerInput.includes('início') || lowerInput.includes('resumo')) {
    return prefix + 'No **Dashboard (Início)**, você tem uma visão rápida de quem pagou, quem está atrasado e o faturamento total do mês. É o painel central para controle rápido do seu negócio.';
  }
  if (lowerInput.includes('drive') || lowerInput.includes('cloud') || lowerInput.includes('nuvem') || lowerInput.includes('contrato') || lowerInput.includes('anexo')) {
    return prefix + 'A **Central Cloud** integra o app ao seu Google Drive. Isso permite que fotos de recibos e contratos sejam salvos na nuvem com segurança, sem ocupar espaço no seu dispositivo.';
  }
  if (lowerInput.includes('despesa') || lowerInput.includes('gasto') || lowerInput.includes('manutenção')) {
    return prefix + 'Você pode registrar **Despesas** (como reformas, IPTU ou taxas) na aba Financeiro. Isso é essencial para calcular seu lucro líquido real ao final de cada mês.';
  }
  if (lowerInput.includes('versão') || lowerInput.includes('versao') || lowerInput.includes('atualiz')) {
    return prefix + 'O sistema está na versão **6.6.0**. Estamos sempre evoluindo! Nossa última grande novidade é a ferramenta **Aluguel de Espaço** integrada diretamente ao hub financeiro, além da **Renovação de Aluguel** simplificada na aba de Contratos e a **Central IA** para migração inteligente.';
  }
  if (lowerInput.includes('renov') || lowerInput.includes('manter') || lowerInput.includes('prorrog')) {
    return prefix + 'Para **renovar um aluguel**, utilize nossa nova ferramenta de contratos! Na aba **Contratos**, selecione **"Renovação de Aluguel"** no organizador inteligente ou escolha o modelo correspondente. Isso facilita estender a vigência do contrato mantendo as condições acordadas entre proprietário e inquilino em um novo termo aditivo de forma rápida e segura.';
  }
  if (lowerInput.includes('import') || lowerInput.includes('contrato já tenho') || lowerInput.includes('central ia')) {
    return prefix + 'A **Central IA** (no menu lateral) permite que você cole o texto ou anexe fotos de um contrato de aluguel que você já tem. A nossa inteligência vai ler, criar o imóvel, cadastrar o inquilino automaticamente e ainda apontar pontos de melhoria no seu documento!';
  }
  if (lowerInput.includes('instalar') || lowerInput.includes('aplicativo') || lowerInput.includes('app')) {
    return prefix + 'Para instalar o app: \n1. No Android (Chrome): Clique nos **3 pontos** (superior direito) e depois em **"Instalar aplicativo"**.\n2. No iOS (Safari): Clique no botão **"Compartilhar"** e depois em **"Adicionar à Tela de Início"**.\n3. No desktop: Um ícone de instalação aparecerá na barra de endereços.';
  }
  if (lowerInput.includes('oi') || lowerInput.includes('olá') || lowerInput.includes('ola') || lowerInput.includes('bom dia') || lowerInput.includes('boa tarde')) {
    return prefix + 'Olá! Eu sou o assistente inteligente do Gerente Imobiliário. Como posso facilitar sua gestão hoje?';
  }

  return prefix + 'Como sua inteligência artificial de suporte, posso te ajudar com: **Importação por IA**, **Renovação de Aluguel**, **Gerar Recibos**, **Cadastrar Imóveis**, **Gerenciar Inquilinos**, **Lançar Despesas**, **Realizar Acordos** ou configurar a **Central Cloud**. O que deseja saber agora?';
};

export function HelpView() {
  const [activeTab, setActiveTab] = useState<'manual' | 'agent'>('agent');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o assistente de ajuda do Gerente Imobiliário. Como posso te orientar hoje?' }
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
            top: relativeTop - 16, // 16px of padding at the top
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
      // Simula um tempinho de pensamento
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const responseText = getBotResponse(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <BookText className="w-4 h-4" />
          Ajuda e Suporte
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
          Central de Ajuda
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          Aprenda a utilizar o sistema passo a passo ou tire suas dúvidas diretamente com nossa inteligência artificial.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'manual' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <BookText className="w-4 h-4" />
          Manual Passo a Passo
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'agent' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          Mestre IA (Tirar Dúvidas)
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4 hover:shadow-md transition-all md:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Novo no v6.1</span>
                <h3 className="text-xl font-bold text-slate-800">1. Central IA e Renovação Simplificada</h3>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">
              O sistema se tornou ainda mais prático para contratos novos e existentes:
            </p>
            <ul className="space-y-3 mt-4 text-sm text-indigo-900/80">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> <strong>Renovação de Aluguel:</strong> Se o proprietário e inquilino concordarem em manter a locação, gere o termo de renovação diretamente com um clique no organizador inteligente de Contratos.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> <strong>Central IA (Importação):</strong> Cole o texto ou tire foto de qualquer contrato antigo para que o robô faça o cadastro completo num piscar de olhos.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> <strong>Auditoria Jurídica:</strong> Obtenha observações e alertas automáticos sobre cláusulas perigosas.</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Home className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">2. Criar um Imóvel Manualmente</h3>
            <p className="text-slate-600 leading-relaxed">
              Tudo começa adicionando seu patrimônio. 
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Navegue até a aba <strong>Imóveis</strong> no menu lateral.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Clique no botão verde <strong>Novo Imóvel</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Preencha o nome de referência, valor base do aluguel e defina a data de vencimento padrão. Salve.</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">3. Criar e Anexar Inquilino</h3>
            <p className="text-slate-600 leading-relaxed">
              O próximo passo é registrar quem vai alugar.
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Vá na aba <strong>Inquilinos</strong> e clique em <strong>Novo Inquilino</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Mude o Status dele de Livre para <strong>Alocado</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Ao alterar o status, abrirá um menu para você selecionar a qual <strong>Imóvel</strong> ele pertence.</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">4. Caução vs 1º Aluguel</h3>
            <p className="text-slate-600 leading-relaxed">
              Defina como será a entrada financeira deste inquilino.
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Durante a seleção do Imóvel para alocar, você verá uma pergunta: <strong>O valor inicial refere-se a:</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Escolha <strong>Caução</strong> (Mês de garantia/depósito retido) ou <strong>Primeiro Aluguel</strong> (Pagando o mês corrente adiantado).</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> O sistema já cria o primeiro recebimento com esse detalhe sinalizado!</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <BookText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">5. Recibos e Quitações</h3>
            <p className="text-slate-600 leading-relaxed">
              Emita documentos profissionais com um clique.
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> No <strong>Financeiro</strong>, localize o pagamento desejado.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Clique no botão <strong>Gerar Recibo</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Escolha entre Simples ou Detalhado. Você pode imprimir ou salvar em PDF para enviar ao inquilino.</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">6. Aluguel de Espaço (Depósitos/Garagens)</h3>
            <p className="text-slate-600 leading-relaxed">
              Gerencie a locação de garagens, boxes, galpões e depósitos comerciais ou residenciais de forma organizada.
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Acesse a aba <strong>Aluguel de Espaço</strong> no menu lateral e clique em <strong>Cadastrar Novo Espaço</strong>.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Insira os dados de vigência, valor, dados do locador e vencimento. Registre o depósito caução e controle o status do reembolso.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Clique em <strong>Gerar Cobranças</strong> para preencher o cronograma financeiro e depois use o botão <strong>Confirmar Pagamento</strong> para dar baixa.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> <strong>Diferenciação Visual:</strong> Os recebimentos dessas locações usam a cor <strong>Azul Indigo</strong> para fácil distinção dos aluguéis residenciais padrão.</li>
            </ul>
          </div>

        </div>
      )}

      {activeTab === 'agent' && (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="bg-indigo-50 border-b p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Mestre IA</h2>
              <p className="text-xs text-indigo-600 font-medium">Online e pronto para ajudar</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, i) => (
              <div id={`help-message-${i}`} key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-br-none' 
                      : 'bg-white border text-slate-700 rounded-bl-none prose prose-sm prose-p:my-1'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.role === 'user' ? msg.text : msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-none px-5 py-4 bg-white border shadow-sm flex gap-2 items-center">
                   <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" />
                   <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]" />
                   <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0.4s]" />
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
                placeholder="Pergunte sobre como usar o aplicativo..."
                className="w-full pl-4 pr-14 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
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