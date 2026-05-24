import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { searchCustomers } from '../../api/customer.api';

export default function CustomerSearchScreen({ navigation }) {
  const { t } = useTranslation();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef             = useRef(null);

  function handleChange(text) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  }

  async function doSearch(q) {
    try {
      setLoading(true);
      const { data } = await searchCustomers(q.trim());
      setResults(data.customers || []);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={t('customerSearch.placeholder')}
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={handleChange}
          autoFocus
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color="#E85D04" style={{ marginLeft: 8 }} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('CustomerProfile', { customerId: item._id })}
            activeOpacity={0.75}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.phone}>{item.phone}</Text>
              {item.bikes?.length > 0 && (
                <Text style={styles.bikes}>
                  {item.bikes.map((b) => b.plate_number || `${b.make} ${b.model}`).join('  ·  ')}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('customerSearch.noCustomers')}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f6f6f6' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
  },
  input:       { flex: 1, fontSize: 15, color: '#111' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E85D04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText:  { color: '#fff', fontSize: 18, fontWeight: '800' },
  rowInfo:     { flex: 1 },
  name:        { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 },
  phone:       { fontSize: 13, color: '#666' },
  bikes:       { fontSize: 12, color: '#aaa', marginTop: 2 },
  chevron:     { fontSize: 22, color: '#ccc', marginLeft: 8 },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 16, color: '#aaa' },
});
