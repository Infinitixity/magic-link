import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { GridOverlay } from './GridOverlay';
import type { AppTheme } from '../theme';
import type { User } from '../types';
import { identityLabel } from '../utils/identity';

interface RadarPanelProps {
  theme: AppTheme;
  reduceMotion: boolean;
  me: User | null;
  users: User[];
  privateInvite: boolean;
  onPrivateInviteChange: (value: boolean) => void;
  onInviteUser: (userId: string) => void;
}

export function RadarPanel({
  theme,
  reduceMotion,
  me,
  users,
  privateInvite,
  onPrivateInviteChange,
  onInviteUser
}: RadarPanelProps) {
  const styles = createStyles(theme);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: false
      })
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 2.7]
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.32, 0.08, 0]
  });
  const centerScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.07, 1]
  });
  const blipScale = pulse.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 1.09, 1]
  });

  const onlineUsers = users.filter((u) => u.id !== me?.id);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Online signals</Text>
          <Text style={styles.title}>Radar</Text>
        </View>

        <Pressable
          style={styles.toggle}
          onPress={() => onPrivateInviteChange(!privateInvite)}
        >
          <View style={[styles.checkbox, privateInvite && styles.checkboxActive]} />
          <Text style={styles.toggleText}>Private invite</Text>
        </Pressable>
      </View>

      <View style={styles.radar}>
        <View style={styles.radarClip}>
          <GridOverlay spacing={42} opacity={0.12} />

          <View style={styles.radialLayer1} />
          <View style={styles.radialLayer2} />
          <View style={styles.radialLayer3} />
          <View style={styles.radialLayer4} />

          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />
          <View style={styles.crossVertical} />
          <View style={styles.crossHorizontal} />
          {!reduceMotion ? (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }]
                }
              ]}
              pointerEvents="none"
            />
          ) : null}

          <Animated.View style={[styles.centerDot, !reduceMotion && { transform: [{ scale: centerScale }] }]}>
            <Text style={styles.centerText}>YOU</Text>
          </Animated.View>

          {onlineUsers.map((user) => (
            <Pressable
              key={user.id}
              style={[
                styles.blipWrap,
                { left: `${user.x}%`, top: `${user.y}%` }
              ]}
              onPress={() => onInviteUser(user.id)}
            >
              <Animated.View style={[styles.blip, !reduceMotion && { transform: [{ scale: blipScale }] }, { backgroundColor: user.color || theme.accent, shadowColor: user.color || theme.accent }]}>
                <View style={styles.blipInner}>
                  <Text style={styles.blipInitials}>{user.username.slice(0, 2).toUpperCase()}</Text>
                </View>
              </Animated.View>
              <View style={styles.blipLabelWrap}>
                <Text style={styles.blipLabel} numberOfLines={1} ellipsizeMode="tail">{identityLabel(user)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{onlineUsers.length} online</Text>
        <Text style={styles.footerText}>{me ? identityLabel(me) : 'Not joined'}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 18,
      gap: 12,
      ...theme.shadow
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16
    },
    eyebrow: {
      color: theme.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 6
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '700'
    },
    toggle: {
      minWidth: 148,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bg
    },
    checkboxActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent
    },
    toggleText: {
      color: theme.muted,
      fontSize: 13
    },
    radar: {
      width: '100%',
      aspectRatio: 1,
      maxWidth: 380,
      alignSelf: 'center',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(86, 240, 192, 0.46)',
      backgroundColor: 'rgba(86, 240, 192, 0.04)',
      overflow: 'hidden',
      elevation: 0,
    },
    radarClip: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 9999,
      overflow: 'hidden',
    },
    radialLayer1: {
      position: 'absolute',
      top: '22.5%',
      left: '22.5%',
      right: '22.5%',
      bottom: '22.5%',
      borderRadius: 9999,
      backgroundColor: 'rgba(86, 240, 192, 0.02)',
    },
    radialLayer2: {
      position: 'absolute',
      top: '35%',
      left: '35%',
      right: '35%',
      bottom: '35%',
      borderRadius: 9999,
      backgroundColor: 'rgba(86, 240, 192, 0.04)',
    },
    radialLayer3: {
      position: 'absolute',
      top: '44%',
      left: '44%',
      right: '44%',
      bottom: '44%',
      borderRadius: 9999,
      backgroundColor: 'rgba(86, 240, 192, 0.06)',
    },
    radialLayer4: {
      position: 'absolute',
      top: '48%',
      left: '48%',
      right: '48%',
      bottom: '48%',
      borderRadius: 9999,
      backgroundColor: 'rgba(86, 240, 192, 0.08)',
    },
    ringOuter: {
      position: 'absolute',
      top: '18%',
      left: '18%',
      right: '18%',
      bottom: '18%',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(86, 240, 192, 0.18)'
    },
    ringInner: {
      position: 'absolute',
      top: '36%',
      left: '36%',
      right: '36%',
      bottom: '36%',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(86, 240, 192, 0.18)'
    },
    crossVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      width: 1,
      backgroundColor: 'rgba(86, 240, 192, 0.11)',
    },
    crossHorizontal: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      backgroundColor: 'rgba(86, 240, 192, 0.11)',
    },
    pulseRing: {
      position: 'absolute',
      width: 112,
      height: 112,
      borderRadius: 56,
      top: '50%',
      left: '50%',
      marginTop: -56,
      marginLeft: -56,
      borderWidth: 2,
      borderColor: 'rgba(86, 240, 192, 0.8)',
      backgroundColor: 'rgba(86, 240, 192, 0.05)',
    },
    centerDot: {
      position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 24,
      top: '50%',
      left: '50%',
      marginTop: -24,
      marginLeft: -24,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center'
    },
    centerText: {
      color: '#052118',
      fontWeight: '800',
      fontSize: 11
    },
    blipWrap: {
      position: 'absolute',
      width: 46,
      height: 46,
      transform: [{ translateX: -23 }, { translateY: -23 }]
    },
    blip: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.72)',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.32,
      shadowRadius: 32,
      elevation: 6,
    },
    blipInner: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    blipInitials: {
      color: '#102019',
      fontWeight: '800',
      fontSize: 12
    },
    blipLabelWrap: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    blipLabel: {
      maxWidth: 86,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(7, 16, 19, 0.82)',
      color: theme.text,
      fontSize: 11,
      fontWeight: '700',
      overflow: 'hidden',
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: theme.line
    },
    footerText: {
      color: theme.muted,
      fontSize: 12
    }
  });
}
