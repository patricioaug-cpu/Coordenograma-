import { RelayDiagramInfo } from '../constants/relay-diagrams';

/**
 * Utilitário profissional de impressão em folha Formato A4
 * para Diagramas Elétricos e Esquemas Funcionais de Relés de Proteção MT.
 * Padrão ABNT NBR 14039 e Concessionária CEMIG ND 5.3.
 */

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gera o SVG do esquema funcional otimizado especificamente para
 * impressão vetorial nítida em papel branco formato A4.
 */
export function getRelayPrintSvg(info: RelayDiagramInfo): string {
  const mfg = escapeHtml(info.manufacturer.toUpperCase());
  const mdl = escapeHtml(info.model.toUpperCase());
  const stds = escapeHtml(info.standards || 'ABNT NBR 14039 / CEMIG ND 5.3');

  return `
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1000 640" 
    width="100%" 
    height="100%" 
    style="background: #ffffff; font-family: 'Courier New', Courier, monospace, sans-serif;"
  >
    <defs>
      <!-- Grade técnica milimetrada sutil para desenho elétrico -->
      <pattern id="print-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="1 3" />
      </pattern>
      <!-- Marcadores de Seta -->
      <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
      </marker>
      <marker id="arrow-dark" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
      </marker>
      <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7" />
      </marker>
    </defs>

    <!-- Fundo Branco com Grade Suave -->
    <rect width="1000" height="640" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
    <rect width="1000" height="640" fill="url(#print-grid)" />

    <!-- CARIMBO INTERNO DO DIAGRAMA -->
    <rect x="15" y="15" width="970" height="48" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" />
    <text x="30" y="36" fill="#0f172a" font-size="13" font-weight="900" font-family="sans-serif">
      ESQUEMA ELÉTRICO UNIFILAR &amp; FUNCIONAL DE PROTEÇÃO MT — ${mfg} ${mdl}
    </text>
    <text x="30" y="52" fill="#475569" font-size="10" font-family="sans-serif">
      Cabine Primária / Subestação de Média Tensão 13,8 kV — Entradas de Corrente (3F+N), Trip 52/TC e Alimentação
    </text>
    <text x="965" y="44" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="end" font-family="sans-serif">
      ${stds}
    </text>

    <!-- ========================================================= -->
    <!-- BARRAMENTO DE MÉDIA TENSÃO 13.8 kV (A, B, C) -->
    <!-- ========================================================= -->
    <g id="primary-bus">
      <rect x="30" y="75" width="310" height="110" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" />
      <text x="40" y="92" fill="#0f172a" font-size="10" font-weight="bold" font-family="sans-serif">BARRAMENTO PRIMÁRIO MT (13.8 kV)</text>
      
      <!-- Fase A - Vermelho -->
      <line x1="45" y1="112" x2="310" y2="112" stroke="#dc2626" stroke-width="3" />
      <text x="35" y="116" fill="#dc2626" font-size="11" font-weight="900">A</text>
      <polygon points="310,108 322,112 310,116" fill="#dc2626" />
      
      <!-- Fase B - Cinza Escuro / Preto Técnico -->
      <line x1="45" y1="138" x2="310" y2="138" stroke="#334155" stroke-width="3" />
      <text x="35" y="142" fill="#334155" font-size="11" font-weight="900">B</text>
      <polygon points="310,134 322,138 310,142" fill="#334155" />

      <!-- Fase C - Azul -->
      <line x1="45" y1="164" x2="310" y2="164" stroke="#0284c7" stroke-width="3" />
      <text x="35" y="168" fill="#0284c7" font-size="11" font-weight="900">C</text>
      <polygon points="310,160 322,164 310,168" fill="#0284c7" />

      <text x="215" y="180" fill="#64748b" font-size="8" font-family="sans-serif">SENTIDO DO FLUXO &gt;&gt;</text>
    </g>

    <!-- ========================================================= -->
    <!-- DISJUNTOR DE MÉDIA TENSÃO 52 -->
    <!-- ========================================================= -->
    <g id="circuit-breaker" transform="translate(60, 200)">
      <rect x="0" y="0" width="150" height="92" rx="4" fill="#fff1f2" stroke="#b91c1c" stroke-width="1.5" />
      <text x="75" y="18" fill="#991b1b" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">DISJUNTOR MT (52)</text>
      <text x="75" y="30" fill="#7f1d1d" font-size="8" text-anchor="middle" font-family="sans-serif">Vácuo / SF6 (13.8kV)</text>
      
      <!-- Contato Principal 52 -->
      <circle cx="50" cy="50" r="4" fill="#b91c1c" />
      <circle cx="95" cy="50" r="4" fill="#b91c1c" />
      <line x1="50" y1="50" x2="90" y2="40" stroke="#b91c1c" stroke-width="2.5" />
      
      <!-- Bobina de Abertura (Trip Coil 52/TC) -->
      <rect x="25" y="66" width="100" height="18" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
      <text x="75" y="78" fill="#92400e" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">BOBINA TRIP (52/TC)</text>
    </g>

    <!-- ========================================================= -->
    <!-- TRANSFORMADORES DE CORRENTE (TCs 3F + N) -->
    <!-- ========================================================= -->
    <g id="current-transformers" transform="translate(40, 310)">
      <rect x="0" y="0" width="200" height="175" rx="4" fill="#f0fdf4" stroke="#15803d" stroke-width="1.5" />
      <text x="100" y="18" fill="#166534" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">CONJUNTO DE TCs (3F + N)</text>
      <text x="100" y="30" fill="#15803d" font-size="8" text-anchor="middle" font-family="sans-serif">Secundário 5A ou 1A (Polarizado)</text>

      <!-- TC Fase A -->
      <g transform="translate(15, 42)">
        <circle cx="18" cy="12" r="9" fill="none" stroke="#dc2626" stroke-width="2" />
        <circle cx="28" cy="12" r="9" fill="none" stroke="#dc2626" stroke-width="2" />
        <text x="46" y="16" fill="#dc2626" font-size="9" font-weight="bold">TC Fase A (Ia)</text>
        <text x="135" y="10" fill="#475569" font-size="8" font-weight="bold">S1</text>
        <text x="135" y="22" fill="#475569" font-size="8" font-weight="bold">S2</text>
      </g>

      <!-- TC Fase B -->
      <g transform="translate(15, 72)">
        <circle cx="18" cy="12" r="9" fill="none" stroke="#334155" stroke-width="2" />
        <circle cx="28" cy="12" r="9" fill="none" stroke="#334155" stroke-width="2" />
        <text x="46" y="16" fill="#334155" font-size="9" font-weight="bold">TC Fase B (Ib)</text>
        <text x="135" y="10" fill="#475569" font-size="8" font-weight="bold">S1</text>
        <text x="135" y="22" fill="#475569" font-size="8" font-weight="bold">S2</text>
      </g>

      <!-- TC Fase C -->
      <g transform="translate(15, 102)">
        <circle cx="18" cy="12" r="9" fill="none" stroke="#0284c7" stroke-width="2" />
        <circle cx="28" cy="12" r="9" fill="none" stroke="#0284c7" stroke-width="2" />
        <text x="46" y="16" fill="#0284c7" font-size="9" font-weight="bold">TC Fase C (Ic)</text>
        <text x="135" y="10" fill="#475569" font-size="8" font-weight="bold">S1</text>
        <text x="135" y="22" fill="#475569" font-size="8" font-weight="bold">S2</text>
      </g>

      <!-- TC Neutro / Residual -->
      <g transform="translate(15, 132)">
        <circle cx="18" cy="12" r="9" fill="none" stroke="#0891b2" stroke-width="2" />
        <circle cx="28" cy="12" r="9" fill="none" stroke="#0891b2" stroke-width="2" />
        <text x="46" y="16" fill="#0891b2" font-size="9" font-weight="bold">TC Neutro (In)</text>
        <text x="135" y="10" fill="#475569" font-size="8" font-weight="bold">S1</text>
        <text x="135" y="22" fill="#475569" font-size="8" font-weight="bold">S2</text>
      </g>
    </g>

    <!-- Ponto de Aterramento dos TCs -->
    <g transform="translate(50, 498)">
      <line x1="0" y1="0" x2="35" y2="0" stroke="#15803d" stroke-width="2" />
      <line x1="35" y1="0" x2="35" y2="12" stroke="#15803d" stroke-width="2" />
      <line x1="22" y1="12" x2="48" y2="12" stroke="#15803d" stroke-width="2.5" />
      <line x1="26" y1="16" x2="44" y2="16" stroke="#15803d" stroke-width="2" />
      <line x1="30" y1="20" x2="40" y2="20" stroke="#15803d" stroke-width="1.5" />
      <text x="55" y="17" fill="#15803d" font-size="8" font-weight="bold" font-family="sans-serif">Terra dos TCs (S2 unificado - Ponto Único)</text>
    </g>

    <!-- ========================================================= -->
    <!-- RELÉ DIGITAL DE PROTEÇÃO (CORPO CENTRAL) -->
    <!-- ========================================================= -->
    <g id="relay-unit" transform="translate(400, 75)">
      <!-- Gabinete Principal do Relé -->
      <rect x="0" y="0" width="330" height="465" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
      
      <!-- Cabeçalho do relé -->
      <rect x="8" y="8" width="314" height="42" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <circle cx="24" cy="24" r="5" fill="#16a34a" />
      <text x="36" y="27" fill="#15803d" font-size="9" font-weight="bold" font-family="sans-serif">RELÉ OPERACIONAL (SUPERVISÃO OK)</text>
      <text x="24" y="42" fill="#0f172a" font-size="12" font-weight="900" font-family="sans-serif">${mfg} — ${mdl}</text>

      <!-- Régua Lateral Esquerda (Entradas de TC e Sinais) -->
      <text x="14" y="66" fill="#334155" font-size="8" font-weight="bold" font-family="sans-serif">BORNES: ENTRADAS DE CORRENTE</text>
      
      <!-- Terminal TC Ia -->
      <g transform="translate(12, 74)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#dc2626" stroke-width="1.2" />
        <text x="6" y="12" fill="#dc2626" font-size="8" font-weight="bold">BORNES 09 - 10</text>
        <text x="6" y="23" fill="#334155" font-size="7">TC Ia (Fase A - S1/S2)</text>
        <circle cx="128" cy="14" r="3" fill="#dc2626" />
      </g>

      <!-- Terminal TC Ib -->
      <g transform="translate(12, 108)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#334155" stroke-width="1.2" />
        <text x="6" y="12" fill="#334155" font-size="8" font-weight="bold">BORNES 11 - 12</text>
        <text x="6" y="23" fill="#334155" font-size="7">TC Ib (Fase B - S1/S2)</text>
        <circle cx="128" cy="14" r="3" fill="#334155" />
      </g>

      <!-- Terminal TC Ic -->
      <g transform="translate(12, 142)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#0284c7" stroke-width="1.2" />
        <text x="6" y="12" fill="#0284c7" font-size="8" font-weight="bold">BORNES 13 - 14</text>
        <text x="6" y="23" fill="#334155" font-size="7">TC Ic (Fase C - S1/S2)</text>
        <circle cx="128" cy="14" r="3" fill="#0284c7" />
      </g>

      <!-- Terminal TC In -->
      <g transform="translate(12, 176)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#0891b2" stroke-width="1.2" />
        <text x="6" y="12" fill="#0891b2" font-size="8" font-weight="bold">BORNES 15 - 16</text>
        <text x="6" y="23" fill="#334155" font-size="7">TC In / Io (Neutro/Terra)</text>
        <circle cx="128" cy="14" r="3" fill="#0891b2" />
      </g>

      <!-- Terminal Bloqueio / Entrada Lógica -->
      <g transform="translate(12, 210)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#2563eb" stroke-width="1.2" />
        <text x="6" y="12" fill="#2563eb" font-size="8" font-weight="bold">BORNES 07 - 08</text>
        <text x="6" y="23" fill="#334155" font-size="7">Bloqueio / Entrada Digital</text>
        <circle cx="128" cy="14" r="3" fill="#2563eb" />
      </g>

      <!-- Terminal Serial RS-485 -->
      <g transform="translate(12, 244)">
        <rect x="0" y="0" width="138" height="28" rx="3" fill="#fff" stroke="#7c3aed" stroke-width="1.2" />
        <text x="6" y="12" fill="#7c3aed" font-size="8" font-weight="bold">BORNES 23 - 24</text>
        <text x="6" y="23" fill="#334155" font-size="7">RS-485 Modbus / SCADA</text>
        <circle cx="128" cy="14" r="3" fill="#7c3aed" />
      </g>

      <!-- Régua Lateral Direita (Comandos, TRIP e Alimentação) -->
      <text x="172" y="66" fill="#334155" font-size="8" font-weight="bold" font-family="sans-serif">BORNES: COMANDO E POTÊNCIA</text>

      <!-- Alimentação Auxiliar -->
      <g transform="translate(168, 74)">
        <rect x="0" y="0" width="150" height="34" rx="3" fill="#fefce8" stroke="#ca8a04" stroke-width="1.2" />
        <text x="8" y="13" fill="#854d0e" font-size="8" font-weight="bold">BORNES 01 - 02</text>
        <text x="8" y="23" fill="#0f172a" font-size="7.5">Alimentação Auxiliar</text>
        <text x="8" y="31" fill="#713f12" font-size="6.5">72-250Vcc / 80-250Vca</text>
        <circle cx="8" cy="18" r="2.5" fill="#ca8a04" />
      </g>

      <!-- Saída de Disparo TRIP -->
      <g transform="translate(168, 116)">
        <rect x="0" y="0" width="150" height="38" rx="3" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5" />
        <text x="8" y="13" fill="#991b1b" font-size="8.5" font-weight="bold">BORNES 03 - 04 (TRIP)</text>
        <text x="8" y="24" fill="#7f1d1d" font-size="7.5">Saída para Bobina 52/TC</text>
        <text x="8" y="33" fill="#991b1b" font-size="6.5">Contato NA de Alta Capacidade</text>
        <circle cx="8" cy="20" r="2.5" fill="#dc2626" />
      </g>

      <!-- Saída de Sinalização / Alarme -->
      <g transform="translate(168, 162)">
        <rect x="0" y="0" width="150" height="32" rx="3" fill="#fff7ed" stroke="#ea580c" stroke-width="1.2" />
        <text x="8" y="13" fill="#c2410c" font-size="8" font-weight="bold">BORNES 05 - 06</text>
        <text x="8" y="23" fill="#9a3412" font-size="7.5">Alarme / Telemetria NA</text>
        <circle cx="8" cy="18" r="2.5" fill="#ea580c" />
      </g>

      <!-- Terra de Proteção Carcaça (PE) -->
      <g transform="translate(168, 202)">
        <rect x="0" y="0" width="150" height="30" rx="3" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.2" />
        <text x="8" y="13" fill="#15803d" font-size="8" font-weight="bold">BORNE DE TERRA (PE)</text>
        <text x="8" y="23" fill="#166534" font-size="7">Aterramento Carcaça</text>
        <circle cx="8" cy="16" r="2.5" fill="#16a34a" />
      </g>

      <!-- FUNÇÕES ANSI HABILITADAS NO RELÉ -->
      <g transform="translate(12, 285)">
        <rect x="0" y="0" width="306" height="170" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <text x="10" y="16" fill="#0f172a" font-size="9" font-weight="bold" font-family="sans-serif">FUNÇÕES ANSI HABILITADAS &amp; AJUSTES</text>
        
        <rect x="10" y="24" width="62" height="20" rx="2" fill="#eff6ff" stroke="#3b82f6" />
        <text x="41" y="37" fill="#1e40af" font-size="8" font-weight="bold" text-anchor="middle">50 / 51</text>
        
        <rect x="80" y="24" width="68" height="20" rx="2" fill="#eff6ff" stroke="#0284c7" />
        <text x="114" y="37" fill="#075985" font-size="8" font-weight="bold" text-anchor="middle">50N / 51N</text>

        <rect x="156" y="24" width="68" height="20" rx="2" fill="#f0fdf4" stroke="#16a34a" />
        <text x="190" y="37" fill="#14532d" font-size="8" font-weight="bold" text-anchor="middle">50GS / 51G</text>

        <rect x="232" y="24" width="64" height="20" rx="2" fill="#fdf4ff" stroke="#c026d3" />
        <text x="264" y="37" fill="#86198f" font-size="8" font-weight="bold" text-anchor="middle">50D / 50DN</text>

        <text x="10" y="60" fill="#334155" font-size="7.5" font-family="sans-serif">
          • Curvas Inversas: IEC Muito Inversa, Extremamente Inversa, ANSI VI
        </text>
        <text x="10" y="73" fill="#334155" font-size="7.5" font-family="sans-serif">
          • Tempo de Atuação Instantânea: &lt; 35 ms (Tempo total com disjuntor &lt; 90 ms)
        </text>
        <text x="10" y="86" fill="#334155" font-size="7.5" font-family="sans-serif">
          • Seletividade Cronométrica com elo fusível de retaguarda da Concessionária
        </text>
        <text x="10" y="99" fill="#334155" font-size="7.5" font-family="sans-serif">
          • Curto-Circuitador Automático integrado nos bornes de corrente para testes
        </text>
        <text x="10" y="112" fill="#0369a1" font-size="7.5" font-weight="bold" font-family="sans-serif">
          • Parâmetro de Conexão: CEMIG ND 5.3 / Padrão Homologado
        </text>
      </g>
    </g>

    <!-- ========================================================= -->
    <!-- FIAÇÃO EXTERNA ENTRE ELEMENTOS -->
    <!-- ========================================================= -->
    <!-- Fiação TCs -> Bornes do Relé -->
    <g id="ct-wiring" fill="none" stroke-width="1.8">
      <path d="M 240 364 L 330 364 L 330 162 L 412 162" stroke="#dc2626" />
      <path d="M 240 394 L 342 394 L 342 196 L 412 196" stroke="#334155" />
      <path d="M 240 424 L 354 424 L 354 230 L 412 230" stroke="#0284c7" />
      <path d="M 240 454 L 366 454 L 366 264 L 412 264" stroke="#0891b2" />
    </g>

    <!-- Circuito de TRIP: Relé Bornes 03-04 até Bobina 52/TC -->
    <g id="trip-wiring" fill="none" stroke-width="2">
      <path d="M 718 212 L 760 212 L 760 240 L 210 240" stroke="#dc2626" stroke-dasharray="5 3" />
      <text x="750" y="234" fill="#dc2626" font-size="8.5" font-weight="bold" font-family="sans-serif">CIRCUITO DE TRIP (ABERTURA DISJUNTOR)</text>
    </g>

    <!-- ALIMENTAÇÃO AUXILIAR EXTERNA (BANCO DE BATERIAS / RETIFICADOR) -->
    <g id="dc-power" transform="translate(760, 370)">
      <rect x="0" y="0" width="200" height="110" rx="4" fill="#fefce8" stroke="#ca8a04" stroke-width="1.5" />
      <text x="100" y="18" fill="#854d0e" font-size="9.5" font-weight="bold" text-anchor="middle" font-family="sans-serif">FONTE AUXILIAR (CC/CA)</text>
      <text x="100" y="30" fill="#713f12" font-size="7.5" text-anchor="middle" font-family="sans-serif">Banco de Baterias / Retificador</text>
      
      <g transform="translate(20, 42)">
        <circle cx="12" cy="12" r="8" fill="#ca8a04" />
        <text x="12" y="16" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">+</text>
        <text x="28" y="15" fill="#854d0e" font-size="8" font-weight="bold">+ Polo Positivo (125Vcc)</text>
      </g>

      <g transform="translate(20, 72)">
        <circle cx="12" cy="12" r="8" fill="#64748b" />
        <text x="12" y="15" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">-</text>
        <text x="28" y="15" fill="#334155" font-size="8" font-weight="bold">- Polo Negativo (Comum)</text>
      </g>
    </g>

    <!-- Fiação Alimentação até Bornes 01-02 -->
    <path d="M 780 405 L 750 405 L 750 168 L 718 168" fill="none" stroke="#ca8a04" stroke-width="1.5" />
    <path d="M 780 435 L 740 435 L 740 180 L 718 180" fill="none" stroke="#64748b" stroke-width="1.5" />

    <!-- ========================================================= -->
    <!-- NOTAS DE INSTALAÇÃO & SEGURANÇA (RODAPÉ DO DIAGRAMA) -->
    <!-- ========================================================= -->
    <g transform="translate(20, 550)">
      <rect x="0" y="0" width="960" height="75" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" />
      <text x="15" y="16" fill="#b45309" font-size="8.5" font-weight="bold" font-family="sans-serif">NOTAS CRÍTICAS DE ENGENHARIA &amp; SEGURANÇA OPERACIONAL:</text>
      <text x="15" y="30" fill="#0f172a" font-size="7.5" font-family="sans-serif">
        1. NUNCA ABRIR CIRCUITO DE TC EM CARGA: Os secundários dos TCs jamais devem operar em circuito aberto (risco de sobretensão destrutiva fatal).
      </text>
      <text x="15" y="43" fill="#0f172a" font-size="7.5" font-family="sans-serif">
        2. ATERRAMENTO ÚNICO: O secundário comum dos TCs (S2) deve ser aterrado em apenas um ponto para prevenir correntes de circulação na malha de terra.
      </text>
      <text x="15" y="56" fill="#0f172a" font-size="7.5" font-family="sans-serif">
        3. FIAÇÃO DE TRIP: Utilizar condutores de cobre bitola mínima 2,5 mm², com rota protegida de comando direto à bobina 52/TC do disjuntor.
      </text>
      <text x="15" y="68" fill="#0369a1" font-size="7.5" font-weight="bold" font-family="sans-serif">
        4. CONFORMIDADE: Desenho em conformidade com ABNT NBR 14039 e regulamentação da Concessionária para entrada de serviço em Média Tensão.
      </text>
    </g>
  </svg>
  `;
}

/**
 * Gera o documento HTML completo de 2 páginas no Formato A4
 * para envio direto ao spooler de impressão do navegador ou PDF.
 */
export function generateRelayPrintHtml(info: RelayDiagramInfo): string {
  const mfg = escapeHtml(info.manufacturer);
  const mdl = escapeHtml(info.model);
  const cat = escapeHtml(info.category);
  const stds = escapeHtml(info.standards);
  const pwr = escapeHtml(info.powerSupply);
  const ctIn = escapeHtml(info.inputCT);
  const tripOut = escapeHtml(info.tripsOutputs);
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const svgDiagram = getRelayPrintSvg(info);

  // Linhas da tabela de bornes
  const terminalsRows = info.terminalsSummary
    .map(
      t => `
      <tr>
        <td style="padding: 6px 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${t.color}; margin-right: 6px;"></span>
          ${escapeHtml(t.group)}
        </td>
        <td style="padding: 6px 10px; font-family: monospace; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          ${escapeHtml(t.terminals)}
        </td>
        <td style="padding: 6px 10px; color: #334155; border-bottom: 1px solid #e2e8f0;">
          ${escapeHtml(t.description)}
        </td>
        <td style="padding: 6px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 4px;">
            ATIVO
          </span>
        </td>
      </tr>
    `
    )
    .join('');

  // Lista de diretrizes normativas
  const wiringNotesList = info.wiringNotes
    .map(
      n => `
      <li style="margin-bottom: 6px; line-height: 1.4;">
        <strong>•</strong> ${escapeHtml(n)}
      </li>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Diagrama de Ligação - ${mfg} ${mdl} - Formato A4</title>
  <style>
    /* CONFIGURAÇÃO ESTRITA PARA FOLHA FORMATO A4 */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    .a4-sheet {
      width: 100%;
      max-width: 186mm;
      min-height: 275mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      background: #ffffff;
      padding: 0;
    }

    .a4-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* CARIMBO TÉCNICO ABNT */
    .title-block {
      border: 2px solid #0f172a;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .title-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }

    .title-header h1 {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .title-header .badge {
      font-size: 9px;
      font-weight: bold;
      padding: 2px 8px;
      background: #0284c7;
      color: #ffffff;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .title-grid {
      display: grid;
      grid-template-columns: 2fr 1.5fr 1fr 1fr;
      gap: 8px;
      font-size: 9.5px;
    }

    .title-field strong {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      color: #64748b;
    }

    .title-field span {
      font-weight: bold;
      color: #0f172a;
    }

    /* CAIXAS DE DESTAQUE TÉCNICO */
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }

    .spec-card {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 9px;
    }

    .spec-card .lbl {
      font-size: 7.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }

    .spec-card .val {
      font-weight: 800;
      color: #0f172a;
    }

    /* ÁREA DO DIAGRAMA SVG */
    .diagram-container {
      width: 100%;
      border: 1px solid #0f172a;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
      background: #ffffff;
    }

    /* TABELA DE BORNES */
    .terminal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .terminal-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 10px;
      text-align: left;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* SEÇÃO DE CUIDADOS E NORMAS */
    .guidelines-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    .guideline-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      background: #ffffff;
    }

    .guideline-box h3 {
      margin: 0 0 6px 0;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .guideline-box ul {
      margin: 0;
      padding-left: 14px;
      font-size: 8.5px;
    }

    .alert-card {
      padding: 6px 8px;
      border-radius: 3px;
      margin-bottom: 6px;
      font-size: 8px;
      line-height: 1.35;
    }

    .alert-red {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert-amber {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .alert-blue {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
    }

    /* SELO DE ASSINATURA / VISTO TÉCNICO */
    .signature-section {
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 4px;
      display: grid;
      grid-template-columns: 2fr 1.5fr 1fr;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 6px;
    }

    .signature-field {
      border-bottom: 1px solid #0f172a;
      height: 28px;
      margin-bottom: 4px;
    }

    .signature-lbl {
      font-size: 7.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #475569;
    }

    /* RODAPÉ PADRÃO A4 */
    .sheet-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>

  <!-- ============================================================== -->
  <!-- FOLHA 01 / 02: DIAGRAMA UNIFILAR & FUNCIONAL EM FORMATO A4    -->
  <!-- ============================================================== -->
  <div class="a4-sheet">
    <div>
      <!-- CARIMBO DE PROJETO ABNT -->
      <div class="title-block">
        <div class="title-header">
          <div>
            <h1>MEMORIAL &amp; DIAGRAMA DE LIGAÇÃO DE PROTEÇÃO MT</h1>
            <div style="font-size: 9px; color: #475569; font-weight: 500; margin-top: 1px;">
              Padrão Concessionária CEMIG ND 5.3 / ABNT NBR 14039 — Cabine Primária
            </div>
          </div>
          <div class="badge">FOLHA FORMATO A4</div>
        </div>
        <div class="title-grid">
          <div class="title-field">
            <strong>Relé Selecionado:</strong>
            <span>${mfg} — ${mdl}</span>
          </div>
          <div class="title-field">
            <strong>Categoria:</strong>
            <span>${cat}</span>
          </div>
          <div class="title-field">
            <strong>Data de Emissão:</strong>
            <span>${now}</span>
          </div>
          <div class="title-field">
            <strong>Status do Projeto:</strong>
            <span style="color: #15803d;">HOMOLOGADO</span>
          </div>
        </div>
      </div>

      <!-- PARÂMETROS RÁPIDOS -->
      <div class="specs-grid">
        <div class="spec-card">
          <div class="lbl">Alimentação Auxiliar</div>
          <div class="val">${pwr.split(':')[1] || pwr}</div>
        </div>
        <div class="spec-card">
          <div class="lbl">Entradas de TC</div>
          <div class="val">${ctIn.split(':')[1] || ctIn}</div>
        </div>
        <div class="spec-card">
          <div class="lbl">Comando de Disparo</div>
          <div class="val">${tripOut.split(':')[1] || tripOut}</div>
        </div>
        <div class="spec-card">
          <div class="lbl">Normas Aplicáveis</div>
          <div class="val">${stds}</div>
        </div>
      </div>

      <!-- DIAGRAMA TÉCNICO VETORIAL SVG -->
      <div class="diagram-container">
        ${svgDiagram}
      </div>
    </div>

    <!-- RODAPÉ FOLHA 1 -->
    <div class="sheet-footer">
      <span>Estudo de Proteção &amp; Seletividade de Média Tensão — Documento Técnico</span>
      <strong style="color: #0f172a;">FOLHA 01 / 02 — ESQUEMA UNIFILAR &amp; FUNCIONAL (A4)</strong>
      <span>${now}</span>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- FOLHA 02 / 02: PINAGEM DOS BORNES, DIRETRIZES E ASSINATURA    -->
  <!-- ============================================================== -->
  <div class="a4-sheet">
    <div>
      <!-- CARIMBO DE PROJETO ABNT (FOLHA 2) -->
      <div class="title-block">
        <div class="title-header">
          <div>
            <h1>MAPEAMENTO DE BORNES &amp; DIRETRIZES DE COMISSIONAMENTO</h1>
            <div style="font-size: 9px; color: #475569; font-weight: 500; margin-top: 1px;">
              Equipamento: ${mfg} ${mdl} — Proteção de Entrada e Transformadores MT
            </div>
          </div>
          <div class="badge">FOLHA FORMATO A4</div>
        </div>
        <div class="title-grid">
          <div class="title-field">
            <strong>Dispositivo de Proteção:</strong>
            <span>${mfg} — ${mdl}</span>
          </div>
          <div class="title-field">
            <strong>Funções Habilitadas:</strong>
            <span>ANSI 50/51, 50N/51N, 50GS</span>
          </div>
          <div class="title-field">
            <strong>Norma de Referência:</strong>
            <span>ABNT NBR 14039</span>
          </div>
          <div class="title-field">
            <strong>Padrão de Impressão:</strong>
            <span>Formato A4 (210x297mm)</span>
          </div>
        </div>
      </div>

      <!-- TABELA DETALHADA DE PINAGEM -->
      <table class="terminal-table">
        <thead>
          <tr>
            <th style="width: 25%;">Grupo Funcional</th>
            <th style="width: 20%;">Numeração Bornes</th>
            <th style="width: 45%;">Descrição Técnica da Conexão</th>
            <th style="width: 10%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${terminalsRows}
        </tbody>
      </table>

      <!-- DIRETRIZES E CUIDADOS CRÍTICOS -->
      <div class="guidelines-grid">
        <div class="guideline-box">
          <h3 style="color: #15803d;">Diretrizes de Instalação (ABNT NBR 14039)</h3>
          <ul style="color: #334155;">
            ${wiringNotesList}
          </ul>
        </div>

        <div class="guideline-box">
          <h3 style="color: #b45309;">Cuidados Críticos de Segurança</h3>
          <div class="alert-card alert-red">
            <strong>NUNCA ABRIR TC EM CARGA:</strong> Secundários de TC em circuito aberto desenvolvem sobretensões letais de milhares de volts. Utilize chave de aferição com curto-circuitador.
          </div>
          <div class="alert-card alert-amber">
            <strong>ATERRAMENTO ÚNICO:</strong> O condutor de neutro dos TCs (S2) deve ser aterrado em apenas um ponto na malha para evitar correntes circulantes na unidade 51N.
          </div>
          <div class="alert-card alert-blue">
            <strong>ENSAIO DE TRIP:</strong> Executar o disparo manual pela tecla de teste do relé para conferir a bobina 52/TC antes da energização da cabine primária.
          </div>
        </div>
      </div>

      <!-- CARIMBO DE VISTO TÉCNICO DE ENGENHARIA -->
      <div class="signature-section">
        <div>
          <div class="signature-field"></div>
          <div class="signature-lbl">Responsável Técnico / Engenheiro Eletricista</div>
        </div>
        <div>
          <div class="signature-field"></div>
          <div class="signature-lbl">Registro CREA / CFT e Visto Regional</div>
        </div>
        <div>
          <div class="signature-field"></div>
          <div class="signature-lbl">Data do Comissionamento</div>
        </div>
      </div>
    </div>

    <!-- RODAPÉ FOLHA 2 -->
    <div class="sheet-footer">
      <span>Estudo de Proteção &amp; Seletividade de Média Tensão — Documento Técnico</span>
      <strong style="color: #0f172a;">FOLHA 02 / 02 — MAPA DE BORNES &amp; COMISSIONAMENTO (A4)</strong>
      <span>${now}</span>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Aciona o processo de impressão física ou geração de PDF em Formato A4
 * através de um iframe isolado de impressão que nunca sofre interferência
 * do layout ou modo escuro da aplicação.
 */
export async function printRelayDiagram(info: RelayDiagramInfo): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateRelayPrintHtml(info);

      // Remove iframe residual se existir
      const existingIframe = document.getElementById('relay-print-hidden-iframe');
      if (existingIframe && existingIframe.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe);
      }

      // Cria iframe oculto isolado
      const iframe = document.createElement('iframe');
      iframe.id = 'relay-print-hidden-iframe';
      iframe.setAttribute(
        'style',
        'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;'
      );

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Não foi possível acessar o documento do iframe de impressão.');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Aguarda carregamento e renderização dos vetores antes de disparar o print
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            resolve(true);
          } else {
            throw new Error('Janela do iframe não disponível.');
          }
        } catch (printErr) {
          console.warn('Falha no print do iframe, abrindo popup A4 como fallback:', printErr);
          // Fallback para Popup dedicado
          const printWindow = window.open('', '_blank', 'width=900,height=750');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
              resolve(true);
            }, 500);
          } else {
            // Último fallback: print na janela principal
            window.print();
            resolve(false);
          }
        } finally {
          // Remove iframe após fechamento do diálogo
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 60000);
        }
      }, 400);
    } catch (err) {
      console.error('Erro crítico ao disparar impressão do diagrama do relé:', err);
      // Fallback final
      window.print();
      resolve(false);
    }
  });
}
