import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ListPlus,
  Edit,
  Building2,
  X,
  FileText,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTaskLists,
  getTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  createTaskList,
  GoogleTaskList,
  GoogleTaskItem
} from '../services/tasksService';
import { Payment, Property, Tenant, Ticket } from '../types';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

interface GoogleTasksViewProps {
  payments?: Payment[];
  properties?: Property[];
  tenants?: Tenant[];
  tickets?: Ticket[];
}

export const GoogleTasksView: React.FC<GoogleTasksViewProps> = ({
  payments = [],
  properties = [],
  tenants = [],
  tickets = []
}) => {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New task form modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New task list modal state
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [newListTitle, setNewListTitle] = useState<string>('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<GoogleTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDue, setEditDue] = useState<string>('');

  // Delete confirmation modal state (MANDATORY for user data mutation/deletion)
  const [deletingTask, setDeletingTask] = useState<GoogleTaskItem | null>(null);

  // Import / Sync Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);

  // Load Task Lists & Tasks
  const loadListsAndTasks = async (listId?: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const lists = await getTaskLists();
      setTaskLists(lists);
      const activeId = listId || (lists.length > 0 ? lists[0].id : '@default');
      setSelectedListId(activeId);
      
      const items = await getTasks(activeId);
      setTasks(items);
    } catch (err: any) {
      console.error('Error loading Google Tasks:', err);
      setAuthError(err.message || 'Falta autenticação com o Google.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadListsAndTasks();
  }, []);

  const handleSwitchList = async (listId: string) => {
    setSelectedListId(listId);
    setLoading(true);
    try {
      const items = await getTasks(listId);
      setTasks(items);
    } catch (err: any) {
      toast.error('Erro ao carregar tarefas da lista.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadListsAndTasks(selectedListId);
  };

  const handleConnectGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        const tokens = { access_token: credential.accessToken };
        localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));
        
        await fetch('/api/auth/google/save-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, uid: result.user.uid })
        }).catch(() => {});

        toast.success('Conectado ao Google Tasks com sucesso!');
        loadListsAndTasks();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao conectar com o Google: ' + err.message);
    }
  };

  const handleToggleTaskStatus = async (task: GoogleTaskItem) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await updateGoogleTask(selectedListId, task.id, { status: newStatus });
      toast.success(newStatus === 'completed' ? 'Tarefa concluída no Google Tasks!' : 'Tarefa reaberta no Google Tasks!');
    } catch (err: any) {
      // Rollback
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      toast.error('Erro ao atualizar tarefa: ' + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error('O título da tarefa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createGoogleTask(selectedListId, {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
        due: newTaskDue || undefined
      });
      setTasks(prev => [created, ...prev]);
      toast.success('Nova tarefa adicionada ao Google Tasks!');
      setIsCreateModalOpen(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
    } catch (err: any) {
      toast.error('Erro ao criar tarefa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const createdList = await createTaskList(newListTitle.trim());
      setTaskLists(prev => [...prev, createdList]);
      setSelectedListId(createdList.id);
      setTasks([]);
      toast.success(`Lista "${createdList.title}" criada com sucesso!`);
      setIsListModalOpen(false);
      setNewListTitle('');
    } catch (err: any) {
      toast.error('Erro ao criar lista: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (task: GoogleTaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditDue(task.due ? new Date(task.due).toISOString().split('T')[0] : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await updateGoogleTask(selectedListId, editingTask.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        due: editDue ? new Date(editDue).toISOString() : undefined,
      });

      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
      toast.success('Tarefa atualizada no Google Tasks!');
      setEditingTask(null);
    } catch (err: any) {
      toast.error('Erro ao salvar tarefa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // MANDATORY USER CONFIRMATION DIALOG FOR DELETION
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask.id;
    setIsSubmitting(true);
    try {
      await deleteGoogleTask(selectedListId, targetId);
      setTasks(prev => prev.filter(t => t.id !== targetId));
      toast.success('Tarefa excluída permanentemente do Google Tasks.');
      setDeletingTask(null);
    } catch (err: any) {
      toast.error('Erro ao excluir tarefa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import pending payments and tickets into Google Tasks
  const handleImportSystemItems = async () => {
    setImporting(true);
    let count = 0;
    try {
      // 1. Pending Payments
      const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late');
      for (const p of pendingPayments) {
        const tenant = tenants.find(t => t.id === p.tenantId);
        const prop = properties.find(pr => pr.id === p.propertyId);
        const title = `Cobrança: ${tenant?.name || 'Inquilino'} - ${prop?.name || 'Imóvel'}`;
        const notes = `Valor: R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nVencimento: ${p.dueDate}\nStatus: ${p.status === 'late' ? 'ATRASADO' : 'Pendente'}`;

        await createGoogleTask(selectedListId, {
          title,
          notes,
          due: p.dueDate
        });
        count++;
      }

      // 2. Open Maintenance Tickets
      const openTickets = tickets.filter(tk => tk.status !== 'resolved' && tk.status !== 'cancelled');
      for (const tk of openTickets) {
        const prop = properties.find(pr => pr.id === tk.propertyId);
        const title = `Manutenção: ${tk.title} (${prop?.name || 'Imóvel'})`;
        const notes = `Prioridade: ${tk.priority?.toUpperCase()}\nDescrição: ${tk.description || 'Sem detalhes'}`;

        await createGoogleTask(selectedListId, {
          title,
          notes
        });
        count++;
      }

      toast.success(`${count} tarefas importadas com sucesso para o Google Tasks!`);
      setIsImportModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'pending') return matchesSearch && t.status === 'needsAction';
    if (statusFilter === 'completed') return matchesSearch && t.status === 'completed';
    return matchesSearch;
  });

  const pendingCount = tasks.filter(t => t.status === 'needsAction').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <CheckSquare className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Integração Oficial Google
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Google Tasks • Minhas Tarefas
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
              Sincronize cobranças, tarefas de imóveis e manutenções diretamente com a sua conta Google Tasks para acompanhar tudo pelo celular ou navegador.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl transition border border-slate-700 flex items-center justify-center"
              title="Atualizar lista de tarefas"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {authError ? (
              <button
                onClick={handleConnectGoogle}
                className="gsi-material-button text-xs"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Conectar Google Tasks</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Building2 className="w-4 h-4" />
                  Importar do Sistema
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Nova Tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Alert state if error exists */}
      {authError && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Autenticação com Google necessária</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Para visualizar e gerenciar suas listas do Google Tasks, conecte sua conta Google com as permissões ativadas.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0"
          >
            Conectar Agora
          </button>
        </div>
      )}

      {/* Main Task Lists Container */}
      {!authError && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Lists Tabs & Toolbar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Lists Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {taskLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleSwitchList(list.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition shrink-0 flex items-center gap-2 ${
                      selectedListId === list.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {list.title}
                  </button>
                ))}

                <button
                  onClick={() => setIsListModalOpen(true)}
                  className="px-3 py-2 rounded-2xl text-xs font-bold bg-slate-200/60 hover:bg-slate-200 text-slate-700 transition shrink-0 flex items-center gap-1.5 border border-slate-300/60"
                  title="Criar nova lista de tarefas"
                >
                  <ListPlus className="w-4 h-4 text-emerald-600" />
                  Nova Lista
                </button>
              </div>

              {/* Filters & Status Badge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl font-bold font-mono">
                  {pendingCount} pendente(s)
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200/80 rounded-xl font-bold font-mono">
                  {completedCount} concluída(s)
                </span>
              </div>
            </div>

            {/* Search & Status Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar tarefas pelo nome ou detalhes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-xl w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none ${
                    statusFilter === 'pending' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none ${
                    statusFilter === 'completed' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Concluídas
                </button>
              </div>
            </div>
          </div>

          {/* Task List Items */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">Carregando tarefas do Google Tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Nenhuma tarefa encontrada</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Nenhum resultado corresponde aos filtros selecionados.'
                    : 'Você não tem nenhuma tarefa registrada nesta lista do Google Tasks.'}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeira Tarefa
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {filteredTasks.map(task => {
                  const isCompleted = task.status === 'completed';
                  const hasDue = !!task.due;
                  const dueDateFormatted = hasDue ? new Date(task.due!).toLocaleDateString('pt-BR') : null;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 flex items-start justify-between gap-3 transition group hover:bg-slate-50/80 ${
                        isCompleted ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 transition shrink-0 focus:outline-none"
                          title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-bold leading-snug break-words ${
                                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {task.notes && (
                            <p className={`text-xs whitespace-pre-line leading-relaxed ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                              {task.notes}
                            </p>
                          )}

                          {dueDateFormatted && (
                            <div className="flex items-center gap-1 pt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                                isCompleted 
                                  ? 'bg-slate-100 text-slate-500 border-slate-200' 
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                Vencimento: {dueDateFormatted}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Editar Tarefa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTask(task)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir Tarefa do Google Tasks"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black">Nova Tarefa no Google Tasks</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cobrar aluguel do imóvel Apto 101"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Vencimento (Opcional)</label>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Anotações e Detalhes (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Enviar comprovante de cobrança e verificar se IPTU foi quitado."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Adicionando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black">Editar Tarefa</h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Anotações e Detalhes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK LIST MODAL */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ListPlus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black">Nova Lista no Google Tasks</h3>
              </div>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Lista *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gestão Imobiliária / Manutenções"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETION CONFIRMATION MODAL (MANDATORY per Workspace Integration Skill) */}
      {deletingTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-red-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Excluir tarefa do Google Tasks?</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão permanente</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              Você está prestes a remover permanentemente a tarefa <strong className="text-slate-900">"{deletingTask.title}"</strong> da sua conta Google Tasks. Esta ação não poderá ser desfeita.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingTask(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT / SYNC MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black">Sincronizar Dados do Sistema</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Exporte automaticamente pendências do seu Gerente Imobiliário para a lista selecionada do Google Tasks:
            </p>

            <div className="space-y-3 mb-6 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">Cobranças Pendentes</span>
                </div>
                <span className="font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  {payments.filter(p => p.status === 'pending' || p.status === 'late').length} item(ns)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-800">Chamados de Manutenção</span>
                </div>
                <span className="font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                  {tickets.filter(tk => tk.status !== 'resolved' && tk.status !== 'cancelled').length} item(ns)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportSystemItems}
                disabled={importing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {importing ? 'Sincronizando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
