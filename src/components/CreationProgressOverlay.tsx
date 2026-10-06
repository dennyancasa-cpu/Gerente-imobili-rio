import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Loader2, Sparkles, ShieldCheck, Bot, AlertCircle } from 'lucide-react';

export interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending';
}

interface CreationProgressOverlayProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  steps: ProgressStep[];
  robotImage?: string;
}

export const CreationProgressOverlay: React.FC<CreationProgressOverlayProps> = ({
  isOpen,
  title = "Processando Criação em Tempo Real",
  subtitle = "Acompanhe cada etapa em tempo real. Itens pendentes em vermelho mudam para verde conforme são criados.",
  steps,
  robotImage = "/robot_working.png"
}) => {
  if (!isOpen) return null;

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed');
  const completedCount = completedSteps.length;
  const currentStep = steps.find(s => s.status === 'current');
  const pendingSteps = steps.filter(s => s.status === 'pending');
  const totalPendingCount = pendingSteps.length + (currentStep ? 1 : 0);

  const percentRealizado = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);
  const percentFaltante = Math.max(0, 100 - percentRealizado);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden flex flex-col my-auto relative"
        >
          {/* Header Superior com Assistente */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-lg backdrop-blur-sm overflow-hidden">
                  <img
                    src={robotImage}
                    alt="Assistente de Criação"
                    className="w-full h-full object-contain animate-pulse"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Bot className="w-8 h-8 text-emerald-400 absolute hidden group-has-[[style*='display: none']]:block" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Sincronização em Tempo Real
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white truncate">{title}</h2>
                <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Painel da Barra de Porcentagem (Verde = Concluído, Vermelho = Pendente) */}
          <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 space-y-4">
            {/* Cards de Métricas em Destaque */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Já Criado (VERDE) */}
              <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Criado (Verde)
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none mt-1 block">
                    {percentRealizado}%
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800/90 block mt-1">
                    {completedCount} de {totalSteps} {completedCount === 1 ? 'item ok' : 'itens ok'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Em Criação / Pendente (VERMELHO) */}
              <div className="bg-rose-50 border-2 border-rose-300/80 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Pendente (Vermelho)
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 leading-none mt-1 block">
                    {percentFaltante}%
                  </span>
                  <span className="text-[11px] font-bold text-rose-800/90 block mt-1">
                    {totalPendingCount} {totalPendingCount === 1 ? 'item em criação' : 'itens em criação'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Barra Visual de Porcentagem Dual (Verde x Vermelho) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Progresso Concluído ({percentRealizado}%)
                </span>
                <span className="text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Falta Criar ({percentFaltante}%)
                </span>
              </div>

              <div className="h-4 bg-rose-200 rounded-full overflow-hidden p-0.5 relative flex shadow-inner border border-slate-300">
                {/* Parte Verde da Barra */}
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 rounded-full relative"
                  initial={{ width: '0%' }}
                  animate={{ width: `${percentRealizado}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                </motion.div>
                {/* Parte Vermelha da Barra que diminui conforme fica verde */}
                <div className="flex-1 h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-full opacity-80" />
              </div>
            </div>
          </div>

          {/* Listas de Etapas: Vermelho (Em criação / Fila) vs Verde (Criado) */}
          <div className="p-5 sm:p-6 space-y-6 max-h-[380px] overflow-y-auto custom-scrollbar">
            
            {/* SEÇÃO 1: ITENS SENDO CRIADOS / PENDENTES (EM VERMELHO) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Em Criação / Na Fila ({totalPendingCount})
                </h3>
                {totalPendingCount > 0 ? (
                  <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                    EM ANDAMENTO (VERMELHO)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    Nenhum item pendente
                  </span>
                )}
              </div>

              {totalPendingCount === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Todos os itens foram processados e estão 100% Verdes!
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Step Atual sendo Executado (Destaque em Vermelho Forte + Animação) */}
                  {currentStep && (
                    <motion.div
                      key={currentStep.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 bg-rose-50 border-2 border-rose-500 rounded-2xl flex items-start gap-3 shadow-md relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl pointer-events-none" />
                      <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-rose-950 truncate">{currentStep.title}</p>
                          <span className="text-[9px] font-black uppercase tracking-wider text-white bg-rose-600 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            CRIANDO AGORA...
                          </span>
                        </div>
                        {currentStep.description && (
                          <p className="text-[11px] font-medium text-rose-900 leading-relaxed mt-0.5">
                            {currentStep.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Steps Pendentes na Fila (Aguardando em Vermelho Mais Suave) */}
                  {pendingSteps.map((step) => (
                    <div
                      key={step.id}
                      className="p-3 bg-rose-50/50 border border-rose-200/90 rounded-xl flex items-start gap-3 opacity-90"
                    >
                      <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border border-rose-300">
                        <Clock className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-rose-900 truncate">{step.title}</p>
                        {step.description && (
                          <p className="text-[11px] text-rose-700/80 leading-relaxed mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
                        Na Fila
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: ITENS JÁ CRIADOS COM SUCESSO (EM VERDE) */}
            <div className="space-y-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Itens Criados com Sucesso ({completedCount})
                </h3>
                {completedCount > 0 && (
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    VERDE (CRIADO)
                  </span>
                )}
              </div>

              {completedCount === 0 ? (
                <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  Aguardando a conclusão da primeira etapa para ficar Verde...
                </div>
              ) : (
                <div className="space-y-2">
                  {completedSteps.map((step) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-emerald-50 border-2 border-emerald-300/80 rounded-xl flex items-start gap-3 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-emerald-950 truncate">{step.title}</p>
                        {step.description && (
                          <p className="text-[11px] font-semibold text-emerald-800 leading-relaxed mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CRIADO
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Rodapé Informativo */}
          <div className="p-4 bg-slate-900 text-slate-300 border-t border-slate-800 flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Sincronizando com Firestore Cloud & Autenticação
            </span>
            <span className="text-[11px] text-slate-400 font-mono">100% Seguro</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
