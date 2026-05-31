import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import RoleSwitchToggle from '../components/RoleSwitchToggle';

const DashboardScreen       = require('../screens/admin/DashboardScreen').default;
const JobsScreen            = require('../screens/admin/JobsScreen').default;
const InventoryScreen       = require('../screens/admin/InventoryScreen').default;
const RevenueScreen         = require('../screens/admin/RevenueScreen').default;
const SettingsScreen        = require('../screens/shared/SettingsScreen').default;
const JobDetailScreen       = require('../screens/shared/JobDetailScreen').default;
const CustomerSearchScreen  = require('../screens/shared/CustomerSearchScreen').default;
const CustomerProfileScreen = require('../screens/shared/CustomerProfileScreen').default;
const EmployeeScreen        = require('../screens/admin/EmployeeScreen').default;
const EditProfileScreen     = require('../screens/shared/EditProfileScreen').default;
const PaymentsScreen        = require('../screens/admin/PaymentsScreen').default;
const PerformanceScreen     = require('../screens/admin/PerformanceScreen').default;
const ServicesScreen        = require('../screens/admin/ServicesScreen').default;

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS = {
  Dashboard: ['grid',      'grid-outline'],
  Jobs:      ['briefcase', 'briefcase-outline'],
  Revenue:   ['bar-chart', 'bar-chart-outline'],
  Payments:  ['card',      'card-outline'],
  Settings:  ['settings',  'settings-outline'],
};

function tabIcon(routeName) {
  return ({ focused, color, size }) => {
    const [active, inactive] = TAB_ICONS[routeName];
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  };
}

function AdminTabs() {
  const { t } = useTranslation();
  const tabOptions = {
    headerShown: true,
    headerRight: () => <RoleSwitchToggle />,
    headerStyle: { elevation: 0, shadowOpacity: 0 },
    tabBarActiveTintColor:   '#E85D04',
    tabBarInactiveTintColor: '#888',
    tabBarStyle:             { paddingBottom: 4 },
  };
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboard.title'), tabBarIcon: tabIcon('Dashboard') }} />
      <Tab.Screen name="Jobs"      component={JobsScreen}      options={{ title: t('jobs.title'),      tabBarIcon: tabIcon('Jobs') }} />
      <Tab.Screen name="Revenue"   component={RevenueScreen}   options={{ title: t('revenue.title'),   tabBarIcon: tabIcon('Revenue') }} />
      <Tab.Screen name="Payments"  component={PaymentsScreen}  options={{ title: t('payments.title'),  tabBarIcon: tabIcon('Payments') }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}  options={{ title: t('settings.title'),  tabBarIcon: tabIcon('Settings') }} />
    </Tab.Navigator>
  );
}

const sharedHeader = { headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 } };

export default function AdminNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs"        component={AdminTabs} />
      <Stack.Screen name="JobDetail"        component={JobDetailScreen}       options={{ ...sharedHeader, title: t('jobDetail.title') }} />
      <Stack.Screen name="CustomerSearch"   component={CustomerSearchScreen}  options={{ ...sharedHeader, title: t('customerSearch.title') }} />
      <Stack.Screen name="CustomerProfile"  component={CustomerProfileScreen} options={{ ...sharedHeader, title: t('customer.title') }} />
      <Stack.Screen name="Employees"        component={EmployeeScreen}        options={{ ...sharedHeader, title: t('employees.title') }} />
      <Stack.Screen name="Performance"      component={PerformanceScreen}
        options={({ route }) => ({ ...sharedHeader, title: route.params?.name ? `${route.params.name} — ${t('employees.performance')}` : t('employees.performance') })}
      />
      <Stack.Screen name="EditProfile"      component={EditProfileScreen}     options={{ ...sharedHeader, title: t('editProfile.title') }} />
<Stack.Screen name="Inventory"        component={InventoryScreen}       options={{ ...sharedHeader, title: t('inventory.title') }} />
      <Stack.Screen name="Services"         component={ServicesScreen}        options={{ ...sharedHeader, title: t('services.title') }} />
    </Stack.Navigator>
  );
}
