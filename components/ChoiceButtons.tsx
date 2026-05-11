import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ChoiceDisplay {
  text: string;
  requiredRoll: number;
}

interface Props {
  choices: ChoiceDisplay[];
  onChoice: (choice: ChoiceDisplay) => void;
  disabled?: boolean;
}

export default function ChoiceButtons({ choices, onChoice, disabled = false }: Props) {
  if (choices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Choose your action:</Text>
      {choices.map((choice, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.button, disabled && styles.disabled]}
          onPress={() => onChoice(choice)}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={styles.index}>{i + 1}</Text>
          <Text style={styles.text}>{choice.text}</Text>
          <Text style={styles.requirement}>Need {choice.requiredRoll}+</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: '#a29bfe', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e0f3a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6c3483',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  disabled:    { opacity: 0.4 },
  index:       { color: '#c9a227', fontSize: 14, fontWeight: '800', width: 20, textAlign: 'center' },
  text:        { color: '#e8e0f0', fontSize: 14, flex: 1 },
  requirement: { color: '#6c5a8e', fontSize: 11, fontWeight: '600' },
});
