
import React, { useState, useEffect, useRef } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, Card, Badge, Modal, Input, Select, ConfirmModal, AlertModal } from '../components/UI';
import { MapPin, BarChart3, ClipboardList, DollarSign, Package, HardHat, Plus, FileDown, Trash2, ArrowLeft, Loader2, User, Clock, Calendar, Pencil, Building2, ChevronDown, Check, CheckCircle2, Archive, RefreshCcw, FolderOpen, AlertTriangle, FileText, Send, X, Printer, Phone } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

// PROJECT SCREEN CONTAINER
export const ProjectsScreen = ({ profile, onSelect, selectedSiteId, organization }: { profile: UserProfile, onSelect: (id: string | null) => void, selectedSiteId: string | null, organization: any }) => {
  if (selectedSiteId) {
    return <ProjectDetail siteId={selectedSiteId} profile={profile} onBack={() => onSelect(null)} />;
  }
  return <ProjectManager profile={profile} onSelect={onSelect} organization={organization} />;
};

// --- MAIN PROJECT MANAGER (List View with Tabs) ---
const ProjectManager = ({ profile, onSelect, organization }: any) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'quotes' | 'active' | 'archive'>('active');
  const [sites, setSites] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // MODALS
  const [showModal, setShowModal] = useState(false); // Site Modal
  const [showQuoteModal, setShowQuoteModal] = useState(false); // Quote Modal
  const [editingSite, setEditingSite] = useState<any>(null);
  
  // Forms
  const [formData, setFormData] = useState({ name: '', address: '', client_name: '', budget: 0, status: 'lead', notes: '' });
  
  // Feedback
  const [alert, setAlert] = useState<{open: boolean, title: string, message: string, type: string}>({ open: false, title: '', message: '', type: 'success' });
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string | null}>({ open: false, action: '', id: null });

  // LOAD DATA
  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase.from('sites').select('*').eq('organization_id', profile.organization_id).order('created_at', { ascending: false });
    const { data: q } = await supabase.from('quotes').select('*, sites(name)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false });
    
    if(s) setSites(s);
    if(q) setQuotes(q);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  // ACTIONS
  const handleCreateSite = (status: string = 'lead') => {
      setEditingSite(null);
      setFormData({ name: '', address: '', client_name: '', budget: 0, status: status, notes: '' });
      setShowModal(true);
  };

  const handleEditSite = (site: any, e: any) => {
      e.stopPropagation();
      setEditingSite(site);
      setFormData({ 
          name: site.name, 
          address: site.address, 
          client_name: site.client_name, 
          budget: site.budget, 
          status: site.status,
          notes: site.notes
      });
      setShowModal(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = { 
            ...formData, 
            budget: Number(formData.budget) || 0,
            organization_id: profile.organization_id 
        };
        
        if(editingSite) {
            await supabase.from('sites').update(payload).eq('id', editingSite.id);
        } else {
            await supabase.from('sites').insert([payload]);
        }
        setShowModal(false);
        load();
    } catch (err: any) {
        setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    }
  };

  const deleteSite = async () => {
      if(!confirm.id) return;
      await supabase.from('sites').delete().eq('id', confirm.id);
      setConfirm({ ...confirm, open: false });
      load();
  };

  // FILTER LISTS
  const leads = sites.filter(s => s.status === 'lead');
  const activeSites = sites.filter(s => ['active', 'planning'].includes(s.status));
  const archivedSites = sites.filter(s => ['completed', 'paused'].includes(s.status));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="text-orange-600" size={32} />
              Stavby a Obchod
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa zákaziek od dopytu po realizáciu</p>
        </div>
        <div>
            {activeTab === 'quotes' && <Button onClick={() => setShowQuoteModal(true)}><Plus size={18}/> Nová Cenová Ponuka</Button>}
            {(activeTab === 'leads' || activeTab === 'active') && <Button onClick={() => handleCreateSite(activeTab === 'active' ? 'active' : 'lead')}><Plus size={18}/> Pridať {activeTab === 'active' ? 'Stavbu' : 'Dopyt'}</Button>}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
              { id: 'leads', label: 'Nové Zákazky (Leady)', icon: Phone, count: leads.length },
              { id: 'quotes', label: 'Cenové Ponuky', icon: FileText, count: quotes.length },
              { id: 'active', label: 'Realizácia', icon: HardHat, count: activeSites.length },
              { id: 'archive', label: 'História / Archív', icon: Archive, count: archivedSites.length },
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                  <tab.icon size={16}/> {tab.label}
                  {tab.count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>}
              </button>
          ))}
      </div>

      {/* CONTENT AREA */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* LEADS TAB */}
          {activeTab === 'leads' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {leads.map(lead => (
                      <Card key={lead.id} className="border-l-4 border-l-yellow-400 group hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-lg text-slate-900">{lead.name}</h3>
                              <button onClick={(e) => handleEditSite(lead, e)} className="text-slate-300 hover:text-blue-600"><Pencil size={16}/></button>
                          </div>
                          <div className="space-y-2 mb-4 text-sm text-slate-600">
                              <div className="flex items-center gap-2"><User size={14} className="text-slate-400"/> {lead.client_name || 'Neznámy klient'}</div>
                              <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {lead.address || 'Bez adresy'}</div>
                          </div>
                          {lead.notes && <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 mb-4 italic border border-yellow-100">{lead.notes}</div>}
                          <div className="flex gap-2">
                              <Button size="sm" variant="outline" fullWidth onClick={() => { setFormData({...formData, status: 'active'}); handleEditSite(lead, { stopPropagation: () => {} }) }}>
                                  <CheckCircle2 size={16}/> Schváliť
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => { setConfirm({ open: true, action: 'delete', id: lead.id }); }}><Trash2 size={16}/></Button>
                          </div>
                      </Card>
                  ))}
                  {leads.length === 0 && <EmptyState message="Žiadne nové dopyty." />}
              </div>
          )}

          {/* QUOTES TAB */}
          {activeTab === 'quotes' && (
              <QuotesList quotes={quotes} sites={sites} onCreate={() => setShowQuoteModal(true)} profile={profile} organization={organization} refresh={load} />
          )}

          {/* ACTIVE SITES TAB */}
          {activeTab === 'active' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSites.map(site => (
                  <Card key={site.id} onClick={() => onSelect(site.id)} className="cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition duration-300 relative overflow-hidden flex flex-col h-full border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-600 transition truncate pr-2">{site.name}</h3>
                      <Badge status={site.status} />
                    </div>
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={16} className="text-slate-400" />
                        {site.address || 'Bez adresy'}
                        </div>
                        {site.client_name && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                            <User size={16} className="text-slate-400" />
                            {site.client_name}
                            </div>
                        )}
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-6 -mb-6 p-6">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rozpočet</div>
                        <div className="font-bold text-slate-700">{formatMoney(site.budget)}</div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={(e) => handleEditSite(site, e)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-blue-600 transition border border-transparent hover:border-slate-200"><Pencil size={16}/></button>
                      </div>
                    </div>
                  </Card>
                ))}
                {activeSites.length === 0 && <EmptyState message="Žiadne aktívne projekty." />}
              </div>
          )}

          {/* ARCHIVE TAB */}
          {activeTab === 'archive' && (
              <div className="space-y-8">
                  {archivedSites.length === 0 ? <EmptyState message="Archív je prázdny." /> : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {archivedSites.map(site => (
                              <Card key={site.id} onClick={() => onSelect(site.id)} className="opacity-75 hover:opacity-100 transition cursor-pointer">
                                  <div className="flex justify-between mb-2"><h3 className="font-bold">{site.name}</h3><Badge status={site.status}/></div>
                                  <div className="text-sm text-slate-500">{site.address}</div>
                                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                      <Button size="sm" variant="secondary" fullWidth onClick={(e:any) => { e.stopPropagation(); setConfirm({ open: true, action: 'delete', id: site.id }); }}>Zmazať</Button>
                                  </div>
                              </Card>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* SITE FORM MODAL */}
      {showModal && (
        <Modal title={editingSite ? "Upraviť Projekt" : "Nový Projekt"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSaveSite}>
            <Input label="Názov" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required autoFocus placeholder="Napr. Rodinný dom Záhorská" />
            <Input label="Adresa" value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} placeholder="Ulica, Mesto" />
            <Input label="Klient (Meno)" value={formData.client_name} onChange={(e: any) => setFormData({...formData, client_name: e.target.value})} placeholder="Ján Novák" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Rozpočet (€)" type="number" value={formData.budget} onChange={(e: any) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} placeholder="0.00" />
              <Select label="Status" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})}>
                <option value="lead">Dopyt (Lead)</option>
                <option value="active">Aktívna</option>
                <option value="planning">V príprave</option>
                <option value="paused">Pozastavená</option>
                <option value="completed">Dokončená</option>
              </Select>
            </div>
            <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Poznámky</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm" value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Detaily o zákazke..."></textarea>
            </div>
            <Button type="submit" fullWidth className="mt-6">{editingSite ? 'Uložiť Zmeny' : 'Vytvoriť'}</Button>
          </form>
        </Modal>
      )}

      {/* QUOTE BUILDER MODAL */}
      {showQuoteModal && (
          <QuoteBuilder 
            onClose={() => setShowQuoteModal(false)} 
            sites={sites} 
            profile={profile} 
            organization={organization}
            onSave={() => { setShowQuoteModal(false); load(); }} 
          />
      )}

      <ConfirmModal isOpen={confirm.open} onClose={() => setConfirm({...confirm, open: false})} onConfirm={deleteSite} title="Naozaj zmazať?" message="Táto akcia je nevratná." />
      <AlertModal isOpen={alert.open} onClose={() => setAlert({...alert, open: false})} title={alert.title} message={alert.message} type={alert.type} />
    </div>
  );
};

// --- QUOTE BUILDER COMPONENT ---
const QuoteBuilder = ({ onClose, sites, profile, organization, onSave }: any) => {
    const [step, setStep] = useState(1);
    const [header, setHeader] = useState({ client_name: '', client_address: '', site_id: '', issue_date: new Date().toISOString().split('T')[0], valid_until: '' });
    const [items, setItems] = useState([{ description: '', quantity: 1, unit: 'ks', unit_price: 0 }]);
    const [saving, setSaving] = useState(false);

    // Auto-fill client if site selected
    useEffect(() => {
        if(header.site_id) {
            const s = sites.find((x:any) => x.id === header.site_id);
            if(s) setHeader(h => ({ ...h, client_name: s.client_name || '', client_address: s.address || '' }));
        }
    }, [header.site_id]);

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit: 'ks', unit_price: 0 }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: string, val: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[idx][field] = val;
        setItems(newItems);
    };

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Create Quote
            const { data: quote, error: qErr } = await supabase.from('quotes').insert([{
                organization_id: profile.organization_id,
                site_id: header.site_id || null,
                client_name: header.client_name,
                client_address: header.client_address,
                total_amount: total,
                issue_date: header.issue_date,
                valid_until: header.valid_until || null,
                quote_number: `CP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}` // Simple ID generation
            }]).select().single();

            if (qErr) throw qErr;

            // 2. Create Items
            const itemsPayload = items.map(i => ({
                quote_id: quote.id,
                description: i.description,
                quantity: i.quantity,
                unit: i.unit,
                unit_price: i.unit_price,
                total_price: i.quantity * i.unit_price
            }));

            const { error: iErr } = await supabase.from('quote_items').insert(itemsPayload);
            if (iErr) throw iErr;

            onSave();

        } catch (e: any) {
            alert("Chyba pri ukladaní: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Tvorba Cenovej Ponuky" onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-6">
                {/* HEADER INFO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-4">
                        <Select label="Projekt (Voliteľné)" value={header.site_id} onChange={(e: any) => setHeader({...header, site_id: e.target.value})}>
                            <option value="">-- Bez projektu --</option>
                            {sites.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Input label="Klient" value={header.client_name} onChange={(e: any) => setHeader({...header, client_name: e.target.value})} placeholder="Firma / Meno" />
                        <Input label="Adresa Klienta" value={header.client_address} onChange={(e: any) => setHeader({...header, client_address: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                        <Input label="Dátum vystavenia" type="date" value={header.issue_date} onChange={(e: any) => setHeader({...header, issue_date: e.target.value})} />
                        <Input label="Platnosť do" type="date" value={header.valid_until} onChange={(e: any) => setHeader({...header, valid_until: e.target.value})} />
                        <div className="pt-2 text-right">
                            <div className="text-xs uppercase font-bold text-slate-400">Celková suma</div>
                            <div className="text-3xl font-bold text-slate-900">{formatMoney(total)}</div>
                        </div>
                    </div>
                </div>

                {/* ITEMS */}
                <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex justify-between items-center">
                        Položky rozpočtu
                        <Button size="sm" variant="secondary" onClick={addItem}><Plus size={14}/> Pridať riadok</Button>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 pl-4">Popis</th>
                                    <th className="p-3 w-24">Množstvo</th>
                                    <th className="p-3 w-24">Jedn.</th>
                                    <th className="p-3 w-32">Cena/Jedn.</th>
                                    <th className="p-3 w-32 text-right">Spolu</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, i) => (
                                    <tr key={i} className="group hover:bg-slate-50">
                                        <td className="p-2 pl-4"><input className="w-full bg-transparent outline-none font-medium" placeholder="Názov položky..." value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-center" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                                        <td className="p-2"><input className="w-full bg-transparent outline-none text-center" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent outline-none" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                                        <td className="p-2 text-right font-bold text-slate-700">{formatMoney(item.quantity * item.unit_price)}</td>
                                        <td className="p-2 text-right"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button onClick={handleSave} loading={saving} size="lg"><CheckCircle2 size={18}/> Vytvoriť Cenovú Ponuku</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- QUOTES LIST ---
const QuotesList = ({ quotes, sites, onCreate, profile, organization, refresh }: any) => {
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    
    // PDF Logic
    const printRef = useRef<HTMLDivElement>(null);

    const handleViewQuote = async (quote: any) => {
        const { data } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
        setItems(data || []);
        setSelectedQuote(quote);
    };

    const generatePDF = () => {
        // Safe check for library and ref
        if (!printRef.current) return;
        
        // @ts-ignore
        if (!window.html2pdf) {
            alert("PDF knižnica sa nenačítala. Skontrolujte pripojenie k internetu.");
            return;
        }

        try {
            const opt = { 
                margin: 10, 
                filename: `Cenova_Ponuka_${selectedQuote?.quote_number || 'draft'}.pdf`, 
                image: { type: 'jpeg', quality: 0.98 }, 
                html2canvas: { scale: 2 }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            };
            
            // @ts-ignore
            window.html2pdf().set(opt).from(printRef.current).save();
        } catch (e) {
            console.error(e);
            alert("Chyba pri generovaní PDF.");
        }
    };

    const handleDelete = async () => {
        if(!selectedQuote) return;
        await supabase.from('quotes').delete().eq('id', selectedQuote.id);
        setSelectedQuote(null);
        refresh();
    };

    return (
        <div>
            {selectedQuote ? (
                <div className="animate-in fade-in slide-in-from-right-8">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setSelectedQuote(null)} className="text-slate-500 font-bold text-sm flex items-center gap-1 hover:text-slate-900"><ArrowLeft size={16}/> Späť na zoznam</button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={16}/> Zmazať</Button>
                            <Button onClick={generatePDF}><Printer size={16}/> Stiahnuť PDF</Button>
                        </div>
                    </div>

                    {/* PDF PREVIEW & GENERATION CONTAINER */}
                    <div className="bg-slate-500/10 p-8 rounded-xl overflow-auto flex justify-center">
                        <div ref={printRef} className="bg-white w-[210mm] min-h-[297mm] p-12 shadow-2xl text-slate-900 relative">
                            {/* HEADER */}
                            <div className="flex justify-between items-start mb-12 border-b-2 border-orange-500 pb-6">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CENOVÁ PONUKA</h1>
                                    <div className="text-slate-500 mt-2 font-medium">č. {selectedQuote.quote_number}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-xl">{organization.name}</div>
                                    {/* Placeholder for Org details if available in DB */}
                                    <div className="text-sm text-slate-500">Dodávateľ</div>
                                </div>
                            </div>

                            {/* INFO GRID */}
                            <div className="flex justify-between mb-12">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Odberateľ</div>
                                    <div className="font-bold text-lg">{selectedQuote.client_name}</div>
                                    <div className="text-slate-600 whitespace-pre-wrap w-64">{selectedQuote.client_address}</div>
                                </div>
                                <div className="text-right">
                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dátum vystavenia</div>
                                        <div className="font-medium">{formatDate(selectedQuote.issue_date)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Platnosť do</div>
                                        <div className="font-medium">{formatDate(selectedQuote.valid_until)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* ITEMS TABLE */}
                            <table className="w-full text-sm mb-12">
                                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3 text-left">Položka</th>
                                        <th className="p-3 text-right">Množstvo</th>
                                        <th className="p-3 text-right">Jedn. Cena</th>
                                        <th className="p-3 text-right">Spolu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-medium text-slate-800">{item.description}</td>
                                            <td className="p-3 text-right text-slate-600">{item.quantity} {item.unit}</td>
                                            <td className="p-3 text-right text-slate-600">{formatMoney(item.unit_price)}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">{formatMoney(item.total_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* TOTALS */}
                            <div className="flex justify-end">
                                <div className="w-64 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2 text-slate-500">
                                        <span>Medzisúčet</span>
                                        <span>{formatMoney(selectedQuote.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xl font-extrabold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                                        <span>SPOLU</span>
                                        <span>{formatMoney(selectedQuote.total_amount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="absolute bottom-12 left-12 right-12 text-center text-slate-400 text-xs border-t border-slate-100 pt-4">
                                Ďakujeme za záujem o naše služby. Tešíme sa na spoluprácu.<br/>
                                Vygenerované aplikáciou MojaStavba.
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotes?.map((q: any) => (
                        <Card key={q.id} onClick={() => handleViewQuote(q)} className="cursor-pointer group hover:border-blue-300 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{q.quote_number}</div>
                                <div className="text-xs text-slate-400">{formatDate(q.issue_date)}</div>
                            </div>
                            <div className="font-bold text-lg text-slate-900 mb-1">{q.client_name || 'Neznámy klient'}</div>
                            <div className="text-sm text-slate-500 mb-4 truncate">{q.sites?.name || 'Bez priradeného projektu'}</div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Suma</span>
                                <span className="font-bold text-slate-900 text-lg">{formatMoney(q.total_amount)}</span>
                            </div>
                        </Card>
                    ))}
                    {(!quotes || quotes.length === 0) && <EmptyState message="Žiadne cenové ponuky." />}
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <div className="col-span-full py-20 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-2">
        <FolderOpen size={32} className="opacity-20"/>
        {message}
    </div>
);

// --- HELPER COMPONENT: Labor Summary (from old code) ---
const LaborSummary = ({ logs }: { logs: any[] }) => {
    const summary = logs.reduce((acc: any, log: any) => {
        const name = log.profiles?.full_name || 'Neznámy';
        if (!acc[name]) acc[name] = { hours: 0, cost: 0, count: 0 };
        acc[name].hours += Number(log.hours);
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        acc[name].cost += (Number(log.hours) * rate);
        acc[name].count += 1;
        return acc;
    }, {});

    const totalHours = Object.values(summary).reduce((acc: any, item: any) => acc + item.hours, 0);
    const totalCost = Object.values(summary).reduce((acc: any, item: any) => acc + item.cost, 0);

    return (
        <div className="bg-orange-50/50 rounded-2xl border border-orange-100 overflow-hidden mb-6">
            <div className="p-4 bg-orange-100/50 border-b border-orange-100 flex justify-between items-center">
                 <h3 className="font-bold text-orange-800 flex items-center gap-2"><DollarSign size={18}/> Finančný súhrn prác</h3>
                 <span className="text-xs font-bold uppercase text-orange-600 bg-white px-2 py-1 rounded shadow-sm">{Object.keys(summary).length} pracovníkov</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-orange-50 text-orange-600 font-bold border-b border-orange-100">
                        <tr><th className="p-3">Meno</th><th className="p-3 text-right">Hodiny</th><th className="p-3 text-right">Cena Práce</th><th className="p-3 text-right">Ø Sadzba</th></tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100/50">
                        {Object.entries(summary).map(([name, data]: any) => (
                            <tr key={name} className="hover:bg-orange-50/50 transition">
                                <td className="p-3 font-medium text-slate-700">{name}</td>
                                <td className="p-3 text-right font-mono">{data.hours.toFixed(1)} h</td>
                                <td className="p-3 text-right font-bold text-slate-800">{formatMoney(data.cost)}</td>
                                <td className="p-3 text-right text-xs text-slate-500">{data.hours > 0 ? formatMoney(data.cost / data.hours) : '-'} / h</td>
                            </tr>
                        ))}
                         <tr className="bg-orange-100/30 font-bold text-orange-900 border-t-2 border-orange-100">
                            <td className="p-3">SPOLU</td><td className="p-3 text-right">{Number(totalHours).toFixed(1)} h</td><td className="p-3 text-right text-lg">{formatMoney(Number(totalCost))}</td><td className="p-3"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- PROJECT DETAIL (Existing functionality + updates) ---
const ProjectDetail = ({ siteId, profile, onBack }: any) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [site, setSite] = useState<any>(null);
  const [data, setData] = useState<any>({ tasks: [], transactions: [], materials: [], logs: [] });
  const [employees, setEmployees] = useState<any[]>([]); 
  const [stats, setStats] = useState<any>({ paid: 0, totalCost: 0, profit: 0, laborHours: 0, materialCost: 0 });
  const [modals, setModals] = useState({ log: false, transaction: false, task: false }); 
  const [formState, setFormState] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<{open: boolean, table: string, id: string}>({ open: false, table: '', id: '' });
  const [alert, setAlert] = useState<{open: boolean, title: string, message: string, type?: string}>({ open: false, title: '', message: '' });
  const [statusModalOpen, setStatusModalOpen] = useState(false); 

  const loadData = async () => {
    const [s, t, tr, m, l, emps] = await Promise.all([
      supabase.from('sites').select('*').eq('id', siteId).single(),
      supabase.from('tasks').select('*').eq('site_id', siteId).order('start_date', {ascending: true}),
      supabase.from('transactions').select('*').eq('site_id', siteId).order('date', {ascending: false}),
      supabase.from('materials').select('*').eq('site_id', siteId).order('purchase_date', {ascending: false}),
      supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate)').eq('site_id', siteId).order('date', {ascending: false}), 
      supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true) 
    ]);

    if(s.data) {
      const expenses = tr.data?.filter(x => x.type === 'expense').reduce((sum, x) => sum + Number(x.amount), 0) || 0;
      const paid = tr.data?.filter(x => x.type === 'invoice' && x.is_paid).reduce((sum, x) => sum + Number(x.amount), 0) || 0;
      const matCost = m.data?.reduce((sum, x) => sum + Number(x.total_price), 0) || 0;
      const laborCost = l.data?.reduce((sum, log: any) => {
        const hours = Number(log.hours) || 0;
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0) || 0;

      const totalCost = expenses + matCost + laborCost;

      setSite(s.data);
      setData({ tasks: t.data, transactions: tr.data, materials: m.data, logs: l.data });
      setEmployees(emps.data || []);
      setStats({ 
        paid, 
        totalCost, 
        profit: paid - totalCost,
        laborHours: l.data?.reduce((sum, x) => sum + Number(x.hours), 0) || 0,
        materialCost: matCost,
        laborCost: laborCost
      });
    }
  };

  useEffect(() => { loadData(); }, [siteId]);

  const changeStatus = async (newStatus: string) => {
      await supabase.from('sites').update({ status: newStatus }).eq('id', siteId);
      setStatusModalOpen(false);
      loadData();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('project-content-pdf');
    // @ts-ignore
    if(!element || !window.html2pdf) {
        setAlert({ open: true, title: 'Chyba', message: "PDF knižnica sa nenačítala. Skúste refresh.", type: 'error' });
        return;
    }
    const opt = { margin: 10, filename: `Vykaz_${site.name}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save();
  };

  const requestDelete = (table: string, id: string) => {
      setConfirmAction({ open: true, table, id });
  };

  const performDelete = async () => {
      await supabase.from(confirmAction.table).delete().eq('id', confirmAction.id);
      setConfirmAction({ ...confirmAction, open: false });
      loadData();
  };

  const togglePaid = async (transaction: any) => {
      const newVal = !transaction.is_paid;
      const { error } = await supabase.from('transactions').update({ is_paid: newVal }).eq('id', transaction.id);
      if(error) {
          setAlert({ open: true, title: 'Chyba', message: "Chyba pri aktualizácii: " + error.message, type: 'error' });
      } else {
          loadData();
      }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const common = { site_id: siteId, organization_id: profile.organization_id };
          if (formState.type === 'material') {
              const materialPayload = {
                  ...common,
                  name: formState.description || formState.category,
                  quantity: formState.quantity,
                  unit: formState.unit,
                  unit_price: formState.unit_price,
                  total_price: formState.amount, 
                  purchase_date: formState.date,
                  supplier: formState.supplier
              };
              const { error } = await supabase.from('materials').insert([materialPayload]);
              if(error) throw error;
          } else {
              const transPayload = {
                  ...common,
                  type: formState.type, 
                  category: formState.category,
                  amount: formState.amount,
                  date: formState.date,
                  description: formState.description,
                  is_paid: formState.is_paid
              };
              const { error } = await supabase.from('transactions').insert([transPayload]);
              if(error) throw error;
          }
          setModals({...modals, transaction: false});
          setFormState({});
          loadData();
      } catch (e: any) {
          setAlert({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
      }
  };

  const submitForm = async (table: string, payload: any, modalName: string) => {
    try {
        const { error } = await supabase.from(table).insert([{ ...payload, site_id: siteId, organization_id: profile.organization_id }]);
        if(error) throw error;
        // @ts-ignore
        setModals({...modals, [modalName]: false});
        setFormState({});
        loadData();
    } catch(e: any) {
        setAlert({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
    }
  };

  if(!site) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-600"/></div>;

  const financeItems = [
      ...data.transactions.map((t: any) => ({...t, itemType: 'transaction'})),
      ...data.materials.map((m: any) => ({
          ...m, 
          itemType: 'material', 
          date: m.purchase_date, 
          amount: m.total_price, 
          category: 'Materiál',
          description: `${m.name} (${m.quantity} ${m.unit})`,
          type: 'expense',
          is_paid: true 
      }))
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1"><ArrowLeft size={14}/> Späť</button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportPDF}><FileDown size={16}/> Stiahnuť PDF</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{site.name}</h1>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-3 py-1 rounded-full"><MapPin size={14}/> {site.address}</span>
            {site.client_name && <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-3 py-1 rounded-full"><User size={14}/> {site.client_name}</span>}
            <button onClick={() => setStatusModalOpen(true)} className="flex items-center gap-1 group hover:opacity-80 transition active:scale-95">
                <Badge status={site.status} />
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600"/>
            </button>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[180px]">
          <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Realizovaný Zisk</div>
          <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(stats.profit)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Prehľad', icon: BarChart3 },
            { id: 'tasks', label: 'Úlohy', icon: ClipboardList },
            { id: 'finance', label: 'Financie & Materiál', icon: DollarSign },
            { id: 'labor', label: 'Denník prác', icon: HardHat },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 text-xs font-bold uppercase tracking-widest text-center border-b-2 transition whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'border-orange-600 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? "text-orange-600" : "text-slate-400"} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 flex-1 bg-slate-50/30" id="project-content-pdf">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <h3 className="font-bold text-lg text-slate-900 mb-6">Finančný Súhrn</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="font-bold text-green-800 text-sm">Fakturované (Príjem)</span>
                    <span className="font-bold text-green-700 text-lg">+{formatMoney(stats.paid)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="font-bold text-red-800 text-sm">Materiál a Výdavky</span>
                    <span className="font-bold text-red-700 text-lg">-{formatMoney(stats.totalCost - stats.laborCost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="font-bold text-red-800 text-sm">Mzdové náklady</span>
                    <span className="font-bold text-red-700 text-lg">-{formatMoney(stats.laborCost)}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Čistý Zisk</span>
                      <span className={`font-extrabold text-2xl ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(stats.profit)}</span>
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="font-bold text-lg text-slate-900 mb-6">Čerpanie rozpočtu</h3>
                <div className="flex justify-between text-sm mb-2 text-slate-500 font-medium">
                  <span>Náklady: {formatMoney(stats.totalCost)}</span>
                  <span>Rozpočet: {formatMoney(site.budget)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-6">
                  <div className={`${stats.totalCost > site.budget ? 'bg-red-500' : 'bg-orange-600'} h-4 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, (stats.totalCost / site.budget) * 100)}%` }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs uppercase text-slate-400 font-bold">Odpracované</div>
                    <div className="text-xl font-bold text-slate-900">{stats.laborHours.toFixed(1)} hod</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs uppercase text-slate-400 font-bold">Materiál</div>
                    <div className="text-xl font-bold text-slate-900">{formatMoney(stats.materialCost)}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Úlohy</h3>
                <Button size="sm" onClick={() => { setFormState({ start_date: new Date().toISOString() }); setModals({...modals, task: true}); }}><Plus size={16}/> Pridať úlohu</Button>
              </div>
              <div className="space-y-3">
                {data.tasks.map((t: any) => (
                  <div key={t.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm hover:border-orange-200 transition group">
                    <div className={`w-3 h-3 rounded-full shrink-0`} style={{backgroundColor: t.color}}></div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 group-hover:text-orange-600 transition">{t.title}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span><Calendar size={12} className="inline mr-1"/>{formatDate(t.start_date)}</span>
                        {t.description && <span className="italic"> - {t.description}</span>}
                      </div>
                    </div>
                    <Badge status={t.status} />
                  </div>
                ))}
                {data.tasks.length === 0 && <div className="text-center py-10 text-slate-400 italic">Žiadne úlohy.</div>}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Financie a Materiál</h3>
                <Button onClick={() => { 
                    setFormState({ 
                        type: 'expense', 
                        date: new Date().toISOString().split('T')[0], 
                        is_material: false, 
                        is_paid: false, 
                        unit: 'ks', 
                        quantity: 1
                    }); 
                    setModals({...modals, transaction: true}); 
                }}><Plus size={18}/> Pridať pohyb</Button>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr><th className="p-4">Dátum</th><th className="p-4">Popis</th><th className="p-4 text-right">Suma</th><th className="p-4 text-center">Stav</th><th className="p-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financeItems.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-500 text-xs">{formatDate(t.date)}</td>
                        <td className="p-4">
                            <div className="font-medium flex items-center gap-2">
                                {t.itemType === 'material' && <Package size={14} className="text-orange-500"/>}
                                {t.category} 
                                <span className="text-slate-400 font-normal text-xs">{t.description}</span>
                            </div>
                        </td>
                        <td className={`p-4 text-right font-bold ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}
                        </td>
                        <td className="p-4 text-center">
                          {t.itemType === 'transaction' ? (
                              <button 
                                onClick={() => togglePaid(t)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border cursor-pointer hover:opacity-80 transition ${t.is_paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                              >
                                {t.is_paid ? 'Uhradené' : 'Čaká'}
                              </button>
                          ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase border bg-slate-50 text-slate-600 border-slate-200">Nákup</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                            <button onClick={() => requestDelete(t.itemType === 'material' ? 'materials' : 'transactions', t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {financeItems.length === 0 && <div className="p-8 text-center text-slate-400 italic">Žiadne záznamy.</div>}
              </div>
            </div>
          )}

          {activeTab === 'labor' && (
            <div>
              <LaborSummary logs={data.logs} />
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Denník prác</h3>
                <Button size="sm" onClick={() => { setFormState({ date: new Date().toISOString().split('T')[0] }); setModals({...modals, log: true}); }}><Clock size={16}/> Zapísať hodiny</Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr><th className="p-4">Dátum</th><th className="p-4">Pracovník</th><th className="p-4">Popis</th><th className="p-4 text-right">Hodiny</th><th className="p-4 text-right">Sadzba</th><th className="p-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.logs.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-500 font-mono text-xs">{formatDate(l.date)}</td>
                        <td className="p-4 font-bold text-slate-700">{l.profiles?.full_name || 'Neznámy'}</td>
                        <td className="p-4 italic text-slate-600">{l.description || '-'}</td>
                        <td className="p-4 text-right font-bold">{Number(l.hours).toFixed(2)} h</td>
                        <td className="p-4 text-right text-xs text-slate-400 font-mono">{formatMoney(l.hourly_rate_snapshot)}</td>
                        <td className="p-4 text-right"><button onClick={() => requestDelete('attendance_logs', l.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmAction.open} onClose={() => setConfirmAction({...confirmAction, open: false})} onConfirm={performDelete} title="Odstrániť položku?" message="Táto akcia je nevratná." type="danger" />
      <AlertModal isOpen={alert.open} onClose={() => setAlert({...alert, open: false})} title={alert.title} message={alert.message} type={alert.type} />
      
      {statusModalOpen && (
          <Modal title="Zmeniť Status" onClose={() => setStatusModalOpen(false)}>
              <div className="grid gap-3">
                  {[
                      { val: 'lead', label: 'Dopyt (Lead)', desc: 'Potenciálny zákazník', color: 'bg-yellow-100 text-yellow-700' },
                      { val: 'active', label: 'Aktívna', desc: 'Prebiehajúce práce', color: 'bg-green-100 text-green-700' },
                      { val: 'planning', label: 'V príprave', desc: 'Čaká na začatie', color: 'bg-blue-100 text-blue-700' },
                      { val: 'paused', label: 'Pozastavená', desc: 'Dočasne zastavené (Archív)', color: 'bg-yellow-100 text-yellow-700' },
                      { val: 'completed', label: 'Dokončená', desc: 'Uzatvorený projekt (Archív)', color: 'bg-slate-100 text-slate-700' }
                  ].map(s => (
                      <button key={s.val} onClick={() => changeStatus(s.val)} className={`p-4 rounded-xl border flex items-center justify-between group transition ${site.status === s.val ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'}`}>
                          <div className="text-left"><span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full mb-1 inline-block ${s.color}`}>{s.label}</span><div className="text-sm text-slate-500">{s.desc}</div></div>
                          {site.status === s.val && <CheckCircle2 className="text-orange-600" size={20}/>}
                      </button>
                  ))}
              </div>
          </Modal>
      )}

      {modals.log && (
        <Modal title="Zapísať Dochádzku" onClose={() => setModals({...modals, log: false})}>
          <form onSubmit={(e) => { e.preventDefault(); const emp = employees.find(ep => ep.id === formState.user_id); const payload = { ...formState, hourly_rate_snapshot: emp?.hourly_rate || 0 }; submitForm('attendance_logs', payload, 'log'); }}>
            <Select label="Pracovník" value={formState.user_id || ''} onChange={(e: any) => setFormState({...formState, user_id: e.target.value})}>
                <option value="">-- Vyberte --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Dátum" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
                <Input label="Počet hodín" type="number" step="0.5" value={formState.hours || ''} onChange={(e: any) => setFormState({...formState, hours: parseFloat(e.target.value)})} required />
            </div>
            <Input label="Popis práce" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} placeholder="Napr. Murovanie" />
            <Button type="submit" fullWidth className="mt-4">Zapísať</Button>
          </form>
        </Modal>
      )}

      {modals.transaction && (
        <Modal title="Nový Pohyb" onClose={() => setModals({...modals, transaction: false})}>
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-2">
              <button type="button" onClick={() => setFormState({...formState, type: 'expense', is_material: false})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formState.type === 'expense' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>Výdaj</button>
              <button type="button" onClick={() => setFormState({...formState, type: 'invoice', is_material: false})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formState.type === 'invoice' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Príjem</button>
            </div>
            {formState.type === 'expense' && <div className="flex items-center gap-2 mb-2 p-3 bg-orange-50 border border-orange-100 rounded-xl"><input type="checkbox" id="is_material" checked={formState.is_material || false} onChange={(e) => setFormState({...formState, is_material: e.target.checked, type: 'material'})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" /><label htmlFor="is_material" className="text-sm font-bold text-slate-800 flex items-center gap-2"><Package size={16}/> Je to nákup materiálu?</label></div>}
            {formState.is_material ? (<><Input label="Názov materiálu" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value, category: 'Materiál'})} required autoFocus placeholder="Napr. Cement, Tehla..." /><div className="grid grid-cols-2 gap-4"><Input label="Množstvo" type="number" step="0.01" value={formState.quantity} onChange={(e: any) => setFormState({...formState, quantity: parseFloat(e.target.value), amount: (parseFloat(e.target.value) * (formState.unit_price || 0)) })} required /><Select label="Jednotka" value={formState.unit} onChange={(e: any) => setFormState({...formState, unit: e.target.value})}>{['ks', 'm', 'm2', 'm3', 'kg', 't', 'l', 'bal', 'paleta', 'hod'].map(u => <option key={u} value={u}>{u}</option>)}</Select></div><div className="grid grid-cols-2 gap-4"><Input label="Cena za jednotku €" type="number" step="0.01" value={formState.unit_price || ''} onChange={(e: any) => setFormState({...formState, unit_price: parseFloat(e.target.value), amount: (parseFloat(e.target.value) * (formState.quantity || 0)) })} required /><div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Spolu €</label><div className="p-3 bg-slate-100 rounded-xl text-slate-700 font-bold">{formatMoney(formState.amount)}</div></div></div><Input label="Dodávateľ" value={formState.supplier || ''} onChange={(e: any) => setFormState({...formState, supplier: e.target.value})} placeholder="Stavebniny XY" /></>) : (<><Input label="Kategória / Popis" value={formState.category || ''} onChange={(e: any) => setFormState({...formState, category: e.target.value})} required autoFocus placeholder="Napr. Záloha, Faktúra 202401..." /><Input label="Suma €" type="number" step="0.01" value={formState.amount || ''} onChange={(e: any) => setFormState({...formState, amount: parseFloat(e.target.value)})} required /><Input label="Poznámka (Voliteľné)" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} /></>)}
            <Input label="Dátum" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
            <Button type="submit" fullWidth className="mt-4">Uložiť</Button>
          </form>
        </Modal>
      )}

      {modals.task && (
        <Modal title="Nová Úloha k projektu" onClose={() => setModals({...modals, task: false})}>
          <form onSubmit={(e) => { e.preventDefault(); submitForm('tasks', formState, 'task'); }}>
             <Input label="Názov úlohy" value={formState.title || ''} onChange={(e: any) => setFormState({...formState, title: e.target.value})} required autoFocus />
             <div className="grid grid-cols-2 gap-4"><Input label="Začiatok" type="datetime-local" value={formState.start_date ? formState.start_date.slice(0,16) : ''} onChange={(e: any) => setFormState({...formState, start_date: e.target.value})} /><Select label="Priradiť" value={formState.assigned_to || ''} onChange={(e: any) => setFormState({...formState, assigned_to: e.target.value})}><option value="">-- Nikto --</option>{employees.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select></div>
             <Input label="Popis" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} />
             <Button type="submit" fullWidth className="mt-4">Uložiť Úlohu</Button>
          </form>
        </Modal>
      )}
    </div>
  );
};
