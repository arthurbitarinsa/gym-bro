import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, Modal, Alert, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native'
import { blockUser, reportUser, ReportReason } from '../lib/safety'

const GREEN = '#1D9E75'
const DANGER = '#D64545'

const STR: Record<string, Record<string, string>> = {
  en: {
    report: 'Report',
    block: 'Block',
    report_why: 'Why are you reporting this person?',
    r_spam: 'Spam or fake profile',
    r_harassment: 'Harassment or abuse',
    r_inappropriate: 'Inappropriate photo or content',
    r_unsafe: 'Unsafe or threatening behavior',
    r_other: 'Something else',
    details: 'Add details (optional)',
    send_report: 'Send report',
    report_sent: 'Report sent',
    report_sent_sub: 'Thank you. We review every report within 24 hours and remove accounts that break our rules.',
    block_q: 'Block {name}?',
    block_body: "They won't see your profile or be able to message you, and you won't see theirs. You can unblock them anytime in Settings.",
    block_also: 'Also block {name}',
    done: 'Done',
    cancel: 'Cancel',
    error: 'Something went wrong. Please try again.',
    blocked_users: 'Blocked users',
    unblock: 'Unblock',
    no_blocked: "You haven't blocked anyone.",
    terms: 'Terms of use',
    privacy: 'Privacy policy',
    consent_intro: 'By creating an account you agree to our',
  },
  fr: {
    report: 'Signaler',
    block: 'Bloquer',
    report_why: 'Pourquoi signales-tu cette personne ?',
    r_spam: 'Spam ou faux profil',
    r_harassment: 'Harcèlement ou abus',
    r_inappropriate: 'Photo ou contenu inapproprié',
    r_unsafe: 'Comportement dangereux ou menaçant',
    r_other: 'Autre chose',
    details: 'Ajouter des détails (facultatif)',
    send_report: 'Envoyer le signalement',
    report_sent: 'Signalement envoyé',
    report_sent_sub: 'Merci. Nous examinons chaque signalement sous 24 heures et supprimons les comptes qui enfreignent nos règles.',
    block_q: 'Bloquer {name} ?',
    block_body: "Cette personne ne verra plus ton profil et ne pourra plus t'écrire, et tu ne verras plus le sien. Tu peux la débloquer à tout moment dans les paramètres.",
    block_also: 'Bloquer aussi {name}',
    done: 'Terminé',
    cancel: 'Annuler',
    error: "Une erreur s'est produite. Réessaie.",
    blocked_users: 'Utilisateurs bloqués',
    unblock: 'Débloquer',
    no_blocked: "Tu n'as bloqué personne.",
    terms: "Conditions d'utilisation",
    privacy: 'Politique de confidentialité',
    consent_intro: 'En créant un compte, tu acceptes nos',
  },
  nl: {
    report: 'Melden',
    block: 'Blokkeren',
    report_why: 'Waarom meld je deze persoon?',
    r_spam: 'Spam of nepprofiel',
    r_harassment: 'Intimidatie of misbruik',
    r_inappropriate: 'Ongepaste foto of inhoud',
    r_unsafe: 'Onveilig of dreigend gedrag',
    r_other: 'Iets anders',
    details: 'Voeg details toe (optioneel)',
    send_report: 'Melding versturen',
    report_sent: 'Melding verstuurd',
    report_sent_sub: 'Bedankt. We bekijken elke melding binnen 24 uur en verwijderen accounts die onze regels overtreden.',
    block_q: '{name} blokkeren?',
    block_body: 'Deze persoon ziet je profiel niet meer en kan je geen berichten sturen, en jij ziet het profiel van die persoon niet meer. Je kunt dit altijd ongedaan maken in Instellingen.',
    block_also: '{name} ook blokkeren',
    done: 'Klaar',
    cancel: 'Annuleren',
    error: 'Er ging iets mis. Probeer het opnieuw.',
    blocked_users: 'Geblokkeerde gebruikers',
    unblock: 'Deblokkeren',
    no_blocked: 'Je hebt niemand geblokkeerd.',
    terms: 'Gebruiksvoorwaarden',
    privacy: 'Privacybeleid',
    consent_intro: 'Door een account aan te maken ga je akkoord met onze',
  },
  de: {
    report: 'Melden',
    block: 'Blockieren',
    report_why: 'Warum meldest du diese Person?',
    r_spam: 'Spam oder Fake-Profil',
    r_harassment: 'Belästigung oder Missbrauch',
    r_inappropriate: 'Unangemessenes Foto oder Inhalt',
    r_unsafe: 'Gefährliches oder bedrohliches Verhalten',
    r_other: 'Etwas anderes',
    details: 'Details hinzufügen (optional)',
    send_report: 'Meldung senden',
    report_sent: 'Meldung gesendet',
    report_sent_sub: 'Danke. Wir prüfen jede Meldung innerhalb von 24 Stunden und entfernen Konten, die gegen unsere Regeln verstoßen.',
    block_q: '{name} blockieren?',
    block_body: 'Diese Person sieht dein Profil nicht mehr und kann dir nicht schreiben, und du siehst ihr Profil nicht mehr. Du kannst die Blockierung jederzeit in den Einstellungen aufheben.',
    block_also: '{name} auch blockieren',
    done: 'Fertig',
    cancel: 'Abbrechen',
    error: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    blocked_users: 'Blockierte Nutzer',
    unblock: 'Entblocken',
    no_blocked: 'Du hast niemanden blockiert.',
    terms: 'Nutzungsbedingungen',
    privacy: 'Datenschutzerklärung',
    consent_intro: 'Mit der Erstellung eines Kontos stimmst du unseren folgenden Dokumenten zu:',
  },
  es: {
    report: 'Denunciar',
    block: 'Bloquear',
    report_why: '¿Por qué denuncias a esta persona?',
    r_spam: 'Spam o perfil falso',
    r_harassment: 'Acoso o abuso',
    r_inappropriate: 'Foto o contenido inapropiado',
    r_unsafe: 'Comportamiento peligroso o amenazante',
    r_other: 'Otro motivo',
    details: 'Añade detalles (opcional)',
    send_report: 'Enviar denuncia',
    report_sent: 'Denuncia enviada',
    report_sent_sub: 'Gracias. Revisamos cada denuncia en un plazo de 24 horas y eliminamos las cuentas que incumplen nuestras normas.',
    block_q: '¿Bloquear a {name}?',
    block_body: 'Esta persona no verá tu perfil ni podrá escribirte, y tú no verás el suyo. Puedes desbloquearla cuando quieras en Ajustes.',
    block_also: 'Bloquear también a {name}',
    done: 'Listo',
    cancel: 'Cancelar',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    blocked_users: 'Usuarios bloqueados',
    unblock: 'Desbloquear',
    no_blocked: 'No has bloqueado a nadie.',
    terms: 'Términos de uso',
    privacy: 'Política de privacidad',
    consent_intro: 'Al crear una cuenta aceptas nuestros',
  },
  it: {
    report: 'Segnala',
    block: 'Blocca',
    report_why: 'Perché stai segnalando questa persona?',
    r_spam: 'Spam o profilo falso',
    r_harassment: 'Molestie o abusi',
    r_inappropriate: 'Foto o contenuto inappropriato',
    r_unsafe: 'Comportamento pericoloso o minaccioso',
    r_other: "Un'altra cosa",
    details: 'Aggiungi dettagli (facoltativo)',
    send_report: 'Invia segnalazione',
    report_sent: 'Segnalazione inviata',
    report_sent_sub: 'Grazie. Esaminiamo ogni segnalazione entro 24 ore e rimuoviamo gli account che violano le nostre regole.',
    block_q: 'Bloccare {name}?',
    block_body: 'Questa persona non vedrà il tuo profilo né potrà scriverti, e tu non vedrai il suo. Puoi sbloccarla in qualsiasi momento dalle Impostazioni.',
    block_also: 'Blocca anche {name}',
    done: 'Fatto',
    cancel: 'Annulla',
    error: 'Qualcosa è andato storto. Riprova.',
    blocked_users: 'Utenti bloccati',
    unblock: 'Sblocca',
    no_blocked: 'Non hai bloccato nessuno.',
    terms: 'Termini di utilizzo',
    privacy: 'Informativa sulla privacy',
    consent_intro: 'Creando un account accetti i nostri',
  },
  pt: {
    report: 'Denunciar',
    block: 'Bloquear',
    report_why: 'Porque estás a denunciar esta pessoa?',
    r_spam: 'Spam ou perfil falso',
    r_harassment: 'Assédio ou abuso',
    r_inappropriate: 'Foto ou conteúdo inadequado',
    r_unsafe: 'Comportamento perigoso ou ameaçador',
    r_other: 'Outro motivo',
    details: 'Adiciona detalhes (opcional)',
    send_report: 'Enviar denúncia',
    report_sent: 'Denúncia enviada',
    report_sent_sub: 'Obrigado. Analisamos cada denúncia em 24 horas e removemos as contas que violam as nossas regras.',
    block_q: 'Bloquear {name}?',
    block_body: 'Esta pessoa deixará de ver o teu perfil e de te poder enviar mensagens, e tu deixarás de ver o dela. Podes desbloquear a qualquer momento nas Definições.',
    block_also: 'Bloquear também {name}',
    done: 'Concluir',
    cancel: 'Cancelar',
    error: 'Algo correu mal. Tenta novamente.',
    blocked_users: 'Utilizadores bloqueados',
    unblock: 'Desbloquear',
    no_blocked: 'Não bloqueaste ninguém.',
    terms: 'Termos de utilização',
    privacy: 'Política de privacidade',
    consent_intro: 'Ao criares uma conta, aceitas os nossos',
  },
}

export function safetyStrings(lang: string): Record<string, string> {
  return { ...STR.en, ...(STR[lang] || {}) }
}

const REASONS: { key: ReportReason, label: string }[] = [
  { key: 'spam', label: 'r_spam' },
  { key: 'harassment', label: 'r_harassment' },
  { key: 'inappropriate', label: 'r_inappropriate' },
  { key: 'unsafe', label: 'r_unsafe' },
  { key: 'other', label: 'r_other' },
]

type Props = {
  lang: string
  user: { id: string, name: string } | null
  context?: string
  onClose: () => void
  onBlocked: (userId: string) => void
}

export default function UserActionsSheet({ lang, user, context, onClose, onBlocked }: Props) {
  const s = safetyStrings(lang)
  const [step, setStep] = useState<'menu' | 'report' | 'done'>('menu')
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null
  const u: { id: string, name: string } = user

  function close() {
    setStep('menu'); setReason(''); setDetails('')
    onClose()
  }

  async function doBlock() {
    setBusy(true)
    const ok = await blockUser(u.id, u.name)
    setBusy(false)
    if (!ok) { Alert.alert(s.error); return }
    close()
    onBlocked(u.id)
  }

  function confirmBlock() {
    Alert.alert(s.block_q.replace('{name}', u.name), s.block_body, [
      { text: s.cancel, style: 'cancel' },
      { text: s.block, style: 'destructive', onPress: doBlock },
    ])
  }

  async function submitReport() {
    if (!reason) return
    setBusy(true)
    const ok = await reportUser({ reportedId: u.id, name: u.name, reason, details, context })
    setBusy(false)
    if (ok) setStep('done')
    else Alert.alert(s.error)
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.sheet}>
            <View style={st.grab} />

            {step === 'menu' && (
              <>
                <Text style={st.title} numberOfLines={1}>{u.name}</Text>
                <TouchableOpacity style={st.row} onPress={() => setStep('report')} activeOpacity={0.6}>
                  <Text style={st.rowIcon}>🚩</Text>
                  <Text style={st.rowLabel}>{s.report}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.row} onPress={confirmBlock} activeOpacity={0.6} disabled={busy}>
                  <Text style={st.rowIcon}>🚫</Text>
                  <Text style={[st.rowLabel, { color: DANGER }]}>{s.block}</Text>
                  {busy && <ActivityIndicator color={DANGER} />}
                </TouchableOpacity>
                <TouchableOpacity style={st.cancelBtn} onPress={close} activeOpacity={0.8}>
                  <Text style={st.cancelText}>{s.cancel}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'report' && (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
                <Text style={st.title}>{s.report_why}</Text>
                {REASONS.map(r => (
                  <TouchableOpacity key={r.key} style={st.reasonRow} onPress={() => setReason(r.key)} activeOpacity={0.6}>
                    <View style={[st.radio, reason === r.key && st.radioOn]}>
                      {reason === r.key && <View style={st.radioDot} />}
                    </View>
                    <Text style={st.reasonText}>{s[r.label]}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={st.details}
                  value={details}
                  onChangeText={setDetails}
                  placeholder={s.details}
                  placeholderTextColor="#aaa"
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[st.primaryBtn, (!reason || busy) && { opacity: 0.45 }]}
                  onPress={submitReport}
                  disabled={!reason || busy}
                  activeOpacity={0.8}
                >
                  <Text style={st.primaryText}>{busy ? '…' : s.send_report}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.cancelBtn} onPress={close} activeOpacity={0.8}>
                  <Text style={st.cancelText}>{s.cancel}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {step === 'done' && (
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View style={st.check}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>✓</Text></View>
                <Text style={[st.title, { textAlign: 'center', marginBottom: 8 }]}>{s.report_sent}</Text>
                <Text style={st.doneSub}>{s.report_sent_sub}</Text>
                <TouchableOpacity style={st.blockAlso} onPress={confirmBlock} activeOpacity={0.8}>
                  <Text style={st.blockAlsoText}>{s.block_also.replace('{name}', u.name)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.primaryBtn, { alignSelf: 'stretch' }]} onPress={close} activeOpacity={0.8}>
                  <Text style={st.primaryText}>{s.done}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e2e2', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  cancelBtn: { marginTop: 8, padding: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  reasonText: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cfd8d4', justifyContent: 'center', alignItems: 'center' },
  radioOn: { borderColor: GREEN },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: GREEN },
  details: { marginTop: 8, borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 14, padding: 14, fontSize: 15, minHeight: 84, textAlignVertical: 'top', backgroundColor: '#fafafa', color: '#1a1a1a' },
  primaryBtn: { marginTop: 14, backgroundColor: GREEN, borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  doneSub: { fontSize: 14, lineHeight: 21, color: '#6b7a74', textAlign: 'center', marginBottom: 18, paddingHorizontal: 6 },
  blockAlso: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#f3c9c9', backgroundColor: '#fff8f8', borderRadius: 14, padding: 15, alignItems: 'center' },
  blockAlsoText: { color: DANGER, fontSize: 15, fontWeight: '700' },
})
