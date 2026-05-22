import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  FileSpreadsheet, 
  Archive, 
  CheckCircle2, 
  DatabaseBackup,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Upload,
  Info,
  Clock,
  ArrowRight,
  FilePlus2,
  Bot
} from 'lucide-react';
import { StagingRecord } from '../types';
import { parseMultipleRecordsFromText } from '../services/geminiService';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm", className)}>
    {children}
  </div>
);

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive', size?: 'default' | 'sm' | 'lg' }>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        {
          'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm': variant === 'default',
          'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700': variant === 'outline',
          'hover:bg-slate-100 text-slate-700': variant === 'ghost',
          'bg-red-500 text-white hover:bg-red-600 shadow-sm': variant === 'destructive',
          'h-11 px-6 text-sm': size === 'default',
          'h-9 px-4 text-xs': size === 'sm',
          'h-14 px-8 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export const ImportDataView = ({ 
  stagingRecords, 
  onSaveStagingRecord, 
  onDeleteStagingRecord,
  onActivateStagingRecord
}: { 
  stagingRecords: StagingRecord[],
  onSaveStagingRecord: (data: Partial<StagingRecord>) => Promise<void>,
  onDeleteStagingRecord: (id: string) => Promise<void>,
  onActivateStagingRecord: (record: StagingRecord) => Promise<void>
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'archive'>('upload');
  const [pasteData, setPasteData] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);
  const [sourceName, setSourceName] = useState('Planilha Antiga - ' + format(new Date(), 'dd/MM/yyyy'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    if (!pasteData.trim()) return;
    try {
      const rows = pasteData.split('\n').filter(r => r.trim());
      const parsed = rows.map(row => row.split('\t'));
      setParsedPreview(parsed);
    } catch (e) {
      console.error(e);
      alert('Erro ao processar dados. Verifique o formato.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name) {
       setSourceName(file.name);
    }

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && Array.isArray(results.data) && results.data.length > 0) {
           setParsedPreview(results.data as any[]);
           // Create a RAW TSV representation for storage so it matches the other format and is easily readable
           const raw = results.data.map((row: any) => row.join('\t')).join('\n');
           setPasteData(raw);
        } else {
           alert('Nenhum dado encontrado no arquivo.');
        }
      },
      error: (error) => {
        console.error(error);
        alert('Erro ao ler arquivo CSV.');
      }
    });
  };

  const handleAiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name) {
       setSourceName("Leitura IA: " + file.name);
    }

    setIsAiLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const base64Str = event.target?.result as string;
        const result = await parseMultipleRecordsFromText("O usuário anexou um arquivo para leitura.", base64Str, file.type);
        
        if (result && result.records && Array.isArray(result.records)) {
          toast.success(result.summary?.message || "Leitura com IA concluída com sucesso!");
          
          // Convert JSON records to 2D array for preview and storage
          const headers = ["Inquilino", "Imóvel", "Valor (R$)", "Endereço", "Data de Entrada", "Pagamentos", "Gastos"];
          const tableData = [headers];
          
          result.records.forEach((r: any) => {
            tableData.push([
              r.tenant?.name || "-",
              r.property?.name || "-",
              r.property?.rentValue || "-",
              r.property?.address || "-",
              r.tenant?.occupancyDate || "-",
              r.tenant?.paymentsInfo || "-",
              r.property?.expenses || "-"
            ]);
          });
          
          setParsedPreview(tableData);
          setPasteData(JSON.stringify(result.records, null, 2));
        } else {
          toast.error("O assistente não conseguiu identificar informações de imóveis neste arquivo.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Processamento com inteligência artificial falhou. Verifique se o arquivo é válido.");
      } finally {
        setIsAiLoading(false);
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToArchive = async () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSaveStagingRecord({
        rawData: pasteData,
        parsedData: JSON.stringify(parsedPreview),
        originalSource: sourceName,
        status: 'pending',
        dataType: 'other' // Configurable later
      });
      setPasteData('');
      setParsedPreview(null);
      setSourceName('Planilha Antiga - ' + format(new Date(), 'dd/MM/yyyy'));
      setActiveTab('archive');
    } catch (error) {
       console.error("Save failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredArchive = useMemo(() => {
    return stagingRecords.filter(r => {
       const searchVal = searchTerm.toLowerCase();
       if (r.originalSource.toLowerCase().includes(searchVal)) return true;
       if (!r.parsedData) return false;
       const dataStr = typeof r.parsedData === 'string' ? r.parsedData : JSON.stringify(r.parsedData);
       return dataStr.toLowerCase().includes(searchVal);
    });
  }, [stagingRecords, searchTerm]);

  return (
    <div className="space-y-6">
       <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
             <DatabaseBackup className="w-8 h-8 text-indigo-500" />
             Arquivo Morto & Importação (Beta)
          </h1>
          <p className="text-muted-foreground mt-1">Cole planilhas antigas do Excel ou AppSheet para consultar ou importar com segurança para o app principal sem causar conflitos.</p>
       </header>

       <div className="flex bg-slate-100/50 p-1 rounded-2xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
               "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
               activeTab === 'upload' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Upload className="w-4 h-4" /> Nova Importação
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={cn(
               "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
               activeTab === 'archive' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Archive className="w-4 h-4" /> Arquivo Morto
            {stagingRecords.length > 0 && (
              <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] ml-1">
                {stagingRecords.length}
              </span>
            )}
          </button>
       </div>

       <AnimatePresence mode="wait">
         {activeTab === 'upload' ? (
           <motion.div
             key="upload"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="grid grid-cols-1 lg:grid-cols-3 gap-6"
           >
              <div className="lg:col-span-1 space-y-6">
                 <Card className="p-6">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                      Instruções
                    </h3>
                    <div className="space-y-4 text-sm text-slate-600">
                       <p>1. Abra sua planilha no <strong>Excel</strong> ou <strong>Google Sheets</strong>.</p>
                       <p>2. Selecione a tabela que deseja trazer para o sistema e copie (Ctrl+C).</p>
                       <p>3. Cole no campo ao lado.</p>
                       <p>4. Os dados ficarão salvos no <em>Arquivo Morto</em> e não afetarão seus inquilinos e rendimentos atuais.</p>
                       <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs flex gap-2">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>
                            Isso é ideal para históricos antigos ou inquilinos que já saíram do imóvel. 
                            Você poderá visualizar esses dados a qualquer momento ou migrá-los no futuro.
                          </p>
                       </div>
                    </div>
                 </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                 <Card className="p-6">
                    <div className="space-y-4">
                       <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1.5">Nome do Caderno / Origem</label>
                          <input 
                            type="text"
                            value={sourceName}
                            onChange={(e) => setSourceName(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                            placeholder="Ex: Planilha Antiga 2023"
                          />
                       </div>

                       {!parsedPreview ? (
                         <div>
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                <label className="text-sm font-bold text-slate-700">Cole seus dados ou importe um arquivo</label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="file" 
                                    accept=".csv,.txt"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                  />
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    ref={aiFileInputRef}
                                    onChange={handleAiFileUpload}
                                  />
                                  <Button type="button" variant="outline" size="sm" onClick={() => aiFileInputRef.current?.click()} disabled={isAiLoading} className="h-8 text-xs font-bold border-indigo-500 text-white bg-indigo-500 hover:bg-indigo-600 shadow-sm relative overflow-hidden">
                                     <Bot className={cn("w-3.5 h-3.5 mr-1.5", isAiLoading && "animate-bounce")} />
                                     {isAiLoading ? 'Analisando...' : 'Ler com IA (PDF/Imagem)'}
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs font-bold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100">
                                     <FilePlus2 className="w-3.5 h-3.5 mr-1.5" />
                                     Importar CSV
                                  </Button>
                                </div>
                            </div>
                            <textarea 
                              value={pasteData}
                              onChange={(e) => setPasteData(e.target.value)}
                              placeholder="Cole aqui (Ctrl+V) os dados do Excel..."
                              disabled={isAiLoading}
                              className={cn("w-full h-64 p-4 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono whitespace-pre", isAiLoading ? "bg-slate-100 border-slate-200 opacity-50" : "bg-slate-50 border-slate-200")}
                            />
                            <div className="flex justify-end mt-4 gap-3">
                               <Button onClick={handleParse} disabled={!pasteData.trim() || isAiLoading}>
                                  Processar Tabela
                               </Button>
                            </div>
                         </div>
                       ) : (
                         <div>
                            <div className="flex items-center justify-between mb-4">
                               <label className="text-sm font-bold text-slate-700">Visualização (Preview)</label>
                               <Button variant="ghost" size="sm" onClick={() => setParsedPreview(null)}>
                                  Limpar e Colar Novamente
                               </Button>
                            </div>
                            
                            <div className="w-full overflow-x-auto rounded-xl border border-slate-200 mb-6 bg-slate-50">
                               <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                     {parsedPreview[0] && (
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                          {parsedPreview[0].map((col: string, i: number) => (
                                             <th key={i} className="px-3 py-2 font-bold text-slate-600 min-w-[120px] max-w-[200px] truncate">{col}</th>
                                          ))}
                                        </tr>
                                     )}
                                  </thead>
                                  <tbody>
                                     {parsedPreview.slice(1, 11).map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50">
                                          {row.map((cell: string, cIdx: number) => (
                                             <td key={cIdx} className="px-3 py-2 text-slate-700 max-w-[200px] truncate font-mono text-[10px]" title={cell}>{cell}</td>
                                          ))}
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                               {parsedPreview.length > 11 && (
                                  <div className="p-3 text-center text-xs text-slate-500 bg-white border-t border-slate-100">
                                     E mais {parsedPreview.length - 11} linhas...
                                  </div>
                               )}
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                               <p className="text-sm font-medium text-indigo-900 mr-auto">
                                 Tabela pronta! Os dados serão salvos no Arquivo Morto de forma segura.
                               </p>
                               <Button 
                                 onClick={handleSaveToArchive} 
                                 disabled={isSubmitting}
                               >
                                 {isSubmitting ? 'Salvando...' : 'Guardar no Arquivo Morto'}
                               </Button>
                            </div>
                         </div>
                       )}
                    </div>
                 </Card>
              </div>
           </motion.div>
         ) : (
           <motion.div
             key="archive"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
              <div className="flex items-center gap-4 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar no arquivo morto..." 
                  className="w-full md:w-96 h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800 shadow-sm"
                />
              </div>

              {filteredArchive.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <DatabaseBackup className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-600 mb-1">Nenhum registro encontrado no Arquivo Morto.</h3>
                    <p className="text-sm text-slate-400">Comece importando suas planilhas antigas na aba Nova Importação.</p>
                 </div>
              ) : (
                 <div className="grid gap-4">
                    {filteredArchive.map(record => {
                       const isExpanded = expandedRecord === record.id;
                       let tableData = record.parsedData || [];
                       if (typeof record.parsedData === 'string') {
                           try { tableData = JSON.parse(record.parsedData); } catch (e) { tableData = []; }
                       }

                       return (
                         <Card key={record.id} className="overflow-hidden transition-all duration-300">
                            <div 
                              onClick={() => setExpandedRecord(isExpanded ? null : (record.id as string))}
                              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                               <div className="flex items-center gap-4">
                                  <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
                                     <Archive className="w-5 h-5" />
                                  </div>
                                  <div>
                                     <h3 className="font-bold text-slate-800">{record.originalSource}</h3>
                                     <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                       <Clock className="w-3 h-3" />
                                       Importado em: {record.createdAt ? format(new Date(record.createdAt?.seconds ? record.createdAt.seconds * 1000 : record.createdAt), 'dd/MM/yyyy HH:mm') : 'Desconhecido'}
                                       <span className="mx-2 font-bold px-2 py-0.5 bg-slate-100 rounded-full">{tableData.length - 1 > 0 ? tableData.length - 1 : 0} Registros</span>
                                     </p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                               </div>
                            </div>
                            
                            <AnimatePresence>
                               {isExpanded && (
                                 <motion.div 
                                   initial={{ height: 0 }}
                                   animate={{ height: 'auto' }}
                                   exit={{ height: 0 }}
                                   className="overflow-hidden border-t border-slate-100 bg-slate-50"
                                 >
                                    <div className="p-6 space-y-6">
                                       <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                          <table className="w-full text-left border-collapse text-xs">
                                             {tableData.length > 0 && (
                                               <thead>
                                                  <tr className="bg-slate-100 border-b border-slate-200">
                                                    <th className="px-3 py-2 w-10 text-center text-slate-400 font-bold sticky left-0 bg-slate-100">#</th>
                                                    {tableData[0]?.map((col: string, i: number) => (
                                                       <th key={i} className="px-3 py-2 font-bold text-slate-600 min-w-[120px] max-w-[200px] truncate">{col}</th>
                                                    ))}
                                                  </tr>
                                               </thead>
                                             )}
                                             <tbody>
                                                {tableData.slice(1, 100).map((row: any, rIdx: number) => (
                                                   <tr key={rIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                     <td className="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/50 sticky left-0">{rIdx + 1}</td>
                                                     {row.map((cell: string, cIdx: number) => (
                                                        <td key={cIdx} className="px-3 py-2 text-slate-700 max-w-[200px] truncate font-mono text-[10px]" title={cell}>{cell}</td>
                                                     ))}
                                                   </tr>
                                                ))}
                                             </tbody>
                                          </table>
                                          {tableData.length > 100 && (
                                            <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100 font-medium tracking-wide sticky left-0">
                                               Muitos dados... mostrando apenas os 100 primeiros registros nesta visualização.
                                            </div>
                                          )}
                                       </div>

                                       <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
                                          <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={async (e) => {
                                             e.stopPropagation();
                                             if(confirm('Tem certeza que deseja apagar este arquivo morto? Esta ação não pode ser desfeita.')) {
                                                await onDeleteStagingRecord(record.id as string);
                                             }
                                          }}>
                                             <Trash2 className="w-4 h-4 mr-2" />
                                             Excluir Registro
                                          </Button>
                                          {record.status !== 'imported' ? (
                                              <Button 
                                                 className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-9 px-6 rounded-lg shadow-sm border border-indigo-700 transition-all hover:shadow" 
                                                 disabled={isSubmitting}
                                                 onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await onActivateStagingRecord(record);
                                              }}>
                                                 {isSubmitting ? 'Ativando...' : 'Ativar no Sistema'}
                                              </Button>
                                          ) : (
                                              <span className="text-sm font-bold text-green-600 bg-green-50 px-4 py-1.5 rounded-full border border-green-200">
                                                ✓ Ativado no Sistema
                                              </span>
                                          )}
                                       </div>
                                    </div>
                                 </motion.div>
                               )}
                            </AnimatePresence>
                         </Card>
                       );
                    })}
                 </div>
              )}
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

