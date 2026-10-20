import { Alert } from 'react-native'
import { supabase } from './supabase'

const STR: Record<string, Record<string, string>> = {
  en: {
    cancel_request: 'Cancel request',
    cancel_short: 'Cancel',
    cancel_q: 'Cancel request to {name}?',
    cancel_body: 'It will disappear from their list. You can send a new request later.',
    keep: 'Keep it',
    accepted_now: '{name} just accepted your request. You are connected!',
    error: 'Something went wrong. Please try again.',
  },
  fr: {
    cancel_request: 'Annuler la demande',
    cancel_short: 'Annuler',
    cancel_q: 'Annuler la demande envoyée à {name} ?',
    cancel_body: 'Elle disparaîtra de sa liste. Tu pourras en renvoyer une plus tard.',
    keep: 'Garder',
    accepted_now: '{name} vient d’accepter ta demande. Vous êtes connectés !',
    error: "Une erreur s'est produite. Réessaie.",
  },
  nl: {
    cancel_request: 'Verzoek annuleren',
    cancel_short: 'Annuleer',
    cancel_q: 'Verzoek aan {name} annuleren?',
    cancel_body: 'Het verdwijnt uit hun lijst. Je kunt later een nieuw verzoek sturen.',
    keep: 'Behouden',
    accepted_now: '{name} heeft je verzoek net geaccepteerd. Jullie zijn verbonden!',
    error: 'Er ging iets mis. Probeer het opnieuw.',
  },
  de: {
    cancel_request: 'Anfrage zurückziehen',
    cancel_short: 'Zurückziehen',
    cancel_q: 'Anfrage an {name} zurückziehen?',
    cancel_body: 'Sie verschwindet aus der Liste. Du kannst später eine neue senden.',
    keep: 'Behalten',
    accepted_now: '{name} hat deine Anfrage gerade angenommen. Ihr seid verbunden!',
    error: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  },
  es: {
    cancel_request: 'Cancelar solicitud',
    cancel_short: 'Cancelar',
    cancel_q: '¿Cancelar la solicitud a {name}?',
    cancel_body: 'Desaparecerá de su lista. Podrás enviar otra más tarde.',
    keep: 'Mantener',
    accepted_now: '{name} acaba de aceptar tu solicitud. ¡Ya estáis conectados!',
    error: 'Algo salió mal. Inténtalo de nuevo.',
  },
  it: {
    cancel_request: 'Annulla richiesta',
    cancel_short: 'Annulla',
    cancel_q: 'Annullare la richiesta a {name}?',
    cancel_body: 'Sparirà dalla sua lista. Potrai inviarne un’altra più tardi.',
    keep: 'Mantieni',
    accepted_now: '{name} ha appena accettato la tua richiesta. Siete connessi!',
    error: 'Qualcosa è andato storto. Riprova.',
  },
  pt: {
    cancel_request: 'Cancelar pedido',
    cancel_short: 'Cancelar',
    cancel_q: 'Cancelar o pedido para {name}?',
    cancel_body: 'Vai desaparecer da lista dele(a). Podes enviar outro mais tarde.',
    keep: 'Manter',
    accepted_now: '{name} acabou de aceitar o teu pedido. Estão ligados!',
    error: 'Algo correu mal. Tenta novamente.',
  },
}

export function cancelStrings(lang: string): Record<string, string> {
  return { ...STR.en, ...(STR[lang] || {}) }
}

export type CancelResult = 'cancelled' | 'accepted' | 'error'

// Ask first, then cancel on the server. The server only deletes a request that is still
// pending and was sent by me; if they accepted in the meantime we report that instead.
export function askCancel(lang: string, name: string, otherId: string, onResult: (r: CancelResult) => void) {
  const c = cancelStrings(lang)
  async function run() {
    const { data, error } = await supabase.rpc('cancel_match_request', { p_other: otherId })
    if (error) { Alert.alert(c.error); onResult('error'); return }
    if (data === 'accepted') { Alert.alert(c.accepted_now.replace('{name}', name)); onResult('accepted'); return }
    onResult('cancelled')
  }
  Alert.alert(c.cancel_q.replace('{name}', name), c.cancel_body, [
    { text: c.keep, style: 'cancel' },
    { text: c.cancel_request, style: 'destructive', onPress: () => { run() } },
  ])
}
