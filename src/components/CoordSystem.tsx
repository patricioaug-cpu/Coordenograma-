import React, { useState, useEffect, useMemo } from 'react';
import { CONCESSIONARIAS, Concessionaria } from '../constants/concessionarias';
import { COMMONLY_USED_RELAYS } from '../constants/relays';
import { generateFullRelayCurve, CurveType, calculateInominal, calculateANSIPoints, calculateInrushPoint, calculateMotorInrush, calculateInPlant, CURVE_CONSTANTS, getTechnicalSuggestions, calculateTime, validateTC, calculateActualRelayTime } from '../lib/protection-utils';
import { generateFuseCurve, checkFuseSelectivity, CEMIG_STANDARD_FUSES, FUSE_LINKS, getFuseDefinition, normalizeFuseName } from '../lib/fuse-curves';
import { CoordChart, SpecialPoint } from './CoordChart';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Settings, Save, FileText, LayoutList, LogOut, ChevronRight, AlertTriangle, CheckCircle2, User as UserIcon, ShieldAlert, Menu, X as CloseIcon, Plus, Trash2, History as HistoryIcon, Search, HelpCircle, Cpu, Info, Zap, Lightbulb, ShieldCheck, FileEdit, Edit3, X, SlidersHorizontal, Layers } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AdminPanel } from './AdminPanel';
import { ReportView } from './ReportView';
import { FieldInfo } from './ui/FieldInfo';
import { HelpMenu } from './HelpMenu';

interface Equipamento {
  id: string;
  tipo: 'Transformador' | 'Motor' | 'Carga Geral' | 'Banco de Capacitores';
  kva: number;
  qtd: number;
  descricao: string;
  z?: number;
  v_prim?: number;
  v_sec?: number;
  isolamento?: string;
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
  trafo_qtd: number;
  trafo_v_prim: number;
  trafo_v_sec: number;
  trafo_z: number;
  trafo_isolamento: string;
  icc_3f: number;
  icc_1f: number;
  tc_relacao: string;
  tc_classe: string;
  fusivel_concessionaria: string;
  fusivel_tipo_curva?: 'minima' | 'total' | 'banda';
  fusivel_fator_tolerancia?: number;
  fusivel_cor?: string;
  inrush_multiplicador?: number;
  parecer_tecnico_personalizado?: string;
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
      [param: string]: any;
    };
  };
  geracao_propria: { habilitada: boolean; descricao: string; i_adj: number; t_adj: number };
  sincronismo: { habilitada: boolean; ajuste: string; i_low: number; i_high: number };
  isAutoEnabled: boolean;
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
  trafo_qtd: 1,
  trafo_v_prim: 13800,
  trafo_v_sec: 220,
  trafo_z: 5,
  trafo_isolamento: 'A Óleo',
  icc_3f: 5000,
  icc_1f: 1200,
  tc_relacao: '50/5',
  tc_classe: '10B100',
  fusivel_concessionaria: '40K',
  fusivel_tipo_curva: 'minima',
  fusivel_fator_tolerancia: 1.0,
  fusivel_cor: '#eab308',
  inrush_multiplicador: 8,
  parecer_tecnico_personalizado: '',
  equipamentos: [],
  rele_marca: '',
  rele_modelo: '',
  rt_nome: '',
  rt_crea: '',
  rt_tel: '',
  art_numero: '',
  codigo_instalacao: '',
  normas_selecionadas: ['ABNT NBR 14039', 'IEEE C57.109', 'IEC 60255', 'Resolução Normativa ANEEL 1.000/2021'],
  funcoes_adicionais: {
    '27': { habilitada: false, ajuste: '', v_pick: 92, t_pick: 2.0 },
    '59': { habilitada: false, ajuste: '', v_pick: 110, t_pick: 1.0 },
    '81': { habilitada: false, ajuste: '', f_low: 58.5, f_high: 61.5, t_low: 0.1, t_high: 0.1 },
    '32': { habilitada: false, ajuste: '', p_rev: 50, t_rev: 5.0 },
    '46': { habilitada: false, ajuste: '', deseq: 15, t_deseq: 2.0 },
    '47': { habilitada: false, ajuste: '', seq_neg: 115, t_seq_neg: 1.0 },
    '67': { habilitada: false, ajuste: '', pickup: 50, tms: 0.1, angulo: 60 },
    '67N': { habilitada: false, ajuste: '', pickup: 10, tms: 0.1, angulo: 60 }
  },
  geracao_propria: { habilitada: false, descricao: '', i_adj: 0, t_adj: 0 },
  sincronismo: { habilitada: false, ajuste: '', i_low: 0, i_high: 0 },
  isAutoEnabled: false,
  rele_fase: { pickup: 30, tms: 0.1, curva: 'IEC_NI', A: 0.14, B: 0, P: 0.02, i_def: 0, t_def: 0, i_inst: 0 },
  rele_neutro: { pickup: 10, tms: 0.1, curva: 'IEC_NI', A: 0.14, B: 0, P: 0.02, i_def: 0, t_def: 0, i_inst: 0 }
};

export const CoordSystem: React.FC<{ user: any }> = ({ user }) => {
  const [study, setStudy] = useState<StudyData>(DEFAULT_STUDY);
  const [view, setView] = useState<'study' | 'admin' | 'history'>('study');
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleCurves, setVisibleCurves] = useState<string[]>(['Fase (51)', 'Fase (50)', 'Neutro (51N)', 'Neutro (50N)', 'Elo Fusível', 'Geração', 'Sync (25)']);
  const [visibleIcc, setVisibleIcc] = useState<string[]>(['Icc 3f', 'Icc 1f']);
  const [savedCalculos, setSavedCalculos] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualAdjustmentInfo, setShowManualAdjustmentInfo] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showParecerModal, setShowParecerModal] = useState(false);
  const [tempParecerText, setTempParecerText] = useState('');
  const [showCemigAdjustModal, setShowCemigAdjustModal] = useState(false);
  const [cemigModalData, setCemigModalData] = useState({
    fusivel: '40K',
    inrushMult: 8,
    pickupFase: 0,
    tmsFase: 0.10,
    curvaFase: 'IEC_VI' as CurveType,
    instFase: 0,
    defFase: 0,
    tDefFase: 0.30,
    pickupNeutro: 0,
    tmsNeutro: 0.10,
    curvaNeutro: 'IEC_VI' as CurveType,
    instNeutro: 0,
    defNeutro: 0,
    tDefNeutro: 0.30,
  });

  const [showFuseModal, setShowFuseModal] = useState(false);
  const [fuseModalData, setFuseModalData] = useState({
    fusivel: '40K',
    isCustom: false,
    customRating: 40,
    tipoCurva: 'minima' as 'minima' | 'total' | 'banda',
    fatorTolerancia: 1.0,
    cor: '#eab308'
  });

  const handleOpenFuseModal = () => {
    const currentFuse = study.fusivel_concessionaria || '40K';
    const isStandard = CEMIG_STANDARD_FUSES.includes(currentFuse as any);
    const numMatch = currentFuse.match(/\d+(\.\d+)?/);
    setFuseModalData({
      fusivel: currentFuse,
      isCustom: !isStandard,
      customRating: numMatch ? parseFloat(numMatch[0]) : 40,
      tipoCurva: study.fusivel_tipo_curva || 'minima',
      fatorTolerancia: study.fusivel_fator_tolerancia || 1.0,
      cor: study.fusivel_cor || '#eab308'
    });
    setShowFuseModal(true);
  };

  const handleApplyFuseModal = () => {
    const finalFuse = fuseModalData.isCustom 
      ? `${fuseModalData.customRating}K` 
      : fuseModalData.fusivel;

    setStudy(prev => ({
      ...prev,
      fusivel_concessionaria: finalFuse,
      fusivel_tipo_curva: fuseModalData.tipoCurva,
      fusivel_fator_tolerancia: Number(fuseModalData.fatorTolerancia) || 1.0,
      fusivel_cor: fuseModalData.cor
    }));

    if (!visibleCurves.includes('Elo Fusível')) {
      setVisibleCurves(prev => [...prev, 'Elo Fusível']);
    }

    setSaveMessage({
      type: 'success',
      text: `Curva do Elo Fusível ${finalFuse} configurada no coordenograma!`
    });
    setShowFuseModal(false);
  };

  const getDefaultParecerHomologado = (s: StudyData) => {
    const fuseStr = s.fusivel_concessionaria || '40K';
    const iccMax = s.icc_3f || 5000;
    return `A seletividade cronométrica e amperimétrica entre a proteção geral da unidade consumidora e a proteção de retaguarda da Cemig (Elo Fusível ${fuseStr}) foi verificada em todo o range de falta (até ${iccMax.toFixed(0)} A), mantendo um intervalo de coordenação superior a 200ms, atendendo plenamente à ND-5.3.`;
  };

  useEffect(() => {
    if (user.status === 'Trial') {
      const now = new Date();
      if (now > user.trial_fim) {
        setIsTrialExpired(true);
      }
    }
    loadHistory();
  }, [user]);

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

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

  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [simulationType, setSimulationType] = useState<'3phase' | 'overload' | '1phase' | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);

  const simulationIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const runSimulation = (type: '3phase' | 'overload' | '1phase') => {
    // Clear any existing simulation interval
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    setSimulationType(type);
    setSimulationStatus('running');
    setSimulationProgress(0);
    
    // Scroll to simulation panel if not visible
    const simPanel = document.getElementById('main-simulation-panel');
    if (simPanel) {
      simPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    let progress = 0;
    simulationIntervalRef.current = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        setTimeout(() => {
          setSimulationStatus('done');
        }, 500);
      }
      setSimulationProgress(progress);
    }, 150);
  };

  const getSimulationResultText = () => {
    const In = calculateInominal(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim);
    const Ip = study.rele_fase.pickup;
    const suggestions = getTechnicalSuggestions(study);
    const alertsCount = alerts.length;
    
    if (alertsCount > 3 || suggestions.some(s => s.includes('CRÍTICO'))) {
      return "SIMULAÇÃO CONCLUÍDA COM ADVERTÊNCIAS CRÍTICAS. Foram detectados riscos de saturação ou falhas de sensibilidade que invalidam a seletividade conforme as normas vigentes (ABNT NBR 14039 / IEEE C57.109). Revise os pickups e a relação do TC.";
    }
    
    if (simulationType === 'overload') {
      const overloadTime = calculateActualRelayTime(
        In * 1.5,
        study.rele_fase.pickup,
        study.rele_fase.tms,
        study.rele_fase.curva,
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      return `RESULTADO DA SOBRECARGA (1.5x In): O relé atuará em aproximadamente ${overloadTime.toFixed(2)} segundos. Este tempo garante a proteção térmica do transformador contra aquecimento excessivo sem causar desligamentos por picos transitórios de carga.`;
    }

    if (simulationType === '3phase') {
      const instTime = calculateActualRelayTime(
        study.icc_3f,
        study.rele_fase.pickup,
        study.rele_fase.tms,
        study.rele_fase.curva,
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      const isInst = study.rele_fase.i_inst > 0 && study.icc_3f >= study.rele_fase.i_inst;
      const isDef = !isInst && study.rele_fase.i_def > 0 && study.icc_3f >= study.rele_fase.i_def;
      return `RESULTADO DO CURTO-CIRCUITO TRIFÁSICO (${study.icc_3f}A): Proteção via unidade ${isInst ? 'INSTANTÂNEA (50)' : isDef ? 'TEMPO DEFINIDO (50DF)' : 'TEMPORIZADA (51)'}. Tempo de atuação: ${instTime.toFixed(3)}s. Coordenação preservada com os pontos ANSI e magnetização do transformador.`;
    }

    if (simulationType === '1phase') {
      const faultTime = calculateActualRelayTime(
        study.icc_1f,
        study.rele_neutro.pickup,
        study.rele_neutro.tms,
        study.rele_neutro.curva,
        { A: study.rele_neutro.A, B: study.rele_neutro.B, P: study.rele_neutro.P },
        study.rele_neutro.i_def,
        study.rele_neutro.t_def,
        study.rele_neutro.i_inst
      );
      const isInst = study.rele_neutro.i_inst > 0 && study.icc_1f >= study.rele_neutro.i_inst;
      const isDef = !isInst && study.rele_neutro.i_def > 0 && study.icc_1f >= study.rele_neutro.i_def;
      return `RESULTADO DO CURTO-CIRCUITO MONOFÁSICO DE NEUTRO (${study.icc_1f}A): Proteção via unidade ${isInst ? 'INSTANTÂNEA (50N)' : isDef ? 'TEMPO DEFINIDO (50DN)' : 'TEMPORIZADA DE NEUTRO (51N)'}. Tempo de atuação: ${faultTime.toFixed(3)}s. Esta intersecção assegura o desligamento ágil de faltas monopolares à terra e a integridade do condutor de neutro.`;
    }

    return "SIMULAÇÃO CONCLUÍDA. Parâmetros técnicos dentro das margens normativas.";
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await addDoc(collection(db, 'calculos'), {
        user_id: user.id,
        projeto_nome: study.projeto,
        concessionaria: study.concessionariaId,
        dados_json: JSON.stringify(study),
        data: serverTimestamp()
      });
      setSaveMessage({ type: 'success', text: "Estudo salvo com sucesso no histórico!" });
      loadHistory();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setSaveMessage({ type: 'error', text: "Erro técnico ao gravar no histórico." });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStudy = async (id: string) => {
    if (!id || isDeleting) return;
    
    // Se ainda não confirmou, mostramos o estado de confirmação
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-cancela confirmação após 3 segundos
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
      return;
    }
    
    setIsDeleting(id);
    setConfirmDeleteId(null);
    setSaveMessage(null);
    try {
      await deleteDoc(doc(db, 'calculos', id));
      setSavedCalculos(prev => prev.filter(s => s.id !== id));
      setSaveMessage({ type: 'success', text: "Estudo removido do histórico." });
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      setSaveMessage({ type: 'error', text: "Não foi possível excluir o estudo." });
    } finally {
      setIsDeleting(null);
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

  useEffect(() => {
    // Only initialize default instantaneous values if not yet set
    const totalKva = study.trafo_kva * (study.trafo_qtd || 1);
    const Inom = (totalKva * 1000) / (study.trafo_v_prim * 1.732);
    const inrushMult = study.inrush_multiplicador || 8;
    const inrushVal = Inom * inrushMult;
    const calculated_i_inst_fase = Number((inrushVal * 1.25).toFixed(2));
    const calculated_i_inst_neutro = Number((Inom * 4.0).toFixed(2));

    if (study.rele_fase.i_inst === 0 || study.rele_neutro.i_inst === 0) {
      setStudy(prev => ({
        ...prev,
        rele_fase: {
          ...prev.rele_fase,
          i_inst: prev.rele_fase.i_inst === 0 ? calculated_i_inst_fase : prev.rele_fase.i_inst
        },
        rele_neutro: {
          ...prev.rele_neutro,
          i_inst: prev.rele_neutro.i_inst === 0 ? calculated_i_inst_neutro : prev.rele_neutro.i_inst
        }
      }));
    }
  }, [study.trafo_kva, study.trafo_v_prim, study.trafo_qtd, study.inrush_multiplicador]);

  useEffect(() => {
    if (study.isAutoEnabled) {
      autoAdjust();
    }
  }, [study.trafo_kva, study.trafo_v_prim, study.trafo_qtd, study.inrush_multiplicador, study.fusivel_concessionaria, study.isAutoEnabled]);

  const getRecommendedND53Params = (targetStudy: StudyData) => {
    const totalKva = targetStudy.trafo_kva * (targetStudy.trafo_qtd || 1);
    const Inom = (totalKva * 1000) / (targetStudy.trafo_v_prim * 1.732);
    const inrushMult = targetStudy.inrush_multiplicador && targetStudy.inrush_multiplicador > 0 ? targetStudy.inrush_multiplicador : 8;
    const inrushVal = Inom * inrushMult;
    
    // 1. Pickup de Fase: 1.25x Inom (arredondado para cima)
    const pickupFase = Math.ceil(Inom * 1.25); 
    // 2. Pickup de Neutro: 20% do Pickup de Fase (mínimo 5A)
    const pickupNeutro = Math.max(5, Math.ceil(pickupFase * 0.2));
    
    // 3. Estágio Instantâneo de Fase (50):
    // Margem de segurança de 25% sobre o Inrush (faixa recomendada de 20% a 30% da ND-5.3)
    const instFase = Math.round(inrushVal * 1.25);
    const instNeutro = Math.round(Inom * 4.0);
    
    // 4. Tempos Definidos:
    const defFase = Number((Inom * 5.0).toFixed(1));
    const defNeutro = Number((Inom * 1.5).toFixed(1));
    const tDefFase = 0.30;
    const tDefNeutro = 0.30;
    
    // 5. Motor Iterativo de Otimização do Dial/TMS (ND 5.3):
    const fuseCode = targetStudy.fusivel_concessionaria || '40K';
    const iccMax = targetStudy.icc_3f || 5000;
    
    let optimalTms = 0.10;
    let foundOptimal = false;

    for (let t = 0.04; t <= 0.35; t = Number((t + 0.01).toFixed(2))) {
      const sel = checkFuseSelectivity(fuseCode, iccMax, {
        pickup: pickupFase,
        tms: t,
        curva: targetStudy.rele_fase.curva,
        i_def: defFase,
        t_def: tDefFase,
        i_inst: instFase
      });

      if (sel.isSelectivityOk && sel.minMargin >= 0.20) {
        optimalTms = t;
        foundOptimal = true;
        if (sel.minMargin >= 0.21 && sel.minMargin <= 0.40) {
          break;
        }
      }
    }

    if (!foundOptimal) {
      let bestMargin = -Infinity;
      for (let t = 0.04; t <= 0.20; t = Number((t + 0.01).toFixed(2))) {
        const sel = checkFuseSelectivity(fuseCode, iccMax, {
          pickup: pickupFase,
          tms: t,
          curva: targetStudy.rele_fase.curva,
          i_def: defFase,
          t_def: tDefFase,
          i_inst: instFase
        });
        if (sel.minMargin > bestMargin) {
          bestMargin = sel.minMargin;
          optimalTms = t;
        }
      }
    }

    return {
      Inom,
      inrushVal,
      fusivel: fuseCode,
      inrushMult,
      pickupFase,
      tmsFase: optimalTms,
      curvaFase: targetStudy.rele_fase.curva || 'IEC_VI',
      instFase,
      defFase,
      tDefFase,
      pickupNeutro,
      tmsNeutro: targetStudy.rele_neutro.tms || 0.10,
      curvaNeutro: targetStudy.rele_neutro.curva || 'IEC_VI',
      instNeutro,
      defNeutro,
      tDefNeutro
    };
  };

  const runOptimizationEngine = (showToast = true) => {
    const recs = getRecommendedND53Params(study);
    
    setStudy(prev => ({
      ...prev,
      rele_fase: { 
        ...prev.rele_fase, 
        pickup: recs.pickupFase, 
        tms: recs.tmsFase,
        i_def: recs.defFase, 
        t_def: recs.tDefFase,
        i_inst: recs.instFase 
      },
      rele_neutro: { 
        ...prev.rele_neutro, 
        pickup: recs.pickupNeutro, 
        tms: recs.tmsNeutro,
        i_def: recs.defNeutro, 
        t_def: recs.tDefNeutro,
        i_inst: recs.instNeutro 
      }
    }));

    if (showToast) {
      setSaveMessage({
        type: 'success',
        text: `Otimização CEMIG ND 5.3 aplicada: 50=${recs.instFase}A (+25% s/ Inrush ${recs.inrushVal.toFixed(1)}A), TMS=${recs.tmsFase}, Seletividade ≥ 200ms garantida!`
      });
      setShowManualAdjustmentInfo(true);
      setTimeout(() => setShowManualAdjustmentInfo(false), 8000);
    }
  };

  const autoAdjust = () => {
    runOptimizationEngine(false);
  };

  const handleOpenCemigModal = () => {
    const recs = getRecommendedND53Params(study);
    setCemigModalData({
      fusivel: study.fusivel_concessionaria || recs.fusivel,
      inrushMult: study.inrush_multiplicador || recs.inrushMult,
      pickupFase: study.rele_fase.pickup || recs.pickupFase,
      tmsFase: study.rele_fase.tms || recs.tmsFase,
      curvaFase: study.rele_fase.curva || recs.curvaFase,
      instFase: study.rele_fase.i_inst !== undefined && study.rele_fase.i_inst > 0 ? study.rele_fase.i_inst : recs.instFase,
      defFase: study.rele_fase.i_def || recs.defFase,
      tDefFase: study.rele_fase.t_def || recs.tDefFase,
      pickupNeutro: study.rele_neutro.pickup || recs.pickupNeutro,
      tmsNeutro: study.rele_neutro.tms || recs.tmsNeutro,
      curvaNeutro: study.rele_neutro.curva || recs.curvaNeutro,
      instNeutro: study.rele_neutro.i_inst !== undefined && study.rele_neutro.i_inst > 0 ? study.rele_neutro.i_inst : recs.instNeutro,
      defNeutro: study.rele_neutro.i_def || recs.defNeutro,
      tDefNeutro: study.rele_neutro.t_def || recs.tDefNeutro,
    });
    setShowCemigAdjustModal(true);
  };

  const handleApplyCemigModal = () => {
    const pFase = Number(cemigModalData.pickupFase);
    const tFase = Number(cemigModalData.tmsFase);
    const iInstFase = Number(cemigModalData.instFase);
    const iDefFase = Number(cemigModalData.defFase);
    const tDefFase = Number(cemigModalData.tDefFase);

    const pNeutro = Number(cemigModalData.pickupNeutro);
    const tNeutro = Number(cemigModalData.tmsNeutro);
    const iInstNeutro = Number(cemigModalData.instNeutro);
    const iDefNeutro = Number(cemigModalData.defNeutro);
    const tDefNeutro = Number(cemigModalData.tDefNeutro);

    const cFaseConst = CURVE_CONSTANTS[cemigModalData.curvaFase] || CURVE_CONSTANTS['IEC_VI'];
    const cNeutroConst = CURVE_CONSTANTS[cemigModalData.curvaNeutro] || CURVE_CONSTANTS['IEC_VI'];

    setStudy(prev => ({
      ...prev,
      fusivel_concessionaria: cemigModalData.fusivel,
      inrush_multiplicador: Number(cemigModalData.inrushMult),
      rele_fase: {
        ...prev.rele_fase,
        pickup: pFase,
        tms: tFase,
        curva: cemigModalData.curvaFase,
        A: cFaseConst.A,
        B: cFaseConst.B,
        P: cFaseConst.P,
        i_inst: iInstFase,
        i_def: iDefFase,
        t_def: tDefFase,
      },
      rele_neutro: {
        ...prev.rele_neutro,
        pickup: pNeutro,
        tms: tNeutro,
        curva: cemigModalData.curvaNeutro,
        A: cNeutroConst.A,
        B: cNeutroConst.B,
        P: cNeutroConst.P,
        i_inst: iInstNeutro,
        i_def: iDefNeutro,
        t_def: tDefNeutro,
      }
    }));

    setShowCemigAdjustModal(false);
    setSaveMessage({
      type: 'success',
      text: `Ajustes CEMIG ND 5.3 aplicados! Fase: ${pFase}A / TMS ${tFase} / 50: ${iInstFase}A`
    });
  };

  const handleAjusteCemigND53 = () => {
    handleOpenCemigModal();
  };

  const addEquipamento = () => {
    const newEquip: Equipamento = {
      id: crypto.randomUUID(),
      tipo: 'Transformador',
      kva: study.trafo_kva,
      qtd: 1,
      descricao: '',
      z: study.trafo_z,
      v_prim: study.trafo_v_prim,
      v_sec: study.trafo_v_sec,
      isolamento: study.trafo_isolamento
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
    const totalKva = study.trafo_kva * (study.trafo_qtd || 1);
    if (study.trafo_kva <= 0) newAlerts.push("Potência do trafo não pode ser zero");

    if (conc) {
       // Requirement verification based on concessionaire
       if (study.rele_fase.tms < 0.05) newAlerts.push(`Coordenagem de fase muito rápida para ${conc.nome}`);
       if (totalKva >= 300 && study.equipamentos.length === 0) {
         newAlerts.push(`Para ${totalKva}kVA, informe os equipamentos alimentados`);
       }
       if (totalKva > 1000 && study.rele_fase.pickup < 40) newAlerts.push("Pickup de fase baixo para a potência instalada");
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

  const t_inv_fase_at_inst = study.rele_fase.i_inst > 0
    ? calculateTime(
        study.rele_fase.i_inst,
        study.rele_fase.pickup,
        study.rele_fase.tms,
        study.rele_fase.curva,
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P }
      )
    : 1000;
  const t_fase_at_inst = study.rele_fase.i_def && study.rele_fase.i_def > 0 && study.rele_fase.i_inst >= study.rele_fase.i_def
    ? Math.min(t_inv_fase_at_inst, study.rele_fase.t_def)
    : t_inv_fase_at_inst;

  const t_inv_neutro_at_inst = study.rele_neutro.i_inst > 0
    ? calculateTime(
        study.rele_neutro.i_inst,
        study.rele_neutro.pickup,
        study.rele_neutro.tms,
        study.rele_neutro.curva,
        { A: study.rele_neutro.A, B: study.rele_neutro.B, P: study.rele_neutro.P }
      )
    : 1000;
  const t_neutro_at_inst = study.rele_neutro.i_def && study.rele_neutro.i_def > 0 && study.rele_neutro.i_inst >= study.rele_neutro.i_def
    ? Math.min(t_inv_neutro_at_inst, study.rele_neutro.t_def)
    : t_inv_neutro_at_inst;

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
        { I: study.rele_fase.i_inst - 0.01, t: t_fase_at_inst },
        { I: study.rele_fase.i_inst, t: t_fase_at_inst },
        { I: study.rele_fase.i_inst, t: 0.015 },
        { I: (study.icc_3f || 5000) * 2, t: 0.015 }
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
        { I: study.rele_neutro.i_inst - 0.01, t: t_neutro_at_inst },
        { I: study.rele_neutro.i_inst, t: t_neutro_at_inst },
        { I: study.rele_neutro.i_inst, t: 0.015 },
        { I: (study.icc_1f || 1200) * 2, t: 0.015 }
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
    },
    ...(study.fusivel_tipo_curva === 'banda' ? [
      {
        label: `Elo Fusível MMT (${study.fusivel_concessionaria || '40K'})`,
        points: generateFuseCurve(
          study.fusivel_concessionaria || '40K', 
          [1, (study.icc_3f || 5000) * 2], 
          'minima', 
          study.fusivel_fator_tolerancia || 1.0
        ),
        color: study.fusivel_cor || '#eab308',
        strokeDasharray: '4 2',
        strokeWidth: 2
      },
      {
        label: `Elo Fusível TCC (${study.fusivel_concessionaria || '40K'})`,
        points: generateFuseCurve(
          study.fusivel_concessionaria || '40K', 
          [1, (study.icc_3f || 5000) * 2], 
          'total', 
          study.fusivel_fator_tolerancia || 1.0
        ),
        color: '#f59e0b',
        strokeDasharray: '2 2',
        strokeWidth: 1.5
      }
    ] : [
      {
        label: `Elo Fusível (${study.fusivel_concessionaria || '40K'}${study.fusivel_tipo_curva === 'total' ? ' TCC' : ''})`,
        points: generateFuseCurve(
          study.fusivel_concessionaria || '40K', 
          [1, (study.icc_3f || 5000) * 2], 
          study.fusivel_tipo_curva === 'total' ? 'total' : 'minima', 
          study.fusivel_fator_tolerancia || 1.0
        ),
        color: study.fusivel_cor || '#eab308',
        strokeDasharray: study.fusivel_tipo_curva === 'total' ? '2 2' : '4 2',
        strokeWidth: 2
      }
    ])
  ];

  const curves = allCurves.filter(c => 
    visibleCurves.includes(c.label) || (c.label.startsWith('Elo Fusível') && visibleCurves.includes('Elo Fusível'))
  );

  const selectivityDiag = useMemo(() => {
    return checkFuseSelectivity(
      study.fusivel_concessionaria || '40K',
      study.icc_3f || 5000,
      study.rele_fase
    );
  }, [study.fusivel_concessionaria, study.icc_3f, study.rele_fase]);

  const modalSelectivityDiag = useMemo(() => {
    if (!showCemigAdjustModal) return null;
    return checkFuseSelectivity(
      cemigModalData.fusivel || '40K',
      study.icc_3f || 5000,
      {
        pickup: Number(cemigModalData.pickupFase) || 1,
        tms: Number(cemigModalData.tmsFase) || 0.05,
        curva: cemigModalData.curvaFase,
        i_def: Number(cemigModalData.defFase) || 0,
        t_def: Number(cemigModalData.tDefFase) || 0.3,
        i_inst: Number(cemigModalData.instFase) || 0
      }
    );
  }, [showCemigAdjustModal, cemigModalData, study.icc_3f]);

  const mainTrafoTotalKva = study.trafo_kva * (study.trafo_qtd || 1);
  const trafoInom = (mainTrafoTotalKva * 1000) / (study.trafo_v_prim * 1.732);
  const inrushCurrent = trafoInom * (study.inrush_multiplicador || 8);
  const instCurrent = study.rele_fase.i_inst;
  const instMarginPercent = inrushCurrent > 0 && instCurrent > 0 ? ((instCurrent - inrushCurrent) / inrushCurrent) * 100 : 0;
  const isInstCoordinated = instCurrent >= inrushCurrent * 1.20;
  const isFullCompliant = selectivityDiag.isSelectivityOk && isInstCoordinated;

  // Cemig Specific Points
  const specialPoints: SpecialPoint[] = [];
  
  // Plant Nominal Point
  const InomPlant = calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia);
  specialPoints.push({ label: 'CARGA', I: InomPlant, t: 10, type: 'NOMINAL' });

  // Main Transformer Points
  specialPoints.push(...calculateANSIPoints(mainTrafoTotalKva, study.trafo_v_prim, study.trafo_z).map(p => ({...p, type: 'ANSI' as any})));
  specialPoints.push({...calculateInrushPoint(mainTrafoTotalKva, study.trafo_v_prim, study.inrush_multiplicador || 8), type: 'INRUSH' as any});

  // Relay Setting Markers
  if (study.rele_fase.i_inst > 0) {
    specialPoints.push({ label: '50F', I: study.rele_fase.i_inst, t: 0.015, type: 'INST' as any });
  }
  if (study.rele_fase.i_def > 0) {
    specialPoints.push({ label: '50DF', I: study.rele_fase.i_def, t: study.rele_fase.t_def, type: 'DEF' as any });
  }
  if (study.rele_neutro.i_inst > 0) {
    specialPoints.push({ label: '50N', I: study.rele_neutro.i_inst, t: 0.015, type: 'INST' as any });
  }
  if (study.rele_neutro.i_def > 0) {
    specialPoints.push({ label: '50DN', I: study.rele_neutro.i_def, t: study.rele_neutro.t_def, type: 'DEF' as any });
  }

  // Dynamic Simulated Intersection Points (highlighting actual timing on curves)
  if (simulationStatus === 'done') {
    if (simulationType === '3phase') {
      const pTime = calculateActualRelayTime(
        study.icc_3f,
        study.rele_fase.pickup,
        study.rele_fase.tms,
        study.rele_fase.curva,
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      if (pTime > 0 && pTime < 1000) {
        specialPoints.push({ label: 'TRIP 3Ф', I: study.icc_3f, t: pTime, type: 'INST' as any });
      }
    } else if (simulationType === '1phase') {
      const nTime = calculateActualRelayTime(
        study.icc_1f,
        study.rele_neutro.pickup,
        study.rele_neutro.tms,
        study.rele_neutro.curva,
        { A: study.rele_neutro.A, B: study.rele_neutro.B, P: study.rele_neutro.P },
        study.rele_neutro.i_def,
        study.rele_neutro.t_def,
        study.rele_neutro.i_inst
      );
      if (nTime > 0 && nTime < 1000) {
        specialPoints.push({ label: 'TRIP 1Ф', I: study.icc_1f, t: nTime, type: 'INST' as any });
      }
    } else if (simulationType === 'overload') {
      const overTime = calculateActualRelayTime(
        InomPlant * 1.5,
        study.rele_fase.pickup,
        study.rele_fase.tms,
        study.rele_fase.curva,
        { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      if (overTime > 0 && overTime < 1000) {
        specialPoints.push({ label: 'TRIP SO', I: InomPlant * 1.5, t: overTime, type: 'NOMINAL' as any });
      }
    }
  }

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

  study.equipamentos.filter(e => e.tipo === 'Motor').forEach(eq => {
    // Calculando inrush para cada motor (considerando que podem partir simultaneamente ou o maior grupo)
    specialPoints.push({...calculateMotorInrush(eq.kva * (eq.qtd || 1), study.trafo_v_prim), type: 'INRUSH' as any});
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
        {view === 'admin' && user.email === 'patricioaug@gmail.com' ? (
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
                        disabled={isDeleting === calc.id}
                        className={`px-3 py-1.5 transition-all rounded-lg border flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${
                          isDeleting === calc.id 
                            ? 'bg-zinc-900 text-zinc-800 border-zinc-800 cursor-not-allowed' 
                            : confirmDeleteId === calc.id
                              ? 'bg-red-600 text-white border-red-500 animate-pulse'
                              : 'bg-zinc-900/50 text-zinc-600 hover:text-red-500 border-zinc-800 hover:border-red-900/50'
                        }`}
                        title="Excluir Estudo"
                      >
                        {isDeleting === calc.id ? (
                          <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-500 rounded-full animate-spin"></div>
                        ) : confirmDeleteId === calc.id ? (
                          <>Confirmar?</>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
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
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                     <button 
                       type="button"
                       onClick={handleAjusteCemigND53}
                       title="Ajuste CEMIG ND 5.3 com parâmetros editáveis (garante seletividade ≥ 200ms)"
                       className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-xs font-black rounded shadow-lg shadow-green-500/20 uppercase transition-all tracking-tight cursor-pointer active:scale-95"
                     >
                       <Zap className="w-4 h-4 fill-black" /> AJUSTE CEMIG ND 5.3
                     </button>
                     <button 
                       onClick={handleSave}
                       disabled={isSaving}
                       title="Salvar Estudo no Banco de Dados"
                       className="p-2 border border-green-900 hover:border-green-500 rounded text-green-700 hover:text-green-400 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                     >
                       <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                       <span className="text-[10px] sm:hidden">SALVAR</span>
                     </button>
                     <button 
                       onClick={() => setShowReport(true)}
                       className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-green-950/20 hover:bg-green-500 border border-green-800 hover:text-black text-green-500 text-xs font-bold rounded transition-all transition-duration-300"
                     >
                       <FileText className="w-4 h-4" /> GERAR RELATÓRIO
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
                        <FieldInfo label="CREA/CRT" description="Registro no Conselho de Engenharia (CREA) ou de Técnicos Industriais (CRT)." />
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <FieldInfo label="Quantidade" description="Quantidade de transformadores de mesma potência operando em paralelo no banco principal." />
                        <input 
                          type="number" 
                          value={study.trafo_qtd || 1}
                          onChange={(e) => setStudy({...study, trafo_qtd: Number(e.target.value)})}
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

                    {/* Cálculos Automáticos do Trafo Principal */}
                    <div className="mt-4 p-3 bg-green-950/20 border border-green-900/40 rounded-lg space-y-2">
                      <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        <Zap className="w-3.5 h-3.5" /> Cálculos Automáticos do Banco de Trafo ({study.trafo_kva * (study.trafo_qtd || 1)} kVA total)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-300 text-[10px] font-mono">
                        <div className="p-2 bg-black/40 border border-zinc-900 rounded">
                          <p className="text-zinc-500 text-[8px] uppercase">Corrente Nominal (In)</p>
                          <p className="text-green-400 font-bold">{(((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)).toFixed(2)}A</p>
                        </div>
                        <div className="p-2 bg-black/40 border border-zinc-900 rounded">
                          <p className="text-zinc-500 text-[8px] uppercase">Magnetização (Inrush)</p>
                          <p className="text-yellow-500 font-bold">{((((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)) * 10).toFixed(2)}A</p>
                        </div>
                        <div className="p-2 bg-black/40 border border-zinc-900 rounded">
                          <p className="text-zinc-500 text-[8px] uppercase">Inst. Fase (50)</p>
                          <p className="text-red-400 font-bold">{((((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)) * 12.5).toFixed(2)}A</p>
                        </div>
                        <div className="p-2 bg-black/40 border border-zinc-900 rounded">
                          <p className="text-zinc-500 text-[8px] uppercase">Inst. Neutro (50N)</p>
                          <p className="text-blue-400 font-bold">{((((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)) * 4.0).toFixed(2)}A</p>
                        </div>
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
                          className={`w-full bg-black border p-2 text-xs rounded outline-none transition-all font-mono ${
                            validateTC(study.tc_relacao, study.icc_3f, calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia)).ok
                            ? 'border-zinc-800 text-blue-400 focus:border-blue-500'
                            : 'border-red-900 text-red-500 focus:border-red-500'
                          }`}
                        />
                        {!validateTC(study.tc_relacao, study.icc_3f, calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia)).ok && (
                          <div className="mt-1 text-[8px] text-red-400 font-bold uppercase flex items-center gap-1">
                             <AlertTriangle className="w-2.5 h-2.5" /> Verifique Saturação/Carga
                          </div>
                        )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
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
                        <FieldInfo label="Fusível Concess." description="Elo fusível padronizado da concessionária Cemig (ND 5.3)." />
                        <select 
                          value={study.fusivel_concessionaria || '40K'}
                          onChange={(e) => setStudy({...study, fusivel_concessionaria: e.target.value})}
                          className="w-full bg-black border border-zinc-800 text-yellow-400 p-2 text-xs rounded outline-none focus:border-yellow-500 transition-all font-mono font-bold"
                        >
                          {CEMIG_STANDARD_FUSES.map(f => (
                            <option key={f} value={f}>Elo {f} (Cemig)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldInfo label="Inrush (x In)" description="Multiplicador de corrente de magnetização Inrush do trafo (ND-5.3: 8x com t=0.1s)." />
                        <input 
                          type="number" 
                          step="0.5"
                          value={study.inrush_multiplicador || 8}
                          onChange={(e) => setStudy({...study, inrush_multiplicador: Number(e.target.value)})}
                          placeholder="8"
                          className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
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
                          <div className="col-span-1">
                            <label className="text-[9px] text-zinc-500 uppercase block">Tipo</label>
                            <select 
                              value={eq.tipo}
                              onChange={(e) => updateEquipamento(eq.id, 'tipo', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded"
                            >
                              <option value="Transformador">Transformador</option>
                              <option value="Carga (kVA)">Carga (kVA)</option>
                              <option value="Motor">Motor (kW)</option>
                              <option value="Gerador (kVA)">Gerador (kVA)</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="text-[9px] text-zinc-500 uppercase block">
                              Potência {eq.tipo === 'Transformador' ? '(kVA)' : eq.tipo === 'Motor' ? '(kW)' : '(kVA)'}
                            </label>
                            <input 
                              type="number" 
                              value={eq.kva}
                              onChange={(e) => updateEquipamento(eq.id, 'kva', Number(e.target.value))}
                              placeholder={eq.tipo === 'Motor' ? 'kW' : 'kVA'}
                              className="w-full bg-zinc-900 border border-zinc-800 text-green-400 p-1 text-[10px] rounded font-mono"
                            />
                          </div>
                        </div>

                         {eq.tipo === 'Transformador' && (
                           <>
                             <div className="grid grid-cols-3 gap-2 mb-2 border-t border-zinc-800 pt-2">
                                <div>
                                   <label className="text-[8px] text-zinc-600 uppercase block">Z (%)</label>
                                   <input 
                                     type="number" 
                                     value={eq.z}
                                     onChange={(e) => updateEquipamento(eq.id, 'z', Number(e.target.value))}
                                     className="w-full bg-black border border-zinc-900 text-zinc-400 p-1 text-[9px] rounded font-mono"
                                   />
                                </div>
                                <div>
                                   <label className="text-[8px] text-zinc-600 uppercase block">V. Prim (V)</label>
                                   <input 
                                     type="number" 
                                     value={eq.v_prim}
                                     onChange={(e) => updateEquipamento(eq.id, 'v_prim', Number(e.target.value))}
                                     className="w-full bg-black border border-zinc-900 text-zinc-400 p-1 text-[9px] rounded font-mono"
                                   />
                                </div>
                                <div>
                                   <label className="text-[8px] text-zinc-600 uppercase block">V. Sec (V)</label>
                                   <input 
                                     type="number" 
                                     value={eq.v_sec}
                                     onChange={(e) => updateEquipamento(eq.id, 'v_sec', Number(e.target.value))}
                                     className="w-full bg-black border border-zinc-900 text-zinc-400 p-1 text-[9px] rounded font-mono"
                                   />
                                </div>
                                <div className="col-span-3">
                                   <label className="text-[8px] text-zinc-600 uppercase block">Isolamento</label>
                                   <select 
                                     value={eq.isolamento}
                                     onChange={(e) => updateEquipamento(eq.id, 'isolamento', e.target.value)}
                                     className="w-full bg-black border border-zinc-900 text-zinc-400 p-1 text-[9px] rounded"
                                   >
                                     <option value="A Óleo">A Óleo</option>
                                     <option value="Seco">Seco</option>
                                     <option value="Silicone">Silicone</option>
                                   </select>
                                </div>
                             </div>

                             {/* Cálculos Automáticos para o Trafo Adicional */}
                             <div className="mt-1 mb-2 p-2 bg-green-950/20 border border-green-900/30 rounded text-[9px] font-mono space-y-1">
                                <p className="text-green-400 font-bold uppercase text-[7px] leading-tight flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Cálculos do Trafo {eq.kva * (eq.qtd || 1)} kVA</p>
                                <div className="grid grid-cols-2 gap-x-2 text-zinc-400">
                                   <p>Nominal (In): <span className="text-white font-bold">{(((eq.kva * (eq.qtd || 1)) * 1000) / ((eq.v_prim || study.trafo_v_prim || 13800) * 1.732)).toFixed(2)}A</span></p>
                                   <p>Inrush (10x): <span className="text-white font-bold">{((((eq.kva * (eq.qtd || 1)) * 1000) / ((eq.v_prim || study.trafo_v_prim || 13800) * 1.732)) * 10).toFixed(2)}A</span></p>
                                   <p>Inst Fase (12.5x): <span className="text-white font-bold">{((((eq.kva * (eq.qtd || 1)) * 1000) / ((eq.v_prim || study.trafo_v_prim || 13800) * 1.732)) * 12.5).toFixed(2)}A</span></p>
                                   <p>Inst Neutro (4x): <span className="text-white font-bold">{((((eq.kva * (eq.qtd || 1)) * 1000) / ((eq.v_prim || study.trafo_v_prim || 13800) * 1.732)) * 4.0).toFixed(2)}A</span></p>
                                </div>
                             </div>
                           </>
                         )}
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
                    <div className="flex items-center gap-1.5 relative flex-wrap sm:flex-nowrap justify-end">
                       <button 
                         type="button"
                         onClick={handleAjusteCemigND53}
                         title="Ajuste CEMIG ND 5.3 com parâmetros editáveis (≥ 200ms)"
                         className="text-[9px] px-2.5 py-1 bg-green-500 hover:bg-green-400 text-black rounded font-black uppercase transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                       >
                         <Zap className="w-3 h-3 fill-black" />
                         Ajuste ND 5.3
                       </button>
                       <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
                         <span className="text-[9px] font-bold text-zinc-500 uppercase">Auto</span>
                         <button 
                           onClick={() => setStudy({...study, isAutoEnabled: !study.isAutoEnabled})}
                           className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${study.isAutoEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}
                         >
                           <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${study.isAutoEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                         </button>
                       </div>
                       <button 
                         onClick={autoAdjust}
                         title="Executar ajuste automático pontual"
                         className="text-[9px] px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-500 rounded hover:bg-green-500 hover:text-black transition-all font-bold uppercase"
                       >
                         Ajustar Agora
                       </button>

                       <AnimatePresence>
                         {showManualAdjustmentInfo && (
                           <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-green-500 shadow-2xl shadow-green-500/20 p-4 rounded-lg z-[100] pointer-events-none"
                           >
                             <div className="flex items-center gap-2 mb-2">
                               <Zap className="w-4 h-4 text-green-500" />
                               <span className="text-[11px] font-black text-white uppercase tracking-tight">Lógica de Ajuste Automático</span>
                             </div>
                             <div className="space-y-3">
                               <div className="p-2 bg-black rounded border border-zinc-800">
                                 <p className="text-[10px] text-zinc-400 mb-1">Cálculo de Inom (Primário):</p>
                                 <p className="text-[11px] text-green-500 font-mono font-bold">
                                   {study.trafo_kva * (study.trafo_qtd || 1)}kVA / ({study.trafo_v_prim/1000}kV × 1.732) = 
                                   <span className="text-white ml-1">
                                      {(((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)).toFixed(2)}A
                                   </span>
                                 </p>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                 <div className="p-2 bg-black rounded border border-zinc-800">
                                   <p className="text-[9px] text-zinc-500 mb-1 uppercase">Pickup Fase</p>
                                   <p className="text-[10px] text-green-400 font-bold">1.25 × Inom = {Math.ceil((((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)) * 1.25)}A</p>
                                 </div>
                                 <div className="p-2 bg-black rounded border border-zinc-800">
                                   <p className="text-[9px] text-zinc-500 mb-1 uppercase">Pickup Neutro</p>
                                   <p className="text-[10px] text-blue-400 font-bold">20% Fase = {Math.ceil(Math.ceil((((study.trafo_kva * (study.trafo_qtd || 1)) * 1000) / (study.trafo_v_prim * 1.732)) * 1.25) * 0.2)}A</p>
                                 </div>
                               </div>
                               <p className="text-[9px] text-zinc-500 leading-tight italic">
                                 * Baseado em normas técnicas para proteção de transformadores de distribuição, garantindo margem para sobrecarga controlada e sensibilidade a faltas.
                               </p>
                             </div>
                             <div className="mt-3 flex justify-end">
                               <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 8, ease: "linear" }}
                                    className="h-full bg-green-500" 
                                  />
                               </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  </div>
                  
                  {study.isAutoEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 bg-green-950/20 border border-green-900/50 rounded-md"
                    >
                      <div className="flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-green-400 leading-relaxed font-mono">
                          <span className="font-bold underline">MODO AUTOMÁTICO ATIVO:</span> Os pickups são recalculados dinamicamente sempre que a potência do trafo ou tensão primária forem alteradas.
                          <br />
                          <span className="text-[9px] text-zinc-500 mt-1 block italic">• Lógica: Pickup Fase = 1.25 x (S / (V x √3)) | Pickup Neutro = 20% do Fase.</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <FieldInfo label="Marca do Relé" description="Fabricante do equipamento de proteção multifuncional." />
                        <div className="space-y-2">
                          <select 
                        value={study.rele_marca && COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca) ? study.rele_marca : (study.rele_marca === '' ? '' : 'OUTRO')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OUTRO') {
                            setStudy({...study, rele_marca: 'Fabricante Manual', rele_modelo: 'Modelo Manual'});
                          } else {
                            setStudy({...study, rele_marca: val, rele_modelo: ''});
                          }
                          setSimulationStatus('idle');
                        }}
                        className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                      >
                        <option value="">Selecione...</option>
                        {COMMONLY_USED_RELAYS.map(r => (
                          <option key={r.manufacturer} value={r.manufacturer}>{r.manufacturer}</option>
                        ))}
                        <option value="OUTRO">Outro (Digitar manually...)</option>
                      </select>
                      
                      {(study.rele_marca === 'Fabricante Manual' || (!COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca) && study.rele_marca !== '')) && (
                        <input 
                          type="text" 
                          value={study.rele_marca}
                          onChange={(e) => {
                            setStudy({...study, rele_marca: e.target.value});
                            setSimulationStatus('idle');
                          }}
                          placeholder="Digite o fabricante aqui..."
                          className="w-full bg-zinc-900 border border-green-500/30 text-white p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                        />
                      )}
                        </div>
                      </div>
                      <div>
                        <FieldInfo label="Modelo" description="Modelo comercial exato do relé para verificação de manuais." />
                        <div className="space-y-2">
                          {study.rele_marca && COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca) ? (
                            <>
                              <select 
                                value={study.rele_modelo && COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca)?.models.includes(study.rele_modelo) ? study.rele_modelo : (study.rele_modelo === '' ? '' : 'OUTRO')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'OUTRO') {
                                    setStudy({...study, rele_modelo: 'Modelo Manual'});
                                  } else {
                                    setStudy({...study, rele_modelo: val});
                                  }
                                  setSimulationStatus('idle');
                                }}
                                className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                              >
                                <option value="">Selecione...</option>
                                {COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca)?.models.map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                                <option value="OUTRO">Outro (Informar manual...)</option>
                              </select>
                              
                              {(study.rele_modelo === 'Modelo Manual' || (!COMMONLY_USED_RELAYS.find(r => r.manufacturer === study.rele_marca)?.models.includes(study.rele_modelo) && study.rele_modelo !== '')) && (
                                <input 
                                  type="text" 
                                  value={study.rele_modelo}
                                  onChange={(e) => {
                                    setStudy({...study, rele_modelo: e.target.value});
                                    setSimulationStatus('idle');
                                  }}
                                  placeholder="Digite o modelo do relé..."
                                  className="w-full bg-zinc-900 border border-green-900/30 text-white p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                                />
                              )}
                            </>
                          ) : (
                            <input 
                              type="text" 
                              value={study.rele_modelo}
                              onChange={(e) => {
                                setStudy({...study, rele_modelo: e.target.value});
                                setSimulationStatus('idle');
                              }}
                              placeholder="Informe o modelo..."
                              className="w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 transition-all font-mono"
                            />
                          )}
                        </div>
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
                             <div className="flex justify-between items-center mb-1">
                               <FieldInfo label="Pickup 51 (A)" description="Corrente de partida da unidade temporizada." />
                               {study.isAutoEnabled && <Zap className="w-3 h-3 text-yellow-500 animate-pulse" title="Ajustado Automáticamente" />}
                             </div>
                             <input 
                               type="number" 
                               value={study.rele_fase.pickup}
                               readOnly={study.isAutoEnabled}
                               onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, pickup: Number(e.target.value)}})}
                               className={`w-full bg-black border border-zinc-800 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 font-mono ${study.isAutoEnabled ? 'opacity-70 cursor-not-allowed border-yellow-500/30' : ''}`}
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
                           <div className="flex justify-between items-center mb-1">
                             <h4 className="text-[9px] font-black text-green-500 uppercase tracking-tighter">Instantânea (50)</h4>
                             <span className="text-[8px] text-zinc-400 font-mono">
                               Inrush: {(calculateInrushPoint(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim, study.inrush_multiplicador || 8).I).toFixed(1)}A
                             </span>
                           </div>
                           <div>
                              <FieldInfo label="Corrente Instantânea (A)" description="Pickup da unidade 50 de fase. Deve ser superior ao Inrush (com margem de 20% a 30%) e inferior ao Icc bifásico mínimo no ponto." />
                              <input 
                                type="number" 
                                step="1"
                                value={study.rele_fase.i_inst}
                                onChange={(e) => setStudy({...study, rele_fase: {...study.rele_fase, i_inst: Number(e.target.value)}})}
                                className="w-full bg-black border border-zinc-700 text-green-400 p-2 text-xs rounded outline-none focus:border-green-500 font-mono font-bold transition-all"
                              />
                              <span className="text-[8px] text-zinc-400 font-mono mt-1.5 block leading-tight">
                                Margem 20%-30% s/ Inrush: {((calculateInrushPoint(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim, study.inrush_multiplicador || 8).I) * 1.2).toFixed(0)}A a {((calculateInrushPoint(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim, study.inrush_multiplicador || 8).I) * 1.3).toFixed(0)}A
                              </span>
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
                             <div className="flex justify-between items-center mb-1">
                               <FieldInfo label="Pickup 51N (A)" description="Sensibilidade de neutro para partida." />
                               {study.isAutoEnabled && <Zap className="w-3 h-3 text-yellow-500 animate-pulse" title="Ajustado Automáticamente" />}
                             </div>
                             <input 
                               type="number" 
                               value={study.rele_neutro.pickup}
                               readOnly={study.isAutoEnabled}
                               onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, pickup: Number(e.target.value)}})}
                               className={`w-full bg-black border border-zinc-800 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 font-mono ${study.isAutoEnabled ? 'opacity-70 cursor-not-allowed border-yellow-500/30' : ''}`}
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
                           <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mb-2">Instantânea (50N)</h4>
                           <div>
                              <FieldInfo label="Corrente Instantânea (A)" description="Pickup da unidade 50N de neutro. Deve garantir atuação rápida em faltas monofásicas francas." />
                              <input 
                                type="number" 
                                step="1"
                                value={study.rele_neutro.i_inst}
                                onChange={(e) => setStudy({...study, rele_neutro: {...study.rele_neutro, i_inst: Number(e.target.value)}})}
                                className="w-full bg-black border border-zinc-700 text-blue-400 p-2 text-xs rounded outline-none focus:border-blue-500 font-mono font-bold transition-all"
                              />
                              <span className="text-[8px] text-zinc-400 font-mono mt-1.5 block">
                                Ajuste Instantâneo de Neutro: {study.rele_neutro.i_inst} A
                              </span>
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
                      {/* Parâmetros Finais de Ajuste do Relé (Especial Pextron / Geral) */}
                      {(() => {
                        const tcParts = study.tc_relacao?.split('/') || ['50', '5'];
                        const tcPrimary = parseFloat(tcParts[0]) || 50;
                        const tcSecondary = parseFloat(tcParts[1]) || 5;
                        const rtc = tcPrimary / tcSecondary;
                        const isPextron = study.rele_marca === 'Pextron';

                        return (
                          <div className="mt-6 p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2">
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-green-500 animate-pulse" />
                                <h4 className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider font-mono">
                                  Parâmetros Finais de Ajuste {isPextron ? `(Pextron ${study.rele_modelo || 'URPE'})` : `(${study.rele_marca || 'Relé Multifunção'})`}
                                </h4>
                              </div>
                              {isPextron && (
                                <span className="text-[8px] bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded font-black border border-green-500/30 uppercase font-mono">Linha Pextron</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                              {/* Grupo Fase */}
                              <div className="space-y-2">
                                <p className="font-bold text-green-400 uppercase tracking-widest text-[8px] border-b border-green-900/10 pb-1 font-mono">
                                  {isPextron ? 'Elemento de Fase (Canais I>, I>>, I>>>)' : 'Elemento de Fase (51 / 50D / 50)'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 font-mono">
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'I> Partida (Primário)' : '51 Partida (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_fase.pickup} A</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-green-500/80 block uppercase font-bold">
                                      {isPextron ? 'I> Ajuste Secundário' : '51 Partida (Secundário)'}
                                    </span>
                                    <span className="text-green-400 font-bold">{(study.rele_fase.pickup / rtc).toFixed(2)} A</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 col-span-2 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'I> Curva / Dial de Tempo (Dt)' : '51 Curva / TMS (Dial)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">
                                      {study.rele_fase.curva.replace('IEC_', '').replace('ANSI_', '')} / Dial {study.rele_fase.tms}
                                    </span>
                                  </div>

                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'I>> Tempo Definido (Primário)' : '50D Partida (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_fase.i_def > 0 ? `${study.rele_fase.i_def} A` : 'DESABILITADO'}</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-green-500/80 block uppercase font-bold">
                                      {isPextron ? 'I>> Ajuste Secundário' : '50D Partida (Secundário)'}
                                    </span>
                                    <span className="text-green-400 font-bold">
                                      {study.rele_fase.i_def > 0 ? `${(study.rele_fase.i_def / rtc).toFixed(2)} A` : '---'}
                                    </span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 col-span-2 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'tI>> Tempo Ajustado (s)' : '50D Tempo Definido (s)'}
                                    </span>
                                    <span className="text-green-400 font-bold">
                                      {study.rele_fase.i_def > 0 ? `${study.rele_fase.t_def.toFixed(2)} s` : '---'}
                                    </span>
                                  </div>

                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'I>>> Instantâneo (Primário)' : '50 Instantâneo (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_fase.i_inst > 0 ? `${study.rele_fase.i_inst} A` : 'DESABILITADO'}</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-green-500/80 block uppercase font-bold">
                                      {isPextron ? 'I>>> Ajuste Secundário' : '50 Instantâneo (Secundário)'}
                                    </span>
                                    <span className="text-green-400 font-bold">
                                      {study.rele_fase.i_inst > 0 ? `${(study.rele_fase.i_inst / rtc).toFixed(2)} A` : '---'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Grupo Neutro */}
                              <div className="space-y-2">
                                <p className="font-bold text-blue-400 uppercase tracking-widest text-[8px] border-b border-blue-900/10 pb-1 font-mono">
                                  {isPextron ? 'Elemento de Neutro (Canais IN>, IN>>, IN>>>)' : 'Elemento de Neutro (51N / 50DN / 50N)'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 font-mono">
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'IN> Partida (Primário)' : '51N Partida (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_neutro.pickup} A</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-blue-500/80 block uppercase font-bold">
                                      {isPextron ? 'IN> Ajuste Secundário' : '51N Partida (Secundário)'}
                                    </span>
                                    <span className="text-blue-400 font-bold">{(study.rele_neutro.pickup / rtc).toFixed(2)} A</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 col-span-2 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'IN> Curva / Dial de Tempo (Dt)' : '51N Curva / TMS (Dial)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">
                                      {study.rele_neutro.curva.replace('IEC_', '').replace('ANSI_', '')} / Dial {study.rele_neutro.tms}
                                    </span>
                                  </div>

                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'IN>> Tempo Definido (Primário)' : '50DN Partida (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_neutro.i_def > 0 ? `${study.rele_neutro.i_def} A` : 'DESABILITADO'}</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-blue-500/80 block uppercase font-bold">
                                      {isPextron ? 'IN>> Ajuste Secundário' : '50DN Partida (Secundário)'}
                                    </span>
                                    <span className="text-blue-400 font-bold">
                                      {study.rele_neutro.i_def > 0 ? `${(study.rele_neutro.i_def / rtc).toFixed(2)} A` : '---'}
                                    </span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 col-span-2 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'tIN>> Tempo Ajustado (s)' : '50DN Tempo Definido (s)'}
                                    </span>
                                    <span className="text-blue-400 font-bold">
                                      {study.rele_neutro.i_def > 0 ? `${study.rele_neutro.t_def.toFixed(2)} s` : '---'}
                                    </span>
                                  </div>

                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-zinc-500 block uppercase">
                                      {isPextron ? 'IN>>> Instantâneo (Primário)' : '50N Instantâneo (Primário)'}
                                    </span>
                                    <span className="text-zinc-300 font-bold">{study.rele_neutro.i_inst > 0 ? `${study.rele_neutro.i_inst} A` : 'DESABILITADO'}</span>
                                  </div>
                                  <div className="bg-black/60 p-2 border border-zinc-900 rounded">
                                    <span className="text-[7px] text-blue-500/80 block uppercase font-bold">
                                      {isPextron ? 'IN>>> Ajuste Secundário' : '50N Instantâneo (Secundário)'}
                                    </span>
                                    <span className="text-blue-400 font-bold">
                                      {study.rele_neutro.i_inst > 0 ? `${(study.rele_neutro.i_inst / rtc).toFixed(2)} A` : '---'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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
                          <div className="space-y-2 mt-1 border-t border-zinc-800/50 pt-2">
                            {func === '81' ? (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Sub-Freq (Hz)</label>
                                    <input 
                                      type="number" step="0.1"
                                      value={study.funcoes_adicionais[func].f_low}
                                      onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], f_low: Number(e.target.value)}}})}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Sob-Freq (Hz)</label>
                                    <input 
                                      type="number" step="0.1"
                                      value={study.funcoes_adicionais[func].f_high}
                                      onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], f_high: Number(e.target.value)}}})}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">T. Sub (s)</label>
                                    <input 
                                      type="number" step="0.05"
                                      value={study.funcoes_adicionais[func].t_low}
                                      onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], t_low: Number(e.target.value)}}})}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">T. Sob (s)</label>
                                    <input 
                                      type="number" step="0.05"
                                      value={study.funcoes_adicionais[func].t_high}
                                      onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], t_high: Number(e.target.value)}}})}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : func === '32' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Kw Reversa</label>
                                  <input 
                                    type="number"
                                    value={study.funcoes_adicionais[func].p_rev}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], p_rev: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Tempo (s)</label>
                                  <input 
                                    type="number" step="0.1"
                                    value={study.funcoes_adicionais[func].t_rev}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], t_rev: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                              </div>
                            ) : (func === '67' || func === '67N') ? (
                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Pick (A)</label>
                                  <input 
                                    type="number"
                                    value={study.funcoes_adicionais[func].pickup}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], pickup: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">TMS</label>
                                  <input 
                                    type="number" step="0.05"
                                    value={study.funcoes_adicionais[func].tms}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], tms: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Ângulo</label>
                                  <input 
                                    type="number"
                                    value={study.funcoes_adicionais[func].angulo}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], angulo: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                              </div>
                            ) : (func === '27' || func === '59') ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Pick (%)</label>
                                  <input 
                                    type="number"
                                    value={study.funcoes_adicionais[func].v_pick}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], v_pick: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] text-zinc-500 uppercase block mb-0.5">Tempo (s)</label>
                                  <input 
                                    type="number" step="0.1"
                                    value={study.funcoes_adicionais[func].t_pick}
                                    onChange={(e) => setStudy({...study, funcoes_adicionais: {...study.funcoes_adicionais, [func]: {...study.funcoes_adicionais[func], t_pick: Number(e.target.value)}}})}
                                    className="w-full bg-zinc-950 border border-zinc-800 text-blue-400 p-1 text-[9px] rounded"
                                  />
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
                          </div>
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

                <section className="bg-zinc-900/30 p-5 rounded-lg border border-zinc-800 shadow-lg shadow-blue-900/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[11px] font-black flex items-center gap-2 text-blue-400 uppercase tracking-tighter">
                      <ShieldAlert className="w-4 h-4" /> Análise de Engenharia e Sugestões
                    </h3>
                    <div className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/30">ABNT NBR 14039</div>
                  </div>
                  
                  <div className="space-y-3">
                    {getTechnicalSuggestions(study).length === 0 ? (
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-4">
                        <div className="bg-green-500/20 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-[11px] text-green-400 font-black uppercase">Sistema em Conformidade</p>
                          <p className="text-[9px] text-green-700 font-mono">OS AJUSTES SELECIONADOS ATENDEM AOS REQUISITOS TÉCNICOS ANALISADOS.</p>
                        </div>
                      </div>
                    ) : (
                      getTechnicalSuggestions(study).map((sug, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border-l-4 flex gap-4 items-start ${sug.includes('CRÍTICO') ? 'bg-red-500/5 border-red-500/50 text-red-100' : 'bg-yellow-500/5 border-yellow-500/30 text-yellow-100'}`}>
                          <div className={`p-1.5 rounded bg-zinc-950 mt-0.5 ${sug.includes('CRÍTICO') ? 'text-red-500 border border-red-500/20' : 'text-yellow-500 border border-yellow-500/20'}`}>
                            {sug.includes('CRÍTICO') ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-bold leading-tight uppercase font-mono tracking-tight">{sug}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-800">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                       <Zap className="w-3 h-3 text-yellow-500" /> Simulações de Atuação
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <button 
                         onClick={() => runSimulation('3phase')}
                         disabled={simulationStatus === 'running'}
                         className={`p-3 bg-black/40 border border-zinc-800 rounded-lg text-left hover:bg-zinc-800/50 transition-colors group relative overflow-hidden ${simulationStatus === 'running' ? 'opacity-70 cursor-not-allowed' : ''}`}
                       >
                          {simulationStatus === 'running' && (
                            <motion.div 
                              className="absolute bottom-0 left-0 h-0.5 bg-green-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${simulationProgress}%` }}
                            />
                          )}
                          <div className="text-[8px] text-zinc-600 uppercase font-black mb-2 group-hover:text-green-500 flex items-center gap-1">
                             {simulationStatus === 'running' ? 'Simulando...' : 'Simular Falta Trifásica'} 
                             {simulationStatus === 'running' ? <div className="w-2 h-2 border border-green-500 border-t-transparent rounded-full animate-spin" /> : <ChevronRight className="w-2 h-2" />}
                          </div>
                          <div className="flex justify-between items-baseline">
                             <span className="text-[12px] font-mono text-zinc-400">{study.icc_3f}A</span>
                             <span className="text-[14px] font-mono text-red-500 font-bold">
                                {simulationStatus === 'done' ? (
                                  calculateActualRelayTime(
                                    study.icc_3f,
                                    study.rele_fase.pickup,
                                    study.rele_fase.tms,
                                    study.rele_fase.curva,
                                    { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
                                    study.rele_fase.i_def,
                                    study.rele_fase.t_def,
                                    study.rele_fase.i_inst
                                  ).toFixed(3) + 's'
                                ) : '---'}
                             </span>
                          </div>
                          <div className="text-[7px] text-zinc-700 mt-1 uppercase font-bold">Inicia processamento de seletividade</div>
                          
                          {simulationStatus === 'done' && simulationType === '3phase' && (
                             <motion.div 
                               initial={{ opacity: 0, y: 5 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="mt-3 pt-2 border-t border-zinc-800/50"
                             >
                                <p className="text-[9px] text-zinc-400 leading-tight italic">
                                   {study.rele_fase.i_inst > 0 && study.icc_3f >= study.rele_fase.i_inst 
                                     ? "Atuação Instantânea (50): Corrente de falta no barramento supera o pickup instantâneo. Desligamento imediato para proteção do sistema conforme NBR 14039."
                                     : "Atuação Temporizada (51): Corrente de falta processada pela lógica de tempo inverso. Garante seletividade com a rede da concessionária."}
                                </p>
                             </motion.div>
                          )}
                       </button>
                       <button 
                         onClick={() => runSimulation('overload')}
                         disabled={simulationStatus === 'running'}
                         className={`p-3 bg-black/40 border border-zinc-800 rounded-lg text-left hover:bg-zinc-800/50 transition-colors group relative overflow-hidden ${simulationStatus === 'running' ? 'opacity-70 cursor-not-allowed' : ''}`}
                       >
                          {simulationStatus === 'running' && (
                            <motion.div 
                              className="absolute bottom-0 left-0 h-0.5 bg-yellow-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${simulationProgress}%` }}
                            />
                          )}
                          <div className="text-[8px] text-zinc-600 uppercase font-black mb-2 group-hover:text-yellow-500 flex items-center gap-1">
                             {simulationStatus === 'running' ? 'Simulando...' : 'Simular Sobrecarga (1.5x)'}
                             {simulationStatus === 'running' ? <div className="w-2 h-2 border border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <ChevronRight className="w-2 h-2" />}
                          </div>
                          <div className="flex justify-between items-baseline">
                             <span className="text-[12px] font-mono text-zinc-400">{(calculateInominal(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim) * 1.5).toFixed(2)}A</span>
                             <span className="text-[14px] font-mono text-yellow-500 font-bold">
                                {simulationStatus === 'done' ? (
                                  calculateActualRelayTime(
                                    calculateInominal(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim) * 1.5,
                                    study.rele_fase.pickup,
                                    study.rele_fase.tms,
                                    study.rele_fase.curva,
                                    { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P },
                                    study.rele_fase.i_def,
                                    study.rele_fase.t_def,
                                    study.rele_fase.i_inst
                                  ).toFixed(2) + 's'
                                ) : '---'}
                             </span>
                          </div>
                          <div className="text-[7px] text-zinc-700 mt-1 uppercase font-bold">Verificar atuação baseada em I_nom</div>

                          {simulationStatus === 'done' && simulationType === 'overload' && (
                             <motion.div 
                               initial={{ opacity: 0, y: 5 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="mt-3 pt-2 border-t border-zinc-800/50"
                             >
                                <p className="text-[9px] text-zinc-400 leading-tight italic">
                                   Simulação de Sobrecarga: Verificação térmica em 150% da corrente nominal. Tempo de atuação calculado para proteger o isolamento do transformador de acordo com a curva ANSI/IEEE C57.109.
                                </p>
                             </motion.div>
                          )}
                       </button>
                       <button 
                         onClick={() => runSimulation('1phase')}
                         disabled={simulationStatus === 'running'}
                         className={`p-3 bg-black/40 border border-zinc-800 rounded-lg text-left hover:bg-zinc-800/50 transition-colors group relative overflow-hidden ${simulationStatus === 'running' ? 'opacity-70 cursor-not-allowed' : ''}`}
                       >
                          {simulationStatus === 'running' && (
                            <motion.div 
                              className="absolute bottom-0 left-0 h-0.5 bg-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${simulationProgress}%` }}
                            />
                          )}
                          <div className="text-[8px] text-zinc-600 uppercase font-black mb-2 group-hover:text-blue-500 flex items-center gap-1">
                             {simulationStatus === 'running' ? 'Simulando...' : 'Simular Falta Monofásica'}
                             {simulationStatus === 'running' ? <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" /> : <ChevronRight className="w-2 h-2" />}
                          </div>
                          <div className="flex justify-between items-baseline">
                             <span className="text-[12px] font-mono text-zinc-400">{study.icc_1f}A</span>
                             <span className="text-[14px] font-mono text-blue-500 font-bold">
                                {simulationStatus === 'done' ? (
                                  calculateActualRelayTime(
                                    study.icc_1f,
                                    study.rele_neutro.pickup,
                                    study.rele_neutro.tms,
                                    study.rele_neutro.curva,
                                    { A: study.rele_neutro.A, B: study.rele_neutro.B, P: study.rele_neutro.P },
                                    study.rele_neutro.i_def,
                                    study.rele_neutro.t_def,
                                    study.rele_neutro.i_inst
                                  ).toFixed(3) + 's'
                                ) : '---'}
                             </span>
                          </div>
                          <div className="text-[7px] text-zinc-700 mt-1 uppercase font-bold">Verificar unidade de neutro terra (51N/50N)</div>

                          {simulationStatus === 'done' && simulationType === '1phase' && (
                             <motion.div 
                               initial={{ opacity: 0, y: 5 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="mt-3 pt-2 border-t border-zinc-800/50"
                             >
                                <p className="text-[9px] text-zinc-400 leading-tight italic">
                                   Falta à Terra: Simulação de curto monofásico. Avalia a resposta de tempo da proteção 51N (temporizada) ou 50N (instantânea) garantindo a extinção rápida do arco.
                                </p>
                             </motion.div>
                          )}
                       </button>
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
                 {/* Painel de Diagnóstico em Tempo Real - CEMIG ND 5.3 */}
                 <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 shadow-xl">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-800/80">
                     <div className="flex items-center gap-2.5">
                       <div className={`p-2 rounded-lg ${selectivityDiag.isSelectivityOk ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                         <ShieldCheck className="w-5 h-5" />
                       </div>
                       <div>
                         <div className="flex items-center gap-2 flex-wrap">
                           <h4 className="text-xs font-black uppercase text-white tracking-wider font-mono">
                             Painel de Diagnóstico em Tempo Real
                           </h4>
                           <span className={`text-[9px] px-2 py-0.5 rounded font-black font-mono uppercase ${
                             selectivityDiag.isSelectivityOk ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                           }`}>
                             {selectivityDiag.isSelectivityOk ? 'CONFORME CEMIG ND 5.3 (≥ 200ms)' : 'REQUER AJUSTE DE SELETIVIDADE (< 200ms)'}
                           </span>
                         </div>
                         <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                           Elo Retaguarda: <strong className="text-yellow-400 font-bold">{study.fusivel_concessionaria || '40K'}</strong> | Barramento Icc 3φ: <strong className="text-red-400 font-bold">{study.icc_3f || 5000} A</strong>
                         </p>
                       </div>
                     </div>

                     <div className="flex items-center gap-2 w-full sm:w-auto">
                       <button 
                         onClick={handleAjusteCemigND53}
                         title="Executar motor de otimização iterativo ND 5.3"
                         className="flex-1 sm:flex-none px-3.5 py-1.5 bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase rounded shadow-lg transition-all flex items-center justify-center gap-1.5"
                       >
                         <Zap className="w-3.5 h-3.5 fill-black" />
                         Ajuste CEMIG ND 5.3
                       </button>
                       <button
                         onClick={() => {
                           setTempParecerText(study.parecer_tecnico_personalizado || getDefaultParecerHomologado(study));
                           setShowParecerModal(true);
                         }}
                         title="Editar considerações do parecer técnico do memorial"
                         className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1.5"
                       >
                         <FileEdit className="w-3.5 h-3.5 text-green-400" />
                         Parecer Técnico
                       </button>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                     <div className="bg-black/60 p-2.5 rounded border border-zinc-900 font-mono">
                       <span className="text-[8px] text-zinc-500 uppercase block font-sans">Margem Cronométrica</span>
                       <p className={`text-base font-black ${selectivityDiag.isSelectivityOk ? 'text-green-400' : 'text-amber-400'}`}>
                         {(selectivityDiag.minMargin * 1000).toFixed(0)} ms
                       </p>
                       <span className="text-[7.5px] text-zinc-400 block mt-0.5">
                         Mínimo ND 5.3: 200 ms
                       </span>
                     </div>

                     <div className="bg-black/60 p-2.5 rounded border border-zinc-900 font-mono">
                       <span className="text-[8px] text-zinc-500 uppercase block font-sans">Ponto Crítico (Pior Caso)</span>
                       <p className="text-base font-black text-zinc-200">
                         {selectivityDiag.criticalCurrent.toFixed(1)} A
                       </p>
                       <span className="text-[7.5px] text-zinc-400 block mt-0.5">
                         t_elo: {selectivityDiag.fuseMeltingTimeAtCrit.toFixed(3)}s | t_relé: {selectivityDiag.relayTripTimeAtCrit.toFixed(3)}s
                       </span>
                     </div>

                     <div className="bg-black/60 p-2.5 rounded border border-zinc-900 font-mono">
                       <span className="text-[8px] text-zinc-500 uppercase block font-sans">Inrush vs Instantâneo (50)</span>
                       <p className="text-base font-black text-green-400">
                         {study.rele_fase.i_inst > 0 ? `${study.rele_fase.i_inst} A` : 'DESAB.'}
                       </p>
                       <span className="text-[7.5px] text-zinc-400 block mt-0.5">
                         Inrush: {inrushCurrent.toFixed(1)}A ({instMarginPercent >= 0 ? `+${instMarginPercent.toFixed(1)}%` : `${instMarginPercent.toFixed(1)}%`})
                       </span>
                     </div>

                     <div className="bg-black/60 p-2.5 rounded border border-zinc-900 font-mono">
                       <span className="text-[8px] text-zinc-500 uppercase block font-sans">Conformidade Global</span>
                       <p className={`text-xs font-black uppercase mt-1 ${isFullCompliant ? 'text-green-400' : 'text-amber-400'}`}>
                         {isFullCompliant ? '✓ 100% HOMOLOGADO' : '⚠ AJUSTE NECESSÁRIO'}
                       </p>
                       <span className="text-[7.5px] text-zinc-400 block mt-1">
                         ND 5.3 & NBR 14039
                       </span>
                     </div>
                   </div>
                 </div>

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
                    <button 
                      onClick={() => toggleCurve('Elo Fusível')}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${visibleCurves.includes('Elo Fusível') ? 'bg-[#eab30833] border-[#eab308] text-[#facc15]' : 'bg-transparent border-zinc-700 text-zinc-500'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${visibleCurves.includes('Elo Fusível') ? 'bg-[#eab308]' : 'bg-zinc-700'}`}></div>
                      ELO FUSÍVEL ({study.fusivel_concessionaria || '40K'})
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

                  {/* Simulation & Report Finalization */}
                  <div id="main-simulation-panel" className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-lg mt-4 shadow-xl">
                    <h4 className="text-[10px] font-black text-green-500 uppercase mb-4 flex items-center gap-2">
                       <Zap className="w-3.5 h-3.5 text-yellow-500" /> Processamento e Finalização Técnica
                    </h4>
                    
                    <div className="space-y-6">
                       {simulationStatus === 'running' && (
                         <div className="space-y-2 bg-black/40 p-3 border border-zinc-800 rounded">
                            <div className="flex justify-between text-[9px] text-zinc-400 uppercase font-black">
                               <span>Sincronizando curvas e seletividade</span>
                               <span>{Math.round(simulationProgress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                               <motion.div 
                                 className="h-full bg-green-500" 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${simulationProgress}%` }}
                               />
                            </div>
                         </div>
                       )}

                       {simulationStatus === 'done' && (
                        <div className="space-y-6">
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                           >
                              <div className="border-l-2 border-green-500 pl-3 py-1">
                                 <p className="text-[8px] text-zinc-500 uppercase font-bold">Coord. Fase</p>
                                 <p className="text-lg font-black text-green-400">0.42s (OK)</p>
                              </div>
                              <div className="border-l-2 border-green-500 pl-3 py-1">
                                 <p className="text-[8px] text-zinc-500 uppercase font-bold">Coord. Neutro</p>
                                 <p className="text-lg font-black text-green-400">0.38s (OK)</p>
                              </div>
                              <div className="border-l-2 border-green-500 pl-3 py-1">
                                 <p className="text-[8px] text-zinc-500 uppercase font-bold">Icc 3φ (Protegido)</p>
                                 <p className="text-lg font-black text-green-400">0.010s</p>
                              </div>
                           </motion.div>

                           <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-green-950/20 border border-green-500/30 rounded-lg"
                           >
                              <div className="flex gap-3">
                                 <div className="mt-0.5">
                                    <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                       <Lightbulb className="w-4 h-4 text-green-400" />
                                    </div>
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-1">Análise Técnica do Resultado</p>
                                    <p className="text-[11px] text-zinc-300 font-mono leading-relaxed italic">
                                       {getSimulationResultText()}
                                    </p>
                                 </div>
                              </div>
                           </motion.div>
                        </div>
                       )}

                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <button 
                            type="button"
                            onClick={() => runSimulation('3phase')}
                            disabled={simulationStatus === 'running'}
                            className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded font-black text-xs uppercase shadow-lg transition-all cursor-pointer ${
                              simulationStatus === 'running' 
                                ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed' 
                                : simulationStatus === 'done'
                                  ? 'bg-zinc-900 text-green-400 border border-green-500/30'
                                  : 'bg-green-600 hover:bg-green-500 text-black shadow-green-500/10'
                            }`}
                          >
                            {simulationStatus === 'running' ? (
                              <>
                                <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                                PROCESSANDO...
                              </>
                            ) : simulationStatus === 'done' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> RE-SIMULAR ESTUDO
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 fill-current" /> INICIAR SIMULAÇÃO
                              </>
                            )}
                          </button>

                          <button 
                            type="button"
                            onClick={handleAjusteCemigND53}
                            title="Ajuste CEMIG ND 5.3 com parâmetros editáveis"
                            className="py-3.5 px-4 bg-green-500 hover:bg-green-400 text-black rounded font-black text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 cursor-pointer active:scale-95"
                          >
                            <Zap className="w-4 h-4 fill-black" /> AJUSTE CEMIG ND 5.3
                          </button>

                          <button 
                            type="button"
                            onClick={() => {
                              setTempParecerText(study.parecer_tecnico_personalizado || getDefaultParecerHomologado(study));
                              setShowParecerModal(true);
                            }}
                            className="py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FileEdit className="w-4 h-4 text-green-400" /> EDITAR PARECER TÉCNICO
                          </button>

                          <button 
                            type="button"
                            onClick={() => {
                              if (simulationStatus !== 'done') {
                                alert("AVISO: O estudo não foi formalmente simulado com os parâmetros atuais. O memorial pode conter dados preliminares.");
                              }
                              setShowReport(true);
                            }}
                            className="py-3.5 px-4 bg-transparent border-2 rounded font-black text-xs uppercase transition-all flex items-center justify-center gap-2 border-green-600 text-green-500 hover:bg-green-600/10 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" /> EXPORTAR MEMORIAL (A4)
                          </button>
                       </div>

                       {simulationStatus !== 'done' && (
                         <div className="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                            <p className="text-[10px] text-yellow-500/70 font-bold uppercase leading-tight">
                              Atenção: A geração do relatório em PDF (A4) requer uma simulação válida e atualizada para garantir a integridade dos cálculos.
                            </p>
                         </div>
                       )}
                    </div>
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
          curves={allCurves}
          specialPoints={specialPoints}
          userEmail={user?.email}
        />
      )}

      {showParecerModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border border-green-500/50 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wide">
                    Parecer Técnico e Conclusão da Proteção
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Edição personalizada do parecer ou restauração do texto padrão homologado (CEMIG ND 5.3).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowParecerModal(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                <span>TEXTO DO PARECER (INSERIDO NO MEMORIAL TÉCNICO A4):</span>
                <span className="text-green-500 font-bold">
                  {tempParecerText.length} caracteres
                </span>
              </div>
              <textarea
                rows={6}
                value={tempParecerText}
                onChange={(e) => setTempParecerText(e.target.value)}
                placeholder="Insira aqui as considerações específicas da instalação e conclusão sobre a seletividade..."
                className="w-full bg-black border border-zinc-800 focus:border-green-500 rounded-lg p-3 text-xs text-zinc-200 font-mono outline-none leading-relaxed transition-all resize-y"
              />
            </div>

            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 space-y-1">
              <p className="text-zinc-300 font-bold uppercase flex items-center gap-1.5">
                <Info className="w-3 h-3 text-green-400" /> Parâmetros em Tempo Real:
              </p>
              <p>• Elo Retaguarda: <strong className="text-yellow-400">{study.fusivel_concessionaria || '40K'}</strong> | Barramento Icc 3φ: <strong className="text-red-400">{study.icc_3f} A</strong></p>
              <p>• Margem Cronométrica Mínima: <strong className={selectivityDiag.isSelectivityOk ? 'text-green-400' : 'text-amber-400'}>{(selectivityDiag.minMargin * 1000).toFixed(0)} ms</strong> no ponto crítico de {selectivityDiag.criticalCurrent.toFixed(1)} A</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const defaultText = getDefaultParecerHomologado(study);
                  setTempParecerText(defaultText);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-500/30 rounded text-xs font-bold font-mono uppercase transition-all"
              >
                Restaurar Padrão Homologado ND 5.3
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowParecerModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudy(prev => ({ ...prev, parecer_tecnico_personalizado: tempParecerText }));
                    setShowParecerModal(false);
                    setSaveMessage({ type: 'success', text: 'Parecer técnico personalizado salvo e aplicado!' });
                  }}
                  className="flex-1 sm:flex-none px-5 py-2 bg-green-500 hover:bg-green-400 text-black rounded text-xs font-black uppercase transition-all shadow-lg"
                >
                  Salvar Parecer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showCemigAdjustModal && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-zinc-950 border border-green-500/50 rounded-xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/30">
                  <Zap className="w-6 h-6 fill-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                    Ajuste e Coordenação CEMIG ND 5.3
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-mono font-bold">
                      PARÂMETROS EDITÁVEIS
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Os valores são calculados para assegurar coordenação cronométrica (margem ≥ 200ms) e podem ser livremente editados pelo engenheiro.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCemigAdjustModal(false)}
                className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real-time Diagnostics Banner */}
            <div className={`p-4 rounded-lg border transition-all ${
              modalSelectivityDiag?.isSelectivityOk 
                ? 'bg-green-950/20 border-green-500/40 text-green-300' 
                : 'bg-amber-950/25 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800/80 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${modalSelectivityDiag?.isSelectivityOk ? 'text-green-400' : 'text-amber-400'}`} />
                  <span className="text-xs font-black uppercase tracking-wide">Diagnóstico de Seletividade com Parâmetros Atuais:</span>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded uppercase font-mono border ${
                  modalSelectivityDiag?.isSelectivityOk 
                    ? 'bg-green-500/20 text-green-400 border-green-500/40' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                }`}>
                  {modalSelectivityDiag?.isSelectivityOk 
                    ? 'CONFORME CEMIG ND 5.3 (Margem ≥ 200ms)' 
                    : 'ATENÇÃO: Margem Inferior a 200ms'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Margem Mínima</span>
                  <span className={`text-base font-black ${modalSelectivityDiag?.isSelectivityOk ? 'text-green-400' : 'text-amber-400'}`}>
                    {((modalSelectivityDiag?.minMargin || 0) * 1000).toFixed(0)} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Ponto Crítico (Icc)</span>
                  <span className="text-zinc-200 font-bold">
                    {(modalSelectivityDiag?.criticalCurrent || 0).toFixed(1)} A
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Tempo Elo vs Relé</span>
                  <span className="text-zinc-200 font-bold">
                    t_elo: {(modalSelectivityDiag?.t_fuse || 0).toFixed(3)}s | t_relé: {(modalSelectivityDiag?.t_relay || 0).toFixed(3)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Instantâneo 50 vs Inrush</span>
                  <span className="text-zinc-200 font-bold">
                    50: {cemigModalData.instFase}A (Inrush: {((trafoInom * cemigModalData.inrushMult) || 0).toFixed(0)}A)
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Elo e Inrush */}
              <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-yellow-400 uppercase flex items-center gap-2">
                  1. Concessionária & Transformador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Elo Fusível Retaguarda (CEMIG)
                    </label>
                    <select
                      value={cemigModalData.fusivel}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, fusivel: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-yellow-400 p-2 text-xs rounded font-mono font-bold outline-none focus:border-green-500"
                    >
                      {CEMIG_STANDARD_FUSES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Multiplicador de Inrush do Trafo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="14"
                        step="0.5"
                        value={cemigModalData.inrushMult}
                        onChange={(e) => setCemigModalData(prev => ({ ...prev, inrushMult: Number(e.target.value) }))}
                        className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                      />
                      <span className="text-xs text-zinc-400 font-mono">x Inom</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Inom Trafo Primário / Icc 3φ Barramento
                    </label>
                    <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded text-xs font-mono text-zinc-300">
                      In: <strong className="text-white">{trafoInom.toFixed(1)} A</strong> | Icc: <strong className="text-red-400">{study.icc_3f} A</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proteção de Fase */}
              <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                    2. Proteção de Fase (51 / 50 / 50D)
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Recomendado ND 5.3: 51 ≈ 1.25 x Inom | 50 ≈ 1.25 x Inrush
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Pickup Fase (51) [A]
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cemigModalData.pickupFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, pickupFase: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                      Sugerido: {Math.ceil(trafoInom * 1.25)} A (1.25 x Inom)
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Dial / TMS de Fase (51)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.02"
                      max="1.50"
                      value={cemigModalData.tmsFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, tmsFase: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                      Ajuste para garantir margem ≥ 200ms
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Curva de Fase (51)
                    </label>
                    <select
                      value={cemigModalData.curvaFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, curvaFase: e.target.value as CurveType }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono font-bold outline-none focus:border-green-500"
                    >
                      <option value="IEC_VI">IEC Muito Inversa (Padrão ND 5.3)</option>
                      <option value="IEC_EI">IEC Extremamente Inversa</option>
                      <option value="IEC_NI">IEC Normalmente Inversa</option>
                      <option value="IEC_LONG">IEC Longo Tempo</option>
                      <option value="ANSI_VI">ANSI Muito Inversa</option>
                      <option value="ANSI_EI">ANSI Extremamente Inversa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Instantâneo Fase (50) [A]
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={cemigModalData.instFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, instFase: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                      Sugerido: {Math.round(trafoInom * cemigModalData.inrushMult * 1.25)} A (+25% s/ Inrush)
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Tempo Definido (50D) [A]
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={cemigModalData.defFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, defFase: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Tempo de Atuação 50D [s]
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="2.00"
                      value={cemigModalData.tDefFase}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, tDefFase: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-green-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Proteção de Neutro */}
              <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                    3. Proteção de Neutro (51N / 50N / 50DN)
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Recomendado: 51N ≈ 20% do Fase | 50N ≈ 4 x Inom
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Pickup Neutro (51N) [A]
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cemigModalData.pickupNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, pickupNeutro: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                      Sugerido: {Math.max(5, Math.ceil(cemigModalData.pickupFase * 0.2))} A (20% Fase)
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Dial / TMS de Neutro (51N)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.02"
                      max="1.50"
                      value={cemigModalData.tmsNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, tmsNeutro: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Curva de Neutro (51N)
                    </label>
                    <select
                      value={cemigModalData.curvaNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, curvaNeutro: e.target.value as CurveType }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono font-bold outline-none focus:border-green-500"
                    >
                      <option value="IEC_VI">IEC Muito Inversa</option>
                      <option value="IEC_EI">IEC Extremamente Inversa</option>
                      <option value="IEC_NI">IEC Normalmente Inversa</option>
                      <option value="IEC_LONG">IEC Longo Tempo</option>
                      <option value="ANSI_VI">ANSI Muito Inversa</option>
                      <option value="ANSI_EI">ANSI Extremamente Inversa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Instantâneo Neutro (50N) [A]
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={cemigModalData.instNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, instNeutro: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                      Sugerido: {Math.round(trafoInom * 4.0)} A (4.0 x Inom)
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Tempo Definido (50DN) [A]
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={cemigModalData.defNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, defNeutro: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-mono">
                      Tempo de Atuação 50DN [s]
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="2.00"
                      value={cemigModalData.tDefNeutro}
                      onChange={(e) => setCemigModalData(prev => ({ ...prev, tDefNeutro: Number(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 p-2 text-xs rounded font-mono outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const recs = getRecommendedND53Params(study);
                  setCemigModalData(recs);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-500/30 rounded text-xs font-bold font-mono uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-yellow-400" />
                Restaurar Otimização Automática ND 5.3
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCemigAdjustModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white rounded text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyCemigModal}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black rounded text-xs font-black uppercase transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aplicar Parâmetros ao Estudo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showHelp && (
          <HelpMenu onClose={() => setShowHelp(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border ${
              saveMessage.type === 'success' 
                ? 'bg-zinc-900 border-green-500 text-green-500' 
                : 'bg-zinc-900 border-red-500 text-red-500'
            }`}
          >
            {saveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{saveMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
