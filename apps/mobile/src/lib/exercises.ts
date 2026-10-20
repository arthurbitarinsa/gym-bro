// Fixed exercise catalog for the Logbook: no free text, so nothing to moderate, and every
// lift of the same exercise is comparable. Names: en, fr, nl, de, es, it, pt.
export type Group = 'push' | 'pull' | 'legs' | 'core'
export type Exercise = { key: string, group: Group, names: string[] }

export const LANG_ORDER = ['en', 'fr', 'nl', 'de', 'es', 'it', 'pt']

export const EXERCISES: Exercise[] = [
  // push
  { key: 'bench_press', group: 'push', names: ['Bench press', 'Développé couché', 'Bankdrukken', 'Bankdrücken', 'Press de banca', 'Panca piana', 'Supino reto'] },
  { key: 'incline_bench_press', group: 'push', names: ['Incline bench press', 'Développé incliné', 'Schuine bankdruk', 'Schrägbankdrücken', 'Press inclinado', 'Panca inclinata', 'Supino inclinado'] },
  { key: 'dumbbell_bench_press', group: 'push', names: ['Dumbbell bench press', 'Développé couché haltères', 'Bankdrukken met dumbbells', 'Kurzhantel-Bankdrücken', 'Press de banca con mancuernas', 'Panca con manubri', 'Supino com halteres'] },
  { key: 'overhead_press', group: 'push', names: ['Overhead press', 'Développé militaire', 'Schouderpers', 'Schulterdrücken', 'Press militar', 'Military press', 'Desenvolvimento militar'] },
  { key: 'dumbbell_shoulder_press', group: 'push', names: ['Dumbbell shoulder press', 'Développé épaules haltères', 'Schouderpers met dumbbells', 'Kurzhantel-Schulterdrücken', 'Press de hombros con mancuernas', 'Shoulder press con manubri', 'Desenvolvimento com halteres'] },
  { key: 'lateral_raise', group: 'push', names: ['Lateral raise', 'Élévations latérales', 'Zijwaartse raises', 'Seitheben', 'Elevaciones laterales', 'Alzate laterali', 'Elevação lateral'] },
  { key: 'chest_fly', group: 'push', names: ['Chest fly', 'Écarté', 'Chest fly', 'Fliegende', 'Aperturas', 'Croci', 'Crucifixo'] },
  { key: 'triceps_pushdown', group: 'push', names: ['Triceps pushdown', 'Extension triceps à la poulie', 'Triceps pushdown', 'Trizepsdrücken am Kabel', 'Extensión de tríceps en polea', 'Pushdown tricipiti', 'Tríceps na polia'] },
  { key: 'skull_crusher', group: 'push', names: ['Skull crusher', 'Barre au front', 'Skull crusher', 'Stirndrücken', 'Press francés', 'French press', 'Tríceps testa'] },
  { key: 'dips', group: 'push', names: ['Dips', 'Dips', 'Dips', 'Dips', 'Fondos', 'Dip', 'Paralelas'] },
  { key: 'push_up', group: 'push', names: ['Push-up', 'Pompes', 'Push-up', 'Liegestütze', 'Flexiones', 'Flessioni', 'Flexões'] },
  // pull
  { key: 'deadlift', group: 'pull', names: ['Deadlift', 'Soulevé de terre', 'Deadlift', 'Kreuzheben', 'Peso muerto', 'Stacco da terra', 'Levantamento terra'] },
  { key: 'barbell_row', group: 'pull', names: ['Barbell row', 'Rowing barre', 'Roeien met stang', 'Langhantelrudern', 'Remo con barra', 'Rematore con bilanciere', 'Remada com barra'] },
  { key: 'dumbbell_row', group: 'pull', names: ['Dumbbell row', 'Rowing haltère', 'Roeien met dumbbell', 'Kurzhantelrudern', 'Remo con mancuerna', 'Rematore con manubrio', 'Remada com haltere'] },
  { key: 'lat_pulldown', group: 'pull', names: ['Lat pulldown', 'Tirage vertical', 'Lat pulldown', 'Latzug', 'Jalón al pecho', 'Lat machine', 'Puxada alta'] },
  { key: 'pull_up', group: 'pull', names: ['Pull-up', 'Traction', 'Pull-up', 'Klimmzug', 'Dominadas', 'Trazioni', 'Barra fixa'] },
  { key: 'seated_cable_row', group: 'pull', names: ['Seated cable row', 'Tirage horizontal', 'Zittend kabelroeien', 'Rudern am Kabelzug', 'Remo en polea baja', 'Pulley basso', 'Remada sentada'] },
  { key: 'face_pull', group: 'pull', names: ['Face pull', 'Face pull', 'Face pull', 'Face Pull', 'Face pull', 'Face pull', 'Face pull'] },
  { key: 'barbell_curl', group: 'pull', names: ['Barbell curl', 'Curl barre', 'Curl met stang', 'Langhantelcurl', 'Curl con barra', 'Curl con bilanciere', 'Rosca direta'] },
  { key: 'dumbbell_curl', group: 'pull', names: ['Dumbbell curl', 'Curl haltères', 'Curl met dumbbells', 'Kurzhantelcurl', 'Curl con mancuernas', 'Curl con manubri', 'Rosca com halteres'] },
  { key: 'hammer_curl', group: 'pull', names: ['Hammer curl', 'Curl marteau', 'Hammer curl', 'Hammercurl', 'Curl martillo', 'Hammer curl', 'Rosca martelo'] },
  { key: 'shrug', group: 'pull', names: ['Shrug', "Haussements d'épaules", 'Shrugs', 'Schulterheben', 'Encogimientos', 'Scrollate', 'Encolhimento'] },
  // legs
  { key: 'squat', group: 'legs', names: ['Squat', 'Squat', 'Squat', 'Kniebeuge', 'Sentadilla', 'Squat', 'Agachamento'] },
  { key: 'front_squat', group: 'legs', names: ['Front squat', 'Squat avant', 'Front squat', 'Frontkniebeuge', 'Sentadilla frontal', 'Front squat', 'Agachamento frontal'] },
  { key: 'leg_press', group: 'legs', names: ['Leg press', 'Presse à cuisses', 'Beenpers', 'Beinpresse', 'Prensa de piernas', 'Leg press', 'Leg press'] },
  { key: 'romanian_deadlift', group: 'legs', names: ['Romanian deadlift', 'Soulevé de terre roumain', 'Roemeense deadlift', 'Rumänisches Kreuzheben', 'Peso muerto rumano', 'Stacco rumeno', 'Stiff'] },
  { key: 'lunge', group: 'legs', names: ['Lunge', 'Fentes', 'Lunges', 'Ausfallschritte', 'Zancadas', 'Affondi', 'Avanço'] },
  { key: 'bulgarian_split_squat', group: 'legs', names: ['Bulgarian split squat', 'Squat bulgare', 'Bulgaarse split squat', 'Bulgarische Kniebeuge', 'Sentadilla búlgara', 'Squat bulgaro', 'Agachamento búlgaro'] },
  { key: 'leg_extension', group: 'legs', names: ['Leg extension', 'Extension des jambes', 'Beenextensie', 'Beinstrecker', 'Extensión de piernas', 'Leg extension', 'Cadeira extensora'] },
  { key: 'leg_curl', group: 'legs', names: ['Leg curl', 'Curl des jambes', 'Beencurl', 'Beinbeuger', 'Curl femoral', 'Leg curl', 'Mesa flexora'] },
  { key: 'hip_thrust', group: 'legs', names: ['Hip thrust', 'Hip thrust', 'Hip thrust', 'Hip Thrust', 'Hip thrust', 'Hip thrust', 'Elevação pélvica'] },
  { key: 'calf_raise', group: 'legs', names: ['Calf raise', 'Extensions mollets', 'Kuitheffen', 'Wadenheben', 'Elevación de talones', 'Calf raise', 'Elevação de gémeos'] },
  // core
  { key: 'cable_crunch', group: 'core', names: ['Cable crunch', 'Crunch à la poulie', 'Kabel crunch', 'Kabel-Crunch', 'Crunch en polea', 'Crunch ai cavi', 'Abdominal na polia'] },
  { key: 'hanging_leg_raise', group: 'core', names: ['Hanging leg raise', 'Relevé de jambes suspendu', 'Hangende beenheffing', 'Hängendes Beinheben', 'Elevación de piernas colgado', 'Sollevamento gambe alla sbarra', 'Elevação de pernas suspenso'] },
  { key: 'ab_wheel', group: 'core', names: ['Ab wheel', 'Roue abdominale', 'Ab wheel', 'Bauchroller', 'Rueda abdominal', 'Ruota addominale', 'Roda abdominal'] },
]

const BY_KEY: Record<string, Exercise> = {}
EXERCISES.forEach(e => { BY_KEY[e.key] = e })

export function exerciseName(key: string | null | undefined, lang: string, fallback?: string): string {
  const ex = key ? BY_KEY[key] : undefined
  if (ex) {
    const i = LANG_ORDER.indexOf(lang)
    return ex.names[i >= 0 ? i : 0]
  }
  return fallback || (key ? key.replace(/_/g, ' ') : '')
}

function flat(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function searchExercises(query: string, lang: string, group: Group | 'all'): Exercise[] {
  const q = flat(query.trim())
  const i = Math.max(0, LANG_ORDER.indexOf(lang))
  return EXERCISES.filter(e => {
    if (group !== 'all' && e.group !== group) return false
    if (!q) return true
    return flat(e.names[i]).includes(q) || flat(e.names[0]).includes(q)
  })
}
