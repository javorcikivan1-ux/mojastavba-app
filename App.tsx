
import React, { useState, useEffect } from 'react';
import { supabase, UserProfile } from './lib/supabase';
import { Button, Card, Input, Badge, AlertModal } from './components/UI';
import { DashboardScreen } from './features/Dashboard';
import { ProjectsScreen } from './features/Projects';
import { FinanceScreen } from './features/Finance';
import { CalendarScreen } from './features/Calendar';
import { TeamScreen } from './features/Team';
import { WorkerModeScreen } from './features/WorkerMode';
import { AnalyticsScreen } from './features/Analytics';
import { SettingsScreen } from './features/Settings';
import { SubscriptionScreen } from './features/Subscription';
import { UpdatesScreen } from './features/Updates'; // New Import

import { 
  BarChart3, Building2, Calendar, Wallet, Users, LogOut, Menu, X, 
  HardHat, ChevronRight, Clock, CheckCircle2, Copy, Database, ArrowLeft, 
  AlertCircle, Loader2, PieChart, Settings, LayoutGrid, Briefcase, UserPlus, Lock, CreditCard, RefreshCw
} from 'lucide-react';

// --- SQL PRE INŠTALÁCIU DATABÁZY (VERZIA 3 - TRIGGERS) ---
const SETUP_SQL = `
-- 1. RESET (VYMAZANIE VŠETKÉHO)
drop table if exists quote_items cascade;
drop table if exists quotes cascade;
drop table if exists attendance_logs cascade;
drop table if exists materials cascade;
drop table if exists transactions cascade;
drop table if exists tasks cascade;
drop table if exists sites cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;

-- 2. VYTVORENIE TABULIEK
create table organizations (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  pin_code text default '0000',
  logo_url text,
  subscription_plan text default 'free_trial', 
  subscription_status text default 'trialing',
  trial_ends_at timestamp with time zone default (now() + interval '14 days'),
  stripe_customer_id text
);

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text default 'employee',
  full_name text,
  organization_id uuid references organizations(id),
  hourly_rate numeric(10,2) default 0,
  phone text,
  is_active boolean default true,
  settings jsonb default '{"notify_tasks": true, "notify_logs": true}', 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table sites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  client_name text,
  status text default 'lead',
  budget numeric(12,2) default 0,
  organization_id uuid references organizations(id) not null,
  notes text
);

create table quotes (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  site_id uuid references sites(id) on delete cascade,
  quote_number text,
  client_name text,
  client_address text,
  total_amount numeric(12,2) default 0,
  issue_date date default CURRENT_DATE,
  valid_until date,
  status text check (status in ('draft', 'sent', 'accepted', 'rejected')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table quote_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit text default 'ks',
  unit_price numeric(10,2) default 0,
  total_price numeric(12,2) default 0
);

create table transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade,
  organization_id uuid references organizations(id) not null,
  type text not null check (type in ('invoice', 'expense')),
  category text not null,
  amount numeric(12,2) not null default 0,
  date date not null,
  description text,
  is_paid boolean default false
);

create table materials (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade not null,
  organization_id uuid references organizations(id) not null,
  name text not null,
  quantity numeric(10,2) default 0,
  unit text default 'ks',
  unit_price numeric(10,2) default 0,
  total_price numeric(12,2) default 0,
  supplier text,
  purchase_date date
);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade,
  organization_id uuid references organizations(id) not null,
  title text not null,
  description text,
  status text default 'todo',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  color text default '#f97316',
  assigned_to uuid references profiles(id)
);

create table attendance_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  site_id uuid references sites(id),
  organization_id uuid references organizations(id) not null,
  hours numeric(10,2) not null default 0,
  hourly_rate_snapshot numeric(10,2) default 0,
  description text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. AUTOMATIZÁCIA (TRIGGERS)
-- Toto rieši problém s RLS pri registrácii. Profil a Firma sa vytvoria automaticky databázou.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
begin
  -- Pripad 1: Nova Firma (Admin)
  if new.raw_user_meta_data->>'company_name' is not null then
    -- Vytvor Firmu
    insert into public.organizations (name, created_by)
    values (new.raw_user_meta_data->>'company_name', new.id)
    returning id into org_id;
    
    -- Vytvor Profil Admina
    insert into public.profiles (id, email, full_name, role, organization_id, hourly_rate)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin', org_id, 0);
    
  -- Pripad 2: Zamestnanec
  elsif new.raw_user_meta_data->>'company_id' is not null then
    -- Vytvor Profil Zamestnanca
    insert into public.profiles (id, email, full_name, role, organization_id, hourly_rate)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'employee', (new.raw_user_meta_data->>'company_id')::uuid, 0);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger, ktorý sa spustí po vytvorení usera v auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. BEZPEČNOSŤ (RLS)
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table sites enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table transactions enable row level security;
alter table materials enable row level security;
alter table tasks enable row level security;
alter table attendance_logs enable row level security;

create or replace function get_my_org_id()
returns uuid as $$
  select organization_id from profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- POLITIKY (Teraz stačí riešiť len SELECT/UPDATE, inserty rieši trigger)
create policy "Access own org" on organizations for all using (id = get_my_org_id() OR created_by = auth.uid());
create policy "Access own profile" on profiles for all using (id = auth.uid() or organization_id = get_my_org_id());

create policy "Org Access Sites" on sites for all using (organization_id = get_my_org_id());
create policy "Org Access Quotes" on quotes for all using (organization_id = get_my_org_id());
create policy "Org Access Items" on quote_items for all using (quote_id in (select id from quotes where organization_id = get_my_org_id()));
create policy "Org Access Transactions" on transactions for all using (organization_id = get_my_org_id());
create policy "Org Access Materials" on materials for all using (organization_id = get_my_org_id());
create policy "Org Access Tasks" on tasks for all using (organization_id = get_my_org_id());
create policy "Org Access Logs" on attendance_logs for all using (organization_id = get_my_org_id());

-- Povolit inserty pre tabulky vnutri aplikacie (uz overeny user)
create policy "Org Insert Sites" on sites for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Quotes" on quotes for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Transactions" on transactions for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Materials" on materials for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Tasks" on tasks for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Logs" on attendance_logs for insert with check (organization_id = get_my_org_id());

NOTIFY pgrst, 'reload schema';
`;

// --- SETUP MODAL ---
const SetupModal = ({ onClose }: { onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Kopírovanie zlyhalo, skopírujte text manuálne.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-orange-600" />
            Oprava Databázy (Verzia 3 - Trigger)
          </h2>
          <button onClick={onClose}><X className="text-slate-500" /></button>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg mb-4 text-sm text-orange-800 border border-orange-200">
          <strong>Inštrukcie:</strong>
          <ol className="list-decimal ml-4 mt-2 font-medium space-y-1">
            <li>Skopírujte SQL kód nižšie.</li>
            <li>Otvorte <a href="https://supabase.com/dashboard" target="_blank" className="underline hover:text-orange-600">Supabase SQL Editor</a>.</li>
            <li>Vložte kód a kliknite <strong>Run</strong>.</li>
            <li>Potom sa môžete bezpečne zaregistrovať.</li>
          </ol>
          <div className="mt-2 text-xs text-red-600 font-bold">Pozor: Tento skript vymaže existujúce dáta (nie používateľov).</div>
        </div>
        <div className="relative flex-1 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
          <button onClick={handleCopy} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs flex items-center gap-2 transition">
            {copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>} {copied ? "Hotovo" : "Kopírovať"}
          </button>
          <pre className="p-4 text-xs text-green-400 font-mono overflow-auto h-64 md:h-80 text-left custom-scrollbar">{SETUP_SQL}</pre>
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button onClick={onClose}>Zavrieť</Button></div>
      </Card>
    </div>
  );
};

// --- LANDING PAGE ---
const LandingScreen = ({ onStart, onLogin, onWorker }: { onStart: () => void, onLogin: () => void, onWorker: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-600 p-1.5 rounded-lg shadow-lg shadow-orange-200">
              <HardHat className="text-white w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">Moja<span className="text-orange-600">Stavba</span></span>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="ghost" onClick={onLogin} className="hover:bg-orange-50 hover:text-orange-600 font-bold transition-colors">Prihlásiť</Button>
          </div>
        </div>
      </nav>

      <section className="pt-20 pb-24 px-4 bg-gradient-to-b from-orange-50/50 to-white text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-orange-100 px-3 py-1 rounded-full text-xs font-bold text-orange-600 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
            Verzia 4.3 Online
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Stavebný manažment<br/>
            <span className="text-orange-600">pre moderné firmy.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Kompletná správa stavieb, dochádzky a financií v jednej aplikácii. 
            <strong>Vyskúšajte na 14 dní zadarmo.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={onStart} size="lg" className="shadow-xl shadow-orange-200 w-full sm:w-auto">
              Vytvoriť Firemný Účet <ChevronRight size={20} />
            </Button>
             <Button onClick={onWorker} variant="secondary" size="lg" className="shadow-md hover:shadow-lg hover:border-orange-200 hover:text-orange-700 bg-white border-slate-100 text-slate-700 w-full sm:w-auto group">
              <HardHat size={20} className="text-orange-500 group-hover:text-orange-600"/> Vytvoriť Zamestnanecký Účet
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="hover:shadow-xl transition-all duration-300 border-t-4 border-orange-500">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-6"><PieChart size={28} /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Analytika Zisku</h3>
            <p className="text-slate-600">Presné grafy ziskovosti projektov a cashflow firmy v reálnom čase.</p>
          </Card>
          <Card className="hover:shadow-xl transition-all duration-300 border-t-4 border-slate-500">
             <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-6"><Users size={28} /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Zamestnanecký Portál</h3>
            <p className="text-slate-600">Bezpečný prístup pre robotníkov na stavbe na rýchly zápis hodín cez vlastný účet.</p>
          </Card>
          <Card className="hover:shadow-xl transition-all duration-300 border-t-4 border-orange-500">
             <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-6"><Wallet size={28} /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Mzdy a Výdavky</h3>
            <p className="text-slate-600">Automatický výpočet miezd podľa odpracovaných hodín a sadzieb.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};

// --- LOGIN SCREEN ---
const LoginScreen = ({ onLogin, initialView = 'login', initialCompanyId = '', onBackToLanding }: any) => {
  const [view, setView] = useState(initialView); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  
  const [alertInfo, setAlertInfo] = useState<{open: boolean, title: string, message: string}>({ open: false, title: '', message: '' });

  useEffect(() => {
      if(initialView) setView(initialView);
      if(initialCompanyId) setCompanyId(initialCompanyId);
  }, [initialView, initialCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if(view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) throw error;
        // Auth state change will handle redirection
      } 
      else if (view === 'register-admin') {
        // POSIELAME METADATA PRE TRIGGER, NEVKLADAME DATA MANUALNE
        const { data: auth, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    company_name: companyName, // Tento klúč aktivuje trigger pre novú firmu
                    role: 'admin'
                }
            }
        });
        
        if(authError) throw authError;
        
        if (auth.session) {
            onLogin();
        } else {
            setAlertInfo({ open: true, title: "Registrácia úspešná", message: "Na váš email sme poslali overovací odkaz. Po kliknutí sa budete môcť prihlásiť." });
            setView('login');
        }
      }
      else if (view === 'register-emp') {
          // Check if org exists first (Optional, but good UX)
          const { data: org, error: orgCheckError } = await supabase.from('organizations').select('id, name').eq('id', companyId.trim()).single();
          if(orgCheckError || !org) throw new Error("Firma s týmto ID neexistuje. Skontrolujte kód.");

          // POSIELAME METADATA PRE TRIGGER
          const { data: auth, error: authError } = await supabase.auth.signUp({ 
              email, 
              password,
              options: {
                  data: {
                      full_name: fullName,
                      company_id: companyId.trim(), // Tento klúč aktivuje trigger pre zamestnanca
                      role: 'employee'
                  }
              }
          });
          
          if(authError) throw authError;

          if (auth.session) {
              onLogin();
          } else {
              setAlertInfo({ open: true, title: "Vitajte!", message: `Registrácia do firmy "${org.name}" prebehla úspešne! Skontrolujte si email pre overenie účtu.` });
              setView('login');
          }
      }
    } catch(e: any) {
      const msg = e.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
      onBackToLanding();
  };

  const switchToLogin = () => {
    setView('login');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
      <Card className="w-full max-w-md shadow-xl border-slate-200 animate-in zoom-in-95 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4 text-orange-600 border border-orange-100">
            <HardHat size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MojaStavba</h1>
          <p className="text-slate-500">
              {view === 'login' && 'Prihlásenie do systému'}
              {view === 'selection' && 'Vyberte typ registrácie'}
              {view === 'register-admin' && 'Registrácia novej firmy'}
              {view === 'register-emp' && 'Registrácia zamestnanca'}
          </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={16}/>
                <div>{error}</div>
            </div>
        )}

        {view === 'selection' ? (
             <div className="space-y-4">
                 <button onClick={() => setView('register-admin')} className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition group flex items-center gap-4 text-left">
                    <div className="bg-white p-3 rounded-full border border-slate-200 group-hover:border-orange-200 text-slate-400 group-hover:text-orange-600 transition">
                        <Building2 size={24}/>
                    </div>
                    <div>
                        <div className="font-bold text-slate-800">Firemný Účet (Majiteľ)</div>
                        <div className="text-xs text-slate-500">Založiť novú firmu + 14 dní zadarmo</div>
                    </div>
                    <ChevronRight className="ml-auto text-slate-300 group-hover:text-orange-400"/>
                 </button>

                 <button onClick={() => { setCompanyId(''); setView('register-emp'); }} className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition group flex items-center gap-4 text-left">
                    <div className="bg-white p-3 rounded-full border border-slate-200 group-hover:border-blue-200 text-slate-400 group-hover:text-blue-600 transition">
                        <HardHat size={24}/>
                    </div>
                    <div>
                        <div className="font-bold text-slate-800">Zamestnanecký Účet</div>
                        <div className="text-xs text-slate-500">Mám ID firmy a chcem sa pridať</div>
                    </div>
                    <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-400"/>
                 </button>

                 <div className="pt-4">
                    <button onClick={switchToLogin} className="w-full py-2 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center gap-2">
                        <ArrowLeft size={16}/> Späť na prihlásenie
                    </button>
                 </div>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            
            {view === 'register-admin' && (
                <>
                <Input label="Názov Firmy" value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} required placeholder="Moja Stavebná s.r.o." />
                <Input label="Vaše Meno (Majiteľ)" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Staviteľ" />
                </>
            )}

            {view === 'register-emp' && (
                <>
                <div className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12}/> ID Firmy (Povinné)</label>
                    <input 
                        type="text" 
                        name="company_id_field_random"
                        autoComplete="off"
                        value={companyId} 
                        onChange={(e: any) => setCompanyId(e.target.value)} 
                        required 
                        placeholder="Vložte ID firmy" 
                        className="w-full bg-white border border-blue-200 rounded-lg p-2 font-mono text-sm"
                        readOnly={!!initialCompanyId} 
                    />
                    {!!initialCompanyId && <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Automaticky načítané z pozvánky</p>}
                </div>
                <Input label="Vaše Meno" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Novák" />
                </>
            )}

            <Input label="Email" type="email" name="new_email" autoComplete="new-password" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="meno@mail.sk" />
            <Input label="Heslo" type="password" name="new_password" autoComplete="new-password" value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" />
            
            <Button type="submit" fullWidth loading={loading} size="lg">
                {view === 'login' ? 'Prihlásiť sa' : 'Vytvoriť Účet'}
            </Button>
            </form>
        )}

        {view !== 'selection' && (
            <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                {view === 'login' ? (
                    <button onClick={() => { setView('selection'); setError(null); }} className="text-slate-500 hover:text-orange-600 font-medium">
                        Nemáte účet? <span className="underline font-bold">Zaregistrujte sa</span>
                    </button>
                ) : (
                    <>
                        <button onClick={switchToLogin} className="text-slate-500 hover:text-slate-900 font-medium">
                            Máte už účet? <span className="underline font-bold text-orange-600">Prihláste sa</span>
                        </button>
                        <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
                            <ArrowLeft size={14}/> Späť na úvod
                        </button>
                    </>
                )}
            </div>
        )}

        {/* --- MANUAL SQL SETUP TRIGGER --- */}
        <button 
            onClick={() => setShowSetup(true)}
            className="absolute -bottom-10 right-0 text-[10px] text-slate-400 hover:text-orange-600 font-bold uppercase tracking-widest flex items-center gap-1"
        >
            <Database size={12}/> Oprava DB (SQL)
        </button>

      </Card>

      <AlertModal 
        isOpen={alertInfo.open} 
        title={alertInfo.title} 
        message={alertInfo.message} 
        onClose={() => setAlertInfo({...alertInfo, open: false})}
      />
    </div>
  );
};

// --- APP COMPONENT ---
export const App = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [view, setView] = useState('landing'); // landing, login, app, worker
  const [activeScreen, setActiveScreen] = useState('dashboard'); 
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Check URL params for invite
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'register-emp') {
          setView('login');
      }
  }, []);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
          setProfile(null);
          setOrganization(null);
          setView('landing');
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      setLoading(true);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if(prof) {
          setProfile(prof);
          const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
          setOrganization(org);
          setView('app');
      }
      setLoading(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setView('landing');
      setProfile(null);
      setOrganization(null);
  };

  const isTrialExpired = () => {
      if(!organization) return false;
      if(organization.subscription_status === 'active') return false;
      const ends = new Date(organization.trial_ends_at);
      return ends < new Date();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={40}/></div>;

  if (view === 'landing') return <LandingScreen onStart={() => setView('login')} onLogin={() => setView('login')} onWorker={() => setView('login')} />;

  // Custom logic for URL params inside LoginScreen to pre-fill company ID
  const params = new URLSearchParams(window.location.search);
  const inviteCompanyId = params.get('companyId') || '';
  const inviteAction = params.get('action');

  if (view === 'login') return (
      <LoginScreen 
        onLogin={() => {}} // Auth state change handles redirection
        initialView={inviteAction === 'register-emp' ? 'register-emp' : 'login'}
        initialCompanyId={inviteCompanyId}
        onBackToLanding={() => setView('landing')}
      />
  );

  // APP VIEW
  if (view === 'app' && profile && organization) {
      // Check Subscription Lock
      if (isTrialExpired() && activeScreen !== 'subscription') {
           return <SubscriptionScreen profile={profile} organization={organization} isExpiredProp={true} onSuccess={() => window.location.reload()} onLogout={handleLogout} />;
      }

      // If Employee Role -> Worker Mode UI
      if(profile.role === 'employee') {
           return (
               <div className="min-h-screen bg-slate-50 p-4">
                   <div className="max-w-md mx-auto relative pt-10">
                       <button onClick={handleLogout} className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 flex items-center gap-1 font-bold text-xs uppercase"><LogOut size={16}/> Odhlásiť</button>
                       <WorkerModeScreen profile={profile} />
                   </div>
               </div>
           );
      }

      // ---------- ADMIN DASHBOARD LAYOUT ----------
      // ✅ Tu je jediná zmena: Sidebar vizuál = pôvodný svetlý/oranžový + menu bez sekcií
      const AdminNavItem = ({ id, label, icon: Icon }: any) => (
        <button
          onClick={() => { setActiveScreen(id); setSelectedSiteId(null); }}
          className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium
            ${activeScreen === id
              ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <Icon
            size={20}
            className={`transition-colors
              ${activeScreen === id
                ? 'text-orange-600'
                : 'text-slate-400 group-hover:text-orange-600'
              }`}
          />
          {label}
        </button>
      );

      return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
             {/* Sidebar (Desktop) */}
             <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200">
                 <div className="p-6 flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                         <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-200">
                             <HardHat size={20} className="text-white"/>
                         </div>
                         <div className="min-w-0">
                           <div className="font-extrabold text-xl tracking-tight text-slate-800">
                             Moja<span className="text-orange-600">Stavba</span>
                           </div>
                           <div className="text-xs text-slate-500 font-medium truncate">
                             {organization.name}
                           </div>
                         </div>
                     </div>
                 </div>

                 {/* TRIAL BANNER – len počas trialu */}
{organization.subscription_status !== 'active' && (
  <div className="mx-4 mb-3 px-4 py-3 bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <Clock size={16} className="text-orange-600"/>
      <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
        Skúšobná verzia
      </span>
    </div>

    <div className="text-sm font-medium text-slate-700">
      Ostáva{' '}
      <strong>
        {Math.max(
          0,
          Math.ceil(
            (new Date(organization.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )}{' '}
        dní
      </strong>
      .
    </div>

    <button
      onClick={() => setActiveScreen('subscription')}
      className="mt-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg w-full transition shadow-sm"
    >
      Aktivovať plnú verziu
    </button>
  </div>
)}


                 {/* ✅ Ploché menu (bez sekcií) */}
                 <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2 custom-scrollbar">
                    <AdminNavItem id="dashboard" label="Prehľad" icon={LayoutGrid} />
                    <AdminNavItem id="projects" label="Stavby" icon={Building2} />
                    <AdminNavItem id="finance" label="Financie" icon={Wallet} />
                    <AdminNavItem id="calendar" label="Kalendár" icon={Calendar} />
                    <AdminNavItem id="team" label="Tím" icon={Users} />
                    <AdminNavItem id="analytics" label="Analytika" icon={BarChart3} />
                    <AdminNavItem id="settings" label="Nastavenia" icon={Settings} />
                    <AdminNavItem id="updates" label="Aktualizácie" icon={RefreshCw} />
                    <AdminNavItem id="subscription" label="Predplatné" icon={CreditCard} />
                 </nav>

                 {/* Footer – pôvodný light štýl */}
                 <div className="p-4 pb-8 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-3 px-2 pt-2">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shadow-sm shrink-0">
                            {organization?.logo_url ? (
                                <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover"/>
                            ) : (
                                profile.full_name?.charAt(0)
                            )}
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                        </div>
                    </div>

                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={handleLogout}
                      className="text-slate-500 hover:text-red-500 hover:bg-red-50 justify-start px-2 h-9 text-xs"
                    >
                      <LogOut size={16} className="mr-2"/> Odhlásiť sa
                    </Button>
                 </div>
             </aside>

             {/* Main Content */}
             <main className="flex-1 overflow-auto relative flex flex-col">
                 {/* Mobile Header */}
                 <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30">
                     <div className="font-bold text-slate-900 flex items-center gap-2">
                         <div className="bg-orange-600 p-1 rounded"><HardHat size={16} className="text-white"/></div>
                         MojaStavba
                     </div>
                     <button onClick={handleLogout} className="text-slate-400"><LogOut size={20}/></button>
                 </div>
                 
                 {/* Mobile Navigation (Simple Bottom Bar) */}
                 <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-6 py-2 z-40 safe-area-pb">
                      <button onClick={() => setActiveScreen('dashboard')} className={`p-2 rounded-lg ${activeScreen === 'dashboard' ? 'text-orange-600' : 'text-slate-400'}`}><LayoutGrid size={24}/></button>
                      <button onClick={() => setActiveScreen('projects')} className={`p-2 rounded-lg ${activeScreen === 'projects' ? 'text-orange-600' : 'text-slate-400'}`}><Building2 size={24}/></button>
                      <button onClick={() => setActiveScreen('finance')} className={`p-2 rounded-lg ${activeScreen === 'finance' ? 'text-orange-600' : 'text-slate-400'}`}><Wallet size={24}/></button>
                      <button onClick={() => setActiveScreen('team')} className={`p-2 rounded-lg ${activeScreen === 'team' ? 'text-orange-600' : 'text-slate-400'}`}><Users size={24}/></button>
                      <button onClick={() => setActiveScreen('settings')} className={`p-2 rounded-lg ${activeScreen === 'settings' ? 'text-orange-600' : 'text-slate-400'}`}><Settings size={24}/></button>
                 </div>

                 <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mb-16 md:mb-0">
                      {activeScreen === 'dashboard' && <DashboardScreen profile={profile} organization={organization} onNavigate={setActiveScreen} />}
                      {activeScreen === 'projects' && <ProjectsScreen profile={profile} organization={organization} onSelect={setSelectedSiteId} selectedSiteId={selectedSiteId} />}
                      {activeScreen === 'finance' && <FinanceScreen profile={profile} />}
                      {activeScreen === 'calendar' && <CalendarScreen profile={profile} />}
                      {activeScreen === 'team' && <TeamScreen profile={profile} />}
                      {activeScreen === 'analytics' && <AnalyticsScreen profile={profile} />}
                      {activeScreen === 'settings' && <SettingsScreen profile={profile} organization={organization} onUpdateOrg={setOrganization} />}
                      {activeScreen === 'updates' && <UpdatesScreen />}
                      {activeScreen === 'subscription' && <SubscriptionScreen profile={profile} organization={organization} onSuccess={() => { fetchProfile(profile.id); setActiveScreen('dashboard'); }} onLogout={handleLogout} />}
                 </div>
             </main>
        </div>
      );
  }

  return null;
};