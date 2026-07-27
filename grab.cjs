const fs = require('fs');
let code = fs.readFileSync('src/components/ContractsView.tsx', 'utf8');
let idx = code.indexOf('isExpired ? "text-rose-600 font-bold" : "text-slate-700"');
console.log(code.substring(idx, idx + 400));
