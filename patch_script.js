const fs = require('fs');
let code = fs.readFileSync('src/components/ContractsView.tsx', 'utf8');

const target = `                 )}
              </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">`;

const replacement = `                 )}
                 {contract.status === 'active' && (
                    <div className={\`flex gap-2 mt-4 pt-4 border-t \${isExpired ? 'border-rose-100' : 'border-slate-100'}\`}>
                       <button onClick={() => handleOpenRenewArchive(contract, 'renew')} className={\`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 \${isExpired ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'}\`}>
                          <RotateCcw className="w-3.5 h-3.5" /> Renovar
                       </button>
                       <button onClick={() => handleOpenRenewArchive(contract, 'archive')} className={\`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 \${isExpired ? 'bg-white border border-rose-200 hover:bg-rose-50 text-rose-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}\`}>
                          <Archive className="w-3.5 h-3.5" /> Arquivar
                       </button>
                    </div>
                 )}
              </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ContractsView.tsx', code);
