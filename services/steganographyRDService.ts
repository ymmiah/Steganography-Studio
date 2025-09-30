
import { MESSAGE_TERMINATOR_BINARY, MAX_MESSAGE_LENGTH_CHARS } from '../constants.ts';
import { textToBinary, binaryToText, loadImageToCanvas } from '../utils.ts';
import { encryptMessage as cryptoEncrypt, decryptMessage as cryptoDecrypt } from './cryptoService.ts';

const DOT_SIZE = 5; // pixels
const DOT_SPACING = 2; // pixels between dots
const DOTS_PER_ROW = 48; // Number of dots per row in the grid
const COLOR_BIT_1 = { r: 0, g: 0, b: 0 }; // Black
const COLOR_BIT_0 = { r: 255, g: 255, b: 255 }; // White
const BACKGROUND_COLOR = '#E0E0E0'; // Light gray for canvas background

export const encodeRDMessage = async (message: string, password: string): Promise<{imageDataUrl: string, binaryEncryptedPayloadWithTerminator: string, encryptedPayload: string}> => {
  if (!message) throw new Error('No message provided.');
  if (!password) throw new Error('Password is required for RD encoding.');
  if (message.length > MAX_MESSAGE_LENGTH_CHARS) {
    throw new Error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH_CHARS} characters allowed for RD encoding.`);
  }

  // 1. Encrypt the message
  const encryptedPayload = await cryptoEncrypt(message, password);
  // 2. Convert encrypted payload string to binary for RD pattern
  const binaryEncryptedPayloadWithTerminator = textToBinary(encryptedPayload) + MESSAGE_TERMINATOR_BINARY;
  
  const numDots = binaryEncryptedPayloadWithTerminator.length;
  const numRows = Math.ceil(numDots / DOTS_PER_ROW);
  
  const canvasWidth = DOTS_PER_ROW * (DOT_SIZE + DOT_SPACING) + DOT_SPACING;
  const canvasHeight = numRows * (DOT_SIZE + DOT_SPACING) + DOT_SPACING;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context for RD encoding.');
  }

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  for (let i = 0; i < numDots; i++) {
    const bit = binaryEncryptedPayloadWithTerminator[i];
    const row = Math.floor(i / DOTS_PER_ROW);
    const col = i % DOTS_PER_ROW;

    const x = DOT_SPACING + col * (DOT_SIZE + DOT_SPACING);
    const y = DOT_SPACING + row * (DOT_SIZE + DOT_SPACING);

    const color = (bit === '1') ? COLOR_BIT_1 : COLOR_BIT_0;
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(x, y, DOT_SIZE, DOT_SIZE);
  }

  const imageDataUrl = canvas.toDataURL('image/png');
  return {imageDataUrl, binaryEncryptedPayloadWithTerminator, encryptedPayload};
};

export const decodeRDMessage = async (file: File, password: string): Promise<string> => {
  if (!file) throw new Error('No image file provided for RD decoding.');
  if (!password) throw new Error('Password is required for RD decoding.');

  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let binaryEncryptedPayload = '';
  const numRows = Math.floor((canvas.height - DOT_SPACING) / (DOT_SIZE + DOT_SPACING));
  const numCols = Math.floor((canvas.width - DOT_SPACING) / (DOT_SIZE + DOT_SPACING));

  if (numRows === 0 || numCols === 0) {
    throw new Error('Uploaded image is too small or not in the expected RD format.');
  }

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const dotCenterX = DOT_SPACING + col * (DOT_SIZE + DOT_SPACING) + Math.floor(DOT_SIZE / 2);
      const dotCenterY = DOT_SPACING + row * (DOT_SIZE + DOT_SPACING) + Math.floor(DOT_SIZE / 2);

      if (dotCenterX >= canvas.width || dotCenterY >= canvas.height) continue;

      const pixelIndex = (dotCenterY * canvas.width + dotCenterX) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      
      const intensity = (r + g + b) / 3;
      binaryEncryptedPayload += (intensity < 128) ? '1' : '0';
    }
  }
  
  const terminatorIndex = binaryEncryptedPayload.indexOf(MESSAGE_TERMINATOR_BINARY);

  if (terminatorIndex === -1) {
    throw new Error('RD Decode (Image): Message terminator not found. The image might not be a valid RD encoded image or data is corrupted.');
  }

  const encryptedPayloadPartBinary = binaryEncryptedPayload.substring(0, terminatorIndex);
  if (encryptedPayloadPartBinary.length === 0) {
    throw new Error('RD Decode (Image): No encrypted content found before terminator.');
  }
  
  const encryptedPayloadString = binaryToText(encryptedPayloadPartBinary);
   if (!encryptedPayloadString && encryptedPayloadPartBinary.length > 0) {
    throw new Error('RD Decode (Image): Failed to convert binary dot data to text for decryption. Data might be corrupted.');
  }

  return cryptoDecrypt(encryptedPayloadString, password);
};

export const decryptRDMessageFromBinary = async (binaryStringWithTerminator: string, password: string): Promise<string> => {
  if (!binaryStringWithTerminator) throw new Error('No binary string provided for RD decoding.');
  if (!password) throw new Error('Password is required for RD binary decoding.');

  const terminatorIndex = binaryStringWithTerminator.indexOf(MESSAGE_TERMINATOR_BINARY);
  if (terminatorIndex === -1) {
    throw new Error('RD Decode (Binary): Message terminator not found in the provided binary string. Ensure it is the full binary output from encoding.');
  }

  const binaryEncryptedPayload = binaryStringWithTerminator.substring(0, terminatorIndex);
  if (binaryEncryptedPayload.length === 0) {
    throw new Error('RD Decode (Binary): No encrypted content found before terminator in the binary string.');
  }

  const encryptedPayloadString = binaryToText(binaryEncryptedPayload);
  if (!encryptedPayloadString && binaryEncryptedPayload.length > 0) {
    // Check if binaryEncryptedPayload is valid binary before throwing conversion error
    if (!/^[01]+$/.test(binaryEncryptedPayload)) {
        throw new Error('RD Decode (Binary): Input contains non-binary characters.');
    }
    if (binaryEncryptedPayload.length % 8 !== 0) {
        throw new Error('RD Decode (Binary): Binary encrypted payload is not a valid multiple of 8 bits. Data might be incomplete or corrupted.');
    }
    // If it was valid binary but binaryToText failed (e.g. perhaps it was an empty result for some reason)
    throw new Error('RD Decode (Binary): Failed to convert binary string to text for decryption. Data might be corrupted or format invalid.');
  }


  return cryptoDecrypt(encryptedPayloadString, password);
};