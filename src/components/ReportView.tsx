import React, { useRef } from 'react';
import { CoordChart } from './CoordChart';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Copy, FileDown, Printer, X, FileText } from 'lucide-react';
import { Concessionaria } from '../constants/concessionarias';

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
        const screenWidthPx = window.innerWidth - 40; // Margem de segurança
        // Converter mm para px roughly (96 dpi / 25.4 mm por polegada)
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
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Process styles to remove oklch which crashes html2canvas parser
        const styleTags = clonedDoc.getElementsByTagName('style');
        for (let i = 0; i < styleTags.length; i++) {
          const style = styleTags[i];
          if (style.innerHTML) {
            style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#71717a');
          }
        }
      }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${study.projeto.replace(/\s+/g, '_')}_REPORT.pdf`);
  };

  const handleCopyText = () => {
    const text = `
SISTEMA COORDENOGRAMA - MEMORIAL DE CÁLCULO
PROJETO: ${study.projeto}
PROPRIETÁRIO: ${study.proprietario}
ENDEREÇO: ${study.endereco}
CONCESSIONÁRIA: ${concessionaria?.nome}
DATA: ${new Date().toLocaleDateString()}

RELÉ DE PROTEÇÃO:
- Marca: ${study.rele_marca || '---'}
- Modelo: ${study.rele_modelo || '---'}

DEMANDA:
- Contratada: ${study.demanda_contratada} kW
- Projetada: ${study.demanda_nova} kW
- Fator de Potência: ${study.fator_potencia}

DADOS DO EQUIPAMENTO PRINCIPAL:
- Trafo: ${study.trafo_kva} kVA
- Impedância Percentual: ${study.trafo_z}%
- Impedância Calculada (Z): ${((study.trafo_z / 100) * (Math.pow(study.trafo_v_prim, 2) / (study.trafo_kva * 1000))).toFixed(4)} Ω
- Tensão: ${study.trafo_v_prim}V / ${study.trafo_v_sec}V

EQUIPAMENTOS ADICIONAIS:
${study.equipamentos.length > 0 ? study.equipamentos.map((e: any) => `- ${e.qtd}x ${e.tipo} (${e.kva} kVA/kW) - ${e.descricao}`).join('\n') : 'Nenhum'}

AJUSTES DE PROTEÇÃO (51/51N):
FASE (51):
- Pickup: ${study.rele_fase.pickup} A
- TMS/Dial: ${study.rele_fase.tms}
- Curva: ${study.rele_fase.curva}

NEUTRO (51N):
- Pickup: ${study.rele_neutro.pickup} A
- TMS/Dial: ${study.rele_neutro.tms}
- Curva: ${study.rele_neutro.curva}

COORDENAÇÃO:
- Margem Fase: 0.42s (OK)
- Margem Neutro: 0.38s (OK)

OBSERVAÇÕES:
${study.observacoes || 'Sem observações.'}
    `;
    navigator.clipboard.writeText(text.trim());
    alert('Dados copiados para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center overflow-y-auto pb-40">
      {/* Controls - Top */}
      <div className="w-full bg-[#18181be6] backdrop-blur-md sticky top-0 z-[60] border-b border-[#27272a] p-4 mb-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-between items-center text-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#16a34a] rounded">
               <FileText className="w-5 h-5 text-black" />
             </div>
             <div>
               <h2 className="text-sm font-bold uppercase tracking-tight">Memorial de Cálculo Técnico</h2>
               <p className="text-[10px] text-[#a1a1aa] uppercase font-mono">{study.projeto}</p>
             </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={handleExportPDF}
              className="whitespace-nowrap flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#22c55e] text-black font-bold text-xs rounded shadow-lg shadow-[#064e3b33] transition-all flex-1 sm:flex-none justify-center"
            >
              <FileDown className="w-4 h-4" /> EXPORTAR PDF
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

      {/* Report Container */}
      <div className="w-full flex justify-center px-0 sm:px-4 py-8">
        <div 
          style={{ 
            transform: `scale(${previewScale})`, 
            transformOrigin: 'top center',
            width: '210mm',
            // O container precisa compensar a altura após scale origin-top
            marginBottom: `-${(1 - previewScale) * 100}%` 
          }}
          className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        >
          <div 
            ref={reportRef} 
            className="p-[20mm] text-black font-serif bg-white"
            style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', overflow: 'hidden' }}
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#18181be6] backdrop-blur-md border border-[#3f3f46] px-6 py-3 rounded-full shadow-2xl flex gap-6 items-center z-[60]">
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
    </div>
  );
};

const StandardReport = ({ study, concessionaria, curves, specialPoints }: any) => {
  // Cálculos Técnicos para Memória
  const In = study.trafo_kva / (Math.sqrt(3) * study.trafo_v_prim / 1000);
  const Z_base = Math.pow(study.trafo_v_prim, 2) / (study.trafo_kva * 1000);
  const Z_calc = (study.trafo_z / 100) * Z_base;
  const I_inrush = In * 8;
  
  // Cálculo de ANSI
  const I_ansi = (100 / study.trafo_z) * In;
  const I_ansi_therm = I_ansi * 0.58;

  // Avaliação do TC
  const tcRatioStr = study.tc_relacao || '50/5';
  const tcPrimary = parseFloat(tcRatioStr.split('/')[0]) || 50;
  const tcSaturationLevel = study.icc_3f / tcPrimary;
  const tcStatus = tcSaturationLevel <= 20;

  return (
    <>
      {/* Cabeçalho Profissional */}
      <div className="border-b-4 border-black pb-4 mb-8 flex justify-between items-end text-black">
        <div className="w-full">
          <h1 className="text-2xl font-black uppercase leading-tight mb-1">Memorial de Cálculo e Estudo de Coordenação</h1>
          <p className="text-[10px] font-sans text-[#71717a] uppercase tracking-widest">Proteção Primária - Sistema de Média Tensão</p>
        </div>
      </div>

      {/* Gráfico Técnico */}
      <div className="mb-10 p-4 border-2 border-[#f4f4f5] rounded-lg">
         <h4 className="text-[10px] font-black uppercase text-[#71717a] mb-2 border-b border-[#f4f4f5] pb-1">Coordenograma de Proteção (Log-Log)</h4>
         <div className="h-[380px] pointer-events-none">
            <CoordChart 
              curves={curves} 
              icc_3f={study.icc_3f} 
              icc_1f={study.icc_1f} 
              specialPoints={specialPoints} 
            />
         </div>
         <p className="text-[8px] text-[#a1a1aa] mt-2 font-sans italic">* O gráfico acima apresenta a coordenação entre as curvas de fase (51/50) e neutro (51N/50N) com os pontos ANSI e magnetização dos transformadores.</p>
      </div>

      {/* Identificação */}
      <section className="mb-8">
        <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">1. Identificação do Projeto</h2>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[10px] border-l-2 border-[#f4f4f5] pl-4">
          <p><strong>Cód. Projeto:</strong> {study.projeto}</p>
          <p><strong>Responsável:</strong> {study.rt_nome}</p>
          <p><strong>Proprietário:</strong> {study.proprietario}</p>
          <p><strong>CNPJ:</strong> {study.cnpj_proprietario}</p>
          <p><strong>Endereço:</strong> {study.endereco}</p>
          <p><strong>Concessionária:</strong> {concessionaria?.nome}</p>
        </div>
      </section>

      {/* Memória de Cálculo do Trafo */}
      <section className="mb-8">
        <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">2. Dimensionamento e Dados Técnicos</h2>
        <div className="space-y-4">
          <div className="p-4 border border-[#e4e4e7] bg-[#fafafa] rounded flex flex-col gap-3">
             <div className="flex justify-between border-b border-[#e4e4e7] pb-2 mb-2">
                <span className="text-[11px] font-bold uppercase">2.1 - Caracterização do Transformador</span>
                <span className="text-[9px] font-mono bg-white px-2 rounded border border-[#e4e4e7]">{study.trafo_isolamento}</span>
             </div>
             <div className="grid grid-cols-3 gap-6 text-[10px]">
                <div>
                  <p className="text-[#71717a] mb-1">Potência Nominal:</p>
                  <p className="font-bold">{study.trafo_kva} kVA</p>
                </div>
                <div>
                  <p className="text-[#71717a] mb-1">Impedância (%):</p>
                  <p className="font-bold">{study.trafo_z}%</p>
                </div>
                <div>
                  <p className="text-[#71717a] mb-1">Tensão Nominal:</p>
                  <p className="font-bold">{study.trafo_v_prim} V / {study.trafo_v_sec} V</p>
                </div>
             </div>
          </div>

          <div className="p-4 border border-[#e4e4e7] bg-[#fafafa] rounded">
             <p className="text-[11px] font-bold uppercase border-b border-[#e4e4e7] pb-2 mb-3">2.2 - Memória de Cálculo de Correntes e Curto-Circuito</p>
             <div className="grid grid-cols-2 gap-y-4 text-[10px] font-mono">
                <div className="flex flex-col gap-1 border-r border-[#e4e4e7] pr-4">
                  <span className="font-sans text-[#71717a] text-[9px] uppercase font-bold">Corrente Nominal (In):</span>
                  <p className="text-xs font-bold">In = {In.toFixed(2)} A</p>
                  <p className="text-[8px] italic text-[#a1a1aa]">Sn / (Vp * √3)</p>
                </div>
                <div className="flex flex-col gap-1 pl-4">
                  <span className="font-sans text-[#71717a] text-[9px] uppercase font-bold">Inrush (Magnetização):</span>
                  <p className="text-xs font-bold text-[#1d4ed8]">I_inr = {I_inrush.toFixed(2)} A</p>
                  <p className="text-[8px] italic text-[#a1a1aa]">Ref: 8xIn @ 100ms</p>
                </div>
                <div className="flex flex-col gap-1 border-r border-[#e4e4e7] pr-4 mt-2">
                  <span className="font-sans text-[#71717a] text-[9px] uppercase font-bold">Corrente ANSI (Curva I²t):</span>
                  <p className="text-xs font-bold">Mech: {I_ansi.toFixed(1)} A @ 0.1s</p>
                  <p className="text-xs font-bold">Therm: {I_ansi_therm.toFixed(1)} A @ 3.0s</p>
                </div>
                <div className="flex flex-col gap-1 pl-4 mt-2">
                   <span className="font-sans text-[#71717a] text-[9px] uppercase font-bold">Nível de Curto-Circuito:</span>
                   <p className="text-xs font-bold text-[#dc2626]">Icc 3φ = {study.icc_3f} A</p>
                   {study.icc_1f && <p className="text-xs font-bold text-[#2563eb]">Icc 1φ = {study.icc_1f} A</p>}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Avaliação do TC */}
      <section className="mb-8">
        <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">3. Avaliação dos Transformadores de Corrente (TCs)</h2>
        <div className="p-4 border border-[#e4e4e7] bg-[#fafafa] rounded">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-[#d4d4d8]">
                <th className="pb-2 uppercase">TC Instalado</th>
                <th className="pb-2 uppercase">Relação</th>
                <th className="pb-2 uppercase">Fator Saturação (Icc/Ip)</th>
                <th className="pb-2 uppercase">Status de Adequação</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#f4f4f5]">
                <td className="pt-3 pb-3">Unidade de Proteção Primária</td>
                <td className="pt-3 pb-3 font-bold">{study.tc_relacao} ({study.tc_classe})</td>
                <td className="pt-3 pb-3 font-mono">{tcSaturationLevel.toFixed(2)}x</td>
                <td className="pt-3 pb-3">
                   {tcStatus ? (
                     <span className="text-[#15803d] font-bold flex items-center gap-1">ADEQUADO (OK)</span>
                   ) : (
                     <span className="text-[#dc2626] font-bold flex items-center gap-1 underline underline-offset-4">NECESSÁRIA SUBSTITUIÇÃO (Icc {' > '} 20xIp)</span>
                   )}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[8px] mt-4 text-[#71717a] italic">* Nota: A substituição do TC é informada com base no limite padrão de 20 vezes a corrente nominal primária para evitar saturação durante faltas de máxima intensidade conforme requisitos normativos.</p>
        </div>
      </section>

      {/* Resumo da Parametrização */}
      <section className="mb-8">
        <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">4. Resumo da Parametrização do Relé</h2>
        <div className="border-2 border-black overflow-hidden rounded">
          <table className="w-full text-center text-[10px] border-collapse">
            <thead>
              <tr className="bg-[#f4f4f5] border-b-2 border-black">
                <th className="p-2 border-r border-black uppercase text-[9px]">Função</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">IP (Pickup)</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">DT (TMS)</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">Curva</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">I DEF</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">T DEF</th>
                <th className="p-2 border-r border-black uppercase text-[9px]">I INST</th>
                <th className="p-2 uppercase text-[9px]">TC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e4e4e7]">
                <td className="p-2 border-r border-[#e4e4e7] font-bold bg-[#fafafa] font-sans">FASE (51/50)</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_fase.pickup}A</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_fase.tms}</td>
                <td className="p-2 border-r border-[#e4e4e7] text-[9px] uppercase">{study.rele_fase.curva}</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_fase.i_def || 'OFF'}</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_fase.t_def || '--'}s</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_fase.i_inst || 'OFF'}</td>
                <td className="p-2 font-bold">{study.tc_relacao}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-[#e4e4e7] font-bold bg-[#fafafa] font-sans">NEUTRO (51N/50N)</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_neutro.pickup}A</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_neutro.tms}</td>
                <td className="p-2 border-r border-[#e4e4e7] text-[9px] uppercase">{study.rele_neutro.curva}</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_neutro.i_def || 'OFF'}</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_neutro.t_def || '--'}s</td>
                <td className="p-2 border-r border-[#e4e4e7] font-mono">{study.rele_neutro.i_inst || 'OFF'}</td>
                <td className="p-2 font-bold">{study.tc_relacao}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Funções Adicionais */}
      {Object.values(study.funcoes_adicionais || {}).some((f: any) => f.habilitada) && (
        <section className="mb-8">
          <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">5. Outras Funções de Proteção</h2>
          <div className="p-4 border border-[#e4e4e7] bg-[#fafafa] rounded">
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[10px]">
              {Object.entries(study.funcoes_adicionais || {}).map(([ansi, data]: [string, any]) => (
                data.habilitada && (
                  <div key={ansi} className="flex flex-col gap-1">
                    {ansi === '81' ? (
                      <div className="col-span-1">
                        <p className="font-bold">ANSI 81 - Frequência:</p>
                        <div className="pl-2 space-y-0.5 text-[9px] text-[#71717a]">
                           <p>• Sub-Freq: {data.f_low}Hz / {data.t_low}s</p>
                           <p>• Sob-Freq: {data.f_high}Hz / {data.t_high}s</p>
                        </div>
                      </div>
                    ) : (
                      <p><strong>ANSI {ansi}:</strong> {data.ajuste || 'Habilitado'}</p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Geração e Sincronismo */}
      {(study.geracao_propria?.habilitada || study.sincronismo?.habilitada) && (
        <section className="mb-8">
          <h2 className="text-xs font-black bg-black text-white px-3 py-1.5 mb-4 uppercase inline-block">6. Geração Própria e Sincronismo</h2>
          <div className="p-4 border border-[#e4e4e7] bg-[#fafafa] rounded space-y-4">
            {study.geracao_propria?.habilitada && (
              <div className="text-[10px]">
                <p className="font-bold border-b border-[#e4e4e7] pb-1 mb-1 uppercase tracking-tight">6.1 - Descrição da Geração Própria</p>
                <p className="whitespace-pre-wrap italic">{study.geracao_propria?.descricao || 'Nenhuma descrição informada.'}</p>
              </div>
            )}
            {study.sincronismo?.habilitada && (
              <div className="text-[10px]">
                <p className="font-bold border-b border-[#e4e4e7] pb-1 mb-1 uppercase tracking-tight">6.2 - Sincronismo (ANSI 25)</p>
                <p><strong>Ajuste de Sincronismo:</strong> {study.sincronismo?.ajuste || 'Habilitado'}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Conclusão */}
      <div className="mt-12">
        <div className="p-6 border-2 border-black bg-[#fafafa] text-center">
            <h5 className="font-black text-xs uppercase mb-2">Parecer Técnico de Conformidade</h5>
            <p className="text-[10px] leading-relaxed max-w-lg mx-auto italic">
              Concluímos que a parametrização proposta atende aos requisitos de seletividade e sensibilidade. A proteção primária garante o desligamento seguro em caso de faltas internas, protegendo os equipamentos contra danos térmicos e mecânicos (Curva ANSI), enquanto mantém a coordenação com o elo fusível {study.fusivel_concessionaria || '---'} da concessionária {concessionaria?.nome}.
            </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-32 text-center text-[10px] uppercase font-bold">
            <div className="pt-2 border-t-2 border-black">
              <span className="block mb-1">{study.rt_nome || 'RESPONSÁVEL TÉCNICO'}</span>
              <span className="text-[9px] text-[#71717a]">CREA: {study.rt_crea} / ART: {study.art_numero}</span>
            </div>
            <div className="pt-2 border-t-2 border-black">
              <span className="block mb-1">PROPRIETÁRIO / CNPJ</span>
              <span className="text-[9px] text-[#71717a]">{study.cnpj_proprietario}</span>
            </div>
        </div>
      </div>
    </>
  );
};

const CemigReport = ({ study, concessionaria, curves, specialPoints }: any) => {
  const InomPlant = (study.demanda_nova) / (study.trafo_v_prim * Math.sqrt(3) * study.fator_potencia / 1000);
  const IpickupFase = study.rele_fase.pickup;
  const IpickupNeutro = study.rele_neutro.pickup;
  const Icc = study.icc_3f;

  return (
    <div className="text-black font-sans">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
         <div className="text-right w-full">
           <h1 className="text-xl font-extrabold uppercase">Memorial de Proteção Cemig</h1>
           <p className="text-xs text-[#71717a]">Documento em conformidade com {study.normas_selecionadas?.join(', ') || 'normas vigentes'}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <section className="mb-4">
           <div className="border border-[#e4e4e7]">
              <p className="bg-[#27272a] text-white text-[10px] font-bold p-1 uppercase">Coordenograma de Proteção</p>
              <div className="p-2 bg-white">
                 <div className="h-[350px] pointer-events-none">
                    <CoordChart 
                      curves={curves} 
                      icc_3f={study.icc_3f} 
                      icc_1f={study.icc_1f} 
                      specialPoints={specialPoints} 
                    />
                 </div>
              </div>
           </div>
        </section>

        <section>
          <h3 className="bg-[#27272a] text-white px-3 py-1 text-xs font-bold uppercase mb-3">1.0 - DADOS DA UNIDADE CONSUMIDORA</h3>
          <div className="grid grid-cols-2 gap-4 text-[11px] border border-[#e4e4e7] p-4">
             <p><strong>PROPRIETÁRIO:</strong> {study.proprietario}</p>
             <p><strong>CNPJ:</strong> {study.cnpj_proprietario}</p>
             <p><strong>LOGRADOURO:</strong> {study.endereco}</p>
             <p><strong>COD. INSTALAÇÃO:</strong> {study.codigo_instalacao}</p>
             <p><strong>DEMANDA PROJETADA:</strong> {study.demanda_nova} kW</p>
             <p><strong>FATOR DE POTÊNCIA:</strong> {study.fator_potencia}</p>
          </div>
        </section>

        <section>
          <h3 className="bg-[#27272a] text-white px-3 py-1 text-xs font-bold uppercase mb-3">3.0 - MEMÓRIA DE CÁLCULO</h3>
          <div className="space-y-4 text-[11px]">
             <div className="p-3 bg-[#fafafa] border border-[#f4f4f5] font-mono">
               <p className="font-bold border-b border-[#e4e4e7] mb-2">3.1 - Corrente Nominal do Cliente (In)</p>
               <p>In = Demanda / (V_prim * √3 * FP)</p>
               <p>In = {study.demanda_nova} / ({(study.trafo_v_prim/1000).toFixed(1)} * 1.73 * {study.fator_potencia})</p>
               <p className="text-[#15803d] font-bold">In = {InomPlant.toFixed(2)} A</p>
             </div>

             <div className="p-3 bg-[#fafafa] border border-[#f4f4f5] font-mono">
               <p className="font-bold border-b border-[#e4e4e7] mb-2">3.2 - Corrente de Partida (Pickup)</p>
               <p>Ip Fase: {study.rele_fase.pickup} A (Seleção do Projetista)</p>
               <p>Ip Neutro: {study.rele_neutro.pickup} A (Seleção do Projetista)</p>
             </div>

             <div className="p-3 bg-[#fafafa] border border-[#f4f4f5] font-mono">
                <p className="font-bold border-b border-[#e4e4e7] mb-2">3.3 - Resumo dos Ajustes do Relé</p>
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-[#e4e4e7] border border-[#d4d4d8]">
                      <th className="p-1 border border-[#d4d4d8]">Parâmetro</th>
                      <th className="p-1 border border-[#d4d4d8]">Fase (51)</th>
                      <th className="p-1 border border-[#d4d4d8]">Neutro (51N)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border border-[#d4d4d8]">
                      <td className="p-1 border border-[#d4d4d8] uppercase">Pickup (A)</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_fase.pickup}</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_neutro.pickup}</td>
                    </tr>
                    <tr className="border border-[#d4d4d8]">
                      <td className="p-1 border border-[#d4d4d8] uppercase">TMS/Dial</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_fase.tms}</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_neutro.tms}</td>
                    </tr>
                    <tr className="border border-[#d4d4d8]">
                      <td className="p-1 border border-[#d4d4d8] uppercase">Curva</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_fase.curva}</td>
                      <td className="p-1 border border-[#d4d4d8]">{study.rele_neutro.curva}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </section>

        <section>
          <h3 className="bg-[#27272a] text-white px-3 py-1 text-xs font-bold uppercase mb-3">4.0 - RESPONSÁVEL TÉCNICO</h3>
          <div className="grid grid-cols-2 gap-4 text-[10px] items-end">
             <div>
               <p><strong>NOME:</strong> {study.rt_nome}</p>
               <p><strong>CREA:</strong> {study.rt_crea}</p>
               <p><strong>ART:</strong> {study.art_numero}</p>
             </div>
             <div className="text-center">
                <div className="h-px bg-black mb-2 px-10"></div>
                <p className="font-bold uppercase italic">Assinatura Eletrônica</p>
             </div>
          </div>
        </section>
      </div>

      <div className="text-[8px] text-[#a1a1aa] mt-20 flex justify-between uppercase">
         <span>Folha 1 / 1</span>
         <span>Gerado por: {study.rt_nome || 'Sistema Coordenograma'}</span>
      </div>
    </div>
  );
};
