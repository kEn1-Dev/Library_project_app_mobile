import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const API_BASE_URL = 'http://187.127.45.180:3000';

// === SUPABASE STORAGE CONFIGURATION ===
const SUPABASE_URL = 'https://mtdhwmgywooveqljfetx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_secret_WgEkpp7U8cyUnooadOyzGQ_Qcie7T6J';
const BUCKET_RECURSOS = 'DOCUMENTOS';
const BUCKET_PORTADAS = 'FOTOS';

interface Category {
  id_categoria: number;
  nombre_categoria: string;
}

interface LocalFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export default function SubirScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form states
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idCategoria, setIdCategoria] = useState<number | null>(null);
  const [fileRecurso, setFileRecurso] = useState<LocalFile | null>(null);
  const [filePortada, setFilePortada] = useState<LocalFile | null>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];

        // Block images from document picker
        if (asset.mimeType && asset.mimeType.startsWith('image/')) {
          Alert.alert('Formato inválido', 'El archivo de documento no puede ser una imagen. Selecciona un PDF, Word, Excel o Zip.');
          return;
        }

        setFileRecurso({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const pickCoverImage = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para elegir una portada.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];

        setLoading(true);
        setProgressMsg('Optimizando portada a formato WebP...');
        try {
          // Compress and convert selected cover to WebP locally on the device!
          const manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            [],
            { format: ImageManipulator.SaveFormat.WEBP, compress: 0.82 }
          );

          const originalName = asset.fileName || 'portada.jpg';
          const cleanName = originalName.substring(0, originalName.lastIndexOf('.')) || 'portada';

          setFilePortada({
            uri: manipResult.uri,
            name: `${cleanName}.webp`,
            type: 'image/webp'
          });
          setError(null);
        } catch (manipErr) {
          console.error(manipErr);
          Alert.alert('Error', 'No se pudo procesar la imagen de portada.');
        } finally {
          setLoading(false);
          setProgressMsg('');
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const removePortada = () => {
    setFilePortada(null);
  };

  const uploadFileToSupabase = async (file: LocalFile, bucket: string): Promise<string> => {
    // Read local file uri as binary Blob
    const responseBlob = await fetch(file.uri);
    const blob = await responseBlob.blob();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': file.type
      },
      body: blob
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Error al subir el archivo al bucket "${bucket}".`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!titulo.trim() || !fileRecurso || idCategoria === null) {
      setError('El título, el archivo del recurso y la categoría son requeridos.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload Document
      setProgressMsg('Subiendo documento a Supabase Storage...');
      const urlRecurso = await uploadFileToSupabase(fileRecurso, BUCKET_RECURSOS);

      // 2. Upload Cover Image (if selected)
      let urlPortada = '';
      if (filePortada) {
        setProgressMsg('Subiendo portada a Supabase Storage...');
        urlPortada = await uploadFileToSupabase(filePortada, BUCKET_PORTADAS);
      }

      // 3. Register in backend
      setProgressMsg('Registrando recurso en la biblioteca...');
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/recursos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          url_recurso: urlRecurso,
          url_portada: urlPortada || undefined,
          id_categoria: idCategoria
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar el recurso.');
      }

      setSuccess(true);
      setTitulo('');
      setDescripcion('');
      setFileRecurso(null);
      setFilePortada(null);
      setIdCategoria(null);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Error al subir el recurso.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const selectedCategoryName = categories.find(c => c.id_categoria === idCategoria)?.nombre_categoria || 'Selecciona una categoría...';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {error && (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>⚠️ {error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successAlert}>
            <Text style={styles.successAlertText}>✓ Recurso subido y registrado correctamente en la biblioteca.</Text>
          </View>
        )}

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TÍTULO DEL RECURSO</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej. Guía Completa de Álgebra Lineal"
            placeholderTextColor="#94A3B8"
            value={titulo}
            onChangeText={setTitulo}
            editable={!loading}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESCRIPCIÓN</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe brevemente de qué trata este documento..."
            placeholderTextColor="#94A3B8"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        {/* Document Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ARCHIVO DE DOCUMENTO (.pdf, .docx, .zip, etc.)</Text>
          <TouchableOpacity 
            style={styles.pickerBox} 
            onPress={pickDocument}
            disabled={loading}
          >
            <Text style={styles.pickerBoxEmoji}>📄</Text>
            <Text style={styles.pickerBoxTitle} numberOfLines={1}>
              {fileRecurso ? fileRecurso.name : 'Seleccionar archivo de documento'}
            </Text>
            {fileRecurso?.size && (
              <Text style={styles.pickerBoxSub}>
                {(fileRecurso.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Cover Image Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>IMAGEN DE PORTADA (OPCIONAL)</Text>
          {!filePortada ? (
            <TouchableOpacity 
              style={styles.pickerBox} 
              onPress={pickCoverImage}
              disabled={loading}
            >
              <Text style={styles.pickerBoxEmoji}>🖼️</Text>
              <Text style={styles.pickerBoxTitle}>Seleccionar portada</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewBox}>
              <Image source={{ uri: filePortada.uri }} style={styles.previewImg} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={1}>{filePortada.name}</Text>
                <Text style={styles.previewSub}>WebP Optimizado</Text>
              </View>
              <TouchableOpacity 
                style={styles.removeBtn} 
                onPress={removePortada}
                disabled={loading}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Category Selector dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CATEGORÍA</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setShowCategorySelector(!showCategorySelector)}
            disabled={loading}
          >
            <Text style={styles.dropdownTriggerText}>{selectedCategoryName}</Text>
            <Text style={styles.dropdownTriggerArrow}>▼</Text>
          </TouchableOpacity>

          {showCategorySelector && (
            <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id_categoria}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setIdCategoria(cat.id_categoria);
                    setShowCategorySelector(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{cat.nombre_categoria}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Loading and upload progress indicator */}
        {loading && progressMsg !== '' && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.progressText}>{progressMsg}</Text>
          </View>
        )}

        {/* Submit Buttons */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Publicar Recurso</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  successAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
  },
  successAlertText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBoxEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  pickerBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  pickerBoxSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  previewImg: {
    width: 40,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewInfo: {
    flex: 1,
    minWidth: 0,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  previewSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  dropdownTriggerArrow: {
    fontSize: 10,
    color: '#94A3B8',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginTop: 6,
    maxHeight: 200,
    overflow: 'scroll',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
