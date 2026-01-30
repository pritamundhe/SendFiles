import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { StatusBar } from 'expo-status-bar';
import { deleteAsync } from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

export default function ScannerComponent({ onScanSuccess, onClose }) {
    const device = useCameraDevice('back');
    const camera = useRef(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isscanning, setIsScanning] = useState(true);
    const [detectedText, setDetectedText] = useState(null);
    const [verificationCount, setVerificationCount] = useState(0);
    const [lastGeneric, setLastGeneric] = useState(null);

    // Detection Logic
    const [detectedType, setDetectedType] = useState(null); // 'phone', 'email', 'qr'

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        })();
    }, []);

    // Regex Patterns
    const phoneRegex = /(\+91|91|0)?[ -]?\d{10}/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

    // Instant Verification (No delay)
    const verifyAndConfirm = (value, type) => {
        setIsScanning(false);
        onScanSuccess({ type, value });
    };

    // QR Code Scanner
    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes) => {
            if (!isscanning) return;
            if (codes.length > 0) {
                const val = codes[0].value;
                if (val) verifyAndConfirm(val, 'qr');
            }
        }
    });

    // Text Recognition Loop (Snapshot based)
    useEffect(() => {
        let isMounted = true;
        let isProcessing = false;

        const scanText = async () => {
            if (!isMounted || !isscanning || !camera.current || !device || isProcessing) return;
            isProcessing = true;

            try {
                // Check if camera is actually ready/valid
                if (!camera.current) { isProcessing = false; return; }

                const photo = await camera.current.takePhoto({
                    qualityPrioritization: 'speed', // Prioritize speed
                    flash: 'off',
                    enableShutterSound: false,
                    width: 480, // Lower resolution for faster OCR
                });

                if (!isMounted) return;

                // Recognize text
                const fileUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
                const result = await TextRecognition.recognize(fileUri);
                const fullText = result.text;

                // Cleanup file (Non-blocking)
                deleteAsync(photo.path, { idempotent: true }).catch(() => { });

                if (!isMounted) return;

                // Search for matches
                const phoneMatch = fullText.match(phoneRegex);
                const emailMatch = fullText.match(emailRegex);

                if (phoneMatch) {
                    let pVal = phoneMatch[0].replace(/[^\d+]/g, '');
                    if (pVal.length === 10) pVal = '+91' + pVal;
                    else if (pVal.length === 12 && pVal.startsWith('91')) pVal = '+' + pVal;
                    verifyAndConfirm(pVal, 'phone');
                } else if (emailMatch) {
                    verifyAndConfirm(emailMatch[0], 'email');
                }

            } catch (e) {
                if (e.message && !e.message.includes('ViewNotFoundError')) {
                    console.log("Text scan error:", e.message);
                }
            } finally {
                isProcessing = false;
            }
        };

        const interval = setInterval(scanText, 100); // Check every 100ms

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [hasPermission, isscanning, lastGeneric, verificationCount, device]);

    if (!device || !hasPermission) {
        return (
            <View style={styles.center}>
                <Text style={styles.text}>Requesting Camera Permission...</Text>
                <ActivityIndicator size="large" color="#00ff00" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                codeScanner={codeScanner}
                photo={true} // Enable photo for snapshots
            />

            {/* Overlay UI */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Scan Contact / QR</Text>
                </View>

                <View style={styles.scanArea}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.hintText}>
                        Pointing at: {detectedType ? detectedType.toUpperCase() : "..."}
                    </Text>
                    {detectedText && (
                        <View style={styles.resultBox}>
                            <Text style={styles.resultLabel}>Detected:</Text>
                            <Text style={styles.resultValue}>{detectedText}</Text>
                            <Text style={styles.verifyCount}>Verifying... {verificationCount}/2</Text>
                        </View>
                    )}
                    {!detectedText && (
                        <Text style={styles.subHint}>Align Phone Number, Email or QR code within frame</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    text: { color: '#fff', fontSize: 16, marginBottom: 20 },
    overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
    header: { paddingTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    closeBtn: { position: 'absolute', left: 0, top: 40, padding: 10 },
    closeText: { color: '#fff', fontSize: 16 },
    headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    scanArea: {
        width: width * 0.8,
        height: width * 0.8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center'
    },
    cornerTL: { position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#00ff00' },
    cornerTR: { position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#00ff00' },
    cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#00ff00' },
    cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#00ff00' },

    footer: { paddingBottom: 40, alignItems: 'center' },
    hintText: { color: '#ccc', fontSize: 14, marginBottom: 10 },
    subHint: { color: '#888', fontSize: 12 },
    resultBox: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
    resultLabel: { color: '#aaa', fontSize: 12 },
    resultValue: { color: '#00ff00', fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
    verifyCount: { color: '#ffbd2e', fontSize: 12 }
});
