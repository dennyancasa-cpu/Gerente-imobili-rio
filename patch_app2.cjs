const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target2 = `        // Tenant was allocated but now is not, update property to vacant
        await updateDoc(
          doc(db, "properties", oldTenant.propertyId),
          cleanObject({
            status: "vacant",
            currentTenantId: "",
            updatedAt: new Date().toISOString(),
          }),
        );
      }

      if (
        data.status === "archived" &&`;

const replacement2 = `        // Tenant was allocated but now is not, update property to vacant
        await updateDoc(
          doc(db, "properties", oldTenant.propertyId),
          cleanObject({
            status: "vacant",
            currentTenantId: "",
            updatedAt: new Date().toISOString(),
          }),
        );
      }
      
      if (data.status === "archived" && oldTenant?.status !== "archived") {
        const activeContracts = contracts.filter(c => c.tenantId === id && c.status === "active");
        for (const c of activeContracts) {
          if (c.id) {
            await updateDoc(doc(db, "contracts", c.id), {
              status: "archived",
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        const pendingRents = payments.filter(p => p.tenantId === id && p.status === "pending" && p.type === "rent");
        for (const p of pendingRents) {
          if (p.id) {
            await updateDoc(doc(db, "payments", p.id), {
              status: "cancelled",
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      if (
        data.status === "archived" &&`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/App.tsx', code);
