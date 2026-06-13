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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, gym_id, training_goal')
          .eq('id', session.user.id)
          .single()
        if (profile?.username && profile?.gym_id && profile?.training_goal) {
          setScreen('main')
        } else {
          setScreen('onboarding_basic')
        }
      } else {
        setScreen('auth')
      }
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setScreen('auth')
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
  const [search, setSearch] = useState('')
  const [customGym, setCustomGym] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('gyms').select('id, name, city').order('city').then(({ data }) => {
      if (data) setGyms(data)
    })
  }, [])

  const isOther = gyms.find(g => g.id === selectedGymId)?.name === 'Other / My gym is not listed'

  const filteredGyms = search.length > 0
    ? gyms.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase()))
    : gyms

  const cities = [...new Set(filteredGyms.map(g => g.city))]

  async function handleNext() {
    if (!selectedGymId) { Alert.alert('Error', 'Please select your gym'); return }
    if (isOther && !customGym.trim()) { Alert.alert('Error', 'Please enter your gym name'); return }
    setLoading(true)

    let gymId = selectedGymId

    if (isOther && customGym.trim()) {
      const { data: existing } = await supabase
        .from('gyms')
        .select('id')
        .eq('name', customGym.trim())
        .single()

      if (existing) {
        gymId = existing.id
      } else {
        const { data: newGym } = await supabase
          .from('gyms')
          .insert({ name: customGym.trim(), address: 'Belgium', city: 'Other', location: 'POINT(4.3517 50.8503)' })
          .select('id')
          .single()
        if (newGym) gymId = newGym.id
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      gym_id: gymId,
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
          <View style={[styles.progressDot, styles.progressDone]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>
        <Text style={styles.stepTitle}>Your gym</Text>
        <Text style={styles.stepSub}>We'll show you gym bros training at the same location</Text>
        <TextInput
          style={[styles.input, { marginBottom: 16 }]}
          placeholder="🔍  Search gym or city..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {gyms.length === 0 && <ActivityIndicator color="#1D9E75" style={{ marginTop: 20 }} />}
        {cities.map(city => (
          <View key={city}>
            <Text style={styles.sectionLabel}>{city}</Text>
            {filteredGyms.filter(g => g.city === city).map(gym => (
              <TouchableOpacity key={gym.id} style={[styles.gymCard, selectedGymId === gym.id && styles.optionSelected]} onPress={() => setSelectedGymId(gym.id)}>
                <Text style={styles.gymIcon}>{gym.name.includes('Other') ? '➕' : '🏋️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  <Text style={styles.gymCity}>{gym.city}</Text>
                </View>
                {selectedGymId === gym.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        {isOther && (
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Enter your gym name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. FitZone Brussels North"
              placeholderTextColor="#999"
              value={customGym}
              onChangeText={setCustomGym}
            />
          </View>
        )}
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
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'profile'>('discover')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*, gyms(name, city)')
      .eq('id', session?.user.id)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  if (loading) return <LoadingScreen />

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {activeTab === 'discover' && <DiscoverTab session={session} profile={profile} />}
      {activeTab === 'matches' && <MatchesTab session={session} />}
      {activeTab === 'profile' && <ProfileTab profile={profile} onSignOut={signOut} />}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('discover')}>
          <Text style={[styles.tabIcon, activeTab === 'discover' && styles.tabActive]}>🔍</Text>
          <Text style={[styles.tabLabel, activeTab === 'discover' && styles.tabActive]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabIcon, activeTab === 'matches' && styles.tabActive]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'matches' && styles.tabActive]}>Matches</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function DiscoverTab({ session, profile }: { session: Session | null, profile: any }) {
  const [bros, setBros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sentRequests, setSentRequests] = useState<string[]>([])

  useEffect(() => { loadBros() }, [profile])

  async function loadBros() {
    if (!profile?.gym_id) { setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('gym_id', profile.gym_id)
      .neq('id', session?.user.id)
    if (data) setBros(data)
    setLoading(false)
  }

  function chemistryScore(bro: any) {
    let score = 60
    if (bro.training_goal === profile?.training_goal) score += 20
    if (bro.experience_level === profile?.experience_level) score += 20
    return Math.min(score, 100)
  }

  async function sendRequest(broId: string) {
    const { error } = await supabase.from('matches').insert({
      user_a: session?.user.id,
      user_b: broId,
      initiated_by: session?.user.id,
      status: 'pending'
    })
    if (!error) setSentRequests(prev => [...prev, broId])
    else if (error.message.includes('duplicate')) setSentRequests(prev => [...prev, broId])
  }

  const goalEmoji: any = { strength: '🏋️', hypertrophy: '💪', cardio: '🏃', sport: '⚽', general: '✨' }
  const levelColor: any = { beginner: '#4CAF50', intermediate: '#FF9800', advanced: '#F44336' }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.discoverHeader}>
        <View>
          <Text style={styles.discoverTitle}>Discover</Text>
          <Text style={styles.discoverSub}>{profile?.gyms?.name || 'Your gym'}</Text>
        </View>
        <Text style={{ fontSize: 28 }}>💪</Text>
      </View>
      {loading && <ActivityIndicator color="#1D9E75" style={{ marginTop: 40 }} />}
      {!loading && bros.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
          <Text style={styles.emptyTitle}>No gym bros yet</Text>
          <Text style={styles.emptySub}>Be the first at your gym — share the app with your training partners!</Text>
        </View>
      )}
      {bros.map(bro => {
        const score = chemistryScore(bro)
        const sent = sentRequests.includes(bro.id)
        return (
          <View key={bro.id} style={styles.broCard}>
            <View style={styles.broCardTop}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{(bro.full_name || bro.username || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.broName}>{bro.full_name || bro.username}</Text>
                <Text style={styles.broUsername}>@{bro.username}</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#f0faf6' : '#fff8f0' }]}>
                <Text style={[styles.scoreText, { color: score >= 80 ? '#1D9E75' : '#FF9800' }]}>{score}% match</Text>
              </View>
            </View>
            {bro.bio ? <Text style={styles.broBio}>{bro.bio}</Text> : null}
            <View style={styles.broTags}>
              {bro.training_goal && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{goalEmoji[bro.training_goal]} {bro.training_goal}</Text>
                </View>
              )}
              {bro.experience_level && (
                <View style={[styles.tag, { borderColor: levelColor[bro.experience_level] }]}>
                  <Text style={[styles.tagText, { color: levelColor[bro.experience_level] }]}>{bro.experience_level}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.connectBtn, sent && styles.connectBtnSent]} onPress={() => !sent && sendRequest(bro.id)} activeOpacity={0.8}>
              <Text style={[styles.connectBtnText, sent && styles.connectBtnTextSent]}>{sent ? '✓ Request sent' : 'Connect 🤝'}</Text>
            </TouchableOpacity>
          </View>
        )
      })}
    </ScrollView>
  )
}

function MatchesTab({ session }: { session: Session | null }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMatches() }, [])

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*, user_a_profile:profiles!matches_user_a_fkey(*), user_b_profile:profiles!matches_user_b_fkey(*)')
      .or(`user_a.eq.${session?.user.id},user_b.eq.${session?.user.id}`)
      .order('created_at', { ascending: false })
    if (data) setMatches(data)
    setLoading(false)
  }

  async function acceptMatch(matchId: string) {
    await supabase.from('matches').update({ status: 'accepted' }).eq('id', matchId)
    loadMatches()
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.discoverTitle}>Matches</Text>
      <Text style={[styles.discoverSub, { marginBottom: 20 }]}>Your gym bro connections</Text>
      {loading && <ActivityIndicator color="#1D9E75" />}
      {!loading && matches.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🤝</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Head to Discover to connect with gym bros at your gym!</Text>
        </View>
      )}
      {matches.map(match => {
        const isA = match.user_a === session?.user.id
        const other = isA ? match.user_b_profile : match.user_a_profile
        const isPending = match.status === 'pending'
        const isIncoming = isPending && match.initiated_by !== session?.user.id
        return (
          <View key={match.id} style={styles.matchCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{(other?.full_name || other?.username || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.broName}>{other?.full_name || other?.username}</Text>
              <Text style={styles.broUsername}>@{other?.username}</Text>
              <View style={[styles.statusBadge, { backgroundColor: match.status === 'accepted' ? '#f0faf6' : '#fff8f0' }]}>
                <Text style={{ fontSize: 11, color: match.status === 'accepted' ? '#1D9E75' : '#FF9800', fontWeight: '600' }}>
                  {match.status === 'accepted' ? '✓ Connected' : isIncoming ? '⏳ Wants to connect' : '⏳ Pending'}
                </Text>
              </View>
            </View>
            {isIncoming && (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptMatch(match.id)}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

function ProfileTab({ profile, onSignOut }: { profile: any, onSignOut: () => void }) {
  const goalEmoji: any = { strength: '🏋️', hypertrophy: '💪', cardio: '🏃', sport: '⚽', general: '✨' }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.discoverTitle}>Profile</Text>
      <View style={styles.profileCard}>
        <View style={[styles.avatarCircle, { width: 72, height: 72, borderRadius: 36 }]}>
          <Text style={[styles.avatarText, { fontSize: 28 }]}>{(profile?.full_name || profile?.username || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.broName, { fontSize: 22, marginTop: 12 }]}>{profile?.full_name}</Text>
        <Text style={styles.broUsername}>@{profile?.username}</Text>
        {profile?.bio ? <Text style={[styles.broBio, { textAlign: 'center', marginTop: 8 }]}>{profile.bio}</Text> : null}
      </View>
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{goalEmoji[profile?.training_goal] || '✨'}</Text>
          <Text style={styles.statLabel}>{profile?.training_goal || 'Goal'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🎯</Text>
          <Text style={styles.statLabel}>{profile?.experience_level || 'Level'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🏋️</Text>
          <Text style={styles.statLabel}>{profile?.gyms?.name?.split(' ')[0] || 'Gym'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
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
  signOutBtn: { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: '#888', fontSize: 14 },
  discoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  discoverTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  discoverSub: { fontSize: 14, color: '#888', marginTop: 2 },
  broCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  broCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  broName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  broUsername: { fontSize: 13, color: '#888', marginTop: 1 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  scoreText: { fontSize: 12, fontWeight: '700' },
  broBio: { fontSize: 14, color: '#555', marginBottom: 10, lineHeight: 20 },
  broTags: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tag: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: '#555', fontWeight: '500' },
  connectBtn: { backgroundColor: GREEN, borderRadius: 10, padding: 12, alignItems: 'center' },
  connectBtnSent: { backgroundColor: '#f0faf6', borderWidth: 1, borderColor: GREEN },
  connectBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  connectBtnTextSent: { color: GREEN },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff', paddingBottom: 4 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  tabActive: { color: GREEN },
  matchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 10 },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  acceptBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  profileCard: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 20 },
  profileStats: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statItem: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  statValue: { fontSize: 24, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#888', textAlign: 'center', textTransform: 'capitalize' },
})