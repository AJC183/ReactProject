import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Habits',
          tabBarIcon: tabIcon('checkmark-done-outline'),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: tabIcon('grid-outline'),
        }}
      />
    </Tabs>
  );
}
