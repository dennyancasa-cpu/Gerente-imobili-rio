import React, { useMemo } from "react";
import { Property, Payment, Expense, Agreement, StorageSpace } from "../types";
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { DollarSign, TrendingDown, TrendingUp, Home } from "lucide-react";
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
}

export const FinancialOverviewView = ({
  properties,
  payments,
  expenses,
  agreements,
  storages = [],
}: FinancialOverviewViewProps) => {
  const [selectedMonth, setSelectedMonth] = React.useState(format(new Date(), "yyyy-MM"));

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

      return {
        name: property.name,
        receitas: totalRevenue,
        despesas: totalExpense,
        saldo: totalRevenue - totalExpense,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Panorama Financeiro por Imóvel</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold bg-white"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), "MM/yyyy")}
            </option>
          ))}
        </select>
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
    </div>
  );
};
