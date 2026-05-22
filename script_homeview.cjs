const fs = require('fs');

const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const hookRegex = /const projectionData = useMemo\(\(\) => \{[\s\S]*?\}, \[payments, expenses, tenants, today\]\);/;
const hookMatch = code.match(hookRegex);
let projectionHook = hookMatch ? hookMatch[0] : '';
console.log("Hook matched?", !!hookMatch);

// We need to keep hook where it is in FinancialSummary? The user said "Migrate" so we could just copy it. Let's just define it again if needed. 
// BUT we must actually replace out the old Chart in FinancialSummary.

const chartRegex = /<Card className="p-8">\s*<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">[\s\S]*?<\/BarChart>\s*<\/ResponsiveContainer>\s*<\/div>\s*<\/Card>/;
const chartMatch = code.match(chartRegex);
let chartCode = chartMatch ? chartMatch[0] : '';
console.log("Chart matched?", !!chartMatch);

if(chartMatch) {
  code = code.replace(chartRegex, ''); // Remove from old place
}

const homeViewRegex = /const HomeView = \(\{ properties, tenants, payments, expenses, agreements, onConfirmPayment, onOpenTenantDetail, onOpenAlerts \}: HomeViewProps\) => \{([\s\S]*?)return \([\s\S]*?\{tenantStatus\.map\(\(\{([\s\S]*?)\}\);\s*\};/;

const newHomeViewCode = `const HomeView = ({ properties, tenants, payments, expenses, agreements, onConfirmPayment, onOpenTenantDetail, onOpenAlerts }: HomeViewProps) => {
  const today = new Date();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const tenantStatus = useMemo(() => {
    return tenants.map(tenant => {
      const property = properties.find(p => p.id === tenant.propertyId);
      const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
      
      const latePayments = tenantPayments.filter(p => p.status === 'late' || (p.status === 'pending' && isBefore(parseISO(p.dueDate), today)));
      const isUpToDate = latePayments.length === 0;

      const upcomingPayments = tenantPayments
        .filter(p => p.status === 'pending' && isAfter(parseISO(p.dueDate), today))
        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
      
      const nextPayment = upcomingPayments[0] || null;

      const lastPaid = tenantPayments
        .filter(p => (p.status === 'paid' || p.status === 'partial') && p.paidDate)
        .sort((a, b) => parseISO(b.paidDate!).getTime() - parseISO(a.paidDate!).getTime())[0];

      const activeAgreement = agreements.find(a => a.tenantId === tenant.id);
      const nextAgreementInstallment = tenantPayments
        .filter(p => p.agreementId === activeAgreement?.id && p.status === 'pending')
        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())[0];

      const hasPendingRemainder = tenantPayments.some(p => p.status === 'pending' && p.description?.startsWith('Restante:'));

      return {
        tenant,
        property,
        isUpToDate,
        hasPendingRemainder,
        latePaymentsCount: latePayments.length,
        nextPayment,
        lastPaid,
        activeAgreement,
        nextAgreementInstallment
      };
    });
  }, [tenants, properties, payments, agreements, today]);

  ${projectionHook}

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {auth.currentUser?.displayName?.split(' ')[0] || 'Proprietário'}!</h1>
          <p className="text-muted-foreground">Aqui está o resumo do seu sistema hoje.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsGuideOpen(true)}
          className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <HelpCircle className="w-4 h-4" /> Guia
        </Button>
      </header>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      ${chartCode ? '<div className="w-full relative z-10 transition-all duration-300">' + chartCode + '</div>' : ''}

      <div className="flex items-center justify-between pt-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-500" />
          Visão Rápida dos Inquilinos
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {tenantStatus.map(({ tenant, property, isUpToDate, hasPendingRemainder, latePaymentsCount, nextPayment, lastPaid }, i) => (
          <motion.div 
            key={tenant.id} 
            className="group relative cursor-pointer"
            onClick={() => onOpenTenantDetail(tenant)}
            whileHover={{ y: -2, scale: 1.02 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <div className="p-3 flex flex-col justify-between h-full border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-2 mb-3 relative z-10">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{tenant.name}</h3>
                  <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", !isUpToDate ? "bg-red-500" : hasPendingRemainder ? "bg-amber-400" : "bg-emerald-500")} />
                </div>
                
                <p className="text-[9px] text-slate-500 flex items-center gap-1 font-medium truncate">
                  <Home className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{property?.name || 'Vazio'}</span>
                </p>
              </div>

              <div className="mt-auto relative z-10">
                 {nextPayment ? (
                   <div className="bg-slate-50 group-hover:bg-indigo-50/50 rounded-lg p-2 border border-slate-100 transition-colors">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pendência</p>
                     <p className={cn("text-xs font-bold truncate tracking-tight", nextPayment.description?.startsWith('Restante:') ? "text-indigo-600" : "text-emerald-600")}>R$ {nextPayment.amount.toLocaleString()}</p>
                   </div>
                 ) : (
                   <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Último Pago</p>
                      <p className="text-[10px] font-semibold text-emerald-600 truncate">
                        {lastPaid ? \`R$ \${lastPaid.paidAmount?.toLocaleString() || lastPaid.amount.toLocaleString()}\` : 'Sem pgto'}
                      </p>
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        ))}
        {tenants.length === 0 && (
          <div className="col-span-full text-center py-6 text-muted-foreground italic border border-dashed rounded-xl text-sm">
            Nenhum inquilino.
          </div>
        )}
      </div>
    </div>
  );
};`;

code = code.replace(homeViewRegex, newHomeViewCode);
fs.writeFileSync(file, code);

console.log("Done");
