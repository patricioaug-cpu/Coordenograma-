import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Cpu, 
  Zap, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  Activity,
  Layers,
  Info,
  Printer,
  Loader2
} from 'lucide-react';
import { getRelayDiagram, RelayDiagramInfo } from '../constants/relay-diagrams';
import { RelayDiagramViewer } from './RelayDiagramViewer';
import { printRelayDiagram } from '../utils/relay-print';

interface RelayDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  manufacturer: string;
  model: string;
}

export const RelayDiagramModal: React.FC<RelayDiagramModalProps> = ({
  isOpen,
  onClose,
  manufacturer,
  model
}) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'terminals' | 'specs' | 'wiring'>('diagram');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  if (!isOpen) return null;

  const diagramInfo: RelayDiagramInfo = getRelayDiagram(manufacturer, model);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printRelayDiagram(diagramInfo);
    } catch (err) {
      console.error('Erro ao acionar impressão:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-zinc-950 border border-zinc-700/80 rounded-2xl w-full h-[95vh] max-w-7xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* CABEÇALHO DA TELA CHEIA */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black uppercase text-white font-mono tracking-tight">
                  Diagrama de Ligação & Esquema Funcional
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  {diagramInfo.manufacturer}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-black bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wider">
                  {diagramInfo.model}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {diagramInfo.category} • Conexão de TCs, TPs, Fonte Auxiliar e Bobina de Trip (52/TC)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Abas */}
            <div className="flex bg-black/60 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('diagram')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  activeTab === 'diagram'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Esquema Unifilar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terminals')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  activeTab === 'terminals'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pinagem dos Bornes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wiring')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  activeTab === 'wiring'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Normas & Ligação
              </button>
            </div>

            {/* Botão de Fechar Tela Cheia */}
            <button
              type="button"
              onClick={onClose}
              title="Fechar tela cheia"
              className="p-2 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-300 rounded-lg border border-zinc-700 transition-all cursor-pointer active:scale-95 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO PRINCIPAL COM CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/80 space-y-6">
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              {/* Barra de Informações do Modelo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 uppercase block text-[9px]">Fabricante Homologado:</span>
                  <strong className="text-white font-bold">{diagramInfo.manufacturer}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase block text-[9px]">Modelo do Relé:</span>
                  <strong className="text-green-400 font-bold">{diagramInfo.model}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase block text-[9px]">Alimentação de Comando:</span>
                  <strong className="text-yellow-400 font-bold">{diagramInfo.powerSupply.split(':')[1] || diagramInfo.powerSupply}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase block text-[9px]">Padrão Concessionária:</span>
                  <strong className="text-blue-400 font-bold">CEMIG ND 5.3 / ABNT NBR 14039</strong>
                </div>
              </div>

              {/* Visualizador do Esquema Gráfico SVG */}
              <RelayDiagramViewer info={diagramInfo} />

              {/* Destaques Rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase mb-2">
                    <Zap className="w-4 h-4" /> Entradas de Corrente (TCs)
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    {diagramInfo.inputCT}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    Conectar o secundário polarizado S1 nas entradas do relé e unificar o S2 para terra PE em ponto único.
                  </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-2">
                    <Activity className="w-4 h-4" /> Comando de Disparo (Trip 52/TC)
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    {diagramInfo.tripsOutputs}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    Contato seco de alta capacidade, aciona a bobina de abertura sem necessidade de relé multiplicador.
                  </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase mb-2">
                    <ShieldCheck className="w-4 h-4" /> Alimentação e Comunicação
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    {diagramInfo.powerSupply}
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    {diagramInfo.comms || "Porta serial RS485 para comunicação supervisória SCADA/Modbus."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminals' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-300 uppercase font-mono">
                    Mapeamento Detalhado dos Bornes - {diagramInfo.model}
                  </h4>
                  <p className="text-xs text-zinc-300 font-mono mt-1">
                    Confira a pinagem física na régua traseira do equipamento para montagem e teste de continuidade antes do comissionamento elétrico da cabine.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Grupo Funcional</th>
                      <th className="p-3.5">Numeração dos Bornes</th>
                      <th className="p-3.5">Descrição da Conexão</th>
                      <th className="p-3.5">Status / Sinal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {diagramInfo.terminalsSummary.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full inline-block" 
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-white">{t.group}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-1 bg-black rounded border border-zinc-800 font-bold text-yellow-400">
                            {t.terminals}
                          </span>
                        </td>
                        <td className="p-3.5 text-zinc-300">
                          {t.description}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            ATIVO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-green-400 font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Diretrizes de Instalação (ABNT NBR 14039)
                  </h4>
                  <ul className="space-y-2.5 text-xs text-zinc-300 font-mono">
                    {diagramInfo.wiringNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-amber-400 font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Cuidados Críticos de Segurança
                  </h4>
                  <div className="space-y-2 text-xs text-zinc-300 font-mono">
                    <p className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-red-300">
                      <strong>NUNCA ABRA O CIRCUITO SECUNDÁRIO DO TC EM CARGA:</strong> Transformadores de corrente em circuito aberto desenvolvem sobretensões induzidas de milhares de volts, causando arco elétrico, queima do equipamento e risco letal ao eletricista.
                    </p>
                    <p className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300">
                      <strong>ATERRAMENTO ÚNICO:</strong> O neutro comum dos TCs (S2) deve ser aterrado em apenas um ponto para evitar correntes circulantes na malha de terra que provoquem atuação indevida da proteção 51N.
                    </p>
                    <p className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300">
                      <strong>TESTE DE TRIP:</strong> Antes de energizar a cabine primária com a concessionária, execute o disparo manual do disjuntor através do relé (função Teste de Saída) para atestar a mecânica do disjuntor 52.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Relé Selecionado no Projeto: <strong>{diagramInfo.manufacturer} - {diagramInfo.model}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              title="Imprimir ou Salvar Esquema Elétrico em PDF (Formato A4)"
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white text-xs font-mono font-bold rounded-lg border border-zinc-600 hover:border-zinc-500 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Preparando A4...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Imprimir Esquema (A4)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              Fechar Tela Cheia
            </button>
          </div>
        </div>

        {/* Estilo CSS embutido para forçar configuração de impressão A4 caso o usuário use atalhos do navegador */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm !important;
            }
          }
        `}</style>
      </motion.div>
    </div>
  );
};
