import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, SafeAreaView, FlatList
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './src/lib/supabase'
import { Session } from '@supabase/supabase-js'

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

const T: Record<string, Record<string, string>> = {
  en: {
    tagline: 'Find your training partner in Belgium',
    welcome_back: 'Welcome back',
    create_account: 'Create account',
    email: 'Email address',
    password: 'Password',
    loading: 'Loading...',
    sign_in: 'Sign in',
    no_account: "Don't have an account? ",
    have_account: 'Already have an account? ',
    sign_up: 'Sign up',
    footer: 'Stronger together. Find your training partner.',
    fill_fields: 'Fill in all fields',
    error: 'Error',
    tell_us: 'Tell us about yourself',
    profile_visible: 'This is what other gym bros will see on your profile',
    username_placeholder: 'Username (e.g. ironarthur)',
    full_name: 'Full name',
    bio_placeholder: 'Short bio — what drives you to train? (optional)',
    continue: 'Continue →',
    saving: 'Saving...',
    username_required: 'Username and name are required',
    username_short: 'Username must be at least 3 characters',
    training_profile: 'Your training profile',
    training_sub: 'We use this to find your perfect gym bro match',
    primary_goal: 'Primary goal',
    experience_level: 'Experience level',
    pref_time: 'Preferred training time',
    back: '← Back',
    complete_all: 'Please complete all selections',
    your_gym: 'Your gym',
    gym_sub: "We'll show you gym bros training at the same location",
    search_gym: '🔍  Search gym or city...',
    select_gym: 'Please select your gym',
    enter_gym_name: 'Enter your gym name',
    gym_placeholder: 'e.g. FitZone Brussels North',
    lets_go: "Let's go 💪",
    discover: 'Discover',
    matches: 'Matches',
    profile: 'Profile',
    no_bros: 'No gym bros yet',
    no_bros_sub: 'Be the first at your gym — share the app with your training partners!',
    connect: 'Connect 🤝',
    request_sent: '✓ Request sent',
    match: 'match',
    no_matches: 'No matches yet',
    no_matches_sub: 'Head to Discover to connect with gym bros at your gym!',
    gym_connections: 'Your gym bro connections',
    tap_to_chat: '💬 Tap to chat',
    wants_to_connect: '⏳ Wants to connect',
    pending: '⏳ Pending',
    accept: 'Accept',
    connected: '✓ Connected',
    sign_out: 'Sign out',
    start_conversation: 'Start the conversation!',
    coordinate: 'Coordinate your next gym session with',
    message_placeholder: 'Message...',
    could_not_send: 'Could not send message',
    goal_strength: '🏋️ Strength',
    goal_strength_desc: 'Powerlifting, heavy compounds',
    goal_hypertrophy: '💪 Hypertrophy',
    goal_hypertrophy_desc: 'Muscle building, bodybuilding',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Endurance, fat loss',
    goal_sport: '⚽ Sport',
    goal_sport_desc: 'Athletic performance',
    goal_general: '✨ General',
    goal_general_desc: 'Overall fitness & health',
    level_beginner: 'Beginner',
    level_beginner_desc: '< 1 year',
    level_intermediate: 'Intermediate',
    level_intermediate_desc: '1–3 years',
    level_advanced: 'Advanced',
    level_advanced_desc: '3+ years',
    time_morning: '🌅 Morning',
    time_morning_desc: '6am – 12pm',
    time_afternoon: '☀️ Afternoon',
    time_afternoon_desc: '12pm – 5pm',
    time_evening: '🌙 Evening',
    time_evening_desc: '5pm – 10pm',
    choose_language: 'Choose your language',
    language_sub: 'You can change this later in settings',
  },
  fr: {
    tagline: 'Trouve ton partenaire d\'entraînement en Belgique',
    welcome_back: 'Bon retour',
    create_account: 'Créer un compte',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    loading: 'Chargement...',
    sign_in: 'Se connecter',
    no_account: "Pas encore de compte ? ",
    have_account: 'Déjà un compte ? ',
    sign_up: "S'inscrire",
    footer: `Plus forts ensemble. Trouve ton partenaire d'entraînement.`,
    fill_fields: 'Remplissez tous les champs',
    error: 'Erreur',
    tell_us: 'Parle-nous de toi',
    profile_visible: 'C\'est ce que les autres gym bros verront sur ton profil',
    username_placeholder: 'Pseudo (ex. ironarthur)',
    full_name: 'Nom complet',
    bio_placeholder: 'Courte bio — qu\'est-ce qui te motive ? (optionnel)',
    continue: 'Continuer →',
    saving: 'Sauvegarde...',
    username_required: 'Pseudo et nom sont obligatoires',
    username_short: 'Le pseudo doit comporter au moins 3 caractères',
    training_profile: 'Ton profil d\'entraînement',
    training_sub: 'On utilise ça pour trouver ton gym bro idéal',
    primary_goal: 'Objectif principal',
    experience_level: 'Niveau d\'expérience',
    pref_time: 'Horaire préféré',
    back: '← Retour',
    complete_all: 'Veuillez compléter toutes les sélections',
    your_gym: 'Ta salle',
    gym_sub: 'On te montrera les gym bros qui s\'entraînent au même endroit',
    search_gym: '🔍  Chercher une salle ou une ville...',
    select_gym: 'Veuillez sélectionner ta salle',
    enter_gym_name: 'Entre le nom de ta salle',
    gym_placeholder: 'ex. FitZone Bruxelles Nord',
    lets_go: 'C\'est parti 💪',
    discover: 'Découvrir',
    matches: 'Contacts',
    profile: 'Profil',
    no_bros: 'Pas encore de gym bros',
    no_bros_sub: 'Sois le premier dans ta salle — partage l\'appli avec tes partenaires !',
    connect: 'Connecter 🤝',
    request_sent: '✓ Demande envoyée',
    match: 'compatibilité',
    no_matches: 'Pas encore de contacts',
    no_matches_sub: 'Va dans Découvrir pour te connecter avec des gym bros !',
    gym_connections: 'Tes connexions gym bro',
    tap_to_chat: '💬 Appuie pour chatter',
    wants_to_connect: '⏳ Veut se connecter',
    pending: '⏳ En attente',
    accept: 'Accepter',
    connected: '✓ Connecté',
    sign_out: 'Se déconnecter',
    start_conversation: 'Lance la conversation !',
    coordinate: 'Coordonne ta prochaine séance avec',
    message_placeholder: 'Message...',
    could_not_send: 'Impossible d\'envoyer le message',
    goal_strength: '🏋️ Force',
    goal_strength_desc: 'Powerlifting, mouvements lourds',
    goal_hypertrophy: '💪 Hypertrophie',
    goal_hypertrophy_desc: 'Prise de masse, musculation',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Endurance, perte de graisse',
    goal_sport: '⚽ Sport',
    goal_sport_desc: 'Performance athlétique',
    goal_general: '✨ Général',
    goal_general_desc: 'Forme générale & santé',
    level_beginner: 'Débutant',
    level_beginner_desc: '< 1 an',
    level_intermediate: 'Intermédiaire',
    level_intermediate_desc: '1–3 ans',
    level_advanced: 'Avancé',
    level_advanced_desc: '3+ ans',
    time_morning: '🌅 Matin',
    time_morning_desc: '6h – 12h',
    time_afternoon: '☀️ Après-midi',
    time_afternoon_desc: '12h – 17h',
    time_evening: '🌙 Soir',
    time_evening_desc: '17h – 22h',
    choose_language: 'Choisis ta langue',
    language_sub: 'Tu pourras changer ça plus tard dans les paramètres',
  },
  nl: {
    tagline: 'Vind je trainingspartner in België',
    welcome_back: 'Welkom terug',
    create_account: 'Account aanmaken',
    email: 'E-mailadres',
    password: 'Wachtwoord',
    loading: 'Laden...',
    sign_in: 'Inloggen',
    no_account: 'Nog geen account? ',
    have_account: 'Al een account? ',
    sign_up: 'Registreren',
    footer: 'Samen sterker. Vind je trainingspartner.',
    fill_fields: 'Vul alle velden in',
    error: 'Fout',
    tell_us: 'Vertel ons over jezelf',
    profile_visible: 'Dit is wat andere gym bros op je profiel zien',
    username_placeholder: 'Gebruikersnaam (bijv. ironarthur)',
    full_name: 'Volledige naam',
    bio_placeholder: 'Korte bio — wat drijft je om te trainen? (optioneel)',
    continue: 'Doorgaan →',
    saving: 'Opslaan...',
    username_required: 'Gebruikersnaam en naam zijn verplicht',
    username_short: 'Gebruikersnaam moet minimaal 3 tekens hebben',
    training_profile: 'Jouw trainingsprofiel',
    training_sub: 'We gebruiken dit om je perfecte gym bro te vinden',
    primary_goal: 'Primair doel',
    experience_level: 'Ervaringsniveau',
    pref_time: 'Voorkeurstijd',
    back: '← Terug',
    complete_all: 'Maak alle selecties compleet',
    your_gym: 'Jouw gym',
    gym_sub: 'We tonen je gym bros die op dezelfde locatie trainen',
    search_gym: '🔍  Zoek gym of stad...',
    select_gym: 'Selecteer je gym',
    enter_gym_name: 'Voer je gymnaam in',
    gym_placeholder: 'bijv. FitZone Brussel Noord',
    lets_go: 'Laten we gaan 💪',
    discover: 'Ontdekken',
    matches: 'Matches',
    profile: 'Profiel',
    no_bros: 'Nog geen gym bros',
    no_bros_sub: 'Wees de eerste in je gym — deel de app met je trainingspartners!',
    connect: 'Verbinden 🤝',
    request_sent: '✓ Verzoek verzonden',
    match: 'match',
    no_matches: 'Nog geen matches',
    no_matches_sub: 'Ga naar Ontdekken om te verbinden met gym bros!',
    gym_connections: 'Jouw gym bro verbindingen',
    tap_to_chat: '💬 Tik om te chatten',
    wants_to_connect: '⏳ Wil verbinden',
    pending: '⏳ In behandeling',
    accept: 'Accepteren',
    connected: '✓ Verbonden',
    sign_out: 'Uitloggen',
    start_conversation: 'Start het gesprek!',
    coordinate: 'Coördineer je volgende gymsessie met',
    message_placeholder: 'Bericht...',
    could_not_send: 'Kon bericht niet verzenden',
    goal_strength: '🏋️ Kracht',
    goal_strength_desc: 'Powerlifting, zware oefeningen',
    goal_hypertrophy: '💪 Hypertrofie',
    goal_hypertrophy_desc: 'Spieropbouw, bodybuilding',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Uithoudingsvermogen, vetverlies',
    goal_sport: '⚽ Sport',
    goal_sport_desc: 'Atletische prestaties',
    goal_general: '✨ Algemeen',
    goal_general_desc: 'Algehele fitness & gezondheid',
    level_beginner: 'Beginner',
    level_beginner_desc: '< 1 jaar',
    level_intermediate: 'Gemiddeld',
    level_intermediate_desc: '1–3 jaar',
    level_advanced: 'Gevorderd',
    level_advanced_desc: '3+ jaar',
    time_morning: '🌅 Ochtend',
    time_morning_desc: '6u – 12u',
    time_afternoon: '☀️ Middag',
    time_afternoon_desc: '12u – 17u',
    time_evening: '🌙 Avond',
    time_evening_desc: '17u – 22u',
    choose_language: 'Kies je taal',
    language_sub: 'Je kunt dit later wijzigen in de instellingen',
  },
  de: {
    tagline: 'Finde deinen Trainingspartner in Belgien',
    welcome_back: 'Willkommen zurück',
    create_account: 'Konto erstellen',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    loading: 'Laden...',
    sign_in: 'Anmelden',
    no_account: 'Noch kein Konto? ',
    have_account: 'Bereits ein Konto? ',
    sign_up: 'Registrieren',
    footer: 'Gemeinsam stärker. Finde deinen Trainingspartner.',
    fill_fields: 'Alle Felder ausfüllen',
    error: 'Fehler',
    tell_us: 'Erzähl uns von dir',
    profile_visible: 'Das sehen andere Gym Bros auf deinem Profil',
    username_placeholder: 'Benutzername (z.B. ironarthur)',
    full_name: 'Vollständiger Name',
    bio_placeholder: 'Kurze Bio — was treibt dich an? (optional)',
    continue: 'Weiter →',
    saving: 'Speichern...',
    username_required: 'Benutzername und Name sind erforderlich',
    username_short: 'Benutzername muss mindestens 3 Zeichen haben',
    training_profile: 'Dein Trainingsprofil',
    training_sub: 'Wir nutzen das, um deinen perfekten Gym Bro zu finden',
    primary_goal: 'Hauptziel',
    experience_level: 'Erfahrungsstufe',
    pref_time: 'Bevorzugte Trainingszeit',
    back: '← Zurück',
    complete_all: 'Bitte alle Auswahlen treffen',
    your_gym: 'Dein Gym',
    gym_sub: 'Wir zeigen dir Gym Bros, die am gleichen Ort trainieren',
    search_gym: '🔍  Gym oder Stadt suchen...',
    select_gym: 'Bitte wähle dein Gym',
    enter_gym_name: 'Gib deinen Gymnamen ein',
    gym_placeholder: 'z.B. FitZone Brüssel Nord',
    lets_go: 'Los geht\'s 💪',
    discover: 'Entdecken',
    matches: 'Matches',
    profile: 'Profil',
    no_bros: 'Noch keine Gym Bros',
    no_bros_sub: 'Sei der Erste in deinem Gym — teile die App mit deinen Trainingspartnern!',
    connect: 'Verbinden 🤝',
    request_sent: '✓ Anfrage gesendet',
    match: 'Match',
    no_matches: 'Noch keine Matches',
    no_matches_sub: 'Gehe zu Entdecken, um dich mit Gym Bros zu verbinden!',
    gym_connections: 'Deine Gym Bro Verbindungen',
    tap_to_chat: '💬 Tippen zum Chatten',
    wants_to_connect: '⏳ Möchte sich verbinden',
    pending: '⏳ Ausstehend',
    accept: 'Akzeptieren',
    connected: '✓ Verbunden',
    sign_out: 'Abmelden',
    start_conversation: 'Starte das Gespräch!',
    coordinate: 'Koordiniere deine nächste Gymsession mit',
    message_placeholder: 'Nachricht...',
    could_not_send: 'Nachricht konnte nicht gesendet werden',
    goal_strength: '🏋️ Kraft',
    goal_strength_desc: 'Powerlifting, schwere Übungen',
    goal_hypertrophy: '💪 Hypertrophie',
    goal_hypertrophy_desc: 'Muskelaufbau, Bodybuilding',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Ausdauer, Fettabbau',
    goal_sport: '⚽ Sport',
    goal_sport_desc: 'Athletische Leistung',
    goal_general: '✨ Allgemein',
    goal_general_desc: 'Allgemeine Fitness & Gesundheit',
    level_beginner: 'Anfänger',
    level_beginner_desc: '< 1 Jahr',
    level_intermediate: 'Fortgeschritten',
    level_intermediate_desc: '1–3 Jahre',
    level_advanced: 'Experte',
    level_advanced_desc: '3+ Jahre',
    time_morning: '🌅 Morgen',
    time_morning_desc: '6–12 Uhr',
    time_afternoon: '☀️ Nachmittag',
    time_afternoon_desc: '12–17 Uhr',
    time_evening: '🌙 Abend',
    time_evening_desc: '17–22 Uhr',
    choose_language: 'Wähle deine Sprache',
    language_sub: 'Du kannst das später in den Einstellungen ändern',
  },
  es: {
    tagline: 'Encuentra tu compañero de entrenamiento en Bélgica',
    welcome_back: 'Bienvenido de nuevo',
    create_account: 'Crear cuenta',
    email: 'Correo electrónico',
    password: 'Contraseña',
    loading: 'Cargando...',
    sign_in: 'Iniciar sesión',
    no_account: '¿No tienes cuenta? ',
    have_account: '¿Ya tienes cuenta? ',
    sign_up: 'Registrarse',
    footer: 'Más fuertes juntos. Encuentra tu compañero de entrenamiento.',
    fill_fields: 'Rellena todos los campos',
    error: 'Error',
    tell_us: 'Cuéntanos sobre ti',
    profile_visible: 'Esto es lo que otros gym bros verán en tu perfil',
    username_placeholder: 'Usuario (ej. ironarthur)',
    full_name: 'Nombre completo',
    bio_placeholder: 'Bio corta — ¿qué te motiva a entrenar? (opcional)',
    continue: 'Continuar →',
    saving: 'Guardando...',
    username_required: 'El usuario y el nombre son obligatorios',
    username_short: 'El usuario debe tener al menos 3 caracteres',
    training_profile: 'Tu perfil de entrenamiento',
    training_sub: 'Usamos esto para encontrar tu gym bro perfecto',
    primary_goal: 'Objetivo principal',
    experience_level: 'Nivel de experiencia',
    pref_time: 'Horario preferido',
    back: '← Atrás',
    complete_all: 'Por favor completa todas las selecciones',
    your_gym: 'Tu gimnasio',
    gym_sub: 'Te mostraremos gym bros que entrenan en el mismo lugar',
    search_gym: '🔍  Buscar gimnasio o ciudad...',
    select_gym: 'Por favor selecciona tu gimnasio',
    enter_gym_name: 'Ingresa el nombre de tu gimnasio',
    gym_placeholder: 'ej. FitZone Bruselas Norte',
    lets_go: '¡Vamos 💪',
    discover: 'Descubrir',
    matches: 'Matches',
    profile: 'Perfil',
    no_bros: 'Aún no hay gym bros',
    no_bros_sub: '¡Sé el primero en tu gimnasio — comparte la app con tus compañeros!',
    connect: 'Conectar 🤝',
    request_sent: '✓ Solicitud enviada',
    match: 'compatibilidad',
    no_matches: 'Aún no hay matches',
    no_matches_sub: '¡Ve a Descubrir para conectar con gym bros!',
    gym_connections: 'Tus conexiones gym bro',
    tap_to_chat: '💬 Toca para chatear',
    wants_to_connect: '⏳ Quiere conectar',
    pending: '⏳ Pendiente',
    accept: 'Aceptar',
    connected: '✓ Conectado',
    sign_out: 'Cerrar sesión',
    start_conversation: '¡Inicia la conversación!',
    coordinate: 'Coordina tu próxima sesión con',
    message_placeholder: 'Mensaje...',
    could_not_send: 'No se pudo enviar el mensaje',
    goal_strength: '🏋️ Fuerza',
    goal_strength_desc: 'Powerlifting, movimientos pesados',
    goal_hypertrophy: '💪 Hipertrofia',
    goal_hypertrophy_desc: 'Ganar músculo, culturismo',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Resistencia, pérdida de grasa',
    goal_sport: '⚽ Deporte',
    goal_sport_desc: 'Rendimiento atlético',
    goal_general: '✨ General',
    goal_general_desc: 'Fitness general & salud',
    level_beginner: 'Principiante',
    level_beginner_desc: '< 1 año',
    level_intermediate: 'Intermedio',
    level_intermediate_desc: '1–3 años',
    level_advanced: 'Avanzado',
    level_advanced_desc: '3+ años',
    time_morning: '🌅 Mañana',
    time_morning_desc: '6am – 12pm',
    time_afternoon: '☀️ Tarde',
    time_afternoon_desc: '12pm – 5pm',
    time_evening: '🌙 Noche',
    time_evening_desc: '5pm – 10pm',
    choose_language: 'Elige tu idioma',
    language_sub: 'Puedes cambiarlo más tarde en ajustes',
  },
  it: {
    tagline: 'Trova il tuo partner di allenamento in Belgio',
    welcome_back: 'Bentornato',
    create_account: 'Crea account',
    email: 'Indirizzo e-mail',
    password: 'Password',
    loading: 'Caricamento...',
    sign_in: 'Accedi',
    no_account: 'Non hai un account? ',
    have_account: 'Hai già un account? ',
    sign_up: 'Registrati',
    footer: 'Più forti insieme. Trova il tuo partner di allenamento.',
    fill_fields: 'Compila tutti i campi',
    error: 'Errore',
    tell_us: 'Raccontaci di te',
    profile_visible: 'Questo è ciò che gli altri gym bro vedranno sul tuo profilo',
    username_placeholder: 'Username (es. ironarthur)',
    full_name: 'Nome completo',
    bio_placeholder: 'Bio breve — cosa ti motiva ad allenarti? (opzionale)',
    continue: 'Continua →',
    saving: 'Salvataggio...',
    username_required: 'Username e nome sono obbligatori',
    username_short: "L'username deve avere almeno 3 caratteri",
    training_profile: 'Il tuo profilo di allenamento',
    training_sub: 'Lo usiamo per trovare il tuo gym bro perfetto',
    primary_goal: 'Obiettivo principale',
    experience_level: 'Livello di esperienza',
    pref_time: 'Orario preferito',
    back: '← Indietro',
    complete_all: 'Completa tutte le selezioni',
    your_gym: 'La tua palestra',
    gym_sub: 'Ti mostreremo gym bro che si allenano nello stesso posto',
    search_gym: '🔍  Cerca palestra o città...',
    select_gym: 'Seleziona la tua palestra',
    enter_gym_name: 'Inserisci il nome della tua palestra',
    gym_placeholder: 'es. FitZone Bruxelles Nord',
    lets_go: 'Andiamo 💪',
    discover: 'Scopri',
    matches: 'Match',
    profile: 'Profilo',
    no_bros: 'Ancora nessun gym bro',
    no_bros_sub: 'Sii il primo nella tua palestra — condividi l\'app con i tuoi partner!',
    connect: 'Connetti 🤝',
    request_sent: '✓ Richiesta inviata',
    match: 'compatibilità',
    no_matches: 'Ancora nessun match',
    no_matches_sub: 'Vai su Scopri per connetterti con gym bro!',
    gym_connections: 'Le tue connessioni gym bro',
    tap_to_chat: '💬 Tocca per chattare',
    wants_to_connect: '⏳ Vuole connettersi',
    pending: '⏳ In attesa',
    accept: 'Accetta',
    connected: '✓ Connesso',
    sign_out: 'Esci',
    start_conversation: 'Inizia la conversazione!',
    coordinate: 'Coordina la tua prossima sessione con',
    message_placeholder: 'Messaggio...',
    could_not_send: 'Impossibile inviare il messaggio',
    goal_strength: '🏋️ Forza',
    goal_strength_desc: 'Powerlifting, esercizi pesanti',
    goal_hypertrophy: '💪 Ipertrofia',
    goal_hypertrophy_desc: 'Costruzione muscolare, bodybuilding',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Resistenza, perdita di grasso',
    goal_sport: '⚽ Sport',
    goal_sport_desc: 'Prestazioni atletiche',
    goal_general: '✨ Generale',
    goal_general_desc: 'Fitness generale & salute',
    level_beginner: 'Principiante',
    level_beginner_desc: '< 1 anno',
    level_intermediate: 'Intermedio',
    level_intermediate_desc: '1–3 anni',
    level_advanced: 'Avanzato',
    level_advanced_desc: '3+ anni',
    time_morning: '🌅 Mattina',
    time_morning_desc: '6am – 12pm',
    time_afternoon: '☀️ Pomeriggio',
    time_afternoon_desc: '12pm – 5pm',
    time_evening: '🌙 Sera',
    time_evening_desc: '5pm – 10pm',
    choose_language: 'Scegli la tua lingua',
    language_sub: 'Puoi cambiarlo in seguito nelle impostazioni',
  },
  pt: {
    tagline: 'Encontra o teu parceiro de treino na Bélgica',
    welcome_back: 'Bem-vindo de volta',
    create_account: 'Criar conta',
    email: 'Endereço de e-mail',
    password: 'Palavra-passe',
    loading: 'A carregar...',
    sign_in: 'Entrar',
    no_account: 'Não tens conta? ',
    have_account: 'Já tens conta? ',
    sign_up: 'Registar',
    footer: 'Mais fortes juntos. Encontra o teu parceiro de treino.',
    fill_fields: 'Preenche todos os campos',
    error: 'Erro',
    tell_us: 'Fala-nos sobre ti',
    profile_visible: 'É isto que os outros gym bros vão ver no teu perfil',
    username_placeholder: 'Username (ex. ironarthur)',
    full_name: 'Nome completo',
    bio_placeholder: 'Bio curta — o que te motiva a treinar? (opcional)',
    continue: 'Continuar →',
    saving: 'A guardar...',
    username_required: 'Username e nome são obrigatórios',
    username_short: 'O username deve ter pelo menos 3 caracteres',
    training_profile: 'O teu perfil de treino',
    training_sub: 'Usamos isto para encontrar o teu gym bro perfeito',
    primary_goal: 'Objetivo principal',
    experience_level: 'Nível de experiência',
    pref_time: 'Horário preferido',
    back: '← Voltar',
    complete_all: 'Por favor completa todas as seleções',
    your_gym: 'O teu ginásio',
    gym_sub: 'Vamos mostrar-te gym bros que treinam no mesmo local',
    search_gym: '🔍  Procurar ginásio ou cidade...',
    select_gym: 'Por favor seleciona o teu ginásio',
    enter_gym_name: 'Introduz o nome do teu ginásio',
    gym_placeholder: 'ex. FitZone Bruxelas Norte',
    lets_go: 'Vamos lá 💪',
    discover: 'Descobrir',
    matches: 'Matches',
    profile: 'Perfil',
    no_bros: 'Ainda sem gym bros',
    no_bros_sub: 'Sê o primeiro no teu ginásio — partilha a app com os teus parceiros!',
    connect: 'Ligar 🤝',
    request_sent: '✓ Pedido enviado',
    match: 'compatibilidade',
    no_matches: 'Ainda sem matches',
    no_matches_sub: 'Vai a Descobrir para te ligar a gym bros!',
    gym_connections: 'As tuas ligações gym bro',
    tap_to_chat: '💬 Toca para conversar',
    wants_to_connect: '⏳ Quer ligar-se',
    pending: '⏳ Pendente',
    accept: 'Aceitar',
    connected: '✓ Ligado',
    sign_out: 'Terminar sessão',
    start_conversation: 'Inicia a conversa!',
    coordinate: 'Coordena a tua próxima sessão com',
    message_placeholder: 'Mensagem...',
    could_not_send: 'Não foi possível enviar a mensagem',
    goal_strength: '🏋️ Força',
    goal_strength_desc: 'Powerlifting, movimentos pesados',
    goal_hypertrophy: '💪 Hipertrofia',
    goal_hypertrophy_desc: 'Ganho muscular, bodybuilding',
    goal_cardio: '🏃 Cardio',
    goal_cardio_desc: 'Resistência, perda de gordura',
    goal_sport: '⚽ Desporto',
    goal_sport_desc: 'Desempenho atlético',
    goal_general: '✨ Geral',
    goal_general_desc: 'Fitness geral & saúde',
    level_beginner: 'Iniciante',
    level_beginner_desc: '< 1 ano',
    level_intermediate: 'Intermédio',
    level_intermediate_desc: '1–3 anos',
    level_advanced: 'Avançado',
    level_advanced_desc: '3+ anos',
    time_morning: '🌅 Manhã',
    time_morning_desc: '6h – 12h',
    time_afternoon: '☀️ Tarde',
    time_afternoon_desc: '12h – 17h',
    time_evening: '🌙 Noite',
    time_evening_desc: '17h – 22h',
    choose_language: 'Escolhe o teu idioma',
    language_sub: 'Podes mudar isto mais tarde nas definições',
  },
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

type Screen = 'loading' | 'language' | 'auth' | 'onboarding_basic' | 'onboarding_training' | 'onboarding_gym' | 'main'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [lang, setLang] = useState('en')

  const t = T[lang] || T['en']

  useEffect(() => {
    async function init() {
      const savedLang = await AsyncStorage.getItem('gymbro_lang')
      if (savedLang) setLang(savedLang)

      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (!savedLang) {
        setScreen('language')
        return
      }

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, gym_id, training_goal')
          .eq('id', session.user.id)
          .single()
        setScreen(profile?.username && profile?.gym_id && profile?.training_goal ? 'main' : 'onboarding_basic')
      } else {
        setScreen('auth')
      }
    }
    init()

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setScreen('auth')
    })
  }, [])

  async function selectLanguage(code: string) {
    setLang(code)
    await AsyncStorage.setItem('gymbro_lang', code)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, gym_id, training_goal')
        .eq('id', session.user.id)
        .single()
      setScreen(profile?.username && profile?.gym_id && profile?.training_goal ? 'main' : 'onboarding_basic')
    } else {
      setScreen('auth')
    }
  }

  if (screen === 'loading') return <LoadingScreen />
  if (screen === 'language') return <LanguageScreen onSelect={selectLanguage} />
  if (screen === 'auth') return <AuthScreen t={t} onAuth={(type) => type === 'existing' ? setScreen('main') : setScreen('onboarding_basic')} />
  if (screen === 'onboarding_basic') return <OnboardingBasic t={t} onNext={() => setScreen('onboarding_training')} session={session} />
  if (screen === 'onboarding_training') return <OnboardingTraining t={t} onNext={() => setScreen('onboarding_gym')} onBack={() => setScreen('onboarding_basic')} session={session} />
  if (screen === 'onboarding_gym') return <OnboardingGym t={t} onNext={() => setScreen('main')} onBack={() => setScreen('onboarding_training')} session={session} />
  if (screen === 'main') return <MainScreen t={t} session={session} onSignOut={() => setScreen('auth')} />
  return null
}

// ─── LANGUAGE SCREEN ──────────────────────────────────────────────────────────

function LanguageScreen({ onSelect }: { onSelect: (code: string) => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.langContainer}>
        <Text style={styles.logo}>💪</Text>
        <Text style={styles.appName}>Gym Bro</Text>
        <Text style={styles.langTitle}>Choose your language</Text>
        <Text style={styles.langSub}>Kies je taal · Choisissez votre langue</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity key={lang.code} style={styles.langCard} onPress={() => onSelect(lang.code)} activeOpacity={0.8}>
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.logo}>💪</Text>
      <ActivityIndicator color="#1D9E75" style={{ marginTop: 20 }} />
    </View>
  )
}

function AuthScreen({ t, onAuth }: { t: Record<string,string>, onAuth: (type: 'new' | 'existing') => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuth() {
    if (!email || !password) { Alert.alert(t.error, t.fill_fields); return }
    setLoading(true)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) Alert.alert(t.error, error.message)
      else onAuth('new')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { Alert.alert(t.error, error.message) }
      else {
        const { data: profile } = await supabase.from('profiles').select('username, gym_id, training_goal').eq('id', data.session.user.id).single()
        if (profile?.username && profile?.gym_id && profile?.training_goal) onAuth('existing')
        else onAuth('new')
      }
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
          <Text style={styles.tagline}>{t.tagline}</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.formTitle}>{isSignUp ? t.create_account : t.welcome_back}</Text>
          <TextInput style={styles.input} placeholder={t.email} placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder={t.password} placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{loading ? t.loading : isSignUp ? t.create_account : t.sign_in}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleWrap}>
            <Text style={styles.toggleText}>{isSignUp ? t.have_account : t.no_account}<Text style={styles.toggleLink}>{isSignUp ? t.sign_in : t.sign_up}</Text></Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>{t.footer}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function OnboardingBasic({ t, onNext, session }: { t: Record<string,string>, onNext: () => void, session: Session | null }) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleNext() {
    if (!username || !fullName) { Alert.alert(t.error, t.username_required); return }
    if (username.length < 3) { Alert.alert(t.error, t.username_short); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({ id: session?.user.id, username: username.toLowerCase().trim(), full_name: fullName.trim(), bio: bio.trim(), updated_at: new Date().toISOString() })
    if (error) Alert.alert(t.error, error.message)
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
        <Text style={styles.stepTitle}>{t.tell_us}</Text>
        <Text style={styles.stepSub}>{t.profile_visible}</Text>
        <TextInput style={styles.input} placeholder={t.username_placeholder} placeholderTextColor="#999" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder={t.full_name} placeholderTextColor="#999" value={fullName} onChangeText={setFullName} />
        <TextInput style={[styles.input, styles.textArea]} placeholder={t.bio_placeholder} placeholderTextColor="#999" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? t.saving : t.continue}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function OnboardingTraining({ t, onNext, onBack, session }: { t: Record<string,string>, onNext: () => void, onBack: () => void, session: Session | null }) {
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const goals = [
    { key: 'strength', label: t.goal_strength, desc: t.goal_strength_desc },
    { key: 'hypertrophy', label: t.goal_hypertrophy, desc: t.goal_hypertrophy_desc },
    { key: 'cardio', label: t.goal_cardio, desc: t.goal_cardio_desc },
    { key: 'sport', label: t.goal_sport, desc: t.goal_sport_desc },
    { key: 'general', label: t.goal_general, desc: t.goal_general_desc },
  ]
  const levels = [
    { key: 'beginner', label: t.level_beginner, desc: t.level_beginner_desc },
    { key: 'intermediate', label: t.level_intermediate, desc: t.level_intermediate_desc },
    { key: 'advanced', label: t.level_advanced, desc: t.level_advanced_desc },
  ]
  const times = [
    { key: 'morning', label: t.time_morning, desc: t.time_morning_desc },
    { key: 'afternoon', label: t.time_afternoon, desc: t.time_afternoon_desc },
    { key: 'evening', label: t.time_evening, desc: t.time_evening_desc },
  ]

  async function handleNext() {
    if (!goal || !level || !time) { Alert.alert(t.error, t.complete_all); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({ id: session?.user.id, training_goal: goal, experience_level: level, updated_at: new Date().toISOString() })
    if (error) Alert.alert(t.error, error.message)
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
        <Text style={styles.stepTitle}>{t.training_profile}</Text>
        <Text style={styles.stepSub}>{t.training_sub}</Text>
        <Text style={styles.sectionLabel}>{t.primary_goal}</Text>
        {goals.map(g => (
          <TouchableOpacity key={g.key} style={[styles.optionCard, goal === g.key && styles.optionSelected]} onPress={() => setGoal(g.key)}>
            <Text style={styles.optionLabel}>{g.label}</Text>
            <Text style={styles.optionDesc}>{g.desc}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sectionLabel}>{t.experience_level}</Text>
        <View style={styles.rowOptions}>
          {levels.map(l => (
            <TouchableOpacity key={l.key} style={[styles.chipCard, level === l.key && styles.optionSelected]} onPress={() => setLevel(l.key)}>
              <Text style={styles.chipLabel}>{l.label}</Text>
              <Text style={styles.chipDesc}>{l.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>{t.pref_time}</Text>
        <View style={styles.rowOptions}>
          {times.map(ti => (
            <TouchableOpacity key={ti.key} style={[styles.chipCard, time === ti.key && styles.optionSelected]} onPress={() => setTime(ti.key)}>
              <Text style={styles.chipLabel}>{ti.label}</Text>
              <Text style={styles.chipDesc}>{ti.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? t.saving : t.continue}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function OnboardingGym({ t, onNext, onBack, session }: { t: Record<string,string>, onNext: () => void, onBack: () => void, session: Session | null }) {
  const [selectedGymId, setSelectedGymId] = useState('')
  const [gyms, setGyms] = useState<{ id: string, name: string, city: string }[]>([])
  const [search, setSearch] = useState('')
  const [customGym, setCustomGym] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('gyms').select('id, name, city').order('city').then(({ data }) => { if (data) setGyms(data) })
  }, [])

  const isOther = gyms.find(g => g.id === selectedGymId)?.name === 'Other / My gym is not listed'
  const filteredGyms = search.length > 0 ? gyms.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase())) : gyms
  const cities = [...new Set(filteredGyms.map(g => g.city))]

  async function handleNext() {
    if (!selectedGymId) { Alert.alert(t.error, t.select_gym); return }
    if (isOther && !customGym.trim()) { Alert.alert(t.error, t.enter_gym_name); return }
    setLoading(true)
    let gymId = selectedGymId
    if (isOther && customGym.trim()) {
      const { data: existing } = await supabase.from('gyms').select('id').eq('name', customGym.trim()).single()
      if (existing) { gymId = existing.id }
      else {
        const { data: newGym } = await supabase.from('gyms').insert({ name: customGym.trim(), address: 'Belgium', city: 'Other', location: 'POINT(4.3517 50.8503)' }).select('id').single()
        if (newGym) gymId = newGym.id
      }
    }
    const { error } = await supabase.from('profiles').upsert({ id: session?.user.id, gym_id: gymId, updated_at: new Date().toISOString() })
    if (error) Alert.alert(t.error, error.message)
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
        <Text style={styles.stepTitle}>{t.your_gym}</Text>
        <Text style={styles.stepSub}>{t.gym_sub}</Text>
        <TextInput style={[styles.input, { marginBottom: 16 }]} placeholder={t.search_gym} placeholderTextColor="#999" value={search} onChangeText={setSearch} />
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
            <Text style={styles.sectionLabel}>{t.enter_gym_name}</Text>
            <TextInput style={styles.input} placeholder={t.gym_placeholder} placeholderTextColor="#999" value={customGym} onChangeText={setCustomGym} />
          </View>
        )}
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? t.saving : t.lets_go}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function MainScreen({ t, session, onSignOut }: { t: Record<string,string>, session: Session | null, onSignOut: () => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'profile'>('discover')
  const [activeChat, setActiveChat] = useState<{ matchId: string, otherUser: any } | null>(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*, gyms(name, city)').eq('id', session?.user.id).single()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  if (loading) return <LoadingScreen />

  if (activeChat) {
    return <ChatScreen t={t} session={session} matchId={activeChat.matchId} otherUser={activeChat.otherUser} onBack={() => setActiveChat(null)} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {activeTab === 'discover' && <DiscoverTab t={t} session={session} profile={profile} />}
      {activeTab === 'matches' && <MatchesTab t={t} session={session} onOpenChat={(matchId, otherUser) => setActiveChat({ matchId, otherUser })} />}
      {activeTab === 'profile' && <ProfileTab t={t} profile={profile} onSignOut={signOut} />}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('discover')}>
          <Text style={[styles.tabIcon, activeTab === 'discover' && styles.tabActive]}>🔍</Text>
          <Text style={[styles.tabLabel, activeTab === 'discover' && styles.tabActive]}>{t.discover}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabIcon, activeTab === 'matches' && styles.tabActive]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'matches' && styles.tabActive]}>{t.matches}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabActive]}>{t.profile}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function ChatScreen({ t, session, matchId, otherUser, onBack }: { t: Record<string,string>, session: Session | null, matchId: string, otherUser: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    loadMessages()
    const channel = supabase.channel(`chat:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        if (payload.new.sender_id !== session?.user.id) {
          setMessages(prev => [...prev, payload.new])
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100)
  }

  async function sendMessage() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    const { data, error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: session?.user.id, content: trimmed }).select().single()
    if (error) { Alert.alert(t.error, t.could_not_send); setText(trimmed) }
    else if (data) { setMessages(prev => [...prev, data]); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100) }
    setSending(false)
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.chatBackBtn}>
          <Text style={styles.chatBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{(otherUser?.full_name || otherUser?.username || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.chatHeaderName}>{otherUser?.full_name || otherUser?.username}</Text>
            <Text style={styles.chatHeaderSub}>@{otherUser?.username}</Text>
          </View>
        </View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#1D9E75" /></View> : (
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.messagesList} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (
            <View style={styles.chatEmpty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
              <Text style={styles.chatEmptyTitle}>{t.start_conversation}</Text>
              <Text style={styles.chatEmptySub}>{t.coordinate} {otherUser?.full_name || otherUser?.username}</Text>
            </View>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === session?.user.id
            return (
              <View key={msg.id} style={[styles.messageBubbleWrap, isMe ? styles.messageMeWrap : styles.messageThemWrap]}>
                <View style={[styles.messageBubble, isMe ? styles.messageMeBubble : styles.messageThemBubble]}>
                  <Text style={[styles.messageText, isMe ? styles.messageMeText : styles.messageThemText]}>{msg.content}</Text>
                </View>
                <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
              </View>
            )
          })}
        </ScrollView>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.chatInputRow}>
          <TextInput style={styles.chatInput} placeholder={t.message_placeholder} placeholderTextColor="#999" value={text} onChangeText={setText} multiline maxLength={500} />
          <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!text.trim() || sending} activeOpacity={0.8}>
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function DiscoverTab({ t, session, profile }: { t: Record<string,string>, session: Session | null, profile: any }) {
  const [bros, setBros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sentRequests, setSentRequests] = useState<string[]>([])

  useEffect(() => { loadBros() }, [profile])

  async function loadBros() {
    if (!profile?.gym_id) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('*').eq('gym_id', profile.gym_id).neq('id', session?.user.id)
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
    const { error } = await supabase.from('matches').insert({ user_a: session?.user.id, user_b: broId, initiated_by: session?.user.id, status: 'pending' })
    if (!error) setSentRequests(prev => [...prev, broId])
    else if (error.message.includes('duplicate')) setSentRequests(prev => [...prev, broId])
  }

  const goalEmoji: any = { strength: '🏋️', hypertrophy: '💪', cardio: '🏃', sport: '⚽', general: '✨' }
  const levelColor: any = { beginner: '#4CAF50', intermediate: '#FF9800', advanced: '#F44336' }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.discoverHeader}>
        <View>
          <Text style={styles.discoverTitle}>{t.discover}</Text>
          <Text style={styles.discoverSub}>{profile?.gyms?.name || ''}</Text>
        </View>
        <Text style={{ fontSize: 28 }}>💪</Text>
      </View>
      {loading && <ActivityIndicator color="#1D9E75" style={{ marginTop: 40 }} />}
      {!loading && bros.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
          <Text style={styles.emptyTitle}>{t.no_bros}</Text>
          <Text style={styles.emptySub}>{t.no_bros_sub}</Text>
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
                <Text style={[styles.scoreText, { color: score >= 80 ? '#1D9E75' : '#FF9800' }]}>{score}% {t.match}</Text>
              </View>
            </View>
            {bro.bio ? <Text style={styles.broBio}>{bro.bio}</Text> : null}
            <View style={styles.broTags}>
              {bro.training_goal && <View style={styles.tag}><Text style={styles.tagText}>{goalEmoji[bro.training_goal]} {bro.training_goal}</Text></View>}
              {bro.experience_level && <View style={[styles.tag, { borderColor: levelColor[bro.experience_level] }]}><Text style={[styles.tagText, { color: levelColor[bro.experience_level] }]}>{bro.experience_level}</Text></View>}
            </View>
            <TouchableOpacity style={[styles.connectBtn, sent && styles.connectBtnSent]} onPress={() => !sent && sendRequest(bro.id)} activeOpacity={0.8}>
              <Text style={[styles.connectBtnText, sent && styles.connectBtnTextSent]}>{sent ? t.request_sent : t.connect}</Text>
            </TouchableOpacity>
          </View>
        )
      })}
    </ScrollView>
  )
}

function MatchesTab({ t, session, onOpenChat }: { t: Record<string,string>, session: Session | null, onOpenChat: (matchId: string, otherUser: any) => void }) {
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
      <Text style={styles.discoverTitle}>{t.matches}</Text>
      <Text style={[styles.discoverSub, { marginBottom: 20 }]}>{t.gym_connections}</Text>
      {loading && <ActivityIndicator color="#1D9E75" />}
      {!loading && matches.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🤝</Text>
          <Text style={styles.emptyTitle}>{t.no_matches}</Text>
          <Text style={styles.emptySub}>{t.no_matches_sub}</Text>
        </View>
      )}
      {matches.map(match => {
        const isA = match.user_a === session?.user.id
        const other = isA ? match.user_b_profile : match.user_a_profile
        const isPending = match.status === 'pending'
        const isIncoming = isPending && match.initiated_by !== session?.user.id
        const isAccepted = match.status === 'accepted'
        return (
          <TouchableOpacity key={match.id} style={styles.matchCard} onPress={() => isAccepted && onOpenChat(match.id, other)} activeOpacity={isAccepted ? 0.7 : 1}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{(other?.full_name || other?.username || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.broName}>{other?.full_name || other?.username}</Text>
              <Text style={styles.broUsername}>@{other?.username}</Text>
              <View style={[styles.statusBadge, { backgroundColor: isAccepted ? '#f0faf6' : '#fff8f0' }]}>
                <Text style={{ fontSize: 11, color: isAccepted ? '#1D9E75' : '#FF9800', fontWeight: '600' }}>
                  {isAccepted ? t.tap_to_chat : isIncoming ? t.wants_to_connect : t.pending}
                </Text>
              </View>
            </View>
            {isIncoming && (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptMatch(match.id)}>
                <Text style={styles.acceptBtnText}>{t.accept}</Text>
              </TouchableOpacity>
            )}
            {isAccepted && <Text style={{ fontSize: 20, color: '#ccc' }}>›</Text>}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

function ProfileTab({ t, profile, onSignOut }: { t: Record<string,string>, profile: any, onSignOut: () => void }) {
  const goalEmoji: any = { strength: '🏋️', hypertrophy: '💪', cardio: '🏃', sport: '⚽', general: '✨' }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.discoverTitle}>{t.profile}</Text>
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
          <Text style={styles.statLabel}>{profile?.training_goal || ''}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🎯</Text>
          <Text style={styles.statLabel}>{profile?.experience_level || ''}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🏋️</Text>
          <Text style={styles.statLabel}>{profile?.gyms?.name?.split(' ')[0] || ''}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
        <Text style={styles.signOutText}>{t.sign_out}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

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
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  chatBackBtn: { padding: 4 },
  chatBackText: { fontSize: 24, color: '#1a1a1a' },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  chatAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chatHeaderName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  chatHeaderSub: { fontSize: 12, color: '#888' },
  messagesList: { padding: 16, paddingBottom: 8 },
  chatEmpty: { alignItems: 'center', paddingVertical: 60 },
  chatEmptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  chatEmptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  messageBubbleWrap: { marginBottom: 8, maxWidth: '78%' },
  messageMeWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageThemWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  messageMeBubble: { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  messageThemBubble: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageMeText: { color: '#fff' },
  messageThemText: { color: '#1a1a1a' },
  messageTime: { fontSize: 11, color: '#aaa', marginTop: 3, marginHorizontal: 4 },
  chatInputRow: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', alignItems: 'flex-end' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1a1a1a', backgroundColor: '#fafafa', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },
  langContainer: { flexGrow: 1, padding: 28, alignItems: 'center' },
  langTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 16, marginBottom: 6, textAlign: 'center' },
  langSub: { fontSize: 13, color: '#888', marginBottom: 32, textAlign: 'center' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' },
  langCard: { width: '44%', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 16, padding: 18, alignItems: 'center', backgroundColor: '#fff' },
  langFlag: { fontSize: 36, marginBottom: 8 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
})
