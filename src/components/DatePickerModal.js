import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Pressable, ScrollView, FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';

function sameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();
}

// Build an array of years around current
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 20 + i); // -20 to +9

export default function DatePickerModal({ visible, value, maximumDate, minimumDate, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const MONTHS     = t('common.months', { returnObjects: true });
  const DAY_LABELS = t('common.dayLabels', { returnObjects: true });

  const init = value ? new Date(value) : new Date();
  const [viewYear,    setViewYear]    = useState(init.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(init.getMonth());
  const [selected,    setSelected]    = useState(init);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const yearListRef = useRef(null);

  useEffect(() => {
    if (visible && value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(d);
      setShowYearPicker(false);
    }
  }, [visible]);

  // Scroll year list to selected year when it opens
  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const idx = YEARS.indexOf(viewYear);
      if (idx >= 0) {
        setTimeout(() => {
          yearListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 });
        }, 100);
      }
    }
  }, [showYearPicker]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function selectYear(yr) {
    setViewYear(yr);
    setShowYearPicker(false);
  }

  function buildGrid() {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const days  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function isDisabled(day) {
    if (!day) return false;
    const d = new Date(viewYear, viewMonth, day);
    if (minimumDate) {
      const min = new Date(minimumDate); min.setHours(0, 0, 0, 0);
      if (d < min) return true;
    }
    if (maximumDate) {
      const max = new Date(maximumDate); max.setHours(23, 59, 59, 999);
      if (d > max) return true;
    }
    return false;
  }

  function selectDay(day) {
    if (!day || isDisabled(day)) return;
    setSelected(new Date(viewYear, viewMonth, day));
  }

  const cells = buildGrid();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} />

      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowYearPicker((v) => !v)}
            activeOpacity={0.8}
            style={styles.yearRow}
          >
            <Text style={styles.headerYear}>{viewYear}</Text>
            <Text style={styles.yearCaret}>{showYearPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerDate}>
            {DAY_LABELS[selected.getDay()]}, {selected.getDate()} {MONTHS[selected.getMonth()].slice(0, 3)}
          </Text>
        </View>

        {/* ── Year picker list ── */}
        {showYearPicker ? (
          <FlatList
            ref={yearListRef}
            data={YEARS}
            keyExtractor={(y) => String(y)}
            style={styles.yearList}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              const isActive = item === viewYear;
              return (
                <TouchableOpacity
                  style={[styles.yearItem, isActive && styles.yearItemActive]}
                  onPress={() => selectYear(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearItemText, isActive && styles.yearItemTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <>
            {/* ── Month nav ── */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
                <Text style={styles.navArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ── Day labels ── */}
            <View style={styles.dayLabels}>
              {DAY_LABELS.map((d, i) => (
                <Text key={i} style={styles.dayLabel}>{d}</Text>
              ))}
            </View>

            {/* ── Grid ── */}
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const isSelected = sameDay(selected, new Date(viewYear, viewMonth, day));
                const disabled   = isDisabled(day);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.cell}
                    onPress={() => selectDay(day)}
                    activeOpacity={0.7}
                    disabled={disabled}
                  >
                    <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                      <Text style={[
                        styles.cellText,
                        isSelected && styles.cellTextSelected,
                        disabled   && styles.cellTextDisabled,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onConfirm(selected)} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.confirmText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: '12%',
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  // Header
  header: {
    backgroundColor: '#E85D04',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  yearRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerYear: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginRight: 6 },
  yearCaret:  { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  headerDate: { fontSize: 24, color: '#fff', fontWeight: '800' },

  // Year picker
  yearList: { height: 220 },
  yearItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  yearItemActive: {
    backgroundColor: '#fff3ee',
  },
  yearItemText:       { fontSize: 16, color: '#555', fontWeight: '500' },
  yearItemTextActive: { fontSize: 20, color: '#E85D04', fontWeight: '800' },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  navBtn:     { padding: 8 },
  navArrow:   { fontSize: 24, color: '#E85D04', fontWeight: '400', lineHeight: 26 },
  monthTitle: { fontSize: 15, fontWeight: '700', color: '#111' },

  // Day labels
  dayLabels: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 2 },
  dayLabel:  { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#aaa' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 6 },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: (CELL_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: '#E85D04' },
  cellText:          { fontSize: 14, color: '#111', fontWeight: '500' },
  cellTextSelected:  { color: '#fff', fontWeight: '800' },
  cellTextDisabled:  { color: '#ccc' },

  // Actions
  actions:     { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionBtn:   { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText:  { fontSize: 15, fontWeight: '700', color: '#888' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#E85D04' },
});
