export const SPEC_C6_Q_WRAP = 'b:Qc6,Pd6,Pg6'

export type Turn = 'white' | 'black'

export function urlForSpec(spec: string, turn: Turn = 'white'): string {
  const q = new URLSearchParams({ board: spec, turn }).toString()
  return `/?${q}`
}


