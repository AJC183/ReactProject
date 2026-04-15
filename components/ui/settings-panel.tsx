import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PANEL_WIDTH = Math.round(Dimensions.get('window').width / 3);

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PLACEHOLDER_ITEMS = [
  'Appearance',
  'Notifications',
  'Privacy',
  'Help & Support',
  'About',
];

export default function SettingsPanel({ visible, onClose }: Props) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : PANEL_WIDTH,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {PLACEHOLDER_ITEMS.map((label) => (
            <TouchableOpacity key={label} style={styles.menuItem} activeOpacity={0.6}>
              <Text style={styles.menuLabel}>{label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={() => {
              onClose();
              router.push('/profile');
            }}
          >
            <Text style={[styles.menuLabel, styles.accountLabel]}>
              Account Management
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    paddingTop: 52,
    paddingBottom: 24,
    width: PANEL_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  closeIcon: {
    color: '#6B7280',
    fontSize: 14,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    backgroundColor: '#F3F4F6',
    height: 1,
    marginVertical: 8,
    marginHorizontal: 14,
  },
  accountLabel: {
    color: '#0F766E',
    fontWeight: '600',
  },
});
