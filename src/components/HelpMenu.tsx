import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, CheckCircle2, Info, ArrowRight } from 'lucide-react';

interface HelpMenuProps {
  onClose: () => void;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ onClose }) => {
  const steps = [
    { title: "Configuração Inicial", desc: "Selecione a concessionária no menu lateral. Isso carrega as normas técnicas e ajustes padrão específicos." },
    { title: "Dados do Projeto", desc: "Preencha as informações do cliente e do Responsável Técnico (RT). Estes dados aparecerão no cabeçalho do memorial." },
    { title: "Dados do Sistema", desc: "Informe a potência do transformador (kVA), tensões e impedância (Z%). Isso calcula automaticamente os pontos ANSI e Inrush." },
    { title: "Ajuste das Curvas", desc: "Defina o Pickup (Corrente de Partida) e o Dial/TMS para Fase e Neutro. Observe o gráfico de coordenação em tempo real." },
    { title: "Validação", desc: "Verifique se a curva do relé está acima da curva de carga e dos pontos de Inrush, mas abaixo dos pontos ANSI e do Icc de concessão." },
    { title: "Emissão de Relatório", desc: "Com a proteção coordenada, clique em 'Exportar PDF' para gerar o memorial de cálculo completo em formato A4." }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-black border border-green-900/50 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-green-950/20 to-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <BookOpen className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Manual de Utilização</h2>
              <p className="text-xs text-green-700 font-mono">Guia passo-a-passo para elaboração do estudo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section>
            <h3 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2 uppercase">
              <Info className="w-4 h-4" /> Funcionalidades Incluídas
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                "Cálculo automático de Inrush e ANSI",
                "Gráfico de Coordenação Interativo",
                "Seletividade Cronométrica e Amperimétrica",
                "Verificação de Saturação de TC",
                "Simulador de Falta e Sobrecarga",
                "Relatórios A4 Normativos (CEMIG e Geral)",
                "Banco de dados de Relés Comerciais",
                "Entrada manual de Fabricantes/Modelos"
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> {f}
                </div>
              ))}
            </div>
            
            <h3 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2 uppercase">
              <Info className="w-4 h-4" /> Sobre o Aplicativo
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Este aplicativo é uma ferramenta profissional para engenheiros eletricistas realizarem o 
              <span className="text-green-400 font-bold"> Estudo de Coordenação e Seletividade (ANSI 50/51)</span>. 
              Ele automatiza o cálculo de curvas de proteção, pontos de estresse de equipamentos (ANSI/Inrush) 
              e gera memoriais de cálculo em conformidade com as normas das principais concessionárias do Brasil.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <ArrowRight className="w-4 h-4" /> Fluxo de Trabalho
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, idx) => (
                <div key={idx} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-green-900/50 transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-green-800 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-green-900/30">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h4 className="text-[11px] font-bold text-zinc-200 uppercase group-hover:text-green-500 transition-colors">{step.title}</h4>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl flex gap-4 items-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            <p className="text-[10px] text-zinc-400 font-serif italic">
              "Lembre-se sempre de validar os dados de curto-circuito (Icc) fornecidos pela concessionária no projeto, 
               pois eles são a base para a segurança da seletividade."
            </p>
          </div>
        </div>

        <footer className="p-6 border-t border-zinc-800 bg-zinc-950">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-extrabold text-xs rounded-lg transition-all uppercase tracking-widest cursor-pointer"
          >
            Entendi, vamos começar!
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};
