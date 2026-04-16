import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor:  Colors.tabBarBorder,
          borderTopWidth:  1,
          height:          60,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
        },
      }}
    >
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
      <Tabs.Screen
        name="targets"
        options={{
          title: 'Targets',
          tabBarIcon: tabIcon('trophy-outline'),
        }}
      />
    </Tabs>
  );
}
