import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, // ใช้สำหรับการ Login Admin จริง
  signInAnonymously, 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc,
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
// Import Realtime Database for Migration
import { getDatabase, ref, get } from 'firebase/database';

import { 
  Trophy, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Share2, 
  Shield, 
  Activity,
  Database,
  RefreshCw,
} from 'lucide-react';

// --- 1. FIREBASE CONFIGURATION (ของจริงจากไฟล์ที่คุณอัปโหลด) ---
const firebaseConfig = {
  apiKey: "AIzaSyCInlbfpvwIMKKWwM4cttN55aWnm2h5dhM",
  authDomain: "shu-football.firebaseapp.com",
  databaseURL: "https://shu-football-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shu-football",
  storageBucket: "shu-football.appspot.com",
  messagingSenderId: "396327353400",
  appId: "1:396327353400:web:7ca5a1c624809692f9facd",
  measurementId: "G-BRLS5XSHYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. Collection Names (Path ปกติสำหรับการใช้งานจริง) ---
const COLLECTIONS = {
  TEAMS: 'teams',
  MATCHES: 'matches',
  SETTINGS: 'settings',
};

// --- Components ---

// Login Component
const Login = ({ onLogin, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
       // วิธีที่ 1: แบบง่าย (Password Simulation) - ใช้แบบนี้ไปก่อนได้ครับ
       if (password === 'admin1234' || email.toLowerCase() === 'admin') {
          onLogin(true); // Success
       } else {
          // วิธีที่ 2: ถ้าอนาคตอยากใช้ Firebase Auth จริงๆ ให้เปิดบรรทัดล่างนี้
          // await signInWithEmailAndPassword(auth, email, password);
          // onLogin(true);
          setError('รหัสผ่านไม่ถูกต้อง (ลองใช้: admin1234)');
       }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 font-chakra">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white placeholder-gray-400"
            placeholder="Admin ID (admin)"
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white placeholder-gray-400"
            placeholder="Password"
          />
          {error && <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:scale-[1.02] active:scale-95"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <button onClick={onCancel} className="w-full mt-4 text-gray-400 hover:text-white text-sm">
          กลับไปหน้าหลัก
        </button>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false); // Client-side admin toggle
  const [activeTab, setActiveTab] = useState('table');
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({ leagueName: 'Loading...', logoUrl: '', footerText: '' });
  const [visitorStats, setVisitorStats] = useState({ today: 0, month: 0, year: 0 });
  const [loading, setLoading] = useState(true);

  // Auth & Data Fetching
  useEffect(() => {
    // Login Anonymously for everyone (Viewers)
    signInAnonymously(auth).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
        setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listeners (Firestore)
    // Note: Using simple collection names now
    const unsubSettings = onSnapshot(collection(db, COLLECTIONS.SETTINGS), (snap) => {
        if (!snap.empty) setSettings(snap.docs[0].data());
        else {
             // If empty, don't crash, just show defaults. 
             // First admin save will create the doc.
             setSettings({ leagueName: 'My League', logoUrl: '', footerText: '' });
        }
    });

    const unsubTeams = onSnapshot(collection(db, COLLECTIONS.TEAMS), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMatches = onSnapshot(collection(db, COLLECTIONS.MATCHES), (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Mock Visitor Stats (For now)
    setVisitorStats({
        today: Math.floor(Math.random() * 50) + 10, 
        month: Math.floor(Math.random() * 200) + 50, 
        year: Math.floor(Math.random() * 1000) + 200
    });

    return () => { unsubSettings(); unsubTeams(); unsubMatches(); };
  }, []);

  // --- Logic: Calculation ---
  const tableData = useMemo(() => {
    const stats = {};
    // Init Stats
    teams.forEach(team => {
      stats[team.id] = { ...team, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] };
    });

    // Process Matches
    const sortedMatches = [...matches].sort((a, b) => (a.md - b.md));
    sortedMatches.forEach(match => {
      if (match.homeScore === undefined || match.awayScore === undefined) return;
      const home = stats[match.homeTeamId];
      const away = stats[match.awayTeamId];

      if (home && away) {
        home.played++; away.played++;
        home.gf += Number(match.homeScore); home.ga += Number(match.awayScore);
        away.gf += Number(match.awayScore); away.ga += Number(match.homeScore);

        if (Number(match.homeScore) > Number(match.awayScore)) {
          home.won++; home.points += 3; away.lost++;
          home.form.push('W'); away.form.push('L');
        } else if (Number(match.homeScore) < Number(match.awayScore)) {
          away.won++; away.points += 3; home.lost++;
          home.form.push('L'); away.form.push('W');
        } else {
          home.draw++; home.points += 1; away.draw++; away.points += 1;
          home.form.push('D'); away.form.push('D');
        }
      }
    });

    // Finalize
    Object.values(stats).forEach(team => {
      team.gd = team.gf - team.ga;
      team.form = team.form.slice(-5);
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  }, [teams, matches]);

  const handleCopyTable = () => {
    const text = tableData.map((t, i) => `${i+1}. ${t.name} | P:${t.points}`).join('\n');
    navigator.clipboard.writeText(`ตารางคะแนน ${settings.leagueName}\n\n${text}`);
    alert('คัดลอกแล้ว!');
  };

  // --- View Routing ---
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100 font-chakra text-gray-500">กำลังโหลดข้อมูล...</div>;
  
  if (activeTab === 'login') {
      return <Login onLogin={(success) => { 
          if(success) { setIsAdminMode(true); setActiveTab('table'); } 
      }} onCancel={() => setActiveTab('table')} />;
  }

  if (isAdminMode) {
    return <AdminPanel teams={teams} matches={matches} settings={settings} onExit={() => { setIsAdminMode(false); setActiveTab('table'); }} />;
  }

  // --- Main UI ---
  return (
    <div className="min-h-screen bg-gray-50 font-chakra text-gray-800 flex flex-col">
       {/* Header */}
       <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <img src={settings.logoUrl} className="w-10 h-10 rounded-full object-cover border bg-gray-100" onError={(e) => e.target.src = 'https://placehold.co/100x100?text=L'}/>
                <h1 className="font-bold text-lg text-slate-800 truncate max-w-[180px] sm:max-w-xs">{settings.leagueName}</h1>
             </div>
             <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <TabButton active={activeTab === 'table'} onClick={() => setActiveTab('table')} icon={<Trophy size={18} />} label="ตาราง" />
                <TabButton active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Calendar size={18} />} label="ผลแข่ง" />
                <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Activity size={18} />} label="สถิติ" />
             </nav>
             <button onClick={() => setActiveTab('login')} className="text-sm text-gray-500 hover:text-blue-600 font-medium px-3 py-2">
                 Admin
             </button>
          </div>
          {/* Mobile Nav */}
          <div className="md:hidden border-t flex justify-around p-2 bg-white fixed bottom-0 left-0 right-0 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
             <TabButtonMobile active={activeTab === 'table'} onClick={() => setActiveTab('table')} icon={<Trophy size={20} />} label="ตาราง" />
             <TabButtonMobile active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Calendar size={20} />} label="ผลแข่ง" />
             <TabButtonMobile active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Activity size={20} />} label="สถิติ" />
          </div>
       </header>

       {/* Content */}
       <main className="flex-grow max-w-4xl mx-auto w-full p-4 mb-20 md:mb-0">
          {activeTab === 'table' && (
            <div className="space-y-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                        <h2 className="font-bold text-lg flex items-center gap-2"><Trophy size={20} className="text-yellow-300" /> ตารางคะแนน</h2>
                        <button onClick={handleCopyTable} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"><Share2 size={18} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-center w-10">#</th>
                                    <th className="px-4 py-3">ทีม</th>
                                    <th className="px-2 py-3 text-center">แข่ง</th>
                                    <th className="px-2 py-3 text-center hidden sm:table-cell">ได้/เสีย</th>
                                    <th className="px-2 py-3 text-center">+/-</th>
                                    <th className="px-4 py-3 text-center font-bold text-blue-700">แต้ม</th>
                                    <th className="px-4 py-3 text-center hidden sm:table-cell">ฟอร์ม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tableData.length === 0 ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400">ไม่พบข้อมูล (เข้าสู่ระบบ Admin เพื่อเพิ่มทีมหรือดึงข้อมูลเก่า)</td></tr>
                                ) : (
                                    tableData.map((team, index) => (
                                        <tr key={team.id} className="hover:bg-blue-50/50 transition duration-150">
                                            <td className="px-4 py-3 text-center font-medium text-gray-400">{index + 1}</td>
                                            <td className="px-4 py-3 flex items-center gap-3">
                                                <img src={team.logo} className="w-8 h-8 rounded-full object-cover border bg-gray-100" onError={(e) => e.target.src = 'https://placehold.co/40?text=?'} />
                                                <span className="font-semibold text-gray-800">{team.name}</span>
                                            </td>
                                            <td className="px-2 py-3 text-center">{team.played}</td>
                                            <td className="px-2 py-3 text-center text-gray-500 text-xs hidden sm:table-cell">{team.gf}/{team.ga}</td>
                                            <td className="px-2 py-3 text-center font-medium">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                                            <td className="px-4 py-3 text-center"><span className="inline-block w-8 h-8 leading-8 rounded-full bg-blue-100 text-blue-700 font-bold shadow-sm">{team.points}</span></td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <div className="flex justify-center gap-1">
                                                    {team.form.map((res, i) => (
                                                        <span key={i} className={`w-2 h-2 rounded-full ${res === 'W' ? 'bg-green-500' : res === 'D' ? 'bg-gray-400' : 'bg-red-500'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'matches' && (
             <div className="space-y-4 animate-fade-in">
                 {matches.length === 0 ? (
                     <div className="text-center p-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">ยังไม่มีข้อมูลการแข่งขัน</div>
                 ) : (
                     Object.entries(matches.reduce((acc, m) => { (acc[m.md] = acc[m.md] || []).push(m); return acc; }, {}))
                     .sort((a, b) => Number(a[0]) - Number(b[0]))
                     .map(([md, mdMatches]) => (
                         <div key={md} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                             <div className="bg-gray-50 px-4 py-2 border-b font-bold text-gray-600 text-sm flex justify-between">
                                 <span>Match Day {md}</span>
                                 <span className="text-xs font-normal bg-white px-2 py-1 rounded border">{mdMatches.length} คู่</span>
                             </div>
                             <div className="divide-y">
                                 {mdMatches.map(match => {
                                     const home = teams.find(t => t.id === match.homeTeamId);
                                     const away = teams.find(t => t.id === match.awayTeamId);
                                     return (
                                         <div key={match.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                             <div className="flex-1 flex items-center justify-end gap-2 text-right">
                                                 <span className="font-medium text-sm hidden sm:block">{home?.name}</span>
                                                 <span className="font-medium text-sm sm:hidden">{home?.name.substring(0,3)}</span>
                                                 <img src={home?.logo} className="w-6 h-6 rounded-full bg-gray-100" />
                                             </div>
                                             <div className="px-3 text-center">
                                                 <span className="bg-slate-800 text-white px-2 py-1 rounded text-sm font-bold">{match.homeScore} - {match.awayScore}</span>
                                             </div>
                                             <div className="flex-1 flex items-center justify-start gap-2">
                                                 <img src={away?.logo} className="w-6 h-6 rounded-full bg-gray-100" />
                                                 <span className="font-medium text-sm hidden sm:block">{away?.name}</span>
                                                 <span className="font-medium text-sm sm:hidden">{away?.name.substring(0,3)}</span>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     ))
                 )}
             </div>
          )}

          {activeTab === 'stats' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                     <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><Users className="text-blue-500" /> จำนวนผู้เข้าชม (Mock)</h3>
                     <div className="grid grid-cols-3 gap-4 text-center">
                         <div className="p-3 bg-blue-50 rounded-xl"><div className="text-2xl font-bold text-blue-700">{visitorStats.today}</div><div className="text-xs text-blue-500">วันนี้</div></div>
                         <div className="p-3 bg-indigo-50 rounded-xl"><div className="text-2xl font-bold text-indigo-700">{visitorStats.month}</div><div className="text-xs text-indigo-500">เดือนนี้</div></div>
                         <div className="p-3 bg-purple-50 rounded-xl"><div className="text-2xl font-bold text-purple-700">{visitorStats.year}</div><div className="text-xs text-purple-500">ปีนี้</div></div>
                     </div>
                 </div>
             </div>
          )}
       </main>

       <footer className="bg-white border-t py-6 hidden md:block">
           <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">{settings.footerText}</div>
       </footer>

       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&display=swap'); 
        .font-chakra { font-family: 'Chakra Petch', sans-serif; } 
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; } 
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
       `}</style>
    </div>
  );
}

// --- Sub Components ---
const TabButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>{icon} {label}</button>
);
const TabButtonMobile = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>{icon}<span className="text-[10px] mt-1 font-medium">{label}</span></button>
);

// --- Admin Panel & MIGRATION ---
const AdminPanel = ({ teams, matches, settings, onExit }) => {
    const [tab, setTab] = useState('teams');
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamLogo, setNewTeamLogo] = useState('');
    const [matchDay, setMatchDay] = useState(1);
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [homeScore, setHomeScore] = useState('');
    const [awayScore, setAwayScore] = useState('');
    
    const [migrating, setMigrating] = useState(false);
    const [migrationMsg, setMigrationMsg] = useState('');

    // --- MIGRATION LOGIC (Using RTDB) ---
    const handleMigrate = async () => {
        if (!confirm("ยืนยันการดึงข้อมูลจากระบบเก่า? (ข้อมูลปัจจุบันในระบบใหม่จะถูกแทนที่)")) return;
        setMigrating(true);
        setMigrationMsg('กำลังเชื่อมต่อฐานข้อมูลเก่า...');

        try {
            // ใช้ Config เดิมได้เลยเพราะอยู่ในโปรเจกต์เดียวกัน แต่ต้อง initialize ใหม่เพื่อใช้ RTDB SDK
            // หากมี app ชื่อ 'oldApp' อยู่แล้วให้ใช้ตัวเดิม ถ้าไม่มีให้สร้างใหม่
            // แต่ในที่นี้เราใช้ `getDatabase(app)` ได้เลยถ้า config เดียวกันมี databaseURL อยู่แล้ว
            const rtdb = getDatabase(app); 
            
            setMigrationMsg('กำลังโหลดข้อมูลจาก Realtime Database...');
            const teamsSnap = await get(ref(rtdb, 'teams'));
            const matchesSnap = await get(ref(rtdb, 'matches'));
            const settingsSnap = await get(ref(rtdb, 'site_settings'));

            const oldTeams = teamsSnap.val() || {};
            const oldMatches = matchesSnap.val() || {};
            const oldSettings = settingsSnap.val() || {};

            setMigrationMsg('กำลังบันทึกสู่ Firestore...');
            const batch = writeBatch(db);

            // Teams
            Object.entries(oldTeams).forEach(([key, team]) => {
                const docRef = doc(db, COLLECTIONS.TEAMS, key);
                batch.set(docRef, { name: team.name || 'Unnamed', logo: team.logo || '', createdAt: serverTimestamp() });
            });

            // Matches
            Object.entries(oldMatches).forEach(([key, match]) => {
                 if (match.homeTeamId && match.awayTeamId) {
                    const docRef = doc(db, COLLECTIONS.MATCHES, key);
                    batch.set(docRef, {
                        md: Number(match.md || 1),
                        homeTeamId: match.homeTeamId,
                        awayTeamId: match.awayTeamId,
                        homeScore: Number(match.homeScore),
                        awayScore: Number(match.awayScore),
                        createdAt: serverTimestamp()
                    });
                 }
            });

            // Settings
            if (oldSettings.leagueName) {
                 const settingsRef = doc(collection(db, COLLECTIONS.SETTINGS));
                 // Create new settings doc (or you could query for existing to update)
                 batch.set(settingsRef, {
                     leagueName: oldSettings.leagueName,
                     logoUrl: oldSettings.logoUrl || '',
                     footerText: oldSettings.footerText || '',
                     updatedAt: serverTimestamp()
                 });
            }

            await batch.commit();
            alert("ย้ายข้อมูลสำเร็จ! กรุณารีเฟรชหน้าจอ");
            window.location.reload();

        } catch (error) {
            console.error(error);
            setMigrationMsg('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setMigrating(false);
        }
    };

    // Actions
    const addTeam = async (e) => {
        e.preventDefault();
        if(!newTeamName) return;
        await addDoc(collection(db, COLLECTIONS.TEAMS), { name: newTeamName, logo: newTeamLogo, createdAt: serverTimestamp() });
        setNewTeamName(''); setNewTeamLogo('');
    };
    const deleteTeam = async (id) => { if(confirm('ยืนยันการลบ?')) await deleteDoc(doc(db, COLLECTIONS.TEAMS, id)); };
    const addMatch = async (e) => {
        e.preventDefault();
        if(!homeTeamId || !awayTeamId) return;
        await addDoc(collection(db, COLLECTIONS.MATCHES), { md: Number(matchDay), homeTeamId, awayTeamId, homeScore: Number(homeScore), awayScore: Number(awayScore), createdAt: serverTimestamp() });
        setHomeScore(''); setAwayScore('');
    };
    const deleteMatch = async (id) => { if(confirm('ยืนยันการลบ?')) await deleteDoc(doc(db, COLLECTIONS.MATCHES, id)); };
    const AdminNavBtn = ({ active, onClick, icon, label }) => (
        <button onClick={onClick} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition ${active ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{icon} <span className="font-medium">{label}</span></button>
    );

    return (
        <div className="min-h-screen bg-gray-100 flex font-chakra">
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-bold flex items-center gap-2"><Shield /> Admin Panel</h2></div>
                <nav className="flex-grow p-4 space-y-2">
                    <AdminNavBtn active={tab === 'teams'} onClick={() => setTab('teams')} icon={<Users size={18} />} label="จัดการทีม" />
                    <AdminNavBtn active={tab === 'matches'} onClick={() => setTab('matches')} icon={<Trophy size={18} />} label="บันทึกผลแข่ง" />
                    <AdminNavBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings size={18} />} label="ตั้งค่า & ย้ายข้อมูล" />
                </nav>
                <div className="p-4"><button onClick={onExit} className="flex items-center gap-2 text-red-400 w-full p-2 hover:text-red-300"><LogOut size={18} /> ออกจากระบบ</button></div>
            </aside>

            <main className="flex-grow p-6 overflow-y-auto h-screen">
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Admin</h2>
                    <div className="flex gap-2">
                         <button onClick={() => setTab('settings')} className="bg-gray-200 p-2 rounded-full"><Settings size={20}/></button>
                         <button onClick={onExit} className="text-red-500 p-2"><LogOut size={20} /></button>
                    </div>
                </div>
                <div className="md:hidden flex gap-2 mb-6 overflow-x-auto">
                     <button onClick={() => setTab('teams')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab==='teams' ? 'bg-blue-600 text-white' : 'bg-white'}`}>ทีม</button>
                     <button onClick={() => setTab('matches')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab==='matches' ? 'bg-blue-600 text-white' : 'ผลแข่ง'}`}>ผลแข่ง</button>
                     <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab==='settings' ? 'bg-blue-600 text-white' : 'bg-white'}`}>ตั้งค่า</button>
                </div>

                {tab === 'teams' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold mb-4 flex gap-2"><Plus className="text-green-500"/> เพิ่มทีมใหม่</h3>
                            <form onSubmit={addTeam} className="flex flex-col md:flex-row gap-4">
                                <input type="text" placeholder="ชื่อทีม" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 p-2 border rounded-lg" required />
                                <input type="text" placeholder="URL โลโก้" value={newTeamLogo} onChange={e => setNewTeamLogo(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                                <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-lg">เพิ่ม</button>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-sm"><tbody className="divide-y">{teams.map(team => (<tr key={team.id}><td className="p-4 flex items-center gap-3"><img src={team.logo} className="w-8 h-8 rounded-full object-cover bg-gray-200" /><span className="font-medium">{team.name}</span></td><td className="p-4 text-right"><button onClick={() => deleteTeam(team.id)} className="text-red-500 p-2"><Trash2 size={18}/></button></td></tr>))}</tbody></table>
                        </div>
                    </div>
                )}

                {tab === 'matches' && (
                    <div className="space-y-6">
                         <div className="bg-white p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold mb-4 flex gap-2"><Plus className="text-green-500"/> บันทึกผลแข่ง</h3>
                            <form onSubmit={addMatch} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <div className="col-span-2 md:col-span-1"><label className="text-xs text-gray-500">MD</label><input type="number" min="1" value={matchDay} onChange={e => setMatchDay(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
                                <div className="col-span-2 md:col-span-2"><label className="text-xs text-gray-500">ทีมเหย้า</label><select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)} className="w-full p-2 border rounded-lg" required><option value="">เลือกทีม</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                                <div className="col-span-1"><label className="text-xs text-gray-500">ได้</label><input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)} className="w-full p-2 border rounded-lg text-center" required /></div>
                                <div className="col-span-1"><label className="text-xs text-gray-500">เสีย</label><input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)} className="w-full p-2 border rounded-lg text-center" required /></div>
                                <div className="col-span-2 md:col-span-2"><label className="text-xs text-gray-500">ทีมเยือน</label><select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)} className="w-full p-2 border rounded-lg" required><option value="">เลือกทีม</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                                <div className="col-span-2 md:col-span-6 mt-2"><button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">บันทึก</button></div>
                            </form>
                        </div>
                        <div className="space-y-2">{matches.sort((a,b) => b.createdAt - a.createdAt).map(match => { const home = teams.find(t => t.id === match.homeTeamId); const away = teams.find(t => t.id === match.awayTeamId); return (<div key={match.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">MD {match.md}</span><span className="font-medium">{home?.name}</span><span className="bg-slate-800 text-white px-2 py-1 rounded text-sm font-bold">{match.homeScore} - {match.awayScore}</span><span className="font-medium">{away?.name}</span></div><button onClick={() => deleteMatch(match.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button></div>) })}</div>
                    </div>
                )}

                {tab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                            <h3 className="font-bold text-blue-800 text-lg mb-2 flex items-center gap-2"><Database /> ดึงข้อมูลเก่า (Migration Tool)</h3>
                            <p className="text-sm text-blue-600 mb-4">ดึงข้อมูลจาก Realtime Database มายัง Firestore (ทำครั้งเดียวเมื่อเริ่มระบบ)</p>
                            <button onClick={handleMigrate} disabled={migrating} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50">{migrating ? <RefreshCw className="animate-spin"/> : <RefreshCw />} {migrating ? 'กำลังย้าย...' : 'เริ่มย้ายข้อมูลทันที'}</button>
                            {migrationMsg && <p className="mt-3 text-sm bg-white p-2 rounded border">{migrationMsg}</p>}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
