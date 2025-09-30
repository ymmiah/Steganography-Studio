
import {
  CRYPTO_SALT_NUM_BYTES,
  CRYPTO_IV_NUM_BYTES,
  CRYPTO_PBKDF2_ITERATIONS,
  CRYPTO_AES_KEY_LENGTH_BITS,
  CRYPTO_HASH_ALGORITHM,
  CRYPTO_ALGORITHM_NAME,
  CRYPTO_PAYLOAD_DELIMITER
} from '../constants.ts';
import { arrayBufferToBase64, base64ToArrayBuffer, stringToArrayBuffer, arrayBufferToString } from '../utils.ts';

// Derive a key from a password and salt using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = stringToArrayBuffer(password);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: CRYPTO_PBKDF2_ITERATIONS,
      hash: CRYPTO_HASH_ALGORITHM,
    },
    importedKey,
    { name: CRYPTO_ALGORITHM_NAME, length: CRYPTO_AES_KEY_LENGTH_BITS },
    true, // exportable, set to false if not needed
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message using AES-GCM
export async function encryptMessage(message: string, password: string): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_SALT_NUM_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_IV_NUM_BYTES));
    
    const key = await deriveKey(password, salt);
    const messageBuffer = stringToArrayBuffer(message);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: CRYPTO_ALGORITHM_NAME,
        iv: iv,
      },
      key,
      messageBuffer
    );

    // Combine salt, IV, and ciphertext into a single string
    // Format: base64(salt):base64(iv):base64(ciphertext)
    return `${arrayBufferToBase64(salt)}${CRYPTO_PAYLOAD_DELIMITER}${arrayBufferToBase64(iv)}${CRYPTO_PAYLOAD_DELIMITER}${arrayBufferToBase64(ciphertextBuffer)}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed. Please check console for details.');
  }
}

// Decrypt a message using AES-GCM
export async function decryptMessage(encryptedPayload: string, password: string): Promise<string> {
  try {
    const parts = encryptedPayload.split(CRYPTO_PAYLOAD_DELIMITER);
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format. Expected salt:iv:ciphertext.');
    }

    const salt = base64ToArrayBuffer(parts[0]);
    const iv = base64ToArrayBuffer(parts[1]);
    const ciphertext = base64ToArrayBuffer(parts[2]);

    // Ensure salt and IV are Uint8Array for deriveKey
    const key = await deriveKey(password, new Uint8Array(salt));
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: CRYPTO_ALGORITHM_NAME,
        iv: new Uint8Array(iv), // Ensure IV is Uint8Array
      },
      key,
      ciphertext
    );

    return arrayBufferToString(decryptedBuffer);
  } catch (error: any) {
    console.error('Decryption error:', error);
    if (error.name === 'OperationError' || (error.message && error.message.toLowerCase().includes('decryption failed'))) {
        throw new Error('Decryption failed. This usually means an incorrect password or corrupted data.');
    }
    throw new Error(error.message || 'Decryption failed. Please check console for details.');
  }
}