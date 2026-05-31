import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';

const MyJobsScreen          = require('../screens/mechanic/MyJobsScreen').default;
const AddBikeScreen         = require('../screens/mechanic/AddBikeScreen').default;
const InspectionScreen      = require('../screens/mechanic/InspectionScreen').default;
const EstimateTimeScreen    = require('../screens/mechanic/EstimateTimeScreen').default;
const JobCardScreen         = require('../screens/mechanic/JobCardScreen').default;
const AddPartsScreen        = require('../screens/mechanic/AddPartsScreen').default;
const PaymentScreen         = require('../screens/mechanic/PaymentScreen').default;
const JobDetailScreen       = require('../screens/shared/JobDetailScreen').default;
const CustomerSearchScreen  = require('../screens/shared/CustomerSearchScreen').default;
const CustomerProfileScreen = require('../screens/shared/CustomerProfileScreen').default;
const EditProfileScreen     = require('../screens/shared/EditProfileScreen').default;
const SettingsScreen        = require('../screens/shared/SettingsScreen').default;
const InventoryScreen       = require('../screens/admin/InventoryScreen').default;
const ServicesScreen        = require('../screens/admin/ServicesScreen').default;
const MyStatsScreen         = require('../screens/employee/MyStatsScreen').default;
const MyPaymentsScreen      = require('../screens/employee/MyPaymentsScreen').default;

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const sharedHeader = { headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 } };

// Wraps MyJobsScreen in its own stack so PaymentScreen can pop back to MyJobs
const JobsStack = createStackNavigator();
function JobsStackNavigator() {
  const { t } = useTranslation();
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false }}>
      <JobsStack.Screen name="MyJobs" component={MyJobsScreen} options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('jobs.myJobs') || 'My Jobs' }} />
      <JobsStack.Screen name="AddBike"    component={AddBikeScreen}       options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('addBike.title') }} />
      <JobsStack.Screen name="Inspection" component={InspectionScreen}    options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('inspection.title') }} />
      <JobsStack.Screen name="Estimate"   component={EstimateTimeScreen}  options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('estimate.title') }} />
      <JobsStack.Screen name="JobCard"    component={JobCardScreen}       options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('jobCard.title') }} />
      <JobsStack.Screen name="AddParts"   component={AddPartsScreen}      options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('addParts.title') }} />
      <JobsStack.Screen name="Payment"    component={PaymentScreen}       options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('payment.title') }} />
      <JobsStack.Screen name="JobDetail"  component={JobDetailScreen}     options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('jobDetail.title') }} />
      <JobsStack.Screen name="CustomerSearch"  component={CustomerSearchScreen}  options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('customerSearch.title') }} />
      <JobsStack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ headerShown: true, headerStyle: { elevation: 0, shadowOpacity: 0 }, title: t('customer.title') }} />
    </JobsStack.Navigator>
  );
}

function EmployeeTabs() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const perms = user?.permissions ?? [];
  const canInventory = perms.includes('add_inventory') || perms.includes('edit_inventory');

  const tabOptions = {
    headerShown: false,
    tabBarActiveTintColor:   '#E85D04',
    tabBarInactiveTintColor: '#888',
    tabBarStyle:             { paddingBottom: 4 },
  };

  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="JobsTab"
        component={JobsStackNavigator}
        options={{
          title: t('jobs.myJobs') || 'My Jobs',
          tabBarIcon: ({ focused, color, size }) =>
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyPayments"
        component={MyPaymentsScreen}
        options={{
          headerShown: true,
          headerStyle: { elevation: 0, shadowOpacity: 0 },
          title: t('payments.myPayments'),
          tabBarIcon: ({ focused, color, size }) =>
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyStats"
        component={MyStatsScreen}
        options={{
          headerShown: true,
          headerStyle: { elevation: 0, shadowOpacity: 0 },
          title: t('employees.performance') || 'My Stats',
          tabBarIcon: ({ focused, color, size }) =>
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: { elevation: 0, shadowOpacity: 0 },
          title: t('settings.title'),
          tabBarIcon: ({ focused, color, size }) =>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function EmployeeNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
      {/* Screens navigated to from SettingsScreen */}
      <Stack.Screen name="Inventory"   component={InventoryScreen}   options={{ ...sharedHeader, title: t('inventory.title') }} />
      <Stack.Screen name="Services"    component={ServicesScreen}    options={{ ...sharedHeader, title: t('services.title') }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ ...sharedHeader, title: t('editProfile.title') }} />
    </Stack.Navigator>
  );
}
