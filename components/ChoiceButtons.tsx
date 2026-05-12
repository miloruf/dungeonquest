import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChoiceType } from '../types';

export interface ChoiceDisplay {
  text: string;
  requiredRoll: number;
  type: ChoiceType;
  isClassSkill?: boolean;
}

interface Props {
  choices: ChoiceDisplay[];
  onChoice: (choice: ChoiceDisplay) => void;
  disabled?: boolean;
  label?: string;
}

export default function ChoiceButtons({ choices, onChoice, disabled = false, label = 'Choose your action:' }: Props) {
  if (choices.length === 0) return null;

  const regular = choices.filter(c => !c.isClassSkill);
  const skill   = choices.find(c => c.isClassSkill);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {regular.map((choice, i) => (
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
      {skill && (
        <TouchableOpacity
          style={[styles.skillButton, disabled && styles.disabled]}
          onPress={() => onChoice(skill)}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={styles.skillIcon}>✨</Text>
          <Text style={styles.skillText}>{skill.text}</Text>
          <Text style={styles.skillRequirement}>Need {skill.requiredRoll}+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label:       { color: '#a29bfe', fontSize: 12, fontWeight: '600', marginBottom: 2 },
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
  disabled:         { opacity: 0.4 },
  index:            { color: '#c9a227', fontSize: 14, fontWeight: '800', width: 20, textAlign: 'center' },
  text:             { color: '#e8e0f0', fontSize: 14, flex: 1 },
  requirement:      { color: '#6c5a8e', fontSize: 11, fontWeight: '600' },
  skillButton:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0f2e', borderRadius: 10, borderWidth: 1.5, borderColor: '#c9a227', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  skillIcon:        { fontSize: 16, width: 20, textAlign: 'center' },
  skillText:        { color: '#f4d03f', fontSize: 14, fontWeight: '700', flex: 1 },
  skillRequirement: { color: '#c9a227', fontSize: 11, fontWeight: '600' },
});
