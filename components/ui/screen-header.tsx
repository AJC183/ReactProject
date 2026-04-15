import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
};

export default function ScreenHeader({ title, subtitle, rightAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
});
