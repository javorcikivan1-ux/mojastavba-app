import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Badge, ConfirmModal, AlertModal } from '../components/UI';
import { UserPlus, Mail, Coins, Phone, ArrowLeft, Calendar, Building2, Banknote, Trash2, Archive, CheckCircle2, Users, Pencil, RefreshCcw, Link, Copy, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

export const TeamScreen = ({ profile }: any) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  if (selectedEmpId) {
    return <EmployeeDetail empId={selectedEmpId} profile={profile} onBack={() => setSelectedEmpId(null)} />;
  }
  return <TeamList profile={profile} onSelect={setSelectedEmpId} />;
};

const TeamList = ({ profile, onSelect }: any) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ email: '', fullName: '', rate: 0, phone: '', is_active: true });
  
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string, name?: string}>({ open: false, action: '', id: '' });
  const [alert, setAlert] = useState<{open: boolean, message: string}>({ open: false, message: '' });
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).order('full_name', { ascending: true });
    if(data) setWorkers(data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = () => {
      setEditingWorker(null);
      setFormData({ email: '', fullName: '', rate: 0, phone: '', is_active: true });
      setShowModal(true);
  }

  const handleEdit = (worker: any, e: any) => {
      e.stopPropagation();
      setEditingWorker(worker);
      setFormData({ 
          email: worker.email, 
          fullName: worker.full_name, 
          rate: worker.hourly_rate, 
          phone: worker.phone,
          is_active: worker.is_active
      });
      setShowModal(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        let error;
        
        if (editingWorker) {
             const { error: err } = await supabase.from('profiles').update({
                full_name: formData.fullName,
                email: formData.email,
                hourly_rate: formData.rate,
                phone: formData.phone,
                is_active: formData.is_active
             }).eq('id', editingWorker.id);
             error = err;
        } else {
            const newId = crypto.randomUUID();
            const { error: err } = await supabase.from('profiles').insert([{
              id: newId, 
              email: formData.email || `worker-${Date.now()}@local.app`, 
              full_name: formData.fullName, 
              role: 'employee', 
              organization_id: profile.organization_id, 
              hourly_rate: formData.rate, 
              phone: formData.phone,
              is_active: true
            }]);
            error = err;
        }

        if (error) throw error;
        
        setShowModal(false);
        load();
    } catch(err: any) {
        setAlert({ open: true, message: "Chyba: " + err.message });
    }
  };

  const handleConfirmAction = async () => {
      if (confirm.action === 'archive') {
          await supabase.from('profiles').update({ is_active: false }).eq('id', confirm.id);
      } else if (confirm.action === 'restore') {
          await supabase.from('profiles').update({ is_active: true }).eq('id', confirm.id);
      } else if (confirm.action === 'delete') {
          await supabase.from('profiles').delete().eq('id', confirm.id);
      }
      load();
  };

  const toggleArchive = (worker: any, e: any) => {
      e.stopPropagation();
      setConfirm({ 
          open: true, 
          action: worker.is_active ? 'archive' : 'restore', 
          id: worker.id,
          name: worker.full_name
      });
  };

  const handleDelete = (id: string, e: any) => {
      e.stopPropagation();
      setConfirm({ open: true, action: 'delete', id });
  }

  const copyInviteLink = () => {
      const link = `${window.location.origin}/?action=register-emp&companyId=${profile.organization_id}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const filteredWorkers = workers.filter(w => showArchived ? !w.is_active : w.is_active);

  return (
    <div className="space-y-6">
      {/* UNIFIED HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="text-orange-600" size={32} />
              Tím a Zamestnanci
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa pracovníkov, sadzieb a výplat</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? 'Späť na aktívnych' : 'Zobraziť Archív'}
            </Button>
            <Button variant="secondary" onClick={() => setShowInviteModal(true)}><Link size={18}/> Pozvať člena</Button>
            <Button onClick={handleCreate}><UserPlus size={18}/> Vytvoriť člena</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map(w => (
          <Card key={w.id} onClick={() => onSelect(w.id)} className={`relative group hover:shadow-md transition cursor-pointer border border-slate-200 ${!w.is_active ? 'opacity-70 bg-slate-50' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition border border-slate-200">
                {w.full_name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-600 transition">{w.full_name}</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${w.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                    {w.is_active ? (w.role === 'admin' ? 'Administrátor' : 'Pracovník') : 'Archivovaný'}
                </span>
              </div>
            </div>
            <div className="mt-6 space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400"/> {w.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400"/> {w.phone || '-'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Coins size={16} className="text-orange-400"/> 
                <span className="font-bold">{formatMoney(w.hourly_rate || 0)} / hod</span>
              </div>
            </div>
            
            {/* ACTION BUTTONS ON CARD */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
                <button onClick={(e) => handleEdit(w, e)} className="bg-white p-2 rounded-full text-slate-400 hover:text-blue-600 shadow-sm border border-slate-200 hover:border-blue-200" title="Upraviť">
                    <Pencil size={14}/>
                </button>
                <button onClick={(e) => toggleArchive(w, e)} className="bg-white p-2 rounded-full text-slate-400 hover:text-orange-600 shadow-sm border border-slate-200 hover:border-orange-200" title={w.is_active ? "Archivovať" : "Obnoviť"}>
                    {w.is_active ? <Archive size={14}/> : <RefreshCcw size={14}/>}
                </button>
                {!w.is_active && (
                    <button onClick={(e) => handleDelete(w.id, e)} className="bg-white p-2 rounded-full text-slate-400 hover:text-red-600 shadow-sm border border-slate-200 hover:border-red-200" title="Zmazať">
                        <Trash2 size={14}/>
                    </button>
                )}
            </div>
          </Card>
        ))}
        {filteredWorkers.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                {showArchived ? "Archív je prázdny." : "Zatiaľ žiadni zamestnanci."}
            </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onConfirm={handleConfirmAction}
        title={confirm.action === 'archive' ? 'Archivovať?' : confirm.action === 'delete' ? 'Zmazať?' : 'Obnoviť?'}
        message={confirm.action === 'archive' 
            ? `Naozaj chcete archivovať zamestnanca ${confirm.name}? Zmizne z výberu, ale dáta ostanú.`
            : confirm.action === 'delete' 
            ? "Naozaj natrvalo zmazať? Odporúčame radšej archiváciu." 
            : "Obnoviť zamestnanca do aktívneho stavu?"}
        type={confirm.action === 'delete' ? 'danger' : 'primary'}
      />
      
      <AlertModal
        isOpen={alert.open}
        onClose={() => setAlert({ ...alert, open: false })}
        title="Chyba"
        message={alert.message}
        type="error"
      />

      {showModal && (
        <Modal title={editingWorker ? "Upraviť Zamestnanca" : "Nový Zamestnanec"} onClose={() => setShowModal(false)}>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-sm text-blue-800">
            <strong>Tip:</strong> Môžete tiež použiť tlačidlo "Pozvať člena" a poslať zamestnancovi odkaz, aby sa zaregistroval sám.
          </div>
          <form onSubmit={handleSave}>
            <Input label="Meno a Priezvisko" value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} required placeholder="Ján Novák" />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Hodinová sadzba €" type="number" step="0.5" value={formData.rate} onChange={(e: any) => setFormData({...formData, rate: parseFloat(e.target.value)})} required />
                <Input label="Telefón" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <Input label="Email (Voliteľné)" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
            
            {editingWorker && (
                <div className="flex items-center gap-2 mb-4 pt-2 border-t border-slate-100">
                    <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" />
                    <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Aktívny zamestnanec</label>
                </div>
            )}

            <Button type="submit" fullWidth className="mt-4">{editingWorker ? 'Uložiť Zmeny' : 'Vytvoriť Pracovníka'}</Button>
          </form>
        </Modal>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
          <Modal title="Pozvať Zamestnanca" onClose={() => setShowInviteModal(false)}>
              <div className="space-y-6">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Link size={32}/>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Registračný Odkaz</h3>
                      <p className="text-sm text-slate-500">
                          Pošlite tento odkaz zamestnancovi. Po kliknutí sa mu otvorí registračný formulár s automaticky predvyplneným ID vašej firmy.
                      </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 font-mono text-xs text-slate-600 break-all">
                          {`${window.location.origin}/?action=register-emp&companyId=${profile.organization_id}`}
                      </div>
                      <button 
                          onClick={copyInviteLink} 
                          className={`p-2 rounded-lg transition shrink-0 ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                      >
                          {copied ? <CheckCircle2 size={20}/> : <Copy size={20}/>}
                      </button>
                  </div>

                  <Button fullWidth onClick={() => setShowInviteModal(false)}>Zatvoriť</Button>
              </div>
          </Modal>
      )}
    </div>
  );
};

const EmployeeDetail = ({ empId, profile, onBack }: any) => {
    const [emp, setEmp] = useState<any>(null);
    const [stats, setStats] = useState<any>({ earned: 0, paid: 0, balance: 0, hours: 0 });
    const [groupedLogs, setGroupedLogs] = useState<any>({});
    const [showPayroll, setShowPayroll] = useState(false);
    const [payrollData, setPayrollData] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], note: '' });
    const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});
    
    const [confirm, setConfirm] = useState<{open: boolean, action: string}>({ open: false, action: '' });

    const loadData = async () => {
        const [e, l, t] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', empId).single(),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', empId).order('date', {ascending: false}),
            supabase.from('transactions').select('*').eq('category', 'Mzda').ilike('description', `%#EMP:${empId}%`)
        ]);

        if (e.data) {
            setEmp(e.data);
            
            // Process Logs Grouping
            const logs = l.data || [];
            const earned = logs.reduce((acc, log) => acc + (Number(log.hours) * Number(log.hourly_rate_snapshot)), 0);
            const totalHours = logs.reduce((acc, log) => acc + Number(log.hours), 0);
            const paid = (t.data || []).reduce((acc,yb) => acc + Number(yb.amount), 0);
            
            setStats({ earned, paid, balance: earned - paid, hours: totalHours });
            setPayrollData(p => ({ ...p, amount: earned - paid > 0 ? earned - paid : 0 }));

            // Grouping Logic: Site -> Month -> Logs
            const grouped = logs.reduce((acc: any, log: any) => {
                const siteName = log.sites?.name || 'Zmazaná / Neznáma stavba';
                const date = new Date(log.date);
                const monthKey = date.toLocaleString('sk-SK', { month: 'long', year: 'numeric' }); // e.g., "máj 2024"

                if (!acc[siteName]) acc[siteName] = { totalHours: 0, totalCost: 0, months: {} };
                if (!acc[siteName].months[monthKey]) acc[siteName].months[monthKey] = { hours: 0, cost: 0, logs: [] };

                const cost = Number(log.hours) * Number(log.hourly_rate_snapshot);
                
                acc[siteName].totalHours += Number(log.hours);
                acc[siteName].totalCost += cost;
                
                acc[siteName].months[monthKey].hours += Number(log.hours);
                acc[siteName].months[monthKey].cost += cost;
                acc[siteName].months[monthKey].logs.push(log);

                return acc;
            }, {});

            setGroupedLogs(grouped);
            // Auto expand all sites initially
            const initialExpanded = Object.keys(grouped).reduce((acc:any, key) => ({...acc, [key]: true}), {});
            setExpandedSites(initialExpanded);
        }
    };

    useEffect(() => { loadData(); }, [empId]);

    const handlePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        // Create expense transaction
        await supabase.from('transactions').insert([{
            organization_id: profile.organization_id,
            type: 'expense',
            category: 'Mzda',
            amount: payrollData.amount,
            date: payrollData.date,
            description: `Výplata mzdy: ${emp.full_name} #EMP:${emp.id}. ${payrollData.note}`,
            is_paid: true
        }]);
        setShowPayroll(false);
        loadData();
    };

    const toggleActiveAction = async () => {
        await supabase.from('profiles').update({ is_active: !emp.is_active }).eq('id', emp.id);
        loadData();
    };

    const toggleSite = (siteName: string) => {
        setExpandedSites(prev => ({...prev, [siteName]: !prev[siteName]}));
    };

    if(!emp) return <div>Načítavam...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1"><ArrowLeft size={14}/> Späť na tím</button>
                 <div className="flex gap-2">
                    <Button variant={emp.is_active ? 'secondary' : 'primary'} size="sm" onClick={() => setConfirm({ open: true, action: emp.is_active ? 'deactivate' : 'activate' })}>
                        {emp.is_active ? <><Archive size={16}/> Archivovať</> : <><CheckCircle2 size={16}/> Aktivovať</>}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setShowPayroll(true)} disabled={stats.balance <= 0}>
                        <Banknote size={16}/> Vyplatiť Mzdu
                    </Button>
                 </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center font-bold text-3xl text-slate-400 border border-slate-200">
                        {emp.full_name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{emp.full_name}</h1>
                        <p className="text-slate-500 font-medium">{emp.role === 'admin' ? 'Administrátor' : 'Pracovník'} • {emp.email}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                             <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded"><Phone size={14}/> {emp.phone || '-'}</span>
                             <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-bold"><Coins size={14}/> {formatMoney(emp.hourly_rate)} / hod</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 w-full grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Odpracované</div>
                        <div className="text-xl font-bold text-slate-900">{stats.hours.toFixed(1)} h</div>
                    </div>
                    <div className="text-center border-l border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Zarobené</div>
                        <div className="text-xl font-bold text-slate-900">{formatMoney(stats.earned)}</div>
                    </div>
                    <div className="text-center border-l border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">K Úhrade</div>
                        <div className={`text-xl font-bold ${stats.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(stats.balance)}</div>
                    </div>
                </div>
            </div>

            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Calendar className="text-orange-500" size={20}/> História Prác podľa Stavieb</h3>
            
            <div className="space-y-4">
                {Object.keys(groupedLogs).length === 0 && <div className="text-center py-10 text-slate-400 italic">Žiadne záznamy.</div>}
                
                {Object.entries(groupedLogs).map(([siteName, siteData]: any) => (
                    <div key={siteName} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div 
                            onClick={() => toggleSite(siteName)}
                            className="bg-slate-50/50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition border-b border-slate-100"
                        >
                            <div className="flex items-center gap-3">
                                {expandedSites[siteName] ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                <div>
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Building2 size={16} className="text-orange-500"/> {siteName}</h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-slate-500 font-medium"><span className="font-bold text-slate-900">{siteData.totalHours.toFixed(1)}</span> hod</div>
                                <div className="font-bold text-slate-900 bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">{formatMoney(siteData.totalCost)}</div>
                            </div>
                        </div>
                        
                        {expandedSites[siteName] && (
                            <div className="p-4 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {Object.entries(siteData.months).map(([month, monthData]: any) => (
                                    <div key={month} className="border border-slate-100 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-500">
                                            <span>{month}</span>
                                            <span className="text-slate-700">{monthData.hours.toFixed(1)}h • {formatMoney(monthData.cost)}</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {monthData.logs.map((log: any) => (
                                                <div key={log.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50/50 transition">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 p-1.5 rounded text-slate-500"><Clock size={14}/></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-700">{formatDate(log.date)}</div>
                                                            {log.description && <div className="text-xs text-slate-500 italic">{log.description}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm">{Number(log.hours).toFixed(1)}h</div>
                                                        <div className="text-xs text-slate-400">{formatMoney(log.hourly_rate_snapshot)}/h</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmModal 
                isOpen={confirm.open}
                onClose={() => setConfirm({ ...confirm, open: false })}
                onConfirm={toggleActiveAction}
                title={confirm.action === 'deactivate' ? 'Deaktivovať?' : 'Aktivovať?'}
                message={confirm.action === 'deactivate' 
                    ? "Zamestnanec bude archivovaný a nebude môcť zapisovať hodiny." 
                    : "Obnoviť zamestnanca pre zápis hodín?"}
                type="primary"
            />

            {showPayroll && (
                <Modal title="Vyplatiť Mzdu" onClose={() => setShowPayroll(false)}>
                    <form onSubmit={handlePayroll}>
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-4 text-center">
                            <div className="text-xs font-bold uppercase text-green-700">Aktuálny dlh voči zamestnancovi</div>
                            <div className="text-3xl font-bold text-green-800">{formatMoney(stats.balance)}</div>
                        </div>
                        <Input label="Suma k úhrade (€)" type="number" step="0.01" value={payrollData.amount} onChange={(e: any) => setPayrollData({...payrollData, amount: parseFloat(e.target.value)})} required />
                        <Input label="Dátum úhrady" type="date" value={payrollData.date} onChange={(e: any) => setPayrollData({...payrollData, date: e.target.value})} required />
                        <Input label="Poznámka" value={payrollData.note} onChange={(e: any) => setPayrollData({...payrollData, note: e.target.value})} placeholder="Napr. Doplatok za Marec" />
                        <Button type="submit" fullWidth className="mt-4">Potvrdiť Vyplatenie</Button>
                    </form>
                </Modal>
            )}
        </div>
    );
};