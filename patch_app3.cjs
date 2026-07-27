const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsTenantDetailModalOpen(false);
                    setActiveTab("tenants");
                    setInitialTenantIdToEdit(selectedTenantForDetail.id);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>`;

const replacement = `                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsTenantDetailModalOpen(false);
                    setActiveTab("tenants");
                    setInitialTenantIdToEdit(selectedTenantForDetail.id);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>
                
                {selectedTenantForDetail.status !== "archived" && (
                  <Button
                    variant="outline"
                    className="flex-1 hover:bg-slate-100"
                    onClick={() => {
                      setIsTenantDetailModalOpen(false);
                      const linkedContracts = contracts.filter(
                        (c) => c.tenantId === selectedTenantForDetail.id && c.status === "active"
                      );
                      let warningMsg = \`Ao confirmar, você arquivará o registro de \${selectedTenantForDetail.name}.\`;
                      if (linkedContracts.length > 0) {
                        warningMsg = \`Atenção: O inquilino "\${selectedTenantForDetail.name}" possui \${linkedContracts.length} contrato(s) ativo(s). Ao arquivar o inquilino, o contrato e as parcelas pendentes também serão arquivados ou cancelados. Você poderá consultar no histórico.\`;
                      }
                      executeWithSecurity(
                        () => updateTenant(selectedTenantForDetail.id, { status: "archived" }),
                        warningMsg,
                      );
                    }}
                  >
                    <Archive className="w-4 h-4 mr-2" /> Arquivar
                  </Button>
                )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success");
} else {
    console.log("Target not found");
}
