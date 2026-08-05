import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Upload, CheckCircle2, ChevronRight, Wand2, Plus, 
  AlertCircle, Bot, HelpCircle, Scale, ShieldCheck, Square, 
  Volume2, Sparkles, X, ArrowLeft, Send, BookOpen, Layers,
  FolderCheck, Search, SearchX, User, WifiOff, MessageSquare
} from 'lucide-react';
import { parseContractFromText, parseMultipleRecordsFromText, getLegalConsultantResponse } from '../services/geminiService';
import { ImportDataView } from './ImportDataView';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Card = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 ${className} ${onClick ? 'cursor-pointer' : ''}`}>
    {children}
  </div>
);

interface Props {
  properties: any[];
  updateProperty: (id: string, prop: any) => Promise<void>;
  addProperty: (p: any) => Promise<string | void>;
  addTenant: (t: any) => Promise<string | void>;
  onNavigateToCreated: () => void;
  onOpenContractTemplate?: (type: string) => void;
  stagingRecords: any[];
  onSaveStagingRecord: (data: any) => Promise<void>;
  onDeleteStagingRecord: (id: string) => Promise<void>;
  onActivateStagingRecord: (record: any) => Promise<void>;
  isOnline?: boolean;
}

export function IntelligenceHubView({ properties, updateProperty, addProperty, addTenant, onNavigateToCreated, onOpenContractTemplate, stagingRecords, onSaveStagingRecord, onDeleteStagingRecord, onActivateStagingRecord, isOnline = true }: Props) {
  const [activeModule, setActiveModule] = useState<'home' | 'chat' | 'import_single' | 'import_bulk' | 'folder' | 'templates' | 'documents'>('home');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractText, setContractText] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<{ base64: string; name: string } | null>(null);
  const [bulkRecords, setBulkRecords] = useState<any[]>([]);
  const [bulkSummary, setBulkSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat Sessions State
  const [showWarning, setShowWarning] = useState(() => {
    try { return localStorage.getItem('hideLegalWarning') !== 'true'; } catch { return true; }
  });
  const [sessions, setSessions] = useState<{id: string, title: string, updatedAt: number, messages: any[]}[]>(() => {
    try {
      const saved = localStorage.getItem('legalChatSessions');
      if (saved) return JSON.parse(saved);
      const old = localStorage.getItem('legalChatHistory');
      if (old) {
        const parsed = JSON.parse(old); 
        if (parsed.length > 1) return [{ id: Date.now().toString(), title: 'Conversa Anterior', updatedAt: Date.now(), messages: parsed }];
      }
    } catch {}
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => { try { localStorage.setItem('legalChatSessions', JSON.stringify(sessions)); } catch {} }, [sessions]);

  const defaultMessage = { role: 'assistant', content: 'Olá! Sou seu Consultor Jurídico IA. Posso te ajudar com leis do inquilinato, regras de locação, impostos e dicas para alugar seu espaço com Segurança. O que você gostaria de saber?' };
  const activeSession = sessions.find(s => s.id === currentSessionId);
  const chatHistory = activeSession ? activeSession.messages : [defaultMessage];

  const setChatHistory = (updater: any) => {
    let nextMsgs: any[];
    if (typeof updater === 'function') {
      nextMsgs = updater(chatHistory);
    } else {
      nextMsgs = updater;
    }

    if (!currentSessionId) {
      if (nextMsgs.length <= 1) return; // Don't save empty session
      const newId = Date.now().toString();
      const firstUserMsg = nextMsgs.find((m: any) => m.role === 'user')?.content || 'Nova Conversa';
      const title = firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
      const newSession = { id: newId, title, updatedAt: Date.now(), messages: nextMsgs };
      setSessions(prev => [newSession, ...prev].slice(0, 20));
      setCurrentSessionId(newId);
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const firstUserMsg = nextMsgs.find((m: any) => m.role === 'user')?.content || 'Nova Conversa';
          const title = (s.title === 'Nova Conversa' || s.title === 'Conversa Anterior') && firstUserMsg !== 'Nova Conversa' 
             ? firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : '') 
             : s.title;
          return { ...s, title, updatedAt: Date.now(), messages: nextMsgs };
        }
        return s;
      }));
    }
  };

  const [userInput, setUserInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    
    const lastMsg = chatHistory[chatHistory.length - 1];
    
    if (lastMsg && lastMsg.role === 'assistant') {
      // Scroll to the start of this assistant message
      setTimeout(() => {
        const container = scrollRef.current;
        const lastMsgEl = document.getElementById(`chat-message-${chatHistory.length - 1}`);
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
      // User message or other updates, scroll to bottom
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, activeModule, isLoadingChat]);

  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, []);

  const handlePlayTTS = (text: string, id: number) => {
    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setPlayingId(null);
    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!isOnline) {
      toast.error('Você está sem conexão com a internet. O Consultor Jurídico IA precisa de conexão para funcionar.');
      return;
    }
    if (!userInput.trim() || isLoadingChat) return;
    const userMsg = userInput;
    setUserInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoadingChat(true);
    try {
      const response = await getLegalConsultantResponse(userMsg, chatHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response as string }]);
    } catch (error) {
      toast.error('Erro ao processar sua solicitação jurídica.');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Import Functions
  const handleProcessText = async () => {
    if (!isOnline) {
      toast.error('Você está offline. O leitor inteligente de contratos exige acesso à internet.');
      return;
    }
    if (!contractText.trim()) return;
    setIsProcessing(true);
    try {
      const data = await parseContractFromText(contractText);
      if (data) { setParsedData(data); setStep(2); } 
      else toast.error('Não foi possível extrair dados estruturados deste texto.');
    } catch (e: any) { toast.error('Erro: ' + e.message); } 
    finally { setIsProcessing(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!isOnline) {
       toast.error('Você está offline. O leitor inteligente de contratos exige acesso à internet.');
       return;
     }
     const file = e.target.files?.[0];
     if (!file) return;
     const isImage = file.type.startsWith('image/');
     const isPDF = file.type === 'application/pdf';
     if (isImage || isPDF) {
       setIsProcessing(true);
       const reader = new FileReader();
       reader.onloadend = async () => {
         const base64 = reader.result as string;
         try {
           const promptMsg = isPDF ? "Analise este documento PDF de contrato de aluguel." : "Veja a imagem do contrato anexada.";
           const data = await parseContractFromText(promptMsg, base64, file.type);
           if (data) { 
             setParsedData(data); 
             setUploadedFile({ base64, name: file.name });
             setStep(2); 
           } 
           else toast.error('Não foi possível extrair dados estruturados deste arquivo.');
         } catch(err: any) { toast.error(err.message); } 
         finally { setIsProcessing(false); }
       };
       reader.readAsDataURL(file);
     } else {
       toast.error("Por favor, envie um arquivo de Imagem ou PDF.");
     }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const propertyId = await addProperty({
        name: parsedData.property?.name || 'Imóvel Importado',
        address: parsedData.property?.address || 'Endereço Pendente',
        rentValue: Number(parsedData.property?.rentValue) || 0,
        paymentDay: Number(parsedData.property?.paymentDay) || 5,
        rules: parsedData.property?.rules || '',
        status: 'vacant', chargeLateFees: false, lateFeePenalty: 10, lateFeeDaily: 0.33, lateFeeType: 'percentage'
      });
      if (propertyId && parsedData.tenant && parsedData.tenant.name) {
        const tenantPayload: any = {
          name: parsedData.tenant.name, 
          cpf: parsedData.tenant.cpf || '', 
          contact: parsedData.tenant.contact || '', 
          spouse: parsedData.tenant.spouse || '',
          children: parsedData.tenant.children || '',
          pets: parsedData.tenant.pets || '',
          hasVehicles: !!parsedData.tenant.vehicles && parsedData.tenant.vehicles.trim() !== '',
          vehicleDetails: parsedData.tenant.vehicles || '',
          observations: parsedData.tenant.observations || '', 
          propertyId, 
          status: 'allocated',
          rentValue: Number(parsedData.property?.rentValue) || 0,
          paymentDay: Number(parsedData.property?.paymentDay) || 5,
          startDate: parsedData.contract?.startDate || '',
          endDate: parsedData.contract?.endDate || '',
        };
        
        if (uploadedFile) {
          tenantPayload.contractFile = uploadedFile.base64;
          tenantPayload.evidenceName = uploadedFile.name;
        }

        if (parsedData.deposit?.hasDeposit === true || parsedData.deposit?.depositValue > 0) {
          tenantPayload.initialPaymentType = 'deposit';
          tenantPayload.depositValue = Number(parsedData.deposit?.depositValue) || 0;
          tenantPayload.depositInstallments = Number(parsedData.deposit?.depositInstallments) || 1;
          tenantPayload.depositDueDate = parsedData.deposit?.depositDueDate || '';
        }
        await addTenant(tenantPayload);
      }
      setStep(3);
    } catch(err: any) { toast.error('Erro ao importar: ' + err.message); } 
    finally { setIsProcessing(false); }
  };

  const handleConfirmBulk = async () => {
    setIsProcessing(true);
    try {
      for (const rec of bulkRecords) {
        const pId = await addProperty({
          name: rec.property?.name || 'Imóvel Importado CSV', address: rec.property?.address || '', rentValue: Number(rec.property?.rentValue) || 0, paymentDay: Number(rec.property?.paymentDay) || 5, status: 'vacant'
        });
        if (pId && rec.tenant && rec.tenant.name) {
          await addTenant({ 
            name: rec.tenant.name, 
            cpf: rec.tenant.cpf || '', 
            contact: rec.tenant.contact || '', 
            propertyId: pId, 
            status: 'allocated',
            rentValue: Number(rec.property?.rentValue) || 0,
            paymentDay: Number(rec.property?.paymentDay) || 5
          });
        }
      }
      setStep(3);
    } catch (e: any) { toast.error('Erro: ' + e.message); } 
    finally { setIsProcessing(false); }
  };

  const resetImportState = () => {
    setStep(1);
    setContractText('');
    setParsedData(null);
    setUploadedFile(null);
    setBulkRecords([]);
  };

  if (activeModule === 'chat') {
    return (
      <div className="w-full h-[calc(100vh-80px)] xl:h-[calc(100vh-40px)] flex flex-col animate-in fade-in pb-4">
        <div className="flex items-center justify-between gap-4 mb-4 px-4 pt-2 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveModule('home')} className="p-2.5 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full shadow-sm border border-slate-100 transition-all" >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" /> Consultor Jurídico IA
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Baseado na legislação brasileira
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 text-sm font-bold flex items-center gap-2 shadow-sm" title="Histórico">
              <MessageSquare className="w-4 h-4" /> Histórico
            </button>
            <button onClick={() => {
              setCurrentSessionId(null);
            }} className="hidden sm:flex px-4 py-2 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 text-sm font-bold items-center gap-2 shadow-sm" title="Nova Conversa">
              <Plus className="w-4 h-4" /> Nova Conversa
            </button>
          </div>
        </div>

        <div className="flex-1 flex bg-white border border-slate-200 overflow-hidden relative w-full h-full rounded-[2rem] sm:rounded-none sm:border-0 sm:border-t">
          {/* Sidenar Histórico */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden shrink-0"
              >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Histórico de Conversas</h3>
                  <button onClick={() => setShowSidebar(false)} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-1">
                  <button 
                    onClick={() => { setCurrentSessionId(null); setShowSidebar(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nova Conversa
                  </button>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum histórico</p>
                  ) : (
                    sessions.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => { setCurrentSessionId(s.id); setShowSidebar(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-semibold rounded-lg truncate transition-colors",
                          currentSessionId === s.id ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {currentSessionId === s.id && <ChevronRight className="inline-block w-3 h-3 text-indigo-500 mr-1" />}
                        {s.title || 'Conversa'}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          {showWarning && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 shrink-0 flex items-start justify-between gap-4 z-10 relative">
               <div className="flex items-start gap-4">
                 <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-sm sm:text-base font-bold text-amber-900 mb-1">Aviso Importante do Consultor</h4>
                   <p className="text-xs sm:text-sm text-amber-700 leading-relaxed font-medium">Esta é uma IA de auxílio. Não tome as respostas como verdade absoluta ou parecer jurídico vinculativo. Toda informação sensível deve ser verificada com um profissional advogado real.</p>
                 </div>
               </div>
               <button onClick={() => { 
                setShowWarning(false); 
                try { localStorage.setItem('hideLegalWarning', 'true'); } catch {} 
              }} className="p-2 hover:bg-amber-100 rounded-xl text-amber-600 transition-colors shrink-0" > <X className="w-5 h-5" /> </button>
            </div>
          )}
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 py-8 space-y-8 custom-scrollbar relative z-10 w-full" >
            {chatHistory.map((msg, idx) => (
              <motion.div id={`chat-message-${idx}`} key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col w-full", msg.role === 'user' ? "items-end" : "items-start" )} >
                <div className={cn("flex items-center gap-2 mb-2 px-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tighter shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 border border-indigo-100")}>
                    {msg.role === 'user' ? 'YOU' : <Scale className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">{msg.role === 'user' ? 'Você' : 'Advogado IA'}</span>
                </div>
                <div className={cn("w-full sm:max-w-[85%] md:max-w-[75%] px-6 sm:px-8 py-5 sm:py-6 shadow-sm leading-relaxed transition-all", msg.role === 'user' ? "bg-indigo-600 text-white rounded-[2rem] rounded-tr-sm shadow-indigo-200" : "bg-[#F8FAFC] text-slate-800 border border-slate-200 rounded-[2rem] rounded-tl-sm shadow-slate-200/50")}>
                  <div className={cn("whitespace-pre-wrap", msg.role === 'assistant' ? "markdown-body text-[15px] sm:text-[16px] font-medium text-slate-800" : "text-[15px] sm:text-[16px] font-semibold text-white tracking-tight")}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                      <button onClick={() => handlePlayTTS(msg.content, idx)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm", playingId === idx ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200")}>
                        {playingId === idx ? <><Square className="w-3.5 h-3.5 fill-current" /> Parando...</> : <><Volume2 className="w-3.5 h-3.5" /> Ouvir Resposta</>}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoadingChat && (
              <div className="flex flex-col items-start px-2">
                 <div className="w-20 h-10 bg-white/70 border border-slate-200 rounded-[2rem] rounded-tl-sm shadow-sm flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                 </div>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-6 bg-white border-t border-slate-200 relative z-20 shrink-0">
             <div className="relative group max-w-5xl mx-auto shadow-sm rounded-[2.5rem]">
                <textarea 
                  placeholder={isOnline ? "Escreva sua dúvida jurídica de forma detalhada aqui..." : "Aguardando conexão..."}
                  value={userInput}
                  disabled={!isOnline}
                  onChange={(e) => setUserInput(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }} 
                  className="w-full min-h-[70px] max-h-[200px] resize-none bg-slate-50 border-2 border-slate-200 text-slate-800 px-8 py-5 rounded-[2.5rem] pr-20 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] custom-scrollbar disabled:opacity-50" 
                />
                <button onClick={sendMessage} disabled={!isOnline || !userInput.trim() || isLoadingChat} className="absolute right-3 bottom-3 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:shadow-none flex items-center justify-center transform active:scale-95" > <Send className="w-5 h-5 ml-0.5" /> </button>
              </div>
              <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">A inteligência artificial pode cometer erros. Considere verificar informações importantes.</p>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === 'documents') {
    return (
      <div className="max-w-5xl mx-auto pt-4 space-y-6 animate-in fade-in pb-12">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => setActiveModule('home')} className="p-2 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full shadow-sm border border-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FolderCheck className="w-6 h-6 text-violet-600" /> Documentos & Auditoria de Imóveis
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie a documentação importante de todas as propriedades de forma centralizada.</p>
          </div>
        </div>

        <div className="space-y-6">
          {properties.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <FolderCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum Imóvel Encontrado</h3>
              <p className="text-slate-500 mt-2">Você precisa cadastrar imóveis para gerenciar seus documentos.</p>
            </div>
          ) : (
            properties.map(property => {
              const docs = property.documents || [];
              const pendingDocs = docs.filter((d: any) => d.status !== 'valid');
              const hasIssues = pendingDocs.length > 0;

              return (
                <div key={property.id} className={cn("bg-white rounded-3xl overflow-hidden shadow-sm border transition-all", hasIssues ? "border-amber-200" : "border-slate-200")}>
                  <div className={cn("p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4", hasIssues ? "bg-amber-50/50 border-amber-100" : "bg-slate-50 border-slate-100")}>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{property.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{property.address || 'Sem endereço'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasIssues && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5" /> {pendingDocs.length} Pendências
                        </span>
                      )}
                      {docs.length === 0 && (
                        <button 
                          onClick={() => {
                            const newDocs = [
                              { id: crypto.randomUUID(), name: 'Matrícula Atualizada', status: 'pending', isRequired: true },
                              { id: crypto.randomUUID(), name: 'Carnê do IPTU', status: 'pending', isRequired: true },
                              { id: crypto.randomUUID(), name: 'Contas de Consumo (Água/Luz)', status: 'pending', isRequired: false },
                              { id: crypto.randomUUID(), name: 'Laudo de Vistoria', status: 'pending', isRequired: false }
                            ];
                            updateProperty(property.id, { ...property, documents: newDocs });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Aplicar Checklist Padrão
                        </button>
                      )}
                      {docs.length > 0 && (
                        <button 
                          onClick={() => {
                            const newDocs = [...docs, { id: crypto.randomUUID(), name: 'Novo Documento', status: 'pending', isRequired: false }];
                            updateProperty(property.id, { ...property, documents: newDocs });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Doc
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-2 sm:p-5">
                    {docs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {docs.map((doc: any) => (
                          <div key={doc.id} className={cn("p-3 rounded-xl border flex flex-col gap-3 transition-colors", doc.status === 'valid' ? "bg-emerald-50/30 border-emerald-100" : doc.status === 'missing' ? "bg-rose-50/50 border-rose-100" : "bg-white border-slate-200")}>
                            <div className="flex items-start justify-between gap-3">
                               <input 
                                  value={doc.name || ''} 
                                  onChange={(e) => {
                                    const updated = docs.map((d: any) => d.id === doc.id ? { ...d, name: e.target.value } : d);
                                    updateProperty(property.id, { ...property, documents: updated });
                                  }}
                                  className="flex-1 font-semibold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors truncate"
                                  placeholder="Nome do Documento"
                               />
                               <button 
                                 title="Remover Documento"
                                 onClick={() => {
                                    if(window.confirm('Excluir este documento?')) {
                                      const updated = docs.filter((d: any) => d.id !== doc.id);
                                      updateProperty(property.id, { ...property, documents: updated });
                                    }
                                 }}
                                 className="flex items-center gap-1 text-slate-400 hover:text-rose-500 hover:bg-rose-100/50 rounded-lg px-2 py-1 transition-all text-[11px] font-bold uppercase tracking-wider"
                               >
                                 <X className="w-3.5 h-3.5" /> Remover
                               </button>
                            </div>
                            <div className="flex items-center justify-between">
                               <select
                                 value={doc.status || 'pending'}
                                 onChange={(e) => {
                                    const updated = docs.map((d: any) => d.id === doc.id ? { ...d, status: e.target.value } : d);
                                    updateProperty(property.id, { ...property, documents: updated });
                                 }}
                                 className={cn("text-xs font-bold uppercase tracking-wider outline-none p-1.5 rounded-lg border", 
                                  doc.status === 'valid' ? "bg-emerald-100 text-emerald-800 border-emerald-200" : 
                                  doc.status === 'missing' ? "bg-rose-100 text-rose-800 border-rose-200" : 
                                  "bg-slate-100 text-slate-700 border-slate-200"
                                 )}
                               >
                                  <option value="pending">Pendente</option>
                                  <option value="valid">Válido</option>
                                  <option value="missing">Falta</option>
                                  <option value="expired">Expirado</option>
                               </select>
                               
                               <div className="flex items-center gap-2">
                                  <button onClick={() => toast.success('Exportação de documento iniciada.')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                                    <Upload className="w-3 h-3" /> Exportar/Anexar
                                  </button>
                                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">
                                    <input 
                                      type="checkbox" 
                                      checked={!!doc.isRequired}
                                      onChange={(e) => {
                                        const updated = docs.map((d: any) => d.id === doc.id ? { ...d, isRequired: e.target.checked } : d);
                                        updateProperty(property.id, { ...property, documents: updated });
                                      }}
                                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                                    />
                                    Obrigat.
                                  </label>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Nenhum documento sendo monitorado neste imóvel.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (activeModule === 'import_bulk') {
    return (
      <div className="max-w-7xl mx-auto pt-4 relative animate-in fade-in">
         <button onClick={() => { setActiveModule('home'); resetImportState(); }} className="absolute -top-1 -left-1 md:-ml-4 z-10 p-2 bg-white text-slate-500 hover:text-slate-800 rounded-full shadow-sm border border-slate-100 transition-colors" >
            <ArrowLeft className="w-5 h-5" />
         </button>
         <ImportDataView 
            stagingRecords={stagingRecords}
            onSaveStagingRecord={onSaveStagingRecord}
            onDeleteStagingRecord={onDeleteStagingRecord}
            onActivateStagingRecord={onActivateStagingRecord}
         />
      </div>
    );
  }

  if (activeModule === 'import_single' || activeModule === 'folder') {
    return (
      <div className="max-w-4xl mx-auto pt-4 space-y-8 animate-in fade-in">
         <div className="flex items-center gap-4 mb-2">
          <button onClick={() => { setActiveModule('home'); resetImportState(); }} className="p-2 bg-white text-slate-500 hover:text-slate-800 rounded-full shadow-sm border border-slate-100 transition-colors" >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
               {activeModule === 'import_single' ? 'Importação Individual via IA' : 'Organizador de Pastas Automático'}
            </h1>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            {activeModule === 'import_single' && (
              <>
                <p className="text-slate-500 mb-6">Cole o texto inteiro do contrato de locação, ou envie uma foto/PDF. A IA vai ler as cláusulas e montar a ficha de locação.</p>
                <textarea className="w-full min-h-[300px] p-4 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" placeholder={isOnline ? "Cole de uma vez..." : "Aguardando conexão..."} disabled={!isOnline} value={contractText} onChange={e => setContractText(e.target.value)} />
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
                   <div className="flex items-center gap-4 w-full md:w-auto">
                     <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                     <button onClick={() => fileInputRef.current?.click()} disabled={!isOnline} className="flex-1 md:flex-none border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                       <Upload className="w-4 h-4" /> Enviar Arquivo
                     </button>
                   </div>
                   <button onClick={handleProcessText} disabled={!isOnline || isProcessing || !contractText.trim()} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                     {isProcessing ? 'Extraindo IA...' : <><Wand2 className="w-4 h-4" /> Analisar e Extrair</>}
                   </button>
                </div>
              </>
            )}

            {activeModule === 'folder' && (
               <div className="py-16 text-center">
                 <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"> <Upload className="w-8 h-8" /> </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Organizador de Pastas (Visão Beta)</h3>
                 <p className="text-slate-500 max-w-md mx-auto mb-8">Envie a pasta completa que você tem salva do seu inquilino. Vamos juntar tudo e montar o cadastro perfeitamente em 1 clique.</p>
                 <input type="file" ref={fileInputRef} {...({ webkitdirectory: "true", directory: "true" } as any)} multiple className="hidden" onChange={(e) => {
                   const files = e.target.files;
                   if (files && files.length > 0) {
                      setIsProcessing(true);
                      setTimeout(() => {
                         setIsProcessing(false);
                         setParsedData({ property: { name: `Imóvel: ${files[0].webkitRelativePath?.split('/')[0] || 'Pasta'}`, address: '', rentValue: 1000, paymentDay: 10 }, tenant: { name: 'Inquilino Exemplo da Pasta', cpf: '', contact: '' }, feedback: { missingInfo: [], improvements: [] } });
                         setStep(2);
                      }, 2000);
                   }
                 }} />
                 <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center mx-auto gap-2">
                   {isProcessing ? 'Abrindo e separando arquivos...' : 'Subir Pasta do Computador'}
                 </button>
               </div>
            )}
          </div>
        )}

        {step === 2 && parsedData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                 <h3 className="font-bold flex items-center gap-2 text-emerald-600"> <CheckCircle2 className="w-5 h-5" /> Imóvel Identificado </h3>
                 <div className="space-y-3 pt-2">
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</label><input className="w-full font-bold p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.property?.name || ''} onChange={e => setParsedData({...parsedData, property: {...parsedData.property, name: e.target.value}})} /></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.property?.address || ''} onChange={e => setParsedData({...parsedData, property: {...parsedData.property, address: e.target.value}})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aluguel (R$)</label><input type="text" inputMode="decimal" className="w-full text-sm font-bold text-emerald-600 p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.property?.rentValue || 0} onFocus={e => e.target.select()} onChange={e => setParsedData({...parsedData, property: {...parsedData.property, rentValue: e.target.value}})} /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</label><input type="text" inputMode="numeric" pattern="[0-9]*" className="w-full text-sm font-bold p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.property?.paymentDay || 5} onFocus={e => e.target.select()} onChange={e => setParsedData({...parsedData, property: {...parsedData.property, paymentDay: e.target.value}})} /></div>
                   </div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regras do Imóvel</label><textarea className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500 bg-transparent resize-none h-16" placeholder="Sem regras extras" value={parsedData.property?.rules || ''} onChange={e => setParsedData({...parsedData, property: {...parsedData.property, rules: e.target.value}})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Início Contrato</label><input type="date" className="w-full text-sm font-medium p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.contract?.startDate || ''} onChange={e => setParsedData({...parsedData, contract: {...parsedData.contract, startDate: e.target.value}})} /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fim Contrato</label><input type="date" className="w-full text-sm font-medium p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.contract?.endDate || ''} onChange={e => setParsedData({...parsedData, contract: {...parsedData.contract, endDate: e.target.value}})} /></div>
                   </div>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                 <h3 className="font-bold flex items-center gap-2 text-blue-600"> <CheckCircle2 className="w-5 h-5" /> Inquilino Localizado </h3>
                 <div className="space-y-3 pt-2">
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</label><input className="w-full font-bold p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.tenant?.name || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, name: e.target.value}})} /></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.tenant?.cpf || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, cpf: e.target.value}})} /></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" value={parsedData.tenant?.contact || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, contact: e.target.value}})} /></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cônjuge / Copartícipe</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" placeholder="Não informado" value={parsedData.tenant?.spouse || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, spouse: e.target.value}})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filhos (Mencionado)</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" placeholder="Não informado" value={parsedData.tenant?.children || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, children: e.target.value}})} /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Animais (Pets)</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" placeholder="Não informado" value={parsedData.tenant?.pets || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, pets: e.target.value}})} /></div>
                   </div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Veículos (Vaga de garagem)</label><input className="w-full text-sm p-2 border-b border-slate-200 focus:outline-none focus:border-indigo-500" placeholder="Não informado" value={parsedData.tenant?.vehicles || ''} onChange={e => setParsedData({...parsedData, tenant: {...parsedData.tenant, vehicles: e.target.value}})} /></div>
                 </div>
              </div>
            </div>
            <div className="flex items-center justify-end pt-4 gap-4">
               <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Voltar</button>
               <button onClick={handleConfirm} disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md">
                 {isProcessing ? 'CRIANDO...' : 'CONFIRMAR E SALVAR'}
               </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
               <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-slate-100">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-500" /> Resumo da Análise (IA)
                 </h2>
                 {bulkSummary && (
                   <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                     <p className="text-slate-700 text-sm leading-relaxed mb-4">{bulkSummary.message}</p>
                     <div className="flex gap-4">
                       <div className="bg-white px-4 py-2 border border-slate-200 text-sm rounded-xl font-bold text-slate-700 shadow-sm flex flex-col">
                         <span className="text-[10px] text-slate-400 uppercase tracking-widest">Imóveis Entendidos</span>
                         <span className="text-lg text-emerald-600">{bulkSummary.propertiesCount || bulkRecords.length} Casas</span>
                       </div>
                       <div className="bg-white px-4 py-2 border border-slate-200 text-sm rounded-xl font-bold text-slate-700 shadow-sm flex flex-col">
                         <span className="text-[10px] text-slate-400 uppercase tracking-widest">Inquilinos Entendidos</span>
                         <span className="text-lg text-blue-600">{bulkSummary.tenantsCount || bulkRecords.length} Pessoas</span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
               
               <h3 className="font-bold text-slate-600 mb-4 uppercase tracking-widest text-xs">Pré-visualização dos Dados</h3>
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {bulkRecords.map((rec, i) => (
                   <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{rec.property?.name || 'Imóvel sem nome'} <span className="font-black text-emerald-600 ml-2">R$ {rec.property?.rentValue}</span></p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {rec.tenant?.name || 'Vazio / Sem Inquilino'}</p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
               <div className="flex items-center justify-end mt-6 pt-6 border-t border-slate-100 gap-4">
                 <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">Voltar e Editar</button>
                 <button onClick={handleConfirmBulk} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md">
                    {isProcessing ? 'CRIANDO...' : 'Tudo Certo! Importar Agora'}
                 </button>
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-emerald-50 p-12 text-center rounded-3xl border border-emerald-100 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6"> <CheckCircle2 className="w-10 h-10 text-white" /> </div>
            <h2 className="text-2xl font-black text-emerald-950 mb-2">Sucesso Total!</h2>
            <p className="text-emerald-800 mb-8 max-w-md">Todos os registros foram criados ou salvos com sucesso e já constam no banco de dados.</p>
            <button onClick={onNavigateToCreated} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"> Ir para Dashboard </button>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 p-4 xl:p-0 pt-4">
      <div className="mb-8 pl-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-indigo-600" />
          Hub Jurídico IA
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl font-medium">
          Diferenciais do aplicativo: Acesso ao Consultor Jurídico IA, leituras automatizadas de contratos antigos e importações rápidas.
        </p>
      </div>

      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="p-5 bg-rose-50 border border-rose-200 text-rose-950 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm"
          >
            <div className="p-3 bg-rose-500 text-white rounded-xl shrink-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-sm">Dispositivo Offline - Funções de IA Indisponíveis</h3>
              <p className="text-xs text-rose-700 leading-relaxed font-semibold mt-1">
                Detector de rede ativo: alguns recursos locais continuam funcionando, mas as ferramentas que dependem da nossa inteligência artificial (**Consultor Jurídico**, **Leitor de Contratos** e o **Assistente de Conversa**) necessitam de conexão com a internet para carregar e processar suas requisições.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <Card onClick={() => setActiveModule('chat')} className="p-8 hover:border-indigo-400 hover:shadow-2xl transition-all group overflow-hidden relative ring-2 ring-indigo-500/10 cursor-pointer">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            {!isOnline && (
              <span className="absolute top-4 right-4 bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                <WifiOff className="w-3.5 h-3.5" /> Requer Conexão
              </span>
            )}
            <div className="bg-indigo-600 text-white rounded-2xl flex items-center justify-center p-3 w-16 h-16 shadow-lg shadow-indigo-600/30 mb-6">
              <Scale className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Consultor Jurídico IA</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">O nosso maior diferencial. Converse com um especialista em Leis do Inquilinato. Tire dúvidas avançadas, simule casos e evite falhas antes de assinar.</p>
            <div className="flex items-center text-indigo-600 font-bold text-sm mt-auto">
               Abrir Consultoria <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
         </Card>

         <Card onClick={() => setActiveModule('import_single')} className="p-8 hover:border-blue-300 hover:shadow-xl transition-all group overflow-hidden relative cursor-pointer">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Wand2 className="w-40 h-40" /></div>
            {!isOnline && (
              <span className="absolute top-4 right-4 bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                <WifiOff className="w-3.5 h-3.5" /> Requer Conexão
              </span>
            )}
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><Wand2 className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Leitor de Contratos</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">Tire uma foto ou suba um PDF de um contrato que você já tem. Nós extraímos a ficha completa do Imóvel para importar em segundos.</p>
            <div className="flex items-center text-blue-600 font-bold text-sm mt-auto">
               Ler Contrato e Criar <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
         </Card>

         <Card onClick={() => setActiveModule('import_bulk')} className="p-8 hover:border-emerald-300 hover:shadow-xl transition-all group overflow-hidden relative cursor-pointer">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Layers className="w-40 h-40" /></div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><Layers className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Importação em Lote</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">Trazendo do AppSheet ou Excel? Copie e cole dezenas de dados. Ex: Copie a tabela, cole aqui e cadastraremos todos de uma vez.</p>
            <div className="flex items-center text-emerald-600 font-bold text-sm mt-auto">
               Importar Tabelas <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
         <Card className="p-8 border-transparent bg-white shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:border-violet-200 transition-all cursor-pointer group" onClick={() => setActiveModule('documents')}>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-violet-200 text-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><FolderCheck className="w-8 h-8" /></div>
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-violet-700 transition-colors">Documentos & Auditoria de Imóveis</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Verifique o status, adicione checklists e controle laudos, impostos e seguros de todas as suas propriedades em um só painel.</p>
              </div>
            </div>
         </Card>

         <Card className="p-8 border-transparent bg-white shadow-xl flex flex-col group lg:col-span-2 relative overflow-hidden" onClick={() => {}}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-6 relative z-10 w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                 <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><FileText className="w-7 h-7" /></div>
                 <div className="text-center sm:text-left">
                   <h3 className="font-bold text-xl text-slate-800 mb-1">Modelos Rápidos (Download)</h3>
                   <p className="text-slate-500 text-sm leading-relaxed max-w-sm">Acesse rapidamente modelos de contratos limpos, recibos de caução ou termo de vistoria para baixar ou enviar.</p>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 relative z-10 w-full">
               {[
                 { tag: 'Contrato de Locação', type: 'Contrato de Locação', icon: FileText },
                 { tag: 'Renovar Aluguel', type: 'Termo de Renovação de Aluguel', icon: FileText },
                 { tag: 'Termo de Vistoria', type: 'Termo Vistoria', icon: FileText },
                 { tag: 'Recibo de Aluguel', type: 'Recibo de Aluguel', icon: FileText },
                 { tag: 'Recibo de Caução', type: 'Recibo Caução', icon: FileText },
                 { tag: 'Notificação Reajuste', type: 'Notificação de Reajuste', icon: AlertCircle },
                 { tag: 'Aviso Desocupação', type: 'Aviso Desocupação', icon: AlertCircle },
               ].map((item, i) => {
                 const Icon = item.icon;
                 return (
                   <button
                     key={i}
                     onClick={(e) => {
                       e.stopPropagation();
                       onOpenContractTemplate?.(item.type);
                     }}
                     className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-pink-300 hover:shadow-md hover:bg-white transition-all group aspect-square text-center relative overflow-hidden"
                   >
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Upload className="w-3.5 h-3.5 text-pink-400" />
                     </div>
                     <div className="w-10 h-10 bg-pink-100/50 rounded-full flex items-center justify-center text-pink-600 group-hover:bg-pink-100 transition-colors mb-3">
                       <Icon className="w-5 h-5" />
                     </div>
                     <span className="text-[11px] font-bold text-slate-700 group-hover:text-pink-700 line-clamp-2 leading-tight">
                       {item.tag}
                     </span>
                   </button>
                 );
               })}
            </div>
         </Card>
      </div>

    </div>
  );
}
