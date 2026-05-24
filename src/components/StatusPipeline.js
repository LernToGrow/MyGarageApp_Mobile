import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const KEYS = ['received', 'inspecting', 'estimated', 'in_progress', 'done', 'paid'];

export default function StatusPipeline({ status }) {
  const { t } = useTranslation();
  const currentIndex = KEYS.indexOf(status);

  return (
    <View style={styles.container}>
      {KEYS.map((key, i) => {
        const done    = i < currentIndex;
        const current = i === currentIndex;
        return (
          <React.Fragment key={key}>
            <View style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                {done && <Text style={styles.tick}>✓</Text>}
                {current && <View style={styles.dotInner} />}
              </View>
              <Text style={[styles.label, (done || current) && styles.labelActive]}>
                {t(`jobs.pipeline.${key}`)}
              </Text>
            </View>
            {i < KEYS.length - 1 && (
              <View style={[styles.line, i < currentIndex && styles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  step:        { alignItems: 'center', width: 48 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotDone:     { borderColor: '#2d6a4f', backgroundColor: '#2d6a4f' },
  dotCurrent:  { borderColor: '#E85D04' },
  dotInner:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E85D04' },
  tick:        { color: '#fff', fontSize: 12, fontWeight: '700' },
  label:       { fontSize: 10, color: '#aaa', textAlign: 'center' },
  labelActive: { color: '#333', fontWeight: '600' },
  line:        { flex: 1, height: 2, backgroundColor: '#ddd', marginTop: 11 },
  lineDone:    { backgroundColor: '#2d6a4f' },
});
