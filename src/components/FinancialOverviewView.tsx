import React, { useMemo, useState } from "react";
import { Property, Payment, Expense, Agreement, StorageSpace, Tenant } from "../types";
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval, getYear } from "date-fns";
import { DollarSign, TrendingDown, TrendingUp, Home, FileText, X, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

interface FinancialOverviewViewProps {
  properties: Property[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  storages?: StorageSpace[];
  tenants?: Tenant[];
}

export const FinancialOverviewView = ({
  properties,
  payments,
  expenses,
  agreements,
  storages = [],
  tenants = [],
}: FinancialOverviewViewProps) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isIRPFModalOpen, setIsIRPFModalOpen] = useState(false);
  const [irpfYear, setIrpfYear] = useState(getYear(new Date()).toString());

  const data = useMemo(() => {
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(parseISO(`${selectedMonth}-01`));

    return properties.map((property) => {
      // Receitas
      const propertyPayments = payments.filter(
        (p) =>
          p.propertyId === property.id &&
          p.status === "paid" &&
          p.paidDate &&
          isWithinInterval(parseISO(p.paidDate), { start, end }),
      );

      // Receitas de depósitos/garagens vinculados ao imóvel
      const propertyStorages = storages.filter(s => s.propertyId === property.id);
      let storageRevenue = 0;
      propertyStorages.forEach(storage => {
        if (storage.billings) {
           storage.billings.forEach(billing => {
             if (billing.status === 'paid' && billing.paymentDate) {
               if (isWithinInterval(parseISO(billing.paymentDate), { start, end })) {
                 storageRevenue += (billing.paidAmount || 0);
               }
             }
           });
        }
      });

      const totalRevenue = propertyPayments.reduce(
        (sum, p) => sum + (p.paidAmount || p.amount),
        0,
      ) + storageRevenue;

      // Despesas
      const propertyExpenses = expenses.filter(
        (e) =>
          e.propertyId === property.id &&
          isWithinInterval(parseISO(e.date), { start, end }),
      );
      const totalExpense = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);

      const marketValue = property.marketValue || 0;
      const netMonthlyIncome = property.rentValue || 0; // Using theoretical rent value for potential yield
      const capRate = marketValue > 0 ? ((netMonthlyIncome * 12) / marketValue) * 100 : 0;
      const yieldRate = marketValue > 0 ? (netMonthlyIncome / marketValue) * 100 : 0;

      return {
        name: property.name,
        receitas: totalRevenue,
        despesas: totalExpense,
        saldo: totalRevenue - totalExpense,
        marketValue,
        capRate,
        yieldRate
      };
    }).sort((a, b) => b.saldo - a.saldo);
  }, [properties, payments, expenses, storages, selectedMonth]);

  const totalRevenue = data.reduce((sum, d) => sum + d.receitas, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.despesas, 0);
  const totalBalance = totalRevenue - totalExpense;

  // Gerar últimos 12 meses para o select
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "yyyy-MM");
  });

  const availableYears = Array.from({ length: 5 }).map((_, i) => (getYear(new Date()) - i).toString());

  const irpfData = useMemo(() => {
    if (!isIRPFModalOpen) return [];
    
    return tenants.map(tenant => {
      const tenantPayments = payments.filter(p => 
        p.tenantId === tenant.id && 
        p.status === 'paid' && 
        p.paidDate && 
        p.paidDate.startsWith(irpfYear)
      );
      
      const receitas = tenantPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount), 0);
      
      // Despesas vinculadas ao imóvel desse inquilino (ex: IPTU, condomínio)
      const propertyExpenses = expenses.filter(e => 
        e.propertyId === tenant.propertyId && 
        e.date.startsWith(irpfYear) &&
        (e.type === 'tax' || e.type === 'repair' || e.type === 'renovation') // Deductible expenses
      );
      
      const despesasDedutiveis = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return {
        tenantName: tenant.name,
        cpf: tenant.cpf,
        receitas,
        despesasDedutiveis,
        rendimentoTributavel: receitas - despesasDedutiveis
      };
    }).filter(d => d.receitas > 0 || d.despesasDedutiveis > 0);
  }, [isIRPFModalOpen, irpfYear, tenants, payments, expenses]);

  const handlePrintIRPF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Panorama Financeiro por Imóvel</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsIRPFModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition"
          >
            <FileText className="w-4 h-4" /> Relatório IRPF
          </button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-none border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {format(parseISO(`${m}-01`), "MM/yyyy")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-200 rounded-lg text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Total Receitas</p>
              <p className="text-xl font-bold text-emerald-900">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-200 rounded-lg text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-800">Total Despesas</p>
              <p className="text-xl font-bold text-rose-900">R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-200 rounded-lg text-indigo-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Saldo Líquido</p>
              <p className="text-xl font-bold text-indigo-900">R$ {totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
            <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Legend />
            <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-4">Rentabilidade do Patrimônio (Cap Rate & Yield)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-500 text-sm">Imóvel</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-sm">Valor de Mercado</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-sm">Receita Mensal (Estimada)</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-sm">Cap Rate (Anual)</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-sm">Yield (Mensal)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-semibold text-slate-800">{item.name}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-600">
                    {item.marketValue > 0 ? `R$ ${item.marketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-600">
                    {item.marketValue > 0 ? `R$ ${((item.yieldRate / 100) * item.marketValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-indigo-600">
                    {item.marketValue > 0 ? `${item.capRate.toFixed(2)}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-emerald-600">
                    {item.marketValue > 0 ? `${item.yieldRate.toFixed(2)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.every(d => !d.marketValue) && (
            <p className="text-center text-slate-500 text-sm py-8">Nenhum imóvel com Valor de Mercado cadastrado. Edite seus imóveis para visualizar a rentabilidade.</p>
          )}
        </div>
      </Card>

      {isIRPFModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 print:hidden">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                Relatório IRPF / Carnê-Leão
              </h2>
              <div className="flex items-center gap-4">
                <select 
                  value={irpfYear} 
                  onChange={e => setIrpfYear(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-slate-50 text-slate-700 font-bold outline-none"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <button 
                  onClick={handlePrintIRPF}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition"
                >
                  <Download className="w-4 h-4" /> Imprimir / PDF
                </button>
                <button onClick={() => setIsIRPFModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 print:p-0 print:m-4 space-y-8" id="irpf-report-content">
              <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-2xl font-black text-slate-900 uppercase">Relatório Auxiliar para IRPF - Ano Base {irpfYear}</h1>
                <p className="text-slate-500 mt-2 font-medium">Demonstrativo de Rendimentos de Aluguéis e Despesas Dedutíveis</p>
              </div>

              {irpfData.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p>Nenhum rendimento tributável encontrado para o ano {irpfYear}.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Total Recebido</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">R$ {irpfData.reduce((s,d) => s + d.receitas, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <p className="text-sm font-bold text-rose-800 uppercase tracking-wider">Deduções Permitidas</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">R$ {irpfData.reduce((s,d) => s + d.despesasDedutiveis, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-sm font-bold text-indigo-800 uppercase tracking-wider">Rendimento Tributável</p>
                      <p className="text-2xl font-black text-indigo-600 mt-1">R$ {irpfData.reduce((s,d) => s + d.rendimentoTributavel, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100">
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 font-bold text-slate-700 text-sm">Inquilino (CPF)</th>
                        <th className="py-3 px-4 font-bold text-slate-700 text-sm">Receita Bruta (Aluguel)</th>
                        <th className="py-3 px-4 font-bold text-slate-700 text-sm">Despesas Dedutíveis (IPTU, Condomínio)</th>
                        <th className="py-3 px-4 font-bold text-slate-700 text-sm">Rendimento Líquido Tributável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {irpfData.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-bold text-slate-800">
                            {d.tenantName} <br/>
                            <span className="text-xs font-mono text-slate-500 font-normal">{d.cpf || 'Sem CPF cadastrado'}</span>
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                            R$ {d.receitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-rose-600">
                            R$ {d.despesasDedutiveis.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                          <td className="py-3 px-4 text-sm font-black text-indigo-700">
                            R$ {d.rendimentoTributavel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm font-medium mt-6">
                    <strong className="block mb-1">Atenção:</strong> 
                    Este relatório é um demonstrativo auxiliar baseado nos dados lançados no sistema. 
                    Recomendamos confirmar todos os valores com recibos e comprovantes físicos. Despesas como melhorias ou taxas administrativas de imobiliária podem exigir declarações complementares.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
