import { Alert } from 'react-native';

// Call this when Job Card opens. Shows an alert if delivery is within 30 minutes.
export function checkDeliveryAlert(job) {
  if (!job?.estimated_ready_at) return;
  const readyAt = new Date(job.estimated_ready_at);
  const minsLeft = Math.round((readyAt - new Date()) / 60000);
  if (minsLeft > 0 && minsLeft <= 30) {
    Alert.alert(
      '⏰ Delivery Reminder',
      `Job ${job.job_number} — bike should be delivered in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}!`,
    );
  }
}
