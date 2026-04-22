import React, { useState, useEffect } from 'react';
import { CONCESSIONARIAS, Concessionaria } from '../constants/concessionarias';
import { generateFullRelayCurve, CurveType, calculateInominal, calculateANSIPoints, calculateInrushPoint, calculateInPlant, CURVE_CONSTANTS } from '../lib/protection-utils';
import { CoordChart, SpecialPoint } from './CoordChart';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Settings, Save, FileText, LayoutList, LogOut, ChevronRight, AlertTriangle, CheckCircle2, User as UserIcon, ShieldAlert, Menu, X as CloseIcon, Plus, Trash2, History as HistoryIcon, Search, HelpCircle, Cpu } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AdminPanel } from './AdminPanel';
import { ReportView } from './ReportView';
import { FieldInfo } from './ui/FieldInfo';
import { HelpMenu } from './HelpMenu';

interface Equipamento {
  id: string;
  tipo: string;
  kva: number;
  qtd: number;
  descricao: string;
}

interface StudyData {
  projeto: string;
  proprietario: string;
  endereco: string;
  cnpj_proprietario: string;
  telefone_proprietario: string;
  demanda_contratada: number;
  demanda_nova: number;
  fator_potencia: number;
  observacoes: string;
  concessionariaId: string;
  trafo_kva: number; 
  trafo_v_prim: number;
  trafo_v_sec: number;
  trafo_z: number;
  trafo_isolamento: string;
  icc_3f: number;
  icc_1f: number;
  tc_relacao: string;
  tc_classe: string;
  fusivel_concessionaria: string;
  equipamentos: Equipamento[];
  rele_marca: string;
  rele_modelo: string;
  rt_nome: string;
  rt_crea: string;
  rt_tel: string;
  art_numero: string;
  codigo_instalacao: string;
  normas_selecionadas: string[];
  funcoes_adicionais: {
    [key: string]: { 
      habilitada: boolean; 
      ajuste: string;
      f_low?: number;
      f_high?: number;
      t_low?: number;
      t_high?: number;
    };
  };
  geracao_propria: { habilitada: boolean; descricao: string; i_adj: number; t_adj: number };
  sincronismo: { habilitada: boolean; ajuste: string; i_low: number; i_high: number };
  rele_fase: {
    pickup: number;
    tms: number;
    curva: CurveType;
    A: number;
    B: number;
    P: number;
    i_def: number;
    t_def: number;
    i_inst: number;
  };
  rele_neutro: {
    pickup: number;
    tms: number;
    curva: CurveType;
    A: number;
    B: number;
    P: number;
    i_def: number;
    t_def: number;
    i_inst: number;
  };
}

const DEFAULT_STUDY: StudyData = {
  projeto: 'ESTUDO PADRÃO',
  proprietario: '',
  endereco: '',
  cnpj_proprietario: '',
  telefone_proprietario: '',
  demanda_contratada: 0,
  demanda_nova: 0,
  fator_potencia: 0.92,
  observacoes: '',
  concessionariaId: 'enel_sp',
  trafo_kva: 500,
  trafo_v_prim: 13800,
  trafo_v_sec: 220,
  trafo_z: 5,
  trafo_isolamento: 'A Óleo',
  icc_3f: 5000,
  icc_1f: 1200,
  tc_relacao: '50/5',
  tc_classe: '10B100',
  fusivel_concessionaria: '20K',
  equipamentos: [],
  rele_marca: '',
  rele_modelo: '',
  rt_nome: '',
  rt_crea: '',
  rt_tel: '',
  art_numero: '',
  codigo_instalacao: '',
  normas_selecionadas: ['CNC-OMBR-ENS-18-001', 'CNC-OMBR-ENS-18-002'],
  funcoes_adicionais: {
    '27': { habilitada: false, ajuste: '' },
    '59': { habilitada: false, ajuste: '' },
    '81': { habilitada: false, ajuste: '', f_low: 58.5, f_high: 61.5, t_low: 0.1, t_high: 0.1 },
    '32': { habilitada: false, ajuste: '' },
    '46': { habilitada: false, ajuste: '' },
    '47': { habilitada: false, ajuste: '' }
  },
  geracao_propria: { habilitada: false, descricao: '', i_adj: 0, t_adj: 0 },
  sincronismo: { habilitada: false, ajuste: '', i_low: 0, i_high: 0 },
  rele_fase: { pickup: 30, tms: 0.1, curva: 'IEC_NI', A: 0.14, B: 0, P: 0.02, i_def: 0, t_def: 0, i_inst: 0 },
  rele_neutro: { pickup: 10, tms: 0.1, curva: 'IEC_NI', A: 0.14, B: 0, P: 0.02, i_def: 0, t_def: 0, i_inst: 0 }
};

export const CoordSystem: React.FC<{ user: any }> = ({ user }) => {
  const [study, setStudy] = useState<StudyData>(DEFAULT_STUDY);
  const [view, setView] = useState<'study' | 'admin' | 'history'>('study');
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleCurves, setVisibleCurves] = useState<string[]>(['Fase (51)', 'Fase (50)', 'Neutro (51N)', 'Neutro (50N)', 'Geração', 'Sync (25)']);
  const [visibleIcc, setVisibleIcc] = useState<string[]>(['Icc 3f', 'Icc 1f']);
  const [savedCalculos, setSavedCalculos] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (user.status === 'Trial') {
      const now = new Date();
      if (now > user.trial_fim) {
        setIsTrialExpired(true);
      }
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const q = query(
        collection(db, 'calculos'),
        where('user_id', '==', user.id),
        orderBy('data', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedCalculos(docs);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'calculos'), {
        user_id: user.id,
        projeto_nome: study.projeto,
        concessionaria: study.concessionariaId,
        dados_json: JSON.stringify(study),
        data: serverTimestamp()
      });
      alert("Estudo salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar estudo.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStudy = async (id: string) => {
    if (!id) {
      console.error("ID de exclusão inválido");
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este estudo permanentemente?")) return;
    
    try {
      console.log("Tentando excluir documento:", id);
      await deleteDoc(doc(db, 'calculos', id));
      setSavedCalculos(prev => prev.filter(s => s.id !== id));
      alert("Estudo excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      try {
        handleFirestoreError(error, 'delete', `calculos/${id}`);
      } catch (err: any) {
        alert("Erro ao excluir: " + (err.message || "Erro desconhecido"));
      }
    }
  };

  const loadStudy = (dataJson: string) => {
    try {
      const loadedData = JSON.parse(dataJson);
      // Merge with DEFAULT_STUDY to ensure all new fields exist
      setStudy({
        ...DEFAULT_STUDY,
        ...loadedData,
        // Deep merge objects that might be partially present
        rele_fase: { ...DEFAULT_STUDY.rele_fase, ...(loadedData.rele_fase || {}) },
        rele_neutro: { ...DEFAULT_STUDY.rele_neutro, ...(loadedData.rele_neutro || {}) },
        funcoes_adicionais: Object.keys(DEFAULT_STUDY.funcoes_adicionais).reduce((acc: any, key) => {
          acc[key] = {
            ...DEFAULT_STUDY.funcoes_adicionais[key],
            ...(loadedData.funcoes_adicionais?.[key] || {})
          };
          return acc;
        }, {}),
        geracao_propria: { ...DEFAULT_STUDY.geracao_propria, ...(loadedData.geracao_propria || {}) },
        sincronismo: { ...DEFAULT_STUDY.sincronismo, ...(loadedData.sincronismo || {}) }
      });
      setView('study');
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const autoAdjust = () => {
    // Ip = S / (V * sqrt(3)) * K
    const Inom = (study.trafo_kva * 1000) / (study.trafo_v_prim * 1.73);
    const pickupFase = Math.ceil(Inom * 1.5); // Fixed for example
    const pickupNeutro = Math.ceil(pickupFase * 0.2);
    
    setStudy({
      ...study,
      rele_fase: { ...study.rele_fase, pickup: pickupFase },
      rele_neutro: { ...study.rele_neutro, pickup: pickupNeutro }
    });
  };

  const addEquipamento = () => {
    const newEquip = {
      id: crypto.randomUUID(),
      tipo: 'Transformador',
      kva: 0,
      qtd: 1,
      descricao: ''
    };
    setStudy({ ...study, equipamentos: [...study.equipamentos, newEquip] });
  };

  const removeEquipamento = (id: string) => {
    setStudy({ ...study, equipamentos: study.equipamentos.filter(e => e.id !== id) });
  };

  const updateEquipamento = (id: string, field: keyof Equipamento, value: any) => {
    setStudy({
      ...study,
      equipamentos: study.equipamentos.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const validateStudy = () => {
    const newAlerts: string[] = [];
    const conc = CONCESSIONARIAS.find(c => c.id === study.concessionariaId);
    
    // Basic field validation
    if (!study.proprietario) newAlerts.push("Falta o nome do proprietário");
    if (!study.endereco) newAlerts.push("Falta o endereço da subestação");
    if (study.demanda_nova <= 0) newAlerts.push("Defina a nova demanda do projeto");
    if (study.trafo_kva <= 0) newAlerts.push("Potência do trafo não pode ser zero");

    if (conc) {
       // Requirement verification based on concessionaire
       if (study.rele_fase.tms < 0.05) newAlerts.push(`Coordenagem de fase muito rápida para ${conc.nome}`);
       if (study.trafo_kva >= 300 && study.equipamentos.length === 0) {
         newAlerts.push(`Para ${study.trafo_kva}kVA, informe os equipamentos alimentados`);
       }
       if (study.trafo_kva > 1000 && study.rele_fase.pickup < 40) newAlerts.push("Pickup de fase baixo para a potência instalada");
    }

    setAlerts(newAlerts);
  };

  useEffect(() => {
    validateStudy();
  }, [study]);

  const [showReport, setShowReport] = useState(false);

  const toggleCurve = (label: string) => {
    setVisibleCurves(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label]
    );
  };

  const toggleIcc = (label: string) => {
    setVisibleIcc(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label]
    );
  };

  const allCurves = [
    {
      label: 'Fase (51)',
      points: generateFullRelayCurve(
        study.rele_fase.pickup, 
        study.rele_fase.tms, 
        study.rele_fase.curva, 
        [1, (study.icc_3f || 5000) * 2], 
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        0 // Não incluir instantâneo no rastro da temporizada
      ),
      color: '#22c55e'
    },
    {
      label: 'Fase (50)',
      points: study.rele_fase.i_inst > 0 ? [
        { I: study.rele_fase.i_inst, t: 1000 },
        { I: study.rele_fase.i_inst, t: 0.015 }
      ] : [],
      color: '#4ade80'
    },
    {
      label: 'Neutro (51N)',
      points: generateFullRelayCurve(
        study.rele_neutro.pickup, 
        study.rele_neutro.tms, 
        study.rele_neutro.curva, 
        [1, (study.icc_1f || 1200) * 2], 
        { A: study.rele_neutro.A, B: study.rele_neutro.B, P: study.rele_neutro.P },
        study.rele_neutro.i_def,
        study.rele_neutro.t_def,
        0 // Não incluir instantâneo no rastro da temporizada
      ),
      color: '#3b82f6'
    },
    {
      label: 'Neutro (50N)',
      points: study.rele_neutro.i_inst > 0 ? [
        { I: study.rele_neutro.i_inst, t: 1000 },
        { I: study.rele_neutro.i_inst, t: 0.015 }
      ] : [],
      color: '#60a5fa'
    },
    {
      label: 'Geração',
      points: study.geracao_propria?.habilitada && study.geracao_propria?.i_adj > 0 ? [
        { I: study.geracao_propria.i_adj, t: 1000 },
        { I: study.geracao_propria.i_adj, t: study.geracao_propria.t_adj || 0.1 },
        { I: (study.icc_3f || 5000) * 1.5, t: study.geracao_propria.t_adj || 0.1 }
      ] : [],
      color: '#a855f7'
    },
    {
      label: 'Sync (25)',
      points: study.sincronismo?.habilitada && study.sincronismo?.i_low > 0 ? [
        { I: study.sincronismo.i_low, t: 1000 },
        { I: study.sincronismo.i_low, t: 10 },
        { I: study.sincronismo.i_high, t: 10 },
        { I: study.sincronismo.i_high, t: 1000 }
      ] : [],
      color: '#06b6d4'
    }
  ];

  const curves = allCurves.filter(c => visibleCurves.includes(c.label));

  // Cemig Specific Points
  const specialPoints: SpecialPoint[] = [];
  
  // Plant Nominal Point
  const InomPlant = calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia);
  specialPoints.push({ label: 'CARGA', I: InomPlant, t: 10, type: 'NOMINAL' });

  // Main Transformer Points
  specialPoints.push(...calculateANSIPoints(study.trafo_kva, study.trafo_v_prim, study.trafo_z).map(p => ({...p, type: 'ANSI' as any})));
  specialPoints.push({...calculateInrushPoint(study.trafo_kva, study.trafo_v_prim), type: 'INRUSH' as any});

  // Geração e Sincronismo Markers
  if (study.geracao_propria?.habilitada && study.geracao_propria?.i_adj > 0) {
    specialPoints.push({ label: 'G_PICKUP', I: study.geracao_propria.i_adj, t: study.geracao_propria.t_adj || 0.1, type: 'GERACAO' });
  }
  if (study.sincronismo?.habilitada && study.sincronismo?.i_low > 0) {
    specialPoints.push({ label: 'SYNC_L', I: study.sincronismo.i_low, t: 10, type: 'SINCRONISMO' });
    specialPoints.push({ label: 'SYNC_H', I: study.sincronismo.i_high, t: 10, type: 'SINCRONISMO' });
  }

  // Additional Equipment Points
  study.equipamentos.filter(e => e.tipo === 'Transformador').forEach(eq => {
    specialPoints.push(...calculateANSIPoints(eq.kva * eq.qtd, study.trafo_v_prim, 5).map(p => ({...p, type: 'ANSI' as any})));
    specialPoints.push({...calculateInrushPoint(eq.kva * eq.qtd, study.trafo_v_prim), type: 'INRUSH' as any});
  });

  if (isTrialExpired && user.email !== 'patricioaug@gmail.com') {
    return (
      <div className="h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-zinc-900 border-2 border-red-900 p-10 rounded-xl">
          <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-red-500 mb-4 uppercase">Acesso Bloqueado</h2>
          <p className="text-zinc-400 mb-8 font-mono">
            Seu período de avaliação de 7 dias terminou. 
            Entre em contato pelo e-mail <span className="text-red-400 font-bold">patricioaug@gmail.com</span> para continuar utilizando o sistema.
          </p>
          <button 
            onClick={() => signOut(auth)}
            className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded uppercase tracking-wider"
          >
            Encerrar Sessão
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
        />
      )}
      
      {/* Sidebar Toggle Button (Mobile/Mini) */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-green-500/30 text-green-500 rounded-md hover:bg-green-500 hover:text-black transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed lg:relative inset-y-0 left-0 w-64 bg-[#09090b] border-r border-[#22c55e33] flex flex-col z-40"
          >
            <div className="p-5 border-b border-[#22c55e33] flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 overflow-hidden">
                  <Cpu className="text-[#22c55e] w-5 h-5 shrink-0" />
                  <span className="text-sm font-black tracking-tighter uppercase truncate text-white">Sistema Coordenograma</span>
                </div>
                <p className="text-[9px] text-[#14532d] uppercase tracking-widest font-bold">Versão 1.1.0 (PRO)</p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-[#22c55e1a] rounded text-[#71717a] hover:text-[#22c55e] shrink-0"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
             onClick={() => { setView('study'); setIsSidebarOpen(false); }}
             className={`w-full text-left px-4 py-3 rounded text-xs flex items-center gap-3 transition-colors ${view === 'study' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-zinc-600 hover:text-green-700'}`}
           >
             <LayoutList className="w-4 h-4" />
             ELABORAÇÃO
           </button>
           <button 
             onClick={() => { setShowHelp(true); setIsSidebarOpen(false); }}
             className="w-full text-left px-4 py-3 rounded text-xs flex items-center gap-3 transition-colors text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 font-bold"
           >
             <HelpCircle className="w-4 h-4" />
             COMO USAR?
           </button>
          <button 
             onClick={() => { setView('history'); setIsSidebarOpen(false); }}
             className={`w-full text-left px-4 py-3 rounded text-xs flex items-center gap-3 transition-colors ${view === 'history' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-zinc-600 hover:text-green-700'}`}
          >
            <HistoryIcon className="w-4 h-4" />
            HISTÓRICO
          </button>
          
          {user.email === 'patricioaug@gmail.com' && (
            <button 
              onClick={() => { setView('admin'); setIsSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded text-xs flex items-center gap-3 transition-colors ${view === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'text-zinc-600 hover:text-blue-700'}`}
            >
              <ShieldAlert className="w-4 h-4" />
              ADMINISTRADOR
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-green-500/20">
          <div className="bg-zinc-900/50 p-3 rounded mb-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center text-green-300">
               {user.nome[0].toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-[10px] truncate leading-tight font-bold opacity-80">{user.nome.toUpperCase()}</p>
               <p className="text-[9px] truncate text-green-800 font-mono">{user.status} - {Math.ceil((user.trial_fim - new Date().getTime()) / (1000*60*60*24))} Dias</p>
             </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full py-2 text-xs text-zinc-600 hover:text-red-500 flex items-center justify-center gap-2 border border-zinc-800 hover:border-red-900 rounded transition-all"
          >
            <LogOut className="w-3 h-3" /> SAIR
          </button>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black scrollbar-hide">
        {view === 'admin' ? (
          <AdminPanel />
        ) : view === 'history' ? (
          <div className="p-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-bold flex items-center gap-3">
                 <HistoryIcon className="text-green-500" /> HISTÓRICO DE ESTUDOS
               </h2>
               <button 
                 onClick={() => setView('study')}
                 className="px-4 py-2 border border-zinc-800 hover:border-green-500 text-zinc-500 hover:text-green-500 rounded text-xs transition-all"
               >
                 VOLTAR PARA ELABORAÇÃO
               </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCalculos.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-900 rounded-xl">
                  <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-mono">NENHUM ESTUDO SALVO ENCONTRADO</p>
                </div>
              )}
              {savedCalculos.map((calc) => (
                <div key={calc.id} className="bg-zinc-950 border border-zinc-900 p-6 rounded-xl group hover:border-green-900/50 transition-all">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-green-500 font-bold uppercase truncate max-w-[180px]">{calc.projeto_nome || 'SEM NOME'}</h4>
                        <p className="text-[10px] text-zinc-600 mt-1 uppercase">{calc.concessionaria}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStudy(calc.id);
                        }}
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-red-900/50"
                        title="Excluir Estudo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="space-y-2 mb-6">
                      <p className="text-[10px] text-zinc-700 flex justify-between">
                        <span>DATA:</span>
                        <span>{calc.data?.toDate().toLocaleDateString() || '--/--/----'}</span>
                      </p>
                   </div>
                   <button 
                     onClick={() => loadStudy(calc.dados_json)}
                     className="w-full py-2 bg-zinc-900 hover:bg-green-600 text-zinc-500 hover:text-black font-bold text-[10px] rounded uppercase transition-all"
                   >
                     ABRIR ESTUDO
                   </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`p-4 sm:p-8 ${!isSidebarOpen ? 'pl-20' : ''}`}>
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-green-500 rounded-sm"></span>
                  {study.projeto}
                </h2>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 border border-green-500/20 rounded-full text-green-700 uppercase">
                    Conc: {CONCESSIONARIAS.find(c => c.id === study.concessionariaId)?.nome}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 border border-green-500/20 rounded-full text-green-700 uppercase">
                    Status: PROTEÇÃO EM DIA
                  </span>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   className="flex-1 sm:flex-none p-2 border border-green-900 hover:border-green-500 rounded text-green-700 hover:text-green-400 transition-all flex justify-center disabled:opacity-50"
                 >
                   <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                 </button>
                 <button 
                   onClick={() => setShowReport(true)}
                   className="flex-3 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-950/20 hover:bg-green-500 border border-green-800 hover:text-black text-green-500 text-xs font-bold rounded transition-all transition-duration-300"
                 >
                   <FileText className="w-4 h-4" /> EXPORTAR PDF
                 </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Controls */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-green-200 mb-4 uppercase">
                    <UserIcon className="w-3.5 h-3.5" /> Dados do Projeto
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <FieldInfo label="Nome do Estudo / Projeto" description="Nome de identificação único para este estudo de proteção." />
                      <input 
                        type="text" 
                        value={study.projeto}
                        onChange={(e) => setStudy({...study, projeto: e.target.value})}
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <FieldInfo label="Proprietário / Cliente" description="Nome completo ou razão social do titular da unidade consumidora." />
                      <input 
                        type="text" 
                        value={study.proprietario}
                        onChange={(e) => setStudy({...study, proprietario: e.target.value})}
                        placeholder="Nome completo do proprietário"
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldInfo label="CNPJ do Cliente" description="Cadastro Nacional da Pessoa Jurídica para faturamento e registro." />
                        <input 
                          type="text" 
                          value={study.cnpj_proprietario}
                          onChange={(e) => setStudy({...study, cnpj_proprietario: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Cód. Instalação" description="Código único de identificação da unidade consumidora junto à concessionária." />
                        <input 
                          type="text" 
                          value={study.codigo_instalacao}
                          onChange={(e) => setStudy({...study, codigo_instalacao: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-red-500 p-2 text-xs rounded outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldInfo label="Endereço da Instalação" description="Localização geográfica onde os equipamentos de proteção estão instalados." />
                      <input 
                        type="text" 
                        value={study.endereco}
                        onChange={(e) => setStudy({...study, endereco: e.target.value})}
                        placeholder="Rua, Número, Bairro, Cidade"
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <FieldInfo label="Dem. Contratada (kW)" description="Potência ativa máxima permitida pelo contrato atual com a concessionária." />
                        <input 
                          type="number" 
                          value={study.demanda_contratada}
                          onChange={(e) => setStudy({...study, demanda_contratada: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Dem. Nova (kW)" description="Nova demanda total do projeto após expansão ou nova instalação." />
                        <input 
                          type="number" 
                          value={study.demanda_nova}
                          onChange={(e) => setStudy({...study, demanda_nova: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-red-500 p-2 text-xs rounded outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="F.P. (0.92)" description="Fator de potência considerado no estudo (padrão 0.92 para evitar multas)." />
                        <input 
                          type="number" 
                          step="0.01"
                          value={study.fator_potencia}
                          onChange={(e) => setStudy({...study, fator_potencia: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold mb-4 flex items-center gap-2 text-green-200 uppercase">
                    <ShieldAlert className="w-3.5 h-3.5" /> Responsável Técnico
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <FieldInfo label="Nome do RT" description="Nome completo do Responsável Técnico pelo projeto de proteção." />
                      <input 
                        type="text" 
                        value={study.rt_nome}
                        onChange={(e) => setStudy({...study, rt_nome: e.target.value})}
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldInfo label="CREA" description="Registro no Conselho Regional de Engenharia e Agronomia." />
                        <input 
                          type="text" 
                          value={study.rt_crea}
                          onChange={(e) => setStudy({...study, rt_crea: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Número ART" description="Número da Anotação de Responsabilidade Técnica vinculada ao estudo." />
                        <input 
                          type="text" 
                          value={study.art_numero}
                          onChange={(e) => setStudy({...study, art_numero: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold mb-4 flex items-center gap-2 text-green-200 uppercase">
                    <Settings className="w-3.5 h-3.5" /> Dados do Sistema
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <FieldInfo label="Concessionária" description="Selecione a empresa distribuidora de energia da região do projeto." />
                      <select 
                        value={study.concessionariaId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const selected = CONCESSIONARIAS.find(c => c.id === id);
                          
                          let newStudy = {
                            ...study, 
                            concessionariaId: id,
                            normas_selecionadas: selected ? [...selected.normas] : []
                          };

                          // Auto-adjust curves for Cemig default study pattern
                          if (id === 'cemig_mg') {
                            newStudy = {
                              ...newStudy,
                              rele_fase: { ...newStudy.rele_fase, curva: 'IEC_EI' },
                              rele_neutro: { ...newStudy.rele_neutro, curva: 'IEC_LONG' }
                            };
                          }

                          setStudy(newStudy);
                        }}
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500"
                      >
                        {CONCESSIONARIAS.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.estado})</option>)}
                      </select>
                    </div>

                    <div className="mt-2">
                       <label className="text-[10px] text-zinc-500 uppercase block mb-2">Normas Técnicas Aplicáveis</label>
                       <div className="flex flex-wrap gap-2">
                          {CONCESSIONARIAS.find(c => c.id === study.concessionariaId)?.normas.map(norma => (
                            <button
                              key={norma}
                              onClick={() => {
                                const exists = study.normas_selecionadas.includes(norma);
                                setStudy({
                                  ...study,
                                  normas_selecionadas: exists 
                                    ? study.normas_selecionadas.filter(n => n !== norma)
                                    : [...study.normas_selecionadas, norma]
                                });
                              }}
                              className={`px-2 py-1 text-[9px] rounded border transition-all ${
                                study.normas_selecionadas.includes(norma)
                                  ? 'bg-green-600/20 border-green-500 text-green-400'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-600 opacity-50'
                              }`}
                            >
                              {norma}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FieldInfo label="Trafo (kVA)" description="Potência nominal do transformador principal da instalação." />
                        <input 
                          type="number" 
                          value={study.trafo_kva}
                          onChange={(e) => setStudy({...study, trafo_kva: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Imp (%)" description="Impedância percentual de curto-circuito do transformador." />
                        <input 
                          type="number" 
                          value={study.trafo_z}
                          onChange={(e) => setStudy({...study, trafo_z: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <FieldInfo label="V. Primária (V)" description="Tensão nominal no lado de alta do transformador." />
                        <input 
                          type="number" 
                          value={study.trafo_v_prim}
                          onChange={(e) => setStudy({...study, trafo_v_prim: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="V. Secundária (V)" description="Tensão nominal no lado de baixa do transformador." />
                        <input 
                          type="number" 
                          value={study.trafo_v_sec}
                          onChange={(e) => setStudy({...study, trafo_v_sec: Number(e.target.value)})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Isolamento" description="Meio de isolação do transformador (Óleo, Seco, etc)." />
                        <select 
                          value={study.trafo_isolamento}
                          onChange={(e) => setStudy({...study, trafo_isolamento: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-[10px] rounded outline-none focus:border-green-500 transition-all"
                        >
                          <option value="A Óleo">A Óleo</option>
                          <option value="Seco">Seco</option>
                          <option value="Silicone">Silicone</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <FieldInfo label="TC Relação" description="Relação de transformação dos TCs existentes (ex: 50/5)." />
                        <input 
                          type="text" 
                          value={study.tc_relacao}
                          onChange={(e) => setStudy({...study, tc_relacao: e.target.value})}
                          placeholder="50/5"
                          className="w-full bg-black border border-zinc-800 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="TC Classe" description="Classe de exatidão e carga nominal do TC (ex: 10B100)." />
                        <input 
                          type="text" 
                          value={study.tc_classe}
                          onChange={(e) => setStudy({...study, tc_classe: e.target.value})}
                          placeholder="10B100"
                          className="w-full bg-black border border-zinc-800 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <FieldInfo label="Icc 3φ (A)" description="Corrente de curto-circuito trifásico máxima no ponto de entrega." />
                        <input 
                          type="number" 
                          value={study.icc_3f}
                          onChange={(e) => setStudy({...study, icc_3f: Number(e.target.value)})}
                          className="w-full bg-black border border-red-900/50 text-red-500 p-2 text-xs rounded outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Icc 1φ (A)" description="Corrente de curto-circuito monofásico máxima (se aplicável)." />
                        <input 
                          type="number" 
                          value={study.icc_1f}
                          onChange={(e) => setStudy({...study, icc_1f: Number(e.target.value)})}
                          className="w-full bg-black border border-blue-900/50 text-blue-500 p-2 text-xs rounded outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Fusível Concess." description="Elo fusível da proteção primária da concessionária (ex: 6K)." />
                        <input 
                          type="text" 
                          value={study.fusivel_concessionaria}
                          onChange={(e) => setStudy({...study, fusivel_concessionaria: e.target.value})}
                          placeholder="6K"
                          className="w-full bg-black border border-zinc-800 text-yellow-500 p-2 text-xs rounded outline-none focus:border-yellow-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Additional Equipment Section */}
                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold flex items-center gap-2 text-green-200 uppercase">
                      <Plus className="w-3.5 h-3.5" /> Equipamentos Adicionais
                    </h3>
                    <button 
                      onClick={addEquipamento}
                      className="text-[9px] px-2 py-0.5 bg-green-500 text-black rounded hover:bg-green-400 transition-all font-bold"
                    >
                      ADICIONAR
                    </button>
                  </div>

                  <div className="space-y-3">
                    {study.equipamentos.length === 0 && (
                      <p className="text-[10px] text-zinc-600 italic">Nenhum equipamento adicional listado.</p>
                    )}
                    {study.equipamentos.map((eq) => (
                      <div key={eq.id} className="p-3 bg-black/40 border border-zinc-800 rounded relative group">
                        <button 
                          onClick={() => removeEquipamento(eq.id)}
                          className="absolute -top-2 -right-2 p-1 bg-red-900/80 text-red-200 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-[9px] text-zinc-500 uppercase block">Tipo</label>
                            <select 
                              value={eq.tipo}
                              onChange={(e) => updateEquipamento(eq.id, 'tipo', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded"
                            >
                              <option value="Transformador">Transformador</option>
                              <option value="Carga (kVA)">Carga (kVA)</option>
                              <option value="Motor (kW/kVA)">Motor (kW/kVA)</option>
                              <option value="Gerador (kVA)">Gerador (kVA)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-500 uppercase block">Potência</label>
                            <input 
                              type="number" 
                              value={eq.kva}
                              onChange={(e) => updateEquipamento(eq.id, 'kva', Number(e.target.value))}
                              placeholder="kVA"
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] text-zinc-500 uppercase block">Qtd</label>
                            <input 
                              type="number" 
                              value={eq.qtd}
                              onChange={(e) => updateEquipamento(eq.id, 'qtd', Number(e.target.value))}
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded font-mono"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-[9px] text-zinc-500 uppercase block">Descrição</label>
                            <input 
                              type="text" 
                              value={eq.descricao}
                              onChange={(e) => updateEquipamento(eq.id, 'descricao', e.target.value)}
                              placeholder="Ex: Trafo de Serviços"
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold flex items-center gap-2 text-green-200">
                      <Cpu className="w-3.5 h-3.5" /> AJUSTES DE RELÉ (51/51N)
                    </h3>
                    <button 
                      onClick={autoAdjust}
                      className="text-[9px] px-2 py-0.5 bg-green-900/30 border border-green-500/30 text-green-500 rounded hover:bg-green-500 hover:text-black transition-all font-bold"
                    >
                      AJUSTE AUTO
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <FieldInfo label="Marca do Relé" description="Fabricante do equipamento de proteção multifuncional." />
                        <input 
                          type="text" 
                          value={study.rele_marca}
                          onChange={(e) => setStudy({...study, rele_marca: e.target.value})}
                          placeholder="Ex: Pextron"
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <FieldInfo label="Modelo" description="Modelo comercial exato do relé para verificação de manuais." />
                        <input 
                          type="text" 
                          value={study.rele_modelo}
                          onChange={(e) => setStudy({...study, rele_modelo: e.target.value})}
                          placeholder="Ex: URPE 7104"
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div> Proteção de Fase
                        </span>
                        <div className="h-px flex-1 mx-4 bg-green-900/20"></div>
                      </div>

                      {/* Temporizada (51) */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                         <h4 className="text-[9px] font-black text-green-700 uppercase tracking-tighter mb-2">Função Temporizada (51)</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div>
                             <FieldInfo label="Curva" description="Equação matemática que define o tempo de atuação." />
                             <select 
                               value={study.rele_fase.curva}
                               onChange={(e) => {
                                 const curva = e.target.value as CurveType;
                                 const updates: any = { curva };
                                 if (curva !== 'CUSTOM') {
                                   const constants = CURVE_CONSTANTS[curva];
                                   updates.A = constants.A;
                                   updates.B = constants.B;
                                   updates.P = constants.P;
                                 }
                                 setStudy({...study, rele_fase: {...study.rele_fase, ...updates}});
                               }}
                               className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-[10px] rounded outline-none focus:border-green-500 transition-all font-bold"
                             >
                                <option value="IEC_NI">IEC N. Inverse</option>
                                <option value="IEC_VI">IEC V. Inverse</option>
                                <option value="IEC_EI">IEC E. Inverse</option>
                                <option value="IEC_LONG">IEC Long Time</option>
                                <option value="ANSI_VI">ANSI V. Inverse</option>
                                <option value="ANSI_EI">ANSI E. Inverse</option>
                                <option value="CUSTOM">PERSONALIZADA (A, B, P)</option>
                             </select>
                           </div>
                           <div>
                             <FieldInfo label="Pickup 51 (A)" description="Corrente de partida da unidade temporizada." />
                             <input 
                               type="number" 
                               value={study.rele_fase.pickup}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, pickup: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 font-mono"
                             />
                           </div>
                           <div>
                             <FieldInfo label="TMS / Dial (51)" description="Ajuste de tempo da curva temporizada." />
                             <input 
                               type="number" 
                               step="0.01"
                               value={study.rele_fase.tms}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, tms: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 font-mono"
                             />
                           </div>
                         </div>
                      </div>

                      {/* Tempo Definido & Instantâneo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                           <h4 className="text-[9px] font-black text-green-700 uppercase tracking-tighter mb-2">Tempo Definido (51/50DT)</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Corrente (A)</label>
                                <input 
                                  type="number" 
                                  value={study.rele_fase.i_def}
                                  onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, i_def: Number(e.target.value)}})}
                                  className="w-full bg-black border border-zinc-900 text-green-500 p-2 text-xs rounded outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Tempo (s)</label>
                                <input 
                                  type="number" 
                                  step="0.05"
                                  value={study.rele_fase.t_def}
                                  onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, t_def: Number(e.target.value)}})}
                                  className="w-full bg-black border border-zinc-900 text-green-500 p-2 text-xs rounded outline-none"
                                />
                              </div>
                           </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                           <h4 className="text-[9px] font-black text-green-700 uppercase tracking-tighter mb-2">Instantânea (50)</h4>
                           <div>
                              <label className="text-[9px] text-zinc-500 uppercase block mb-1">Corrente Instantânea (A)</label>
                              <input 
                                type="number" 
                                value={study.rele_fase.i_inst}
                                onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, i_inst: Number(e.target.value)}})}
                                className="w-full bg-black border border-green-500/30 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 font-mono"
                                placeholder="OFF"
                              />
                           </div>
                        </div>
                      </div>

                      {/* Parâmetros Customizados */}
                      {study.rele_fase.curva === 'CUSTOM' && (
                        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-900 grid grid-cols-3 gap-4">
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Parâmetro A</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_fase.A}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, A: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Parâmetro B</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_fase.B}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, B: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Potência P</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_fase.P}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, P: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div> Proteção de Neutro
                        </span>
                        <div className="h-px flex-1 mx-4 bg-blue-900/10"></div>
                      </div>

                      {/* Temporizada (51N) */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                         <h4 className="text-[9px] font-black text-blue-700 uppercase tracking-tighter mb-2">Função Temporizada (51N)</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div>
                             <FieldInfo label="Curva" description="Curva de proteção para desequilíbrio ou faltas a terra." />
                             <select 
                               value={study.rele_neutro.curva}
                               onChange={(e) => {
                                 const curva = e.target.value as CurveType;
                                 const updates: any = { curva };
                                 if (curva !== 'CUSTOM') {
                                   const constants = CURVE_CONSTANTS[curva];
                                   updates.A = constants.A;
                                   updates.B = constants.B;
                                   updates.P = constants.P;
                                 }
                                 setStudy({...study, rele_neutro: {...study.rele_neutro, ...updates}});
                               }}
                               className="w-full bg-black border border-zinc-800 text-blue-400 p-2 text-[10px] rounded outline-none focus:border-blue-500 transition-all font-bold"
                             >
                                <option value="IEC_NI">IEC N. Inverse</option>
                                <option value="IEC_VI">IEC V. Inverse</option>
                                <option value="IEC_EI">IEC E. Inverse</option>
                                <option value="IEC_LONG">IEC Long Time</option>
                                <option value="ANSI_VI">ANSI V. Inverse</option>
                                <option value="ANSI_EI">ANSI E. Inverse</option>
                                <option value="CUSTOM">PERSONALIZADA (A, B, P)</option>
                             </select>
                           </div>
                           <div>
                             <FieldInfo label="Pickup 51N (A)" description="Sensibilidade de neutro para partida." />
                             <input 
                               type="number" 
                               value={study.rele_neutro.pickup}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, pickup: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-800 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 font-mono"
                             />
                           </div>
                           <div>
                             <FieldInfo label="TMS / Dial (51N)" description="Ajuste de tempo da unidade de neutro." />
                             <input 
                               type="number" 
                               step="0.01"
                               value={study.rele_neutro.tms}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, tms: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-800 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 font-mono"
                             />
                           </div>
                         </div>
                      </div>

                      {/* Tempo Definido & Instantâneo (Neutro) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                           <h4 className="text-[9px] font-black text-blue-700 uppercase tracking-tighter mb-2">Tempo Definido (51/50N DT)</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Corrente (A)</label>
                                <input 
                                  type="number" 
                                  value={study.rele_neutro.i_def}
                                  onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, i_def: Number(e.target.value)}})}
                                  className="w-full bg-black border border-zinc-900 text-blue-500 p-2 text-xs rounded outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Tempo (s)</label>
                                <input 
                                  type="number" 
                                  step="0.05"
                                  value={study.rele_neutro.t_def}
                                  onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, t_def: Number(e.target.value)}})}
                                  className="w-full bg-black border border-zinc-900 text-blue-500 p-2 text-xs rounded outline-none"
                                />
                              </div>
                           </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                           <h4 className="text-[9px] font-black text-blue-700 uppercase tracking-tighter mb-2">Instantânea (50N)</h4>
                           <div>
                              <label className="text-[9px] text-zinc-500 uppercase block mb-1">Corrente Instantânea (A)</label>
                              <input 
                                type="number" 
                                value={study.rele_neutro.i_inst}
                                onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, i_inst: Number(e.target.value)}})}
                                className="w-full bg-black border border-blue-500/30 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 font-mono"
                                placeholder="OFF"
                              />
                           </div>
                        </div>
                      </div>

                      {/* Parâmetros Customizados (Neutro) */}
                      {study.rele_neutro.curva === 'CUSTOM' && (
                        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-900 grid grid-cols-3 gap-4">
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Parâmetro A</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_neutro.A}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, A: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Parâmetro B</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_neutro.B}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, B: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                           <div>
                             <label className="text-[8px] text-zinc-600 uppercase block mb-1">Potência P</label>
                             <input 
                               type="number" 
                               step="0.0001"
                               value={study.rele_neutro.P}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, P: Number(e.target.value)}})}
                               className="w-full bg-black border border-zinc-900 text-zinc-500 p-1.5 text-[10px] rounded font-mono"
                             />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-blue-400 mb-4 uppercase">
                    <ShieldAlert className="w-3.5 h-3.5" /> Outras Funções do Relé
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(study.funcoes_adicionais || {}).map(func => (
                      <div key={func} className="flex flex-col gap-1.5 p-2 bg-black/40 border border-zinc-800 rounded">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={study.funcoes_adicionais[func]?.habilitada || false}
                            onChange={(e) => setStudy({
                              ...study,
                              funcoes_adicionais: {
                                ...study.funcoes_adicionais,
                                [func]: { ...study.funcoes_adicionais[func], habilitada: e.target.checked }
                              }
                            })}
                            className="w-3 h-3 accent-blue-500"
                          />
                          <span className="text-[10px] font-bold text-zinc-400">ANSI {func}</span>
                        </label>
                        {study.funcoes_adicionais[func]?.habilitada && (
                          <>
                            {func === '81' ? (
                              <div className="space-y-1.5 mt-1 border-t border-zinc-800/50 pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Sub-Freq (Hz)</label>
                                    <input 
                                      type="number"
                                      step="0.1"
                                      value={study.funcoes_adicionais[func].f_low}
                                      onChange={(e) => setStudy({
                                        ...study,
                                        funcoes_adicionais: {
                                          ...study.funcoes_adicionais,
                                          [func]: { ...study.funcoes_adicionais[func], f_low: Number(e.target.value) }
                                        }
                                      })}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded outline-none focus:border-blue-500/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Sob-Freq (Hz)</label>
                                    <input 
                                      type="number"
                                      step="0.1"
                                      value={study.funcoes_adicionais[func].f_high}
                                      onChange={(e) => setStudy({
                                        ...study,
                                        funcoes_adicionais: {
                                          ...study.funcoes_adicionais,
                                          [func]: { ...study.funcoes_adicionais[func], f_high: Number(e.target.value) }
                                        }
                                      })}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded outline-none focus:border-blue-500/50"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Tempo Sub (s)</label>
                                    <input 
                                      type="number"
                                      step="0.05"
                                      value={study.funcoes_adicionais[func].t_low}
                                      onChange={(e) => setStudy({
                                        ...study,
                                        funcoes_adicionais: {
                                          ...study.funcoes_adicionais,
                                          [func]: { ...study.funcoes_adicionais[func], t_low: Number(e.target.value) }
                                        }
                                      })}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded outline-none focus:border-blue-500/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Tempo Sob (s)</label>
                                    <input 
                                      type="number"
                                      step="0.05"
                                      value={study.funcoes_adicionais[func].t_high}
                                      onChange={(e) => setStudy({
                                        ...study,
                                        funcoes_adicionais: {
                                          ...study.funcoes_adicionais,
                                          [func]: { ...study.funcoes_adicionais[func], t_high: Number(e.target.value) }
                                        }
                                      })}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded outline-none focus:border-blue-500/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <input 
                                type="text"
                                value={study.funcoes_adicionais[func]?.ajuste || ''}
                                placeholder="Ajuste"
                                onChange={(e) => setStudy({
                                  ...study,
                                  funcoes_adicionais: {
                                    ...study.funcoes_adicionais,
                                    [func]: { ...study.funcoes_adicionais[func], ajuste: e.target.value }
                                  }
                                })}
                                className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded outline-none"
                              />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-purple-400 mb-4 uppercase">
                    <Cpu className="w-3.5 h-3.5" /> Geração & Sincronismo
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input 
                          type="checkbox"
                          checked={study.geracao_propria?.habilitada || false}
                          onChange={(e) => setStudy({
                            ...study,
                            geracao_propria: { ...study.geracao_propria, habilitada: e.target.checked }
                          })}
                          className="w-3 h-3 accent-purple-500"
                        />
                        <span className="text-[10px] font-bold text-zinc-300 uppercase">Geração Própria</span>
                      </label>
                      {study.geracao_propria?.habilitada && (
                        <div className="mt-2 space-y-2">
                          <textarea 
                            value={study.geracao_propria?.descricao || ''}
                            onChange={(e) => setStudy({
                              ...study,
                              geracao_propria: { ...study.geracao_propria, descricao: e.target.value }
                            })}
                            placeholder="Detalhes da geração (Potência, Tipo, etc.)"
                            className="w-full bg-zinc-950 border border-zinc-800 text-purple-400 p-2 text-[10px] rounded h-16 resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                               <label className="text-[8px] text-zinc-500 uppercase block mb-1">Corrente (A)</label>
                               <input 
                                 type="number"
                                 value={study.geracao_propria?.i_adj || 0}
                                 onChange={(e) => setStudy({...study, geracao_propria: {...study.geracao_propria, i_adj: Number(e.target.value)}})}
                                 className="w-full bg-black border border-zinc-800 text-purple-400 p-1 text-[9px] rounded"
                               />
                            </div>
                            <div>
                               <label className="text-[8px] text-zinc-500 uppercase block mb-1">Tempo (s)</label>
                               <input 
                                 type="number"
                                 value={study.geracao_propria?.t_adj || 0}
                                 onChange={(e) => setStudy({...study, geracao_propria: {...study.geracao_propria, t_adj: Number(e.target.value)}})}
                                 className="w-full bg-black border border-zinc-800 text-purple-400 p-1 text-[9px] rounded"
                               />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input 
                          type="checkbox"
                          checked={study.sincronismo?.habilitada || false}
                          onChange={(e) => setStudy({
                            ...study,
                            sincronismo: { ...study.sincronismo, habilitada: e.target.checked }
                          })}
                          className="w-3 h-3 accent-purple-500"
                        />
                        <span className="text-[10px] font-bold text-zinc-300 uppercase">Sincronismo (25)</span>
                      </label>
                      {study.sincronismo?.habilitada && (
                        <div className="mt-2 space-y-2">
                          <input 
                            type="text"
                            value={study.sincronismo?.ajuste || ''}
                            onChange={(e) => setStudy({
                              ...study,
                              sincronismo: { ...study.sincronismo, ajuste: e.target.value }
                            })}
                            placeholder="Ajuste de sincronismo"
                            className="w-full bg-zinc-950 border border-zinc-800 text-purple-400 p-2 text-[10px] rounded outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                               <label className="text-[8px] text-zinc-500 uppercase block mb-1">Limite Inf (A)</label>
                               <input 
                                 type="number"
                                 value={study.sincronismo?.i_low || 0}
                                 onChange={(e) => setStudy({...study, sincronismo: {...study.sincronismo, i_low: Number(e.target.value)}})}
                                 className="w-full bg-black border border-zinc-800 text-purple-400 p-1 text-[9px] rounded"
                               />
                            </div>
                            <div>
                               <label className="text-[8px] text-zinc-500 uppercase block mb-1">Limite Sup (A)</label>
                               <input 
                                 type="number"
                                 value={study.sincronismo?.i_high || 0}
                                 onChange={(e) => setStudy({...study, sincronismo: {...study.sincronismo, i_high: Number(e.target.value)}})}
                                 className="w-full bg-black border border-zinc-800 text-purple-400 p-1 text-[9px] rounded"
                               />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {alerts.length > 0 && (
                  <div className="p-4 bg-yellow-950/20 border border-yellow-900 rounded space-y-2">
                    <p className="text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Validação Normativa
                    </p>
                    {alerts.map((a, i) => (
                      <p key={i} className="text-[9px] text-yellow-600 leading-tight">• {a}</p>
                    ))}
                  </div>
                )}
                
                {alerts.length === 0 && (
                   <div className="p-4 bg-green-950/10 border border-green-900/30 rounded flex items-center gap-3">
                     <CheckCircle2 className="w-5 h-5 text-green-600" />
                     <p className="text-[10px] font-medium text-green-700 uppercase tracking-tight">Estudo em conformidade com as normas da concessionária.</p>
                   </div>
                )}

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-green-200 mb-4 uppercase">
                    <FileText className="w-3.5 h-3.5" /> Observações do Estudo
                  </h3>
                  <textarea 
                    value={study.observacoes}
                    onChange={(e) => setStudy({...study, observacoes: e.target.value})}
                    placeholder="Informações adicionais, justificativas ou notas importantes para o memorial..."
                    className="w-full h-32 bg-black border border-zinc-800 text-green-400 p-3 text-xs rounded outline-none focus:border-green-500 transition-all font-mono resize-none"
                  />
                </section>
              </div>

              {/* Chart */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                 {/* Curve Visibility Toggles */}
                 <div className="flex flex-wrap gap-2 items-center bg-zinc-900/40 p-3 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">Exibir no Gráfico:</span>
                     <button 
                      onClick={() => toggleCurve('Fase (51)')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleCurves.includes('Fase (51)') ? 'bg-[#22c55e33] border-[#22c55e] text-[#4ade80]' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleCurves.includes('Fase (51)') ? 'bg-[#22c55e]' : 'bg-zinc-700'}`}></div>
                      FASE (51)
                    </button>
                    <button 
                      onClick={() => toggleCurve('Fase (50)')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleCurves.includes('Fase (50)') ? 'bg-[#4ade8033] border-[#4ade80] text-[#4ade80]' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleCurves.includes('Fase (50)') ? 'bg-[#4ade80]' : 'bg-zinc-700'}`}></div>
                      FASE (50)
                    </button>
                    <button 
                      onClick={() => toggleCurve('Neutro (51N)')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleCurves.includes('Neutro (51N)') ? 'bg-[#3b82f633] border-[#3b82f6] text-[#60a5fa]' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleCurves.includes('Neutro (51N)') ? 'bg-[#3b82f6]' : 'bg-zinc-700'}`}></div>
                      NEUTRO (51N)
                    </button>
                    <button 
                      onClick={() => toggleCurve('Neutro (50N)')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleCurves.includes('Neutro (50N)') ? 'bg-[#60a5fa33] border-[#60a5fa] text-[#60a5fa]' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleCurves.includes('Neutro (50N)') ? 'bg-[#60a5fa]' : 'bg-zinc-700'}`}></div>
                      NEUTRO (50N)
                    </button>

                    <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block"></div>

                    <button 
                      onClick={() => toggleIcc('Icc 3f')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleIcc.includes('Icc 3f') ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleIcc.includes('Icc 3f') ? 'bg-red-500' : 'bg-zinc-700'}`}></div>
                      Icc 3φ
                    </button>
                    <button 
                      onClick={() => toggleIcc('Icc 1f')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleIcc.includes('Icc 1f') ? 'bg-blue-600/20 border-blue-600 text-blue-500' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleIcc.includes('Icc 1f') ? 'bg-blue-600' : 'bg-zinc-700'}`}></div>
                      Icc 1φ
                    </button>
                 </div>

                 <CoordChart 
                   curves={curves} 
                   icc_3f={visibleIcc.includes('Icc 3f') ? study.icc_3f : 0}
                   icc_1f={visibleIcc.includes('Icc 1f') ? study.icc_1f : 0}
                   specialPoints={specialPoints}
                 />
                 <div className="bg-zinc-900/20 border border-zinc-800 p-4 rounded-lg">
                    <h4 className="text-[10px] font-bold text-green-500 uppercase mb-3">Resultado da Seletividade</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       <div className="border-l-2 border-green-900 pl-3">
                          <p className="text-[9px] text-zinc-500 uppercase">Coord. Fase</p>
                          <p className="text-lg font-bold text-green-400">0.42s</p>
                       </div>
                       <div className="border-l-2 border-green-900 pl-3">
                          <p className="text-[9px] text-zinc-500 uppercase">Coord. Neutro</p>
                          <p className="text-lg font-bold text-green-400">0.38s</p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-4 flex justify-center">
                    <button 
                      onClick={() => setShowReport(true)}
                      className="w-full py-4 bg-green-600 hover:bg-green-500 text-black text-sm font-extrabold rounded shadow-lg shadow-green-900/10 transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 uppercase"
                    >
                      <FileText className="w-5 h-5" /> Abrir Memorial de Cálculo Completo (A4)
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showReport && (
        <ReportView 
          study={study} 
          concessionaria={CONCESSIONARIAS.find(c => c.id === study.concessionariaId)} 
          onClose={() => setShowReport(false)}
          curves={curves}
          specialPoints={specialPoints}
        />
      )}

      <AnimatePresence>
        {showHelp && (
          <HelpMenu onClose={() => setShowHelp(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
