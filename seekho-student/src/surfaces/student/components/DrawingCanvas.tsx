import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, PanResponder, StyleSheet, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface DrawingCanvasHandle {
  clear: () => void;
  getImageDataURL: () => Promise<string | null>;
}

/**
 * Finger/stylus drawing surface built on react-native-svg + PanResponder (no
 * native Skia module, so it runs in Expo Go). Strokes are captured as SVG path
 * data; export uses react-native-view-shot when available and degrades to null
 * if the module is not present in the Expo Go runtime (workbook still submits).
 */
const DrawingCanvas = forwardRef<DrawingCanvasHandle>((_props, ref) => {
  const [paths, setPaths] = useState<string[]>([]);
  const currentRef = useRef('');
  const [current, setCurrent] = useState('');
  const shotRef = useRef<View>(null);

  const pt = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    return `${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        currentRef.current = `M${pt(e)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        currentRef.current += ` L${pt(e)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        const d = currentRef.current;
        currentRef.current = '';
        setCurrent('');
        if (d.includes('L')) setPaths((p) => [...p, d]);
      },
    })
  ).current;

  const clear = useCallback(() => {
    currentRef.current = '';
    setCurrent('');
    setPaths([]);
  }, []);

  const getImageDataURL = useCallback(async (): Promise<string | null> => {
    try {
      if (!shotRef.current) return null;
      // Lazy require so a missing native module (not bundled in every Expo Go
      // runtime) never breaks the JS bundle at import time.
      const { captureRef } = require('react-native-view-shot');
      // JPEG at a capped width keeps the data URI to tens of KB — small enough to
      // store in RTDB (workbookState.canvasImageURL) and hand to Gemini vision,
      // while a white canvas + thin strokes stay perfectly legible for grading.
      // Returns a proper `data:image/jpeg;base64,...` URI.
      return await captureRef(shotRef, { result: 'data-uri', format: 'jpg', quality: 0.6, width: 800 });
    } catch {
      return null;
    }
  }, []);

  useImperativeHandle(ref, () => ({ clear, getImageDataURL }), [clear, getImageDataURL]);

  return (
    <View ref={shotRef} collapsable={false} style={styles.canvas} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke="#1A1A1A" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {current ? (
          <Path d={current} stroke="#1A1A1A" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>
    </View>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#FFFFFF' },
});
