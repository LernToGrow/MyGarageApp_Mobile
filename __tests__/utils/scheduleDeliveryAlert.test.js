import { Alert } from 'react-native';
import { checkDeliveryAlert } from '../../src/utils/scheduleDeliveryAlert';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  Alert.alert.mockClear();
});

function jobWithReadyAt(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return { _id: 'j1', job_number: 'JOB-001', estimated_ready_at: d.toISOString() };
}

describe('checkDeliveryAlert', () => {
  it('shows alert when delivery is within 30 minutes', () => {
    checkDeliveryAlert(jobWithReadyAt(15));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert.mock.calls[0][0]).toBe('⏰ Delivery Reminder');
    expect(Alert.alert.mock.calls[0][1]).toContain('JOB-001');
    expect(Alert.alert.mock.calls[0][1]).toContain('15 minutes');
  });

  it('shows alert when delivery is exactly 30 minutes away', () => {
    checkDeliveryAlert(jobWithReadyAt(30));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('does not show alert when delivery is more than 30 minutes away', () => {
    checkDeliveryAlert(jobWithReadyAt(60));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('does not show alert when delivery time has already passed', () => {
    checkDeliveryAlert(jobWithReadyAt(-10));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('does not show alert when job has no estimated_ready_at', () => {
    checkDeliveryAlert({ _id: 'j1', job_number: 'JOB-001' });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('does not show alert when job is null', () => {
    checkDeliveryAlert(null);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('uses singular "minute" when 1 minute remains', () => {
    checkDeliveryAlert(jobWithReadyAt(1));
    expect(Alert.alert.mock.calls[0][1]).toContain('1 minute!');
    expect(Alert.alert.mock.calls[0][1]).not.toContain('minutes');
  });
});
