
import React, { useState, useMemo } from 'react';
import { Type, ChevronsRight, Lock, Copy } from 'lucide-react';
import { calculatePasswordStrength, copyToClipboard, stringToArrayBuffer, arrayBufferToBase64, base64ToArrayBuffer, arrayBufferToString } from '../utils.ts';
import PasswordStrengthMeter from './PasswordStrengthMeter.tsx';
import InputModeToggle from './InputModeToggle.tsx';
import type { SetSuccessMessageFunction, SetErrorFunction } from '../types.ts';

interface UtilityModeProps {
  setSuccessMessage: SetSuccessMessageFunction;
  setError: SetErrorFunction;
}

type Utility = 'base64' | 'password';

const UtilityMode: React.FC<UtilityModeProps> = ({ setSuccessMessage, setError }) => {
  const [utility, setUtility] = useState<Utility>('base64');
  
  // Base64 state
  const [base64Input, setBase64Input] = useState('');
  const [base64Output, setBase64Output] = useState('');
  
  // Password Strength state
  const [passwordInput, setPasswordInput] = useState('');
  const passwordStrength = useMemo(() => calculatePasswordStrength(passwordInput), [passwordInput]);

  const handleBase64Encode = () => {
    setError(null);
    try {
      if (!base64Input) {
        setBase64Output('');
        return;
      }
      const buffer = stringToArrayBuffer(base64Input);
      const encoded = arrayBufferToBase64(buffer);
      setBase64Output(encoded);
    } catch (e) {
      setError('Failed to encode: An unexpected error occurred.');
      setBase64Output('');
    }
  };

  const handleBase64Decode = () => {
    setError(null);
    try {
      if (!base64Input) {
        setBase64Output('');
        return;
      }
      const buffer = base64ToArrayBuffer(base64Input);
      const decoded = arrayBufferToString(buffer);
      setBase64Output(decoded);
    } catch (e) {
      setError('Failed to decode: Input is not a valid Base64 string.');
      setBase64Output('');
    }
  };
  
  const handleCopy = async (text: string, type: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setSuccessMessage(`${type} copied to clipboard!`);
    } else {
      setError(`Failed to copy ${type}.`);
    }
  }

  return (
    <div className="p-4 md:p-6 bg-white/70 backdrop-blur-md shadow-lg rounded-xl border border-secondary-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-secondary-200">
        <h2 className="text-2xl font-semibold text-secondary-800">
          Cryptographic Utilities
          <p className="text-sm font-normal text-secondary-500 mt-1">Quick tools for common crypto tasks.</p>
        </h2>
        <div className="flex-shrink-0">
            <InputModeToggle 
                options={[
                    { value: 'base64', label: 'Base64', icon: <Type className="w-4 h-4 mr-2"/> },
                    { value: 'password', label: 'Password Strength', icon: <Lock className="w-4 h-4 mr-2"/> }
                ]}
                currentValue={utility}
                onSwitch={(v) => setUtility(v as Utility)}
            />
        </div>
      </div>
      
      {utility === 'base64' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="base64-input" className="block text-sm font-medium text-secondary-700 mb-1">Input</label>
            <textarea id="base64-input" value={base64Input} onChange={e => setBase64Input(e.target.value)} rows={5} className="w-full p-3 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 bg-white transition-shadow" placeholder="Type text or paste Base64 here..."/>
          </div>
          <div className="flex justify-center space-x-4">
            <button onClick={handleBase64Encode} className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 flex items-center shadow-sm">Encode <ChevronsRight className="w-4 h-4 ml-2"/></button>
            <button onClick={handleBase64Decode} className="px-4 py-2 rounded-md bg-secondary-600 text-white hover:bg-secondary-700 flex items-center shadow-sm"><ChevronsRight className="w-4 h-4 mr-2 rotate-180"/> Decode</button>
          </div>
           <div>
            <label htmlFor="base64-output" className="block text-sm font-medium text-secondary-700 mb-1">Output</label>
            <div className="relative">
                <textarea id="base64-output" readOnly value={base64Output} rows={5} className="w-full p-3 pr-10 border border-secondary-300 rounded-md bg-secondary-50 font-mono text-sm" placeholder="Result will appear here..."/>
                 <button onClick={() => handleCopy(base64Output, 'Output')} disabled={!base64Output} className="absolute top-2 right-2 p-1 text-secondary-400 hover:text-primary-600 disabled:text-secondary-300 disabled:cursor-not-allowed" title="Copy output">
                    <Copy className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      )}

      {utility === 'password' && (
        <div className="space-y-4">
          <label htmlFor="password-strength-input" className="block text-sm font-medium text-secondary-700 mb-1">Enter Password to Analyze</label>
          <input id="password-strength-input" type="text" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-3 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 bg-white transition-shadow" placeholder="Type a password to see its strength..."/>
          <PasswordStrengthMeter strength={passwordStrength} />
        </div>
      )}

    </div>
  );
};

export default UtilityMode;
