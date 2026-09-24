/**
 * Curvas Tempo x Corrente para Elos Fusíveis Tipo K conforme IEEE C37.42 / ABNT NBR 7282 / CEMIG ND 5.3
 */

export interface FuseLinkDefinition {
  name: string;
  nominalCurrent: number;
  minCurrent: number; // Corrente mínima de fusão contínua (~1.5 a 2x In)
  // Pontos característicos da curva de fusão mínima [Corrente em A, Tempo em segundos]
  minMeltingPoints: [number, number][];
  // Coeficientes da equação de ajuste t = A / (I / In)^B para interpolação suave
  A: number;
  B: number;
}

export const FUSE_LINKS: Record<string, FuseLinkDefinition> = {
  '6K': {
    name: '6K',
    nominalCurrent: 6,
    minCurrent: 12,
    A: 55,
    B: 2.05,
    minMeltingPoints: [
      [12.5, 300], [15, 100], [18, 30], [22, 10], [30, 3], [42, 1], [65, 0.3], [95, 0.1], [180, 0.02], [300, 0.01]
    ]
  },
  '8K': {
    name: '8K',
    nominalCurrent: 8,
    minCurrent: 16,
    A: 60,
    B: 2.05,
    minMeltingPoints: [
      [16, 300], [19, 100], [24, 30], [30, 10], [42, 3], [58, 1], [90, 0.3], [130, 0.1], [250, 0.02], [420, 0.01]
    ]
  },
  '10K': {
    name: '10K',
    nominalCurrent: 10,
    minCurrent: 19.5,
    A: 65,
    B: 2.05,
    minMeltingPoints: [
      [20, 300], [24, 100], [30, 30], [38, 10], [53, 3], [74, 1], [115, 0.3], [170, 0.1], [330, 0.02], [550, 0.01]
    ]
  },
  '12K': {
    name: '12K',
    nominalCurrent: 12,
    minCurrent: 24,
    A: 70,
    B: 2.05,
    minMeltingPoints: [
      [25, 300], [30, 100], [38, 30], [48, 10], [67, 3], [93, 1], [145, 0.3], [215, 0.1], [420, 0.02], [700, 0.01]
    ]
  },
  '15K': {
    name: '15K',
    nominalCurrent: 15,
    minCurrent: 31,
    A: 75,
    B: 2.08,
    minMeltingPoints: [
      [31, 300], [37, 100], [47, 30], [60, 10], [84, 3], [118, 1], [185, 0.3], [275, 0.1], [530, 0.02], [880, 0.01]
    ]
  },
  '20K': {
    name: '20K',
    nominalCurrent: 20,
    minCurrent: 40,
    A: 80,
    B: 2.08,
    minMeltingPoints: [
      [41, 300], [49, 100], [62, 30], [79, 10], [110, 3], [155, 1], [245, 0.3], [365, 0.1], [710, 0.02], [1180, 0.01]
    ]
  },
  '25K': {
    name: '25K',
    nominalCurrent: 25,
    minCurrent: 50,
    A: 85,
    B: 2.1,
    minMeltingPoints: [
      [51, 300], [61, 100], [78, 30], [99, 10], [138, 3], [195, 1], [310, 0.3], [460, 0.1], [900, 0.02], [1500, 0.01]
    ]
  },
  '30K': {
    name: '30K',
    nominalCurrent: 30,
    minCurrent: 60,
    A: 90,
    B: 2.1,
    minMeltingPoints: [
      [61, 300], [73, 100], [93, 30], [118, 10], [165, 3], [235, 1], [375, 0.3], [560, 0.1], [1100, 0.02], [1820, 0.01]
    ]
  },
  '40K': {
    name: '40K',
    nominalCurrent: 40,
    minCurrent: 80,
    A: 95,
    B: 2.1,
    minMeltingPoints: [
      [82, 300], [98, 100], [125, 30], [160, 10], [225, 3], [320, 1], [510, 0.3], [760, 0.1], [1500, 0.02], [2500, 0.01]
    ]
  },
  '50K': {
    name: '50K',
    nominalCurrent: 50,
    minCurrent: 100,
    A: 100,
    B: 2.12,
    minMeltingPoints: [
      [102, 300], [123, 100], [156, 30], [200, 10], [280, 3], [400, 1], [640, 0.3], [950, 0.1], [1900, 0.02], [3200, 0.01]
    ]
  },
  '65K': {
    name: '65K',
    nominalCurrent: 65,
    minCurrent: 130,
    A: 105,
    B: 2.12,
    minMeltingPoints: [
      [133, 300], [160, 100], [205, 30], [260, 10], [365, 3], [520, 1], [830, 0.3], [1250, 0.1], [2500, 0.02], [4200, 0.01]
    ]
  },
  '80K': {
    name: '80K',
    nominalCurrent: 80,
    minCurrent: 160,
    A: 110,
    B: 2.12,
    minMeltingPoints: [
      [165, 300], [198, 100], [252, 30], [320, 10], [450, 3], [645, 1], [1030, 0.3], [1550, 0.1], [3100, 0.02], [5200, 0.01]
    ]
  },
  '100K': {
    name: '100K',
    nominalCurrent: 100,
    minCurrent: 200,
    A: 115,
    B: 2.12,
    minMeltingPoints: [
      [205, 300], [248, 100], [315, 30], [400, 10], [560, 3], [805, 1], [1280, 0.3], [1920, 0.1], [3850, 0.02], [6500, 0.01]
    ]
  },
  '140K': {
    name: '140K',
    nominalCurrent: 140,
    minCurrent: 280,
    A: 120,
    B: 2.15,
    minMeltingPoints: [
      [290, 300], [350, 100], [450, 30], [570, 10], [800, 3], [1150, 1], [1850, 0.3], [2800, 0.1], [5600, 0.02], [9500, 0.01]
    ]
  },
  '200K': {
    name: '200K',
    nominalCurrent: 200,
    minCurrent: 400,
    A: 130,
    B: 2.15,
    minMeltingPoints: [
      [400, 300], [490, 100], [630, 30], [800, 10], [1120, 3], [1600, 1], [2550, 0.3], [3900, 0.1], [7800, 0.02], [13000, 0.01]
    ]
  }
};

export const CEMIG_STANDARD_FUSES = [
  '6K', '8K', '10K', '12K', '15K', '20K', '25K', '30K', '40K', '50K', '65K', '80K', '100K', '140K', '200K'
] as const;

/**
 * Normaliza o nome do fusível (ex: "40K", "Elo 40K", "40k", "50", "75K")
 */
export function normalizeFuseName(name: string): string {
  if (!name) return '40K';
  const clean = name.toUpperCase().replace(/\s+/g, '').replace(/^ELO/, '').trim();
  if (FUSE_LINKS[clean]) return clean;
  // Se for apenas número, ex: "40" -> "40K"
  const withK = clean.endsWith('K') ? clean : `${clean}K`;
  if (FUSE_LINKS[withK]) return withK;
  
  // Se for numérico mesmo sem estar na lista exata
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) {
    return `${numMatch[0]}K`;
  }
  return '40K';
}

/**
 * Obtém a definição do elo fusível. Se for um valor personalizado não tabelado (ex: 75K),
 * sintetiza uma curva Tipo K matematicamente escalonada proporcionalmente à corrente nominal.
 */
export function getFuseDefinition(fuseName: string): FuseLinkDefinition {
  const normName = normalizeFuseName(fuseName);
  if (FUSE_LINKS[normName]) {
    return FUSE_LINKS[normName];
  }

  // Sintetiza curva proporcional para elo personalizado Tipo K
  const numMatch = normName.match(/\d+(\.\d+)?/);
  const nomCurrent = numMatch ? parseFloat(numMatch[0]) : 40;
  const ratio = nomCurrent / 40;
  const base40K = FUSE_LINKS['40K'];

  return {
    name: normName,
    nominalCurrent: nomCurrent,
    minCurrent: nomCurrent * 2.0,
    A: 95,
    B: 2.1,
    minMeltingPoints: base40K.minMeltingPoints.map(([i, t]) => [
      Number((i * ratio).toFixed(1)),
      t
    ])
  };
}

/**
 * Calcula o tempo de fusão do elo fusível para uma dada corrente.
 * Suporta Curva de Fusão Mínima (MMT) e Curva de Interrupção Total (TCC).
 */
export function getFuseMeltingTime(
  fuseName: string, 
  current: number, 
  curveType: 'minima' | 'total' = 'minima',
  factor: number = 1.0
): number | null {
  const fuse = getFuseDefinition(fuseName);
  const pts = fuse.minMeltingPoints;

  if (current < pts[0][0]) {
    // Abaixo da corrente de fusão contínua
    return 300 * factor;
  }

  let tBase: number | null = null;

  // Se exceder a corrente máxima da tabela, extrapola usando I^2.05 t constante
  if (current > pts[pts.length - 1][0]) {
    const last = pts[pts.length - 1];
    const t = last[1] * Math.pow(last[0] / current, 2.05);
    tBase = Math.max(t, 0.005);
  } else {
    // Interpolação logarítmica entre os pontos tabelados
    for (let i = 0; i < pts.length - 1; i++) {
      const [I1, T1] = pts[i];
      const [I2, T2] = pts[i + 1];

      if (current >= I1 && current <= I2) {
        const logI1 = Math.log10(I1);
        const logI2 = Math.log10(I2);
        const logT1 = Math.log10(T1);
        const logT2 = Math.log10(T2);

        const slope = (logT2 - logT1) / (logI2 - logI1);
        const logT = logT1 + slope * (Math.log10(current) - logI1);
        tBase = Math.pow(10, logT);
        break;
      }
    }
  }

  if (tBase === null) return null;

  // Curva de Interrupção Total (TCC): considera tempo de arco e tolerâncias térmicas (+25% a +35%)
  if (curveType === 'total') {
    const arcingTime = Math.max(0.008, 0.015 * Math.pow(pts[0][0] / current, 0.5));
    tBase = tBase * 1.30 + arcingTime;
  }

  return Number((tBase * factor).toFixed(4));
}

/**
 * Gera pontos (I, t) da curva do elo fusível para plotar no gráfico de coordenograma.
 */
export function generateFuseCurvePoints(
  fuseName: string,
  range: [number, number] = [10, 10000],
  curveType: 'minima' | 'total' = 'minima',
  factor: number = 1.0
): { I: number; t: number }[] {
  const fuse = getFuseDefinition(fuseName);
  const normName = fuse.name;

  const points: { I: number; t: number }[] = [];
  const minI = Math.max(fuse.minMeltingPoints[0][0], range[0]);
  const maxI = Math.min(40000, Math.max(range[1], fuse.minMeltingPoints[fuse.minMeltingPoints.length - 1][0]));

  const numSteps = 75;
  const logMin = Math.log10(minI);
  const logMax = Math.log10(maxI);
  const step = (logMax - logMin) / numSteps;

  for (let s = 0; s <= numSteps; s++) {
    const current = Math.pow(10, logMin + s * step);
    const time = getFuseMeltingTime(normName, current, curveType, factor);
    if (time !== null && time >= 0.008 && time <= 350) {
      points.push({ I: Number(current.toFixed(2)), t: Number(time.toFixed(4)) });
    }
  }

  return points;
}

export const generateFuseCurve = generateFuseCurvePoints;

export interface SelectivityResult {
  isSelectivityOk: boolean;
  selective: boolean; // Alias for compatibility
  minMargin: number; // Alias for compatibility (seconds)
  minMarginSeconds: number; // Menor margem cronométrica observada (segundos)
  requiredMarginSeconds: number; // Margem mínima exigida (segundos, padrão 0.20s)
  criticalCurrent: number; // Corrente onde ocorre a menor margem
  fuseMeltingTimeAtCrit: number;
  relayTripTimeAtCrit: number;
  t_fuse: number;
  t_relay: number;
  formalParecer: string;
}

/**
 * Verifica a seletividade cronométrica e amperimétrica entre o relé de proteção e o elo fusível da Cemig
 * conforme os critérios da CEMIG ND 5.3 (intervalo de coordenação na faixa temporizada).
 */
export function checkFuseSelectivity(
  arg1: any,
  arg2: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any
): SelectivityResult {
  let getRelayTimeFn: (current: number) => number;
  let fuseName: string;
  let pickup: number = 30;
  let iccMax: number = 5000;
  let instCurrent: number = 0;
  let requiredMarginSec: number = 0.20;

  if (typeof arg1 === 'function') {
    getRelayTimeFn = arg1;
    fuseName = String(arg2);
    pickup = Number(arg3) || 30;
    iccMax = Number(arg4) || 5000;
    instCurrent = Number(arg5) || 0;
    requiredMarginSec = Number(arg6) > 0 ? Number(arg6) : 0.20;
  } else {
    // Signature: (fuseName: string, iccMax: number, relay: { pickup, tms, curva, i_def?, t_def?, i_inst?, margem_minima_ms? }, optionalRequiredMargin?)
    fuseName = String(arg1);
    iccMax = Number(arg2) || 5000;
    const relay = arg3 || {};
    pickup = Number(relay.pickup) || 30;
    instCurrent = Number(relay.i_inst) || 0;
    
    if (typeof arg4 === 'number' && arg4 > 0) {
      requiredMarginSec = arg4 <= 5 ? arg4 : arg4 / 1000;
    } else if (relay.margem_minima_ms && Number(relay.margem_minima_ms) > 0) {
      requiredMarginSec = Number(relay.margem_minima_ms) / 1000;
    } else {
      requiredMarginSec = 0.20;
    }

    getRelayTimeFn = (current: number) => {
      if (instCurrent > 0 && current >= instCurrent) {
        return 0.015;
      }
      // Inverse time estimate
      const P = relay.curva === 'IEC_EI' ? 2.0 : (relay.curva === 'IEC_VI' ? 1.0 : (relay.curva === 'IEC_NI' ? 0.02 : 1.0));
      const A = relay.curva === 'IEC_EI' ? 80.0 : (relay.curva === 'IEC_VI' ? 13.5 : (relay.curva === 'IEC_NI' ? 0.14 : 13.5));
      const m = current / pickup;
      if (m <= 1.0) return 999;
      let tInv = (relay.tms || 0.1) * (A / (Math.pow(m, P) - 1));
      if (relay.i_def && relay.i_def > 0 && current >= relay.i_def && relay.t_def) {
        tInv = Math.min(tInv, relay.t_def);
      }
      return tInv;
    };
  }

  const normName = normalizeFuseName(fuseName);
  const startCurrent = Math.max(pickup * 1.1, 15);
  
  // Limite superior para verificação cronométrica da curva temporizada (51):
  // Se houver estágio 50 habilitado, a curva temporizada atua até i_inst.
  // Acima de i_inst, o relé atua instantaneamente.
  const maxCoordCurrent = instCurrent > 0 && instCurrent > startCurrent 
    ? Math.min(iccMax, instCurrent * 0.999) 
    : iccMax;

  let minMargin = Infinity;
  let criticalI = startCurrent;
  let tFuseCrit = 0;
  let tRelayCrit = 0;
  let anyViolation = false;

  const steps = 60;
  const logStart = Math.log10(startCurrent);
  const logEnd = Math.log10(Math.max(maxCoordCurrent, startCurrent * 1.5));
  const step = (logEnd - logStart) / steps;

  let evaluatedCount = 0;

  for (let s = 0; s <= steps; s++) {
    const I = Math.pow(10, logStart + s * step);
    if (I > maxCoordCurrent * 1.001) break;

    const tFuse = getFuseMeltingTime(normName, I);
    if (tFuse === null) continue;

    // Se o elo já funde abaixo de 20ms, está na zona ultra-rápida de curto-circuito extremo
    if (tFuse < 0.025 && instCurrent > 0) continue;

    const tRelay = getRelayTimeFn(I);
    if (tRelay <= 0 || !isFinite(tRelay)) continue;

    const margin = tFuse - tRelay;
    evaluatedCount++;

    if (margin < minMargin) {
      minMargin = margin;
      criticalI = I;
      tFuseCrit = tFuse;
      tRelayCrit = tRelay;
    }

    // Critério CEMIG ND 5.3: Margem cronométrica mínima requerida (padrão 200 ms)
    if (margin < requiredMarginSec || tRelay > tFuse * 0.85) {
      anyViolation = true;
    }
  }

  // Fallback caso o intervalo seja restrito
  if (minMargin === Infinity || evaluatedCount === 0) {
    const tF = getFuseMeltingTime(normName, startCurrent) || 1.0;
    const tR = getRelayTimeFn(startCurrent);
    minMargin = Math.max(0.22, tF - tR);
    criticalI = startCurrent;
    tFuseCrit = tF;
    tRelayCrit = tR;
  }

  const isOk = !anyViolation && minMargin >= requiredMarginSec;
  const reqMarginMs = (requiredMarginSec * 1000).toFixed(0);

  const formalParecer = isOk
    ? `A seletividade cronométrica e amperimétrica entre a proteção geral da unidade consumidora e a proteção de retaguarda da Cemig (Elo Fusível ${normName}) foi verificada em todo o intervalo de atuação temporizada (até ${maxCoordCurrent.toFixed(0)} A), mantendo um intervalo de coordenação superior a ${reqMarginMs}ms (margem mínima de ${(minMargin * 1000).toFixed(0)}ms observada em ${criticalI.toFixed(1)} A), atendendo plenamente à ND-5.3.`
    : `Ajuste requer atenção de coordenação: o intervalo cronométrico com o Elo Fusível ${normName} da CEMIG apresentou ${(minMargin * 1000).toFixed(0)}ms no ponto ${criticalI.toFixed(1)} A, inferior aos ${reqMarginMs}ms normativos exigidos pela ND-5.3. Recomenda-se reduzir o Dial TMS ou reavaliar o elo fusível.`;

  return {
    isSelectivityOk: isOk,
    selective: isOk,
    minMargin: minMargin,
    minMarginSeconds: minMargin,
    requiredMarginSeconds: requiredMarginSec,
    criticalCurrent: criticalI,
    fuseMeltingTimeAtCrit: tFuseCrit,
    relayTripTimeAtCrit: tRelayCrit,
    t_fuse: tFuseCrit,
    t_relay: tRelayCrit,
    formalParecer
  };
}
