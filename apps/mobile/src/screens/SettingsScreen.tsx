import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  SafeAreaView, ActivityIndicator, Linking, KeyboardAvoidingView, Platform,
} from 'react-native'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { PRIVACY_URL, TERMS_URL, SUPPORT_EMAIL } from '../lib/links'
import BlockedUsers from './BlockedUsers'
import { safetyStrings } from './SafetySheet'

const GREEN = '#1D9E75'
const DANGER = '#D64545'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

// Strings that only exist for settings. Everything else reuses the app's `t`.
const S: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings',
    edit_profile: 'Edit profile',
    account: 'Account',
    preferences: 'Preferences',
    about: 'About',
    language: 'Language',
    change_password: 'Change password',
    new_password: 'New password',
    password_updated: 'Password updated',
    password_short: 'Password must be at least 6 characters',
    privacy_policy: 'Privacy policy',
    contact_support: 'Contact support',
    app_version: 'Version',
    delete_account: 'Delete account',
    delete_title: 'Delete your account?',
    delete_body: 'This permanently deletes your profile, matches and messages. This cannot be undone.',
    delete_confirm: 'Delete',
    delete_failed: 'Could not delete your account. Please try again or contact support.',
    cancel: 'Cancel',
    save: 'Save',
    saved: 'Saved',
    username_taken: 'That username is already taken',
    change_gym: 'Change gym',
  },
  fr: {
    settings: 'Paramètres',
    edit_profile: 'Modifier le profil',
    account: 'Compte',
    preferences: 'Préférences',
    about: 'À propos',
    language: 'Langue',
    change_password: 'Changer le mot de passe',
    new_password: 'Nouveau mot de passe',
    password_updated: 'Mot de passe mis à jour',
    password_short: 'Le mot de passe doit comporter au moins 6 caractères',
    privacy_policy: 'Politique de confidentialité',
    contact_support: 'Contacter le support',
    app_version: 'Version',
    delete_account: 'Supprimer le compte',
    delete_title: 'Supprimer ton compte ?',
    delete_body: 'Cela supprime définitivement ton profil, tes contacts et tes messages. Cette action est irréversible.',
    delete_confirm: 'Supprimer',
    delete_failed: 'Impossible de supprimer ton compte. Réessaie ou contacte le support.',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saved: 'Enregistré',
    username_taken: 'Ce pseudo est déjà pris',
    change_gym: 'Changer de salle',
  },
  nl: {
    settings: 'Instellingen',
    edit_profile: 'Profiel bewerken',
    account: 'Account',
    preferences: 'Voorkeuren',
    about: 'Over',
    language: 'Taal',
    change_password: 'Wachtwoord wijzigen',
    new_password: 'Nieuw wachtwoord',
    password_updated: 'Wachtwoord bijgewerkt',
    password_short: 'Wachtwoord moet minimaal 6 tekens hebben',
    privacy_policy: 'Privacybeleid',
    contact_support: 'Contact opnemen met support',
    app_version: 'Versie',
    delete_account: 'Account verwijderen',
    delete_title: 'Je account verwijderen?',
    delete_body: 'Dit verwijdert je profiel, matches en berichten definitief. Dit kan niet ongedaan worden gemaakt.',
    delete_confirm: 'Verwijderen',
    delete_failed: 'Je account kon niet worden verwijderd. Probeer het opnieuw of neem contact op met support.',
    cancel: 'Annuleren',
    save: 'Opslaan',
    saved: 'Opgeslagen',
    username_taken: 'Die gebruikersnaam is al in gebruik',
    change_gym: 'Gym wijzigen',
  },
  de: {
    settings: 'Einstellungen',
    edit_profile: 'Profil bearbeiten',
    account: 'Konto',
    preferences: 'Präferenzen',
    about: 'Über',
    language: 'Sprache',
    change_password: 'Passwort ändern',
    new_password: 'Neues Passwort',
    password_updated: 'Passwort aktualisiert',
    password_short: 'Das Passwort muss mindestens 6 Zeichen haben',
    privacy_policy: 'Datenschutzerklärung',
    contact_support: 'Support kontaktieren',
    app_version: 'Version',
    delete_account: 'Konto löschen',
    delete_title: 'Dein Konto löschen?',
    delete_body: 'Dadurch werden dein Profil, deine Matches und Nachrichten dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.',
    delete_confirm: 'Löschen',
    delete_failed: 'Dein Konto konnte nicht gelöscht werden. Versuche es erneut oder kontaktiere den Support.',
    cancel: 'Abbrechen',
    save: 'Speichern',
    saved: 'Gespeichert',
    username_taken: 'Dieser Benutzername ist bereits vergeben',
    change_gym: 'Gym ändern',
  },
  es: {
    settings: 'Ajustes',
    edit_profile: 'Editar perfil',
    account: 'Cuenta',
    preferences: 'Preferencias',
    about: 'Acerca de',
    language: 'Idioma',
    change_password: 'Cambiar contraseña',
    new_password: 'Nueva contraseña',
    password_updated: 'Contraseña actualizada',
    password_short: 'La contraseña debe tener al menos 6 caracteres',
    privacy_policy: 'Política de privacidad',
    contact_support: 'Contactar con soporte',
    app_version: 'Versión',
    delete_account: 'Eliminar cuenta',
    delete_title: '¿Eliminar tu cuenta?',
    delete_body: 'Esto elimina de forma permanente tu perfil, tus matches y tus mensajes. No se puede deshacer.',
    delete_confirm: 'Eliminar',
    delete_failed: 'No se pudo eliminar tu cuenta. Inténtalo de nuevo o contacta con soporte.',
    cancel: 'Cancelar',
    save: 'Guardar',
    saved: 'Guardado',
    username_taken: 'Ese usuario ya está en uso',
    change_gym: 'Cambiar gimnasio',
  },
  it: {
    settings: 'Impostazioni',
    edit_profile: 'Modifica profilo',
    account: 'Account',
    preferences: 'Preferenze',
    about: 'Informazioni',
    language: 'Lingua',
    change_password: 'Cambia password',
    new_password: 'Nuova password',
    password_updated: 'Password aggiornata',
    password_short: 'La password deve avere almeno 6 caratteri',
    privacy_policy: 'Informativa sulla privacy',
    contact_support: 'Contatta il supporto',
    app_version: 'Versione',
    delete_account: 'Elimina account',
    delete_title: 'Eliminare il tuo account?',
    delete_body: 'Questo elimina definitivamente il tuo profilo, i tuoi match e i tuoi messaggi. Non può essere annullato.',
    delete_confirm: 'Elimina',
    delete_failed: 'Impossibile eliminare il tuo account. Riprova o contatta il supporto.',
    cancel: 'Annulla',
    save: 'Salva',
    saved: 'Salvato',
    username_taken: 'Questo username è già in uso',
    change_gym: 'Cambia palestra',
  },
  pt: {
    settings: 'Definições',
    edit_profile: 'Editar perfil',
    account: 'Conta',
    preferences: 'Preferências',
    about: 'Sobre',
    language: 'Idioma',
    change_password: 'Alterar palavra-passe',
    new_password: 'Nova palavra-passe',
    password_updated: 'Palavra-passe atualizada',
    password_short: 'A palavra-passe deve ter pelo menos 6 caracteres',
    privacy_policy: 'Política de privacidade',
    contact_support: 'Contactar o suporte',
    app_version: 'Versão',
    delete_account: 'Eliminar conta',
    delete_title: 'Eliminar a tua conta?',
    delete_body: 'Isto elimina permanentemente o teu perfil, matches e mensagens. Não pode ser desfeito.',
    delete_confirm: 'Eliminar',
    delete_failed: 'Não foi possível eliminar a tua conta. Tenta novamente ou contacta o suporte.',
    cancel: 'Cancelar',
    save: 'Guardar',
    saved: 'Guardado',
    username_taken: 'Esse username já está em uso',
    change_gym: 'Alterar ginásio',
  },
}

const GOALS = ['strength', 'hypertrophy', 'cardio', 'sport', 'general']
const LEVELS = ['beginner', 'intermediate', 'advanced']

type View_ = 'home' | 'edit' | 'language' | 'password' | 'blocked'

type Props = {
  t: Record<string, string>
  lang: string
  profile: any
  onBack: () => void
  onLanguageChange: (code: string) => void
  onProfileUpdate: () => void
  onSignOut: () => void
}

export default function SettingsScreen({ t, lang, profile, onBack, onLanguageChange, onProfileUpdate, onSignOut }: Props) {
  const s = S[lang] || S.en
  const ss = safetyStrings(lang)
  const [view, setView] = useState<View_>('home')
  const [deleting, setDeleting] = useState(false)

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  function confirmDelete() {
    Alert.alert(s.delete_title, s.delete_body, [
      { text: s.cancel, style: 'cancel' },
      { text: s.delete_confirm, style: 'destructive', onPress: doDelete },
    ])
  }

  async function doDelete() {
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      // Best-effort cleanup of the profile photo. The account is already gone either way.
      try {
        const { data: files } = await supabase.storage.from('avatars').list(profile.id)
        if (files && files.length > 0) {
          await supabase.storage.from('avatars').remove(files.map(f => `${profile.id}/${f.name}`))
        }
      } catch {}
      onSignOut()
    } catch (e) {
      console.log('delete account error', e)
      Alert.alert(t.error, s.delete_failed)
      setDeleting(false)
    }
  }

  if (view === 'edit') {
    return <EditProfile t={t} s={s} profile={profile} onBack={() => setView('home')} onSaved={() => { onProfileUpdate(); setView('home') }} />
  }
  if (view === 'password') {
    return <ChangePassword t={t} s={s} onBack={() => setView('home')} />
  }
  if (view === 'blocked') {
    return <BlockedUsers lang={lang} onBack={() => setView('home')} />
  }
  if (view === 'language') {
    return (
      <SafeAreaView style={st.container}>
        <Header title={s.language} onBack={() => setView('home')} />
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={st.group}>
            {LANGUAGES.map((l, i) => (
              <Row
                key={l.code}
                icon={l.flag}
                label={l.label}
                right={lang === l.code ? '✓' : ''}
                rightColor={GREEN}
                last={i === LANGUAGES.length - 1}
                onPress={() => { onLanguageChange(l.code); setView('home') }}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.container}>
      <Header title={s.settings} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={st.sectionLabel}>{s.account}</Text>
        <View style={st.group}>
          <Row icon="✏️" label={s.edit_profile} onPress={() => setView('edit')} />
          <Row icon="🔒" label={s.change_password} onPress={() => setView('password')} />
          <Row icon="🚫" label={ss.blocked_users} onPress={() => setView('blocked')} last />
        </View>

        <Text style={st.sectionLabel}>{s.preferences}</Text>
        <View style={st.group}>
          <Row icon="🌍" label={s.language} right={`${currentLang.flag} ${currentLang.label}`} onPress={() => setView('language')} last />
        </View>

        <Text style={st.sectionLabel}>{s.about}</Text>
        <View style={st.group}>
          <Row icon="📄" label={s.privacy_policy} onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row icon="📋" label={ss.terms} onPress={() => Linking.openURL(TERMS_URL)} />
          <Row icon="✉️" label={s.contact_support} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=IronMate%20support`)} />
          <Row icon="ℹ️" label={s.app_version} right={Constants.expoConfig?.version || ''} last />
        </View>

        <TouchableOpacity style={st.signOutBtn} onPress={onSignOut} activeOpacity={0.8}>
          <Text style={st.signOutText}>{t.sign_out}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={st.deleteBtn} onPress={confirmDelete} disabled={deleting} activeOpacity={0.8}>
          {deleting
            ? <ActivityIndicator color={DANGER} />
            : <Text style={st.deleteText}>{s.delete_account}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── EDIT PROFILE ─────────────────────────────────────────────────────────────

function EditProfile({ t, s, profile, onBack, onSaved }: {
  t: Record<string, string>
  s: Record<string, string>
  profile: any
  onBack: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [goal, setGoal] = useState<string>(profile?.training_goal || '')
  const [level, setLevel] = useState<string>(profile?.experience_level || '')
  const [gymId, setGymId] = useState<string>(profile?.gym_id || '')
  const [gymName, setGymName] = useState<string>(profile?.gyms?.name || '')
  const [gyms, setGyms] = useState<{ id: string, name: string, city: string }[]>([])
  const [pickingGym, setPickingGym] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('gyms').select('id, name, city').order('city').then(({ data }) => { if (data) setGyms(data) })
  }, [])

  const filteredGyms = search.length > 0
    ? gyms.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase()))
    : gyms

  async function handleSave() {
    const cleanName = fullName.trim()
    const cleanUser = username.toLowerCase().trim()
    if (!cleanName || !cleanUser) { Alert.alert(t.error, t.username_required); return }
    if (cleanUser.length < 3) { Alert.alert(t.error, t.username_short); return }
    if (!goal || !level || !gymId) { Alert.alert(t.error, t.complete_all); return }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: cleanName,
      username: cleanUser,
      bio: bio.trim(),
      training_goal: goal,
      experience_level: level,
      gym_id: gymId,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      Alert.alert(t.error, error.code === '23505' ? s.username_taken : error.message)
      return
    }
    onSaved()
  }

  if (pickingGym) {
    return (
      <SafeAreaView style={st.container}>
        <Header title={s.change_gym} onBack={() => setPickingGym(false)} />
        <View style={{ padding: 20, flex: 1 }}>
          <TextInput style={st.input} placeholder={t.search_gym} placeholderTextColor="#999" value={search} onChangeText={setSearch} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredGyms.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[st.gymCard, gymId === g.id && st.selected]}
                onPress={() => { setGymId(g.id); setGymName(g.name); setPickingGym(false); setSearch('') }}
              >
                <Text style={{ fontSize: 22 }}>🏋️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={st.gymName}>{g.name}</Text>
                  <Text style={st.gymCity}>{g.city}</Text>
                </View>
                {gymId === g.id && <Text style={{ color: GREEN, fontSize: 18, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.container}>
      <Header title={s.edit_profile} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Text style={st.fieldLabel}>{t.full_name}</Text>
          <TextInput style={st.input} value={fullName} onChangeText={setFullName} placeholder={t.full_name} placeholderTextColor="#aaa" />

          <Text style={st.fieldLabel}>{t.username_placeholder.split(' (')[0]}</Text>
          <TextInput style={st.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder={t.username_placeholder} placeholderTextColor="#aaa" />

          <Text style={st.fieldLabel}>Bio</Text>
          <TextInput style={[st.input, st.textArea]} value={bio} onChangeText={setBio} multiline placeholder={t.bio_placeholder} placeholderTextColor="#aaa" />

          <Text style={st.fieldLabel}>{t.primary_goal}</Text>
          <View style={st.chipWrap}>
            {GOALS.map(g => (
              <TouchableOpacity key={g} style={[st.chip, goal === g && st.selected]} onPress={() => setGoal(g)}>
                <Text style={st.chipText}>{t[`goal_${g}`]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={st.fieldLabel}>{t.experience_level}</Text>
          <View style={st.chipWrap}>
            {LEVELS.map(l => (
              <TouchableOpacity key={l} style={[st.chip, level === l && st.selected]} onPress={() => setLevel(l)}>
                <Text style={st.chipText}>{t[`level_${l}`]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={st.fieldLabel}>{t.home_gym}</Text>
          <TouchableOpacity style={st.gymPickBtn} onPress={() => setPickingGym(true)} activeOpacity={0.8}>
            <Text style={st.gymPickText}>🏋️  {gymName || t.select_gym}</Text>
            <Text style={st.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            <Text style={st.saveText}>{saving ? t.saving : s.save}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

function ChangePassword({ t, s, onBack }: { t: Record<string, string>, s: Record<string, string>, onBack: () => void }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (password.length < 6) { Alert.alert(t.error, s.password_short); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { Alert.alert(t.error, error.message); return }
    Alert.alert(s.password_updated)
    onBack()
  }

  return (
    <SafeAreaView style={st.container}>
      <Header title={s.change_password} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={st.fieldLabel}>{s.new_password}</Text>
          <TextInput style={st.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder={s.new_password} placeholderTextColor="#aaa" />
          <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            <Text style={st.saveText}>{saving ? t.saving : s.save}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── SHARED PIECES ────────────────────────────────────────────────────────────

function Header({ title, onBack }: { title: string, onBack: () => void }) {
  return (
    <View style={st.header}>
      <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={st.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={st.headerTitle}>{title}</Text>
      <View style={st.backBtn} />
    </View>
  )
}

function Row({ icon, label, right, rightColor, last, onPress }: {
  icon: string
  label: string
  right?: string
  rightColor?: string
  last?: boolean
  onPress?: () => void
}) {
  const content = (
    <View style={[st.row, !last && st.rowBorder]}>
      <Text style={st.rowIcon}>{icon}</Text>
      <Text style={st.rowLabel}>{label}</Text>
      {right ? <Text style={[st.rowRight, rightColor ? { color: rightColor, fontWeight: '700' } : null]}>{right}</Text> : null}
      {onPress ? <Text style={st.chevron}>›</Text> : null}
    </View>
  )
  if (!onPress) return content
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{content}</TouchableOpacity>
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  backBtn: { width: 40, alignItems: 'center' },
  backText: { fontSize: 32, color: '#1a1a1a', marginTop: -4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
  group: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  rowRight: { fontSize: 14, color: '#888' },
  chevron: { fontSize: 22, color: '#c4c4c4' },
  signOutBtn: { marginTop: 32, borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, padding: 15, alignItems: 'center' },
  signOutText: { color: '#1a1a1a', fontSize: 15, fontWeight: '600' },
  deleteBtn: { marginTop: 12, borderWidth: 1, borderColor: '#f3c9c9', borderRadius: 12, padding: 15, alignItems: 'center', backgroundColor: '#fff8f8' },
  deleteText: { color: DANGER, fontSize: 15, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, padding: 16, fontSize: 16, color: '#1a1a1a', marginBottom: 4, backgroundColor: '#fafafa' },
  textArea: { height: 90, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  selected: { borderColor: GREEN, backgroundColor: '#f0faf6' },
  gymPickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, padding: 16, backgroundColor: '#fff' },
  gymPickText: { flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  gymCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  gymName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  gymCity: { fontSize: 12, color: '#888', marginTop: 2 },
  saveBtn: { backgroundColor: GREEN, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 28 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
})
