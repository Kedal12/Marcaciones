// app/ausencias.tsx - VERSIÓN COMPLETA CON NAVEGACIÓN

import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

dayjs.locale('es');

type Item = {
  id: number;
  tipo: string;
  desde: string;
  hasta: string;
  observacion?: string | null;
};

export default function AusenciasScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const token = await SecureStore.getItemAsync('userToken');
      const API_URL = Constants.expoConfig?.extra?.apiUrl;

      console.log('🔍 Cargando ausencias desde:', `${API_URL}/api/dashboard/ausencias-detalle-mes`);

    const { data } = await axios.get(`${API_URL}/api/dashboard/ausencias-detalle-mes`, { headers:{ Authorization:`Bearer ${token}` }});
    const payload = Array.isArray(data) ? data : (data?.items ?? []);
    setItems(payload);

      console.log('✅ Ausencias cargadas:', data);
      setItems(data);
    } catch (e: any) {
      console.error('❌ Error cargando ausencias:', e);
      setErr(e?.response?.data || e?.message || 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      {/* ✅ HEADER CON BOTÓN DE VOLVER */}
      <Stack.Screen
        options={{
          title: 'Detalle de Ausencias',
          headerShown: true,
          headerBackTitle: 'Volver',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 10 }}
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>← Volver</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 10, color: '#666' }}>Cargando ausencias...</Text>
          </View>
        )}

        {!loading && err && (
          <View style={s.center}>
            <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 }}>
              ⚠️ {err}
            </Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 20 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !err && items.length === 0 && (
          <View style={s.center}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>✓</Text>
            <Text style={{ color: '#999', fontSize: 16 }}>No hay ausencias registradas</Text>
          </View>
        )}

        {!loading && !err && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id.toString()}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            renderItem={({ item }) => (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{item.tipo.toUpperCase()}</Text>
                  <Text style={s.sub}>
                    {dayjs(item.desde).format('DD MMM')} — {dayjs(item.hasta).format('DD MMM YYYY')}
                  </Text>
                  {!!item.observacion && <Text style={s.obs}>{item.observacion}</Text>}
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff',
    padding: 20
  },
  row: { 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  sep: { height: 1, backgroundColor: '#eee' },
  title: { fontWeight: '700', fontSize: 15, color: '#111' },
  sub: { color: '#555', marginTop: 4 },
  obs: { color: '#777', marginTop: 6, fontStyle: 'italic' },
});