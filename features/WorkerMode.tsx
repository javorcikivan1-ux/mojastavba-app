
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, AlertModal } from '../components/UI';
import { HardHat, Building2, Calendar, Clock, CheckCircle2, Send, Loader2 } from 'lucide-react';

export const WorkerModeScreen = ({ profile }: { profile: any }) => {
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form Data
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alert, setAlert] = useState<{open: boolean, message: string}>({ open: false, message: '' });

  useEffect(() => {
    const loadProjects = async () => {
        // Fetch projects for the employee's organization
        const { data } = await supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active');
        if(data) setProjects(data);
    };
    loadProjects();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if(!selectedProject) throw new Error("Vyberte stavbu.");
        if(!hours) throw new Error("Zadajte počet hodín.");

        // Insert Log using current user ID
        const { error } = await supabase.from('attendance_logs').insert([{
            organization_id: profile.organization_id,
            user_id: profile.id, // Authenticated User ID
            site_id: selectedProject,
            date: date,
            hours: parseFloat(hours),
            description: desc,
            hourly_rate_snapshot: profile.hourly_rate || 0
        }]);

        if(error) throw error;
        
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setHours('');
            setDesc('');
        }, 2000);

    } catch (err: any) {
        setAlert({ open: true, message: err.message });
    } finally {
        setLoading(false);
    }
  };

  if(success) {
      return (
          <div className="h-full flex items-center justify-center text-green-600 bg-white rounded-2xl shadow-sm border border-green-100 p-8">
              <div className="text-center animate-in zoom-in duration-300">
                  <CheckCircle2 size={80} className="mx-auto mb-4 drop-shadow-md"/>
                  <h1 className="text-3xl font-extrabold mb-2">Odoslané!</h1>
                  <p className="opacity-90 font-medium text-lg text-slate-600">Výkaz bol úspešne zapísaný.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full items-center">
      <div className="w-full max-w-lg space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Clock className="text-orange-600" size={32} />
                Zápis práce
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Vyplňte, čo ste dnes robili a odošlite to šéfovi.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
              <Card className="border-l-4 border-l-orange-500 shadow-md">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Kde si robil?</label>
                  <div className="relative">
                    <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} required className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 appearance-none outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition cursor-pointer">
                        <option value="">-- Vyber stavbu --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  </div>
              </Card>

              <Card className="border-l-4 border-l-orange-500 shadow-md">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Dátum a Čas</label>
                  <div className="space-y-4">
                      <div className="relative">
                          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:border-orange-500"/>
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                      </div>
                      <div className="relative">
                          <input type="number" step="0.5" placeholder="Počet hodín" value={hours} onChange={e => setHours(e.target.value)} required className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:border-orange-500 text-xl"/>
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">hod</span>
                      </div>
                  </div>
              </Card>

              <Card className="border-l-4 border-l-orange-500 shadow-md">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Čo sa robilo?</label>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Napr. Murovanie, Upratovanie..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-orange-500 h-28 font-medium text-lg" required></textarea>
              </Card>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-300 text-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin"/> : <Send size={24}/>}
                  {loading ? 'Odosielam...' : 'ODOSLAŤ VÝKAZ'}
              </button>
          </form>
      </div>
      
      <AlertModal
        isOpen={alert.open}
        onClose={() => setAlert({ open: false, message: '' })}
        title="Chyba"
        message={alert.message}
        type="error"
      />
    </div>
  );
};
