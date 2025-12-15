
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Modal, Input, Select, ConfirmModal } from '../components/UI';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';

// Configuration for calendar hours
const START_HOUR = 5; // Start at 5:00 AM
const DAY_HOURS = 18; // Show 18 hours (5:00 - 23:00)

export const CalendarScreen = ({ profile }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState<any>({});
  
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string | null}>({ open: false, id: null });

  const weekStart = new Date(currentDate);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  weekStart.setDate(diff);
  weekStart.setHours(0,0,0,0);

  const weekDays = Array.from({length: 7}, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const loadData = async () => {
    const startStr = weekStart.toISOString();
    const endStr = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [t, s, u] = await Promise.all([
      supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).gte('start_date', startStr).lt('start_date', endStr),
      supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
      supabase.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id)
    ]);

    if(t.data) setTasks(t.data);
    if(s.data) setSites(s.data);
    if(u.data) setUsers(u.data);
  };

  useEffect(() => { loadData(); }, [currentDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a clean payload with only the fields that exist in the 'tasks' table
    // This fixes the 400 error caused by sending joined objects (sites, profiles) back to DB
    const payload = {
      title: newTask.title,
      description: newTask.description,
      site_id: newTask.site_id,
      assigned_to: newTask.assigned_to,
      organization_id: profile.organization_id,
      color: newTask.color || '#f97316',
      status: newTask.status || 'todo',
      // Ensure we send UTC ISO strings to DB based on the Local Time input
      start_date: new Date(newTask.start_date).toISOString(),
      end_date: new Date(newTask.end_date).toISOString()
    };

    if(newTask.id) {
       const { error } = await supabase.from('tasks').update(payload).eq('id', newTask.id);
       if (error) console.error("Error updating task:", error);
    } else {
       const { error } = await supabase.from('tasks').insert([payload]);
       if (error) console.error("Error inserting task:", error);
    }
    
    setShowModal(false);
    loadData();
  };

  const performDelete = async () => {
    if(confirmDelete.id) {
      await supabase.from('tasks').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ open: false, id: null });
      setShowModal(false); // Also close the edit modal if it was open
      loadData();
    }
  };

  const handleDeleteClick = () => {
      // Don't close edit modal yet, just open confirm
      setConfirmDelete({ open: true, id: newTask.id });
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const toLocalIso = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const onDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if(!task) return;

    const oldStart = new Date(task.start_date);
    const duration = new Date(task.end_date).getTime() - oldStart.getTime();
    
    const newStart = new Date(day);
    newStart.setHours(hour, oldStart.getMinutes());
    const newEnd = new Date(newStart.getTime() + duration);

    // Optimistic update
    const updatedTask = { ...task, start_date: newStart.toISOString(), end_date: newEnd.toISOString() };
    setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    
    await supabase.from('tasks').update({ 
        start_date: updatedTask.start_date, 
        end_date: updatedTask.end_date 
    }).eq('id', taskId);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* MAPRESTAV HEADER STYLE */}
      <div className="shrink-0 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="text-orange-600" />
              Kalendár
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Plánovanie úloh a harmonogram</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition shrink-0"><ChevronLeft size={20}/></button>
          
          <div className="flex-1 text-center px-2 min-w-[160px] flex flex-col justify-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Aktuálny týždeň</span>
             <span className="text-sm font-extrabold text-slate-800 leading-none whitespace-nowrap flex items-center justify-center gap-1">
                <CalendarDays size={14} className="text-orange-500"/>
                {weekDays[0].getDate()}.{weekDays[0].getMonth()+1}. - {weekDays[6].getDate()}.{weekDays[6].getMonth()+1}.
             </span>
          </div>

          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition shrink-0"><ChevronRight size={20}/></button>
          
          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>
          
          <Button onClick={() => { 
              const now = new Date();
              const end = new Date(now.getTime() + 3600000);
              setNewTask({ start_date: toLocalIso(now), end_date: toLocalIso(end) }); 
              setShowModal(true); 
          }} className="whitespace-nowrap">
            <Plus size={18}/> Nová Úloha
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto relative flex flex-col">
        <div className="min-w-[900px] flex-1 relative">
          <div className="grid grid-cols-[60px_1fr] border-b border-slate-200 sticky top-0 bg-white z-20">
            <div className="p-3 text-center flex items-center justify-center">
               <span className="text-[10px] font-black text-slate-300 uppercase">Čas</span>
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-100">
              {weekDays.map(d => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={d.toString()} className={`p-3 text-center group ${isToday ? 'bg-orange-50/50' : ''}`}>
                    <div className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{d.toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                    <div className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-lg font-extrabold ${isToday ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'text-slate-700'} transition-all group-hover:scale-110`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr]">
            <div className="border-r border-slate-200 bg-white">
              {Array.from({length: DAY_HOURS}, (_, i) => i + START_HOUR).map(h => (
                <div key={h} className="h-16 border-b border-slate-100 relative group">
                   <span className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-white px-1 text-[10px] text-slate-400 group-hover:text-orange-500 font-mono">
                    {h}:00
                   </span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 divide-x divide-slate-100 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
              {weekDays.map(day => (
                <div key={day.toString()} className="relative h-full">
                  {Array.from({length: DAY_HOURS}, (_, i) => i + START_HOUR).map(h => (
                    <div 
                      key={h} 
                      className="h-16 border-b border-slate-100/50 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => {
                        const d = new Date(day);
                        d.setHours(h, 0, 0, 0); // Reset minutes/seconds to 0
                        const end = new Date(d.getTime() + 3600000);
                        setNewTask({ start_date: toLocalIso(d), end_date: toLocalIso(end) });
                        setShowModal(true);
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => onDrop(e, day, h)}
                    />
                  ))}
                </div>
              ))}

              {tasks.map(task => {
                const start = new Date(task.start_date);
                const end = new Date(task.end_date);
                const dayIndex = (start.getDay() + 6) % 7; 
                const startHour = start.getHours() + (start.getMinutes()/60);
                const top = (startHour - START_HOUR) * 64; 
                const durationHrs = (end.getTime() - start.getTime()) / 3600000;
                const height = durationHrs * 64;

                if (top < 0) return null; 

                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={e => onDragStart(e, task.id)}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setNewTask({
                            ...task,
                            // Ensure date inputs are set to local ISO format for editing
                            start_date: toLocalIso(new Date(task.start_date)),
                            end_date: toLocalIso(new Date(task.end_date))
                        }); 
                        setShowModal(true); 
                    }}
                    className="absolute m-0.5 rounded-lg px-2 py-1 text-xs text-white shadow-sm overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-md hover:scale-[1.02] transition z-10 border-l-4 border-black/10 select-none flex flex-col opacity-90 hover:opacity-100"
                    style={{
                      top: `${top}px`,
                      left: `calc(${dayIndex * 100}% / 7)`,
                      width: `calc(100% / 7 - 4px)`,
                      height: `${Math.max(30, height)}px`,
                      backgroundColor: task.color
                    }}
                  >
                    {/* Updated for truncation and layout */}
                    <div className="font-bold truncate w-full leading-tight">{task.title}</div>
                    {task.description && (
                        <div className="truncate w-full opacity-80 text-[9px] font-medium leading-tight mt-0.5">{task.description}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title={newTask.id ? "Upraviť Úlohu" : "Nová Úloha"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Názov úlohy" value={newTask.title || ''} onChange={(e: any) => setNewTask({...newTask, title: e.target.value})} required autoFocus />
            
            {/* Note Moved Here */}
            <Input label="Poznámka" value={newTask.description || ''} onChange={(e: any) => setNewTask({...newTask, description: e.target.value})} placeholder="Krátky popis..." />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Začiatok" type="datetime-local" value={newTask.start_date} onChange={(e: any) => setNewTask({...newTask, start_date: e.target.value})} required />
              <Input label="Koniec" type="datetime-local" value={newTask.end_date} onChange={(e: any) => setNewTask({...newTask, end_date: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Projekt" value={newTask.site_id || ''} onChange={(e: any) => setNewTask({...newTask, site_id: e.target.value})}>
                <option value="">-- Všeobecné --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="Priradiť" value={newTask.assigned_to || ''} onChange={(e: any) => setNewTask({...newTask, assigned_to: e.target.value})}>
                <option value="">-- Nikto --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </Select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Farba (Priorita)</label>
              <div className="flex gap-2">
                {['#f97316', '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'].map(c => (
                  <div key={c} onClick={() => setNewTask({...newTask, color: c})} className={`w-8 h-8 rounded-full cursor-pointer transition ${newTask.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{backgroundColor: c}} />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-4">
              {newTask.id ? <Button type="button" variant="danger" onClick={handleDeleteClick}><Trash2 size={16}/> Zmazať</Button> : <div></div>}
              <Button type="submit">Uložiť Úlohu</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Moved ConfirmModal here so it renders on top of the Edit Modal if open */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
        onConfirm={performDelete}
        title="Zmazať úlohu?"
        message="Naozaj chcete odstrániť túto úlohu z kalendára?"
        type="danger"
      />
    </div>
  );
};
