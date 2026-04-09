import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { CafeItem, StructRoom } from '../../api/types';
import { colors } from '../../theme';

const SCREEN_W = Dimensions.get('window').width;

function hexColor(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  const s = raw.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

type Props = {
  cafe: CafeItem;
  visible: boolean;
  onClose: () => void;
};

export function HallMapPanel({ cafe, visible, onClose }: Props) {
  const q = useQuery({
    queryKey: ['struct-rooms', cafe.icafe_id],
    queryFn: () => bookingFlowApi.structRooms(cafe.icafe_id),
    enabled: visible,
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            Схема: {cafe.address}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Закрыть</Text>
          </Pressable>
        </View>

        {q.isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : q.isError ? (
          <Text style={styles.err}>
            {q.error instanceof ApiError ? q.error.message : 'Ошибка загрузки схемы'}
          </Text>
        ) : q.data?.rooms?.length ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <HallCanvas rooms={q.data.rooms} />
          </ScrollView>
        ) : (
          <Text style={styles.empty}>Нет данных зон</Text>
        )}
      </View>
    </Modal>
  );
}

function HallCanvas({ rooms }: { rooms: StructRoom[] }) {
  let maxX = 120;
  let maxY = 120;
  for (const r of rooms) {
    maxX = Math.max(maxX, r.area_frame_x + r.area_frame_width);
    maxY = Math.max(maxY, r.area_frame_y + r.area_frame_height);
  }

  const canvasW = SCREEN_W - 32;
  const scale = canvasW / maxX;
  const canvasH = Math.max(280, maxY * scale);

  return (
    <View style={[styles.canvas, { width: canvasW, height: canvasH }]}>
      {rooms.map((r, idx) => {
        const left = r.area_frame_x * scale;
        const top = r.area_frame_y * scale;
        const w = r.area_frame_width * scale;
        const h = r.area_frame_height * scale;
        const border = hexColor(r.color_border, colors.border);
        return (
          <View
            key={`${r.area_name}-${idx}`}
            style={[
              styles.zone,
              {
                left,
                top,
                width: w,
                height: h,
                borderColor: border,
              },
            ]}
          >
            <Text style={[styles.zoneTitle, { color: hexColor(r.color_text, colors.text) }]}>
              {r.area_name}
            </Text>
            {(r.pcs_list ?? []).map((pc) => {
              const px = (pc.pc_box_left / Math.max(r.area_frame_width, 1)) * w;
              const py = (pc.pc_box_top / Math.max(r.area_frame_height, 1)) * h;
              return (
                <View
                  key={pc.pc_name}
                  style={[
                    styles.pcDot,
                    {
                      left: Math.min(px, w - 36),
                      top: Math.min(py, h - 22),
                    },
                  ]}
                >
                  <Text style={styles.pcName} numberOfLines={1}>
                    {pc.pc_name}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', marginRight: 8 },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: colors.accent, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  canvas: {
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zone: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.06)',
    overflow: 'hidden',
  },
  zoneTitle: {
    fontSize: 11,
    fontWeight: '700',
    margin: 4,
    opacity: 0.95,
  },
  pcDot: {
    position: 'absolute',
    backgroundColor: colors.accentDim,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 72,
  },
  pcName: { color: '#fff', fontSize: 10, fontWeight: '600' },
  err: { color: colors.danger, padding: 20 },
  empty: { color: colors.muted, padding: 20 },
});
