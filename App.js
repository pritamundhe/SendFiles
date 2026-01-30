import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import Share from 'react-native-share';
import ScannerComponent from './src/components/ScannerComponent';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // Custom Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedData, setScannedData] = useState(null); // { type, value, number? }

  // Animations
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Floating Orbs (Fluid Background)
  const sphere1Move = useRef(new Animated.Value(0)).current;
  const sphere1Scale = useRef(new Animated.Value(1)).current;
  const sphere2Move = useRef(new Animated.Value(0)).current;
  const sphere2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(titleFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(titleSlide, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Background Animations (Looping)
    const animConfig = { duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true };

    const sphere1Loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sphere1Move, { toValue: -15, ...animConfig }),
          Animated.timing(sphere1Move, { toValue: 0, ...animConfig }),
        ]),
        Animated.sequence([
          Animated.timing(sphere1Scale, { toValue: 1.1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sphere1Scale, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ])
    );
    sphere1Loop.start();

    const sphere2Loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sphere2Move, { toValue: 20, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sphere2Move, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(sphere2Scale, { toValue: 1.15, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sphere2Scale, { toValue: 1, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ])
    );
    sphere2Loop.start();

  }, []);

  // Modal Animation Logic
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(modalScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [modalVisible]);

  // 📁 Pick files
  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true
    });

    if (!result.canceled && result.assets) {
      setSelectedFiles(prev => [...prev, ...result.assets]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 📷 Scan success
  const handleScanSuccess = async ({ type, value }) => {
    setIsScanning(false);

    if (type === 'phone' || /^\+?\d{10,13}$/.test(value)) {
      // Clean number
      let number = value.replace(/[^\d]/g, '');
      if (number.length === 10) number = '91' + number;
      else if (number.length > 10 && number.startsWith('91')) number = number;

      setScannedData({ type: 'phone', value: value, number: number });
      setModalVisible(true);
    }
    else if (type === 'email' || value.includes('@')) {
      // For email, we can also show the custom modal or just send
      // Using custom modal for consistency
      setScannedData({ type: 'email', value: value });
      setModalVisible(true);
    }
    else {
      Alert.alert('Scanned Value', value);
    }
  };

  const confirmSend = async () => {
    setModalVisible(false);
    const data = scannedData;
    if (!data) return;

    if (data.type === 'phone') {
      try {
        if (selectedFiles.length === 0) {
          Alert.alert('Please select files first');
          return;
        }
        await Share.shareSingle({
          urls: selectedFiles.map(f => f.uri),
          social: Share.Social.WHATSAPP,
          whatsAppNumber: data.number,
          failOnCancel: false
        });
      } catch (e) {
        console.log(e);
        Share.open({ urls: selectedFiles.map(f => f.uri) });
      }
    } else if (data.type === 'email') {
      setTimeout(() => {
        Share.shareSingle({
          social: Share.Social.EMAIL,
          email: data.value,
          urls: selectedFiles.map(f => f.uri),
          failOnCancel: false
        });
      }, 500);
    }
  };

  if (isScanning) {
    return (
      <ScannerComponent
        onScanSuccess={handleScanSuccess}
        onClose={() => setIsScanning(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Background Gradient (Lighter to Darker) */}
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']} // Lighter Blue top to Dark Blue bottom
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Fluid Background Layers (Waves/Orbs) */}
      {/* Top Right Light Shape */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: sphere1Move }, { scale: sphere1Scale }] }]}>
        <LinearGradient colors={['#fff', '#a1c4fd']} style={styles.orbGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} />
      </Animated.View>

      {/* Bottom Left Dark Shape */}
      <Animated.View style={[styles.orb3, { transform: [{ translateY: sphere2Move }, { scale: sphere2Scale }] }]}>
        <LinearGradient colors={['#1c1b29', '#302b63']} style={styles.orbGradient} />
      </Animated.View>

      {/* Middle Accent Sphere */}
      <View style={styles.orb2} />

      {/* 3. Content (Directly on Background, No Card) */}
      <Animated.View style={[styles.contentContainer, { opacity: titleFade, transform: [{ translateY: titleSlide }] }]}>

        <Text style={styles.headerTitle}>Welcome Back!</Text>
        <Text style={styles.subTitle}>Scan docs & send instantly</Text>

        {/* Selected Files List (Transparent) */}
        <View style={styles.filesContainer}>
          <View style={styles.fileHeader}>
            <Text style={styles.label}>Selected Files ({selectedFiles.length})</Text>
            <TouchableOpacity onPress={pickFiles}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fileList} horizontal={false} showsVerticalScrollIndicator={true}>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.iconCircle}>
                  <Text>📄</Text>
                </View>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {selectedFiles.length === 0 && (
              <Text style={styles.placeholderText}>No files selected</Text>
            )}
          </ScrollView>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.sendButton, selectedFiles.length === 0 && { opacity: 0.5 }]}
          onPress={() => {
            if (selectedFiles.length === 0) pickFiles();
            else setIsScanning(true);
          }}
        >
          <View style={styles.btnContent}>
            <Text style={styles.sendText}>
              {selectedFiles.length === 0 ? "Select Files" : "SCAN & SEND"}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* CUSTOM CONFIRMATION MODAL */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.backdrop} />
          <Animated.View style={[styles.modalCard, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
            {/* Modal Content */}
            <LinearGradient
              colors={['rgba(28, 27, 41, 0.85)', 'rgba(45, 51, 74, 0.85)']} // TRANSPARENT GLASS
              style={styles.modalGradient}
            >
              {/* Animated Tick Circle */}
              <View style={styles.tickCircle}>
                <Text style={styles.tickIcon}>✓</Text>
              </View>

              {/* Number Display */}
              <Text style={styles.modalValue}>
                {scannedData?.type === 'phone' ? `+${scannedData.number}` : scannedData?.value}
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={confirmSend}>
                  <LinearGradient
                    colors={['#fff', '#f2f2f2']} // WHITE THEME BUTTON
                    style={styles.confirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    <Text style={styles.confirmButtonText}>SEND</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3b5998', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // Matched base color
  orbGradient: { width: '100%', height: '100%' },

  // Big curve top right
  orb1: { position: 'absolute', top: -100, right: -80, width: 350, height: 350, borderRadius: 175, overflow: 'hidden', opacity: 0.9 },
  // Small floaty
  orb2: { position: 'absolute', top: 120, right: 40, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.8)', shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  // Big curve bottom left
  orb3: { position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: 150, overflow: 'hidden', opacity: 0.8 },

  contentContainer: { width: '100%', paddingHorizontal: 35, zIndex: 10, flex: 1, justifyContent: 'center', paddingTop: 100 },

  // Text Styles - Direct on background
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: '#fff', textAlign: 'left', marginBottom: 8, letterSpacing: 0.5 },
  subTitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'left', marginBottom: 40, lineHeight: 22 },

  label: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  filesContainer: { marginBottom: 40 },
  fileHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },

  // Transparent File List
  fileList: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    height: 250, // Increased height
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileName: { color: '#fff', flex: 1, marginRight: 10, fontSize: 14, fontWeight: '500' },
  removeText: { color: '#ff6b6b', fontWeight: 'bold', fontSize: 16 },
  placeholderText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 50 },

  // White "Pill" Button to match "Sign Up" style
  sendButton: {
    width: '100%',
    height: 60,
    borderRadius: 20, // Pill shape
    backgroundColor: '#fff', // White button
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  btnContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#3b5998', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 }, // Blue text on white button

  // MODAL STYLES (Keep Glass)
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalCard: {
    width: width * 0.8,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', // Lighter glass border
    backgroundColor: 'transparent',
  },
  modalGradient: { padding: 30, alignItems: 'center' },

  tickCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle white tint
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#fff', // White border
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5
  },
  tickIcon: { fontSize: 45, color: '#fff', fontWeight: 'bold' }, // White Tick

  modalValue: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center', letterSpacing: 1 },

  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelButton: { flex: 1, paddingVertical: 14, marginRight: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelButtonText: { color: '#ccc', fontWeight: '600' },

  confirmButton: { flex: 1.5, borderRadius: 15, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flex: 1 },
  confirmButtonText: { color: '#3b5998', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 } // Blue Text
});
