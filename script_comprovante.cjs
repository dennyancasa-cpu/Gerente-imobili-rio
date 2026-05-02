const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let comprovantePattern = /<strong className="shrink-0">Comprovante \(opcional\):<\/strong>\s*<input type="text" className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" \/>/g;

code = code.replace(
  comprovantePattern,
  `<strong className="shrink-0">Comprovante (opcional):</strong>
                           <input type="text" defaultValue={receiptModalPayment.evidenceName || receiptModalPayment.evidenceLocation || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Update comprovante done');
