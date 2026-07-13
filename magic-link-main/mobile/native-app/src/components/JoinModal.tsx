import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppTheme } from '../theme';

interface JoinModalProps {
  visible: boolean;
  theme: AppTheme;
  onSubmit: (name: string) => void;
}

export function JoinModalControlled({
  visible,
  theme,
  value,
  onChange,
  onSubmit
}: JoinModalProps & {
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.eyebrow}>Enter the network</Text>
          <Text style={styles.title}>Choose your signal name</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Your name"
            placeholderTextColor={theme.muted}
            maxLength={24}
            autoFocus
            onSubmitEditing={() => onSubmit(value)}
          />
          <Pressable style={styles.button} onPress={() => onSubmit(value)}>
            <Text style={styles.buttonText}>Join radar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(1, 8, 10, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 18
    },
    card: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: 24,
      gap: 14,
      alignItems: 'center',
      ...theme.shadow
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      ...theme.shadow
    },
    eyebrow: {
      color: theme.muted,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontSize: 11
    },
    title: {
      color: theme.text,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '700'
    },
    input: {
      width: '100%',
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      color: theme.text,
      paddingHorizontal: 14
    },
    button: {
      width: '100%',
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center'
    },
    buttonText: {
      color: '#052118',
      fontWeight: '800'
    }
  });
}
