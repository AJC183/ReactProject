import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAppTheme } from '@/app/_layout';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor:  theme.tabBarBorder,
          borderTopWidth:  1,
          height:          60,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
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
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: tabIcon('bar-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: tabIcon('search-outline'),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: tabIcon('compass-outline'),
        }}
      />
    </Tabs>
  );
}
