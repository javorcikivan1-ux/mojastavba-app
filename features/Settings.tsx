
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, AlertModal } from '../components/UI';
import { Lock, Save, Settings, Copy, CheckCircle2, Building2, KeyRound, Bell, Image, Shield, Users, LogOut, Clock } from 'lucide-react';

export const SettingsScreen = ({ profile, organization, onUpdateOrg }: any) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'team'>('general');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });
  const [copied, setCopied] = useState(false);

  // --- GENERAL STATE ---
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || '');
  const [notifications, setNotifications] = useState({
      notify_tasks: profile.settings?.notify_tasks ?? true,
      notify_logs: profile.settings?.notify_logs ?? true
  });

  // --- SECURITY STATE ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Update local state if props change
  useEffect(() => {
      if(organization) {
          setOrgName(organization.name);
          setLogoUrl(organization.logo_url || '');
      }
  }, [organization]);

  // --- ACTIONS ---

  const saveGeneralSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          // Update Organization
          const { error: orgError } = await supabase.from('organizations').update({
              name: orgName,
              logo_url: logoUrl
          }).eq('id', profile.organization_id);
          if (orgError) throw orgError;

          // Update Profile Settings (Notifications)
          const { error: profError } = await supabase.from('profiles').update({
              settings: notifications
          }).eq('id', profile.id);
          if (profError) throw profError;

          // Update Parent State
          onUpdateOrg({ ...organization, name: orgName, logo_url: logoUrl });
          
          setAlert({ open: true, title: 'Uložené', message: 'Nastavenia boli úspešne aktualizované.', type: 'success' });
      } catch (err: any) {
          setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const changePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setAlert({ open: true, title: 'Chyba', message: 'Heslá sa nezhodujú.', type: 'error' });
          return;
      }
      if (newPassword.length < 6) {
           setAlert({ open: true, title: 'Chyba', message: 'Heslo musí mať aspoň 6 znakov.', type: 'error' });
           return;
      }
      
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      
      if (error) {
          setAlert({ open: true, title: 'Chyba', message: error.message, type: 'error' });
      } else {
          setAlert({ open: true, title: 'Úspech', message: 'Vaše heslo bolo úspešne zmenené.', type: 'success' });
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  const copyOrgId = () => {
      navigator.clipboard.writeText(profile.organization_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // --- RENDER HELPERS ---

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-2 ${activeTab === id ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
      >
          <Icon size={18} className={activeTab === id ? 'text-orange-600' : 'text-slate-400'}/>
          {label}
      </button>
  );

  return (
    <div className="space-y-6">
        {/* HEADER */}
        <div className="mb-4">
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="text-orange-600" size={32} />
              Nastavenia
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa účtu a firemné predvoľby</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
            {/* SIDEBAR MENU */}
            <div className="w-full lg:w-64 shrink-0">
                <Card padding="p-4" className="sticky top-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Kategórie</div>
                    <nav>
                        <TabButton id="general" label="Všeobecné" icon={Building2} />
                        <TabButton id="security" label="Zabezpečenie" icon={Shield} />
                        <TabButton id="team" label="Tím a Pozvánky" icon={Users} />
                    </nav>
                    <div className="mt-6 pt-6 border-t border-slate-100 px-2">
                        <div className="text-xs text-slate-400">
                            MojaStavba.app<br/>
                            ID: {profile.organization_id.slice(0,8)}...
                        </div>
                    </div>
                </Card>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 className="text-orange-600" size={20}/> Firemné Údaje</h3>
                            <form onSubmit={saveGeneralSettings} className="space-y-4">
                                <Input label="Názov Firmy" value={orgName} onChange={(e: any) => setOrgName(e.target.value)} required placeholder="Moja Firma s.r.o." />
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Logo Firmy (URL)</label>
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <input 
                                                    value={logoUrl} 
                                                    onChange={(e) => setLogoUrl(e.target.value)} 
                                                    placeholder="https://priklad.sk/logo.png" 
                                                    className="w-full p-3 pl-10 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                                                />
                                                <Image className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Vložte priamy odkaz na obrázok loga (PNG, JPG).</p>
                                        </div>
                                        <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                            {logoUrl ? <img src={logoUrl} alt="Preview" className="w-full h-full object-cover"/> : <Image size={24} className="text-slate-300"/>}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell className="text-orange-600" size={20}/> Notifikácie</h4>
                                    
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Clock size={18}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">Blížiace sa úlohy</div>
                                                    <div className="text-xs text-slate-500">Upozorniť 1 hodinu a 15 minút pred termínom.</div>
                                                </div>
                                            </div>
                                            <input type="checkbox" checked={notifications.notify_tasks} onChange={(e) => setNotifications({...notifications, notify_tasks: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"/>
                                        </label>

                                        <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-50 text-green-600 p-2 rounded-lg"><CheckCircle2 size={18}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">Nové výkazy práce</div>
                                                    <div className="text-xs text-slate-500">Upozorniť, keď zamestnanec nahrá hodiny.</div>
                                                </div>
                                            </div>
                                            <input type="checkbox" checked={notifications.notify_logs} onChange={(e) => setNotifications({...notifications, notify_logs: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"/>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" loading={loading} fullWidth>Uložiť Zmeny</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><KeyRound className="text-orange-600" size={20}/> Zmena Hesla</h3>
                            <p className="text-sm text-slate-500 mb-6">Tu si môžete zmeniť svoje prihlasovacie heslo.</p>
                            
                            <form onSubmit={changePassword} className="space-y-4 max-w-md">
                                <Input label="Nové heslo" type="password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} required placeholder="••••••••" />
                                <Input label="Potvrdiť nové heslo" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                                <div className="pt-2">
                                    <Button type="submit" loading={loading} variant="secondary">Aktualizovať Heslo</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0">
                                    <Users size={24}/>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">Pripojenie zamestnancov</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Aby sa vaši zamestnanci mohli zaregistrovať do vašej firmy, musia pri registrácii zadať toto <strong>ID Firmy</strong>.
                                    </p>
                                    <div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-xl shadow-sm max-w-md">
                                        <code className="flex-1 font-mono text-sm font-bold text-slate-700 px-2 truncate">
                                            {profile.organization_id}
                                        </code>
                                        <button 
                                            onClick={copyOrgId}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            {copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>}
                                            {copied ? 'Skopírované' : 'Kopírovať'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>

        <AlertModal
            isOpen={alert.open}
            onClose={() => setAlert({ ...alert, open: false })}
            title={alert.title}
            message={alert.message}
            type={alert.type}
        />
    </div>
  );
};
