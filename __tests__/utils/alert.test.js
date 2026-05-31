import { registerAlertHandler, showAlert } from '../../src/utils/alert';

// Reset module state between tests by re-importing freshly
// We rely on the module-level _handler variable resetting via registerAlertHandler(null).

beforeEach(() => {
  registerAlertHandler(null);
});

describe('registerAlertHandler / showAlert', () => {
  it('does nothing when no handler is registered', () => {
    // Should not throw
    expect(() => showAlert('Title', 'Message')).not.toThrow();
  });

  it('calls the registered handler with title, message, and buttons', () => {
    const handler = jest.fn();
    registerAlertHandler(handler);

    showAlert('Hello', 'World', [{ text: 'OK' }]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      title: 'Hello',
      message: 'World',
      buttons: [{ text: 'OK' }],
    });
  });

  it('defaults buttons to [{ text: "OK" }] when not provided', () => {
    const handler = jest.fn();
    registerAlertHandler(handler);

    showAlert('Hi', 'There');

    expect(handler).toHaveBeenCalledWith({
      title: 'Hi',
      message: 'There',
      buttons: [{ text: 'OK' }],
    });
  });

  it('defaults buttons to [{ text: "OK" }] when null is passed', () => {
    const handler = jest.fn();
    registerAlertHandler(handler);

    showAlert('Hi', 'There', null);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: [{ text: 'OK' }] })
    );
  });

  it('replaces the previous handler when a new one is registered', () => {
    const first = jest.fn();
    const second = jest.fn();

    registerAlertHandler(first);
    registerAlertHandler(second);

    showAlert('T', 'M');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops calling handler after it is cleared with null', () => {
    const handler = jest.fn();
    registerAlertHandler(handler);
    registerAlertHandler(null);

    showAlert('T', 'M');

    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards multiple buttons correctly', () => {
    const handler = jest.fn();
    registerAlertHandler(handler);

    const buttons = [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }];
    showAlert('Confirm', 'Are you sure?', buttons);

    expect(handler).toHaveBeenCalledWith({ title: 'Confirm', message: 'Are you sure?', buttons });
  });
});
