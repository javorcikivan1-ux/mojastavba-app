
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { RefreshCw, Download, Package, CheckCircle2, AlertTriangle, ArrowUpCircle } from 'lucide-react';

export const UpdatesScreen = () => {
  const [appVersion, setAppVersion] = useState<string>('Neznáma');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'no-update' | 'downloading' | 'ready' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Detect environment
  const isElectron = window.navigator.userAgent.includes('Electron');

  useEffect(() => {
    if (isElectron) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');

      // Get initial version
      ipcRenderer.on('app-version', (_: any, version: string) => setAppVersion(version));

      // Listeners
      ipcRenderer.on('update-available', (_: any, info: any) => {
        setStatus('available');
        setUpdateInfo(info);
      });

      ipcRenderer.on('update-not-available', () => {
        setStatus('no-update');
      });

      ipcRenderer.on('download-progress', (_: any, percent: number) => {
        setStatus('downloading');
        setProgress(percent);
      });

      ipcRenderer.on('update-downloaded', () => {
        setStatus('ready');
      });

      ipcRenderer.on('update-error', (_: any, err: string) => {
        setStatus('error');
        setErrorMsg(err);
      });

      return () => {
        ipcRenderer.removeAllListeners('app-version');
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-not-available');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-error');
      };
    } else {
        // Web verzia
        setAppVersion('Web 1.0.0');
    }
  }, []);

  const checkForUpdates = () => {
    if (isElectron) {
      setStatus('checking');
      setErrorMsg('');
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('check-for-update');
    } else {
      // Manual logic for mobile/web (fetch GitHub API)
      alert("Na webe/mobile sa aktualizácie riešia obnovením stránky alebo stiahnutím novej APK.");
    }
  };

  const installUpdate = () => {
    // @ts-ignore
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send('install-update');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
         <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="text-orange-600" size={32} />
            Aktualizácie
         </h2>
         <p className="text-sm text-slate-500 mt-1 font-medium">Správa verzií a noviniek v aplikácii</p>
      </div>

      <Card className="text-center py-10">
          <div className="mb-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Package size={40} className="text-slate-400"/>
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Aktuálna verzia</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">v{appVersion}</div>
          </div>

          <div className="max-w-xs mx-auto space-y-4">
              {/* STAV: IDLE alebo NO UPDATE */}
              {(status === 'idle' || status === 'no-update') && (
                  <div>
                      {status === 'no-update' && (
                          <div className="mb-4 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                              <CheckCircle2 size={16}/> Máte najnovšiu verziu
                          </div>
                      )}
                      <Button onClick={checkForUpdates} fullWidth>
                          Skontrolovať aktualizácie
                      </Button>
                  </div>
              )}

              {/* STAV: CHECKING */}
              {status === 'checking' && (
                  <div className="text-slate-500 text-sm animate-pulse">Pripájam sa na server...</div>
              )}

              {/* STAV: AVAILABLE */}
              {status === 'available' && (
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl animate-in zoom-in-95">
                      <div className="font-bold text-blue-800 text-lg mb-2">Nová verzia je dostupná!</div>
                      <div className="text-blue-600 mb-4 font-mono text-sm">{updateInfo?.version}</div>
                      <div className="text-xs text-blue-500 mb-4 text-left bg-white p-3 rounded-lg border border-blue-100 max-h-32 overflow-auto">
                          {/* Release notes would go here */}
                          Vylepšenia výkonu a opravy chýb.
                      </div>
                      <div className="text-xs text-slate-400 mb-2">Sťahovanie sa spustí automaticky...</div>
                  </div>
              )}

              {/* STAV: DOWNLOADING */}
              {status === 'downloading' && (
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Sťahujem...</span>
                          <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all duration-300" style={{width: `${progress}%`}}></div>
                      </div>
                  </div>
              )}

              {/* STAV: READY */}
              {status === 'ready' && (
                  <div className="bg-green-50 border border-green-100 p-6 rounded-xl animate-in zoom-in-95">
                      <ArrowUpCircle className="mx-auto text-green-600 mb-2" size={32}/>
                      <div className="font-bold text-green-800 text-lg mb-4">Aktualizácia pripravená</div>
                      <Button onClick={installUpdate} variant="primary" className="bg-green-600 hover:bg-green-700 shadow-green-200" fullWidth>
                          Reštartovať a inštalovať
                      </Button>
                  </div>
              )}

              {/* STAV: ERROR */}
              {status === 'error' && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-red-700 font-bold mb-2 justify-center">
                          <AlertTriangle size={18}/> Chyba
                      </div>
                      <p className="text-xs text-red-600 mb-4 break-words">{errorMsg}</p>
                      <Button onClick={checkForUpdates} variant="secondary" size="sm">Skúsiť znova</Button>
                  </div>
              )}
          </div>
          
          <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400">
              {isElectron ? 'Beží v režime Desktop App' : 'Beží v prehliadači'} • Kanál: Stable
          </div>
      </Card>
    </div>
  );
};
