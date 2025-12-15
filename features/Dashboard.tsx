
import React, { useEffect, useState } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Card, Button, Modal, Badge } from '../components/UI';
import { Building2, Users, AlertCircle, Calendar, ArrowRight, CheckCircle2, LayoutGrid, Clock, MapPin, User, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const DashboardScreen = ({ profile, organization, onNavigate }: { profile: UserProfile, organization: any, onNavigate: (view: string) => void }) => {
  const [stats, setStats] = useState({ sites: 0, users: 0, activeTasks: 0 });
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile.organization_id) return;
      
      // FIX: Calculate dates based on midnight (start of day) to capture "Today's" tasks correctly
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to midnight local time
      const todayStartIso = now.toISOString();

      const futureDate = new Date(now);
      futureDate.setDate(now.getDate() + 4); // Look 4 days ahead
      futureDate.setHours(23, 59, 59, 999);
      const futureEndIso = futureDate.toISOString();

      const [s, u, overdue, upcoming, activeT] = await Promise.all([
        supabase.from('sites').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('is_active', true),
        // Overdue: Strictly older than today's midnight AND not done
        supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).eq('status', 'todo').lt('start_date', todayStartIso).order('start_date'),
        // Upcoming/Today: From today's midnight onwards
        supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).gte('start_date', todayStartIso).lte('start_date', futureEndIso).order('start_date'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('status', 'todo')
      ]);
      
      setStats({ 
        sites: s.count || 0, 
        users: u.count || 0,
        activeTasks: activeT.count || 0
      });
      
      if(overdue.data) setOverdueTasks(overdue.data);
      if(upcoming.data) setUpcomingTasks(upcoming.data);
      setLoading(false);
    };
    load();
  }, [profile]);

  // Helper to check if a date is today
  const isDateToday = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  // Helper to format time range HH:MM - HH:MM
  const formatTimeRange = (startIso: string, endIso: string) => {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const sTime = start.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'});
      const eTime = end.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'});
      return `${sTime} - ${eTime}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutGrid className="text-orange-600" size={32} />
              Prehľad Firmy
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">
  Vitajte, <span className="text-slate-500 font-medium">{organization?.name}</span>
</p>
        </div>
      </div>

      {/* QUICK STATS CARDS - MOVED UP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => onNavigate('sites')} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer hover:border-orange-200 hover:shadow-md transition group">
               <div className="flex justify-between items-start mb-4">
                   <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
                       <Building2 size={24}/>
                   </div>
                   <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-orange-50 group-hover:text-orange-600 transition">
                       Projekty <ArrowRight size={12}/>
                   </div>
               </div>
               <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats.sites}</div>
               <div className="text-sm text-slate-500 font-medium">Aktívne Stavby</div>
          </div>

          <div onClick={() => onNavigate('team')} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer hover:border-orange-200 hover:shadow-md transition group">
               <div className="flex justify-between items-start mb-4">
                   <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                       <Users size={24}/>
                   </div>
                   <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-orange-50 group-hover:text-orange-600 transition">
                       Tím <ArrowRight size={12}/>
                   </div>
               </div>
               <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats.users}</div>
               <div className="text-sm text-slate-500 font-medium">Aktívnych zamestnancov</div>
          </div>

          <div onClick={() => onNavigate('calendar')} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-pointer hover:border-orange-200 hover:shadow-md transition group">
               <div className="flex justify-between items-start mb-4">
                   <div className="bg-purple-50 text-purple-600 p-3 rounded-xl">
                       <CheckCircle2 size={24}/>
                   </div>
                   <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-orange-50 group-hover:text-orange-600 transition">
                       Kalendár <ArrowRight size={12}/>
                   </div>
               </div>
               <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats.activeTasks}</div>
               <div className="text-sm text-slate-500 font-medium">Nedokončených úloh</div>
          </div>
      </div>

      {/* TASKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* OVERDUE TASKS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <div className="bg-red-100 p-1.5 rounded-lg text-red-600"><AlertCircle size={18}/></div> 
              V omeškaní
            </h3>
            {overdueTasks.length > 0 && <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{overdueTasks.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {overdueTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <div className="bg-green-50 p-4 rounded-full mb-3"><CheckCircle2 size={32} className="text-green-500"/></div>
                <span className="font-medium">Všetky staré termíny sú vyriešené.</span>
              </div>
            ) : (
              overdueTasks.map(task => (
                <div key={task.id} onClick={() => setSelectedTask(task)} className="p-4 bg-white border border-red-100 hover:border-red-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div className="flex justify-between items-start mb-1 pl-2">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1">
                        <Calendar size={12}/> {new Date(task.start_date).toLocaleDateString('sk-SK', {day: 'numeric', month: 'numeric'})} • {formatTimeRange(task.start_date, task.end_date)}
                    </span>
                    {task.sites && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><MapPin size={10}/> {task.sites.name}</span>}
                  </div>
                  
                  {/* Task Content */}
                  <div className="pl-2">
                      <h4 className="font-bold text-slate-800 group-hover:text-red-600 transition truncate pr-2" title={task.title}>{task.title}</h4>
                      {task.description && (
                        <div className="text-xs text-slate-400 font-medium truncate mt-0.5 pr-2 opacity-80" title={task.description}>
                            {task.description}
                        </div>
                      )}
                  </div>

                  {task.profiles && <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 pl-2"><User size={12}/> {task.profiles.full_name}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* UPCOMING TASKS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-white">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Calendar size={18}/></div>
              Nadchádzajúce 
            </h3>
            {upcomingTasks.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{upcomingTasks.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {upcomingTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <div className="bg-slate-50 p-4 rounded-full mb-3"><Calendar size={32} className="text-slate-300"/></div>
                <span className="font-medium">Žiadne úlohy na najbližšie dni.</span>
              </div>
            ) : (
              upcomingTasks.map(task => {
                const isToday = isDateToday(task.start_date);
                return (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className={`p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden ${isToday ? 'border-orange-200 hover:border-orange-400' : 'border-slate-200 hover:border-blue-400'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isToday ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                    <div className="flex justify-between items-start mb-1 pl-2">
                      <span className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${isToday ? 'text-orange-600' : 'text-blue-500'}`}>
                          {isToday ? (
                            <><Clock size={12} className="animate-pulse"/> DNES • {formatTimeRange(task.start_date, task.end_date)}</>
                          ) : (
                            <><Calendar size={12}/> {new Date(task.start_date).toLocaleDateString('sk-SK', {weekday: 'short', day: 'numeric', month: 'numeric'})} • {formatTimeRange(task.start_date, task.end_date)}</>
                          )}
                      </span>
                      {task.sites && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><MapPin size={10}/> {task.sites.name}</span>}
                    </div>
                    
                    {/* Task Content */}
                    <div className="pl-2">
                        <h4 className={`font-bold transition truncate pr-2 ${isToday ? 'text-slate-900 group-hover:text-orange-600' : 'text-slate-800 group-hover:text-blue-600'}`} title={task.title}>{task.title}</h4>
                        {task.description && (
                            <div className="text-xs text-slate-400 font-medium truncate mt-0.5 pr-2 opacity-80" title={task.description}>
                                {task.description}
                            </div>
                        )}
                    </div>
                    
                    {task.profiles && <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 pl-2"><User size={12}/> {task.profiles.full_name}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
          <Modal title="Detail Úlohy" onClose={() => setSelectedTask(null)}>
              <div className="space-y-6">
                  <div>
                      <div className="text-xs uppercase font-bold text-slate-400 mb-1">Názov úlohy</div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedTask.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-xs uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><Calendar size={12}/> Termín</div>
                          <div className="font-medium">
                              {new Date(selectedTask.start_date).toLocaleDateString('sk-SK')} <br/>
                              <span className="text-sm text-slate-500">{formatTimeRange(selectedTask.start_date, selectedTask.end_date)}</span>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-xs uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><MapPin size={12}/> Stavba</div>
                          <div className="font-medium">{selectedTask.sites?.name || 'Všeobecné'}</div>
                      </div>
                  </div>

                  <div>
                      <div className="text-xs uppercase font-bold text-slate-400 mb-1">Popis</div>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                          {selectedTask.description || "Bez popisu."}
                      </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User size={16}/></div>
                      <div>
                          <div className="text-xs text-slate-400 font-bold uppercase">Priradený</div>
                          <div className="font-bold text-slate-800">{selectedTask.profiles?.full_name || 'Nikto'}</div>
                      </div>
                  </div>

                  <div className="pt-2">
                      <Button fullWidth onClick={() => onNavigate('calendar')}>Prejsť do Kalendára</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
