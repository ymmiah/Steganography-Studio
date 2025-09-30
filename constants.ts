
// 5 null bytes (00000000) repeated 5 times.
// This sequence is used to mark the end of the hidden message.
export const MESSAGE_TERMINATOR_BINARY = "00000000".repeat(5);

// Maximum characters allowed for the secret message to prevent browser freezing with very long messages.
// This is a practical limit, actual limit depends on image size.
export const MAX_MESSAGE_LENGTH_CHARS = 5000;

// Cryptographic constants
export const CRYPTO_SALT_NUM_BYTES = 16; // Size of the salt in bytes
export const CRYPTO_IV_NUM_BYTES = 12; // Size of the Initialization Vector in bytes for AES-GCM
export const CRYPTO_PBKDF2_ITERATIONS = 100000; // Number of iterations for PBKDF2
export const CRYPTO_AES_KEY_LENGTH_BITS = 256; // AES key length in bits (e.g., 128, 192, 256)
export const CRYPTO_HASH_ALGORITHM = 'SHA-256'; // Hash algorithm for PBKDF2
export const CRYPTO_ALGORITHM_NAME = 'AES-GCM'; // AES mode
export const CRYPTO_PAYLOAD_DELIMITER = ':'; // Delimiter for salt:iv:ciphertext in the payload string