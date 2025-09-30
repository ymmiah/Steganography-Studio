
import React, { useState, useCallback } from 'react';
import FileUploader from './ImageUploader.tsx';
import ImagePreview from './ImagePreview.tsx';
import TextOutput from './TextOutput.tsx';
import PasswordStrengthMeter from './PasswordStrengthMeter.tsx';
import InputModeToggle from './InputModeToggle.tsx';
import { 
    LockKeyhole, KeyRound, Download, CheckCircle, Shuffle, Fingerprint, Palette, Eye, AudioWaveform, 
    Binary, FileText, Image as ImageIcon, Type, EyeOff
} from 'lucide-react';
import { MAX_MESSAGE_LENGTH_CHARS } from '../constants.ts';
import { HubMode, Action, SteganographyMode as StegoModeEnum } from '../types.ts';
import { calculatePasswordStrength } from '../utils.ts';
import * as LsbService from '../services/steganographyService.ts';
import * as PatternLsbService from '../services/steganographyPatternLSBService.ts';
import * as Md5PatternService from '../services/steganographyMD5PatternService.ts';
import * as RdService from '../services/steganographyRDService.ts';
import * as MorseService from '../services/steganographyMorseService.ts';
import * as CryptoService from '../services/cryptoService.ts';
import type { SetLoadingFunction, SetErrorFunction, SetSuccessMessageFunction, PasswordStrengthResult } from '../types.ts';

interface SteganographyModeProps {
  mode: StegoModeEnum;
  isLoading: boolean;
  setLoading: SetLoadingFunction;
  setError: SetErrorFunction;
  setSuccessMessage: SetSuccessMessageFunction;
}

type DecodeInputType = 'image' | 'text' | 'binary' | 'hex';

const SteganographyMode: React.FC<SteganographyModeProps> = ({ mode, isLoading, setLoading, setError, setSuccessMessage }) => {
  const [action, setAction] = useState<Action>('encrypt');
  
  // Inputs
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [secretMessage, setSecretMessage] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [stegoKey, setStegoKey] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [textPayload, setTextPayload] = useState('');
  const [intermediatePayload, setIntermediatePayload] = useState(''); // For RD Binary / Morse Hex
  const [decodeInputType, setDecodeInputType] = useState<DecodeInputType>('image');

  // Outputs
  const [encodedDataUrl, setEncodedDataUrl] = useState<string | null>(null);
  const [finalEncryptedPayload, setFinalEncryptedPayload] = useState<string | null>(null);
  const [finalIntermediatePayload, setFinalIntermediatePayload] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setImageFile(null);
    setSecretMessage('');
    setPassword('');
    setStegoKey('');
    setPasswordStrength(null);
    setTextPayload('');
    setIntermediatePayload('');
    setEncodedDataUrl(null);
    setFinalEncryptedPayload(null);
    setFinalIntermediatePayload(null);
    setDecryptedMessage(null);
    setError(null);
    setSuccessMessage(null);
  }, [setError, setSuccessMessage]);

  // Reset state when mode or action changes
  React.useEffect(() => {
    resetState();
    setDecodeInputType('image'); // Reset decode input type when mode changes
  }, [mode, action, resetState]);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };
  
  const characterCount = secretMessage.length;
  const isMessageTooLong = characterCount > MAX_MESSAGE_LENGTH_CHARS;

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEncodedDataUrl(null);
    setFinalEncryptedPayload(null);
    setFinalIntermediatePayload(null);
    setDecryptedMessage(null);

    try {
        if (action === 'encrypt') {
            await handleEncrypt();
        } else {
            await handleDecrypt();
        }
    } catch (e: any) {
        console.error(`Error during ${mode} ${action}:`, e);
        setError(e.message || 'An unexpected error occurred.');
    } finally {
        setLoading(false);
    }
  };

  const handleEncrypt = async () => {
    if(!secretMessage || !password) throw new Error('Secret message and password are required.');
    
    let result;
    switch(mode) {
        case HubMode.LSB:
            if(!imageFile) throw new Error("Please upload a cover image.");
            result = await LsbService.encodeMessage(imageFile, secretMessage, password);
            setEncodedDataUrl(result.dataUrl);
            setFinalEncryptedPayload(result.encryptedPayload);
            break;
        case HubMode.PatternLSB:
             if(!imageFile || !stegoKey) throw new Error("Please upload a cover image and provide a Stego Key.");
             result = await PatternLsbService.encodeMessagePatternLSB(imageFile, secretMessage, stegoKey, password);
             setEncodedDataUrl(result.dataUrl);
             setFinalEncryptedPayload(result.encryptedPayload);
             break;
        case HubMode.MD5Pattern:
             if(!imageFile || !stegoKey) throw new Error("Please upload a cover image and provide a Stego Key.");
             result = await Md5PatternService.encodeMessageMD5Pattern(imageFile, secretMessage, stegoKey, password);
             setEncodedDataUrl(result.dataUrl);
             setFinalEncryptedPayload(result.encryptedPayload);
             break;
        case HubMode.RD:
             result = await RdService.encodeRDMessage(secretMessage, password);
             setEncodedDataUrl(result.imageDataUrl);
             setFinalIntermediatePayload(result.binaryEncryptedPayloadWithTerminator);
             setFinalEncryptedPayload(result.encryptedPayload);
             break;
        case HubMode.Morse:
            result = await MorseService.encodeMorseMessage(secretMessage, password);
            setEncodedDataUrl(result.dataUrl);
            setFinalIntermediatePayload(result.hexString);
            setFinalEncryptedPayload(result.encryptedPayload);
            break;
    }
    setSuccessMessage("Encryption and encoding successful!");
  };

  const handleDecrypt = async () => {
    if(!password) throw new Error("Password is required for decryption.");
    
    let message;
    if (decodeInputType === 'text') {
        if(!textPayload) throw new Error('Please provide the encrypted text payload.');
        message = await CryptoService.decryptMessage(textPayload, password);
    } else if (decodeInputType === 'binary' && mode === HubMode.RD) {
        if(!intermediatePayload) throw new Error('Please provide the intermediate binary payload.');
        message = await RdService.decryptRDMessageFromBinary(intermediatePayload, password);
    } else if (decodeInputType === 'hex' && mode === HubMode.Morse) {
        if(!intermediatePayload) throw new Error('Please provide the intermediate hex payload.');
        message = await MorseService.decryptMorseMessageFromHex(intermediatePayload, password);
    } else { // 'image'
        if(!imageFile) throw new Error('Please upload an image file.');
        switch(mode) {
            case HubMode.LSB:
                message = await LsbService.decodeMessage(imageFile, password);
                break;
            case HubMode.PatternLSB:
                if(!stegoKey) throw new Error("Stego Key is required for image decoding.");
                message = await PatternLsbService.decodeMessagePatternLSB(imageFile, stegoKey, password);
                break;
            case HubMode.MD5Pattern:
                if(!stegoKey) throw new Error("Stego Key is required for image decoding.");
                message = await Md5PatternService.decodeMessageMD5Pattern(imageFile, stegoKey, password);
                break;
            case HubMode.RD:
                message = await RdService.decodeRDMessage(imageFile, password);
                break;
            case HubMode.Morse:
                message = await MorseService.decodeMorseMessage(imageFile, password);
                break;
        }
    }
    setDecryptedMessage(message);
    setSuccessMessage("Decryption successful!");
  };

  const needsStegoKey = [HubMode.PatternLSB, HubMode.MD5Pattern].includes(mode);
  const isImageBased = [HubMode.LSB, HubMode.PatternLSB, HubMode.MD5Pattern].includes(mode);
  const isGeneratedImage = [HubMode.RD, HubMode.Morse].includes(mode);

  const MODE_DETAILS = {
      [HubMode.LSB]: { name: "LSB Steganography", icon: EyeOff },
      [HubMode.PatternLSB]: { name: "Pattern LSB Steganography", icon: Shuffle },
      [HubMode.MD5Pattern]: { name: "MD5 Pattern Steganography", icon: Fingerprint },
      [HubMode.RD]: { name: "RD Pattern Steganography", icon: Palette },
      [HubMode.Morse]: { name: "Morse Pattern Steganography", icon: AudioWaveform },
  };
  
  const currentModeDetails = MODE_DETAILS[mode];

  const getDecodeInputOptions = () => {
    const options = [{ value: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4 mr-2" /> }];
    if (mode === HubMode.RD) {
      options.push({ value: 'binary', label: 'Binary', icon: <Binary className="w-4 h-4 mr-2" /> });
    }
    if (mode === HubMode.Morse) {
      options.push({ value: 'hex', label: 'Hex', icon: <Type className="w-4 h-4 mr-2" /> });
    }
    options.push({ value: 'text', label: 'Encrypted Text', icon: <FileText className="w-4 h-4 mr-2" /> });
    return options;
  };
  
  const isProcessButtonDisabled = () => {
      if (isLoading) return true;
      if (action === 'encrypt') {
          if (!secretMessage || !password || isMessageTooLong) return true;
          if (isImageBased && !imageFile) return true;
          if (needsStegoKey && !stegoKey) return true;
          return false;
      } else { // decrypt
          if (!password) return true;
          if (decodeInputType === 'image') return !imageFile || (needsStegoKey && !stegoKey);
          if (decodeInputType === 'text') return !textPayload;
          if (['binary', 'hex'].includes(decodeInputType)) return !intermediatePayload;
          return true;
      }
  }


  return (
    <div className="p-4 md:p-6 bg-white/70 backdrop-blur-md shadow-lg rounded-xl border border-secondary-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-secondary-200">
        <h2 className="text-2xl font-semibold text-secondary-800 flex items-center">
            <currentModeDetails.icon className="w-7 h-7 mr-3 text-primary-600" />
            <span>
                {currentModeDetails.name}
                <p className="text-sm font-normal text-secondary-500 mt-1">Hide and extract encrypted data using the {mode.replace(/_/g, ' ')} method.</p>
            </span>
        </h2>
        <div className="flex-shrink-0">
          <InputModeToggle 
            options={[
              { value: 'encrypt', label: 'Encrypt & Hide', icon: <LockKeyhole className="w-4 h-4 mr-2" /> },
              { value: 'decrypt', label: 'Extract & Decrypt', icon: <KeyRound className="w-4 h-4 mr-2" /> }
            ]}
            currentValue={action}
            onSwitch={(v) => setAction(v as Action)}
          />
        </div>
      </div>
      
      {action === 'decrypt' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary-700 mb-2">Input Source</label>
          <InputModeToggle 
            options={getDecodeInputOptions()}
            currentValue={decodeInputType}
            onSwitch={(v) => setDecodeInputType(v as DecodeInputType)}
            size="sm"
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-4">
            { (action === 'encrypt' && isImageBased) || (action === 'decrypt' && decodeInputType === 'image') ? (
                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Upload Image</label>
                    <FileUploader id={`file-upload-${mode}`} onFileSelect={setImageFile} />
                </div>
            ) : null}

            { action === 'encrypt' ? (
                <div>
                    <label htmlFor="secretMessage" className="block text-sm font-medium text-secondary-700 mb-1">Secret Message</label>
                    <textarea id="secretMessage" rows={4} value={secretMessage} onChange={e => setSecretMessage(e.target.value)} className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white ${isMessageTooLong ? 'border-red-500' : 'border-secondary-300'}`} placeholder="Type your secret message..."/>
                    <p className={`text-xs mt-1 text-right ${isMessageTooLong ? 'text-red-600' : 'text-secondary-500'}`}>{characterCount}/{MAX_MESSAGE_LENGTH_CHARS}</p>
                </div>
            ) : null }
            
            { action === 'decrypt' && decodeInputType === 'text' && (
                 <div>
                    <label htmlFor="text-payload-input" className="block text-sm font-medium text-secondary-700 mb-1">Encrypted Text Payload</label>
                    <textarea id="text-payload-input" rows={6} value={textPayload} onChange={e => setTextPayload(e.target.value)} className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow font-mono text-xs" placeholder="Paste encrypted payload..."/>
                </div>
            )}
            
            { action === 'decrypt' && decodeInputType === 'binary' && mode === HubMode.RD && (
                 <div>
                    <label htmlFor="binary-payload-input" className="block text-sm font-medium text-secondary-700 mb-1">Encrypted Binary String</label>
                    <textarea id="binary-payload-input" rows={6} value={intermediatePayload} onChange={e => setIntermediatePayload(e.target.value)} className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow font-mono text-xs" placeholder="Paste binary string..."/>
                </div>
            )}
            
            { action === 'decrypt' && decodeInputType === 'hex' && mode === HubMode.Morse && (
                 <div>
                    <label htmlFor="hex-payload-input" className="block text-sm font-medium text-secondary-700 mb-1">Intermediate Hex String</label>
                    <textarea id="hex-payload-input" rows={6} value={intermediatePayload} onChange={e => setIntermediatePayload(e.target.value)} className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow font-mono text-xs" placeholder="Paste hex string..."/>
                </div>
            )}

            <div>
                <label htmlFor="password-main" className="block text-sm font-medium text-secondary-700 mb-1">Encryption Password</label>
                <input id="password-main" type="password" value={password} onChange={e => handlePasswordChange(e.target.value)} className="w-full p-3 border bg-white border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Enter a strong password"/>
                <PasswordStrengthMeter strength={passwordStrength} />
            </div>

            {needsStegoKey && (action === 'encrypt' || (action === 'decrypt' && decodeInputType === 'image')) && (
                <div>
                    <label htmlFor="stego-key" className="block text-sm font-medium text-secondary-700 mb-1">Stego Key</label>
                    <input id="stego-key" type="password" value={stegoKey} onChange={e => setStegoKey(e.target.value)} className="w-full p-3 border bg-white border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow" placeholder="Key for pixel pattern"/>
                </div>
            )}

            <button onClick={handleProcess} disabled={isProcessButtonDisabled()} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors">
                {isLoading ? 'Processing...' : (action === 'encrypt' ? 'Encrypt & Hide' : 'Extract & Decrypt')}
            </button>
        </div>

        {/* Right Column: Outputs */}
        <div className="space-y-4">
             <h3 className="text-lg font-medium text-secondary-700">Results</h3>
             {action === 'encrypt' && (
                 <div className="space-y-4">
                    {(encodedDataUrl || finalEncryptedPayload) ? (
                        <>
                        {encodedDataUrl && (
                             <div className="p-3 border rounded-md bg-green-50 border-green-200">
                                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center"><CheckCircle className="w-5 h-5 mr-1 text-green-600"/> Encoded Image:</h4>
                                <ImagePreview dataUrl={encodedDataUrl} altText="Encoded output" />
                                <a href={encodedDataUrl} download={`encoded_${mode}_${imageFile?.name || 'image'}.png`} className="mt-4 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                                    <Download className="w-5 h-5 mr-2" /> Download Image
                                </a>
                            </div>
                        )}
                        <TextOutput label="Encrypted Text Payload" icon={<FileText />} text={finalEncryptedPayload} fileName={`encrypted_payload_${mode}.txt`} onCopySuccess={setSuccessMessage} onCopyError={setError} onDownloadSuccess={setSuccessMessage} />
                        { (mode === HubMode.RD || mode === HubMode.Morse) && 
                            <TextOutput label={`Intermediate ${mode === HubMode.RD ? 'Binary' : 'Hex'} String`} icon={mode === HubMode.RD ? <Binary/> : <Type/>} text={finalIntermediatePayload} fileName={`intermediate_${mode}.txt`} onCopySuccess={setSuccessMessage} onCopyError={setError} onDownloadSuccess={setSuccessMessage} />
                        }
                        </>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full p-8 min-h-96 border-2 border-secondary-200 border-dashed rounded-lg bg-secondary-50 text-center">
                            <ImageIcon className="w-16 h-16 text-secondary-300 mb-4" />
                            <h4 className="text-lg font-semibold text-secondary-600">Your results will appear here</h4>
                            <p className="text-sm text-secondary-500 mt-1">Once you encrypt a message, the encoded image and text payloads will be displayed.</p>
                        </div>
                    )}
                 </div>
             )}
             {action === 'decrypt' && (
                 <>
                    {decryptedMessage !== null ? (
                        <div className="p-4 border rounded-md bg-green-50 border-green-200">
                            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center"><CheckCircle className="w-5 h-5 mr-1 text-green-600"/>Decrypted Message:</h4>
                            <textarea readOnly value={decryptedMessage} rows={8} className="w-full p-3 border border-secondary-300 rounded-md bg-white text-secondary-700 focus:outline-none" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 min-h-96 border-2 border-secondary-200 border-dashed rounded-lg bg-secondary-50 text-center">
                            <KeyRound className="w-16 h-16 text-secondary-300 mb-4" />
                            <h4 className="text-lg font-semibold text-secondary-600">Decrypted message will appear here</h4>
                            <p className="text-sm text-secondary-500 mt-1">Provide the correct inputs and your extracted message will be revealed.</p>
                        </div>
                    )}
                 </>
             )}
        </div>
      </div>

    </div>
  );
};

export default SteganographyMode;
