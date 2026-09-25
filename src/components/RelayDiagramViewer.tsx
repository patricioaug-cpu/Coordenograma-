import React from 'react';
import { RelayDiagramInfo } from '../constants/relay-diagrams';

interface RelayDiagramViewerProps {
  info: RelayDiagramInfo;
}

export const RelayDiagramViewer: React.FC<RelayDiagramViewerProps> = ({ info }) => {
  return (
    <div className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-2xl overflow-x-auto">
      {/* SVG Diagrama Técnico de Alta Resolução */}
      <svg 
        viewBox="0 0 1000 680" 
        className="w-full h-auto min-w-[700px] select-none font-mono"
        style={{ background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}
      >
        <defs>
          {/* Grade de fundo */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
          {/* Gradientes */}
          <linearGradient id="relayBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="ctGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Fundo com Grid */}
        <rect width="1000" height="680" fill="url(#grid)" />

        {/* TÍTULO E CABEÇALHO DO DIAGRAMA */}
        <rect x="20" y="15" width="960" height="50" rx="6" fill="#09090b" stroke="#334155" strokeWidth="1" />
        <text x="40" y="38" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
          ESQUEMA ELÉTRICO UNIFILAR / FUNCIONAL DE BORNES - {info.manufacturer.toUpperCase()} {info.model.toUpperCase()}
        </text>
        <text x="40" y="55" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
          Padrão ABNT NBR 14039 / Concessionária CEMIG ND 5.3 - Alimentador MT com Proteção 50/51 e 50N/51N
        </text>
        <text x="880" y="45" fill="#eab308" fontSize="11" fontWeight="bold" textAnchor="end">
          {info.standards}
        </text>

        {/* ========================================================= */}
        {/* BARRAMENTO DE MÉDIA TENSÃO (A, B, C) */}
        {/* ========================================================= */}
        <g id="primary-bus">
          <text x="50" y="100" fill="#94a3b8" fontSize="11" fontWeight="bold">BARRAMENTO PRIMÁRIO MT (13.8 kV)</text>
          
          {/* Fase A - Vermelho / Laranja */}
          <line x1="50" y1="120" x2="350" y2="120" stroke="#f43f5e" strokeWidth="3" />
          <text x="35" y="124" fill="#f43f5e" fontSize="11" fontWeight="bold">A</text>
          
          {/* Fase B - Branco / Prata */}
          <line x1="50" y1="150" x2="350" y2="150" stroke="#f8fafc" strokeWidth="3" />
          <text x="35" y="154" fill="#f8fafc" fontSize="11" fontWeight="bold">B</text>

          {/* Fase C - Azul */}
          <line x1="50" y1="180" x2="350" y2="180" stroke="#38bdf8" strokeWidth="3" />
          <text x="35" y="184" fill="#38bdf8" fontSize="11" fontWeight="bold">C</text>

          {/* Seta sentido fluxo */}
          <polygon points="350,116 360,120 350,124" fill="#f43f5e" />
          <polygon points="350,146 360,150 350,154" fill="#f8fafc" />
          <polygon points="350,176 360,180 350,184" fill="#38bdf8" />
          <text x="290" y="200" fill="#64748b" fontSize="9">FLUXO DE CARGA &gt;&gt;</text>
        </g>

        {/* ========================================================= */}
        {/* DISJUNTOR DE MÉDIA TENSÃO 52 */}
        {/* ========================================================= */}
        <g id="circuit-breaker" transform="translate(80, 210)">
          <rect x="0" y="0" width="130" height="95" rx="6" fill="#18181b" stroke="#e11d48" strokeWidth="1.5" />
          <text x="65" y="20" fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">DISJUNTOR 52</text>
          <text x="65" y="34" fill="#94a3b8" fontSize="8" textAnchor="middle">Vácuo / SF6 (MT)</text>
          
          {/* Contato Principal 52 */}
          <circle cx="45" cy="55" r="4" fill="#ef4444" />
          <circle cx="85" cy="55" r="4" fill="#ef4444" />
          <line x1="45" y1="55" x2="80" y2="45" stroke="#ef4444" strokeWidth="2.5" />
          
          {/* Bobina de Abertura (Trip Coil 52/TC) */}
          <rect x="25" y="70" width="80" height="18" rx="3" fill="#27272a" stroke="#f59e0b" strokeWidth="1" />
          <text x="65" y="82" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle">BOBINA TRIP (52/TC)</text>
        </g>

        {/* ========================================================= */}
        {/* TRANSFORMADORES DE CORRENTE (TCs) */}
        {/* ========================================================= */}
        <g id="current-transformers" transform="translate(50, 335)">
          <rect x="0" y="0" width="180" height="175" rx="6" fill="#09090b" stroke="#10b981" strokeWidth="1.5" />
          <text x="90" y="20" fill="#6ee7b7" fontSize="10" fontWeight="bold" textAnchor="middle">CONJUNTO DE TCs (3F + N)</text>
          <text x="90" y="33" fill="#94a3b8" fontSize="8" textAnchor="middle">Secundário 5A ou 1A</text>

          {/* Bobinas TC Fase A */}
          <g transform="translate(15, 45)">
            <circle cx="20" cy="12" r="10" fill="none" stroke="#f43f5e" strokeWidth="2" />
            <circle cx="32" cy="12" r="10" fill="none" stroke="#f43f5e" strokeWidth="2" />
            <text x="50" y="16" fill="#f43f5e" fontSize="9" fontWeight="bold">TC Fase A (Ia)</text>
            <text x="120" y="10" fill="#94a3b8" fontSize="8">S1</text>
            <text x="120" y="22" fill="#94a3b8" fontSize="8">S2</text>
          </g>

          {/* Bobinas TC Fase B */}
          <g transform="translate(15, 75)">
            <circle cx="20" cy="12" r="10" fill="none" stroke="#f8fafc" strokeWidth="2" />
            <circle cx="32" cy="12" r="10" fill="none" stroke="#f8fafc" strokeWidth="2" />
            <text x="50" y="16" fill="#f8fafc" fontSize="9" fontWeight="bold">TC Fase B (Ib)</text>
            <text x="120" y="10" fill="#94a3b8" fontSize="8">S1</text>
            <text x="120" y="22" fill="#94a3b8" fontSize="8">S2</text>
          </g>

          {/* Bobinas TC Fase C */}
          <g transform="translate(15, 105)">
            <circle cx="20" cy="12" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="32" cy="12" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <text x="50" y="16" fill="#38bdf8" fontSize="9" fontWeight="bold">TC Fase C (Ic)</text>
            <text x="120" y="10" fill="#94a3b8" fontSize="8">S1</text>
            <text x="120" y="22" fill="#94a3b8" fontSize="8">S2</text>
          </g>

          {/* TC de Neutro / Residual */}
          <g transform="translate(15, 135)">
            <circle cx="20" cy="12" r="10" fill="none" stroke="#06b6d4" strokeWidth="2" />
            <circle cx="32" cy="12" r="10" fill="none" stroke="#06b6d4" strokeWidth="2" />
            <text x="50" y="16" fill="#06b6d4" fontSize="9" fontWeight="bold">TC Neutro (In/Io)</text>
            <text x="120" y="10" fill="#94a3b8" fontSize="8">S1</text>
            <text x="120" y="22" fill="#94a3b8" fontSize="8">S2</text>
          </g>
        </g>

        {/* PONTO DE ATERRAMENTO DOS TCs */}
        <g transform="translate(60, 525)">
          <line x1="0" y1="0" x2="35" y2="0" stroke="#84cc16" strokeWidth="2" />
          <line x1="35" y1="0" x2="35" y2="15" stroke="#84cc16" strokeWidth="2" />
          <line x1="20" y1="15" x2="50" y2="15" stroke="#84cc16" strokeWidth="2.5" />
          <line x1="25" y1="20" x2="45" y2="20" stroke="#84cc16" strokeWidth="2" />
          <line x1="30" y1="25" x2="40" y2="25" stroke="#84cc16" strokeWidth="1.5" />
          <text x="55" y="20" fill="#a3e635" fontSize="9">Terra TCs (1 único ponto)</text>
        </g>

        {/* ========================================================= */}
        {/* CORPO CENTRAL DO RELÉ DE PROTEÇÃO */}
        {/* ========================================================= */}
        <g id="relay-unit" transform="translate(420, 90)">
          {/* Caixa do Relé */}
          <rect x="0" y="0" width="310" height="540" rx="10" fill="url(#relayBodyGrad)" stroke="#38bdf8" strokeWidth="2" />
          
          {/* Cabeçalho do relé */}
          <rect x="10" y="10" width="290" height="60" rx="6" fill="#0c0a09" stroke="#27272a" />
          <circle cx="30" cy="30" r="6" fill="#22c55e" filter="url(#glowGreen)" />
          <text x="45" y="33" fill="#22c55e" fontSize="10" fontWeight="bold">STATUS: OK / OPERAÇÃO</text>
          <text x="25" y="55" fill="#f8fafc" fontSize="13" fontWeight="bold">{info.manufacturer} - {info.model}</text>

          {/* Display Frontal Simulado */}
          <rect x="15" y="80" width="280" height="45" rx="4" fill="#022c22" stroke="#059669" />
          <text x="25" y="98" fill="#34d399" fontSize="10" fontWeight="bold">I_RMS = [Ia: 14.2A, Ib: 14.1A, Ic: 14.3A]</text>
          <text x="25" y="114" fill="#10b981" fontSize="9">Io = 0.02A | ANSI: 50/51/50N/51N ATIVO</text>

          {/* RÉGUA DE BORNES ESQUERDA (ENTRADAS DE CORRENTE E SINAIS) */}
          <text x="15" y="145" fill="#94a3b8" fontSize="9" fontWeight="bold">BORNEIRA LATERAL ESQUERDA</text>
          
          {/* Terminal TC Ia */}
          <g transform="translate(15, 160)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#f43f5e" />
            <text x="8" y="14" fill="#f43f5e" fontSize="9" fontWeight="bold">BORNES 09 - 10</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Entrada TC Ia (S1-S2)</text>
            <circle cx="115" cy="16" r="4" fill="#f43f5e" />
          </g>

          {/* Terminal TC Ib */}
          <g transform="translate(15, 200)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#f8fafc" />
            <text x="8" y="14" fill="#f8fafc" fontSize="9" fontWeight="bold">BORNES 11 - 12</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Entrada TC Ib (S1-S2)</text>
            <circle cx="115" cy="16" r="4" fill="#f8fafc" />
          </g>

          {/* Terminal TC Ic */}
          <g transform="translate(15, 240)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#38bdf8" />
            <text x="8" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold">BORNES 13 - 14</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Entrada TC Ic (S1-S2)</text>
            <circle cx="115" cy="16" r="4" fill="#38bdf8" />
          </g>

          {/* Terminal TC In */}
          <g transform="translate(15, 280)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#06b6d4" />
            <text x="8" y="14" fill="#06b6d4" fontSize="9" fontWeight="bold">BORNES 15 - 16</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Entrada TC In/Io (Terra)</text>
            <circle cx="115" cy="16" r="4" fill="#06b6d4" />
          </g>

          {/* Terminal Bloqueio Digital */}
          <g transform="translate(15, 325)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#3b82f6" />
            <text x="8" y="14" fill="#60a5fa" fontSize="9" fontWeight="bold">BORNES 07 - 08</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Bloqueio / Entrada Lógica</text>
            <circle cx="115" cy="16" r="4" fill="#3b82f6" />
          </g>

          {/* Terminal Comunicação Serial */}
          <g transform="translate(15, 370)">
            <rect x="0" y="0" width="125" height="32" rx="4" fill="#18181b" stroke="#a855f7" />
            <text x="8" y="14" fill="#c084fc" fontSize="9" fontWeight="bold">BORNES 23 - 24</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">RS-485 / Modbus RTU</text>
            <circle cx="115" cy="16" r="4" fill="#a855f7" />
          </g>

          {/* RÉGUA DE BORNES DIREITA (COMANDOS, TRIP E ALIMENTAÇÃO) */}
          <text x="165" y="145" fill="#94a3b8" fontSize="9" fontWeight="bold">BORNEIRA LATERAL DIREITA</text>

          {/* Alimentação Auxiliar */}
          <g transform="translate(165, 160)">
            <rect x="0" y="0" width="130" height="42" rx="4" fill="#18181b" stroke="#eab308" />
            <text x="8" y="14" fill="#eab308" fontSize="9" fontWeight="bold">BORNES 01 - 02</text>
            <text x="8" y="26" fill="#fde047" fontSize="8">Alimentação Auxiliar</text>
            <text x="8" y="37" fill="#94a3b8" fontSize="7">72-250Vcc / 80-250Vca</text>
            <circle cx="8" cy="21" r="3" fill="#eab308" />
          </g>

          {/* Saída de Disparo TRIP */}
          <g transform="translate(165, 215)">
            <rect x="0" y="0" width="130" height="46" rx="4" fill="#260505" stroke="#ef4444" strokeWidth="1.5" />
            <text x="8" y="14" fill="#f87171" fontSize="9" fontWeight="bold">BORNES 03 - 04 (TRIP)</text>
            <text x="8" y="26" fill="#fca5a5" fontSize="8">Saída Comando Bobina</text>
            <text x="8" y="38" fill="#fda4af" fontSize="7">Contato NA 30A (Disparo)</text>
            <circle cx="8" cy="23" r="3" fill="#ef4444" />
          </g>

          {/* Saída de Sinalização / Alarme */}
          <g transform="translate(165, 275)">
            <rect x="0" y="0" width="130" height="40" rx="4" fill="#18181b" stroke="#f97316" />
            <text x="8" y="14" fill="#fb923c" fontSize="9" fontWeight="bold">BORNES 05 - 06</text>
            <text x="8" y="26" fill="#fdba74" fontSize="8">Alarme / Telemetria</text>
            <text x="8" y="36" fill="#94a3b8" fontSize="7">Contato NA de Alarme</text>
            <circle cx="8" cy="20" r="3" fill="#f97316" />
          </g>

          {/* Terra de Proteção Carcaça */}
          <g transform="translate(165, 330)">
            <rect x="0" y="0" width="130" height="34" rx="4" fill="#18181b" stroke="#84cc16" />
            <text x="8" y="14" fill="#a3e635" fontSize="9" fontWeight="bold">BORNE DE TERRA (PE)</text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8">Aterramento Carcaça</text>
            <circle cx="8" cy="17" r="3" fill="#84cc16" />
          </g>

          {/* Esquema Lógico das Funções ANSI */}
          <g transform="translate(15, 420)">
            <rect x="0" y="0" width="280" height="100" rx="4" fill="#09090b" stroke="#27272a" />
            <text x="10" y="16" fill="#93c5fd" fontSize="9" fontWeight="bold">FUNÇÕES ANSI HABILITADAS NO RELÉ</text>
            
            <rect x="10" y="25" width="55" height="22" rx="3" fill="#1e1b4b" stroke="#6366f1" />
            <text x="37" y="39" fill="#c7d2fe" fontSize="8" fontWeight="bold" textAnchor="middle">50 / 51</text>
            
            <rect x="75" y="25" width="60" height="22" rx="3" fill="#0c4a6e" stroke="#0284c7" />
            <text x="105" y="39" fill="#bae6fd" fontSize="8" fontWeight="bold" textAnchor="middle">50N / 51N</text>

            <rect x="145" y="25" width="60" height="22" rx="3" fill="#14532d" stroke="#22c55e" />
            <text x="175" y="39" fill="#bbf7d0" fontSize="8" fontWeight="bold" textAnchor="middle">50GS / 51G</text>

            <rect x="215" y="25" width="55" height="22" rx="3" fill="#701a75" stroke="#d946ef" />
            <text x="242" y="39" fill="#f5d0fe" fontSize="8" fontWeight="bold" textAnchor="middle">50D / 50DN</text>

            <text x="10" y="65" fill="#94a3b8" fontSize="8">
              • Curvas Disponíveis: IEC Muito Inversa, Extremamente Inversa, ANSI VI
            </text>
            <text x="10" y="78" fill="#94a3b8" fontSize="8">
              • Atuação Instantânea &lt; 35ms (Tempo total de corte com disjuntor &lt; 90ms)
            </text>
            <text x="10" y="91" fill="#94a3b8" fontSize="8">
              • Seletividade cronométrica homologada com elo de retaguarda CEMIG
            </text>
          </g>
        </g>

        {/* ========================================================= */}
        {/* LINHAS DE LIGAÇÃO (FIAÇÃO EXTERNA ENTRE COMPONENTES) */}
        {/* ========================================================= */}
        {/* Ligação TCs até Bornes do Relé */}
        <g id="ct-wiring" fill="none" strokeWidth="1.5">
          {/* Fio Ia */}
          <path d="M 230 392 L 320 392 L 320 265 L 435 265" stroke="#f43f5e" />
          {/* Fio Ib */}
          <path d="M 230 422 L 335 422 L 335 305 L 435 305" stroke="#f8fafc" />
          {/* Fio Ic */}
          <path d="M 230 452 L 350 452 L 350 345 L 435 345" stroke="#38bdf8" />
          {/* Fio In */}
          <path d="M 230 482 L 365 482 L 365 385 L 435 385" stroke="#06b6d4" />
        </g>

        {/* Circuito de TRIP: Do Borne 03-04 do Relé até a Bobina 52/TC */}
        <g id="trip-wiring" fill="none" strokeWidth="2">
          <path d="M 715 320 L 780 320 L 780 250 L 210 250" stroke="#ef4444" strokeDasharray="5 3" />
          <text x="750" y="240" fill="#f87171" fontSize="9" fontWeight="bold">CIRCUITO DE TRIP (DESLIGAMENTO)</text>
        </g>

        {/* ALIMENTAÇÃO AUXILIAR EXTERNA (BANCO DE BATERIAS / NOBREAK) */}
        <g id="dc-power" transform="translate(770, 420)">
          <rect x="0" y="0" width="190" height="130" rx="6" fill="#18181b" stroke="#eab308" strokeWidth="1.5" />
          <text x="95" y="20" fill="#fde047" fontSize="10" fontWeight="bold" textAnchor="middle">FONTE AUXILIAR (CC/CA)</text>
          <text x="95" y="34" fill="#94a3b8" fontSize="8" textAnchor="middle">Banco de Baterias / Retificador</text>
          
          <g transform="translate(20, 50)">
            <circle cx="15" cy="15" r="10" fill="#eab308" />
            <text x="15" y="19" fill="#000" fontSize="11" fontWeight="bold" textAnchor="middle">+</text>
            <text x="35" y="18" fill="#fde047" fontSize="9">+ Polo Positivo (125Vcc)</text>
          </g>

          <g transform="translate(20, 85)">
            <circle cx="15" cy="15" r="10" fill="#71717a" />
            <text x="15" y="18" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">-</text>
            <text x="35" y="18" fill="#cbd5e1" fontSize="9">- Polo Negativo (Comum)</text>
          </g>
        </g>

        {/* Fiação Alimentação: Do banco até Bornes 01-02 */}
        <path d="M 800 460 L 800 280 L 715 280" fill="none" stroke="#eab308" strokeWidth="1.5" />
        <path d="M 800 495 L 820 495 L 820 295 L 715 295" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

        {/* LEGENDA E NOTAS RÁPIDAS NO RODAPÉ */}
        <g transform="translate(30, 580)">
          <rect x="0" y="0" width="940" height="85" rx="6" fill="#09090b" stroke="#27272a" />
          <text x="15" y="18" fill="#f59e0b" fontSize="9" fontWeight="bold">NOTAS DE INSTALAÇÃO &amp; SEGURANÇA:</text>
          <text x="15" y="34" fill="#cbd5e1" fontSize="8">
            1. Os circuitos secundários dos TCs jamais devem ser abertos com o primário energizado (risco de sobretensão fatal). Use blocos de aferição com chave de curto-circuito.
          </text>
          <text x="15" y="48" fill="#cbd5e1" fontSize="8">
            2. O aterramento do circuito secundário de corrente deve ser executado em um único ponto (bornes comuns S2) para prevenir circulação de correntes parasitas de terra.
          </text>
          <text x="15" y="62" fill="#cbd5e1" fontSize="8">
            3. A fiação de disparo (TRIP) deve ser dedicada com bitola mínima de 2,5 mm², interligando diretamente os contatos 03-04 à bobina de disparo 52/TC do disjuntor de MT.
          </text>
          <text x="15" y="76" fill="#38bdf8" fontSize="8">
            4. Em conformidade com a CEMIG ND 5.3 e ABNT NBR 14039 para proteção na entrada da unidade consumidora de média tensão.
          </text>
        </g>
      </svg>
    </div>
  );
};
