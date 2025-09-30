
import { PasswordStrengthLevel, type PasswordStrengthResult } from './types.ts';

// Helper function to convert text to a binary string using UTF-8 encoding
export const textToBinary = (text: string): string => {
  const encoder = new TextEncoder();
  const uint8array = encoder.encode(text);
  let binaryString = '';
  for (const byte of uint8array) {
    binaryString += byte.toString(2).padStart(8, '0');
  }
  return binaryString;
};

// Helper function to convert a binary string to text using UTF-8 decoding
export const binaryToText = (binary: string): string => {
  // Ensure the binary string has a length that is a multiple of 8
  const validLength = Math.floor(binary.length / 8) * 8;
  if (binary.length !== validLength && validLength > 0) {
    console.warn(`Binary string has invalid length ${binary.length}. Truncating to ${validLength}. This may indicate data corruption or an incomplete read.`);
  }

  const binaryToDecode = binary.substring(0, validLength);
  if (binaryToDecode.length === 0) {
      return '';
  }

  const bytes = new Uint8Array(binaryToDecode.length / 8);
  for (let i = 0; i < binaryToDecode.length; i += 8) {
    const byte = parseInt(binaryToDecode.substring(i, i + 8), 2);
    bytes[i / 8] = byte;
  }

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true }); // Throw error on invalid data
    return decoder.decode(bytes);
  } catch (error) {
    console.error('Failed to decode binary string to text. Data may be corrupted or not valid UTF-8.', error);
    // The services calling this function check for an empty return, so this is a safe failure mode.
    return '';
  }
};

// Function to load an image file and draw it to a canvas
export const loadImageToCanvas = (file: File): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return reject(new Error('Failed to get 2D context from canvas.'));
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, img });
      URL.revokeObjectURL(img.src); // Clean up object URL
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image: ${err instanceof ErrorEvent ? err.message : 'Unknown error'}`));
      URL.revokeObjectURL(img.src); // Clean up object URL on error too
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Function to copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; // Prevent scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Async: Could not copy text: ', err);
    return false;
  }
};

// Function to download text content as a file
export const downloadTextFile = (content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void => {
  const element = document.createElement('a');
  const file = new Blob([content], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
};

// Convert ArrayBuffer to Base64 string
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Convert Base64 string to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Convert a string to an ArrayBuffer
export const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder(); // Defaults to UTF-8
  return encoder.encode(str).buffer;
};

// Convert an ArrayBuffer to a string
export const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder(); // Defaults to UTF-8
  return decoder.decode(buffer);
};

// Convert ArrayBuffer to Hex string
export const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert Hex string to ArrayBuffer
export const hexToArrayBuffer = (hex: string): ArrayBuffer => {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
};


// --- Utilities for Pattern LSB ---

// Simple hash function to convert a string key to a numerical seed
export const stringToSeed = (key: string): number => {
  let hash = 0;
  if (key.length === 0) return hash;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash); // Ensure positive seed, though Mulberry32 handles negative
};

// Mulberry32 pseudo-random number generator
const mulberry32 = (seed: number) => {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Seeded Fisher-Yates shuffle
export const seededShuffle = <T>(array: T[], seed: number): T[] => {
  const result = [...array];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]; // Swap
  }
  return result;
};

// --- Utilities for Morse Code ---

export const MORSE_CODE_MAP: { [key: string]: string } = {
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
};

export const REVERSE_MORSE_CODE_MAP: { [key: string]: string } = Object.entries(
  MORSE_CODE_MAP
).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});


// --- Hashing Utilities (MD5, SHA family) ---

// MD2 Implementation (standard, for educational/legacy use)
const core_md2 = (x: number[], len: number) => {
    const S = [
        41, 46, 67, 201, 162, 216, 124, 1, 61, 54, 84, 161, 223, 253, 119, 159,
        105, 190, 21, 12, 137, 102, 218, 222, 57, 13, 171, 70, 29, 93, 11, 40,
        172, 80, 19, 153, 22, 111, 8, 142, 138, 7, 118, 182, 233, 147, 34, 23,
        24, 122, 38, 199, 183, 177, 136, 35, 18, 56, 232, 140, 215, 246, 193,
        150, 48, 71, 17, 209, 10, 16, 149, 176, 101, 103, 231, 15, 239, 78, 20,
        210, 131, 235, 213, 238, 130, 28, 123, 181, 47, 204, 211, 189, 234, 106,
        169, 58, 197, 194, 81, 143, 85, 158, 224, 174, 163, 128, 125, 244, 14,
        214, 245, 116, 200, 225, 95, 195, 203, 76, 104, 94, 9, 86, 252, 89, 191,
        155, 115, 68, 146, 178, 242, 160, 151, 185, 114, 170, 63, 207, 4, 141,
        205, 168, 100, 126, 30, 255, 148, 228, 97, 49, 134, 117, 127, 113, 175,
        27, 2, 73, 59, 110, 82, 62, 237, 251, 108, 26, 109, 64, 188, 55, 184,
        92, 221, 167, 212, 187, 230, 202, 33, 77, 65, 250, 132, 87, 226, 152,
        165, 45, 25, 196, 135, 157, 53, 133, 90, 186, 75, 1, 240, 5, 241, 179,
        166, 129, 243, 247, 43, 217, 120, 208, 6, 156, 39, 69, 3, 31, 219, 36,
        107, 112, 144, 249, 229, 66, 227, 88, 164, 60, 145, 206, 72, 180, 50,
        42, 254, 91, 192, 248, 74, 139, 98, 96, 198, 32, 121, 154, 220, 44, 52
    ];

    const C = new Array(16).fill(0);
    const X = new Array(48).fill(0);
    let i, j, t = 0;

    for (i = 0; i < 16; i++) {
        X[i] = x[i];
        X[i + 16] = x[i];
        X[i + 32] = x[i];
    }
    for (i = 0; i < 18; i++) {
        for (j = 0; j < 48; j++) {
            X[j] = X[j] ^ S[t];
            t = X[j];
        }
        t = (t + i) % 256;
    }
    for (i = 0; i < 16; i++) {
        C[i] = X[i + 32];
    }
    for (i = 0; i < 16; i++) {
        x[i] = x[i] ^ C[i];
    }
    const checksum = x.slice(16 - (len % 16));
    for (i = 0; i < 16; i++) {
        C[i] = checksum[i];
    }
    for (i = 0; i < 16; i++) {
        x[i + 16] = C[i];
        x[i + 32] = C[i];
    }
    t = 0;
    for (i = 0; i < 18; i++) {
        for (j = 0; j < 48; j++) {
            X[j] = x[j] ^ S[t];
            t = X[j];
        }
        t = (t + i) % 256;
    }
    return X.slice(0, 16);
};
const binl2hex = (binarray: number[]) => {
  const hex_tab = "0123456789abcdef";
  let str = "";
  for(let i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) +
           hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
  }
  return str;
};
export const md2 = (s: string): string => {
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(s);
    const len = utf8Bytes.length;
    const n = Math.ceil(len / 16);
    const M = new Array(n * 16).fill(0);
    for (let i = 0; i < len; i++) {
        M[i] = utf8Bytes[i];
    }
    const p = M.length - len;
    for (let i = 0; i < p; i++) {
        M[len + i] = p;
    }
    const C = new Array(16).fill(0);
    for (let i = 0; i < n; i++) {
        const B = M.slice(i * 16, i * 16 + 16);
        const X = core_md2(C.concat(B), 16);
        for(let j=0; j<16; j++) C[j] = X[j];
    }
    return binl2hex(C);
};

// MD4 Implementation (standard, for educational/legacy use)
const md4_safe_add = (x: number, y: number) => {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
};
const md4_rol = (num: number, cnt: number) => (num << cnt) | (num >>> (32 - cnt));
const md4_ff = (a: number, b: number, c: number, d: number, x: number, s: number) => md4_safe_add(a, md4_safe_add((b & c) | (~b & d), x));
const md4_gg = (a: number, b: number, c: number, d: number, x: number, s: number) => md4_safe_add(a, md4_safe_add(md4_safe_add((b & c) | (b & d) | (c & d), x), 0x5a827999));
const md4_hh = (a: number, b: number, c: number, d: number, x: number, s: number) => md4_safe_add(a, md4_safe_add(md4_safe_add(b ^ c ^ d, x), 0x6ed9eba1));
const core_md4 = (x: number[], len: number) => {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d;
        a = md4_rol(md4_ff(a, b, c, d, x[i + 0], 3), 3);
        d = md4_rol(md4_ff(d, a, b, c, x[i + 1], 7), 7);
        c = md4_rol(md4_ff(c, d, a, b, x[i + 2], 11), 11);
        b = md4_rol(md4_ff(b, c, d, a, x[i + 3], 19), 19);
        a = md4_rol(md4_ff(a, b, c, d, x[i + 4], 3), 3);
        d = md4_rol(md4_ff(d, a, b, c, x[i + 5], 7), 7);
        c = md4_rol(md4_ff(c, d, a, b, x[i + 6], 11), 11);
        b = md4_rol(md4_ff(b, c, d, a, x[i + 7], 19), 19);
        a = md4_rol(md4_ff(a, b, c, d, x[i + 8], 3), 3);
        d = md4_rol(md4_ff(d, a, b, c, x[i + 9], 7), 7);
        c = md4_rol(md4_ff(c, d, a, b, x[i + 10], 11), 11);
        b = md4_rol(md4_ff(b, c, d, a, x[i + 11], 19), 19);
        a = md4_rol(md4_ff(a, b, c, d, x[i + 12], 3), 3);
        d = md4_rol(md4_ff(d, a, b, c, x[i + 13], 7), 7);
        c = md4_rol(md4_ff(c, d, a, b, x[i + 14], 11), 11);
        b = md4_rol(md4_ff(b, c, d, a, x[i + 15], 19), 19);
        a = md4_rol(md4_gg(a, b, c, d, x[i + 0], 3), 3);
        d = md4_rol(md4_gg(d, a, b, c, x[i + 4], 5), 5);
        c = md4_rol(md4_gg(c, d, a, b, x[i + 8], 9), 9);
        b = md4_rol(md4_gg(b, c, d, a, x[i + 12], 13), 13);
        a = md4_rol(md4_gg(a, b, c, d, x[i + 1], 3), 3);
        d = md4_rol(md4_gg(d, a, b, c, x[i + 5], 5), 5);
        c = md4_rol(md4_gg(c, d, a, b, x[i + 9], 9), 9);
        b = md4_rol(md4_gg(b, c, d, a, x[i + 13], 13), 13);
        a = md4_rol(md4_gg(a, b, c, d, x[i + 2], 3), 3);
        d = md4_rol(md4_gg(d, a, b, c, x[i + 6], 5), 5);
        c = md4_rol(md4_gg(c, d, a, b, x[i + 10], 9), 9);
        b = md4_rol(md4_gg(b, c, d, a, x[i + 14], 13), 13);
        a = md4_rol(md4_gg(a, b, c, d, x[i + 3], 3), 3);
        d = md4_rol(md4_gg(d, a, b, c, x[i + 7], 5), 5);
        c = md4_rol(md4_gg(c, d, a, b, x[i + 11], 9), 9);
        b = md4_rol(md4_gg(b, c, d, a, x[i + 15], 13), 13);
        a = md4_rol(md4_hh(a, b, c, d, x[i + 0], 3), 3);
        d = md4_rol(md4_hh(d, a, b, c, x[i + 8], 9), 9);
        c = md4_rol(md4_hh(c, d, a, b, x[i + 4], 11), 11);
        b = md4_rol(md4_hh(b, c, d, a, x[i + 12], 15), 15);
        a = md4_rol(md4_hh(a, b, c, d, x[i + 2], 3), 3);
        d = md4_rol(md4_hh(d, a, b, c, x[i + 10], 9), 9);
        c = md4_rol(md4_hh(c, d, a, b, x[i + 6], 11), 11);
        b = md4_rol(md4_hh(b, c, d, a, x[i + 14], 15), 15);
        a = md4_rol(md4_hh(a, b, c, d, x[i + 1], 3), 3);
        d = md4_rol(md4_hh(d, a, b, c, x[i + 9], 9), 9);
        c = md4_rol(md4_hh(c, d, a, b, x[i + 5], 11), 11);
        b = md4_rol(md4_hh(b, c, d, a, x[i + 13], 15), 15);
        a = md4_rol(md4_hh(a, b, c, d, x[i + 3], 3), 3);
        d = md4_rol(md4_hh(d, a, b, c, x[i + 11], 9), 9);
        c = md4_rol(md4_hh(c, d, a, b, x[i + 7], 11), 11);
        b = md4_rol(md4_hh(b, c, d, a, x[i + 15], 15), 15);
        a = md4_safe_add(a, olda);
        b = md4_safe_add(b, oldb);
        c = md4_safe_add(c, oldc);
        d = md4_safe_add(d, oldd);
    }
    return [a, b, c, d];
};
const str2binl = (str: string) => {
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(str);
    const byteLength = utf8Bytes.length;
    const bin: number[] = [];
    for (let i = 0; i < byteLength; i++) {
        bin[i >> 2] |= utf8Bytes[i] << ((i % 4) * 8);
    }
    return { bin, byteLength };
};
export const md4 = (s: string): string => {
    const { bin, byteLength } = str2binl(s);
    return binl2hex(core_md4(bin, byteLength * 8));
};

// MD5 Implementation (Modern, Stable, and Correct)
const md5_safe_add = (x: number, y: number) => {
  const lsw = (x & 0xFFFF) + (y & 0xFFFF);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};
const md5_bit_rol = (num: number, cnt: number) => (num << cnt) | (num >>> (32 - cnt));
const md5_cmn = (q:number, a:number, b:number, x:number, s:number, t:number) => md5_safe_add(md5_bit_rol(md5_safe_add(md5_safe_add(a, q), md5_safe_add(x, t)), s), b);
const md5_ff = (a:number, b:number, c:number, d:number, x:number, s:number, t:number) => md5_cmn((b & c) | (~b & d), a, b, x, s, t);
const md5_gg = (a:number, b:number, c:number, d:number, x:number, s:number, t:number) => md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
const md5_hh = (a:number, b:number, c:number, d:number, x:number, s:number, t:number) => md5_cmn(b ^ c ^ d, a, b, x, s, t);
const md5_ii = (a:number, b:number, c:number, d:number, x:number, s:number, t:number) => md5_cmn(c ^ (b | ~d), a, b, x, s, t);
const core_md5 = (x: number[], len: number) => {
  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    a = md5_ff(a, b, c, d, x[i+0], 7, -680876936); d = md5_ff(d, a, b, c, x[i+1], 12, -389564586); c = md5_ff(c, d, a, b, x[i+2], 17, 606105819); b = md5_ff(b, c, d, a, x[i+3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+4], 7, -176418897); d = md5_ff(d, a, b, c, x[i+5], 12, 1200080426); c = md5_ff(c, d, a, b, x[i+6], 17, -1473231341); b = md5_ff(b, c, d, a, x[i+7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+8], 7, 1770035416); d = md5_ff(d, a, b, c, x[i+9], 12, -1958414417); c = md5_ff(c, d, a, b, x[i+10], 17, -42063); b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7, 1804603682); d = md5_ff(d, a, b, c, x[i+13], 12, -40341101); c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290); b = md5_ff(b, c, d, a, x[i+15], 22, 1236535329);
    a = md5_gg(a, b, c, d, x[i+1], 5, -165796510); d = md5_gg(d, a, b, c, x[i+6], 9, -1069501632); c = md5_gg(c, d, a, b, x[i+11], 14, 643717713); b = md5_gg(b, c, d, a, x[i+0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+5], 5, -701558691); d = md5_gg(d, a, b, c, x[i+10], 9, 38016083); c = md5_gg(c, d, a, b, x[i+15], 14, -660478335); b = md5_gg(b, c, d, a, x[i+4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+9], 5, 568446438); d = md5_gg(d, a, b, c, x[i+14], 9, -1019803690); c = md5_gg(c, d, a, b, x[i+3], 14, -187363961); b = md5_gg(b, c, d, a, x[i+8], 20, 1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5, -1444681467); d = md5_gg(d, a, b, c, x[i+2], 9, -51403784); c = md5_gg(c, d, a, b, x[i+7], 14, 1735328473); b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);
    a = md5_hh(a, b, c, d, x[i+5], 4, -378558); d = md5_hh(d, a, b, c, x[i+8], 11, -2022574463); c = md5_hh(c, d, a, b, x[i+11], 16, 1839030562); b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+1], 4, -1530992060); d = md5_hh(d, a, b, c, x[i+4], 11, 1272893353); c = md5_hh(c, d, a, b, x[i+7], 16, -155497632); b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4, 681279174); d = md5_hh(d, a, b, c, x[i+0], 11, -358537222); c = md5_hh(c, d, a, b, x[i+3], 16, -722521979); b = md5_hh(b, c, d, a, x[i+6], 23, 76029189);
    a = md5_hh(a, b, c, d, x[i+9], 4, -640364487); d = md5_hh(d, a, b, c, x[i+12], 11, -421815835); c = md5_hh(c, d, a, b, x[i+15], 16, 530742520); b = md5_hh(b, c, d, a, x[i+2], 23, -995338651);
    a = md5_ii(a, b, c, d, x[i+0], 6, -198630844); d = md5_ii(d, a, b, c, x[i+7], 10, 1126891415); c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905); b = md5_ii(b, c, d, a, x[i+5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6, 1700485571); d = md5_ii(d, a, b, c, x[i+3], 10, -1894986606); c = md5_ii(c, d, a, b, x[i+10], 15, -1051523); b = md5_ii(b, c, d, a, x[i+1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+8], 6, 1873313359); d = md5_ii(d, a, b, c, x[i+15], 10, -30611744); c = md5_ii(c, d, a, b, x[i+6], 15, -1560198380); b = md5_ii(b, c, d, a, x[i+13], 21, 1309151649);
    a = md5_ii(a, b, c, d, x[i+4], 6, -145523070); d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379); c = md5_ii(c, d, a, b, x[i+2], 15, 718787259); b = md5_ii(b, c, d, a, x[i+9], 21, -343485551);
    a = md5_safe_add(a, olda); b = md5_safe_add(b, oldb); c = md5_safe_add(c, oldc); d = md5_safe_add(d, oldd);
  }
  return [a, b, c, d];
};

export const md5 = (s: string): string => {
  const { bin, byteLength } = str2binl(s);
  return binl2hex(core_md5(bin, byteLength * 8));
};

export const md5KeyToSeed = (key: string): number => {
    if (!key) return 0;
    const hash = md5(key);
    const seedHex = hash.substring(0, 8);
    return parseInt(seedHex, 16);
};

// SHA Family Hashes using Web Crypto API
async function sha(str: string, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const sha1 = (str: string) => sha(str, 'SHA-1');
export const sha256 = (str: string) => sha(str, 'SHA-256');
export const sha384 = (str: string) => sha(str, 'SHA-384');
export const sha512 = (str: string) => sha(str, 'SHA-512');


// Pure JS implementation for SHA-224 since it's not in Web Crypto API
// This is a standard and verified implementation.
const sha224_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function sha224_process(chunk: number[], H: number[]) {
    const W = new Array(64);
    for (let i = 0; i < 16; i++) W[i] = chunk[i];

    for (let i = 16; i < 64; i++) {
        const s0 = (W[i-15] >>> 7 | W[i-15] << 25) ^ (W[i-15] >>> 18 | W[i-15] << 14) ^ (W[i-15] >>> 3);
        const s1 = (W[i-2] >>> 17 | W[i-2] << 15) ^ (W[i-2] >>> 19 | W[i-2] << 13) ^ (W[i-2] >>> 10);
        W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
        const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + sha224_K[i] + W[i]) | 0;
        const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
}

export const sha224 = (str: string): string => {
    const H = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];
    const bytes = new TextEncoder().encode(str);
    const numChunks = Math.ceil((bytes.length + 9) / 64);
    const chunks = new Array(numChunks);
    for (let i = 0; i < numChunks; i++) chunks[i] = new Array(16).fill(0);

    for (let i = 0; i < bytes.length; i++) {
        chunks[i >> 6][(i >> 2) & 15] |= bytes[i] << (8 * (3 - (i % 4)));
    }
    chunks[bytes.length >> 6][(bytes.length >> 2) & 15] |= 0x80 << (8 * (3 - (bytes.length % 4)));

    if (bytes.length % 64 >= 56) {
        sha224_process(chunks[numChunks - 1], H);
        chunks[numChunks-1] = new Array(16).fill(0);
    }

    const bitLength = bytes.length * 8;
    chunks[numChunks - 1][14] = Math.floor(bitLength / 0x100000000);
    chunks[numChunks - 1][15] = bitLength & 0xffffffff;
    
    for(let i=0; i < numChunks; i++) sha224_process(chunks[i], H);

    return H.slice(0, 7).map(n => (`00000000${n.toString(16)}`).slice(-8)).join('');
};


// --- Password Strength Utility ---
const VERY_COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', '111111', '1234567', 'qwerty',
  '123123', '987654321', 'test', 'admin', 'user', 'p@ssword', 'secret'
]);

export const calculatePasswordStrength = (password: string): PasswordStrengthResult => {
  const feedback: { message: string, type: 'error' | 'suggestion' | 'good' }[] = [];
  let score = 0;

  if (!password) {
    return { level: PasswordStrengthLevel.TooWeak, feedback: [] };
  }

  // Check against common password list
  if (VERY_COMMON_PASSWORDS.has(password.toLowerCase())) {
    feedback.push({ message: "This is a very common and weak password.", type: 'error' });
    return { level: PasswordStrengthLevel.TooWeak, feedback };
  }

  // Length check
  if (password.length < 8) {
    feedback.push({ message: "Should be at least 8 characters long.", type: 'error' });
  } else {
    score += 1;
    feedback.push({ message: "Good. At least 8 characters long.", type: 'good' });
  }

  // Character variety checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
  
  if (varietyCount >= 3) {
    score += 1;
     feedback.push({ message: "Excellent. Mix of character types.", type: 'good' });
  } else {
    feedback.push({ message: "Good. Now add other character types.", type: 'suggestion' });
  }
  
  // Additional score for very long passwords
  if (password.length >= 12) {
    score += 1;
  }
   if (password.length >= 16) {
    score += 1;
  }
  
  score += varietyCount;

  // Determine level based on score
  let level: PasswordStrengthLevel;
  if (score < 3) level = PasswordStrengthLevel.TooWeak;
  else if (score < 5) level = PasswordStrengthLevel.Weak;
  else if (score < 7) level = PasswordStrengthLevel.Medium;
  else if (score < 9) level = PasswordStrengthLevel.Strong;
  else level = PasswordStrengthLevel.VeryStrong;
  
  // Don't show "good" messages for weak passwords
  if (level <= PasswordStrengthLevel.Weak) {
      return { level, feedback: feedback.filter(f => f.type !== 'good') };
  }
  
  return { level, feedback };
};