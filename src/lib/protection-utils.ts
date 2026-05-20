/**
 * Cálculo de Curvas de Proteção (IEC / ANSI)
 */

export type CurveType = 'IEC_NI' | 'IEC_VI' | 'IEC_EI' | 'IEC_LONG' | 'ANSI_VI' | 'ANSI_EI' | 'ANSI_MI' | 'CUSTOM';

export interface CurveParams {
  A: number;
  B: number;
  P: number;
}

export const CURVE_CONSTANTS: Record<Exclude<CurveType, 'CUSTOM'>, CurveParams> = {
  IEC_NI: { A: 0.14, B: 0, P: 0.02 },       // Normal Inverse
  IEC_VI: { A: 13.5, B: 0, P: 1 },        // Very Inverse
  IEC_EI: { A: 80, B: 0, P: 2 },          // Extremely Inverse
  IEC_LONG: { A: 120, B: 0, P: 1 },       // Long Time Inverse (Custom for utility/specific relays)
  ANSI_VI: { A: 19.61, B: 0.491, P: 2 },  // IEEE Very Inverse
  ANSI_EI: { A: 28.2, B: 0.1217, P: 2 },  // IEEE Extremely Inverse
  ANSI_MI: { A: 0.0515, B: 0.114, P: 0.02 }, // IEEE Moderately Inverse
};

/**
 * Calcula o tempo de atuação (t) em segundos conforme IEC 60255 ou IEEE C37.112
 * IEC: t = TMS * (A / ( (I/Ipickup)^P - 1 ))
 * IEEE: t = TD * ( (A / ( (I/Ipickup)^P - 1 )) + B )
 */
export function calculateTime(I: number, Ipickup: number, TMS: number, type: CurveType, customParams?: CurveParams): number {
  const constants = type === 'CUSTOM' ? (customParams || { A: 0.14, B: 0, P: 0.02 }) : CURVE_CONSTANTS[type as keyof typeof CURVE_CONSTANTS];
  const ratio = I / Ipickup;
  
  if (ratio <= 1.05) return 1000; // Limite de não-atuação (pickup realístico)
  
  const isIEEE = type.startsWith('ANSI');
  const denominator = Math.pow(ratio, constants.P) - 1;
  const t = isIEEE 
    ? TMS * (constants.A / denominator + constants.B)
    : (constants.A / denominator) * TMS + constants.B;
  
  return Math.max(0.01, t); // Tempo mínimo de processamento
}

/**
 * Gera pontos para plotagem (I, t)
 */
export function generateCurvePoints(Ipickup: number, TMS: number, type: CurveType, Irange: [number, number], customParams?: CurveParams) {
  const points: { I: number; t: number }[] = [];
  const start = Math.max(Ipickup * 1.1, Irange[0]);
  const end = Irange[1];
  
  // Escala logarítmica para pontos
  let current = start;
  while (current <= end) {
    points.push({ I: current, t: calculateTime(current, Ipickup, TMS, type, customParams) });
    current *= 1.1; 
    if (current > end) break;
  }
  
  return points;
}

/**
 * Gera curva completa do relé incluindo segmentos de tempo definido e instantâneo
 */
export function generateFullRelayCurve(
  Ipickup: number, 
  TMS: number, 
  type: CurveType, 
  Irange: [number, number], 
  customParams?: CurveParams,
  i_def?: number,
  t_def?: number,
  i_inst?: number
) {
  const start = Math.max(Ipickup * 1.05, Irange[0]);
  const end = Irange[1];
  
  // Criar uma lista de correntes de teste
  const currentsSet = new Set<number>();
  
  // Amostragem padrão logarítmica/densa
  let cur = start;
  while (cur <= end) {
    currentsSet.add(cur);
    cur *= 1.05; // Amostragem densa para curvas perfeitamente suaves
  }
  
  // Injetar pontos de transição exatos para gerar degraus verticais precisos
  if (i_def && i_def > 0 && i_def > start && i_def < end) {
    currentsSet.add(i_def - 0.01);
    currentsSet.add(i_def);
  }
  if (i_inst && i_inst > 0 && i_inst > start && i_inst < end) {
    currentsSet.add(i_inst - 0.01);
    currentsSet.add(i_inst);
  }
  
  // Ordenar as correntes
  const currents = Array.from(currentsSet).sort((a, b) => a - b);
  
  const points: { I: number; t: number }[] = [];
  
  for (const I of currents) {
    // 1. Calcular tempo inverso básico
    let t = calculateTime(I, Ipickup, TMS, type, customParams);
    
    // 2. Aplicar unidade de tempo definido (51/50 - 2º estágio)
    if (i_def && t_def && i_def > 0 && I >= i_def) {
      t = Math.min(t, t_def);
    }
    
    // 3. Aplicar unidade instantânea (50)
    if (i_inst && i_inst > 0 && I >= i_inst) {
      t = 0.015;
    }
    
    points.push({ I, t });
  }
  
  return points;
}

/**
 * Calcula Corrente Nominal do Trafo (In)
 */
export function calculateInominal(kva: number, v_prim: number): number {
  return (kva) / (v_prim * Math.sqrt(3) / 1000);
}

/**
 * Calcula Corrente Nominal da Planta baseado na Demanda (In)
 */
export function calculateInPlant(demanda_kw: number, v_prim: number, fp: number): number {
  return (demanda_kw) / (v_prim * Math.sqrt(3) * fp / 1000);
}

/**
 * Calcula Pontos ANSI para um transformador conforme IEEE C57.109 / NBR 5356
 * Categoria I: até 500 kVA
 * Categoria II: 501 a 1667 kVA (Mono) ou até 5000 kVA (Tri)
 */
export function calculateANSIPoints(kva: number, v_prim: number, z_pct: number) {
  const In = calculateInominal(kva, v_prim);
  const I_sc = (100 / z_pct) * In;
  
  if (kva <= 500) {
    // Categoria I: Ponto térmico único em 2s
    return [
      { label: `ANSI ${kva}kVA (2s)`, I: I_sc, t: 2, type: 'ANSI' },
      { label: `Sombreamento (C57.109)`, I: In * 50, t: 0.1, type: 'ANSI' } // Aproximação da curva de carregabilidade
    ];
  } else {
    // Categoria II: Curva de dano térmico e mecânico
    // Freqüentemente usado pontos 2s, 10s e 0.1s (Limite mecânico)
    return [
      { label: `ANSI ${kva}kVA (2s)`, I: I_sc, t: 2, type: 'ANSI' },
      { label: `ANSI (4.08s)`, I: I_sc * 0.7, t: 4.08, type: 'ANSI' },
      { label: `ANSI (10s)`, I: I_sc * 0.45, t: 10, type: 'ANSI' },
      { label: `Limite Mecânico`, I: I_sc * 0.8, t: 0.1, type: 'ANSI' }
    ];
  }
}

/**
 * Calcula Ponto de Magnetização (Inrush) conforme NBR 14039
 * Geralmente 8x a 12x In por 0.1s
 */
export function calculateInrushPoint(kva: number, v_prim: number) {
  const In = calculateInominal(kva, v_prim);
  // Regra prática segura: 12x In para trafos pequenos/médios, 8x para grandes em 0.1s
  // Cemig ND 5.3 sugere 8x a 12x. Adotando 12x para garantir não atuação na energização fria.
  const multiplier = kva <= 300 ? 12 : 10;
  return { label: `${kva}kVA Inrush`, I: In * multiplier, t: 0.1, type: 'INRUSH' };
}

/**
 * Calcula Ponto de Partida de Motor (Inrush)
 * Usualmente 6x a 8x In por tempo de partida (ex: 100ms para pico ou 5s para partida completa)
 */
export function calculateMotorInrush(kw: number, v_nom: number, pf: number = 0.85, eta: number = 0.9) {
  // P = sqrt(3) * V * I * PF * eta => I = P / (sqrt(3) * V * PF * eta)
  const In = (kw) / (v_nom * Math.sqrt(3) * pf * eta / 1000);
  return { label: `${kw}kW Motor`, I: In * 6, t: 0.1, type: 'INRUSH' };
}

/**
 * Valida o TC em relação à corrente de curto-circuito e saturação
 */
export function validateTC(tc_relacao: string, icc_3f: number, inom_planta: number) {
  const parts = tc_relacao.split('/');
  if (parts.length !== 2) return { ok: false, msg: 'Relação de TC inválida (use X/5)', sugestao: null };
  const rtc_primary = Number(parts[0]);
  const rtc_secondary = Number(parts[1]);
  if (isNaN(rtc_primary) || isNaN(rtc_secondary)) return { ok: false, msg: 'Relação de TC inválida', sugestao: null };

  const rtc = rtc_primary / rtc_secondary;
  const factor = icc_3f / rtc_primary;

  // Critério 1: Saturação (máximo 20x nominal para proteção padrão)
  if (factor > 20) {
    const ideal_primary = Math.ceil(icc_3f / 20 / 5) * 5; // Arredonda para múltiplo de 5
    return {
      ok: false,
      msg: `Risco de Saturação! A corrente de CC (${icc_3f}A) é ${factor.toFixed(2)}x a nominal do TC.`,
      sugestao: `${ideal_primary}/5`
    };
  }

  // Critério 2: Capacidade de carga (TC deve ser >= Inom_planta)
  if (rtc_primary < inom_planta) {
     const ideal_primary = Math.ceil(inom_planta / 5) * 5;
     return {
       ok: false,
       msg: `Subdimensionado! A corrente da planta (${inom_planta.toFixed(2)}A) supera o TC (${rtc_primary}A).`,
       sugestao: `${ideal_primary}/5`
     };
  }

  return { ok: true, msg: 'TC Adequado para as correntes de CC e carga.', sugestao: null };
}

/**
 * Gera sugestões técnicas baseadas nas normas ABNT NBR 14039 e regulamentos de concessionárias
 */
export function getTechnicalSuggestions(study: any) {
  const suggestions: string[] = [];
  const In = calculateInominal(study.trafo_kva * (study.trafo_qtd || 1), study.trafo_v_prim);
  const Ip_fase = study.rele_fase.pickup;
  const Ip_neutro = study.rele_neutro.pickup;
  
  // 1. Sensibilidade de Fase (Cemig ND 5.3 / CPFL GED 13)
  const lowerLimit = In * 1.1;
  const upperLimit = In * 1.3;
  if (Ip_fase > upperLimit) {
    suggestions.push(`Ajuste de Fase elevado (${(Ip_fase/In).toFixed(2)}x In). Sugerido manter entre 1.1x e 1.3x In para conformidade normativa.`);
  } else if (Ip_fase < lowerLimit) {
    suggestions.push("Ajuste de Fase muito sensível. Risco de atuação indevida por sobrecarga cíclica.");
  }

  // 2. Sensibilidade de Neutro (Proteção de Faltas de Alta Impedância)
  if (Ip_neutro > In * 0.3) {
    suggestions.push("Proteção de Neutro (51N) pouco sensível. Recomendado reduzir para no máximo 30% da corrente de carga para detectar faltas monopolares.");
  }

  // 3. Unidade Instantânea vs Magnetização
  const inrush = In * 10;
  if (study.rele_fase.i_inst && study.rele_fase.i_inst > 0 && study.rele_fase.i_inst < inrush) {
    suggestions.push(`Unidade Instantânea (50) abaixo do Inrush estimado de ${inrush.toFixed(2)}A. Risco iminente de queda do disjuntor na energização.`);
  }

  // 4. Proteção de Tensão (ANSI 27/59)
  if (study.funcoes_adicionais?.['27']?.habilitada) {
    const v27 = study.funcoes_adicionais['27'].v_pick;
    if (v27 < 85) suggestions.push("Ajuste de Subtensão (27) muito baixo (normalmente 90-92% da nominal).");
  }
  if (study.funcoes_adicionais?.['59']?.habilitada) {
    const v59 = study.funcoes_adicionais['59'].v_pick;
    if (v59 > 115) suggestions.push("Ajuste de Sobretensão (59) elevado (recomendado max 110%).");
  }

  // 5. Proteção Direcional (ANSI 67)
  if (study.funcoes_adicionais?.['67']?.habilitada) {
    const ang67 = study.funcoes_adicionais['67'].angulo;
    if (ang67 !== 30 && ang67 !== 45 && ang67 !== 60) {
      suggestions.push("Ângulo de torque da proteção direcional (67) fora do padrão usual (30°/45°/60°). Verificar manual do relé.");
    }
  }

  // 6. Seletividade com o Elo Fusível
  if (study.fusivel_concessionaria) {
    suggestions.push("Verificar seletividade cronométrica (mínimo 200ms) em relação ao elo fusível da concessionária em todo o range de CC.");
  }

  // 5. TC Saturação (re-calculado aqui para centralizar)
  const validation = validateTC(study.tc_relacao, study.icc_3f, calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia));
  if (!validation.ok) {
    suggestions.push(`CRÍTICO: ${validation.msg}`);
    if (validation.sugestao) {
      suggestions.push(`Ação Corretiva: Substituir TCs por relação ${validation.sugestao}.`);
    }
  }

  // 6. Classe de Exatidão
  if (study.tc_classe) {
    if (study.tc_classe.toUpperCase().includes('10B')) {
       const voltageStr = study.tc_classe.match(/\d+$/)?.[0];
       if (voltageStr && Number(voltageStr) < 50) {
         suggestions.push("Classe de exatidão baixa (tensão de saturação < 50V). Recomendado 10B100 ou superior para proteção.");
       }
    }
  }

  return suggestions;
}

/**
 * Calcula o tempo real de atuação considerando os estágios temporizado (51), tempo definido (51/50 DT) e instantâneo (50)
 */
export function calculateActualRelayTime(
  I: number,
  Ipickup: number,
  TMS: number,
  type: CurveType,
  customParams?: CurveParams,
  i_def?: number,
  t_def?: number,
  i_inst?: number
): number {
  // Se houver unidade instantânea habilitada e a corrente superá-la
  if (i_inst && i_inst > 0 && I >= i_inst) {
    return 0.015; // 15ms
  }

  // Se houver unidade de tempo definido habilitada e a corrente superá-la
  if (i_def && i_def > 0 && I >= i_def) {
    const t_inv = calculateTime(I, Ipickup, TMS, type, customParams);
    if (t_def && t_def > 0) {
      return Math.min(t_inv, t_def);
    }
  }

  // Apenas a unidade temporizada (51)
  return calculateTime(I, Ipickup, TMS, type, customParams);
}

