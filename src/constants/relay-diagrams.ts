export interface RelayDiagramInfo {
  manufacturer: string;
  model: string;
  category: string;
  description: string;
  powerSupply: string;
  inputCT: string;
  inputVT?: string;
  tripsOutputs: string;
  comms?: string;
  standards: string;
  terminalsSummary: {
    group: string;
    terminals: string;
    description: string;
    color: string;
  }[];
  svgType: 'pextron' | 'sel' | 'schneider' | 'siemens' | 'abb' | 'ziv' | 'generic';
  wiringNotes: string[];
}

export const RELAY_DIAGRAMS_DATABASE: Record<string, RelayDiagramInfo> = {
  // Pextron URPE 7104
  "URPE 7104": {
    manufacturer: "Pextron",
    model: "URPE 7104",
    category: "Relé Digital Microprocessado de Sobrecorrente (50/51, 50N/51N)",
    description: "Esquema funcional de bornes para proteção de cabine primária e subestações em média tensão com TRIP capacitivo e bloqueio externo.",
    powerSupply: "Bornes 01-02: 72 a 250 Vca/Vcc (Fonte Auxiliar) + Fonte Capacitiva Interna",
    inputCT: "Bornes 09-10 (Ia), 11-12 (Ib), 13-14 (Ic), 15-16 (In/Io) - TC Secundário 5A ou 1A",
    inputVT: "Bornes 17-18, 19-20, 21-22 (Tensão de Fase/Linha 115V / 220V no URPE 7104T)",
    tripsOutputs: "Bornes 03-04: Disparo Bobina de Abertura (TRIP 1 / Capacitivo) | Bornes 05-06: Alarme/Sinalização",
    comms: "Bornes 23-24 (A+, B-, GND): Serial RS-485 Modbus RTU",
    standards: "ABNT NBR 14039 / IEEE C37.90 / IEC 60255",
    svgType: "pextron",
    terminalsSummary: [
      { group: "Alimentação Auxiliar", terminals: "01 (+) - 02 (-)", description: "Alimentação 72-250Vcc / 80-250Vca com filtro de surtos", color: "#eab308" },
      { group: "Comando de TRIP (52/TC)", terminals: "03 - 04 (NA)", description: "Comando de abertura para bobina do disjuntor (TRIP rápido)", color: "#ef4444" },
      { group: "Saída de Sinalização (Alarme)", terminals: "05 - 06 (NA)", description: "Contatos de alarme remoto e telemedição", color: "#f97316" },
      { group: "Entrada Digital / Bloqueio", terminals: "07 - 08", description: "Entrada digital optoisolada de bloqueio externo", color: "#3b82f6" },
      { group: "TC Corrente Fase A", terminals: "09 (S1) - 10 (S2)", description: "Secundário de TC Fase A (5A/1A)", color: "#10b981" },
      { group: "TC Corrente Fase B", terminals: "11 (S1) - 12 (S2)", description: "Secundário de TC Fase B (5A/1A)", color: "#10b981" },
      { group: "TC Corrente Fase C", terminals: "13 (S1) - 14 (S2)", description: "Secundário de TC Fase C (5A/1A)", color: "#10b981" },
      { group: "TC Corrente Neutro/Residual", terminals: "15 (S1) - 16 (S2)", description: "Secundário TC Neutro ou soma fasorial interna", color: "#06b6d4" },
      { group: "Terra de Proteção (PE)", terminals: "Carcaça / Terra", description: "Aterramento equipotencial da blindagem e painel", color: "#84cc16" },
    ],
    wiringNotes: [
      "Os bornes dos secundários de TC (09 a 16) devem ser aterrados em apenas 1 ponto na régua de bornes externa (S2 ao PE).",
      "O relé URPE 7104 possui gaveta extraível com curto-circuitador automático interno para os circuitos de corrente durante manutenção.",
      "Para comando de TRIP, conecte o borne 03 ao polo positivo do circuito de comando e o borne 04 diretamente à bobina de disparo do disjuntor (52/TC).",
      "Mantenha a bitola mínima recomendada de 2,5 mm² para condutores de corrente e alimentação, e 4,0 mm² para o condutor de proteção (PE)."
    ]
  },

  // SEL-751
  "SEL-751": {
    manufacturer: "Schweitzer Engineering Laboratories (SEL)",
    model: "SEL-751",
    category: "Relé de Proteção de Alimentador e Gerenciamento Inteligente",
    description: "Diagrama esquemático de conexões para entradas de corrente analógicas (SLOT Z / A), tensões trifásicas e contatos de disparo.",
    powerSupply: "Bornes A01-A02: Fonte Auxiliar 110-240Vca / 110-250Vcc ou 24-48Vcc",
    inputCT: "Slot Z: Z01-Z02 (Ia), Z03-Z04 (Ib), Z05-Z06 (Ic), Z07-Z08 (In/IG)",
    inputVT: "Slot Z: Z09-Z12 (Va, Vb, Vc, Vs/Vn) em conexão estrela (Wye) ou delta aberto",
    tripsOutputs: "OUT101 (A03-A04): Bobina de Trip (52a/52b) | OUT102: Fechamento (52/CC)",
    comms: "Porta EIA-232 / EIA-485 / Ethernet RJ45 / DNP3 / IEC 61850",
    standards: "IEEE C37.90 / IEC 60255 / SELogic",
    svgType: "sel",
    terminalsSummary: [
      { group: "Power Supply", terminals: "A01 (+) - A02 (-)", description: "Alimentação da CPU do relé com proteção galvânica", color: "#eab308" },
      { group: "Trip Output (OUT101)", terminals: "A03 - A04", description: "Contato de alta velocidade Fast Hybrid para TRIP da bobina", color: "#ef4444" },
      { group: "Close Output (OUT102)", terminals: "A05 - A06", description: "Comando de fechamento do disjuntor", color: "#22c55e" },
      { group: "Entrada Analógica Ia", terminals: "Z01 - Z02", description: "Secundário TC Fase A polarizado (5A nominal)", color: "#10b981" },
      { group: "Entrada Analógica Ib", terminals: "Z03 - Z04", description: "Secundário TC Fase B polarizado (5A nominal)", color: "#10b981" },
      { group: "Entrada Analógica Ic", terminals: "Z05 - Z06", description: "Secundário TC Fase C polarizado (5A nominal)", color: "#10b981" },
      { group: "Entrada Analógica In/IG", terminals: "Z07 - Z08", description: "Secundário TC Neutro residual ou toroide 50G", color: "#06b6d4" },
      { group: "Aterramento Chassis", terminals: "GND Screw", description: "Parafuso traseiro ligado diretamente à malha de aterramento", color: "#84cc16" },
    ],
    wiringNotes: [
      "Conecte o polo comum dos TCs (S2) em estrela e aterre em apenas um ponto na régua de bornes.",
      "O contato OUT101 suporta 30A em regime de pulso para acionamento direto de bobinas sem necessidade de relé auxiliar multiplicador.",
      "Assegure cabo blindado trançado para os canais de comunicação serial ou par trançado CAT6 para portas Ethernet IEC 61850."
    ]
  },

  // Sepam Series 40
  "Sepam Series 40": {
    manufacturer: "Schneider Electric",
    model: "Sepam Series 40 (S40 / S41 / S42)",
    category: "Relé Modular de Proteção e Controle para Subestações",
    description: "Esquema de pinagem e conectores do módulo base: conectores CCA630 (TCs), CCA620 (Alimentação/Relés) e CSH30.",
    powerSupply: "Conector A (Bornes 1-2): 24-250 Vcc / 100-240 Vca",
    inputCT: "Conector B (CCA630): Entradas 1A/5A para TCs de Fase e Neutro Residual",
    inputVT: "Conector B (CCA620/CCA622): Entradas de TP Fase-Fase e Tensão Residual",
    tripsOutputs: "Relés O1-O2: Comando de Disparo Disjuntor (TRIP) | Relés O3-O4: Bloqueio / Indicação",
    comms: "Módulo ACE949-2 / ACE959 (RS485 Modbus) ou ACE969 (Modbus TCP / IEC 61850)",
    standards: "IEC 60255 / EN 50263 / UTE C",
    svgType: "schneider",
    terminalsSummary: [
      { group: "Alimentação Base (A)", terminals: "A01 (+) - A02 (-)", description: "Alimentação auxiliar 24 a 250Vcc", color: "#eab308" },
      { group: "Disparo O1 (TRIP)", terminals: "A03 - A04 (O1)", description: "Contato de atuação rápida para bobina MX de abertura", color: "#ef4444" },
      { group: "Fechamento O2 (XF)", terminals: "A05 - A06 (O2)", description: "Contato de fechamento para bobina XF", color: "#22c55e" },
      { group: "Entradas Corrente I1-I2-I3", terminals: "CCA630 (1 a 6)", description: "Conector específico com garras e curto-circuito automático", color: "#10b981" },
      { group: "Entrada Toroide Io", terminals: "CCA630 (7 - 8)", description: "Entrada para transformador de núcleo toroidal tipo CSH120/CSH200", color: "#06b6d4" },
    ],
    wiringNotes: [
      "O conector de corrente CCA630 possui travas de segurança mecânicas que curto-circuitam os TCs caso desconectado.",
      "Para medição de terra ultrassensível (50G/51G), utilize o sensor toroidal homologado CSH30, CSH120 ou CSH200 com cabo coaxial blindado.",
      "Garanta alimentação contínua via banco de baterias ou fonte no-break confiável."
    ]
  },

  // Siprotec 7SJ62
  "Siprotec 7SJ62": {
    manufacturer: "Siemens",
    model: "Siprotec 7SJ62",
    category: "Relé Numérico Multifuncional de Proteção de Sobrecorrente",
    description: "Esquema elétrico de terminais e réguas traseiras (Bornes Q1 a Q8 para TCs e réguas de controle).",
    powerSupply: "Bornes L1 - N/L2: 60/125/250 Vcc ou 115/230 Vca",
    inputCT: "Terminais Q1-Q2 (IL1), Q3-Q4 (IL2), Q5-Q6 (IL3), Q7-Q8 (IN) para 1A ou 5A",
    inputVT: "Terminais de medição de tensão nos modelos 7SJ623 / 7SJ624",
    tripsOutputs: "Relés de Comando de Trip rápidos de estado sólido e contatos eletromecânicos",
    comms: "Porta traseira de fibra óptica, RS-485 ou Ethernet Profibus/IEC 61850",
    standards: "IEC 60255 / IEEE C37.90 / VDE 0435",
    svgType: "siemens",
    terminalsSummary: [
      { group: "Alimentação Auxiliar", terminals: "P1 (+) - P2 (-)", description: "Entrada de alimentação estabilizada com isolação de 2kV", color: "#eab308" },
      { group: "Comando TRIP 1", terminals: "C1 - C2", description: "Contato de comando de abertura do disjuntor principal", color: "#ef4444" },
      { group: "Entrada TC Fase L1", terminals: "Q1 - Q2", description: "Secundário de TC Fase A / L1", color: "#10b981" },
      { group: "Entrada TC Fase L2", terminals: "Q3 - Q4", description: "Secundário de TC Fase B / L2", color: "#10b981" },
      { group: "Entrada TC Fase L3", terminals: "Q5 - Q6", description: "Secundário de TC Fase C / L3", color: "#10b981" },
      { group: "Entrada TC Neutro IN", terminals: "Q7 - Q8", description: "Secundário de TC residual ou toroide homopolar", color: "#06b6d4" },
    ],
    wiringNotes: [
      "Régua de bornes tipo anel de alto aperto mecânico para conexão direta sem riscos de abertura de secundário de TC.",
      "Configuração de polaridade dos TCs pode ser invertida via software (DIGSI) caso a instalação física tenha sido invertida."
    ]
  },

  // REF 615
  "REF 615": {
    manufacturer: "ABB",
    model: "REF 615 (Relion Series)",
    category: "Relé de Proteção e Controle de Alimentador Dedicado",
    description: "Esquema de conexões do conector analógico X120 (TCs/TPs) e conectores de controle X100/X110 com suporte nativo a IEC 61850.",
    powerSupply: "Conector X100 (Bornes 1-2): 48-250 Vcc / 100-240 Vca",
    inputCT: "Conector X120: Bornes 1-2 (IL1), 3-4 (IL2), 5-6 (IL3), 7-8 (Io)",
    inputVT: "Conector X120: Bornes 9-14 para medição de tensões de linha/fase",
    tripsOutputs: "Conector X105 / X110: Saídas digitais de alta capacidade de corte (HSO / PO)",
    comms: "Porta ótica LC ou RJ45 Ethernet dupla redundante (PRP / HSR)",
    standards: "IEC 61850 Ed. 1 e Ed. 2 / IEC 60255",
    svgType: "abb",
    terminalsSummary: [
      { group: "Alimentação X100", terminals: "X100 (1 - 2)", description: "Alimentação do dispositivo de proteção", color: "#eab308" },
      { group: "Master Trip Output", terminals: "X105 (1 - 2)", description: "Saída eletromecânica de alta velocidade reforçada", color: "#ef4444" },
      { group: "Corrente TC IL1", terminals: "X120 (1 - 2)", description: "Entrada de corrente fase A", color: "#10b981" },
      { group: "Corrente TC IL2", terminals: "X120 (3 - 4)", description: "Entrada de corrente fase B", color: "#10b981" },
      { group: "Corrente TC IL3", terminals: "X120 (5 - 6)", description: "Entrada de corrente fase C", color: "#10b981" },
      { group: "Corrente TC Io", terminals: "X120 (7 - 8)", description: "Entrada de corrente de neutro homopolar", color: "#06b6d4" },
    ],
    wiringNotes: [
      "A família Relion REF 615 possui mecanismo extraível 'pluggable' patenteado com curto-circuitador automático integrado.",
      "Permite trip direto sem chave de trip auxiliar devido aos contatos reforçados de abertura rápida."
    ]
  },

  // ZIV IRV
  "IRV": {
    manufacturer: "ZIV",
    model: "IRV",
    category: "Relé de Proteção de Sobrecorrente e Falta à Terra",
    description: "Esquema funcional de bornes para proteção de alimentadores e cabines de média tensão ZIV.",
    powerSupply: "Bornes A1-A2: 110-250 Vcc / 110-230 Vca",
    inputCT: "Bornes B1-B2 (Ia), B3-B4 (Ib), B5-B6 (Ic), B7-B8 (In)",
    tripsOutputs: "Bornes C1-C2 (TRIP Disjuntor), C3-C4 (Sinalização)",
    standards: "IEC 60255 / IEEE",
    svgType: "ziv",
    terminalsSummary: [
      { group: "Alimentação", terminals: "A1 (+) - A2 (-)", description: "Fonte auxiliar CC/CA", color: "#eab308" },
      { group: "TRIP Disjuntor", terminals: "C1 - C2", description: "Contato de disparo para bobina de abertura", color: "#ef4444" },
      { group: "TC Fase A", terminals: "B1 - B2", description: "Secundário de TC Fase A", color: "#10b981" },
      { group: "TC Fase B", terminals: "B3 - B4", description: "Secundário de TC Fase B", color: "#10b981" },
      { group: "TC Fase C", terminals: "B5 - B6", description: "Secundário de TC Fase C", color: "#10b981" },
      { group: "TC Neutro", terminals: "B7 - B8", description: "Secundário de TC Neutro", color: "#06b6d4" },
    ],
    wiringNotes: [
      "Conexão trifásica com 3 TCs de fase e 1 de neutro, ou configuração residual 3 TCs.",
      "Bornes extraíveis com parafuso de fixação de segurança."
    ]
  }
};

/**
 * Função utilitária para obter ou gerar diagrama para qualquer modelo
 */
export function getRelayDiagram(manufacturer: string, model: string): RelayDiagramInfo {
  // 1. Busca exata
  if (RELAY_DIAGRAMS_DATABASE[model]) {
    return RELAY_DIAGRAMS_DATABASE[model];
  }

  // 2. Busca por modelo similar (case insensitive)
  const key = Object.keys(RELAY_DIAGRAMS_DATABASE).find(k => 
    k.toLowerCase() === model.toLowerCase() || 
    model.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(model.toLowerCase())
  );

  if (key) {
    return RELAY_DIAGRAMS_DATABASE[key];
  }

  // 3. Fallback inteligente baseado no fabricante
  const mfg = manufacturer.toLowerCase();
  let defaultSvgType: RelayDiagramInfo['svgType'] = 'generic';
  if (mfg.includes('pextron')) defaultSvgType = 'pextron';
  else if (mfg.includes('sel') || mfg.includes('schweitzer')) defaultSvgType = 'sel';
  else if (mfg.includes('schneider') || mfg.includes('sepam')) defaultSvgType = 'schneider';
  else if (mfg.includes('siemens') || mfg.includes('siprotec')) defaultSvgType = 'siemens';
  else if (mfg.includes('abb')) defaultSvgType = 'abb';
  else if (mfg.includes('ziv')) defaultSvgType = 'ziv';

  return {
    manufacturer: manufacturer || "Genérico / Norma ABNT",
    model: model || "Padrão Subestação ABNT NBR 14039",
    category: `Relé de Proteção Digital Microprocessado (50/51/50N/51N) - ${manufacturer || 'Subestação'}`,
    description: `Diagrama esquemático padronizado de conexões e bornes para o relé ${model || 'de proteção'} da fabricante ${manufacturer || 'homologada'}.`,
    powerSupply: "Bornes Alimentação: 72 a 250 Vca/Vcc (Fonte Auxiliar)",
    inputCT: "Entradas de TC (Ia, Ib, Ic, In): Secundário 5A / 1A em conexão Estrela (Wye)",
    tripsOutputs: "Contatos de Disparo (TRIP): Bobina de Abertura do Disjuntor (52/TC) e Bloqueio",
    standards: "ABNT NBR 14039 / IEC 60255 / CEMIG ND 5.3",
    svgType: defaultSvgType,
    terminalsSummary: [
      { group: "Alimentação Auxiliar", terminals: "01 (+) - 02 (-)", description: "Alimentação contínua ou alternada de comando", color: "#eab308" },
      { group: "Comando de TRIP (52/TC)", terminals: "03 - 04 (NA)", description: "Comando de disparo para bobina de abertura do disjuntor", color: "#ef4444" },
      { group: "Sinalização / Alarme", terminals: "05 - 06 (NA)", description: "Contato para alarme sonoro / telemedição", color: "#f97316" },
      { group: "TC Corrente Fase A", terminals: "09 (S1) - 10 (S2)", description: "Medição de sobrecorrente fase A", color: "#10b981" },
      { group: "TC Corrente Fase B", terminals: "11 (S1) - 12 (S2)", description: "Medição de sobrecorrente fase B", color: "#10b981" },
      { group: "TC Corrente Fase C", terminals: "13 (S1) - 14 (S2)", description: "Medição de sobrecorrente fase C", color: "#10b981" },
      { group: "TC Corrente Neutro/Terra", terminals: "15 (S1) - 16 (S2)", description: "Sensibilidade para faltas monofásicas de terra (50N/51N)", color: "#06b6d4" },
      { group: "Terra de Proteção (PE)", terminals: "Carcaça", description: "Aterramento da carcaça do relé e blindagens", color: "#84cc16" },
    ],
    wiringNotes: [
      `Conexão dos secundários de TC para o modelo ${model} conforme padrão ABNT NBR 14039.`,
      "O condutor de aterramento dos TCs deve ser unificado na régua de bornes externa e conectado à malha da cabine.",
      "Assegure que os contatos de disparo possuam capacidade de interrupção compatível com a bobina de abertura do disjuntor."
    ]
  };
}
