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
 * Calcula Pontos ANSI para um transformador
 */
export function calculateANSIPoints(kva: number, v_prim: number, z_pct: number) {
  const In = calculateInominal(kva, v_prim);
  const I_ansi = (100 / z_pct) * In;
  
  return [
    { label: `${kva}kVA ANSI Mech`, I: I_ansi, t: 0.1, type: 'ANSI' },
    { label: `${kva}kVA ANSI Therm`, I: I_ansi * 0.58, t: 3, type: 'ANSI' }
  ];
}

/**
 * Calcula Ponto de Magnetização (Inrush)
 */
export function calculateInrushPoint(kva: number, v_prim: number) {
  const In = calculateInominal(kva, v_prim);
  return { label: `${kva}kVA Inrush`, I: In * 8, t: 0.1, type: 'INRUSH' };
}
