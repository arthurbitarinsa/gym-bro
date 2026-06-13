import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, SafeAreaView
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import { Session } from '@supabase/supabase-js'

type Screen = 'loading' | 'auth' | 'onboarding_basic' | 'onboarding_training' | 'onboarding_gym' | 'main'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setScreen(session ? 'onboarding_basic' : 'auth')
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setScreen('onboarding_basic')
      else setScreen('auth')
    })
  }, [])

  if (screen === 'loading') return <LoadingScreen />
  if (screen === 'auth') return <AuthScreen onAuth={() => setScreen('onboarding_basic')} />
  if (screen === 'onboarding_basic') return <OnboardingBasic onNext={() => setScreen('onboarding_training')} session={session} />
  if (screen === 'onboarding_training') return <OnboardingTraining onNext={() => setScreen('onboarding_gym')} onBack={() => setScreen('onboarding_basic')} session={session} />
  if (screen === 'onboarding_gym') return <OnboardingGym onNext={() => setScreen('main')} onBack={() => setScreen('onboarding_training')} session={session} />
  if (screen === 'main') return <MainScreen session={session} onSignOut={() => setScreen('auth')} />
  return null
}

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.logo}>💪</Text>
      <ActivityIndicator color="#1D9E75" style={{ marginTop: 20 }} />
    </View>
  )
}

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuth() {
    if (!email || !password) { Alert.alert('Error', 'Fill in all fields'); return }
    setLoading(true)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) Alert.alert('Error', error.message)
      else onAuth()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) Alert.alert('Error', error.message)
      else onAuth()
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💪</Text>
          <Text style={styles.appName}>Gym Bro</Text>
          <Text style={styles.tagline}>Find your training partner in Belgium</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.formTitle}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleWrap}>
            <Text style={styles.toggleText}>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}<Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text></Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>Brussels · Gent · Antwerp</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function OnboardingBasic({ onNext, session }: { onNext: () => void, session: Session | null }) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleNext() {
    if (!username || !fullName) { Alert.alert('Error', 'Username and name are required'); return }
    if (username.length < 3) { Alert.alert('Error', 'Username must be at least 3 characters'); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      username: username.toLowerCase().trim(),
      full_name: fullName.trim(),
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    })
    if (error) Alert.alert('Error', error.message)
    else onNext()
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepSub}>This is what other gym bros will see on your profile</Text>
        <TextInput style={styles.input} placeholder="Username (e.g. ironarthur)" placeholderTextColor="#999" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#999" value={fullName} onChangeText={setFullName} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Short bio — what drives you to train? (optional)" placeholderTextColor="#999" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function OnboardingTraining({ onNext, onBack, session }: { onNext: () => void, onBack: () => void, session: Session | null }) {
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const goals = [
    { key: 'strength', label: '🏋️ Strength', desc: 'Powerlifting, heavy compounds' },
    { key: 'hypertrophy', label: '💪 Hypertrophy', desc: 'Muscle building, bodybuilding' },
    { key: 'cardio', label: '🏃 Cardio', desc: 'Endurance, fat loss' },
    { key: 'sport', label: '⚽ Sport', desc: 'Athletic performance' },
    { key: 'general', label: '✨ General', desc: 'Overall fitness & health' },
  ]
  const levels = [
    { key: 'beginner', label: 'Beginner', desc: '< 1 year' },
    { key: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
    { key: 'advanced', label: 'Advanced', desc: '3+ years' },
  ]
  const times = [
    { key: 'morning', label: '🌅 Morning', desc: '6am – 12pm' },
    { key: 'afternoon', label: '☀️ Afternoon', desc: '12pm – 5pm' },
    { key: 'evening', label: '🌙 Evening', desc: '5pm – 10pm' },
  ]

  async function handleNext() {
    if (!goal || !level || !time) { Alert.alert('Error', 'Please complete all selections'); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      training_goal: goal,
      experience_level: level,
      updated_at: new Date().toISOString(),
    })
    if (error) Alert.alert('Error', error.message)
    else onNext()
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepTitle}>Your training profile</Text>
        <Text style={styles.stepSub}>We use this to find your perfect gym bro match</Text>
        <Text style={styles.sectionLabel}>Primary goal</Text>
        {goals.map(g => (
          <TouchableOpacity key={g.key} style={[styles.optionCard, goal === g.key && styles.optionSelected]} onPress={() => setGoal(g.key)}>
            <Text style={styles.optionLabel}>{g.label}</Text>
            <Text style={styles.optionDesc}>{g.desc}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sectionLabel}>Experience level</Text>
        <View style={styles.rowOptions}>
          {levels.map(l => (
            <TouchableOpacity key={l.key} style={[styles.chipCard, level === l.key && styles.optionSelected]} onPress={() => setLevel(l.key)}>
              <Text style={styles.chipLabel}>{l.label}</Text>
              <Text style={styles.chipDesc}>{l.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>Preferred training time</Text>
        <View style={styles.rowOptions}>
          {times.map(t => (
            <TouchableOpacity key={t.key} style={[styles.chipCard, time === t.key && styles.optionSelected]} onPress={() => setTime(t.key)}>
              <Text style={styles.chipLabel}>{t.label}</Text>
              <Text style={styles.chipDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue →'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function OnboardingGym({ onNext, onBack, session }: { onNext: () => void, onBack: () => void, session: Session | null }) {
  const [selectedGymId, setSelectedGymId] = useState('')
  const [gyms, setGyms] = useState<{ id: string, name: string, city: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('gyms').select('id, name, city').then(({ data }) => {
      if (data) setGyms(data)
    })
  }, [])

  async function handleNext() {
    if (!selectedGymId) { Alert.alert('Error', 'Please select your gym'); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      gym_id: selectedGymId,
      updated_at: new Date().toISOString(),
    })
    if (error) Alert.alert('Error', error.message)
    else onNext()
    setLoading(false)
  }

  const cities = [...new Set(gyms.map(g => g.city))]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>
        <Text style={styles.stepTitle}>Your gym</Text>
        <Text style={styles.stepSub}>We'll show you gym bros training at the same location</Text>
        {gyms.length === 0 && <ActivityIndicator color="#1D9E75" style={{ marginTop: 40 }} />}
        {cities.map(city => (
          <View key={city}>
            <Text style={styles.sectionLabel}>{city}</Text>
            {gyms.filter(g => g.city === city).map(gym => (
              <TouchableOpacity key={gym.id} style={[styles.gymCard, selectedGymId === gym.id && styles.optionSelected]} onPress={() => setSelectedGymId(gym.id)}>
                <Text style={styles.gymIcon}>🏋️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  <Text style={styles.gymCity}>{gym.city}</Text>
                </View>
                {selectedGymId === gym.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? 'Saving...' : "Let's go 💪"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function MainScreen({ session, onSignOut }: { session: Session | null, onSignOut: () => void }) {
  async function signOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  return (
    <SafeAreaView style={styles.center}>
      <Text style={{ fontSize: 48 }}>💪</Text>
      <Text style={[styles.appName, { marginTop: 12 }]}>Welcome to Gym Bro!</Text>
      <Text style={[styles.tagline, { marginTop: 8, marginBottom: 32 }]}>Profile setup complete</Text>
      <Text style={{ color: '#888', fontSize: 13, marginBottom: 40 }}>Discover screen coming next...</Text>
      <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const GREEN = '#1D9E75'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 28 },
  inner: { flexGrow: 1, padding: 28, paddingTop: 20 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 64, textAlign: 'center' },
  appName: { fontSize: 32, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5, textAlign: 'center' },
  tagline: { fontSize: 15, color: '#888', marginTop: 6, textAlign: 'center' },
  form: { width: '100%' },
  formTitle: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, padding: 16, fontSize: 16, color: '#1a1a1a', marginBottom: 12, backgroundColor: '#fafafa' },
  textArea: { height: 90, textAlignVertical: 'top' },
  button: { backgroundColor: GREEN, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  toggleWrap: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14, color: '#888' },
  toggleLink: { color: GREEN, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 48, letterSpacing: 1 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 32, marginTop: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' },
  progressActive: { backgroundColor: GREEN, width: 24 },
  progressDone: { backgroundColor: GREEN },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  stepSub: { fontSize: 15, color: '#888', marginBottom: 28 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 16 },
  optionCard: { borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: '#fff' },
  optionSelected: { borderColor: GREEN, backgroundColor: '#f0faf6' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  optionDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  rowOptions: { flexDirection: 'row', gap: 8 },
  chipCard: { flex: 1, borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  chipDesc: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  gymCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  gymIcon: { fontSize: 24 },
  gymName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  gymCity: { fontSize: 12, color: '#888', marginTop: 2 },
  checkmark: { color: GREEN, fontSize: 18, fontWeight: '700' },
  backBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  backText: { color: '#888', fontSize: 14 },
  signOutBtn: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { color: '#888', fontSize: 14 },
})