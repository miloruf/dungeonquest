import { Stack } from 'expo-router';
import { GameProvider } from '../context/gameContext';

export default function RootLayout() {
  return (
    <GameProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="room" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="game" />
        <Stack.Screen name="solo" />
        <Stack.Screen name="result" />
      </Stack>
    </GameProvider>
  );
}
