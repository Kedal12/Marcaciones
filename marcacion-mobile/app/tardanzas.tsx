// app/tardanzas.tsx - VERSIÓN COMPLETA CON NAVEGACIÓN

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
  fecha: string;
  diaSemana: string;
  horaEsperada: string;
  horaLlegada: string;
  minutosTarde: string;
  compensada: boolean;
};

export default function TardanzasScreen() {
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

      console.log('🔍 Cargando tardanzas desde:', `${API_URL}/api/dashboard/tardanzas-detalle-mes`);

      const { data } = await axios.get<Item[]>(
        `${API_URL}/api/dashboard/tardanzas-detalle-mes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('✅ Tardanzas cargadas:', data);
      setItems(data);
    } catch (e: any) {
      console.error('❌ Error cargando tardanzas:', e);
      setErr(e?.response?.data || e?.message || 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatMinutes = (timeStr: string) => {
    try {
      const time = dayjs(timeStr, 'HH:mm:ss');
      const hours = time.hour();
      const mins = time.minute();
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } catch {
      return timeStr;
    }
  };

  return (
    <>
      {/* ✅ HEADER CON BOTÓN DE VOLVER */}
      <Stack.Screen
        options={{
          title: 'Detalle de Tardanzas',
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
            <Text style={{ marginTop: 10, color: '#666' }}>Cargando tardanzas...</Text>
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
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
            <Text style={{ color: '#999', fontSize: 16 }}>¡Perfecto! No hay tardanzas</Text>
          </View>
        )}

        {!loading && !err && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(it, i) => `${it.fecha}-${i}`}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            renderItem={({ item }) => (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>
                    {dayjs(item.fecha).format('ddd DD MMM').toUpperCase()}
                  </Text>
                  <Text style={s.sub}>
                    Esperada {item.horaEsperada} · Llegada {item.horaLlegada}
                  </Text>
                  {item.compensada && (
                    <View style={s.compensatedBadge}>
                      <Text style={s.compensatedText}>✓ Compensada con tiempo extra</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={[
                      s.badge,
                      { backgroundColor: item.compensada ? '#28A745' : '#D9534F' },
                    ]}
                  >
                    <Text style={s.badgeText}>
                      {item.compensada ? '✓ Comp.' : formatMinutes(item.minutosTarde)}
                    </Text>
                  </View>
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
  title: { fontWeight: '600', fontSize: 15, color: '#111' },
  sub: { color: '#666', marginTop: 4 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center'
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  compensatedBadge: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  compensatedText: {
    color: '#28A745',
    fontSize: 12,
    fontWeight: '600'
  }
});