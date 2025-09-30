
import { encryptMessage as cryptoEncrypt, decryptMessage as cryptoDecrypt } from './cryptoService.ts';
import { 
  arrayBufferToHex, 
  hexToArrayBuffer, 
  stringToArrayBuffer, 
  arrayBufferToString, 
  MORSE_CODE_MAP,
  REVERSE_MORSE_CODE_MAP,
  loadImageToCanvas
} from '../utils.ts';
import { MAX_MESSAGE_LENGTH_CHARS } from '../constants.ts';

// Visual parameters for grid-based Morse code
const UNIT_SIZE = 4; // pixels for one grid unit
const DAH_UNITS = 3;
const ELEM_GAP_UNITS = 1;
const CHAR_GAP_UNITS = 3;
const UNITS_PER_ROW = 100; // Number of grid units per visual row
const BACKGROUND_COLOR = '#F0F0F0';
const FOREGROUND_COLOR = '#000000';
const LINE_SPACING = UNIT_SIZE * 2;


export const encodeMorseMessage = async (message: string, password: string): Promise<{ dataUrl: string, hexString: string, encryptedPayload: string }> => {
  if (!message) throw new Error('No message provided.');
  if (!password) throw new Error('Password is required for Morse encoding.');
  if (message.length > MAX_MESSAGE_LENGTH_CHARS) {
    throw new Error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH_CHARS} characters allowed.`);
  }

  // 1. Encrypt message -> base64 string
  const encryptedPayload = await cryptoEncrypt(message, password);
  // 2. Convert base64 string to ArrayBuffer, then to hex string
  const hexString = arrayBufferToHex(stringToArrayBuffer(encryptedPayload));

  // 3. Convert hex string to a sequence of visual elements
  const visualElements: ('dit' | 'dah' | 'elem_gap' | 'char_gap')[] = [];
  for (let i = 0; i < hexString.length; i++) {
    const char = hexString[i].toLowerCase();
    const morse = MORSE_CODE_MAP[char];
    if (!morse) continue; // Should not happen for hex

    for (let j = 0; j < morse.length; j++) {
      visualElements.push(morse[j] === '.' ? 'dit' : 'dah');
      if (j < morse.length - 1) {
        visualElements.push('elem_gap');
      }
    }
    if (i < hexString.length - 1) {
      visualElements.push('char_gap');
    }
  }

  // 4. Calculate total units and canvas size
  let totalUnits = 0;
  visualElements.forEach(el => {
    if (el === 'dit') totalUnits += 1;
    else if (el === 'dah') totalUnits += DAH_UNITS;
    else if (el === 'elem_gap') totalUnits += ELEM_GAP_UNITS;
    else if (el === 'char_gap') totalUnits += CHAR_GAP_UNITS;
  });

  const numRows = Math.ceil(totalUnits / UNITS_PER_ROW);
  const canvasWidth = UNITS_PER_ROW * UNIT_SIZE;
  const canvasHeight = numRows * UNIT_SIZE + Math.max(0, numRows - 1) * LINE_SPACING;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for Morse encoding.');

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // 5. Draw the elements
  let currentX = 0;
  let currentY = 0;
  ctx.fillStyle = FOREGROUND_COLOR;

  visualElements.forEach(el => {
    let units = 0;
    let isSymbol = false;
    if (el === 'dit') { units = 1; isSymbol = true; }
    else if (el === 'dah') { units = DAH_UNITS; isSymbol = true; }
    else if (el === 'elem_gap') { units = ELEM_GAP_UNITS; }
    else if (el === 'char_gap') { units = CHAR_GAP_UNITS; }

    if (currentX + (units * UNIT_SIZE) > canvasWidth) {
      currentX = 0;
      currentY += UNIT_SIZE + LINE_SPACING;
    }

    if (isSymbol) {
      ctx.fillRect(currentX, currentY, units * UNIT_SIZE, UNIT_SIZE);
    }
    currentX += units * UNIT_SIZE;
  });

  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, hexString, encryptedPayload };
};

export const decodeMorseMessage = async (file: File, password: string): Promise<string> => {
  if (!file) throw new Error('No image file provided for Morse decoding.');
  if (!password) throw new Error('Password is required for Morse decoding.');

  const { canvas, ctx } = await loadImageToCanvas(file);

  // 1. Scan the canvas grid to reconstruct the black/white unit sequence
  const unitSequence: ('B' | 'W')[] = [];
  for (let y = 0; y < canvas.height; y += UNIT_SIZE + LINE_SPACING) {
    for (let x = 0; x < canvas.width; x += UNIT_SIZE) {
      const pixel = ctx.getImageData(x + UNIT_SIZE / 2, y + UNIT_SIZE / 2, 1, 1).data;
      const intensity = (pixel[0] + pixel[1] + pixel[2]) / 3;
      unitSequence.push(intensity < 128 ? 'B' : 'W');
    }
  }

  // 2. Parse the unit sequence into a Morse string
  let morseString = '';
  let i = 0;
  while (i < unitSequence.length) {
    if (unitSequence[i] === 'W') {
      i++;
      continue;
    }
    
    // We found the start of a symbol or gap sequence
    let blackCount = 0;
    while(i < unitSequence.length && unitSequence[i] === 'B') {
      blackCount++;
      i++;
    }

    if (blackCount === DAH_UNITS) morseString += '-';
    else if (blackCount === 1) morseString += '.';
    else if (blackCount > 0) throw new Error('Morse Decode: Detected invalid symbol shape.');

    let whiteCount = 0;
    while(i < unitSequence.length && unitSequence[i] === 'W') {
      whiteCount++;
      i++;
    }

    if (whiteCount >= CHAR_GAP_UNITS) {
        morseString += ' '; // Character separator
    } else if (whiteCount > 0 && whiteCount < CHAR_GAP_UNITS) {
        // Element gap, do nothing
    }
  }
  
  // 3. Convert Morse string to hex string
  const morseChars = morseString.trim().split(' ');
  let hexString = '';
  for(const morseChar of morseChars) {
    const hexChar = REVERSE_MORSE_CODE_MAP[morseChar];
    if (hexChar) {
      hexString += hexChar;
    } else if (morseChar.length > 0) {
      throw new Error(`Morse Decode: Could not find hex equivalent for Morse sequence "${morseChar}".`);
    }
  }
  
  if (!hexString) {
      throw new Error('Morse Decode: Failed to reconstruct hex string from Morse image. The image may be invalid or corrupted.');
  }

  return decryptMorseMessageFromHex(hexString, password);
};


export const decryptMorseMessageFromHex = async (hexString: string, password: string): Promise<string> => {
  if (!hexString) throw new Error("No hex string provided for decryption.");
  if (!password) throw new Error("Password is required for decryption.");
  
  try {
    const encryptedPayloadBuffer = hexToArrayBuffer(hexString);
    const encryptedPayload = arrayBufferToString(encryptedPayloadBuffer);
    return await cryptoDecrypt(encryptedPayload, password);
  } catch (e: any) {
    throw new Error(`Decryption from hex string failed. Original error: ${e.message}`);
  }
};