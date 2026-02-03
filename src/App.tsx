import React, { useState, useEffect, useMemo } from 'react';
import { 
  Anchor, 
  Settings, 
  X, 
  Coins, 
  Waves, 
  Gamepad2, 
  History, 
  Plus, 
  Trash2, 
  Trophy,
  Calendar,
  Calculator,
  Gem, 
  Activity,
  Target,
  Wand2,
  Pencil, 
  AlertTriangle,
  CalendarRange,
  Loader2,
  CloudOff, 
  Database,   
  HardDrive,
  LogOut,
  User as UserIcon,
  ShieldCheck, // Re-agregado
  ShieldAlert  // Re-agregado
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query,
  setDoc,
  type QuerySnapshot,
  type DocumentSnapshot,
  type QueryDocumentSnapshot
} from 'firebase/firestore';

// --- TYPES & INTERFACES ---

interface OceanLevel {
  id: string;
  name: string;
  labelPercent: string;
  multiplier: number;
  color: string;
  border: string;
  bg: string;
}

interface GemExchangeTier {
  cash: number;
  gems: number;
}

interface Session {
  id: string; 
  date: string;
  buyIn: number;
  gamesCount: number | string; 
  pvi: number | string;
  leaderboardPrize: number | string;
  miningPrize: number | string;
  notes: string;
}

interface UserSettings {
  oceanRank: string;
  defaultPVI: number | string;
  exchangeGoalIndex: number;
}

interface MonthData {
  date: string;
  games: number;
  rake: number;
  tp: number;
  gemsVal: number;
  mining: number;
  lb: number;
  totalRB: number;
}

interface StakeData {
  count: number;
  rake: number;
}

// --- FIREBASE CONFIGURATION ---
const YOUR_FIREBASE_CONFIG = {
    apiKey: "AIzaSyA_moODg4OQhTHedzQ4_vJAVeZbhVFCCto",
    authDomain: "spin-rakeback-tracker.firebaseapp.com",
    projectId: "spin-rakeback-tracker",
    storageBucket: "spin-rakeback-tracker.firebasestorage.app",
    messagingSenderId: "193768744384",
    appId: "1:193768744384:web:4745748844d8d9117a5425"
  };

// --- FIREBASE INITIALIZATION ---
let auth: any = null;
let db: any = null;
let isFirebaseAvailable = false;
let appId = 'spin-tracker';

try {
  // @ts-ignore
  let envConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  
  // @ts-ignore
  if (!envConfig && YOUR_FIREBASE_CONFIG.apiKey && YOUR_FIREBASE_CONFIG.apiKey !== "TU_API_KEY_AQUI") {
      envConfig = YOUR_FIREBASE_CONFIG;
  }
  
  if (envConfig) {
    const firebaseApp = initializeApp(envConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    // @ts-ignore
    const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'spin-tracker';
    appId = rawAppId.replace(/[\/.]/g, '_');
    isFirebaseAvailable = true;
  }
} catch (e) {
  console.warn("Firebase Init Failed:", e);
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
          <pre className="bg-slate-900 p-4 rounded text-xs text-red-300 overflow-auto max-w-full">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="mt-6 bg-cyan-600 px-4 py-2 rounded-lg text-sm font-bold">Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- STYLE INJECTOR ---
const StyleInjector = () => {
  useEffect(() => {
    document.body.style.backgroundColor = "#020617";
    document.body.style.color = "#e2e8f0";
    document.body.style.fontFamily = "'Inter', sans-serif";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    if (!document.getElementById('font-inter')) {
      const link = document.createElement('link');
      link.id = 'font-inter';
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      // @ts-ignore
      script.onload = () => {
        // @ts-ignore
        if (window.tailwind) {
           // @ts-ignore
           window.tailwind.config = { theme: { extend: { colors: { slate: { 950: '#020617' } }, fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
        }
      };
      document.head.appendChild(script);
    }
  }, []);
  return null;
};

// --- CONSTANTS ---
const OCEAN_LEVELS: OceanLevel[] = [
    { id: 'shark', name: 'Shark', labelPercent: '80', multiplier: 5.0, color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500' },
    { id: 'whale', name: 'Whale', labelPercent: '70', multiplier: 4.5, color: 'text-purple-500', border: 'border-purple-500', bg: 'bg-purple-500' },
    { id: 'dolphin', name: 'Dolphin', labelPercent: '60', multiplier: 4.0, color: 'text-cyan-400', border: 'border-cyan-400', bg: 'bg-cyan-400' },
    { id: 'octopus', name: 'Octopus', labelPercent: '50', multiplier: 3.5, color: 'text-emerald-400', border: 'border-emerald-400', bg: 'bg-emerald-400' },
    { id: 'turtle', name: 'Turtle', labelPercent: '40', multiplier: 3.0, color: 'text-green-500', border: 'border-green-500', bg: 'bg-green-500' },
    { id: 'crab', name: 'Crab', labelPercent: '30', multiplier: 2.5, color: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400' },
    { id: 'shrimp', name: 'Shrimp', labelPercent: '25', multiplier: 2.0, color: 'text-amber-600', border: 'border-amber-600', bg: 'bg-amber-600' },
    { id: 'fish', name: 'Fish', labelPercent: '16', multiplier: 1.5, color: 'text-blue-300', border: 'border-blue-300', bg: 'bg-blue-300' },
];

const GEM_EXCHANGE_TIERS: GemExchangeTier[] = [
    { cash: 5, gems: 5000 }, { cash: 10, gems: 9500 }, { cash: 25, gems: 23000 }, { cash: 50, gems: 45000 },
    { cash: 100, gems: 90000 }, { cash: 250, gems: 220000 }, { cash: 500, gems: 420000 }, { cash: 1000, gems: 800000 },
    { cash: 2500, gems: 2000000 }, { cash: 5000, gems: 4000000 }, { cash: 10000, gems: 7500000 }, { cash: 25000, gems: 18000000 },
    { cash: 50000, gems: 33000000 }, { cash: 100000, gems: 65000000 }
];

const SPIN_FEE_PERCENTAGE = 0.07; 
const TP_PER_DOLLAR_RAKE = 100; 
const GEMS_BASE_PER_DOLLAR = 100; 

// --- SHARED COMPONENTS ---
const StatCard: React.FC<{ title: string; value: string; subtext: string; icon: LucideIcon; colorClass: string }> = ({ title, value, subtext, icon: Icon, colorClass }) => (
    <div className="bg-slate-800/70 backdrop-blur-md border border-white/5 p-4 rounded-xl flex items-start justify-between shadow-lg hover:bg-slate-800 transition-colors group">
        <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 group-hover:text-slate-300 transition-colors">{title}</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
            {subtext && <p className={`text-xs mt-1 font-medium ${colorClass}`}>{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass} group-hover:bg-opacity-20 transition-all`}>
            <Icon size={20} />
        </div>
    </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl transform transition-all scale-100 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
            </div>
        </div>
    );
};

const LoginPage: React.FC<{ onLogin: (type: 'google' | 'guest') => void, isCloudAvailable: boolean }> = ({ onLogin, isCloudAvailable }) => {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans text-slate-200">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-2xl shadow-lg shadow-cyan-500/20 mb-6">
                        <Anchor className="text-slate-900" size={48} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SpinTracker <span className="text-cyan-400">Ocean</span></h1>
                    <p className="text-slate-400 text-sm">Gestiona tu rakeback, controla tu PVI y maximiza tus ganancias.</p>
                </div>
                <div className="space-y-4">
                    <button onClick={() => onLogin('google')} disabled={!isCloudAvailable} className={`w-full flex items-center justify-center gap-3 font-bold py-3.5 px-6 rounded-xl transition-all ${isCloudAvailable ? 'bg-white text-slate-900 hover:bg-gray-100 shadow-lg shadow-white/5 hover:scale-[1.02]' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}>
                        {isCloudAvailable ? <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> : <CloudOff size={20} />}
                        {isCloudAvailable ? 'Entrar con Google' : 'Nube no disponible'}
                    </button>
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-700"></div><span className="flex-shrink-0 mx-4 text-xs text-slate-500 uppercase font-semibold">O</span><div className="flex-grow border-t border-slate-700"></div>
                    </div>
                    <button onClick={() => onLogin('guest')} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all hover:text-white border border-slate-700 hover:border-slate-600">
                        <UserIcon size={20} /> Continuar como Invitado
                    </button>
                </div>
                {!isCloudAvailable && (
                    <p className="text-[10px] text-slate-500 text-center mt-6 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                        Nota: Debes configurar tus claves de Firebase en el código para habilitar el Login.
                    </p>
                )}
            </div>
        </div>
    );
};

// --- APP ---
function App() {
    const [user, setUser] = useState<User | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [userSettings, setUserSettings] = useState<UserSettings>({ oceanRank: 'turtle', defaultPVI: 0.5, exchangeGoalIndex: 4 });
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [isYearView, setIsYearView] = useState<boolean>(false);
    
    // UI States
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [manualTPInput, setManualTPInput] = useState<string>('');
    const [formData, setFormData] = useState<Partial<Session>>({ id: undefined, date: new Date().toISOString().split('T')[0], buyIn: 5, gamesCount: 0, pvi: 0.5, leaderboardPrize: 0, miningPrize: 0, notes: '' });

    // AUTH INIT
    useEffect(() => {
        if (isFirebaseAvailable) {
            const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
                setUser(currentUser);
                setAuthInitialized(true);
            });
            // Auto-login preview only
            // @ts-ignore
            if (!auth.currentUser && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                 // @ts-ignore
                 signInWithCustomToken(auth, __initial_auth_token);
            }
            return unsubscribe;
        } else {
            loadLocalData();
            setAuthInitialized(true);
        }
    }, []);

    const loadLocalData = () => {
        const savedSessions = localStorage.getItem('spinTrackerSessions');
        if (savedSessions) setSessions(JSON.parse(savedSessions));
        const savedSettings = localStorage.getItem('spinTrackerSettings');
        if (savedSettings) setUserSettings(JSON.parse(savedSettings));
    };

    const handleLoginAction = async (type: 'google' | 'guest') => {
        if (type === 'google' && isFirebaseAvailable) {
            const provider = new GoogleAuthProvider();
            try { await signInWithPopup(auth, provider); } catch (error) { alert("Error al iniciar sesión con Google."); }
        } else if (type === 'guest') {
             if (isFirebaseAvailable) {
                try { await signInAnonymously(auth); } catch (e) { console.error(e); }
             } else {
                setUser({ uid: 'local_guest', isAnonymous: true } as User);
             }
        }
    };

    const handleLogout = async () => {
        if (isFirebaseAvailable && auth) { await signOut(auth); } else { setUser(null); }
    };

    // DATA SYNC
    useEffect(() => {
        if (!isFirebaseAvailable || !user) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'));
        const unsub = onSnapshot(q, (snap: QuerySnapshot) => {
            const loaded = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as Session));
            loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setSessions(loaded);
        });
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'global');
        const unsubSet = onSnapshot(settingsRef, (snap: DocumentSnapshot) => {
            if (snap.exists()) setUserSettings(snap.data() as UserSettings);
        });
        return () => { unsub(); unsubSet(); };
    }, [user]);

    // Local Sync Fallback
    useEffect(() => {
        if (!isFirebaseAvailable || (user && user.uid === 'local_guest')) {
            localStorage.setItem('spinTrackerSessions', JSON.stringify(sessions));
            localStorage.setItem('spinTrackerSettings', JSON.stringify(userSettings));
        }
    }, [sessions, userSettings, user]);

    // PVI Calculator
    useEffect(() => {
        const gamesCount = typeof formData.gamesCount === 'string' ? (parseInt(formData.gamesCount) || 0) : formData.gamesCount || 0;
        const buyIn = formData.buyIn || 5;
        if (manualTPInput && buyIn && gamesCount > 0) {
            const grossRake = buyIn * gamesCount * SPIN_FEE_PERCENTAGE;
            const theoreticalTP = grossRake * TP_PER_DOLLAR_RAKE;
            if (theoreticalTP > 0) {
                const calculatedPVI = parseFloat(manualTPInput) / theoreticalTP;
                setFormData(prev => ({ ...prev, pvi: calculatedPVI.toFixed(2) }));
            }
        }
    }, [manualTPInput, formData.buyIn, formData.gamesCount]);

    // Stats Logic
    const availableMonths = useMemo(() => {
        const months = new Set(sessions.map(s => s.date.slice(0, 7)));
        months.add(new Date().toISOString().slice(0, 7)); 
        return Array.from(months).sort().reverse();
    }, [sessions]);

    const stats = useMemo(() => {
        let totalGames = 0, totalRakeGross = 0, totalRakePVI = 0, totalTidePoints = 0, totalOceanGemsValue = 0; 
        let totalGemsCount = 0, totalMining = 0, totalLeaderboard = 0, totalRakebackUSD = 0, weightedPVISum = 0; 
        const stakesBreakdown: Record<string, StakeData> = {}; 
        const monthsBreakdown: Record<string, MonthData> = {}; 
        const currentRank = OCEAN_LEVELS.find(l => l.id === userSettings.oceanRank) || OCEAN_LEVELS[4];
        const goalIndex = typeof userSettings.exchangeGoalIndex === 'number' ? userSettings.exchangeGoalIndex : 4;
        const targetGoal = GEM_EXCHANGE_TIERS[goalIndex] || GEM_EXCHANGE_TIERS[4];
        const gemExchangeRate = targetGoal.cash / targetGoal.gems; 
        const selectedYear = selectedMonth.split('-')[0];
        
        const filteredSessions = sessions.filter(s => isYearView ? s.date.startsWith(selectedYear) : s.date.startsWith(selectedMonth));

        filteredSessions.forEach(session => {
            const pvi = typeof session.pvi === 'string' ? parseFloat(session.pvi) : session.pvi || 0.5;
            const gamesCount = typeof session.gamesCount === 'string' ? parseInt(session.gamesCount) : session.gamesCount || 0;
            const buyIn = session.buyIn;
            
            const sessionRakeGross = buyIn * gamesCount * SPIN_FEE_PERCENTAGE;
            const sessionRakePVI = sessionRakeGross * pvi;
            const sessionTP = sessionRakePVI * TP_PER_DOLLAR_RAKE;
            const gemsCnt = sessionRakePVI * GEMS_BASE_PER_DOLLAR * currentRank.multiplier;
            const oceanVal = gemsCnt * gemExchangeRate;
            const lb = typeof session.leaderboardPrize === 'string' ? parseFloat(session.leaderboardPrize) : session.leaderboardPrize || 0;
            const mine = typeof session.miningPrize === 'string' ? parseFloat(session.miningPrize) : session.miningPrize || 0;
            
            totalGames += gamesCount;
            totalRakeGross += sessionRakeGross;
            totalRakePVI += sessionRakePVI;
            totalTidePoints += sessionTP;
            totalOceanGemsValue += oceanVal;
            totalGemsCount += gemsCnt;
            totalLeaderboard += lb;
            totalMining += mine;
            weightedPVISum += pvi * gamesCount;

            const stakeKey = buyIn.toString();
            if (!stakesBreakdown[stakeKey]) stakesBreakdown[stakeKey] = { count: 0, rake: 0 };
            stakesBreakdown[stakeKey].count += gamesCount;
            stakesBreakdown[stakeKey].rake += sessionRakeGross;

            if (isYearView) {
                const monthKey = session.date.slice(0, 7); 
                if (!monthsBreakdown[monthKey]) monthsBreakdown[monthKey] = { date: monthKey, games: 0, rake: 0, tp: 0, gemsVal: 0, mining: 0, lb: 0, totalRB: 0 };
                monthsBreakdown[monthKey].games += gamesCount;
                monthsBreakdown[monthKey].rake += sessionRakeGross;
                monthsBreakdown[monthKey].tp += sessionTP;
                monthsBreakdown[monthKey].gemsVal += oceanVal;
                monthsBreakdown[monthKey].mining += mine;
                monthsBreakdown[monthKey].lb += lb;
                monthsBreakdown[monthKey].totalRB += (oceanVal + lb + mine);
            }
        });

        totalRakebackUSD = totalOceanGemsValue + totalLeaderboard + totalMining;
        const effectiveRBPercent = totalRakeGross > 0 ? (totalRakebackUSD / totalRakeGross) * 100 : 0;
        const miningRBPercent = totalRakeGross > 0 ? (totalMining / totalRakeGross) * 100 : 0;
        const leaderboardRBPercent = totalRakeGross > 0 ? (totalLeaderboard / totalRakeGross) * 100 : 0;
        const oceanRBPercent = totalRakeGross > 0 ? (totalOceanGemsValue / totalRakeGross) * 100 : 0;
        const defaultPVI = typeof userSettings.defaultPVI === 'string' ? parseFloat(userSettings.defaultPVI) : userSettings.defaultPVI || 0.5;
        const avgPVI = totalGames > 0 ? (weightedPVISum / totalGames) : defaultPVI;

        return { filteredSessions, monthsBreakdown: Object.values(monthsBreakdown).sort((a, b) => b.date.localeCompare(a.date)), totalGames, totalRakeGross, totalRakePVI, totalTidePoints, totalOceanGemsValue, totalGemsCount, totalMining, totalLeaderboard, miningRBPercent, leaderboardRBPercent, oceanRBPercent, totalRakebackUSD, effectiveRBPercent, currentRank, avgPVI, targetGoal, gemExchangeRate, stakesBreakdown, selectedYear };
    }, [sessions, userSettings.oceanRank, userSettings.exchangeGoalIndex, selectedMonth, userSettings.defaultPVI, isYearView]);

    // Formatters
    const formatCurrency = (val: number | string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(typeof val === 'string' ? parseFloat(val) : val || 0);
    const formatNumber = (val: number | string) => new Intl.NumberFormat('en-US').format(typeof val === 'string' ? parseFloat(val) : val || 0);
    const formatPercent = (val: number) => `${(val || 0).toFixed(1)}%`;
    const formatMonth = (dateStr: string) => { const [y, m] = dateStr.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' }); };

    // Handlers
    const openAddModal = () => { setFormData({ id: undefined, date: new Date().toISOString().split('T')[0], buyIn: 5, gamesCount: 0, pvi: userSettings.defaultPVI || 0.5, leaderboardPrize: 0, miningPrize: 0, notes: '' }); setManualTPInput(''); setIsSessionModalOpen(true); };
    const openEditModal = (session: Session) => { setFormData({ ...session }); setManualTPInput(''); setIsSessionModalOpen(true); };
    const handleSaveSession = async (e: React.FormEvent) => { e.preventDefault(); if (isFirebaseAvailable && user && !user.isAnonymous) { try { if (formData.id) { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', formData.id), { ...formData }); } else { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'), { ...formData }); } } catch (e: any) { alert("Error nube: " + e.message); } } else { if (formData.id) { setSessions(sessions.map(s => s.id === formData.id ? { ...formData, id: formData.id } as Session : s)); } else { setSessions([{ ...formData, id: Date.now().toString() } as Session, ...sessions]); } } setIsSessionModalOpen(false); };
    const initiateDelete = (id: string | null) => { setSessionToDelete(id); setIsDeleteModalOpen(true); };
    const confirmDelete = async () => { if (sessionToDelete) { if (isFirebaseAvailable && user && !user.isAnonymous) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionToDelete)); } else { setSessions(sessions.filter(s => s.id !== sessionToDelete)); } setSessionToDelete(null); setIsDeleteModalOpen(false); } };
    const saveSettings = async () => { if (isFirebaseAvailable && user && !user.isAnonymous) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'global'), userSettings, { merge: true }); } setIsSettingsModalOpen(false); };

    if (!authInitialized) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans"><StyleInjector /><Loader2 size={32} className="animate-spin text-cyan-500" /></div>;
    if (!user) return <React.Fragment><StyleInjector /><LoginPage onLogin={handleLoginAction} isCloudAvailable={isFirebaseAvailable} /></React.Fragment>;

    return (
        <div className="min-h-screen font-sans text-slate-200 selection:bg-cyan-500 selection:text-white">
            <StyleInjector />
            <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/20"><Anchor className="text-slate-900" size={20} strokeWidth={2.5} /></div>
                                <div className="flex flex-col"><span className="text-lg font-bold tracking-tight text-white leading-tight">SpinTracker <span className="text-cyan-400">Ocean</span></span><span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Rakeback Manager</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsYearView(!isYearView)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${isYearView ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`} title={isYearView ? "Volver a vista mensual" : "Ver Total Anual"}><CalendarRange size={16} /><span className="hidden sm:inline">Año</span></button>
                                {user && !user.isAnonymous && <button onClick={handleLogout} className="p-2 rounded-lg bg-slate-800 text-red-400 border border-slate-700 hover:bg-slate-700 hover:text-red-300 transition-colors" title="Cerrar Sesión"><LogOut size={16} /></button>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={14} className="text-slate-400" /></div>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-cyan-500 outline-none appearance-none capitalize cursor-pointer hover:bg-slate-700 transition-colors">{availableMonths.map(m => (<option key={m} value={m}>{formatMonth(m)}</option>))}</select>
                            </div>
                            <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg border border-slate-700 transition-all hover:border-slate-600 group shrink-0">
                                <div className={`w-2 h-2 rounded-full ${stats.currentRank.bg} shadow-[0_0_8px_currentColor]`}></div><span className="font-medium text-slate-200 group-hover:text-white transition-colors">{stats.currentRank.name}</span><Settings size={14} className="text-slate-400 group-hover:rotate-90 transition-transform duration-500 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Tus Gemas" value={formatNumber(stats.totalGemsCount)} subtext={`Valor Proyectado: ${formatCurrency(stats.totalOceanGemsValue)} | ${formatPercent(stats.oceanRBPercent)} RB`} icon={Gem} colorClass="text-cyan-400" />
                    <StatCard title="Tide Points (TP)" value={formatNumber(stats.totalTidePoints.toFixed(0))} subtext={`PVI Promedio: ${(Number(stats.avgPVI) || 0).toFixed(2)}`} icon={Waves} colorClass="text-blue-400" />
                    <StatCard title="Rakeback Total" value={formatCurrency(stats.totalRakebackUSD)} subtext={`Retorno Real: ${stats.effectiveRBPercent.toFixed(1)}%`} icon={Calculator} colorClass="text-emerald-400" />
                    <StatCard title="Premios (LB + Mine)" value={formatCurrency(stats.totalMining + stats.totalLeaderboard)} subtext={`Minado: ${formatPercent(stats.miningRBPercent)} | LB: ${formatPercent(stats.leaderboardRBPercent)}`} icon={Trophy} colorClass="text-amber-400" />
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-inner">
                    {isYearView && <div className="text-xs uppercase font-bold text-amber-400 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2"><CalendarRange size={14} /> Resumen Anual {stats.selectedYear}</div>}
                    <div className="flex flex-col gap-3">
                        {Object.keys(stats.stakesBreakdown).length === 0 ? (
                            <div className="text-slate-500 text-sm italic">No hay actividad registrada este periodo.</div>
                        ) : (
                            Object.entries(stats.stakesBreakdown).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([stake, data]) => (
                                <div key={stake} className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-lg hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0">
                                    <div className="flex items-center gap-3 min-w-[120px]"><div className="bg-slate-800 p-1.5 rounded text-cyan-400 font-bold font-mono text-sm border border-slate-700">${stake} Stake</div></div>
                                    <div className="flex items-center gap-2 min-w-[150px]"><Gamepad2 size={16} className="text-purple-400" /><div><span className="text-slate-500 text-xs uppercase font-bold mr-2">Volumen:</span><span className="text-white font-medium">{formatNumber(data.count)}</span></div></div>
                                    <div className="flex items-center gap-2 min-w-[150px]"><Coins size={16} className="text-amber-400" /><div><span className="text-slate-500 text-xs uppercase font-bold mr-2">Rake Total:</span><span className="text-white font-medium">{formatCurrency(data.rake)}</span></div></div>
                                    <div className="hidden lg:block ml-auto text-xs text-slate-600">Meta: {formatCurrency(stats.targetGoal.cash)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><History className="text-slate-400" />{isYearView ? `Resumen Mensual ${stats.selectedYear}` : "Historial de Sesiones"}</h2>
                    {!isYearView && <button onClick={openAddModal} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5"><Plus size={20} strokeWidth={3} /> Nueva Sesión</button>}
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">{isYearView ? "Mes" : "Fecha"}</th>
                                    {!isYearView && <th className="px-6 py-4">PVI</th>}
                                    <th className="px-6 py-4">Volumen</th>
                                    <th className="px-6 py-4"><div>Tide Points</div>{!isYearView && <div className="text-[10px] opacity-60 normal-case">Gross × PVI × 100</div>}</th>
                                    <th className="px-6 py-4 text-cyan-300"><div className="flex items-center gap-1"><Gem size={12}/> Gemas ($)</div></th>
                                    <th className="px-6 py-4 text-amber-400">Minado</th>
                                    <th className="px-6 py-4 text-purple-400">L.Board</th>
                                    <th className="px-6 py-4 text-right text-emerald-400 font-bold">Total ($)</th>
                                    {!isYearView && <th className="px-6 py-4 text-center">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {isYearView && stats.monthsBreakdown.map(monthData => (
                                    <tr key={monthData.date} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white capitalize text-base">{formatMonth(monthData.date)}</td>
                                        <td className="px-6 py-4 text-slate-200">{formatNumber(monthData.games)}</td>
                                        <td className="px-6 py-4 font-mono text-cyan-400 font-medium">{formatNumber(monthData.tp.toFixed(0))}</td>
                                        <td className="px-6 py-4 font-mono text-cyan-300">{formatCurrency(monthData.gemsVal)}</td>
                                        <td className="px-6 py-4 font-mono text-amber-300">{monthData.mining > 0 ? formatCurrency(monthData.mining) : '-'}</td>
                                        <td className="px-6 py-4 font-mono text-purple-300">{monthData.lb > 0 ? formatCurrency(monthData.lb) : '-'}</td>
                                        <td className="px-6 py-4 font-mono text-right font-bold text-emerald-400 text-lg">{formatCurrency(monthData.totalRB)}</td>
                                    </tr>
                                ))}
                                {!isYearView && stats.filteredSessions.map(session => {
                                    const pvi = typeof session.pvi === 'string' ? parseFloat(session.pvi) : session.pvi || 0.5;
                                    const rakeGross = session.buyIn * (typeof session.gamesCount === 'string' ? parseInt(session.gamesCount) : session.gamesCount || 0) * SPIN_FEE_PERCENTAGE;
                                    const rakePVI = rakeGross * pvi;
                                    const tp = rakePVI * TP_PER_DOLLAR_RAKE;
                                    const gemsCnt = rakePVI * GEMS_BASE_PER_DOLLAR * stats.currentRank.multiplier;
                                    const oceanVal = gemsCnt * stats.gemExchangeRate;
                                    const mine = typeof session.miningPrize === 'string' ? parseFloat(session.miningPrize) : session.miningPrize || 0;
                                    const lb = typeof session.leaderboardPrize === 'string' ? parseFloat(session.leaderboardPrize) : session.leaderboardPrize || 0;
                                    const totalRB = oceanVal + mine + lb;
                                    const oceanPercent = rakeGross > 0 ? (oceanVal / rakeGross) * 100 : 0;
                                    const minePercent = rakeGross > 0 ? (mine / rakeGross) * 100 : 0;
                                    const lbPercent = rakeGross > 0 ? (lb / rakeGross) * 100 : 0;
                                    return (
                                        <tr key={session.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-200 whitespace-nowrap">{session.date}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${pvi < 1 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{pvi.toFixed(2)}</span></td>
                                            <td className="px-6 py-4"><div className="text-slate-200">{session.gamesCount}</div><div className="text-[10px] text-slate-500">${session.buyIn} BI</div></td>
                                            <td className="px-6 py-4 font-mono text-cyan-400 font-medium">{formatNumber(tp.toFixed(0))}</td>
                                            <td className="px-6 py-4"><div className="font-mono text-white font-bold flex items-center gap-1">{formatNumber(gemsCnt.toFixed(0))} <Gem size={10} className="text-cyan-400" /></div><div className="font-mono text-cyan-500/70 text-xs flex gap-2"><span>{formatCurrency(oceanVal)}</span><span className="text-cyan-300">+{oceanPercent.toFixed(1)}% RB</span></div></td>
                                            <td className="px-6 py-4 font-mono text-amber-300"><div>{mine > 0 ? formatCurrency(mine) : <span className="opacity-20">-</span>}</div>{mine > 0 && <div className="text-[10px] opacity-70">+{minePercent.toFixed(1)}% RB</div>}</td>
                                            <td className="px-6 py-4 font-mono text-purple-300"><div>{lb > 0 ? formatCurrency(lb) : <span className="opacity-20">-</span>}</div>{lb > 0 && <div className="text-[10px] opacity-70">+{lbPercent.toFixed(1)}% RB</div>}</td>
                                            <td className="px-6 py-4 font-mono text-right font-bold text-emerald-400 text-base">{formatCurrency(totalRB)}</td>
                                            <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => openEditModal(session)} className="text-slate-500 hover:text-blue-400 transition-colors p-2 hover:bg-slate-700 rounded-lg"><Pencil size={16} /></button><button onClick={() => initiateDelete(session.id!)} className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-slate-700 rounded-lg"><Trash2 size={16} /></button></div></td>
                                        </tr>
                                    );
                                })}
                                {((!isYearView && stats.filteredSessions.length === 0) || (isYearView && stats.monthsBreakdown.length === 0)) && (<tr><td colSpan={9} className="px-6 py-16 text-center"><div className="flex flex-col items-center gap-3"><div className="p-4 bg-slate-800/50 rounded-full text-slate-600"><Waves size={32} /></div><p className="text-slate-500 italic">{isYearView ? `No hay actividad registrada en el año ${stats.selectedYear}.` : `No hay registros en ${formatMonth(selectedMonth)}.`}</p></div></td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <Modal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} title={formData.id ? "Editar Sesión" : "Registrar Sesión"}>
                <form onSubmit={handleSaveSession} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1"><label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Fecha</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" /></div>
                        <div className="col-span-1"><label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Stake (Buy-In)</label><select value={formData.buyIn} onChange={e => setFormData({...formData, buyIn: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">{[0.25, 1, 3, 5, 10, 20, 50, 100, 200].map(bi => (<option key={bi} value={bi}>${bi}</option>))}</select></div>
                    </div>
                    <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-2"><Gamepad2 size={14} className="text-cyan-400" /> Cantidad Spins</label><input type="number" required min="1" value={formData.gamesCount} onChange={e => {const val = e.target.value; setFormData({...formData, gamesCount: val === '' ? '' : parseInt(val)});}} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ej: 100" /></div>
                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50"><label className="block text-[10px] font-bold uppercase text-cyan-400 mb-3 flex items-center gap-1"><Wand2 size={12} /> Cálculo de PVI (Ingresar TP Ganados)</label><div className="grid grid-cols-2 gap-4"><div className="relative"><span className="absolute left-3 top-3 text-slate-500 text-xs">TP</span><input type="number" placeholder="TP Lobby..." value={manualTPInput} onChange={e => setManualTPInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 pl-9 text-sm text-white focus:border-cyan-500 outline-none" disabled={!formData.gamesCount || (typeof formData.gamesCount === 'number' && formData.gamesCount <= 0)} /></div><div className="relative"><span className="absolute left-3 top-3 text-slate-500 text-xs">PVI</span><input type="number" step="0.01" min="0.1" max="2.0" required value={formData.pvi} onChange={e => {setFormData({...formData, pvi: e.target.value}); setManualTPInput(''); }} className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-9 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono font-bold ${(typeof formData.pvi === 'string' ? parseFloat(formData.pvi) : formData.pvi || 0.5) < 1 ? 'text-red-400' : 'text-emerald-400'}`} /></div></div></div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><h4 className="text-xs uppercase font-bold text-amber-500 mb-3 flex items-center gap-2"><Trophy size={16} /> Premios</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-500 mb-1">Minado (Gold)</label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-500">$</span><input type="number" step="0.01" value={formData.miningPrize} onChange={e => setFormData({...formData, miningPrize: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-7 text-amber-300 focus:ring-2 focus:ring-amber-500 outline-none font-mono" placeholder="0.00" /></div></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Leaderboard</label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-500">$</span><input type="number" step="0.01" value={formData.leaderboardPrize} onChange={e => setFormData({...formData, leaderboardPrize: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-7 text-purple-300 focus:ring-2 focus:ring-purple-500 outline-none font-mono" placeholder="0.00" /></div></div></div></div>
                    <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex justify-center items-center gap-2">{formData.id ? <Pencil size={20} /> : <Plus size={20} />} {formData.id ? "Guardar Cambios" : "Guardar Sesión"}</button>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Registro">
                <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
                    <div className="bg-red-500/20 p-4 rounded-full text-red-500"><AlertTriangle size={48} /></div>
                    <div><h3 className="text-lg font-bold text-white">¿Estás seguro?</h3><p className="text-slate-400 text-sm mt-2">Esta acción eliminará el registro permanentemente.</p></div>
                    <div className="flex gap-3 w-full mt-4"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors">Cancelar</button><button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-red-600/20">Sí, Eliminar</button></div>
                </div>
            </Modal>

            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Cuenta y Configuración">
                <div className="space-y-8">
                    {user && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><UserIcon size={18} className="text-indigo-400" /><span className="text-sm font-medium text-white">{user.isAnonymous ? 'Invitado' : user.email}</span></div><div className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700">{isFirebaseAvailable && !user.isAnonymous ? 'Nube' : 'Local'}</div></div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-700 pt-3">
                                {isFirebaseAvailable && !user.isAnonymous ? (
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                ) : (
                                    <ShieldAlert size={14} className="text-amber-500" />
                                )}
                                <span>{isFirebaseAvailable && !user.isAnonymous ? 'Datos sincronizados y seguros.' : 'Datos locales (Riesgo de pérdida).'}</span>
                            </div>
                        </div>
                    )}
                    <div><label className="block text-sm font-bold text-slate-200 mb-4 flex items-center gap-2"><Settings size={18} className="text-cyan-400" /> Estatus Ocean Actual</label><div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">{OCEAN_LEVELS.map(level => (<button key={level.id} onClick={() => setUserSettings({...userSettings, oceanRank: level.id})} className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${userSettings.oceanRank === level.id ? 'bg-slate-800 border-emerald-400 ring-1 ring-emerald-400' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:bg-slate-800'}`}><div className="relative z-10"><div className="font-bold text-sm">{level.name}</div><div className="flex items-center gap-2 mt-1"><span className="text-xs bg-slate-950/50 px-1.5 py-0.5 rounded text-cyan-300 font-mono">x{level.multiplier}</span><span className="text-[10px] opacity-70">~{level.labelPercent}%</span></div></div>{userSettings.oceanRank === level.id && (<div className={`absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-current opacity-10 ${level.color}`}></div>)}</button>))}</div></div>
                    <div><label className="block text-sm font-bold text-slate-200 mb-4 flex items-center gap-2"><Target size={18} className="text-emerald-400" /> Meta de Canje (Tienda)</label><p className="text-xs text-slate-500 mb-3 -mt-3">Selecciona tu meta de ahorro.</p><div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">{GEM_EXCHANGE_TIERS.map((tier, index) => {const rate = (tier.cash / tier.gems) * 1000; const isSelected = userSettings.exchangeGoalIndex === index; return (<button key={index} onClick={() => setUserSettings({...userSettings, exchangeGoalIndex: index})} className={`p-2 rounded-lg border text-center transition-all ${isSelected ? 'bg-emerald-900/30 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}><div className={`font-bold text-lg ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>${tier.cash}</div><div className="text-[10px] text-slate-500">{new Intl.NumberFormat('en-US').format(tier.gems)} 💎</div><div className="text-[10px] font-mono text-cyan-500/80 mt-1">${rate.toFixed(3)}/1k</div></button>);})}</div></div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center justify-between"><div><label className="block text-sm font-medium text-slate-300">PVI por Defecto</label><p className="text-[10px] text-slate-500 mt-1">Valor inicial para nuevos registros.</p></div><div className="flex items-center gap-2"><Activity size={16} className="text-slate-500" /><input type="number" step="0.01" min="0.1" max="2.0" value={userSettings.defaultPVI} onChange={e => setUserSettings({...userSettings, defaultPVI: e.target.value})} className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-center font-bold focus:ring-2 focus:ring-cyan-500 outline-none" /></div></div>
                    <div className="border-t border-slate-700 pt-4 mt-2"><div className="flex items-center justify-between text-xs text-slate-500"><div className="flex items-center gap-2">{isFirebaseAvailable ? <Database size={14} className="text-emerald-500" /> : <HardDrive size={14} className="text-amber-500" />}<span>Modo: {isFirebaseAvailable ? "Nube" : "Local"}</span></div>{user && <span className="font-mono text-[10px] opacity-50">ID: {user.uid.slice(0,4)}...</span>}</div></div>
                    <button onClick={saveSettings} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-xl transition-colors">Guardar Cambios</button>
                </div>
            </Modal>
        </div>
    );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}