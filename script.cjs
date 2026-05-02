const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// STATUS
code = code.replace(
  '                            <input type="text" defaultValue={tenant?.cpf || \'\'} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />\n                          </div>\n                        </div>\n                      </div>\n\n                      <div className="space-y-2 bg-slate-50',
  `                            <input type="text" defaultValue={tenant?.cpf || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                          <div className="flex items-center gap-2">
                            <strong className="shrink-0">Status:</strong>
                            <input type="text" defaultValue={tenant?.status === 'waiting' ? 'Em Espera' : tenant?.status === 'allocated' ? 'Locado' : tenant?.status === 'archived' ? 'Arquivado' : ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-50`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
