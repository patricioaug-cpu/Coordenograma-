import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CoordChart } from './CoordChart';
import { Copy, Printer, X, FileText, Shield, Info, Zap, AlertTriangle } from 'lucide-react';
import { Concessionaria } from '../constants/concessionarias';
import { getTechnicalSuggestions, calculateInominal, calculateInPlant, validateTC } from '../lib/protection-utils';

interface ReportProps {
  study: any;
  concessionaria?: Concessionaria;
  onClose: () => void;
  curves: any[];
  specialPoints: any[];
}

export const ReportView: React.FC<ReportProps> = ({ study, concessionaria, onClose, curves, specialPoints }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = React.useState(1);

  React.useEffect(() => {
    const calculateScale = () => {
      if (window.innerWidth < 800) {
        const a4WidthMm = 210;
        const screenWidthPx = window.innerWidth - 40; 
        const a4WidthPx = (a4WidthMm * 96) / 25.4;
        const newScale = Math.min(1, screenWidthPx / a4WidthPx);
        setPreviewScale(newScale);
      } else {
        setPreviewScale(1);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const handleCopyData = () => {
    const equipamentosRef = study.equipamentos.map((eq: any) => 
      `- ${eq.tipo}: ${eq.tipo === 'Motor' ? eq.kva + 'kW' : eq.kva + 'kVA'}, Qtd: ${eq.qtd}, Desc: ${eq.descricao || 'N/A'}`
    ).join('\n') || 'Nenhum equipamento adicional listado.';

    const text = `
DADOS DO ESTUDO DE PROTEÇÃO E SELETIVIDADE
==========================================

1. IDENTIFICAÇÃO DO PROJETO
---------------------------
Projeto: ${study.projeto}
Proprietário: ${study.proprietario}
Endereço: ${study.endereco}
CNPJ: ${study.cnpj_proprietario}
Cód. Instalação: ${study.codigo_instalacao || 'N/A'}

2. RESPONSÁVEL TÉCNICO
---------------------------
Engenheiro: ${study.rt_nome}
CREA/CFT: ${study.rt_crea}
ART Número: ${study.art_numero}

3. DADOS DO SISTEMA E CONCESSIONÁRIA
---------------------------
Concessionária: ${concessionaria?.nome || 'Não definida'} (${concessionaria?.estado})
Demanda Contratada: ${study.demanda_contratada} kW
Demanda Nova: ${study.demanda_nova} kW
Fator de Potência: ${study.fator_potencia}
Trafo Principal: ${study.trafo_kva} kVA | Z: ${study.trafo_z}% | ${study.trafo_v_prim}/${study.trafo_v_sec} V
Icc 3phi: ${study.icc_3f} A | Icc 1phi: ${study.icc_1f} A
Relação TC: ${study.tc_relacao} | Classe TC: ${study.tc_classe}

4. RELAÇÃO DE EQUIPAMENTOS
---------------------------
${equipamentosRef}

5. PARAMETRIZAÇÃO DO RELÉ (ANSI 50/51)
---------------------------
UNIDADE DE FASE (ANSI 50/51):
- Pickup (51): ${study.rele_fase.pickup} A
- Curva: ${study.rele_fase.curva}
- Dial / TMS: ${study.rele_fase.tms}
- Tempo Definido (51/50DT): ${study.rele_fase.i_def} A @ ${study.rele_fase.t_def} s
- Instantâneo (50): ${study.rele_fase.i_inst > 0 ? study.rele_fase.i_inst + ' A' : 'DESABILITADO'}

UNIDADE DE NEUTRO (ANSI 50/51N):
- Pickup (51N): ${study.rele_neutro.pickup} A
- Curva: ${study.rele_neutro.curva}
- Dial / TMS: ${study.rele_neutro.tms}
- Tempo Definido (51N/50NDT): ${study.rele_neutro.i_def} A @ ${study.rele_neutro.t_def} s
- Instantâneo (50N): ${study.rele_neutro.i_inst > 0 ? study.rele_neutro.i_inst + ' A' : 'DESABILITADO'}

Gerado em: ${new Date().toLocaleString('pt-BR')}
Versão do Sistema: 1.1.0 PRO
    `.trim();

    navigator.clipboard.writeText(text);
    alert('Relatório completo copiado para a área de transferência!');
  };

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950 z-[9999] flex flex-col items-center overflow-y-auto scrollbar-hide report-portal-wrapper">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: black !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
          }
          /* Esconde a aplicação principal e outros elementos */
          #root, .no-print, [class*="no-print"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }
          /* Garante que o wrapper do portal seja visível */
          .report-portal-wrapper {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            background-color: white !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          /* Remove backgrounds escuros e artifacts de UI */
          .report-portal-wrapper,
          .report-portal-wrapper div,
          .report-portal-wrapper section {
            background-color: white !important;
            background-image: none !important;
            box-shadow: none !important;
            border-color: #eee !important;
          }
          /* Override inline styles for preview scaling during print */
          .report-portal-wrapper div:not(#printable-report) {
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
            height: auto !important;
            position: static !important;
          }
          /* Ensure no-print items inside the portal are actually hidden */
          .report-portal-wrapper .no-print {
            display: none !important;
          }
          #printable-report {
            display: block !important;
            visibility: visible !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 5mm 15mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
            position: relative !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            overflow-x: hidden !important;
          }
          #printable-report table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          #printable-report * {
            max-width: 100% !important;
            overflow-wrap: break-word !important;
          }
          .report-section {
            page-break-inside: avoid;
            margin-bottom: 25px;
            width: 100% !important;
          }
          .page-break-before-always {
            page-break-before: always;
          }
          /* Forçar contraste preto para impressão */
          .text-zinc-600, .text-zinc-500, .text-zinc-400 {
            color: #333 !important;
          }
          .report-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .report-table th, .report-table td {
            border: 1px solid black !important;
            word-break: break-all !important;
            overflow-wrap: anywhere !important;
          }
          .report-table th {
            background: #e2e8f0 !important;
          }
          /* Ajuste do Gráfico para Impressão */
          .coord-chart-container {
            background-color: white !important;
            border: 1px solid #000 !important;
            max-width: 100% !important;
          }
          .coord-chart-container {
            background-color: white !important;
            border-color: #000 !important;
          }
          .coord-chart-container svg {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: 100% !important;
            background-color: white !important;
          }
          .coord-chart-container .label-axis {
            fill: #000 !important;
            font-weight: bold !important;
          }
          /* Linhas de grade e eixos do D3 no modo print */
          .coord-chart-container .grid line {
            stroke: #ddd !important;
          }
          .coord-chart-container .axis-label {
            fill: #000 !important;
            font-weight: bold !important;
          }
          .coord-chart-container .x-axis path, 
          .coord-chart-container .x-axis line,
          .coord-chart-container .y-axis path, 
          .coord-chart-container .y-axis line {
            stroke: #000 !important;
          }
          .coord-chart-container .tick text {
            fill: #000 !important;
          }
          /* Estilizar especificamente os fundos de labels */
          .coord-chart-container .label-bg {
            fill: white !important;
            stroke: #000 !important;
            stroke-width: 0.5px !important;
            opacity: 1 !important;
          }
          .coord-chart-container .icc-lines rect {
             fill: #eee !important;
             stroke: #000 !important;
             stroke-width: 1px !important;
             opacity: 0.8 !important;
          }
          .coord-chart-container .special-points text,
          .coord-chart-container .icc-lines text,
          .coord-chart-container .dynamic-labels text {
            fill: black !important;
            font-weight: bold !important;
          }
          /* Forçar curvas a serem mais visíveis no print */
          .coord-chart-container .curve-path {
             stroke-width: 2.5px !important;
          }
          .no-print {
            display: none !important;
          }
          .report-portal-wrapper * {
            -webkit-print-color-adjust: exact;
          }
        }
        
        #printable-report {
          padding: 5mm 25mm !important;
          background-color: white;
          color: black;
          font-size: 11px;
          line-height: 1.5;
        }

        .report-section-title {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 14px;
          border-left: 6px solid #000;
          padding-left: 12px;
          margin: 40px 0 20px 0;
          text-transform: uppercase;
          color: #000;
          display: block;
          clear: both;
          page-break-after: avoid;
        }

        .report-section {
          margin-bottom: 40px;
          display: block;
          clear: both;
          page-break-inside: avoid;
        }

        .calc-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          table-layout: fixed;
        }

        .calc-box {
          border: 1px solid #000;
          padding: 12px;
          background-color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          line-height: 1.6;
          vertical-align: top;
          width: 50%;
          word-break: break-all;
          overflow-wrap: anywhere;
        }

        .calc-formula {
          color: #2563eb;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }

        .report-table th, .report-table td {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          text-align: left;
          font-size: 9px;
        }

        .report-table th {
          background: #f3f4f6;
          font-weight: bold;
          text-transform: uppercase;
        }
      `}</style>
      
      {/* Controls - Top */}
      <div className="w-full bg-[#18181be6] backdrop-blur-md sticky top-0 z-[60] border-b border-[#27272a] p-4 mb-6 no-print">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-between items-center text-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#16a34a] rounded">
               <FileText className="w-5 h-5 text-black" />
             </div>
             <div>
               <h2 className="text-sm font-bold uppercase tracking-tight">Relatório Técnico - Seletividade</h2>
               <p className="text-[10px] text-[#a1a1aa] uppercase font-mono">{study.projeto}</p>
             </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto items-center">
            <p className="hidden lg:block text-[9px] text-[#71717a] max-w-[200px] text-right leading-tight italic">
              A função de imprimir somente funcionará na versão web: 
              <a href="https://coordenograma.vercel.app" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline block font-bold">coordenograma.vercel.app</a>
            </p>
            <button 
              onClick={handleCopyData}
              className="whitespace-nowrap flex items-center gap-2 px-6 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] font-bold text-xs rounded border border-[#3f3f46] transition-all flex-1 sm:flex-none justify-center"
            >
              <Copy className="w-4 h-4" /> COPIAR DADOS
            </button>
            <button 
              onClick={() => window.print()}
              className="whitespace-nowrap flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#22c55e] text-black font-bold text-xs rounded shadow-lg shadow-[#064e3b33] transition-all flex-1 sm:flex-none justify-center"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-[#a1a1aa] hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center px-0 sm:px-4 py-8">
        <div 
          style={{ 
            transform: `scale(${previewScale})`, 
            transformOrigin: 'top center',
            width: '210mm',
            marginBottom: `-${(1 - previewScale) * 100}%` 
          }}
          className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.8)] print:transform-none print:shadow-none print:m-0"
        >
          <div 
            ref={reportRef} 
            id="printable-report"
            className="p-[15mm] text-black bg-white print:p-0"
            style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
          >
            {concessionaria?.id === 'cemig_mg' ? (
              <CemigReport study={study} concessionaria={concessionaria} curves={curves} specialPoints={specialPoints} />
            ) : (
              <StandardReport study={study} concessionaria={concessionaria} curves={curves} specialPoints={specialPoints} />
            )}
          </div>
        </div>
      </div>

      {/* Final Controls - Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#18181be6] backdrop-blur-md border border-[#3f3f46] px-6 py-3 rounded-full shadow-2xl flex flex-col items-center gap-2 z-[60] no-print">
          <div className="flex gap-6 items-center">
            <button 
              onClick={handleCopyData}
              className="flex items-center gap-2 text-[#d4d4d8] hover:text-[#fafafa] text-xs font-bold uppercase transition-colors"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <div className="w-px h-4 bg-[#3f3f46]"></div>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 text-[#d4d4d8] hover:text-[#4ade80] text-xs font-bold uppercase transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <div className="w-px h-4 bg-[#3f3f46]"></div>
            <button 
              onClick={onClose}
              className="text-[#a1a1aa] hover:text-white text-xs font-bold uppercase transition-colors"
            >
              Fechar Relatório
            </button>
          </div>
          <p className="text-[8px] text-[#71717a] italic text-center w-max">
            Impressão/PDF via Web: <a href="https://coordenograma.vercel.app" target="_blank" rel="noopener noreferrer" className="text-green-500 font-bold hover:underline">coordenograma.vercel.app</a>
          </p>
      </div>

      {/* Spacer for bottom padding in browser view, hidden in print */}
      <div className="h-40 w-full no-print shrink-0"></div>
    </div>,
    document.body
  );
};
const StandardReport = ({ study, concessionaria, curves, specialPoints }: any) => {
  const In = study.trafo_kva / (Math.sqrt(3) * study.trafo_v_prim / 1000);
  const tcRatioStr = study.tc_relacao || '50/5';
  const InomPlanta = calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia);
  const tcValidation = validateTC(tcRatioStr, study.icc_3f, InomPlanta);
  const tcSaturationLevel = study.icc_3f / (parseFloat(tcRatioStr.split('/')[0]) || 1);

  return (
    <div className="font-sans leading-tight">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-black" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Estudo de Coordenação e Seletividade</h1>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Memorial Descritivo e de Cálculo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase">Data de Emissão</p>
          <p className="text-xs font-black">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Seção 1: Identificação */}
      <section className="report-section">
        <h3 className="report-section-title">1. Identificação do Projeto</h3>
        <table className="w-full text-[10px] border-collapse table-fixed">
          <tbody>
            <tr>
              <td className="w-1/4 py-1.5 border-b border-zinc-200 font-bold text-zinc-500 uppercase overflow-hidden whitespace-nowrap">Projeto:</td>
              <td className="py-1.5 border-b border-zinc-200 font-black uppercase text-zinc-900 break-words">{study.projeto}</td>
              <td className="w-1/4 py-1.5 border-b border-zinc-200 font-bold text-zinc-500 uppercase pl-4 overflow-hidden whitespace-nowrap">Responsável:</td>
              <td className="py-1.5 border-b border-zinc-200 font-black uppercase text-zinc-900 break-words">{study.rt_nome}</td>
            </tr>
            <tr>
              <td className="py-1.5 border-b border-zinc-200 font-bold text-zinc-500 uppercase overflow-hidden whitespace-nowrap">Cliente:</td>
              <td className="py-1.5 border-b border-zinc-200 font-black uppercase text-zinc-900 break-words">{study.proprietario}</td>
              <td className="py-1.5 border-b border-zinc-200 font-bold text-zinc-500 uppercase pl-4 overflow-hidden whitespace-nowrap">Concessionária:</td>
              <td className="py-1.5 border-b border-zinc-200 font-black uppercase text-zinc-900 break-words">{concessionaria?.nome}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Seção 2: Memória de Cálculo Operacional */}
      <section className="report-section">
        <h3 className="report-section-title">2. Memória de Cálculo do Sistema</h3>
        <table className="calc-table">
          <tbody>
            <tr>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">In_Trafo = S / (V_prim * √3)</p>
                <p>Calculado: {study.trafo_kva}kVA / ({(study.trafo_v_prim/1000).toFixed(2)}kV * 1.732)</p>
                <p className="font-bold mt-1 text-[11px]">Resultado: {In.toFixed(2)} A</p>
              </td>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">In_Planta = Demanda_kW / (V_prim * √3 * FP)</p>
                <p>Calculado: {study.demanda_nova}kW / ({(study.trafo_v_prim/1000).toFixed(2)}kV * 1.732 * {study.fator_potencia})</p>
                <p className="font-bold mt-1 text-[11px]">Resultado: {InomPlanta.toFixed(2)} A</p>
              </td>
            </tr>
            <tr className="h-4"><td></td></tr>
            <tr>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">Ponto ANSI (Limite Térmico/Mecânico)</p>
                <p>I_ansi = (100 / Z%) * In_trafo</p>
                <p>I_ansi = (100 / {study.trafo_z}) * {In.toFixed(2)} = {(In * (100 / study.trafo_z)).toFixed(2)}A</p>
              </td>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">Ponto Inrush (10x In @ 100ms)</p>
                <p>I_inrush = 10 * {In.toFixed(2)} A</p>
                <p className="font-bold mt-1 text-[11px]">Resultado: {(In * 10).toFixed(2)} A</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Seção 2.1: Relação de Equipamentos */}
      <section className="report-section">
        <h3 className="report-section-title">2.1. Relação de Equipamentos Instalados</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>EQUIPAMENTO</th>
              <th>POTÊNCIA</th>
              <th>QTD</th>
              <th>DETALHES</th>
            </tr>
          </thead>
          <tbody>
            {study.equipamentos.length > 0 ? study.equipamentos.map((eq: any, idx: number) => (
              <tr key={idx}>
                <td className="font-bold">{eq.tipo}</td>
                <td>{eq.kva} {eq.tipo === 'Motor' ? 'kW' : 'kVA'}</td>
                <td>{eq.qtd}</td>
                <td className="text-[8px]">
                  {eq.tipo === 'Transformador' && `Z: ${eq.z}% | ${eq.v_prim/1000}/${eq.v_sec}kV`}
                  {eq.tipo === 'Motor' && `Partida Direta/Estrela`}
                  {!['Transformador', 'Motor'].includes(eq.tipo) && 'Carga balanceada'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-2 text-zinc-400 italic font-mono text-[9px]">
                  Nenhum equipamento adicional declarado além do transformador principal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="page-break-after-auto"></div>

      {/* Seção 3: Coordenograma */}
      <section className="report-section page-break-before-always">
        <h3 className="report-section-title">3. Coordenograma de Proteção</h3>
        <div className="border-2 border-black h-[600px] w-full bg-white flex items-center justify-center p-2">
           <div className="w-full h-full">
              <CoordChart 
                curves={curves} 
                icc_3f={study.icc_3f} 
                icc_1f={study.icc_1f} 
                specialPoints={specialPoints} 
              />
           </div>
        </div>
        <p className="text-[7px] text-zinc-400 mt-2 uppercase text-center font-mono italic">Gráfico decorrente das configurações de pickup e TMS informados na seção 4.</p>
      </section>

      {/* Seção 4: Ajustes de Proteção */}
      <section className="mb-6">
        <h3 className="report-section-title">4. Tabela de Ajustes (ANSI 50/51)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>ELEMENTO</th>
              <th>FUNÇÃO</th>
              <th>PICKUP (A)</th>
              <th>CURVA</th>
              <th>TMS</th>
              <th>INST (A)</th>
              <th>REL. TC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">FASE</td>
              <td>50/51</td>
              <td className="font-mono">{study.rele_fase.pickup}</td>
              <td className="uppercase">{study.rele_fase.curva.replace('_', ' ')}</td>
              <td className="font-mono">{study.rele_fase.tms}</td>
              <td className="font-mono">{study.rele_fase.i_inst || '---'}</td>
              <td className="font-mono">{study.tc_relacao}</td>
            </tr>
            <tr>
              <td className="font-bold">NEUTRO</td>
              <td>50/51N</td>
              <td className="font-mono">{study.rele_neutro.pickup}</td>
              <td className="uppercase">{study.rele_neutro.curva.replace('_', ' ')}</td>
              <td className="font-mono">{study.rele_neutro.tms}</td>
              <td className="font-mono">{study.rele_neutro.i_inst || '---'}</td>
              <td className="font-mono">{study.tc_relacao}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Seção 5: Verificação de Saturação e Adequação */}
      <section className="report-section">
        <h3 className="report-section-title">5. Verificação de Conexão e Saturação (TC)</h3>
        <table className="calc-table">
          <tbody>
            <tr>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">Critério de Saturação</p>
                <p>Fator (F) = Icc_max / I_tc_prim</p>
                <p>F = {study.icc_3f}A / {(study.tc_relacao.split('/')[0])}A = {tcSaturationLevel.toFixed(2)}x</p>
                <p className={tcSaturationLevel <= 20 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {tcSaturationLevel <= 20 ? 'Status: Conforme (F < 20)' : 'Status: Risco de Saturação (F > 20)'}
                </p>
              </td>
              <td className="calc-box w-1/2">
                <p className="calc-formula text-[10px]">Critério de Carga</p>
                <p>I_tc_prim ({study.tc_relacao.split('/')[0]}A) &gt; In_Planta ({InomPlanta.toFixed(1)}A)</p>
                <p className={parseFloat(study.tc_relacao.split('/')[0]) >= InomPlanta ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                   {parseFloat(study.tc_relacao.split('/')[0]) >= InomPlanta ? 'Status: Conforme' : 'Status: Subdimensionado'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Parecer Técnico */}
      <section className="mb-6 pt-4 border-t-2 border-black">
        <h3 className="report-section-title">6. Parecer Técnico Final</h3>
        <div className="bg-zinc-50 p-4 border border-zinc-200 text-[10px] space-y-2 uppercase font-mono italic">
           {getTechnicalSuggestions(study).length === 0 ? (
             <p className="text-green-800">O sistema de proteção dimensionado atende integralmente às exigências normativas da ABNT NBR 14039. As curvas de proteção garantem a integridade dos equipamentos e a seletividade com a concessionária.</p>
           ) : (
             getTechnicalSuggestions(study).map((s, i) => (
                <p key={i} className="text-red-800">• {s}</p>
             ))
           )}
        </div>
      </section>

      {/* Assinaturas */}
      <div className="mt-12 flex justify-between px-12">
        <div className="text-center">
          <div className="w-[180px] border-t border-black mb-1"></div>
          <p className="text-[9px] font-black uppercase">{study.rt_nome}</p>
          <p className="text-[7px] text-zinc-400">Responsável Técnico / CREA</p>
        </div>
        <div className="text-center">
          <div className="w-[180px] border-t border-black mb-1"></div>
          <p className="text-[9px] font-black uppercase">Responsável Legal</p>
          <p className="text-[7px] text-zinc-400 font-mono">{study.cnpj_proprietario}</p>
        </div>
      </div>
    </div>
  );
};

const CemigReport = ({ study, curves, specialPoints }: any) => {
  const In = study.trafo_kva / (Math.sqrt(3) * study.trafo_v_prim / 1000);
  const InomPlant = (study.demanda_nova) / (study.trafo_v_prim * Math.sqrt(3) * study.fator_potencia / 1000);
  const tcRatioStr = study.tc_relacao || '50/5';
  const tcSaturationLevel = study.icc_3f / (parseFloat(tcRatioStr.split('/')[0]) || 1);

  return (
    <div className="text-black font-sans leading-tight">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
         <div className="text-right w-full">
           <h1 className="text-lg font-extrabold uppercase">Memorial de Proteção - Cemig MG</h1>
           <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Atendimento à Norma Técnica ND 5.3</p>
         </div>
      </div>

      <section className="report-section">
        <h3 className="report-section-title">1. Dados da Unidade Consumidora</h3>
        <table className="w-full text-[10px] border-collapse bg-zinc-50/50 table-fixed">
          <tbody>
            <tr>
              <td className="p-3 border border-zinc-200 w-1/2 align-top overflow-hidden">
                <div className="space-y-1.5 break-words">
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">Projeto:</strong> {study.projeto}</p>
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">Proprietário:</strong> {study.proprietario}</p>
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">Logradouro:</strong> {study.endereco}</p>
                </div>
              </td>
              <td className="p-3 border border-zinc-200 w-1/2 align-top overflow-hidden">
                <div className="space-y-1.5 break-words">
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">CNPJ/CPF:</strong> {study.cnpj_proprietario}</p>
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">Responsável Técnico:</strong> {study.rt_nome}</p>
                  <p><strong className="text-zinc-500 uppercase text-[7px] block">Demanda:</strong> {study.demanda_nova} kW</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Seção 2: Memória de Cálculo e Dimensionamento */}
      <section className="report-section">
        <h3 className="report-section-title">2. Memória de Cálculo e Dimensionamento</h3>
        <table className="calc-table">
          <tbody>
            <tr>
              <td className="calc-box w-1/2">
                 <p className="calc-formula text-[8px] uppercase">In_Trafo (Corrente Nominal Trafos)</p>
                 <p className="text-[10px]">I = {study.trafo_kva}kVA / ({(study.trafo_v_prim/1000).toFixed(2)}kV * 1.732) = {In.toFixed(2)}A</p>
              </td>
              <td className="calc-box w-1/2">
                 <p className="calc-formula text-[8px] uppercase">In_Carga (Corrente Nominal Planta)</p>
                 <p className="text-[10px]">I = {study.demanda_nova}kW / ({(study.trafo_v_prim/1000).toFixed(2)}kV * 1.732 * {study.fator_potencia}) = {InomPlant.toFixed(2)}A</p>
              </td>
            </tr>
            <tr className="h-4"><td></td></tr>
            <tr>
              <td colSpan={2} className="calc-box">
                 <p className="calc-formula text-[8px] uppercase">Relação de TC (Transformador de Corrente)</p>
                 <p className="text-[10px]">RTC Escolhida: {study.tc_relacao} (Classe {study.tc_classe})</p>
                 <p className="text-[10px]">Fator de Saturação (F): {study.icc_3f}A / {(study.tc_relacao.split('/')[0])}A = {tcSaturationLevel.toFixed(2)}x</p>
                 <p className={tcSaturationLevel <= 20 ? 'text-green-700 font-bold text-[10px]' : 'text-red-700 font-bold text-[10px]'}>
                    {tcSaturationLevel <= 20 ? 'STATUS: CONFORME (F < 20)' : 'STATUS: NÃO CONFORME - RISCO DE SATURAÇÃO'}
                 </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Relação de Equipamentos */}
      <section className="report-section">
        <h3 className="report-section-title">2.1. Relação de Equipamentos Instalados</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>EQUIPAMENTO</th>
              <th>POTÊNCIA</th>
              <th>QTD</th>
              <th>DETALHES</th>
            </tr>
          </thead>
          <tbody>
            {study.equipamentos.length > 0 ? study.equipamentos.map((eq: any, idx: number) => (
              <tr key={idx}>
                <td className="font-bold">{eq.tipo}</td>
                <td>{eq.kva} {eq.tipo === 'Motor' ? 'kW' : 'kVA'}</td>
                <td>{eq.qtd}</td>
                <td className="text-[8px]">
                  {eq.tipo === 'Transformador' && `Z: ${eq.z}% | ${eq.v_prim/1000}/${eq.v_sec}kV`}
                  {eq.tipo === 'Motor' && `Inrush Estimado: ${(eq.kva / (study.trafo_v_prim * Math.sqrt(3) * 0.85 * 0.9 / 1000) * 6).toFixed(1)}A`}
                  {!['Transformador', 'Motor'].includes(eq.tipo) && 'Carga geral de baixa tensão'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-2 text-zinc-400 italic font-mono text-[9px]">
                  Nenhum equipamento adicional declarado além do transformador principal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Seção 3: Coordenograma */}
      <section className="report-section page-break-before-always">
        <h3 className="report-section-title">3. Coordenograma de Seletividade</h3>
        <div className="border-2 border-black h-[600px] w-full bg-white flex items-center justify-center p-2">
           <div className="w-full h-full">
              <CoordChart curves={curves} icc_3f={study.icc_3f} icc_1f={study.icc_1f} specialPoints={specialPoints} />
           </div>
        </div>
        <p className="text-[7px] text-zinc-400 mt-2 uppercase text-center font-mono italic">Curvas de proteção conforme parâmetros técnicos da ND 5.3.</p>
      </section>

      <section className="mb-4">
        <h3 className="report-section-title">4. Ajustes do Relé de Proteção (ANSI 50/51)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>PARÂMETRO</th>
              <th>FASE (51/50)</th>
              <th>NEUTRO (51/50N)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold uppercase text-[7px]">Pickup (A)</td>
              <td className="font-mono">{study.rele_fase.pickup}</td>
              <td className="font-mono">{study.rele_neutro.pickup}</td>
            </tr>
            <tr>
              <td className="font-bold uppercase text-[7px]">TMS / Dial</td>
              <td className="font-mono">{study.rele_fase.tms}</td>
              <td className="font-mono">{study.rele_neutro.tms}</td>
            </tr>
            <tr>
              <td className="font-bold uppercase text-[7px]">Curva</td>
              <td className="uppercase">{study.rele_fase.curva}</td>
              <td className="uppercase">{study.rele_neutro.curva}</td>
            </tr>
            <tr>
               <td className="font-bold uppercase text-[7px]">Instantâneo (A)</td>
               <td className="font-mono">{study.rele_fase.i_inst || '---'}</td>
               <td className="font-mono">{study.rele_neutro.i_inst || '---'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-4">
        <h3 className="report-section-title">5. Análise de Seletividade e Parecer</h3>
        <div className="p-3 border border-zinc-200 rounded text-[8px] space-y-1 bg-zinc-50 font-mono">
           {getTechnicalSuggestions(study).length === 0 ? (
             <p className="text-green-700 font-bold uppercase italic">Ajustes verificados em conformidade com as exigências da norma técnica ND 5.3 e ABNT NBR 14039.</p>
           ) : (
             getTechnicalSuggestions(study).map((sug, idx) => (
                <p key={idx} className="uppercase leading-tight">• {sug}</p>
             ))
           )}
        </div>
      </section>

      <section className="mt-8">
        <div className="grid grid-cols-2 gap-12 text-[9px] text-center pt-8">
           <div className="border-t border-zinc-400 pt-2">
             <p className="font-bold uppercase">{study.rt_nome}</p>
             <p className="text-zinc-400 uppercase text-[7px]">Engenheiro Responsável / CREA</p>
           </div>
           <div className="border-t border-zinc-400 pt-2">
             <p className="font-bold uppercase">Cliente / Representante</p>
             <p className="text-zinc-400 uppercase text-[7px]">Aceite Técnico</p>
           </div>
        </div>
      </section>
    </div>
  );
};
