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

import { checkFuseSelectivity } from './fuse-curves';

/**
 * Calcula Pontos ANSI para um transformador conforme IEEE C57.109 / NBR 5356 / CEMIG ND 5.3
 * Categoria I: até 500 kVA
 * Categoria II: 501 a 1667 kVA (Mono) ou até 5000 kVA (Tri)
 */
export function calculateANSIPoints(kva: number, v_prim: number, z_pct: number) {
  const In = calculateInominal(kva, v_prim);
  const I_sc = (100 / z_pct) * In;
  // Conforme CEMIG ND 5.3 Anexo A: Ponto ANSI de Neutro é 0.58 x ANSI de Fase com tempo de 3.0s
  const I_sc_neutro = I_sc * 0.58;
  
  if (kva <= 500) {
    // Categoria I: Ponto térmico único em 2s
    return [
      { label: `ANSI Fase (${I_sc.toFixed(1)}A @ 2s)`, I: I_sc, t: 2, type: 'ANSI' },
      { label: `ANSI Neutro (${I_sc_neutro.toFixed(1)}A @ 3s)`, I: I_sc_neutro, t: 3, type: 'ANSI' },
      { label: `Sombreamento (C57.109)`, I: In * 50, t: 0.1, type: 'ANSI' } // Aproximação da curva de carregabilidade
    ];
  } else {
    // Categoria II: Curva de dano térmico e mecânico
    // Freqüentemente usado pontos 2s, 10s e 0.1s (Limite mecânico)
    return [
      { label: `ANSI Fase (${I_sc.toFixed(1)}A @ 2s)`, I: I_sc, t: 2, type: 'ANSI' },
      { label: `ANSI Neutro (${I_sc_neutro.toFixed(1)}A @ 3s)`, I: I_sc_neutro, t: 3, type: 'ANSI' },
      { label: `ANSI (4.08s)`, I: I_sc * 0.7, t: 4.08, type: 'ANSI' },
      { label: `ANSI (10s)`, I: I_sc * 0.45, t: 10, type: 'ANSI' },
      { label: `Limite Mecânico`, I: I_sc * 0.8, t: 0.1, type: 'ANSI' }
    ];
  }
}

/**
 * Calcula Ponto de Magnetização (Inrush) conforme NBR 14039 e CEMIG ND 5.3
 * Conforme ND 5.3 atual: I_rush = 8 x In com duração de 0.1s para trafos a óleo e epóxi até 2000 kVA,
 * salvo utilização de dado do fabricante.
 */
export function calculateInrushPoint(kva: number, v_prim: number, customMultiplier?: number) {
  const In = calculateInominal(kva, v_prim);
  const multiplier = customMultiplier && customMultiplier > 0 ? customMultiplier : 8;
  return { label: `Inrush (${multiplier}x In = ${(In * multiplier).toFixed(1)}A @ 0.1s)`, I: In * multiplier, t: 0.1, type: 'INRUSH' };
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
  const InomPlanta = calculateInPlant(study.demanda_nova, study.trafo_v_prim, study.fator_potencia);
  const baseIn = Math.max(In, InomPlanta);
  const lowerLimit = baseIn * 1.0;
  const upperLimit = baseIn * 1.4;
  if (Ip_fase > upperLimit) {
    suggestions.push(`Ajuste de Fase elevado (${(Ip_fase/baseIn).toFixed(2)}x In). Sugerido manter entre 1.05x e 1.30x da nominal para conformidade normativa.`);
  } else if (Ip_fase < lowerLimit) {
    suggestions.push("Ajuste de Fase muito sensível. Risco de atuação indevida por sobrecarga cíclica.");
  }

  // 2. Sensibilidade de Neutro (Proteção de Faltas de Alta Impedância)
  if (Ip_neutro > baseIn * 0.4) {
    suggestions.push("Proteção de Neutro (51N) pouco sensível. Recomendado reduzir para aproximadamente 20% a 33% da corrente de fase.");
  }

  // 3. Unidade Instantânea vs Magnetização, Menor Icc e Ponto ANSI (Critérios CEMIG ND-5.3)
  if (study.rele_fase?.i_inst && study.rele_fase.i_inst > 0) {
    const instDiag = validateInstPhaseND53(study);
    if (!instDiag.isValid) {
      instDiag.messages.forEach(msg => suggestions.push(msg));
    }
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

  // 6. Seletividade com o Elo Fusível da Concessionária (Análise Dinâmica conforme ND 5.3)
  if (study.fusivel_concessionaria && study.rele_fase) {
    const relayPhaseTime = (I: number) => calculateActualRelayTime(
      I,
      study.rele_fase?.pickup ?? 0,
      study.rele_fase?.tms ?? 0.1,
      study.rele_fase?.curva || 'IEC_NI',
      study.rele_fase?.A !== undefined ? { A: study.rele_fase.A, B: study.rele_fase.B, P: study.rele_fase.P } : undefined,
      study.rele_fase?.i_def ?? 0,
      study.rele_fase?.t_def ?? 0,
      study.rele_fase?.i_inst ?? 0
    );
    const reqMarginSec = (study.margem_seletividade_minima_ms && study.margem_seletividade_minima_ms > 0)
      ? study.margem_seletividade_minima_ms / 1000
      : 0.20;

    const selResult = checkFuseSelectivity(
      relayPhaseTime,
      study.fusivel_concessionaria,
      study.rele_fase?.pickup ?? 0,
      study.icc_3f || 5000,
      study.rele_fase?.i_inst ?? 0,
      reqMarginSec
    );

    if (!selResult.isSelectivityOk) {
      const minReqMs = (selResult.requiredMarginSeconds * 1000).toFixed(0);
      suggestions.push(
        `Seletividade Cronométrica com Elo Fusível ${study.fusivel_concessionaria}: Margem de ${(selResult.minMarginSeconds * 1000).toFixed(0)}ms em ${selResult.criticalCurrent.toFixed(1)}A (Mínimo exigido: ${minReqMs}ms). Clique em "Ajuste CEMIG ND 5.3" para otimizar TMS ou edite o estágio 50.`
      );
    }
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



/**
 * Determina o ponto ANSI e a corrente de dano térmico do menor transformador da instalação
 * Conforme critério da CEMIG ND-5.3
 */
export function calculateSmallestTrafoANSI(study: any): { ansiCurrent: number; label: string; kva: number } {
  const vPrim = study.trafo_v_prim || 13800;
  
  // Transformador principal (potência unitária de 1 trafo)
  const mainKva = study.trafo_kva || 500;
  const mainZ = study.trafo_z || 5;
  const mainIn = calculateInominal(mainKva, vPrim);
  const mainAnsi = (100 / mainZ) * mainIn;
  
  let smallestAnsi = mainAnsi;
  let smallestLabel = `Trafo Principal (${mainKva} kVA, Z=${mainZ}%)`;
  let smallestKva = mainKva;
  
  // Verifica transformadores adicionais
  if (Array.isArray(study.equipamentos)) {
    study.equipamentos
      .filter((e: any) => e.tipo === 'Transformador' && Number(e.kva) > 0)
      .forEach((eq: any) => {
        const eqKva = Number(eq.kva);
        const eqZ = Number(eq.z || 5);
        const eqVprim = Number(eq.v_prim || vPrim);
        const eqIn = calculateInominal(eqKva, eqVprim);
        const eqAnsi = (100 / eqZ) * eqIn;
        if (eqAnsi < smallestAnsi) {
          smallestAnsi = eqAnsi;
          smallestLabel = `Trafo Adicional (${eqKva} kVA, Z=${eqZ}%)`;
          smallestKva = eqKva;
        }
      });
  }
  
  return {
    ansiCurrent: Number(smallestAnsi.toFixed(1)),
    label: smallestLabel,
    kva: smallestKva
  };
}

/**
 * Calcula o menor curto-circuito da instalação
 * Conforme critério da CEMIG ND-5.3 (normalmente Icc 2φ = 0.866 x Icc 3φ)
 */
export function calculateMinShortCircuit(study: any): { iccMin: number; label: string } {
  const icc3f = Number(study.icc_3f || 5000);
  const icc2f = icc3f * 0.866; // Curto-circuito bifásico mínimo
  const icc1f = study.icc_1f && Number(study.icc_1f) > 0 ? Number(study.icc_1f) : Infinity;
  const iccMinStudy = study.icc_min && Number(study.icc_min) > 0 ? Number(study.icc_min) : Infinity;
  
  const minVal = Math.min(icc2f, icc1f, iccMinStudy);
  let label = 'Icc 2φ (0.866 × Icc 3φ)';
  if (minVal === icc1f) label = 'Icc 1φ Mínimo';
  else if (minVal === iccMinStudy) label = 'Icc Mínimo Informado';
  
  return {
    iccMin: Number(minVal.toFixed(1)),
    label
  };
}

export interface InstPhaseND53Validation {
  isValid: boolean;
  inrushCurrent: number;
  maxAllowedInrushMargin: number; // inrush * 1.05
  minShortCircuit: number;
  smallestTrafoAnsi: number;
  smallestTrafoLabel: string;
  marginPercentOverInrush: number;
  status: 'compliant' | 'below_inrush' | 'exceeds_inrush_5pct' | 'exceeds_icc_min' | 'exceeds_ansi';
  messages: string[];
  suggestedValue: number;
}

/**
 * Validação rigorosa da unidade instantânea de fase (função 50)
 * segundo os critérios estritos da CEMIG ND-5.3:
 * 1. Menor valor possível que não provoque atuação indevida na energização (> Inrush)
 * 2. No máximo 5% acima da corrente de magnetização (≤ 1.05 × Inrush)
 * 3. Não superar o menor curto-circuito (≤ Icc mín)
 * 4. Não superar o ponto ANSI do menor transformador (≤ ANSI menor trafo)
 */
export function validateInstPhaseND53(study: any): InstPhaseND53Validation {
  const mainTotalKva = (study.trafo_kva || 500) * (study.trafo_qtd || 1);
  const In = calculateInominal(mainTotalKva, study.trafo_v_prim || 13800);
  const inrushMult = study.inrush_multiplicador && study.inrush_multiplicador > 0 ? study.inrush_multiplicador : 8;
  const inrushCurrent = Number((In * inrushMult).toFixed(1));
  const maxAllowedInrush = Number((inrushCurrent * 1.05).toFixed(1)); // máximo 5% acima da magnetização
  
  const { iccMin } = calculateMinShortCircuit(study);
  const { ansiCurrent: smallestTrafoAnsi, label: smallestTrafoLabel } = calculateSmallestTrafoANSI(study);
  
  const iInst = Number(study.rele_fase?.i_inst || 0);
  const messages: string[] = [];
  let status: InstPhaseND53Validation['status'] = 'compliant';
  
  const marginPercentOverInrush = inrushCurrent > 0 && iInst > 0 
    ? Number((((iInst - inrushCurrent) / inrushCurrent) * 100).toFixed(1)) 
    : 0;

  // Limite superior máximo imposto pela ND 5.3:
  const maxAllowedND53 = Math.min(maxAllowedInrush, iccMin, smallestTrafoAnsi);
  
  // Menor valor possível que não provoque atuação indevida na energização
  // (isto é, ligeiramente acima do inrush, com teto de +5%, e limitado por Icc e ANSI)
  const suggestedValue = Math.round(Math.min(maxAllowedInrush, Math.max(inrushCurrent + 1, maxAllowedND53)));

  if (iInst === 0) {
    status = 'below_inrush';
    messages.push('Unidade Instantânea de Fase (50) desabilitada (0A).');
  } else if (iInst <= inrushCurrent) {
    status = 'below_inrush';
    messages.push(
      `ATENÇÃO: Inst. Fase 50 (${iInst}A) ≤ Corrente de Magnetização Inrush (${inrushCurrent}A). Risco de atuação indevida na energização a frio segundo a ND-5.3.`
    );
  } else if (iInst > maxAllowedInrush) {
    status = 'exceeds_inrush_5pct';
    messages.push(
      `ATENÇÃO: Inst. Fase 50 (${iInst}A) supera em mais de 5% a corrente de magnetização (limite ND-5.3: máx. ${maxAllowedInrush}A = +5%). Deve ser ajustada no menor valor possível até +5%.`
    );
  }
  
  if (iInst > iccMin) {
    status = 'exceeds_icc_min';
    messages.push(
      `ATENÇÃO: Inst. Fase 50 (${iInst}A) supera o menor curto-circuito (${iccMin}A). A proteção não operará instantaneamente para faltas mínimas.`
    );
  }
  
  if (iInst > smallestTrafoAnsi) {
    status = 'exceeds_ansi';
    messages.push(
      `ATENÇÃO: Inst. Fase 50 (${iInst}A) supera o ponto ANSI do menor transformador [${smallestTrafoLabel}: ${smallestTrafoAnsi}A]. Risco de danos térmicos e mecânicos ao transformador.`
    );
  }

  const isValid = iInst > inrushCurrent && iInst <= maxAllowedInrush && iInst <= iccMin && iInst <= smallestTrafoAnsi;

  return {
    isValid,
    inrushCurrent,
    maxAllowedInrushMargin: maxAllowedInrush,
    minShortCircuit: iccMin,
    smallestTrafoAnsi,
    smallestTrafoLabel,
    marginPercentOverInrush,
    status,
    messages,
    suggestedValue
  };
}
