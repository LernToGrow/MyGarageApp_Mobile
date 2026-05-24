import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  BackHandler, Animated, Dimensions,
} from 'react-native';
import { registerAlertHandler } from '../utils/alert';

const { width } = Dimensions.get('window');

export default function AppAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig]   = useState({ title: '', message: '', buttons: [] });
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerAlertHandler((cfg) => {
      setConfig(cfg);
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    useNativeDriver: true, tension: 180, friction: 12 }),
        Animated.timing(opacityAnim, { toValue: 1,    useNativeDriver: true, duration: 180 }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  function dismiss(btn) {
    Animated.parallel([
      Animated.timing(scaleAnim,   { toValue: 0.9, useNativeDriver: true, duration: 120 }),
      Animated.timing(opacityAnim, { toValue: 0,   useNativeDriver: true, duration: 120 }),
    ]).start(() => {
      setVisible(false);
      btn?.onPress?.();
    });
  }

  const isDestructive = (s) => s === 'destructive';
  const isCancel      = (s) => s === 'cancel';
  const isPrimary     = (s) => !isDestructive(s) && !isCancel(s);

  // Icon based on content
  const icon = config.buttons.some((b) => isDestructive(b.style))
    ? { char: '!', bg: '#fff0f0', color: '#c62828' }
    : config.title?.toLowerCase().includes('success') || config.title?.toLowerCase().includes('saved') || config.title?.toLowerCase().includes('paid') || config.message?.toLowerCase().includes('success')
      ? { char: '✓', bg: '#e8f5e9', color: '#2d6a4f' }
      : { char: 'i', bg: '#fff5ef', color: '#E85D04' };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>

          {/* Icon bubble */}
          <View style={[styles.iconBubble, { backgroundColor: icon.bg }]}>
            <Text style={[styles.iconText, { color: icon.color }]}>{icon.char}</Text>
          </View>

          {/* Title */}
          {!!config.title && (
            <Text style={styles.title}>{config.title}</Text>
          )}

          {/* Message */}
          {!!config.message && (
            <Text style={styles.message}>{config.message}</Text>
          )}

          {/* Buttons */}
          <View style={styles.btnWrap}>
            {config.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  isDestructive(btn.style) && styles.btnDestructive,
                  isCancel(btn.style)      && styles.btnCancel,
                  isPrimary(btn.style)     && styles.btnPrimary,
                ]}
                onPress={() => dismiss(btn)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.btnText,
                  isDestructive(btn.style) && styles.btnTextDestructive,
                  isCancel(btn.style)      && styles.btnTextCancel,
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: width - 56,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnWrap: {
    width: '100%',
    gap: 10,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#E85D04',
  },
  btnCancel: {
    backgroundColor: '#F4F4F4',
  },
  btnDestructive: {
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#f5c6c6',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  btnTextCancel: {
    color: '#444',
  },
  btnTextDestructive: {
    color: '#c62828',
  },
});
