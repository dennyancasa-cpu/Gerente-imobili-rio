const fs = require('fs');
const file = 'src/components/ContractsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const handlePropertyChangeCode = `  const handlePropertyChange = (propertyId: string) => {`;

const handleTenantChangeCode = `  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        tenantId,
        depositValue: tenant.depositValue !== undefined ? tenant.depositValue : prev.depositValue,
        depositInstallments: tenant.depositInstallments !== undefined ? tenant.depositInstallments : prev.depositInstallments,
        depositDay: tenant.depositDay !== undefined ? tenant.depositDay : prev.depositDay,
        rentValue: tenant.rentValue !== undefined ? tenant.rentValue : prev.rentValue,
        paymentDay: tenant.paymentDay !== undefined ? tenant.paymentDay : prev.paymentDay,
        chargeLateFees: tenant.chargeLateFees !== undefined ? tenant.chargeLateFees : prev.chargeLateFees,
        lateFeePenalty: tenant.lateFeePenalty !== undefined ? tenant.lateFeePenalty : prev.lateFeePenalty,
        lateFeeDaily: tenant.lateFeeDaily !== undefined ? tenant.lateFeeDaily : prev.lateFeeDaily,
        lateFeeType: tenant.lateFeeType !== undefined ? tenant.lateFeeType : prev.lateFeeType,
        startDate: tenant.startDate || prev.startDate || (window as any).dateFns?.format(new Date(), 'yyyy-MM-dd') || new Date().toISOString().split('T')[0],
        endDate: tenant.endDate || prev.endDate,
      }));
    } else {
      setFormData(prev => ({ ...prev, tenantId }));
    }
  };

  const handlePropertyChange = (propertyId: string) => {`;

code = code.replace(handlePropertyChangeCode, handleTenantChangeCode);

const selectCode = `onChange={e => setFormData({...formData, tenantId: e.target.value})}`;
const selectCodeNew = `onChange={e => handleTenantChange(e.target.value)}`;

code = code.replace(selectCode, selectCodeNew);

fs.writeFileSync(file, code);
