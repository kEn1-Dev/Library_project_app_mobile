import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  ScrollView,
  Alert,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'http://187.127.45.180:3000';

interface Resource {
  id_recurso: number;
  titulo: string;
  descripcion: string;
  url_recurso: string;
  url_portada: string;
  id_usuario: number;
  id_categoria: number;
  nombre_categoria: string;
  nombre_creador: string;
}

interface Category {
  id_categoria: number;
  nombre_categoria: string;
}

export default function BibliotecaScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Downloader state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchResources();
    fetchCategories();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchResources(true);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchResources = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const response = await fetch(`${API_BASE_URL}/api/recursos`);
      if (!response.ok) {
        if (!silent) throw new Error('Error al conectar con el servidor.');
        return;
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setResources(data.data);
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Error al obtener recursos.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recursos/categorias`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const handleDownload = async (id_recurso: number, url: string, title: string) => {
    setDownloadingId(id_recurso);
    try {
      // Determine file extension and name
      const fileExt = url.split('.').pop()?.split('?')[0] || 'pdf';
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${cleanTitle}.${fileExt}`;
      
      // Legacy SDK 54 FileSystem API
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      const downloadRes = await FileSystem.downloadAsync(url, localUri);
      
      if (downloadRes && downloadRes.status === 200) {
        // Log telemetry download in backend
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        const userObj = userData ? JSON.parse(userData) : null;

        await fetch(`${API_BASE_URL}/api/recursos/descargas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id_recurso,
            id_usuario: userObj?.id_usuario || null
          })
        }).catch(err => console.error('Error reporting download telemetry:', err));

        // Open sharing or opening sheet on the mobile device
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Descarga completada', `El archivo se ha guardado localmente.`);
        }
      } else {
        throw new Error('La descarga falló en el servidor.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter logic
  const filteredResources = resources.filter(res => {
    const matchesSearch = res.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (res.descripcion && res.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === null || res.id_categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderResourceCard = ({ item }: { item: Resource }) => (
    <View style={styles.card}>
      {/* Cover Image Preview */}
      <View style={styles.coverWrapper}>
        {item.url_portada ? (
          <Image 
            source={{ uri: item.url_portada }} 
            style={styles.coverImg} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={styles.placeholderEmoji}>📖</Text>
          </View>
        )}
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{item.nombre_categoria}</Text>
        </View>
      </View>

      {/* Resource Info */}
      <View style={styles.cardBody}>
        <Text style={styles.resourceTitle} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.resourceDesc} numberOfLines={2}>
          {item.descripcion || 'Sin descripción disponible.'}
        </Text>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.uploaderWrapper}>
            <Text style={styles.uploaderLabel}>SUBIDO POR</Text>
            <Text style={styles.uploaderName} numberOfLines={1}>
              {item.nombre_creador || 'Invitado'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => handleDownload(item.id_recurso, item.url_recurso, item.titulo)}
            disabled={downloadingId !== null}
          >
            {downloadingId === item.id_recurso ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.downloadBtnText}>Descargar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Search Input Box */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por título, descripción o palabra clave..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Horizontal Category Carousel */}
      <View style={styles.carouselContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryBtn,
              selectedCategory === null ? styles.categoryBtnActive : styles.categoryBtnInactive
            ]}
          >
            <Text style={[
              styles.categoryBtnText,
              selectedCategory === null ? styles.categoryBtnTextActive : styles.categoryBtnTextInactive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id_categoria}
              onPress={() => setSelectedCategory(cat.id_categoria)}
              style={[
                styles.categoryBtn,
                selectedCategory === cat.id_categoria ? styles.categoryBtnActive : styles.categoryBtnInactive
              ]}
            >
              <Text style={[
                styles.categoryBtnText,
                selectedCategory === cat.id_categoria ? styles.categoryBtnTextActive : styles.categoryBtnTextInactive
              ]}>
                {cat.nombre_categoria}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Resource Grid List */}
      {loading ? (
        <View style={styles.centerWrapper}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : error ? (
        <View style={styles.centerWrapper}>
          <Text style={styles.errorLabel}>⚠️ Error de Carga</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchResources(false)}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filteredResources.length === 0 ? (
        <View style={styles.centerWrapper}>
          <Text style={styles.emptyEmoji}>📂</Text>
          <Text style={styles.emptyLabel}>No se encontraron recursos</Text>
        </View>
      ) : (
        <FlatList
          data={filteredResources}
          keyExtractor={(item) => item.id_recurso.toString()}
          renderItem={renderResourceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => fetchResources(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  carouselContainer: {
    marginBottom: 8,
  },
  carouselScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  categoryBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBtnTextInactive: {
    color: '#64748B',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  coverWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  categoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
  },
  cardBody: {
    padding: 16,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploaderWrapper: {
    flex: 1,
    marginRight: 12,
  },
  uploaderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  uploaderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
});
