import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, BookText, ChevronRight, CheckCircle2, MessageSquare, AlertCircle, Home, Users, DollarSign } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export function HelpView() {
  const [activeTab, setActiveTab] = useState<'manual' | 'agent'>('manual');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o assistente virtual do Gerente Imobiliário. Como posso te ajudar hoje?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          message: userMessage
        })
      });

      if (!response.ok) throw new Error('Falha ao comunicar com o assistente.');
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
    } catch (error) {
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
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Home className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">1. Criar um Imóvel</h3>
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
            <h3 className="text-xl font-bold text-slate-800">2. Criar e Anexar Inquilino</h3>
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
            <h3 className="text-xl font-bold text-slate-800">3. Caução vs 1º Aluguel</h3>
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
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">4. Criar Acordos e Atrasos</h3>
            <p className="text-slate-600 leading-relaxed">
              O inquilino atrasou múltiplos meses? Refinancie em um Acordo.
            </p>
            <ul className="space-y-3 mt-4 text-sm text-slate-600">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Na tela Dashboard ou Financeiro, procure as parcelas em atraso da pessoa.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Existe um botão "Realizar Acordo". Clique nele.</li>
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Isso mudará os status das faturas velhas para "Em Acordo" e você poderá parcelar esse saldo devedor em novas faturas mensais, mantendo as coisas organizadas.</li>
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
