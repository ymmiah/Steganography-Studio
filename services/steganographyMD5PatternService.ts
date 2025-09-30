
import { MESSAGE_TERMINATOR_BINARY, MAX_MESSAGE_LENGTH_CHARS } from '../constants.ts';
import { textToBinary, binaryToText, loadImageToCanvas, md5KeyToSeed, seededShuffle } from '../utils.ts';
import { encryptMessage as cryptoEncrypt, decryptMessage as cryptoDecrypt } from './cryptoService.ts';

export const encodeMessageMD5Pattern = async (file: File, message: string, stegoKey: string, password: string): Promise<{ dataUrl: string; encryptedPayload: string; }> => {
  if (!file) throw new Error('No image file provided.');
  if (!message) throw new Error('No message provided.');
  if (!stegoKey) throw new Error('No Stego Key provided. This key is required for MD5 Pattern LSB.');
  if (!password) throw new Error('No Password provided. This is required for encryption.');
  if (message.length > MAX_MESSAGE_LENGTH_CHARS) {
    throw new Error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH_CHARS} characters allowed.`);
  }

  // 1. Encrypt the message
  const encryptedPayload = await cryptoEncrypt(message, password);
  // 2. Convert encrypted payload to binary
  const binaryEncryptedMessage = textToBinary(encryptedPayload) + MESSAGE_TERMINATOR_BINARY;
  
  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const numPixels = canvas.width * canvas.height;
  const maxBitsStorable = numPixels * 3;

  if (binaryEncryptedMessage.length > maxBitsStorable) {
    throw new Error('Encrypted message is too long to be hidden in this image using MD5 Pattern LSB. Try a larger image or shorter original message.');
  }

  // Generate pixel access pattern using MD5 hash of the key
  let pixelIndices = Array.from({ length: numPixels }, (_, i) => i);
  const seed = md5KeyToSeed(stegoKey);
  pixelIndices = seededShuffle(pixelIndices, seed);

  let bitIndex = 0; 
  let pixelSequenceIndex = 0;

  while (bitIndex < binaryEncryptedMessage.length && pixelSequenceIndex < numPixels) {
    const currentPixelOrderIndex = pixelIndices[pixelSequenceIndex];
    const dataStartIndexForPixel = currentPixelOrderIndex * 4;

    for (let channel = 0; channel < 3; channel++) {
      if (bitIndex >= binaryEncryptedMessage.length) break;
      const bit = parseInt(binaryEncryptedMessage[bitIndex]);
      const channelDataIndex = dataStartIndexForPixel + channel;
      data[channelDataIndex] = (data[channelDataIndex] & 0xFE) | bit;
      bitIndex++;
    }
    pixelSequenceIndex++;
  }
  
  if (bitIndex < binaryEncryptedMessage.length) {
    throw new Error("MD5 Pattern LSB: Image data exhausted (based on shuffled sequence) before encrypted message fully encoded.");
  }

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, encryptedPayload };
};


export const decodeMessageMD5Pattern = async (file: File, stegoKey: string, password: string): Promise<string> => {
  if (!file) throw new Error('No image file provided.');
  if (!stegoKey) throw new Error('No Stego Key provided. This key is required for MD5 Pattern LSB decoding.');
  if (!password) throw new Error('No Password provided. This is required for decryption.');

  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const numPixels = canvas.width * canvas.height;
  const maxBitsToRead = numPixels * 3;

  // Re-generate the exact same pixel access pattern
  let pixelIndices = Array.from({ length: numPixels }, (_, i) => i);
  const seed = md5KeyToSeed(stegoKey);
  pixelIndices = seededShuffle(pixelIndices, seed);
  
  let binaryEncryptedPayload = '';
  let bitsReadCount = 0;
  let pixelSequenceIndex = 0;

  while (bitsReadCount < maxBitsToRead && pixelSequenceIndex < numPixels) {
    const currentPixelOrderIndex = pixelIndices[pixelSequenceIndex];
    const dataStartIndexForPixel = currentPixelOrderIndex * 4;

    for (let channel = 0; channel < 3; channel++) {
      if (bitsReadCount >= maxBitsToRead) break;
      
      const channelDataIndex = dataStartIndexForPixel + channel;
      const lsb = data[channelDataIndex] & 1;
      binaryEncryptedPayload += lsb.toString();
      bitsReadCount++;

      if (binaryEncryptedPayload.length >= MESSAGE_TERMINATOR_BINARY.length && binaryEncryptedPayload.endsWith(MESSAGE_TERMINATOR_BINARY)) {
        const encryptedPayloadPart = binaryEncryptedPayload.substring(0, binaryEncryptedPayload.length - MESSAGE_TERMINATOR_BINARY.length);
         if (encryptedPayloadPart.length === 0) {
            throw new Error('MD5 Pattern LSB: No encrypted content found. Only the message terminator sequence was detected.');
        }
        const encryptedPayloadString = binaryToText(encryptedPayloadPart);
        if (!encryptedPayloadString && encryptedPayloadPart.length > 0) {
             throw new Error('MD5 Pattern LSB: Failed to convert extracted binary data to text for decryption.');
        }
        return cryptoDecrypt(encryptedPayloadString, password);
      }
    }
    if (bitsReadCount >= maxBitsToRead) break;
    pixelSequenceIndex++;
  }
  
  if (maxBitsToRead < MESSAGE_TERMINATOR_BINARY.length) {
    throw new Error(
      `MD5 Pattern LSB: Not enough data in the image to contain a complete encrypted message. ` +
      `The image offers ${maxBitsToRead} LSBs, but the terminator requires ${MESSAGE_TERMINATOR_BINARY.length} bits.`
    );
  }
  
  throw new Error(
    `MD5 Pattern LSB: No hidden encrypted message found. Expected terminator not detected using key-derived pattern. ` +
    'Ensure Stego Key and Password are correct, image is MD5 Pattern LSB encoded, or data not corrupted.'
  );
};