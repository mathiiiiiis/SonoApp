// Polyfill for btoa and atob in React Native
const btoa = (input) => {
  // Simple ASCII-only implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = '';
  let i = 0;
  let chr1, chr2, chr3;
  let enc1, enc2, enc3, enc4;

  while (i < input.length) {
    chr1 = input.charCodeAt(i++);
    chr2 = i < input.length ? input.charCodeAt(i++) : NaN;
    chr3 = i < input.length ? input.charCodeAt(i++) : NaN;

    // eslint-disable-next-line no-bitwise
    enc1 = chr1 >> 2;
    // eslint-disable-next-line no-bitwise
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    // eslint-disable-next-line no-bitwise
    enc3 = isNaN(chr2) ? 64 : ((chr2 & 15) << 2) | (chr3 >> 6);
    // eslint-disable-next-line no-bitwise
    enc4 = isNaN(chr3) ? 64 : chr3 & 63;

    str += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return str;
};

const atob = (base64) => {
  // Simple ASCII-only implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = '';
  let i = 0;
  let chr1, chr2, chr3;
  let enc1, enc2, enc3, enc4;

  base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');

  while (i < base64.length) {
    enc1 = chars.indexOf(base64.charAt(i++));
    enc2 = chars.indexOf(base64.charAt(i++));
    enc3 = chars.indexOf(base64.charAt(i++));
    enc4 = chars.indexOf(base64.charAt(i++));

    // eslint-disable-next-line no-bitwise
    chr1 = (enc1 << 2) | (enc2 >> 4);
    // eslint-disable-next-line no-bitwise
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    // eslint-disable-next-line no-bitwise
    chr3 = ((enc3 & 3) << 6) | enc4;

    str += String.fromCharCode(chr1);
    if (enc3 !== 64) {
      str += String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      str += String.fromCharCode(chr3);
    }
  }

  return str;
};

/**
 * Custom base64 encoding function for React Native
 * @param {string} input - The string to encode (assuming URI is a string)
 * @returns {string} - The base64 encoded string
 */
export const base64Encode = (input) => {
  // In React Native, btoa might not work directly with UTF-8, ensure input is handled correctly
  // If input contains non-ASCII characters, standard btoa will fail.
  // A common workaround involves UTF-8 conversion before base64 encoding.
  try {
    // This handles basic ASCII. For full UTF-8, a more robust solution might be needed.
    return btoa(input);
  } catch (e) {
    console.error('Error in base64Encode:', e);
    // Fallback or error handling needed if non-ASCII URIs are expected
    // For simplicity, returning the original input on error, but this should be addressed.
    // Consider using a library like 'react-native-base64' if complex strings are involved.
    return input;
  }
};

/**
 * Custom base64 decoding function for React Native
 * @param {string} base64 - The base64 string to decode
 * @returns {string} - The decoded string
 */
export const base64Decode = (base64) => {
  try {
    return atob(base64);
  } catch (e) {
    console.error('Error in base64Decode:', e);
    // Fallback or error handling
    return '';
  }
};
