import React, { useState } from 'react';
import { Calendar, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Payment, Property, Tenant } from '../types';
import { createCalendarEvent, listUpcomingEvents } from '../services/calendarService';
import { auth } from '../firebase';

interface CalendarSyncProps {
  payments: Payment[];
  properties: Property[];
  tenants: Tenant[];
}

export const CalendarSync: React.FC<CalendarSyncProps> = ({ payments, properties, tenants }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late');

  const handleSyncToCalendar = async () => {
    setIsSyncing(true);
    try {
      if (!auth.currentUser) {
        toast.error('Você precisa estar logado para sincronizar.');
        return;
      }
      
      const upcoming = await listUpcomingEvents();
      const existingSummaries = upcoming.items?.map((item: any) => item.summary) || [];
      
      let syncCount = 0;
      
      for (const payment of pendingPayments) {
        const tenant = tenants.find(t => t.id === payment.tenantId);
        const property = properties.find(p => p.id === payment.propertyId);
        
        const title = `Cobrança: ${tenant?.name || 'Inquilino'} - ${property?.name || 'Imóvel'}`;
        const description = `Valor: R$ ${payment.amount.toLocaleString()}\nVencimento: ${payment.dueDate}\nStatus: ${payment.status === 'late' ? 'ATRASADO' : 'Pendente'}`;
        
        // Prevent simple duplicates
        if (!existingSummaries.includes(title)) {
           await createCalendarEvent(title, description, payment.dueDate);
           syncCount++;
        }
      }
      
      setShowConfirmation(false);
      toast.success(syncCount > 0 ? `${syncCount} eventos adicionados ao seu Google Agenda!` : 'Todos os eventos já estão no Google Agenda.');
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao sincronizar com o Google Agenda.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingPayments.length === 0) return null;

  return (
    <>
      <button 
        onClick={() => setShowConfirmation(true)}
        className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium text-slate-700"
      >
        <Calendar className="w-5 h-5 text-indigo-500" />
        Sincronizar Vencimentos
      </button>

      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Adicionar ao Google Agenda?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
                 Você está prestes a adicionar <strong>{pendingPayments.length}</strong> cobranças pendentes como eventos no seu Google Agenda. Sincronizar cobranças ajuda a gerenciá-las com eficiência.
              </p>
              
              <div className="flex justify-end gap-3 font-bold text-sm">
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  disabled={isSyncing}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSyncToCalendar}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSyncing ? 'Sincronizando...' : 'Confirmar Sincronização'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
