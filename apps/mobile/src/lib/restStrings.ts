const EN: Record<string, string> = {
  rest_btn: 'Rest together',
  rest_me: 'Resting. {name} sees it too',
  rest_other: '{name} started a rest',
  stop: 'Stop', plus15: '+15s', go: 'Go! Next set 💪',
  n_title: '⏱ Rest over', n_body: 'Time for your next set',
}
const S: Record<string, Record<string, string>> = {
  fr: { rest_btn: 'Repos à deux', rest_me: 'En repos. {name} le voit aussi', rest_other: '{name} a lancé un repos', stop: 'Stop', plus15: '+15 s', go: 'Go ! Prochaine série 💪', n_title: '⏱ Repos terminé', n_body: "C'est l'heure de ta prochaine série" },
  nl: { rest_btn: 'Samen rusten', rest_me: 'Rust. {name} ziet het ook', rest_other: '{name} startte een rust', stop: 'Stop', plus15: '+15 s', go: 'Go! Volgende set 💪', n_title: '⏱ Rust voorbij', n_body: 'Tijd voor je volgende set' },
  de: { rest_btn: 'Gemeinsam pausieren', rest_me: 'Pause. {name} sieht es auch', rest_other: '{name} hat eine Pause gestartet', stop: 'Stopp', plus15: '+15 s', go: 'Los! Nächster Satz 💪', n_title: '⏱ Pause vorbei', n_body: 'Zeit für deinen nächsten Satz' },
  es: { rest_btn: 'Descanso juntos', rest_me: 'Descansando. {name} también lo ve', rest_other: '{name} ha iniciado un descanso', stop: 'Parar', plus15: '+15 s', go: '¡Vamos! Siguiente serie 💪', n_title: '⏱ Descanso terminado', n_body: 'Hora de tu siguiente serie' },
  it: { rest_btn: 'Recupero insieme', rest_me: 'Recupero. Lo vede anche {name}', rest_other: '{name} ha avviato un recupero', stop: 'Stop', plus15: '+15 s', go: 'Via! Prossima serie 💪', n_title: '⏱ Recupero finito', n_body: 'È ora della prossima serie' },
  pt: { rest_btn: 'Descanso a dois', rest_me: 'A descansar. {name} também vê', rest_other: '{name} iniciou um descanso', stop: 'Parar', plus15: '+15 s', go: 'Vai! Próxima série 💪', n_title: '⏱ Descanso terminado', n_body: 'Hora da próxima série' },
}
export function restStrings(lang: string): Record<string, string> {
  return { ...EN, ...(S[lang] || {}) }
}
