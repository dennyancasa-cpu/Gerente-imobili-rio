const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let completeReceiptPattern = /<div className="text-center space-y-1 mb-8">\s*<h2 className="text-xl font-black uppercase text-slate-900">RECIBO DE PAGAMENTO DE ALUGUEL<\/h2>/g;

code = code.replace(
  completeReceiptPattern,
  `<div className="text-center space-y-1 mb-8 border-b pb-6 print:pb-4">
                       <LogoSVG className="w-16 h-16 mx-auto mb-4 print:hidden" />
                       <h2 className="text-xl font-black uppercase text-slate-900">RECIBO DE PAGAMENTO DE ALUGUEL</h2>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Update logo and visual consistency done');
