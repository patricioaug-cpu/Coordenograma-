/**
 * Cálculo de Curvas de Proteção (IEC / ANSI)
 */

export type CurveType = 'IEC_NI' | 'IEC_VI' | 'IEC_EI' | 'IEC_LONG' | 'ANSI_VI' | 'ANSI_EI' | 'CUSTOM';

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
  ANSI_VI: { A: 19.61, B: 0.491, P: 2 },  // ANSI Very Inverse (simplificado)
  ANSI_EI: { A: 28.2, B: 0.1217, P: 2 },  // ANSI Extremely Inverse (simplificado)
};

/**
 * Calcula o tempo de atuação (t) em segundos
 * t = (A / ( (I/Ipickup)^P - 1 )) * TMS + B
 */
export function calculateTime(I: number, Ipickup: number, TMS: number, type: CurveType, customParams?: CurveParams): number {
  const constants = type === 'CUSTOM' ? (customParams || { A: 0.14, B: 0, P: 0.02 }) : CURVE_CONSTANTS[type as keyof typeof CURVE_CONSTANTS];
  const ratio = I / Ipickup;
  
  if (ratio <= 1.1) return 1000; // Não atua abaixo do pickup (approx)
  
  const denominator = Math.pow(ratio, constants.P) - 1;
  const t = (constants.A / denominator) * TMS + constants.B;
  
  return t;
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
  let points = generateCurvePoints(Ipickup, TMS, type, Irange, customParams);
  
  // Aplicar unidade de tempo definido (51/50 - 2º estágio)
  if (i_def && t_def && i_def > 0) {
     points = points.map(p => {
       if (p.I >= i_def) {
         return { ...p, t: Math.min(p.t, t_def) };
       }
       return p;
     });
  }

  // Aplicar unidade instantânea (50)
  if (i_inst && i_inst > 0) {
    const limitedPoints = points.filter(p => p.I < i_inst);
    if (limitedPoints.length > 0) {
      const last = limitedPoints[limitedPoints.length - 1];
      // Adicionar degrau vertical
      limitedPoints.push({ I: i_inst, t: last.t });
      limitedPoints.push({ I: i_inst, t: 0.01 });
      return limitedPoints;
    }
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
 * Calcula Pontos ANSI para um transformador conforme IEEE C57.109
 */
export function calculateANSIPoints(kva: number, v_prim: number, z_pct: number) {
  const In = calculateInominal(kva, v_prim);
  const I_ansi = (100 / z_pct) * In;
  
  if (kva <= 500) {
    // Categoria I: Ponto único
    return [
      { label: `${kva}kVA ANSI (Cat I)`, I: I_ansi, t: 2, type: 'ANSI' }
    ];
  } else {
    // Categoria II: Dois pontos (Início da curva de dano)
    return [
      { label: `${kva}kVA ANSI (Cat II) - 2s`, I: I_ansi, t: 2, type: 'ANSI' },
      { label: `${kva}kVA ANSI (Cat II) - 10s`, I: I_ansi * 0.5, t: 10, type: 'ANSI' },
      { label: `${kva}kVA ANSI Mech`, I: I_ansi, t: 0.1, type: 'ANSI' }
    ];
  }
}

/**
 * Calcula Ponto de Magnetização (Inrush) conforme NBR 14039
 * Geralmente 8x a 12x In por 0.1s
 */
export function calculateInrushPoint(kva: number, v_prim: number) {
  const In = calculateInominal(kva, v_prim);
  // Usando 10x In como média normativa segura para 100ms
  return { label: `${kva}kVA Inrush`, I: In * 10, t: 0.1, type: 'INRUSH' };
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
      msg: `Risco de Saturação! A corrente de CC (${icc_3f}A) é ${factor.toFixed(1)}x a nominal do TC.`,
      sugestao: `${ideal_primary}/5`
    };
  }

  // Critério 2: Capacidade de carga (TC deve ser >= Inom_planta)
  if (rtc_primary < inom_planta) {
     const ideal_primary = Math.ceil(inom_planta / 5) * 5;
     return {
       ok: false,
       msg: `Subdimensionado! A corrente da planta (${inom_planta.toFixed(1)}A) supera o TC (${rtc_primary}A).`,
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
  const In = calculateInominal(study.trafo_kva, study.trafo_v_prim);
  const Ip_fase = study.rele_fase.pickup;
  const Ip_neutro = study.rele_neutro.pickup;
  
  // 1. Sensibilidade de Fase
  if (Ip_fase > In * 1.5) {
    suggestions.push("Ajuste de Fase (51) elevado. Sugerido reduzir para entre 1.1x e 1.3x In para melhor proteção térmica.");
  } else if (Ip_fase < In * 1.05) {
    suggestions.push("Ajuste de Fase (51) muito sensível. Risco de atuação indevida com flutuações de carga.");
  }

  // 2. Sensibilidade de Neutro
  if (Ip_neutro > In * 0.5) {
    suggestions.push("Ajuste de Neutro (51N) pouco sensível. Recomendado reduzir para < 30% da In para detecção de faltas de alta impedância.");
  }

  // 3. Unidade Instantânea vs Magnetização
  const inrush = In * 10;
  if (study.rele_fase.i_inst && study.rele_fase.i_inst > 0 && study.rele_fase.i_inst < inrush) {
    suggestions.push(`Unidade Instantânea (50) abaixo do Inrush estimado de ${inrush.toFixed(1)}A. Risco iminente de queda do disjuntor na energização.`);
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
