const fs = require('fs');
let code = fs.readFileSync('src/components/ContractsView.tsx', 'utf8');

const modalCode = `
      {isRenewArchiveModalOpen && targetContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden">
            <div className={\`p-6 flex items-center gap-4 \${renewArchiveMode === 'renew' ? 'bg-emerald-600' : 'bg-slate-800'}\`}>
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                {renewArchiveMode === 'renew' ? <RotateCcw className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold tracking-tight">
                  {renewArchiveMode === 'renew' ? 'Renovar / Ajustar' : 'Arquivar Contrato'}
                </h2>
                <p className="text-sm opacity-90">
                  {getTenantName(targetContract.tenantId)}
                </p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {renewArchiveMode === 'renew' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nova Data de Término</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    value={raEndDate}
                    onChange={(e) => setRaEndDate(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    O contrato voltará para o status "Ativo". Deixe em branco se for indeterminado.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Observações sobre o Acordo</label>
                <textarea
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  rows={4}
                  placeholder={renewArchiveMode === 'renew' ? "Ex: Renovou por mais 12 meses com aluguel ajustado..." : "Ex: Contrato encerrado, chaves entregues..."}
                  value={raObservations}
                  onChange={(e) => setRaObservations(e.target.value)}
                ></textarea>
                <p className="text-xs text-slate-500">
                  Importante para lembrar o que foi combinado com o inquilino.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setIsRenewArchiveModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleRenewArchiveSubmit}
                disabled={isSubmitting}
                className={\`px-6 py-2.5 rounded-xl font-bold text-white shadow-sm transition flex justify-center items-center gap-2 \${
                  renewArchiveMode === 'renew' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
                }\`}
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

const targetRegex = /    <\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\);\s*\}/;
const replacement = `                   </div>
                </div>
            </div>
         </div>
      )}
${modalCode}
    </div>
  );
}`;

if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/ContractsView.tsx', code);
    console.log("Success");
} else {
    console.log("Target not found via regex");
}
