
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge, AlertModal } from '../components/UI';
import { CheckCircle2, ShieldCheck, Zap, Lock, CreditCard, LogOut, Star, ArrowLeft } from 'lucide-react';

export const SubscriptionScreen = ({ profile, organization, onSuccess, onLogout, onBack, isExpiredProp }: any) => {
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });

  // Mock Payment Function - In real app, this redirects to Stripe Checkout
  const handleSubscribe = async () => {
    setLoading(true);
    try {
        // SIMULÁCIA PLATBY - V reálnej aplikácii tu zavoláte backend endpoint
        // ktorý vytvorí Stripe Session a vráti redirect URL.
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

        // Update DB to active
        const { error } = await supabase.from('organizations').update({
            subscription_status: 'active',
            subscription_plan: 'pro'
        }).eq('id', organization.id);

        if (error) throw error;

        setAlert({ open: true, title: 'Platba úspešná', message: 'Vaše predplatné bolo aktivované. Ďakujeme!', type: 'success' });
        
        setTimeout(() => {
            onSuccess(); // Reload app
        }, 2000);

    } catch (err: any) {
        setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  // Check Expiration from Prop (Main App Source of Truth) OR Local calculation
  const isExpired = isExpiredProp || (organization.subscription_status !== 'active' && new Date(organization.trial_ends_at) < new Date());
  const isActive = organization.subscription_status === 'active';

  return (
    <div className="max-w-4xl mx-auto py-8 relative">
      
      {/* Back Button / Navigation */}
      {onBack && !isExpired && (
        <button 
            onClick={onBack}
            className="absolute top-0 left-0 text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2 transition hover:bg-slate-100 px-3 py-2 rounded-lg"
        >
            <ArrowLeft size={18}/> Späť
        </button>
      )}

      {/* Logout Button (Always Visible on Subscription Screen for Safety) */}
      <button 
          onClick={onLogout}
          className="absolute top-0 right-0 text-slate-400 hover:text-red-600 font-bold flex items-center gap-2 transition hover:bg-red-50 px-3 py-2 rounded-lg text-sm"
      >
          <LogOut size={16}/> Odhlásiť sa
      </button>

      {/* HEADER */}
      <div className="text-center mb-10 mt-8 md:mt-0">
         <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-3">
            <Zap className="text-orange-600 fill-orange-100" size={36} />
            Predplatné
         </h2>
         <p className="text-lg text-slate-500 mt-2 font-medium">Investujte do efektivity vašej firmy.</p>
      </div>

      {isExpired && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl mb-10 shadow-sm animate-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600"><Lock size={24}/></div>
                  <div>
                      <h3 className="text-lg font-bold text-red-700">Prístup zablokovaný (Koniec verzie zdarma)</h3>
                      <p className="text-red-600 mt-1">
                          Platnosť vašej skúšobnej verzie vypršala. Aby ste mohli naďalej využívať aplikáciu a pristupovať k dátam, aktivujte si prosím predplatné.
                          Vaše dáta sú v bezpečí a odomknú sa ihneď po aktivácii.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {isActive ? (
          <Card className="text-center py-12 border-green-200 bg-green-50/50">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                  <ShieldCheck size={40}/>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Máte aktívne PRO predplatné</h3>
              <p className="text-slate-600 mb-8">Ďakujeme za vašu dôveru. Všetky funkcie sú odomknuté.</p>
              <div className="bg-white inline-block px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs uppercase font-bold text-slate-400">Stav účtu</span>
                  <div className="font-bold text-green-600 flex items-center gap-2"><CheckCircle2 size={16}/> Aktívne</div>
              </div>
          </Card>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* PLAN CARD */}
              <div className="bg-white rounded-3xl border-2 border-orange-500 shadow-2xl overflow-hidden relative transform md:scale-105 z-10">
                  <div className="bg-orange-500 text-white text-center py-2 text-xs font-bold uppercase tracking-widest">Odporúčané</div>
                  <div className="p-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">MojaStavba PRO</h3>
                      <p className="text-slate-500 text-sm mb-6">Všetko čo potrebujete pre riadenie firmy.</p>
                      
                      <div className="flex items-baseline mb-8">
                          <span className="text-5xl font-extrabold text-slate-900">29€</span>
                          <span className="text-slate-500 font-medium ml-2">/ mesačne</span>
                      </div>

                      <ul className="space-y-4 mb-8">
                          {[
                              'Neobmedzený počet stavieb',
                              'Neobmedzený počet zamestnancov',
                              'Finančné reporty a exporty',
                              'Mobilná appka pre robotníkov',
                              'Zákaznícka podpora'
                          ].map((item, i) => (
                              <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                  <CheckCircle2 className="text-orange-500 shrink-0" size={20}/> {item}
                              </li>
                          ))}
                      </ul>

                      <Button 
                        onClick={handleSubscribe} 
                        loading={loading}
                        fullWidth 
                        size="lg" 
                        className="shadow-orange-200 shadow-xl"
                      >
                          {loading ? 'Spracovávam...' : 'Aktivovať Predplatné'}
                      </Button>
                      <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
                          <Lock size={10}/> Bezpečná platba cez Stripe
                      </p>
                  </div>
              </div>

              {/* INFO CARD */}
              <div className="md:pl-4 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-3"><CreditCard size={20}/></div>
                      <h4 className="font-bold text-slate-900 mb-1">Ako to funguje?</h4>
                      <p className="text-sm text-slate-600">Po kliknutí na aktiváciu budete presmerovaný na bezpečnú platobnú bránu. Platba sa strháva automaticky každý mesiac. Zrušiť môžete kedykoľvek.</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-3"><Star size={20}/></div>
                      <h4 className="font-bold text-slate-900 mb-1">Garancia spokojnosti</h4>
                      <p className="text-sm text-slate-600">Ak nebudete spokojní počas prvých 30 dní plateného členstva, vrátime vám peniaze v plnej výške.</p>
                  </div>
              </div>
          </div>
      )}

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
