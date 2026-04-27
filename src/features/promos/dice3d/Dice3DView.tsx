import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { createDiceMesh } from './createDiceMesh';

type Props = {
  rx: number;
  ry: number;
  rz: number;
  style?: StyleProp<ViewStyle>;
};

const DEG = Math.PI / 180;
type ExpoThreeRenderer = THREE.WebGLRenderer;

type SceneRefs = {
  gl: ExpoWebGLRenderingContext;
  renderer: ExpoThreeRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dice: THREE.Group;
};

export function Dice3DView({ rx, ry, rz, style }: Props) {
  const sceneRef = useRef<SceneRefs | null>(null);
  const rotationRef = useRef({ rx, ry, rz });
  rotationRef.current = { rx, ry, rz };

  const renderScene = useCallback(() => {
    const refs = sceneRef.current;
    if (!refs) return;
    const { rx: x, ry: y, rz: z } = rotationRef.current;
    refs.dice.rotation.set(x * DEG, y * DEG, z * DEG, 'XYZ');
    refs.renderer.render(refs.scene, refs.camera);
    refs.gl.endFrameEXP();
  }, []);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const renderer = new Renderer({ gl }) as ExpoThreeRenderer;
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
      camera.position.set(0, 0, 7.4);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.45));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(3, 4, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
      fillLight.position.set(-4, -2, 3);
      scene.add(fillLight);

      const dice = createDiceMesh();
      dice.scale.setScalar(1.25);
      scene.add(dice);

      sceneRef.current = { gl, renderer, scene, camera, dice };
      renderScene();
    },
    [renderScene],
  );

  useEffect(() => {
    renderScene();
  }, [renderScene, rx, ry, rz]);

  return (
    <View style={[styles.root, styles.pointerNone, style]}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
  pointerNone: {
    pointerEvents: 'none',
  },
  gl: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
