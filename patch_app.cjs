const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `      for (const contract of activeContracts) {
        if (contract.id) {
          batch.update(doc(db, "contracts", contract.id), {
            status: "ended",
            endDate: format(new Date(), "yyyy-MM-dd"),
            updatedAt: new Date().toISOString(),
          });
        }
      }`;

const replacement1 = `      for (const contract of activeContracts) {
        if (contract.id) {
          batch.update(doc(db, "contracts", contract.id), {
            status: action === "delete" || action === "archived" ? "archived" : "ended",
            endDate: format(new Date(), "yyyy-MM-dd"),
            updatedAt: new Date().toISOString(),
          });
        }
      }`;

code = code.replace(target1, replacement1);
fs.writeFileSync('src/App.tsx', code);
