import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import RoleSwitchToggle from '../components/RoleSwitchToggle';

const MyJobsScreen     = require('../screens/mechanic/MyJobsScreen').default;
const AddBikeScreen    = require('../screens/mechanic/AddBikeScreen').default;
const InspectionScreen = require('../screens/mechanic/InspectionScreen').default;
const EstimateScreen   = require('../screens/mechanic/EstimateTimeScreen').default;
const JobCardScreen    = require('../screens/mechanic/JobCardScreen').default;
const AddPartsScreen   = require('../screens/mechanic/AddPartsScreen').default;
const PaymentScreen    = require('../screens/mechanic/PaymentScreen').default;
const JobDetailScreen  = require('../screens/shared/JobDetailScreen').default;

const Stack = createStackNavigator();

export default function MechanicNavigator() {
  const { t } = useTranslation();
  const rootOptions = {
    headerRight: () => <RoleSwitchToggle />,
    headerStyle: { elevation: 0, shadowOpacity: 0 },
  };
  return (
    <Stack.Navigator initialRouteName="MyJobs">
      <Stack.Screen name="MyJobs"     component={MyJobsScreen}     options={{ title: t('jobs.myJobs'),          ...rootOptions }} />
      <Stack.Screen name="AddBike"    component={AddBikeScreen}    options={{ title: t('addBike.title') }} />
      <Stack.Screen name="Inspection" component={InspectionScreen} options={{ title: t('inspection.title') }} />
      <Stack.Screen name="Estimate"   component={EstimateScreen}   options={{ title: t('estimateTime.title') }} />
      <Stack.Screen name="JobCard"    component={JobCardScreen}    options={{ title: t('jobCard.title') }} />
      <Stack.Screen name="AddParts"   component={AddPartsScreen}   options={{ title: t('addParts.title') }} />
      <Stack.Screen name="Payment"    component={PaymentScreen}    options={{ title: t('payment.title') }} />
      <Stack.Screen name="JobDetail"  component={JobDetailScreen}  options={{ title: t('jobDetail.title') }} />
    </Stack.Navigator>
  );
}
