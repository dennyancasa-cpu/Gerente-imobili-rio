const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. LOCATÁRIO Status
code = code.replace(
  /<div className="flex items-center gap-2">\s*<strong className="shrink-0">CPF\/CNPJ:<\/strong>\s*<input type="text" defaultValue=\{tenant\?\.cpf \|\| ''\} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" \/>\s*<\/div>\s*<\/div>/g,
  `<div className="flex items-center gap-2">
                            <strong className="shrink-0">CPF/CNPJ:</strong>
                            <input type="text" defaultValue={tenant?.cpf || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <strong className="shrink-0">Status Atual:</strong>
                            <input type="text" defaultValue={tenant?.status === 'waiting' ? 'Em Espera' : tenant?.status === 'allocated' ? 'Locado' : tenant?.status === 'archived' ? 'Arquivado' : ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                        </div>`
);

// 2. AMOUNT in DECLARAÇÃO
code = code.replace(
  /<p className="text-lg font-bold shrink-0">R\$ \{receiptModalPayment\.amount\.toLocaleString\(\)\}<\/p>/g,
  `<p className="text-lg font-bold shrink-0 flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.paidAmount || receiptModalPayment.amount).toLocaleString()} className="w-24 bg-transparent text-lg font-bold border-b border-slate-300 outline-none focus:border-emerald-500 print:border-none print:p-0" /></p>`
);

// 3. Valor Total Pago
code = code.replace(
  /<span>Valor Total Pago:<\/span>\s*<span className="flex items-center gap-1">R\$ <input type="text" defaultValue=\{receiptModalPayment\.amount\.toLocaleString\(\)\} className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" \/><\/span>/g,
  `<span>Valor Total Pago:</span> 
                            <span className="flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.paidAmount || receiptModalPayment.amount).toLocaleString()} className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>`
);

// 4. PAGAMENTO PARCIAL
code = code.replace(
  /<div className="space-y-4">\s*<p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">FORMA DE PAGAMENTO<\/p>/g,
  `<div className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 print:bg-transparent print:border-none print:p-0 mb-4 mt-4">
                        <p className="font-bold border-b border-orange-200 print:border-slate-300 pb-2 uppercase text-orange-800 print:text-slate-500 text-xs tracking-widest">PAGAMENTO PARCIAL / RESTANTE (PREENCHA SE APLICÁVEL)</p>
                        <ul className="space-y-3">
                          <li className="flex gap-2 justify-between items-center text-orange-900 print:text-slate-900 font-medium pt-1">
                            <span>Faltante a receber:</span> 
                            <span className="flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.status === 'partial' || (receiptModalPayment.paidAmount && receiptModalPayment.paidAmount < receiptModalPayment.amount) ? receiptModalPayment.amount - (receiptModalPayment.paidAmount || 0) : 0).toLocaleString()} className="w-24 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0" /></span>
                          </li>
                          <li className="flex flex-col gap-1">
                            <span className="text-orange-900 print:text-slate-900 font-medium">Motivo declarado (Inquilino):</span> 
                            <input type="text" placeholder="Ex: Atraso no salário, problemas médicos, etc." className="w-full bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 placeholder:text-orange-300/70 py-1" />
                          </li>
                          <li className="flex gap-2 justify-between items-center pt-2">
                            <span className="text-orange-900 print:text-slate-900 font-medium">Cobrança da próxima / Prazo:</span> 
                            <input type="text" placeholder="DD/MM/AAAA" className="w-32 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 py-1" />
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">FORMA DE PAGAMENTO</p>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
