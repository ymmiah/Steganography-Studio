
import React, { useState, useEffect } from 'react';
import { md5, md2, md4, sha1, sha224, sha256, sha384, sha512, copyToClipboard } from '../utils.ts';
import { Hash, Copy, Check } from 'lucide-react';
import type { SetSuccessMessageFunction, SetErrorFunction } from '../types.ts';

interface HashingModeProps {
  setSuccessMessage: SetSuccessMessageFunction;
  setError: SetErrorFunction;
}

const HASH_ALGORITHMS = [
  { name: 'MD2', func: (text: string) => Promise.resolve(md2(text)) },
  { name: 'MD4', func: (text: string) => Promise.resolve(md4(text)) },
  { name: 'MD5', func: (text: string) => Promise.resolve(md5(text)) },
  { name: 'SHA-1', func: sha1 },
  { name: 'SHA-224', func: (text: string) => Promise.resolve(sha224(text)) },
  { name: 'SHA-256', func: sha256 },
  { name: 'SHA-384', func: sha384 },
  { name: 'SHA-512', func: sha512 },
];

const HashingMode: React.FC<HashingModeProps> = ({ setSuccessMessage, setError }) => {
  const [inputText, setInputText] = useState<string>('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputText) {
        generateHashes();
      } else {
        setHashes({});
      }
    }, 300); // Debounce input

    return () => {
      clearTimeout(handler);
    };
  }, [inputText]);

  const generateHashes = async () => {
    setIsGenerating(true);
    const newHashes: Record<string, string> = {};
    for (const algo of HASH_ALGORITHMS) {
      try {
        newHashes[algo.name] = await algo.func(inputText);
      } catch (e) {
        newHashes[algo.name] = 'Error generating hash';
        console.error(`Error generating ${algo.name} hash:`, e);
      }
    }
    setHashes(newHashes);
    setIsGenerating(false);
  };

  const handleCopy = async (hashValue: string, name: string) => {
    const success = await copyToClipboard(hashValue);
    if (success) {
      setSuccessMessage(`${name} hash copied to clipboard!`);
      setCopiedHash(name);
      setTimeout(() => setCopiedHash(null), 2000);
    } else {
      setError(`Failed to copy ${name} hash.`);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white/70 backdrop-blur-md shadow-lg rounded-xl border border-secondary-200">
       <div className="mb-6 pb-6 border-b border-secondary-200">
        <h2 className="text-2xl font-semibold text-secondary-800 flex items-center">
          <Hash className="w-7 h-7 mr-3 text-primary-600" />
          <span>
              Multi-Hash Generator
              <p className="text-sm font-normal text-secondary-500 mt-1">Instantly generate hashes using various algorithms.</p>
          </span>
        </h2>
       </div>
      
      <div>
        <label htmlFor="hashing-input" className="block text-sm font-medium text-secondary-700 mb-1">
          Input Text
        </label>
        <textarea
          id="hashing-input"
          rows={5}
          className="w-full p-3 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white"
          placeholder="Type or paste text here to see all hashes generated instantly..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-secondary-700 mb-4">Generated Hashes</h3>
        {isGenerating && <p className="text-secondary-500">Generating...</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {HASH_ALGORITHMS.map(algo => (
                <div key={algo.name} className="bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                    <label htmlFor={`hash-output-${algo.name}`} className="text-sm font-bold text-secondary-600 mb-1">{algo.name}</label>
                    <div className="relative">
                        <textarea
                            id={`hash-output-${algo.name}`}
                            readOnly
                            value={hashes[algo.name] || ''}
                            className="w-full p-2 pr-10 border border-secondary-200 rounded-md bg-white text-secondary-800 font-mono text-xs resize-none"
                            rows={2}
                        />
                         <button
                            onClick={() => handleCopy(hashes[algo.name], algo.name)}
                            disabled={!hashes[algo.name] || hashes[algo.name] === 'Error generating hash'}
                            className="absolute top-2 right-2 p-1 text-secondary-400 hover:text-primary-600 disabled:text-secondary-300 disabled:cursor-not-allowed"
                            title={`Copy ${algo.name} hash`}
                        >
                            {copiedHash === algo.name ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HashingMode;
