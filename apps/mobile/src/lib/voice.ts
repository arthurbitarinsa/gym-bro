declare const require: any

// Loads the LiveKit native modules if this build has them (production / dev-client builds).
// In Expo Go they don't exist, so calls still ring and answer but without audio.
let LK: any = null
try {
  LK = require('@livekit/react-native')
  LK.registerGlobals()
} catch (e) {
  LK = null
}

export const LiveKit: any = LK
export const voiceAvailable = !!LK

const V: Record<string, Record<string, string>> = {
  en: { mute: 'Mute', unmute: 'Unmute', speaker: 'Speaker', connecting: 'Connecting audio…', err_voice: 'Could not connect audio' },
  fr: { mute: 'Muet', unmute: 'Micro', speaker: 'Haut-parleur', connecting: 'Connexion audio…', err_voice: "Impossible de connecter l'audio" },
  nl: { mute: 'Dempen', unmute: 'Dempen uit', speaker: 'Luidspreker', connecting: 'Audio verbinden…', err_voice: 'Audio kon niet verbinden' },
  de: { mute: 'Stumm', unmute: 'Ton an', speaker: 'Lautsprecher', connecting: 'Audio verbindet…', err_voice: 'Audio konnte nicht verbinden' },
  es: { mute: 'Silenciar', unmute: 'Activar', speaker: 'Altavoz', connecting: 'Conectando audio…', err_voice: 'No se pudo conectar el audio' },
  it: { mute: 'Muto', unmute: 'Attiva', speaker: 'Vivavoce', connecting: 'Connessione audio…', err_voice: "Impossibile connettere l'audio" },
  pt: { mute: 'Silenciar', unmute: 'Ativar', speaker: 'Altifalante', connecting: 'A ligar o áudio…', err_voice: 'Não foi possível ligar o áudio' },
}

export function voiceStrings(lang: string): Record<string, string> {
  return { ...V.en, ...(V[lang] || {}) }
}
