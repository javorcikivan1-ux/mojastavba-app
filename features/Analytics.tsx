
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button } from '../components/UI';
import { formatMoney } from '../lib/utils';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, PieChart, BarChart3, Building2, Users, Download, Target, Briefcase } from 'lucide-react';

export const AnalyticsScreen = ({ profile }: any) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('year'); // 'year', 'all'
  
  const [projectStats, setProjectStats] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ 
      totalRevenue: 0, 
      totalCost: 0, 
      margin: 0, 
      materialRatio: 0,
      laborRatio: 0 
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // 1. Load Projects
      const { data: sites } = await supabase.from('sites').select('id, name, budget, status').eq('organization_id', profile.organization_id);
      
      // 2. Load Transactions
      const { data: transactions } = await supabase.from('transactions').select('*').eq('organization_id', profile.organization_id);
      
      // 3. Load Labor Logs (to calculate labor cost per project)
      const { data: logs } = await supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate)').eq('organization_id', profile.organization_id);

      if (sites && transactions && logs) {
          processData(sites, transactions, logs);
      }
      setLoading(false);
    };
    load();
  }, [profile, period]);

  const processData = (sites: any[], transactions: any[], logs: any[]) => {
      // --- GLOBAL STATS ---
      const revenue = transactions.filter(t => t.type === 'invoice').reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calculate Real Expenses (Material/Overhead transactions + Labor Cost from logs)
      const expenseTrans = transactions.filter(t => t.type === 'expense');
      const materialCost = expenseTrans.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const laborCost = logs.reduce((sum, log) => {
          const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
          return sum + (Number(log.hours) * rate);
      }, 0);

      const totalCost = materialCost + laborCost;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      setGlobalStats({
          totalRevenue: revenue,
          totalCost: totalCost,
          margin: margin,
          materialRatio: totalCost > 0 ? (materialCost / totalCost) * 100 : 0,
          laborRatio: totalCost > 0 ? (laborCost / totalCost) * 100 : 0
      });

      // --- PROJECT PROFITABILITY ---
      const siteMap = sites.map(site => {
          const siteTrans = transactions.filter(t => t.site_id === site.id);
          const siteLogs = logs.filter(l => l.site_id === site.id);

          const income = siteTrans.filter(t => t.type === 'invoice').reduce((s, t) => s + Number(t.amount), 0);
          
          const matExpense = siteTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
          const labExpense = siteLogs.reduce((s, l) => s + (Number(l.hours) * (l.hourly_rate_snapshot || 0)), 0);
          const totalExp = matExpense + labExpense;

          return {
              id: site.id,
              name: site.name,
              income,
              expense: totalExp,
              profit: income - totalExp,
              margin: income > 0 ? ((income - totalExp) / income) * 100 : 0,
              laborHours: siteLogs.reduce((s, l) => s + Number(l.hours), 0)
          };
      });

      // Sort by Profit (High to Low)
      setProjectStats(siteMap.sort((a, b) => b.profit - a.profit));

      // --- EMPLOYEE PERFORMANCE ---
      const empMap = logs.reduce((acc: any, log: any) => {
          const name = log.profiles?.full_name || 'Neznámy';
          if(!acc[name]) acc[name] = { hours: 0, cost: 0, count: 0 };
          acc[name].hours += Number(log.hours);
          acc[name].cost += (Number(log.hours) * (log.hourly_rate_snapshot || 0));
          acc[name].count += 1;
          return acc;
      }, {});

      setEmployeeStats(Object.entries(empMap).map(([name, data]: any) => ({ name, ...data })).sort((a, b) => b.hours - a.hours));
  };

  const handleExport = () => {
      alert("Generujem CSV report pre účtovníctvo...");
      // Implementation placeholder
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="text-orange-600" size={32} />
              Strategická Analytika
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Ziskovosť projektov a efektivita firmy</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}><Download size={18}/> Export pre účtovníka</Button>
        </div>
      </div>

      {/* MARGIN KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Čistá Marža Firmy</div>
                  <div className="text-4xl font-extrabold flex items-center gap-2">
                      {globalStats.margin.toFixed(1)}%
                      {globalStats.margin > 20 ? <TrendingUp className="text-green-400"/> : <TrendingUp className="text-yellow-400"/>}
                  </div>
                  <p className="text-slate-400 text-xs mt-2 opacity-80">Pomer zisku k celkovým tržbám</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                  <PieChart size={150}/>
              </div>
          </div>

          <Card className="flex flex-col justify-center">
              <div className="text-xs font-bold uppercase text-slate-400 mb-4">Štruktúra Nákladov</div>
              <div className="space-y-4">
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <span className="font-bold text-slate-700">Materiál a Réžia</span>
                          <span className="font-bold text-slate-900">{globalStats.materialRatio.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{width: `${globalStats.materialRatio}%`}}></div>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <span className="font-bold text-slate-700">Mzdy (Práca)</span>
                          <span className="font-bold text-slate-900">{globalStats.laborRatio.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{width: `${globalStats.laborRatio}%`}}></div>
                      </div>
                  </div>
              </div>
          </Card>

          <Card className="flex flex-col justify-center">
               <div className="text-xs font-bold uppercase text-slate-400 mb-2">Celkový Zisk</div>
               <div className={`text-3xl font-extrabold ${globalStats.totalRevenue - globalStats.totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {formatMoney(globalStats.totalRevenue - globalStats.totalCost)}
               </div>
               <div className="mt-4 flex gap-4 text-sm">
                   <div>
                       <span className="block text-[10px] uppercase text-slate-400">Tržby</span>
                       <span className="font-bold text-slate-700">{formatMoney(globalStats.totalRevenue)}</span>
                   </div>
                   <div className="w-px bg-slate-200 h-8"></div>
                   <div>
                       <span className="block text-[10px] uppercase text-slate-400">Náklady</span>
                       <span className="font-bold text-slate-700">{formatMoney(globalStats.totalCost)}</span>
                   </div>
               </div>
          </Card>
      </div>

      {/* PROJECT PROFITABILITY LEADERBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="min-h-[400px]">
              <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                  <Building2 className="text-orange-600"/> Ziskovosť Projektov
              </h3>
              <div className="space-y-5">
                  {projectStats.map((site) => (
                      <div key={site.id} className="group">
                          <div className="flex justify-between items-center mb-1">
                              <div className="font-bold text-slate-800">{site.name}</div>
                              <div className={`font-mono font-bold ${site.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatMoney(site.profit)}
                              </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-8 rounded-lg relative overflow-hidden flex">
                              {/* Income Bar (Background Reference) */}
                              <div className="absolute top-0 left-0 bottom-0 bg-slate-200" style={{width: '100%'}}></div>
                              
                              {/* Expense Bar */}
                              {site.income > 0 && (
                                  <div 
                                    className={`h-full relative z-10 transition-all duration-500 ${site.expense > site.income ? 'bg-red-400' : 'bg-orange-400'}`} 
                                    style={{width: `${Math.min(100, (site.expense / site.income) * 100)}%`}}
                                  >
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white uppercase tracking-wider">Náklady</span>
                                  </div>
                              )}
                              
                              {/* Profit Marker */}
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-xs font-bold text-slate-500">
                                  {site.margin.toFixed(0)}% Marža
                              </div>
                          </div>
                          
                          <div className="flex justify-between mt-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              <span>Príjem: {formatMoney(site.income)}</span>
                              <span>Výdaj: {formatMoney(site.expense)}</span>
                          </div>
                      </div>
                  ))}
                  {projectStats.length === 0 && <div className="text-center text-slate-400 py-10">Žiadne dáta o projektoch.</div>}
              </div>
          </Card>

          {/* EMPLOYEE EFFICIENCY */}
          <Card className="min-h-[400px]">
              <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                  <Users className="text-blue-600"/> Výkonnosť Tímu
              </h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <tr>
                              <th className="p-3">Meno</th>
                              <th className="p-3 text-right">Hodiny</th>
                              <th className="p-3 text-right">Náklad</th>
                              <th className="p-3 text-right">Ø Cena/hod</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {employeeStats.map((emp: any) => (
                              <tr key={emp.name} className="hover:bg-slate-50 transition">
                                  <td className="p-3 font-bold text-slate-700">{emp.name}</td>
                                  <td className="p-3 text-right font-mono">{emp.hours.toFixed(1)} h</td>
                                  <td className="p-3 text-right font-bold text-slate-800">{formatMoney(emp.cost)}</td>
                                  <td className="p-3 text-right text-xs text-slate-500">
                                      {emp.hours > 0 ? formatMoney(emp.cost / emp.hours) : '-'}
                                  </td>
                              </tr>
                          ))}
                          {employeeStats.length === 0 && (
                              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Žiadne záznamy.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><Briefcase size={16}/> Manažérsky Tip</h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                      Sledujte nielen celkovú cenu práce, ale aj efektivitu. Ak má zamestnanec vysokú hodinovú sadzbu, mal by pracovať na projektoch s vyššou maržou.
                  </p>
              </div>
          </Card>
      </div>
    </div>
  );
};
