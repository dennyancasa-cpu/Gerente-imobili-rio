const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update LOCADOR
let locadorPattern = /<strong className="shrink-0">Nome:<\/strong>\s*<input type="text" className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" \/>/g;
code = code.replace(
  locadorPattern,
  `<strong className="shrink-0">Nome:</strong>\n                           <input type="text" defaultValue={auth.currentUser?.displayName || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />`
);

// 2. Hide PAGAMENTO PARCIAL unless it's actual partial
let partialPattern = /<div className="space-y-4 bg-orange-50\/50 p-4 rounded-xl border border-orange-100 print:bg-transparent print:border-none print:p-0 mb-4 mt-4">([\s\S]*?)<\/div>\s*<div className="space-y-4">\s*<p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">FORMA DE PAGAMENTO<\/p>/g;

code = code.replace(
  partialPattern,
  `{(receiptModalPayment.status === 'partial' || (receiptModalPayment.paidAmount && receiptModalPayment.paidAmount < receiptModalPayment.amount)) && (
                     <div className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 print:bg-transparent print:border-none print:p-0 mb-4 mt-4">$1</div>
                     )}

                     <div className="space-y-4">
                       <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">FORMA DE PAGAMENTO</p>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Done!');
