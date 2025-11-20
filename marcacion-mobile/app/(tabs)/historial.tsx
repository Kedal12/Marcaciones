import { Button, Card, Icon, ListItem, Text } from '@rneui/themed';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- ✅ CAMBIO AQUÍ ---
// Importamos el dayjs configurado desde UN solo lugar
import { dayjs } from '@/src/utils/date';
// Importamos la función Y el TIPO Marcacion desde la API
import { getMisMarcaciones, type Marcacion } from '@/src/api/marcaciones';
// --- FIN DEL CAMBIO ---


// --- ❌ ELIMINADO ---
// Se borra la configuración duplicada de dayjs
// Se borra la interface Marcacion duplicada
// Se borran los helpers 'formatDateTimeLocal' y 'formatDate'
// --- FIN ELIMINADO ---


export default function HistorialScreen() {
  // Esta línea ahora funciona porque 'Marcacion' es el tipo importado
  const [marcaciones, setMarcaciones] = useState<Marcacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [desde, setDesde] = useState(dayjs().startOf('week').toDate());
  const [hasta, setHasta] = useState(dayjs().endOf('day').toDate());

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState<'desde' | 'hasta'>('desde');

  const loadMarcaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMisMarcaciones({
        // La lógica de envío usa 'dayjs' (importado)
        desde: dayjs(desde).utc().toISOString(),
        hasta: dayjs(hasta).utc().toISOString(),
        pageSize: 100,
        page: 1,
      });
      setMarcaciones(response.items || []);
    } catch (err) {
      console.error('Error fetching historial:', err);
      setError('No se pudo cargar el historial de marcaciones.');
      Alert.alert('Error', 'No se pudo cargar el historial de marcaciones.');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    loadMarcaciones();
  }, [loadMarcaciones]);

  const showDatePicker = (mode: 'desde' | 'hasta') => {
    setPickerMode(mode);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirmDate = (date: Date) => {
    hideDatePicker();
    if (pickerMode === 'desde') {
      if (dayjs(date).isAfter(dayjs(hasta))) {
        setHasta(dayjs(date).endOf('day').toDate());
      }
      setDesde(dayjs(date).startOf('day').toDate());
    } else {
      if (dayjs(date).isBefore(dayjs(desde))) {
        setDesde(dayjs(date).startOf('day').toDate());
      }
      setHasta(dayjs(date).endOf('day').toDate());
    }
  };

  const renderItem = ({ item }: { item: Marcacion }) => (
    // Añadimos el key aquí para solucionar el warning de tu log anterior
    <ListItem key={item.id} bottomDivider containerStyle={styles.listItemContainer}>
      <Icon
        name={item.tipo === 'entrada' ? 'log-in-outline' : 'log-out-outline'}
        type="ionicon"
        color={item.tipo === 'entrada' ? 'green' : 'orange'}
      />
      <ListItem.Content>
        <ListItem.Title style={styles.itemTitle}>
          Marcación de {item.tipo === 'entrada' ? 'Entrada' : 'Salida'}
        </ListItem.Title>
        
        {/* --- ✅ CAMBIO AQUÍ --- */}
        {/* Leemos 'fechaHoraLocal' (enviada por el backend) */}
        <ListItem.Subtitle style={styles.itemSubtitle}>
          {dayjs(item.fechaHoraLocal).format('DD/MM/YYYY HH:mm:ss')}
        </ListItem.Subtitle>

        {/* --- ✅ AÑADIDO: Mostrar info de almuerzo --- */}
        {item.tipo === 'entrada' && item.inicioAlmuerzoLocal && (
          <View style={styles.almuerzoInfoContainer}>
            <Icon name="fast-food" type="ionicon" size={16} color="#f59e0b" />
            <Text style={styles.almuerzoInfoText}>
              Almuerzo: {dayjs(item.inicioAlmuerzoLocal).format('HH:mm')}
              {item.finAlmuerzoLocal && (
                <>
                  {' - '}
                  {dayjs(item.finAlmuerzoLocal).format('HH:mm')}
                  {' '}
                  ({item.tiempoAlmuerzoMinutos} min)
                </>
              )}
              {!item.finAlmuerzoLocal && ' (en curso)'}
            </Text>
          </View>
        )}
        {/* --- FIN DEL CAMBIO --- */}

      </ListItem.Content>
    </ListItem>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Filtros */}
        <Card containerStyle={styles.filtersCard}>
          <View style={styles.filtersRow}>
            <Button
              // --- ✅ CAMBIO AQUÍ ---
              title={`Desde: ${dayjs(desde).format('DD/MM/YYYY')}`}
              // --- FIN DEL CAMBIO ---
              type="outline"
              onPress={() => showDatePicker('desde')}
              icon={<Icon name="calendar" type="ionicon" size={18} iconStyle={{ marginRight: 6 }} />}
              containerStyle={styles.filterBtn}
            />
            <Button
              // --- ✅ CAMBIO AQUÍ ---
              title={`Hasta: ${dayjs(hasta).format('DD/MM/YYYY')}`}
              // --- FIN DEL CAMBIO ---
              type="outline"
              onPress={() => showDatePicker('hasta')}
              icon={<Icon name="calendar" type="ionicon" size={18} iconStyle={{ marginRight: 6 }} />}
              containerStyle={styles.filterBtn}
            />
          </View>
        </Card>

        {/* Error message */}
        {error && !loading && <Text style={styles.errorText}>{error}</Text>}

        {/* Loading indicator o Lista */}
        {loading && marcaciones.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={marcaciones}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={loading}
            onRefresh={loadMarcaciones}
            ListEmptyComponent={
              !loading ? <Text style={styles.emptyText}>No hay marcaciones en este rango de fechas.</Text> : null
            }
          />
        )}

        {/* DatePicker Modal */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
          date={pickerMode === 'desde' ? desde : hasta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
  },
  filtersCard: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  filterBtn: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listItemContainer: { // Estilo añadido que faltaba
    backgroundColor: '#fff',
  },
  itemTitle: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
    fontSize: 16,
  },
  itemSubtitle: {
    color: 'grey',
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: 'grey',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    color: 'red',
  },
  // --- ✅ AÑADIDOS ESTILOS DE ALMUERZO ---
  almuerzoInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  almuerzoInfoText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
});