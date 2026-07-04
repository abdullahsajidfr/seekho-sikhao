import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { BackArrow, GalleryIcon, FlipIcon } from '../../../components/icons';
import { colors, fonts } from '../../../theme';

interface Props {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

/**
 * Full-screen homework camera matching the Figma "Camera Open" screen: dark
 * backdrop, bracketed viewfinder, gallery / capture / flip controls.
 *
 * Uses expo-camera's live preview when a camera + permission are available and
 * falls back to expo-image-picker for the gallery and (on the iOS Simulator,
 * which has no camera) the capture button — so the photo-upload flow keeps
 * working everywhere.
 */
export default function CameraScreen({ onCapture, onClose }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();

  const granted = permission?.granted ?? false;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  const vfWidth = Math.min(width * 0.62, height * 1.18);

  async function pickFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) onCapture(res.assets[0].uri);
  }

  async function handleCapture() {
    if (granted && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
        if (photo?.uri) { onCapture(photo.uri); return; }
      } catch {
        // fall through to picker (e.g. iOS Simulator has no camera)
      }
    }
    await pickFromGallery();
  }

  return (
    <Modal visible animationType="slide" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']} onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={onClose} hitSlop={10} accessibilityLabel="Close camera">
            <BackArrow width={22} height={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Point at your homework</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.viewfinderWrap}>
          <View style={[styles.viewfinder, { width: vfWidth }]}>
            {granted ? (
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
            ) : (
              <Text style={styles.hint}>Align your homework here</Text>
            )}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.sideBtn} onPress={pickFromGallery} accessibilityLabel="Choose from gallery">
            <GalleryIcon size={26} color={colors.primary} />
          </Pressable>

          <Pressable style={styles.captureOuter} onPress={handleCapture} accessibilityLabel="Take photo">
            <View style={styles.captureMid}>
              <View style={styles.captureInner} />
            </View>
          </Pressable>

          <Pressable style={styles.sideBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} accessibilityLabel="Flip camera">
            <FlipIcon size={26} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardDark },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#232325',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  topSpacer: { width: 38 },
  viewfinderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  viewfinder: {
    aspectRatio: 16 / 10,
    maxHeight: '100%',
    backgroundColor: '#000000',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(42, 186, 242, 0.55)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontFamily: fonts.headingRegular, fontSize: 22, color: '#9A9A9A' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#F1F1F1' },
  tl: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  controls: { height: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 56 },
  sideBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#3A3A3C', alignItems: 'center', justifyContent: 'center' },
  captureOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captureMid: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primary },
});
