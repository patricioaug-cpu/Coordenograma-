export interface Concessionaria {
  id: string;
  nome: string;
  estado: string;
  normas: string[];
  margens: {
    coord_fase: number; // segundos
    coord_neutro: number;
    instantaneo: boolean;
  };
}

export const CONCESSIONARIAS: Concessionaria[] = [
  {
    id: 'enel_sp',
    nome: 'Enel SP',
    estado: 'SP',
    normas: ['ABNT NBR 14039', 'CNC-OMBR-ENS-18-001', 'CNC-OMBR-ENS-18-002'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'light_rj',
    nome: 'Light',
    estado: 'RJ',
    normas: ['ABNT NBR 14039', 'Recon BT/MT', 'N-15.001'],
    margens: { coord_fase: 0.4, coord_neutro: 0.3, instantaneo: false }
  },
  {
    id: 'cemig_mg',
    nome: 'CEMIG',
    estado: 'MG',
    normas: ['ABNT NBR 14039', 'ND 5.3', 'ND 5.1'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'cpfl_paulista',
    nome: 'CPFL Paulista',
    estado: 'SP',
    normas: ['ABNT NBR 14039', 'GED 13', 'GED 119'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'neoenergia_elektro',
    nome: 'Elektro',
    estado: 'SP',
    normas: ['DIS-NOR-030'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'equatorial_al',
    nome: 'Equatorial AL',
    estado: 'AL',
    normas: ['NT-001'],
    margens: { coord_fase: 0.4, coord_neutro: 0.3, instantaneo: false }
  },
  {
    id: 'copel_pr',
    nome: 'Copel',
    estado: 'PR',
    normas: ['ABNT NBR 14039', 'NTC 841001', 'NTC 901110'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'energisa_mt',
    nome: 'Energisa MT',
    estado: 'MT',
    normas: ['NT-01'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'cpfl_piratininga',
    nome: 'CPFL Piratininga',
    estado: 'SP',
    normas: ['GED 13', 'GED 119'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  },
  {
    id: 'energisa_ss',
    nome: 'Energisa Sul-Sudeste',
    estado: 'SP/MG',
    normas: ['NT-01', 'NT-22'],
    margens: { coord_fase: 0.3, coord_neutro: 0.2, instantaneo: true }
  }
];
