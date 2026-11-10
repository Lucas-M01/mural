import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Mural
      </Text>
      <Text style={styles.description}>Notas e tarefas em dupla</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E8',
    padding: 24,
  },
  title: { color: '#242017', fontSize: 40, fontWeight: '700' },
  description: { color: '#524939', fontSize: 18, marginTop: 8 },
});
