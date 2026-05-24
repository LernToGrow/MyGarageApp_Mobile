import client from './client';

export function register(phone, password, name, garageName) {
  return client.post('/auth/register', { phone, password, name, garageName });
}

export function login(phone, password) {
  return client.post('/auth/login', { phone, password });
}

export function forgotPassword(phone) {
  return client.post('/auth/forgot-password', { phone });
}

export function resetPassword(phone, reset_token, new_password) {
  return client.post('/auth/reset-password', { phone, reset_token, new_password });
}

export function getMe() {
  return client.get('/auth/me');
}

export function updateLanguage(language) {
  return client.patch('/auth/me', { language });
}

export function updateProfile(name, photoUri) {
  const form = new FormData();
  if (name) form.append('name', name);
  if (photoUri) {
    const filename = photoUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    form.append('photo', { uri: photoUri, name: filename, type });
  }
  return client.patch('/auth/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function updateGarage({ address, city, gstin, garagePhotoUri, galleryUris = [] }) {
  const form = new FormData();
  if (address !== undefined) form.append('address', address);
  if (city !== undefined)    form.append('city', city);
  if (gstin !== undefined)   form.append('gstin', gstin);
  if (garagePhotoUri) {
    const filename = garagePhotoUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    form.append('garage_photo', { uri: garagePhotoUri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
  }
  galleryUris.forEach((uri) => {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    form.append('gallery', { uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
  });
  return client.patch('/auth/garage', form, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function removeGalleryPhoto(url) {
  return client.delete('/auth/garage/gallery', { data: { url } });
}
