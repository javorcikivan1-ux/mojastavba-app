
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, ConfirmModal, Select, Badge } from '../components/UI';
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Wallet, TrendingUp, AlertCircle, Search, Filter, PieChart, BarChart3, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

export const FinanceScreen = ({ profile }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & View State
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats State
  const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0, unpaid: 0, unpaidCount: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTrans, setNewTrans] = useState<any>({ type: 'expense', date: new Date().toISOString().split('T')[0] });
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string | null}>({ open: false, id: null });

  const loadData = async () => {
    setLoading(true);
    // Fetch transactions for the selected year
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const { data } = await supabase.from('transactions')
        .select('*, sites(name)')
        .eq('organization_id', profile.organization_id)
        .gte('date', startOfYear)
        .lte('date', endOfYear)
        .order('date', {ascending: false});

    if(data) {
        processTransactions(data);
    }
    setLoading(false);
  };

  const processTransactions = (data: any[]) => {
      setTransactions(data);

      // 1. Basic Totals
      const income = data.filter(t => t.type === 'invoice').reduce((s, t) => s + Number(t.amount), 0);
      const expense = data.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      
      // 2. Unpaid Invoices (Money people owe ME)
      const unpaidInvoices = data.filter(t => t.type === 'invoice' && !t.is_paid);
      const unpaidTotal = unpaidInvoices.reduce((s, t) => s + Number(t.amount), 0);

      setStats({ 
          income, 
          expense, 
          profit: income - expense, 
          unpaid: unpaidTotal,
          unpaidCount: unpaidInvoices.length
      });

      // 3. Category Breakdown (Expenses)
      const catMap = data.filter(t => t.type === 'expense').reduce((acc: any, t) => {
          const cat = t.category || 'Ostatné';
          if (!acc[cat]) acc[cat] = 0;
          acc[cat] += Number(t.amount);
          return acc;
      }, {});
      
      const catArray = Object.entries(catMap)
        .map(([name, value]: any) => ({ name, value, percent: (value / expense) * 100 }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5); // Top 5 categories

      setCategories(catArray);

      // 4. Monthly Cashflow
      const months = Array.from({length: 12}, (_, i) => ({ month: i, inc: 0, exp: 0 }));
      data.forEach(t => {
          const d = new Date(t.date);
          const m = d.getMonth();
          if (t.type === 'invoice') months[m].inc += Number(t.amount);
          else months[m].exp += Number(t.amount);
      });
      setMonthlyData(months);
  };

  useEffect(() => { loadData(); }, [profile, year]);

  // --- ACTIONS ---

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('transactions').insert([{ 
        ...newTrans, 
        organization_id: profile.organization_id, 
        // Default paid status: Expenses usually paid immediately, Invoices usually wait
        is_paid: newTrans.is_paid !== undefined ? newTrans.is_paid : (newTrans.type === 'expense') 
    }]);
    setShowModal(false);
    loadData();
  };

  const performDelete = async () => {
    if(confirmDelete.id) {
      await supabase.from('transactions').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ open: false, id: null });
      loadData();
    }
  };

  const togglePaidStatus = async (transaction: any) => {
      // Optimistic Update
      const updated = { ...transaction, is_paid: !transaction.is_paid };
      const newData = transactions.map(t => t.id === transaction.id ? updated : t);
      processTransactions(newData); // Recalculate stats immediately

      // DB Update
      await supabase.from('transactions').update({ is_paid: updated.is_paid }).eq('id', transaction.id);
  };

  // --- FILTERING ---
  const filteredTransactions = transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesSearch = searchQuery === '' || 
                            t.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.sites?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="text-orange-600" size={32} />
              Financie
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Cashflow manažment pre rok {year}</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-xl flex items-center p-1 shadow-sm">
                <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 font-bold text-xs transition"> {year-1} </button>
                <span className="px-4 font-bold text-slate-800">{year}</span>
                <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 font-bold text-xs transition"> {year+1} </button>
            </div>
            <Button onClick={() => { setNewTrans({ type: 'expense', date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}>
                <Plus size={18}/> Pridať
            </Button>
        </div>
      </div>

      {/* ALERT BANNER: UNPAID INVOICES */}
      {stats.unpaid > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertCircle size={24}/></div>
                  <div>
                      <h4 className="font-bold text-red-900">Máte nezaplatené faktúry!</h4>
                      <p className="text-sm text-red-700">Klienti vám dlžia celkom <span className="font-bold underline">{formatMoney(stats.unpaid)}</span> (počet: {stats.unpaidCount})</p>
                  </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setFilterType('invoice'); setSearchQuery(''); }} className="text-red-600 border-red-200 hover:bg-red-100">
                  Zobraziť dlžníkov
              </Button>
          </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold uppercase text-slate-400">Príjmy (Fakturácia)</div>
              <div className="bg-green-50 text-green-600 p-1.5 rounded-lg"><ArrowUpRight size={18}/></div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatMoney(stats.income)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold uppercase text-slate-400">Výdavky (Náklady)</div>
              <div className="bg-red-50 text-red-600 p-1.5 rounded-lg"><ArrowDownLeft size={18}/></div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatMoney(stats.expense)}</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden text-white ${stats.profit >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600 border-red-600'}`}>
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-2">
                 <div className="text-xs font-bold uppercase text-white/80">Hrubý Zisk</div>
                 <div className="bg-white/20 text-white p-1.5 rounded-lg"><TrendingUp size={18}/></div>
             </div>
             <div className="text-2xl font-extrabold">{formatMoney(stats.profit)}</div>
           </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-orange-500"/> Mesačný Cashflow</h3>
              <div className="h-48 flex items-end justify-between gap-2">
                  {monthlyData.map((m, i) => {
                      const maxVal = Math.max(...monthlyData.map(d => Math.max(d.inc, d.exp)), 100);
                      return (
                          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 h-full group">
                              <div className="w-full flex gap-0.5 items-end justify-center h-full relative">
                                  {/* Income Bar */}
                                  <div className="w-2 md:w-4 bg-green-400 rounded-t-sm hover:bg-green-500 transition-all relative group/bar" style={{height: `${(m.inc / maxVal) * 100}%`}}>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap z-10">{formatMoney(m.inc)}</div>
                                  </div>
                                  {/* Expense Bar */}
                                  <div className="w-2 md:w-4 bg-red-400 rounded-t-sm hover:bg-red-500 transition-all relative group/bar" style={{height: `${(m.exp / maxVal) * 100}%`}}>
                                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap z-10">{formatMoney(m.exp)}</div>
                                  </div>
                              </div>
                              <div className="text-[9px] font-bold uppercase text-slate-400">{i+1}</div>
                          </div>
                      )
                  })}
              </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-orange-500"/> Top Výdavky</h3>
              <div className="space-y-4">
                  {categories.map((cat, i) => (
                      <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                              <span className="font-bold text-slate-700">{cat.name}</span>
                              <span className="text-slate-500">{formatMoney(cat.value)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-slate-400 h-2 rounded-full" style={{width: `${cat.percent}%`, backgroundColor: ['#f97316', '#3b82f6', '#ef4444', '#eab308', '#a855f7'][i]}}></div>
                          </div>
                      </div>
                  ))}
                  {categories.length === 0 && <div className="text-center text-slate-400 text-sm py-8">Žiadne dáta.</div>}
              </div>
          </div>
      </div>

      {/* TRANSACTIONS LIST */}
      <Card padding="p-0" className="overflow-hidden border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                <button onClick={() => setFilterType('all')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Všetko</button>
                <button onClick={() => setFilterType('invoice')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterType === 'invoice' ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-green-50 hover:text-green-600'}`}>Príjmy</button>
                <button onClick={() => setFilterType('expense')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterType === 'expense' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}>Výdavky</button>
            </div>
            
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Hľadať transakciu..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                    <th className="p-4 w-32">Dátum</th>
                    <th className="p-4">Popis / Projekt</th>
                    <th className="p-4 text-center">Kategória</th>
                    <th className="p-4 text-right">Suma</th>
                    <th className="p-4 text-center">Stav Úhrady</th>
                    <th className="p-4 w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 transition group ${!t.is_paid && t.type === 'invoice' ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4 font-mono text-slate-500 text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="p-4">
                        <div className="font-bold text-slate-700">{t.description || 'Bez popisu'}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                            {t.sites?.name ? <><Wallet size={10}/> {t.sites.name}</> : 'Firemná Réžia'}
                        </div>
                    </td>
                    <td className="p-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{t.category}</span>
                    </td>
                    <td className={`p-4 text-right font-bold font-mono text-base ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                    <td className="p-4 text-center">
                        <button 
                            onClick={() => togglePaidStatus(t)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border transition hover:scale-105 active:scale-95 cursor-pointer ${
                                t.is_paid 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                        >
                            {t.is_paid ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                            {t.is_paid ? 'Uhradené' : 'Čaká na úhradu'}
                        </button>
                    </td>
                    <td className="p-4 text-right">
                        <button onClick={() => setConfirmDelete({ open: true, id: t.id })} className="text-slate-300 hover:text-red-500 p-2 rounded-full transition opacity-0 group-hover:opacity-100">
                            <Trash2 size={16}/>
                        </button>
                    </td>
                </tr>
                ))}
                {filteredTransactions.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Žiadne záznamy pre toto obdobie.</td></tr>
                )}
            </tbody>
            </table>
        </div>
      </Card>

      <ConfirmModal 
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
        onConfirm={performDelete}
        title="Zmazať transakciu?"
        message="Naozaj chcete odstrániť túto finančnú operáciu? Zmení to celkovú bilanciu."
      />

      {showModal && (
        <Modal title="Nová Transakcia" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button type="button" onClick={() => setNewTrans({...newTrans, type: 'expense'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${newTrans.type === 'expense' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>Výdaj (-)</button>
              <button type="button" onClick={() => setNewTrans({...newTrans, type: 'invoice'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${newTrans.type === 'invoice' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Príjem (+)</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <Input label="Dátum" type="date" value={newTrans.date} onChange={(e: any) => setNewTrans({...newTrans, date: e.target.value})} required />
                <Input label="Suma €" type="number" step="0.01" value={newTrans.amount || ''} onChange={(e: any) => setNewTrans({...newTrans, amount: parseFloat(e.target.value)})} required placeholder="0.00" />
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategória</label>
                <div className="grid grid-cols-3 gap-2">
                    {['Materiál', 'Mzda', 'Réžia', 'Palivo', 'Nájom', 'Iné'].map(cat => (
                        <button 
                            key={cat}
                            type="button" 
                            onClick={() => setNewTrans({...newTrans, category: cat})}
                            className={`px-2 py-2 text-xs font-bold rounded-lg border transition ${newTrans.category === cat ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                {/* Fallback Input if category not in list or custom needed */}
                <input 
                    className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500 transition" 
                    placeholder="Alebo napíšte vlastnú..."
                    value={newTrans.category || ''}
                    onChange={(e) => setNewTrans({...newTrans, category: e.target.value})}
                    required
                />
            </div>

            <Input label="Popis / Poznámka" value={newTrans.description || ''} onChange={(e: any) => setNewTrans({...newTrans, description: e.target.value})} placeholder="Napr. Faktúra č. 2024001" />
            
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <input 
                    type="checkbox" 
                    id="isPaidCheck" 
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    checked={newTrans.is_paid !== undefined ? newTrans.is_paid : (newTrans.type === 'expense')}
                    onChange={(e) => setNewTrans({...newTrans, is_paid: e.target.checked})}
                />
                <label htmlFor="isPaidCheck" className="text-sm font-bold text-slate-700">
                    {newTrans.type === 'expense' ? 'Už zaplatené' : 'Faktúra už bola uhradená'}
                </label>
            </div>

            <Button type="submit" fullWidth className="mt-4">Uložiť Transakciu</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};
