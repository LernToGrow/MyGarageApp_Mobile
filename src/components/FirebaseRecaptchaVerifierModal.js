import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

function buildHtml(config) {
  const cfg = JSON.stringify(config);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #fff;
      font-family: sans-serif;
      padding: 16px;
    }
    p { color: #555; margin-bottom: 20px; font-size: 15px; text-align: center; }
  </style>
</head>
<body>
  <p>Please complete the verification below</p>
  <div id="rc"></div>

  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
  <script>
    function postMsg(obj) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    try {
      firebase.initializeApp(${cfg});
      const verifier = new firebase.auth.RecaptchaVerifier('rc', {
        size: 'normal',
        callback: function(token) {
          postMsg({ type: 'token', token: token });
        },
        'expired-callback': function() {
          postMsg({ type: 'expired' });
        }
      });
      verifier.render().then(function() {
        postMsg({ type: 'ready' });
      }).catch(function(e) {
        postMsg({ type: 'error', message: e.message });
      });
    } catch(e) {
      postMsg({ type: 'error', message: e.message });
    }
  </script>
</body>
</html>`;
}

const FirebaseRecaptchaVerifierModal = forwardRef(function FirebaseRecaptchaVerifierModal(
  { firebaseConfig },
  ref
) {
  const [visible, setVisible]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [webError, setWebError] = useState(null);
  const pendingRef              = useRef(null);

  useImperativeHandle(ref, () => ({
    type: 'recaptcha',
    verify() {
      return new Promise((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        setLoading(true);
        setWebError(null);
        setVisible(true);
      });
    },
    reset() {
      setVisible(false);
      pendingRef.current = null;
    },
  }));

  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'token') {
        setVisible(false);
        pendingRef.current?.resolve(data.token);
      } else if (data.type === 'ready') {
        setLoading(false);
      } else if (data.type === 'expired') {
        setWebError('reCAPTCHA expired — tap below to retry');
      } else if (data.type === 'error') {
        setWebError(data.message || 'reCAPTCHA failed to load');
      }
    } catch {}
  }

  function handleCancel() {
    setVisible(false);
    pendingRef.current?.reject(new Error('reCAPTCHA cancelled'));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Verification</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {webError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{webError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => {
                setWebError(null);
                setLoading(true);
              }}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#E85D04" />
                  <Text style={styles.loadingText}>Loading verification…</Text>
                </View>
              )}
              <WebView
                source={{ html: buildHtml(firebaseConfig) }}
                onMessage={handleMessage}
                onLoadEnd={() => setLoading(false)}
                onError={(e) => setWebError(e.nativeEvent.description || 'WebView failed to load')}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
                style={styles.webview}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    height: 380,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  closeBtn: {
    fontSize: 18,
    color: '#888',
    paddingHorizontal: 4,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#E85D04',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default FirebaseRecaptchaVerifierModal;
