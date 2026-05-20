import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CoordChart } from './CoordChart';
import { Copy, Printer, X, FileText, Shield, Info, Zap, AlertTriangle, FileDown } from 'lucide-react';
import { Concessionaria } from '../constants/concessionarias';
import { getTechnicalSuggestions, calculateInominal, calculateInPlant, validateTC, calculateTime, calculateActualRelayTime, CURVE_CONSTANTS, CurveType } from '../lib/protection-utils';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

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

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Pequeno delay para garantir que tudo está renderizado
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const reportElement = reportRef.current;
      if (!reportElement) return;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const leftMargin = 22; // Margem esquerda ampliada
      const rightMargin = 12; 
      const vMargin = 15; 
      const contentWidth = pageWidth - leftMargin - rightMargin;
      const pageInnerHeight = pageHeight - (2 * vMargin);

      // Fator de escala para garantir que o relatório longo seja capturado sem erros de memória
      const dataUrl = await toPng(reportElement, {
        pixelRatio: 1.5, // 1.5 é um bom equilíbrio entre qualidade e tamanho de arquivo
        backgroundColor: '#ffffff',
        filter: (node: any) => {
          if (node.classList && (node.classList.contains('no-print') || node.classList.contains('report-portal-wrapper'))) {
            return false;
          }
          return true;
        },
        style: {
          transform: 'none',
          margin: '0',
          padding: '0',
          width: `${reportElement.offsetWidth}px`, // Mantém a largura original para não distorcer
        }
      });

      if (!dataUrl) throw new Error("Falha ao capturar imagem do relatório");

      const imgProps = pdf.getImageProperties(dataUrl);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;
      
      let heightLeft = contentHeight;
      let yOffset = 0;

      while (heightLeft > 0) {
        // Clipping region: Define onde o PDF pode desenhar nesta página
        pdf.saveGraphicsState();
        pdf.rect(leftMargin, vMargin, contentWidth, pageInnerHeight);
        pdf.clip();

        // Adiciona a imagem deslocada: o yOffset controla qual parte do relatório aparece
        pdf.addImage(dataUrl, 'PNG', leftMargin, vMargin + yOffset, contentWidth, contentHeight, undefined, 'FAST');
        
        pdf.restoreGraphicsState();
        
        heightLeft -= pageInnerHeight;
        
        if (heightLeft > 0) {
          pdf.addPage();
          yOffset -= pageInnerHeight;
        }
      }

      pdf.save(`relatorio-seletividade-${study.projeto.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente usar a função Imprimir (Salvar como PDF) do navegador.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
        /* Estilo base do gráfico no relatório (tela e impressão) */
        .coord-chart-container {
          background-color: white !important;
          border: 2px solid #000 !important;
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 4 / 3 !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          
          /* Variáveis de Cores de Contraste para Relatório */
          --grid-major: rgba(0, 0, 0, 0.2) !important;
          --grid-minor: rgba(0, 0, 0, 0.05) !important;
          --chart-text: #000 !important;
          --chart-axis-label: #000 !important;
          --label-bg: #fff !important;
          --label-stroke: #000 !important;
          --special-point-text: #000 !important;
        }

        .coord-chart-container svg {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          background-color: white !important;
        }

        .coord-chart-container svg g.x-axis text,
        .coord-chart-container svg g.y-axis text {
          fill: #000 !important;
          font-weight: bold !important;
          font-size: 10px !important;
        }

        .coord-chart-container .label-axis {
          fill: #000 !important;
          font-weight: bold !important;
        }

        .coord-chart-container .curve-path {
          stroke-width: 2px !important;
        }

        /* Fix for html2canvas oklch unsupported error */
        #printable-report, #printable-report * {
          --color-zinc-950: #09090b !important;
          --color-zinc-900: #18181b !important;
          --color-zinc-800: #27272a !important;
          --color-zinc-700: #3f3f46 !important;
          --color-zinc-600: #52525b !important;
          --color-zinc-500: #71717a !important;
          --color-zinc-400: #a1a1aa !important;
          --color-zinc-300: #d4d4d8 !important;
          --color-zinc-200: #e4e4e7 !important;
          --color-zinc-100: #f4f4f5 !important;
          --color-zinc-50: #fafafa !important;
          --color-black: #000000 !important;
          --color-white: #ffffff !important;
          --color-green-500: #22c55e !important;
          --color-green-600: #16a34a !important;
          --color-red-500: #ef4444 !important;
          --color-amber-500: #f59e0b !important;
        }

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
              border: 2px solid #000 !important;
              max-width: 100% !important;
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 4 / 3 !important;
              padding: 0 !important;
              margin: 20px 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              display: block !important;
              visibility: visible !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .coord-chart-container svg {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              height: 100% !important;
              min-height: 500px !important;
              background-color: white !important;
            }
            /* Garantir que as linhas e textos internos apareçam */
            .coord-chart-container svg g.x-axis line,
            .coord-chart-container svg g.y-axis line {
              stroke: #999 !important;
              stroke-opacity: 1 !important;
              stroke-width: 0.8px !important;
            }
            .coord-chart-container svg g.x-axis text,
            .coord-chart-container svg g.y-axis text {
              fill: #000 !important;
              stroke: none !important;
              font-weight: 900 !important;
              font-size: 11px !important;
            }
            .coord-chart-container .label-axis {
              fill: #000 !important;
              font-weight: 900 !important;
              font-size: 14px !important;
            }
            .coord-chart-container .label-bg {
              fill: white !important;
              stroke: black !important;
              stroke-width: 1px !important;
            }
            .coord-chart-container text {
              fill: black !important;
            }
            /* Manter as cores das curvas no print */
            .curve-path {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
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
      <div className="w-full bg-[#18181be6] backdrop-blur-md sticky top-0 z-[60] border-b border-[#27272a] p-3 sm:p-4 no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center text-white">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="p-1.5 sm:p-2 bg-[#16a34a] rounded shrink-0">
               <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
             </div>
             <div className="min-w-0 flex-1">
               <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight truncate">Relatório Técnico</h2>
               <p className="text-[9px] sm:text-[10px] text-[#a1a1aa] uppercase font-mono truncate">{study.projeto}</p>
             </div>
             <div className="md:hidden">
                <button 
                  onClick={onClose}
                  className="p-1 text-[#a1a1aa] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
          </div>
          <div className="grid grid-cols-3 md:flex gap-1.5 md:gap-4 w-full md:w-auto items-center">
            <button 
              onClick={handleCopyData}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-6 sm:py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] font-bold text-[9px] sm:text-xs rounded border border-[#3f3f46] transition-all"
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="truncate">COPIAR</span>
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 py-2 sm:px-6 sm:py-2.5 bg-[#4b5563] hover:bg-[#374151] text-white font-bold text-[9px] sm:text-xs rounded border border-[#6b7280] transition-all ${isGeneratingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGeneratingPdf ? (
                <span className="truncate">GERANDO...</span>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="truncate">PDF</span>
                </>
              )}
            </button>
            <button 
              onClick={() => window.print()}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 py-2 sm:px-6 sm:py-2.5 bg-[#16a34a] hover:bg-[#22c55e] text-black font-bold text-[9px] sm:text-xs rounded shadow-lg transition-all"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="truncate">IMPRIMIR</span>
            </button>
            <button 
              onClick={onClose}
              className="hidden md:flex p-2 text-[#a1a1aa] hover:text-white transition-colors"
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
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#18181be6] backdrop-blur-md border border-[#3f3f46] px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 sm:gap-6 z-[60] no-print max-w-[95vw]">
          <button 
            onClick={handleCopyData}
            className="flex flex-col items-center gap-1 text-[#d4d4d8] hover:text-[#fafafa] transition-colors"
          >
            <Copy className="w-4 h-4 sm:w-4 sm:h-4" />
            <span className="text-[8px] sm:text-[10px] font-bold uppercase">Copiar</span>
          </button>
          <div className="w-px h-6 bg-[#3f3f46]"></div>
          <button 
            onClick={handleExportPDF}
            disabled={isGeneratingPdf}
            className={`flex flex-col items-center gap-1 text-[#d4d4d8] hover:text-[#fafafa] transition-colors ${isGeneratingPdf ? 'opacity-50' : ''}`}
          >
            <FileDown className="w-4 h-4 sm:w-4 sm:h-4" />
            <span className="text-[8px] sm:text-[10px] font-bold uppercase">{isGeneratingPdf ? '...' : 'PDF'}</span>
          </button>
          <div className="w-px h-6 bg-[#3f3f46]"></div>
          <button 
            onClick={() => window.print()}
            className="flex flex-col items-center gap-1 text-[#d4d4d8] hover:text-[#4ade80] transition-colors"
          >
            <Printer className="w-4 h-4 sm:w-4 sm:h-4" />
            <span className="text-[8px] sm:text-[10px] font-bold uppercase">Imprimir</span>
          </button>
          <div className="w-px h-6 bg-[#3f3f46]"></div>
          <button 
            onClick={onClose}
            className="flex flex-col items-center gap-1 text-[#a1a1aa] hover:text-white transition-colors"
          >
            <X className="w-4 h-4 sm:w-4 sm:h-4" />
            <span className="text-[8px] sm:text-[10px] font-bold uppercase">Sair</span>
          </button>
      </div>

      {/* Spacer for bottom padding in browser view, hidden in print */}
      <div className="h-40 w-full no-print shrink-0"></div>
    </div>,
    document.body
  );
};
const getCurveParams = (curveType: string) => {
  if (curveType === 'CUSTOM') {
    return { name: 'Customizada', A: 0.14, B: 0, P: 0.02, isIEEE: false };
  }
  const isIEEE = curveType.startsWith('ANSI');
  const constants = CURVE_CONSTANTS[curveType as Exclude<CurveType, 'CUSTOM'>];
  return {
    name: curveType.replace('IEC_', 'IEC ').replace('ANSI_', 'ANSI/IEEE ').replace('_', ' '),
    A: constants?.A || 0.14,
    B: constants?.B || 0,
    P: constants?.P || 0.02,
    isIEEE
  };
};

const StandardReport = ({ study, concessionaria, curves, specialPoints }: any) => {
  const In = (study.trafo_kva * (study.trafo_qtd || 1)) / (Math.sqrt(3) * study.trafo_v_prim / 1000);
  const tcRatioStr = study.tc_relacao || '50/5';
  const InomPlanta = calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia);
  const tcValidation = validateTC(tcRatioStr, study.icc_3f, InomPlanta);
  const tcSaturationLevel = study.icc_3f / (parseFloat(tcRatioStr.split('/')[0]) || 1);

  const tcPrimary = parseFloat(tcRatioStr.split('/')[0]) || 50;
  const tcSecondary = parseFloat(tcRatioStr.split('/')[1]) || 5;
  const tcRatio = tcPrimary / tcSecondary;
  
  const mainTrafoTotalKva = study.trafo_kva * (study.trafo_qtd || 1);
  const v_prim_kv = study.trafo_v_prim / 1000;
  
  // Inrush Multiplier
  const inrushMult = study.trafo_kva <= 300 ? 12 : 10;
  const inrushI = In * inrushMult;
  
  // ANSI Short Circuit Current
  const I_sc_ansi = (100 / study.trafo_z) * In;
  
  // Protection Curve Info
  const faseCurve = getCurveParams(study.rele_fase.curva);
  const neutroCurve = getCurveParams(study.rele_neutro.curva);
  
  // Fase faults trip times
  const ipFase = study.rele_fase.pickup;
  const tmsFase = study.rele_fase.tms;
  const curveTypeFase = study.rele_fase.curva;
  
  const tripTimeFaseCurto = calculateActualRelayTime(
    study.icc_3f,
    ipFase,
    tmsFase,
    curveTypeFase,
    undefined,
    study.rele_fase.i_def,
    study.rele_fase.t_def,
    study.rele_fase.i_inst
  );
  
  // Neutro faults trip times
  const ipNeutro = study.rele_neutro.pickup;
  const tmsNeutro = study.rele_neutro.tms;
  const curveTypeNeutro = study.rele_neutro.curva;
  
  const tripTimeNeutroCurto = calculateActualRelayTime(
    study.icc_1f,
    ipNeutro,
    tmsNeutro,
    curveTypeNeutro,
    undefined,
    study.rele_neutro.i_def,
    study.rele_neutro.t_def,
    study.rele_neutro.i_inst
  );

  const getTripTimeTableFase = () => {
    const multipliers = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0];
    return multipliers.map(m => {
      const current = ipFase * m;
      const time = calculateActualRelayTime(
        current,
        ipFase,
        tmsFase,
        curveTypeFase,
        undefined,
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      return { multiplier: m, current, time };
    });
  };

  const getTripTimeTableNeutro = () => {
    const multipliers = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0];
    return multipliers.map(m => {
      const current = ipNeutro * m;
      const time = calculateActualRelayTime(
        current,
        ipNeutro,
        tmsNeutro,
        curveTypeNeutro,
        undefined,
        study.rele_neutro.i_def,
        study.rele_neutro.t_def,
        study.rele_neutro.i_inst
      );
      return { multiplier: m, current, time };
    });
  };

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

      {/* Seção 2: Memória de Cálculo Operacional Detalhada */}
      <section className="report-section">
        <h3 className="report-section-title">2. Memória de Cálculo do Sistema</h3>
        
        {/* Subsection 2.1 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.1. Dimensionamento das Correntes Nominais</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Corrente Nominal dos Transformadores (In_trafo)</p>
              <div className="text-[9px] font-mono text-zinc-800 mt-1 leading-relaxed">
                <p className="font-bold text-zinc-900">Fórmula:</p>
                <p>I_n_trafo = S_total / (V_prim × √3)</p>
                <p className="font-bold text-zinc-900 mt-1.5">Aplicação:</p>
                <p>I_n_trafo = {mainTrafoTotalKva} kVA / ({v_prim_kv.toFixed(2)} kV × 1.732)</p>
                <p className="font-bold text-zinc-900 mt-1">Resultado: {In.toFixed(2)} A</p>
              </div>
            </div>
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Corrente Nominal da Planta / Demanda (In_planta)</p>
              <div className="text-[9px] font-mono text-zinc-800 mt-1 leading-relaxed">
                <p className="font-bold text-zinc-900">Fórmula:</p>
                <p>I_n_planta = Demanda_kW / (V_prim × √3 × FP)</p>
                <p className="font-bold text-zinc-900 mt-1.5">Aplicação:</p>
                <p>I_n_planta = {study.demanda_nova} kW / ({v_prim_kv.toFixed(2)} kV × 1.732 × {study.fator_potencia})</p>
                <p className="font-bold text-zinc-900 mt-1">Resultado: {InomPlanta.toFixed(2)} A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.2 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.2. Dimensionamento e Saturação do TC (Transformador de Corrente)</h4>
          <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Dados do TC de Proteção</p>
                <ul className="list-disc list-inside mt-1 font-mono text-zinc-800 space-y-0.5">
                  <li>Relação Mínima: {study.tc_relacao} (RTC = {tcRatio.toFixed(1)})</li>
                  <li>Classe de Exatidão: {study.tc_classe || 'Não especificada'}</li>
                  <li>Capacidade de Carga em Regime: {tcPrimary} A &ge; {InomPlanta.toFixed(2)} A</li>
                  <li className={tcPrimary >= InomPlanta ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    Status de Carga: {tcPrimary >= InomPlanta ? "CONFORME" : "SUBDIMENSIONADO"}
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Cálculo de Saturação (Fator Limite F_s)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p>Fórmula: F_s = Icc_max_3f / I_tc_prim</p>
                  <p>F_s = {study.icc_3f} A / {tcPrimary} A = {tcSaturationLevel.toFixed(2)}</p>
                  <p className={tcSaturationLevel <= 20 ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    Status Saturação: {tcSaturationLevel <= 20 ? "CONFORME (F_s ≤ 20)" : "RISCO SATURAÇÃO (F_s > 20)"}
                  </p>
                  <p className="text-[7px] text-zinc-400 font-mono italic leading-tight">O fator F_s deve ser inferior a 20 para garantir a reprodução linear do sinal na atuação rápida (ANSI 50).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.3 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.3. Pontos Singulares do Transformador (ANSI e Inrush)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Ponto de Magnetização Máxima (Inrush)</p>
              <div className="font-mono text-zinc-800 mt-1 space-y-0.5">
                <p className="font-bold underline">Critério Técnico:</p>
                <p>Para S &le; 300kVA: I_inrush = 12 × I_n_trafo</p>
                <p>Para S &gt; 300kVA: I_inrush = 10 × I_n_trafo</p>
                <p className="font-bold mt-1">Aplicação:</p>
                <p>I_inrush = {inrushMult} × {In.toFixed(2)} A = {inrushI.toFixed(2)} A (t = 0.1s)</p>
                <p className="text-[7px] text-zinc-400 italic mt-0.5">O ajuste da fase temporizada e instantânea deve passar à direita deste ponto singular para evitar desligamentos indevidos durante o ligamento frio.</p>
              </div>
            </div>
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Curva de Suportabilidade ANSI (NBR 5356)</p>
              <div className="font-mono text-zinc-800 mt-1 space-y-0.5">
                <p className="font-bold underline">Cálculo de Curto Terminado:</p>
                <p>I_sc_trafo = (100 / Z%) × I_n_trafo</p>
                <p>I_sc_trafo = (100 / {study.trafo_z}%) × {In.toFixed(2)}  A = {I_sc_ansi.toFixed(2)} A</p>
                <p className="font-bold mt-1">Pontos de Coordenograma ANSI:</p>
                {mainTrafoTotalKva <= 500 ? (
                  <p>• Ponto ANSI Categoria I: {I_sc_ansi.toFixed(2)} A @ 2.0s (Térmico/Mecânico)</p>
                ) : (
                  <div className="space-y-0.5">
                    <p>• Ponto ANSI 2.0s (Térmico): {I_sc_ansi.toFixed(2)} A</p>
                    <p>• Ponto ANSI 4.08s: {(I_sc_ansi * 0.7).toFixed(2)} A</p>
                    <p>• Ponto ANSI 10.0s (Sobrecarga): {(I_sc_ansi * 0.45).toFixed(2)} A</p>
                    <p>• Limite Mecânico 0.1s: {(I_sc_ansi * 0.8).toFixed(2)} A</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.4 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.4. Cálculos do Relé de Proteção (ANSI 50/51/50D)</h4>
          <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed mb-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Equações de Tempo Inverso</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p className="font-bold underline text-blue-800 text-[8px]">IEC 60255:</p>
                  <p className="italic">t = TMS × [ A / ( (I / Ip)^P - 1 ) ]</p>
                  <p className="font-bold underline text-blue-800 mt-1 text-[8px]">IEEE C37.112 (ANSI):</p>
                  <p className="italic">t = TMS × [ A / ( (I / Ip)^P - 1 ) + B ]</p>
                </div>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Parâmetros das Curvas de Proteção Selecionadas</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p><strong className="text-zinc-600 block text-[7px] uppercase leading-none mt-1">Fase:</strong> {faseCurve.name} (A={faseCurve.A}, B={faseCurve.B}, P={faseCurve.P})</p>
                  <p><strong className="text-zinc-600 block text-[7px] uppercase leading-none mt-1">Neutro:</strong> {neutroCurve.name} (A={neutroCurve.A}, B={neutroCurve.B}, P={neutroCurve.P})</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-200/60 font-sans">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Simulação de Falta Crítica de Fase (50/51/50D)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1 leading-snug">
                  <p>• Corrente Curto Fase: Icc_3f = {study.icc_3f} A</p>
                  <p>• Pickup Fase (Ip): {ipFase} A ({(ipFase / In).toFixed(2)}x In_trafo)</p>
                  <p>• Multiplicador de Partida (M): {(study.icc_3f / ipFase).toFixed(2)}</p>
                  <p>• Tempo do Estágio Temporizado (51): {calculateTime(study.icc_3f, ipFase, tmsFase, curveTypeFase).toFixed(3)} s</p>
                  {study.rele_fase.i_def > 0 && study.icc_3f >= study.rele_fase.i_def && (
                    <p>• Restrição Tempo Definido (50D): {study.rele_fase.t_def.toFixed(3)} s (I &ge; {study.rele_fase.i_def}A)</p>
                  )}
                  {study.rele_fase.i_inst > 0 && study.icc_3f >= study.rele_fase.i_inst && (
                    <p>• Interceptação Instantânea (50): 0.015 s (I &ge; {study.rele_fase.i_inst}A)</p>
                  )}
                  <p className="font-bold underline text-zinc-900 mt-1">Tempo Total de Atuação da Unidade de Fase: {tripTimeFaseCurto.toFixed(3)} s</p>
                </div>
              </div>
              
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Simulação de Falta Crítica de Neutro (50N/51N/50DN)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1 leading-snug">
                  <p>• Corrente Curto Monofásico: Icc_1f = {study.icc_1f} A</p>
                  <p>• Pickup Neutro (Ip): {ipNeutro} A ({(ipNeutro / In).toFixed(2)}x In_trafo)</p>
                  <p>• Multiplicador de Partida (M): {(study.icc_1f / ipNeutro).toFixed(2)}</p>
                  <p>• Tempo do Estágio Temporizado (51N): {calculateTime(study.icc_1f, ipNeutro, tmsNeutro, curveTypeNeutro).toFixed(3)} s</p>
                  {study.rele_neutro.i_def > 0 && study.icc_1f >= study.rele_neutro.i_def && (
                    <p>• Restrição Tempo Definido (50DN): {study.rele_neutro.t_def.toFixed(3)} s (I &ge; {study.rele_neutro.i_def}A)</p>
                  )}
                  {study.rele_neutro.i_inst > 0 && study.icc_1f >= study.rele_neutro.i_inst && (
                    <p>• Interceptação Instantânea (50N): 0.015 s (I &ge; {study.rele_neutro.i_inst}A)</p>
                  )}
                  <p className="font-bold underline text-zinc-900 mt-1">Tempo Total de Atuação da Unidade de Neutro: {tripTimeNeutroCurto.toFixed(3)} s</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">Tabela de Tempos Analíticos (FASE)</p>
              <table className="report-table text-[9px] text-zinc-800 font-mono w-full">
                <thead>
                  <tr className="bg-zinc-100 text-[8px] font-sans">
                    <th className="py-0.5 text-center px-1">Múltiplo (x Ip)</th>
                    <th className="py-0.5 text-center px-1">Corrente (A)</th>
                    <th className="py-0.5 text-center px-1">Tempo de Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {getTripTimeTableFase().map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-center py-0.5 px-1">{row.multiplier.toFixed(1)}x</td>
                      <td className="text-center py-0.5 px-1">{row.current.toFixed(1)} A</td>
                      <td className="text-center py-0.5 px-1 font-bold">{row.time >= 1000 ? 'Muito longo' : `${row.time.toFixed(3)} s`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">Tabela de Tempos Analíticos (NEUTRO)</p>
              <table className="report-table text-[9px] text-zinc-800 font-mono w-full">
                <thead>
                  <tr className="bg-zinc-100 text-[8px] font-sans">
                    <th className="py-0.5 text-center px-1">Múltiplo (x Ip)</th>
                    <th className="py-0.5 text-center px-1">Corrente (A)</th>
                    <th className="py-0.5 text-center px-1">Tempo de Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {getTripTimeTableNeutro().map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-center py-0.5 px-1">{row.multiplier.toFixed(1)}x</td>
                      <td className="text-center py-0.5 px-1">{row.current.toFixed(1)} A</td>
                      <td className="text-center py-0.5 px-1 font-bold">{row.time >= 1000 ? 'Muito longo' : `${row.time.toFixed(3)} s`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
        <div className="w-full bg-white flex items-center justify-center">
           <div className="w-full h-auto">
              <CoordChart 
                curves={curves} 
                icc_3f={study.icc_3f} 
                icc_1f={study.icc_1f} 
                specialPoints={specialPoints} 
                showLegend={true}
              />
           </div>
        </div>
        <p className="text-[7px] text-zinc-400 mt-2 uppercase text-center font-mono italic">Gráfico decorrente das configurações de pickup e TMS informados na seção 4.</p>
      </section>

      {/* Seção 4: Ajustes de Proteção */}
      <section className="mb-6">
        <h3 className="report-section-title">4. Tabela de Ajustes (ANSI 50/51/50D)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>ELEMENTO</th>
              <th>FUNÇÃO</th>
              <th>PICKUP (A)</th>
              <th>CURVA</th>
              <th>TMS</th>
              <th>PARTIDA 50D (A)</th>
              <th>TEMPO 50D (s)</th>
              <th>INST (A)</th>
              <th>REL. TC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">FASE</td>
              <td>50/51/50D</td>
              <td className="font-mono">{study.rele_fase.pickup}</td>
              <td className="uppercase">{study.rele_fase.curva.replace('_', ' ')}</td>
              <td className="font-mono">{study.rele_fase.tms}</td>
              <td className="font-mono">{study.rele_fase.i_def || '---'}</td>
              <td className="font-mono">{study.rele_fase.i_def > 0 ? study.rele_fase.t_def : '---'}</td>
              <td className="font-mono">{study.rele_fase.i_inst || '---'}</td>
              <td className="font-mono">{study.tc_relacao}</td>
            </tr>
            <tr>
              <td className="font-bold">NEUTRO</td>
              <td>50/51N/50DN</td>
              <td className="font-mono">{study.rele_neutro.pickup}</td>
              <td className="uppercase">{study.rele_neutro.curva.replace('_', ' ')}</td>
              <td className="font-mono">{study.rele_neutro.tms}</td>
              <td className="font-mono">{study.rele_neutro.i_def || '---'}</td>
              <td className="font-mono">{study.rele_neutro.i_def > 0 ? study.rele_neutro.t_def : '---'}</td>
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
                <p>I_tc_prim ({study.tc_relacao.split('/')[0]}A) &gt; In_Planta ({InomPlanta.toFixed(2)}A)</p>
                <p className={parseFloat(study.tc_relacao.split('/')[0]) >= InomPlanta ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                   {parseFloat(study.tc_relacao.split('/')[0]) >= InomPlanta ? 'Status: Conforme' : 'Status: Subdimensionado'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Normas Técnicas */}
      <section className="report-section">
        <h3 className="report-section-title">6. Normas Técnicas Utilizadas</h3>
        <div className="bg-zinc-50 p-4 border border-zinc-200">
           <ul className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-600 uppercase list-disc list-inside">
             {study.normas_selecionadas?.map((n: string, i: number) => (
                <li key={i}>{n}</li>
             ))}
           </ul>
        </div>
      </section>

      {/* Parecer Técnico */}
      <section className="mb-6 pt-4 border-t-2 border-black">
        <h3 className="report-section-title">7. Parecer Técnico Final</h3>
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
  const In = (study.trafo_kva * (study.trafo_qtd || 1)) / (Math.sqrt(3) * study.trafo_v_prim / 1000);
  const InomPlant = (study.demanda_nova) / (study.trafo_v_prim * Math.sqrt(3) * study.fator_potencia / 1000);
  const tcRatioStr = study.tc_relacao || '50/5';
  const tcSaturationLevel = study.icc_3f / (parseFloat(tcRatioStr.split('/')[0]) || 1);

  const tcPrimary = parseFloat(tcRatioStr.split('/')[0]) || 50;
  const tcSecondary = parseFloat(tcRatioStr.split('/')[1]) || 5;
  const tcRatio = tcPrimary / tcSecondary;
  
  const mainTrafoTotalKva = study.trafo_kva * (study.trafo_qtd || 1);
  const v_prim_kv = study.trafo_v_prim / 1000;
  
  // Inrush Multiplier
  const inrushMult = study.trafo_kva <= 300 ? 12 : 10;
  const inrushI = In * inrushMult;
  
  // ANSI Short Circuit Current
  const I_sc_ansi = (100 / study.trafo_z) * In;
  
  // Protection Curve Info
  const faseCurve = getCurveParams(study.rele_fase.curva);
  const neutroCurve = getCurveParams(study.rele_neutro.curva);
  
  // Fase faults trip times
  const ipFase = study.rele_fase.pickup;
  const tmsFase = study.rele_fase.tms;
  const curveTypeFase = study.rele_fase.curva;
  
  const tripTimeFaseCurto = calculateActualRelayTime(
    study.icc_3f,
    ipFase,
    tmsFase,
    curveTypeFase,
    undefined,
    study.rele_fase.i_def,
    study.rele_fase.t_def,
    study.rele_fase.i_inst
  );
  
  // Neutro faults trip times
  const ipNeutro = study.rele_neutro.pickup;
  const tmsNeutro = study.rele_neutro.tms;
  const curveTypeNeutro = study.rele_neutro.curva;
  
  const tripTimeNeutroCurto = calculateActualRelayTime(
    study.icc_1f,
    ipNeutro,
    tmsNeutro,
    curveTypeNeutro,
    undefined,
    study.rele_neutro.i_def,
    study.rele_neutro.t_def,
    study.rele_neutro.i_inst
  );

  const getTripTimeTableFase = () => {
    const multipliers = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0];
    return multipliers.map(m => {
      const current = ipFase * m;
      const time = calculateActualRelayTime(
        current,
        ipFase,
        tmsFase,
        curveTypeFase,
        undefined,
        study.rele_fase.i_def,
        study.rele_fase.t_def,
        study.rele_fase.i_inst
      );
      return { multiplier: m, current, time };
    });
  };

  const getTripTimeTableNeutro = () => {
    const multipliers = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0];
    return multipliers.map(m => {
      const current = ipNeutro * m;
      const time = calculateActualRelayTime(
        current,
        ipNeutro,
        tmsNeutro,
        curveTypeNeutro,
        undefined,
        study.rele_neutro.i_def,
        study.rele_neutro.t_def,
        study.rele_neutro.i_inst
      );
      return { multiplier: m, current, time };
    });
  };

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

      {/* Seção 2: Memória de Cálculo e Dimensionamento Detalhada */}
      <section className="report-section">
        <h3 className="report-section-title">2. Memória de Cálculo e Dimensionamento</h3>
        
        {/* Subsection 2.1 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.1. Dimensionamento das Correntes Nominais</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Corrente Nominal dos Transformadores (In_trafo)</p>
              <div className="text-[9px] font-mono text-zinc-800 mt-1 leading-relaxed">
                <p className="font-bold text-zinc-900">Fórmula:</p>
                <p>I_n_trafo = S_total / (V_prim × √3)</p>
                <p className="font-bold text-zinc-900 mt-1.5">Aplicação:</p>
                <p>I_n_trafo = {mainTrafoTotalKva} kVA / ({v_prim_kv.toFixed(2)} kV × 1.732)</p>
                <p className="font-bold text-zinc-900 mt-1">Resultado: {In.toFixed(2)} A</p>
              </div>
            </div>
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Corrente Nominal da Planta / Demanda (In_planta)</p>
              <div className="text-[9px] font-mono text-zinc-800 mt-1 leading-relaxed">
                <p className="font-bold text-zinc-900">Fórmula:</p>
                <p>I_n_planta = Demanda_kW / (V_prim × √3 × FP)</p>
                <p className="font-bold text-zinc-900 mt-1.5">Aplicação:</p>
                <p>I_n_planta = {study.demanda_nova} kW / ({v_prim_kv.toFixed(2)} kV × 1.732 × {study.fator_potencia})</p>
                <p className="font-bold text-zinc-900 mt-1">Resultado: {InomPlant.toFixed(2)} A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.2 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.2. Dimensionamento e Saturação do TC (Transformador de Corrente)</h4>
          <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Dados do TC de Proteção</p>
                <ul className="list-disc list-inside mt-1 font-mono text-zinc-800 space-y-0.5">
                  <li>Relação Mínima: {study.tc_relacao} (RTC = {tcRatio.toFixed(1)})</li>
                  <li>Classe de Exatidão: {study.tc_classe || 'Não especificada'}</li>
                  <li>Capacidade de Carga em Regime: {tcPrimary} A &ge; {InomPlant.toFixed(2)} A</li>
                  <li className={tcPrimary >= InomPlant ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    Status de Carga: {tcPrimary >= InomPlant ? "CONFORME" : "SUBDIMENSIONADO"}
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Cálculo de Saturação (Fator Limite F_s)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p>Fórmula: F_s = Icc_max_3f / I_tc_prim</p>
                  <p>F_s = {study.icc_3f} A / {tcPrimary} A = {tcSaturationLevel.toFixed(2)}</p>
                  <p className={tcSaturationLevel <= 20 ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    Status Saturação: {tcSaturationLevel <= 20 ? "CONFORME (F_s ≤ 20)" : "RISCO SATURAÇÃO (F_s > 20)"}
                  </p>
                  <p className="text-[7px] text-zinc-400 font-mono italic leading-tight">O fator F_s deve ser inferior a 20 para garantir a reprodução linear do sinal na atuação rápida (ANSI 50).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.3 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.3. Pontos Singulares do Transformador (ANSI e Inrush)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Ponto de Magnetização Máxima (Inrush)</p>
              <div className="font-mono text-zinc-800 mt-1 space-y-0.5">
                <p className="font-bold underline">Critério Técnico:</p>
                <p>Para S &le; 300kVA: I_inrush = 12 × I_n_trafo</p>
                <p>Para S &gt; 300kVA: I_inrush = 10 × I_n_trafo</p>
                <p className="font-bold mt-1">Aplicação:</p>
                <p>I_inrush = {inrushMult} × {In.toFixed(2)} A = {inrushI.toFixed(2)} A (t = 0.1s)</p>
                <p className="text-[7px] text-zinc-400 italic mt-0.5">O ajuste da fase temporizada e instantânea deve passar à direita deste ponto singular para evitar desligamentos indevidos durante o ligamento frio.</p>
              </div>
            </div>
            <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed">
              <p className="text-[8px] font-bold text-zinc-500 uppercase">Curva de Suportabilidade ANSI (NBR 5356)</p>
              <div className="font-mono text-zinc-800 mt-1 space-y-0.5">
                <p className="font-bold underline">Cálculo de Curto Terminado:</p>
                <p>I_sc_trafo = (100 / Z%) × I_n_trafo</p>
                <p>I_sc_trafo = (100 / {study.trafo_z}%) × {In.toFixed(2)}  A = {I_sc_ansi.toFixed(2)} A</p>
                <p className="font-bold mt-1">Pontos de Coordenograma ANSI:</p>
                {mainTrafoTotalKva <= 500 ? (
                  <p>• Ponto ANSI Categoria I: {I_sc_ansi.toFixed(2)} A @ 2.0s (Térmico/Mecânico)</p>
                ) : (
                  <div className="space-y-0.5">
                    <p>• Ponto ANSI 2.0s (Térmico): {I_sc_ansi.toFixed(2)} A</p>
                    <p>• Ponto ANSI 4.08s: {(I_sc_ansi * 0.7).toFixed(2)} A</p>
                    <p>• Ponto ANSI 10.0s (Sobrecarga): {(I_sc_ansi * 0.45).toFixed(2)} A</p>
                    <p>• Limite Mecânico 0.1s: {(I_sc_ansi * 0.8).toFixed(2)} A</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subsection 2.4 */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-zinc-800 uppercase mb-2 border-b border-zinc-200 pb-0.5">2.4. Cálculos do Relé de Proteção (ANSI 50/51/50D)</h4>
          <div className="border border-zinc-200 p-2.5 rounded bg-zinc-50/50 text-[9px] leading-relaxed mb-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Equações de Tempo Inverso / ND 5.3</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p className="font-bold underline text-blue-800 text-[8px]">IEC 60255:</p>
                  <p className="italic">t = TMS × [ A / ( (I / Ip)^P - 1 ) ]</p>
                  <p className="font-bold underline text-blue-800 mt-1 text-[8px]">IEEE C37.112 (ANSI):</p>
                  <p className="italic">t = TMS × [ A / ( (I / Ip)^P - 1 ) + B ]</p>
                </div>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Parâmetros das Curvas de Proteção Selecionadas</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1">
                  <p><strong className="text-zinc-600 block text-[7px] uppercase leading-none mt-1">Fase:</strong> {faseCurve.name} (A={faseCurve.A}, B={faseCurve.B}, P={faseCurve.P})</p>
                  <p><strong className="text-zinc-600 block text-[7px] uppercase leading-none mt-1">Neutro:</strong> {neutroCurve.name} (A={neutroCurve.A}, B={neutroCurve.B}, P={neutroCurve.P})</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-200/60 font-sans">
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Simulação de Falta Crítica de Fase (50/51/50D)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1 leading-snug">
                  <p>• Corrente Curto Fase: Icc_3f = {study.icc_3f} A</p>
                  <p>• Pickup Fase (Ip): {ipFase} A ({(ipFase / In).toFixed(2)}x In_trafo)</p>
                  <p>• Multiplicador de Partida (M): {(study.icc_3f / ipFase).toFixed(2)}</p>
                  <p>• Tempo do Estágio Temporizado (51): {calculateTime(study.icc_3f, ipFase, tmsFase, curveTypeFase).toFixed(3)} s</p>
                  {study.rele_fase.i_def > 0 && study.icc_3f >= study.rele_fase.i_def && (
                    <p>• Restrição Tempo Definido (50D): {study.rele_fase.t_def.toFixed(3)} s (I &ge; {study.rele_fase.i_def}A)</p>
                  )}
                  {study.rele_fase.i_inst > 0 && study.icc_3f >= study.rele_fase.i_inst && (
                    <p>• Interceptação Instantânea (50): 0.015 s (I &ge; {study.rele_fase.i_inst}A)</p>
                  )}
                  <p className="font-bold underline text-zinc-900 mt-1">Tempo Total de Atuação da Unidade de Fase: {tripTimeFaseCurto.toFixed(3)} s</p>
                </div>
              </div>
              
              <div>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Simulação de Falta Crítica de Neutro (50N/51N/50DN)</p>
                <div className="font-mono text-zinc-800 mt-1 space-y-1 leading-snug">
                  <p>• Corrente Curto Monofásico: Icc_1f = {study.icc_1f} A</p>
                  <p>• Pickup Neutro (Ip): {ipNeutro} A ({(ipNeutro / In).toFixed(2)}x In_trafo)</p>
                  <p>• Multiplicador de Partida (M): {(study.icc_1f / ipNeutro).toFixed(2)}</p>
                  <p>• Tempo do Estágio Temporizado (51N): {calculateTime(study.icc_1f, ipNeutro, tmsNeutro, curveTypeNeutro).toFixed(3)} s</p>
                  {study.rele_neutro.i_def > 0 && study.icc_1f >= study.rele_neutro.i_def && (
                    <p>• Restrição Tempo Definido (50DN): {study.rele_neutro.t_def.toFixed(3)} s (I &ge; {study.rele_neutro.i_def}A)</p>
                  )}
                  {study.rele_neutro.i_inst > 0 && study.icc_1f >= study.rele_neutro.i_inst && (
                    <p>• Interceptação Instantânea (50N): 0.015 s (I &ge; {study.rele_neutro.i_inst}A)</p>
                  )}
                  <p className="font-bold underline text-zinc-900 mt-1">Tempo Total de Atuação da Unidade de Neutro: {tripTimeNeutroCurto.toFixed(3)} s</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">Tabela de Tempos Analíticos (FASE)</p>
              <table className="report-table text-[9px] text-zinc-800 font-mono w-full">
                <thead>
                  <tr className="bg-zinc-100 text-[8px] font-sans">
                    <th className="py-0.5 text-center px-1">Múltiplo (x Ip)</th>
                    <th className="py-0.5 text-center px-1">Corrente (A)</th>
                    <th className="py-0.5 text-center px-1">Tempo de Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {getTripTimeTableFase().map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-center py-0.5 px-1">{row.multiplier.toFixed(1)}x</td>
                      <td className="text-center py-0.5 px-1">{row.current.toFixed(1)} A</td>
                      <td className="text-center py-0.5 px-1 font-bold">{row.time >= 1000 ? 'Muito longo' : `${row.time.toFixed(3)} s`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">Tabela de Tempos Analíticos (NEUTRO)</p>
              <table className="report-table text-[9px] text-zinc-800 font-mono w-full">
                <thead>
                  <tr className="bg-zinc-100 text-[8px] font-sans">
                    <th className="py-0.5 text-center px-1">Múltiplo (x Ip)</th>
                    <th className="py-0.5 text-center px-1">Corrente (A)</th>
                    <th className="py-0.5 text-center px-1">Tempo de Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {getTripTimeTableNeutro().map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-center py-0.5 px-1">{row.multiplier.toFixed(1)}x</td>
                      <td className="text-center py-0.5 px-1">{row.current.toFixed(1)} A</td>
                      <td className="text-center py-0.5 px-1 font-bold">{row.time >= 1000 ? 'Muito longo' : `${row.time.toFixed(3)} s`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                  {eq.tipo === 'Motor' && `Inrush Estimado: ${(eq.kva / (study.trafo_v_prim * Math.sqrt(3) * 0.85 * 0.9 / 1000) * 6).toFixed(2)}A`}
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
        <div className="w-full bg-white flex items-center justify-center">
           <div className="w-full h-auto">
              <CoordChart curves={curves} icc_3f={study.icc_3f} icc_1f={study.icc_1f} specialPoints={specialPoints} showLegend={true} />
           </div>
        </div>
        <p className="text-[7px] text-zinc-400 mt-2 uppercase text-center font-mono italic">Curvas de proteção conforme parâmetros técnicos da ND 5.3.</p>
      </section>

      <section className="mb-4">
        <h3 className="report-section-title">4. Ajustes do Relé de Proteção (ANSI 50/51/50D)</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>PARÂMETRO</th>
              <th>FASE (51/50/50D)</th>
              <th>NEUTRO (51/50N/50DN)</th>
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
              <td className="font-bold uppercase text-[7px]">Partida 50D (A)</td>
              <td className="font-mono">{study.rele_fase.i_def || '---'}</td>
              <td className="font-mono">{study.rele_neutro.i_def || '---'}</td>
            </tr>
            <tr>
              <td className="font-bold uppercase text-[7px]">Tempo 50D (s)</td>
              <td className="font-mono">{study.rele_fase.i_def > 0 ? study.rele_fase.t_def : '---'}</td>
              <td className="font-mono">{study.rele_neutro.i_def > 0 ? study.rele_neutro.t_def : '---'}</td>
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

      <section className="mb-4">
        <h3 className="report-section-title">6. Normas Técnicas Utilizadas</h3>
        <div className="p-3 border border-zinc-200 rounded bg-zinc-50">
           <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[8px] font-mono text-zinc-600 uppercase list-disc list-inside">
             {study.normas_selecionadas?.map((n: string, i: number) => (
                <li key={i}>{n}</li>
             ))}
           </ul>
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
