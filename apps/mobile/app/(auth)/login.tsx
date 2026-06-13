import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) Alert.alert('Error', error.message)
      else Alert.alert('Check your email', 'We sent you a verification link to activate your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) Alert.alert('Error', error.message)
      else Alert.alert('Welcome back!', 'You are now logged in.')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logo}>💪</Text>
          <Text style={styles.appName}>Gym Bro</Text>
          <Text style={styles.tagline}>Find your training partner in Belgium</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleWrap}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Brussels · Gent · Antwerp</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#1D9E75',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  toggleWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#888',
  },
  toggleLink: {
    color: '#1D9E75',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 13,
    marginTop: 48,
    letterSpacing: 1,
  },
})