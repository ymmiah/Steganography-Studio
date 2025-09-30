
import { MESSAGE_TERMINATOR_BINARY, MAX_MESSAGE_LENGTH_CHARS } from '../constants.ts';
import { textToBinary, binaryToText, loadImageToCanvas } from '../utils.ts';
import { encryptMessage as cryptoEncrypt, decryptMessage as cryptoDecrypt } from './cryptoService.ts';


export const encodeMessage = async (file: File, message: string, password: string): Promise<{ dataUrl: string; encryptedPayload: string; }> => {
  if (!file) throw new Error('No image file provided.');
  if (!message) throw new Error('No message provided.');
  if (!password) throw new Error('Password is required for LSB encoding.');
  if (message.length > MAX_MESSAGE_LENGTH_CHARS) {
    throw new Error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH_CHARS} characters allowed.`);
  }

  // 1. Encrypt the message
  const encryptedPayload = await cryptoEncrypt(message, password);
  // 2. Convert encrypted payload (likely base64 string) to binary for LSB encoding
  const binaryMessage = textToBinary(encryptedPayload) + MESSAGE_TERMINATOR_BINARY;
  
  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const maxBitsStorable = Math.floor(data.length / 4) * 3; 
  if (binaryMessage.length > maxBitsStorable) {
    throw new Error('Encrypted message is too long to be hidden in this image. Try a larger image or shorter original message (encryption adds overhead).');
  }

  let dataIndex = 0;
  for (let i = 0; i < binaryMessage.length; i++) {
    const bit = parseInt(binaryMessage[i]);
    const channelIndex = i % 3; 
    data[dataIndex + channelIndex] = (data[dataIndex + channelIndex] & 0xFE) | bit;
    if (channelIndex === 2) { 
      dataIndex += 4; 
    }
    if (dataIndex >= data.length && i < binaryMessage.length -1) {
        throw new Error("Image data exhausted before encrypted message fully encoded.");
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, encryptedPayload };
};


export const decodeMessage = async (file: File, password: string): Promise<string> => {
  if (!file) throw new Error('No image file provided.');
  if (!password) throw new Error('Password is required for LSB decoding.');

  const { ctx, canvas } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let binaryEncryptedPayload = '';
  let bitCount = 0;
  const maxBitsToRead = Math.floor(data.length / 4) * 3;

  for (let i = 0; i < data.length; i += 4) { 
    for (let j = 0; j < 3; j++) { 
      if (bitCount >= maxBitsToRead) break; 

      const pixelDataIndex = i + j;
      const lsb = data[pixelDataIndex] & 1; 
      binaryEncryptedPayload += lsb.toString();
      bitCount++;

      if (binaryEncryptedPayload.length >= MESSAGE_TERMINATOR_BINARY.length && binaryEncryptedPayload.endsWith(MESSAGE_TERMINATOR_BINARY)) {
        const encryptedPayloadPart = binaryEncryptedPayload.substring(0, binaryEncryptedPayload.length - MESSAGE_TERMINATOR_BINARY.length);
        
        if (encryptedPayloadPart.length === 0) {
             throw new Error('LSB Decode: No encrypted content found. Only the message terminator sequence was detected.');
        }
        // Convert the binary encrypted payload back to its string form (e.g. base64)
        const encryptedPayloadString = binaryToText(encryptedPayloadPart);
        if (!encryptedPayloadString && encryptedPayloadPart.length > 0) {
            throw new Error('LSB Decode: Failed to convert extracted binary data to text for decryption. Data might be corrupted.');
        }
        // Decrypt the string
        return cryptoDecrypt(encryptedPayloadString, password);
      }
    }
    if (bitCount >= maxBitsToRead) break;
  }
  
  if (maxBitsToRead < MESSAGE_TERMINATOR_BINARY.length) {
    throw new Error(
      `LSB Decode: Not enough data in the image to contain a complete encrypted message. ` +
      `The image offers ${maxBitsToRead} LSBs, but the terminator alone requires ${MESSAGE_TERMINATOR_BINARY.length} bits.`
    );
  }
  
  throw new Error(
    `LSB Decode: No hidden encrypted message found. The expected terminator sequence was not detected after scanning all ${maxBitsToRead} available LSBs. ` +
    'The image might not be LSB encoded, password might be wrong (leading to different encrypted payload structure), or data could be corrupted.'
  );
};

// Encodes a raw payload string (e.g., already encrypted data) into an image using LSB.
// This function does NOT perform encryption; it assumes 'payload' is ready for binary conversion.
export const lsbEncodeRawPayload = async (file: File, payload: string): Promise<string> => {
  if (!file) throw new Error('No image file provided for LSB raw payload encoding.');
  if (!payload) throw new Error('No payload provided for LSB raw payload encoding.');

  const binaryMessage = textToBinary(payload) + MESSAGE_TERMINATOR_BINARY;
  
  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const maxBitsStorable = Math.floor(data.length / 4) * 3; 
  if (binaryMessage.length > maxBitsStorable) {
    throw new Error('Payload is too long to be hidden in this image using LSB. (Payload might be an encrypted string, which adds overhead).');
  }

  let dataIndex = 0;
  for (let i = 0; i < binaryMessage.length; i++) {
    const bit = parseInt(binaryMessage[i]);
    const channelIndex = i % 3; 
    data[dataIndex + channelIndex] = (data[dataIndex + channelIndex] & 0xFE) | bit;
    if (channelIndex === 2) { 
      dataIndex += 4; 
    }
    if (dataIndex >= data.length && i < binaryMessage.length -1) {
        throw new Error("Image data exhausted before payload fully LSB-encoded.");
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

// Decodes LSB data from an image and returns the raw (still encrypted) payload string.
// Does NOT perform decryption.
export const lsbDecodeRawPayload = async (file: File): Promise<string> => {
  if (!file) throw new Error('No image file provided for LSB raw payload decoding.');

  const { ctx, canvas } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let binaryEncryptedPayload = '';
  let bitCount = 0;
  const maxBitsToRead = Math.floor(data.length / 4) * 3;

  for (let i = 0; i < data.length; i += 4) { 
    for (let j = 0; j < 3; j++) { 
      if (bitCount >= maxBitsToRead) break; 

      const pixelDataIndex = i + j;
      const lsb = data[pixelDataIndex] & 1; 
      binaryEncryptedPayload += lsb.toString();
      bitCount++;

      if (binaryEncryptedPayload.length >= MESSAGE_TERMINATOR_BINARY.length && binaryEncryptedPayload.endsWith(MESSAGE_TERMINATOR_BINARY)) {
        const encryptedPayloadPart = binaryEncryptedPayload.substring(0, binaryEncryptedPayload.length - MESSAGE_TERMINATOR_BINARY.length);
        
        if (encryptedPayloadPart.length === 0) {
             throw new Error('LSB Decode Raw: No content found before terminator. Only the message terminator sequence was detected.');
        }
        const payloadString = binaryToText(encryptedPayloadPart);
        if (!payloadString && encryptedPayloadPart.length > 0) { // Check if binaryToText returned empty for non-empty binary
            throw new Error('LSB Decode Raw: Failed to convert extracted binary data to text. Data might be corrupted or not valid text after binary conversion.');
        }
        return payloadString; // Return raw payload string
      }
    }
    if (bitCount >= maxBitsToRead) break;
  }
  
  if (maxBitsToRead < MESSAGE_TERMINATOR_BINARY.length) {
    throw new Error(
      `LSB Decode Raw: Not enough data in the image to contain a complete message. ` +
      `The image offers ${maxBitsToRead} LSBs, but the terminator alone requires ${MESSAGE_TERMINATOR_BINARY.length} bits.`
    );
  }
  
  throw new Error(
    `LSB Decode Raw: No hidden message found. The expected terminator sequence was not detected after scanning all ${maxBitsToRead} available LSBs. ` +
    'The image might not be LSB encoded with a terminator, or data could be corrupted.'
  );
};