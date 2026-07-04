import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { Fredoka_400Regular, Fredoka_500Medium } from '@expo-google-fonts/fredoka';
import { Dongle_400Regular } from '@expo-google-fonts/dongle';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';

import { LanguageProvider } from './src/context/LanguageContext';
import EntryScreen from './src/surfaces/entry/EntryScreen';
import StudentApp from './src/surfaces/student/StudentApp';
import { colors } from './src/theme';

export type RootStackParamList = {
  Entry: undefined;
  Student: { roomCode: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

function EntryRoute({ navigation }: any) {
  return <EntryScreen onEnter={(roomCode: string) => navigation.navigate('Student', { roomCode })} />;
}

function StudentRoute({ route, navigation }: any) {
  return <StudentApp roomCode={route.params.roomCode} onExit={() => navigation.navigate('Entry')} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Dongle_400Regular,
    NotoNastaliqUrdu_400Regular,
  });

  useEffect(() => {
    // Lock to landscape at runtime — belt-and-suspenders alongside app.json so
    // the kiosk iPad stays landscape in Expo Go too.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .then(() => console.log('[orient] locked LANDSCAPE'))
      .catch((e) => console.log('[orient] lock FAILED', String(e)));
  }, []);

  const onReady = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.gate} />;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer onReady={onReady}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg1 } }}>
            <Stack.Screen name="Entry" component={EntryRoute} />
            <Stack.Screen name="Student" component={StudentRoute} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar hidden />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: colors.bg1 },
});
