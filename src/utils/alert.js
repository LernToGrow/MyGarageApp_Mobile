// Drop-in replacement for React Native's Alert.alert()
// Usage: import { showAlert } from '../utils/alert';
//        showAlert('Title', 'Message', [{ text: 'OK' }]);

let _handler = null;

export function registerAlertHandler(handler) {
  _handler = handler;
}

export function showAlert(title, message, buttons) {
  if (_handler) {
    _handler({ title, message, buttons: buttons || [{ text: 'OK' }] });
  }
}
