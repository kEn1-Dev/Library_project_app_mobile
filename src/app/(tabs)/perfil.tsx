import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  Alert,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'http://187.127.45.180:3000';

interface UploadedItem {
  id_recurso: number;
  titulo: string;
  descripcion: string;
  url_recurso: string;
  url_portada: string;
  fecha_subida: string;
  nombre_categoria: string;
  total_descargas: number;
}

interface DownloadedItem {
  id_recurso: number;
  titulo: string;
  descripcion: string;
  url_recurso: string;
  url_portada: string;
  nombre_categoria: string;
  cantidad_descargas: number;
  ultima_descarga: string;
}

export default function PerfilScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'subidos' | 'descargas'>('subidos');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Data states
  const [myResources, setMyResources] = useState<UploadedItem[]>([]);
  const [myDownloads, setMyDownloads] = useState<DownloadedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'subidos') {
      fetchMyResources();
    } else {
      fetchMyDownloads();
    }
  }, [activeSubTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeSubTab === 'subidos') {
        fetchMyResources(true);
      } else {
        fetchMyDownloads(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSubTab]);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchMyResources = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/recursos/usuario/mis-recursos`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMyResources(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMyDownloads = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/recursos/usuario/descargas`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMyDownloads(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDeleteResource = async (id_recurso: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este recurso de la biblioteca digital?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/api/recursos/${id_recurso}`, {
              method: 'DELETE',
              headers
            });
            const data = await response.json();
            if (response.ok && data.success) {
              fetchMyResources();
            } else {
              Alert.alert('Error', data.message || 'No se pudo eliminar el recurso.');
            }
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Error de conexión.');
          }
        }}
      ]
    );
  };

  const handleDownload = async (id_recurso: number, url: string, title: string) => {
    setDownloadingId(id_recurso);
    try {
      const fileExt = url.split('.').pop()?.split('?')[0] || 'pdf';
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${cleanTitle}.${fileExt}`;
      
      // Legacy SDK 54 FileSystem API
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      const downloadRes = await FileSystem.downloadAsync(url, localUri);
      
      if (downloadRes && downloadRes.status === 200) {
        // Log telemetry download
        const token = await AsyncStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/recursos/descargas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id_recurso,
            id_usuario: user?.id_usuario || null
          })
        }).catch(err => console.error(err));

        if (activeSubTab === 'descargas') {
          fetchMyDownloads();
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Completado', 'Archivo descargado con éxito.');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/(auth)/login');
        }}
      ]
    );
  };

  const renderUploadedItem = ({ item }: { item: UploadedItem }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {item.url_portada ? (
          <Image source={{ uri: item.url_portada }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.placeholderEmoji}>📖</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.itemCategory}>{item.nombre_categoria}</Text>
          <Text style={styles.itemStats}>{item.total_descargas || 0} descargas</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtnDownload} 
          onPress={() => handleDownload(item.id_recurso, item.url_recurso, item.titulo)}
          disabled={downloadingId !== null}
        >
          {downloadingId === item.id_recurso ? (
            <ActivityIndicator color="#6366F1" size="small" />
          ) : (
            <Text style={styles.actionBtnEmoji}>📥</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtnDelete} 
          onPress={() => handleDeleteResource(item.id_recurso)}
          disabled={loading}
        >
          <Text style={styles.actionBtnEmoji}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDownloadedItem = ({ item }: { item: DownloadedItem }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {item.url_portada ? (
          <Image source={{ uri: item.url_portada }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.placeholderEmoji}>📖</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.itemCategory}>{item.nombre_categoria}</Text>
          <Text style={styles.itemStats}>Descargado {item.cantidad_descargas} {item.cantidad_descargas === 1 ? 'vez' : 'veces'}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.redownloadBtn} 
        onPress={() => handleDownload(item.id_recurso, item.url_recurso, item.titulo)}
        disabled={downloadingId !== null}
      >
        {downloadingId === item.id_recurso ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.redownloadBtnText}>Descargar</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* User Header Profile */}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nombre?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.userDetail}>
            <Text style={styles.userName}>{user?.nombre || 'Usuario UniShare'}</Text>
            <Text style={styles.userEmail}>{user?.correo || 'usuario@unishare.com'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Pills Nav */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === 'subidos' && styles.tabBtnActive]}
          onPress={() => setActiveSubTab('subidos')}
        >
          <Text style={[styles.tabBtnText, activeSubTab === 'subidos' && styles.tabBtnTextActive]}>
            Mis Aportes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === 'descargas' && styles.tabBtnActive]}
          onPress={() => setActiveSubTab('descargas')}
        >
          <Text style={[styles.tabBtnText, activeSubTab === 'descargas' && styles.tabBtnTextActive]}>
            Mis Descargas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Data Lists */}
      {loading ? (
        <View style={styles.centerWrapper}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : activeSubTab === 'subidos' ? (
        myResources.length === 0 ? (
          <View style={styles.centerWrapper}>
            <Text style={styles.emptyEmoji}>📤</Text>
            <Text style={styles.emptyLabel}>No has subido recursos aún</Text>
          </View>
        ) : (
          <FlatList
            data={myResources}
            keyExtractor={(item) => item.id_recurso.toString()}
            renderItem={renderUploadedItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => fetchMyResources(false)}
          />
        )
      ) : (
        myDownloads.length === 0 ? (
          <View style={styles.centerWrapper}>
            <Text style={styles.emptyEmoji}>📥</Text>
            <Text style={styles.emptyLabel}>Historial de descargas vacío</Text>
          </View>
        ) : (
          <FlatList
            data={myDownloads}
            keyExtractor={(item) => item.id_recurso.toString()}
            renderItem={renderDownloadedItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => fetchMyDownloads(false)}
          />
        )
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  userHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6366F1',
  },
  userDetail: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  tabNav: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  thumbnail: {
    width: 36,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbnailPlaceholder: {
    width: 36,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderEmoji: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  itemCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemStats: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnDownload: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  actionBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  actionBtnEmoji: {
    fontSize: 14,
  },
  redownloadBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
  },
});
