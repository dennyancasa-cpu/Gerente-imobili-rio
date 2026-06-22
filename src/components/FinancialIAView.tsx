import React, { useState } from 'react';
import { Bot, Sparkles, TrendingUp, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateFinancialAudit } from '../services/geminiService';
import { Property, Tenant, Payment, Expense, Agreement } from '../types';
import Markdown from 'react-markdown';

interface FinancialIAViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
}

export const FinancialIAView: React.FC<FinancialIAViewProps> = ({
  properties,
  tenants,
  payments,
  expenses,
  agreements
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleGenerateAudit = async () => {
    setLoading(true);
    try {
      const data = {
        properties,
        tenants,
        payments,
        expenses,
        agreements
      };
      const response = await generateFinancialAudit(data);
      setReport(response);
    } catch (error) {
      console.error("Error generating audit:", error);
      setReport("Houve um erro ao gerar a auditoria financeira. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
            <Bot className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Auditoria & Inteligência Financeira</h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Nosso Agente Financeiro IA especializado analisa todas as suas entradas, saídas e acordos. 
              Ele detecta inconsistências, avalia a inadimplência, projeta seu fluxo de caixa e garante que as contas façam sentido.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateAudit}
          disabled={loading}
          className="relative z-10 whitespace-nowrap px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto justify-center"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analisando Contas...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Executar Auditoria Geral
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Relatório de Auditoria IA</h3>
                <p className="text-xs text-slate-500">Gerado com base nos dados atuais do sistema</p>
              </div>
            </div>
            
            <div className="markdown-body text-sm sm:text-base text-slate-700 font-medium">
              <Markdown>{report}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
