import React, { useState } from 'react';
import { Ticket, Property, Tenant } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  MessageSquare,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreError';
import { OperationType } from '../types';
import { parseTicketFromText } from '../services/geminiService';

interface TicketsViewProps {
  tickets: Ticket[];
  properties: Property[];
  tenants: Tenant[];
  user: any;
  handleNavigate: (tab: any, highlightId?: string) => void;
}

import { toast } from "sonner";

export const TicketsView = ({ tickets, properties, tenants, user, handleNavigate }: TicketsViewProps) => {
  const [filterStatus, setFilterStatus] = useState<Ticket['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ticket Creation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [rawText, setRawText] = useState('');
  
  const [ticketForm, setTicketForm] = useState<Partial<Ticket>>({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    propertyId: '',
    tenantId: ''
  });

  const handleAiParse = async () => {
    if (!rawText.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parseTicketFromText(rawText, properties, tenants);
      if (parsed) {
        setTicketForm({
          ...ticketForm,
          title: parsed.title || '',
          description: parsed.description || '',
          category: parsed.category || 'other',
          priority: parsed.priority || 'medium',
          propertyId: parsed.suggestedPropertyId || '',
          tenantId: parsed.suggestedTenantId || ''
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao analisar a mensagem.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.title || !ticketForm.propertyId || !ticketForm.tenantId) {
      toast.error("Preencha título, imóvel e inquilino.");
      return;
    }
    try {
      const newTicket = {
        ...ticketForm,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaDays: ticketForm.priority === 'critical' ? 1 : ticketForm.priority === 'high' ? 3 : ticketForm.priority === 'medium' ? 7 : 15,
        ownerId: user?.uid
      };
      
      const docRef = await addDoc(collection(db, 'tickets'), newTicket);
      setIsModalOpen(false);
      setTicketForm({ title: '', description: '', category: 'other', priority: 'medium', propertyId: '', tenantId: '' });
      setRawText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tickets');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const prop = properties.find(p => p.id === t.propertyId);
    const tenant = tenants.find(te => te.id === t.tenantId);
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusLabel = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'cancelled': return 'Cancelado';
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chamados</h1>
          <p className="text-slate-500 mt-1">Gerencie manutenções e solicitações dos inquilinos com SLA.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm hover:shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" /> Novo Chamado
        </button>
      </header>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full border border-slate-200 bg-white rounded-2xl p-2 shadow-sm">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar chamado..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="w-full sm:w-auto px-3 py-2 bg-transparent text-sm outline-none border-t border-slate-100 sm:border-none"
        >
          <option value="all">Ver Todos</option>
          <option value="open">Abertos</option>
          <option value="in_progress">Em Andamento</option>
          <option value="resolved">Resolvidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredTickets.map(ticket => {
          const property = properties.find(p => p.id === ticket.propertyId);
          const tenant = tenants.find(t => t.id === ticket.tenantId);
          
          let slaStatus = null;
          if (ticket.status === 'open' || ticket.status === 'in_progress') {
            const created = parseISO(ticket.createdAt || new Date().toISOString());
            const slaDate = addDays(created, ticket.slaDays);
            const daysToSla = differenceInDays(slaDate, today);
            
            if (daysToSla < 0) {
              slaStatus = { text: `Estourado há ${Math.abs(daysToSla)} dia(s)!`, color: 'bg-rose-100 text-rose-700', icon: AlertTriangle };
            } else if (daysToSla <= 2) {
              slaStatus = { text: `Alerta! Expirando em ${daysToSla} dia(s)`, color: 'bg-amber-100 text-amber-700', icon: Clock };
            } else {
              slaStatus = { text: `SLA dentro do prazo (${daysToSla} d)`, color: 'bg-indigo-50 text-indigo-700', icon: CheckCircle2 };
            }
          }

          return (
            <div key={ticket.id} id={`ticket-${ticket.id}`} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row gap-5 shadow-sm hover:shadow-md transition">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", getStatusColor(ticket.status))}>
                    {getStatusLabel(ticket.status)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">#{ticket.id?.slice(0, 5).toUpperCase()}</span>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{ticket.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Criado em {format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}</div>
                  <div className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {tenant?.name || 'Inquilino Removido'}</div>
                </div>
              </div>

              <div className="sm:w-64 flex flex-col justify-between items-start sm:items-end gap-3 pt-3 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-5">
                <div className="w-full text-left sm:text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Imóvel</p>
                  <p className="text-sm font-semibold text-slate-700 line-clamp-1">{property?.name}</p>
                </div>

                {slaStatus && (
                  <div className={cn("px-3 py-2 w-full rounded-xl flex items-center justify-center sm:justify-end gap-2 text-xs font-bold", slaStatus.color)}>
                    <slaStatus.icon className="w-4 h-4" />
                    {slaStatus.text}
                  </div>
                )}
                
                {(!slaStatus && ticket.status === 'resolved') && (
                  <div className="px-3 py-2 w-full rounded-xl flex items-center justify-center sm:justify-end gap-2 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    Solucionado
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredTickets.length === 0 && (
          <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Nenhum chamado encontrado.</p>
          </div>
        )}
      </div>

      {/* Ticket Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Novo Chamado
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Parser Input */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-indigo-900 text-sm">Preenchimento Inteligente (IA)</h3>
                </div>
                <p className="text-xs text-indigo-700">Cole a mensagem enviada pelo inquilino (ex: WhatsApp) e a IA preencherá o chamado automaticamente.</p>
                <div className="flex gap-2">
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Cole a mensagem aqui..."
                    className="flex-1 min-h-[60px] p-3 text-sm rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-y bg-white"
                  />
                </div>
                <button
                  onClick={handleAiParse}
                  disabled={isAiLoading || !rawText.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Analisar e Preencher
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Título do Chamado</label>
                  <input
                    type="text"
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                    placeholder="Ex: Torneira vazando"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Descrição</label>
                  <textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                    placeholder="Detalhes do problema..."
                    className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold mb-1.5 block">Categoria</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({...ticketForm, category: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="plumbing">Hidráulica</option>
                      <option value="electrical">Elétrica</option>
                      <option value="structural">Estrutural</option>
                      <option value="appliance">Eletrodomésticos</option>
                      <option value="keys">Chaves/Fechaduras</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1.5 block">Prioridade</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold mb-1.5 flex justify-between items-center">
                      Imóvel Relacionado
                      {(() => {
                        const prop = properties.find(p => p.id === ticketForm.propertyId);
                        if (!prop) return null;
                        if (prop.status === 'vacant') return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Aberto/Livre</span>;
                        if (prop.status === 'renovation') return <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Em Reforma</span>;
                        return null;
                      })()}
                    </label>
                    <select
                      value={ticketForm.propertyId}
                      onChange={(e) => {
                        const newPropId = e.target.value;
                        let newTenantId = ticketForm.tenantId;
                        if (newPropId) {
                          const activeTenant = tenants.find(t => t.propertyId === newPropId && t.status === 'allocated');
                          if (activeTenant) newTenantId = activeTenant.id;
                          else newTenantId = '';
                        }
                        setTicketForm({...ticketForm, propertyId: newPropId, tenantId: newTenantId});
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="">Selecione...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1.5 block">Inquilino</label>
                    <select
                      value={ticketForm.tenantId}
                      onChange={(e) => {
                        const newTenantId = e.target.value;
                        let newPropId = ticketForm.propertyId;
                        if (newTenantId) {
                          const tenant = tenants.find(t => t.id === newTenantId);
                          if (tenant && tenant.propertyId) newPropId = tenant.propertyId;
                        }
                        setTicketForm({...ticketForm, tenantId: newTenantId, propertyId: newPropId});
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="">Selecione...</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                
                {ticketForm.priority && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100 mt-4">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    <p className="text-sm text-emerald-800">
                      <strong>Prazo de Resolução (SLA):</strong> Previsto para ser resolvido em até <strong>
                      {ticketForm.priority === 'critical' ? 1 : ticketForm.priority === 'high' ? 3 : ticketForm.priority === 'medium' ? 7 : 15} dias
                      </strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTicket}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition"
              >
                Criar Chamado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
