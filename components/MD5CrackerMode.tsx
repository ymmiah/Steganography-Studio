
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import FileUploader from './ImageUploader.tsx';
import InputModeToggle from './InputModeToggle.tsx';
import { crackMD5, bruteForceMD5, calculateBruteForceCombinations, getAIPasswordGuesses } from '../services/hashCrackerService.ts';
import { FileKey, CheckCircle, XCircle, Search, Hourglass, Ban, BookOpen, Target, Sparkles, Database } from 'lucide-react';
import type { SetLoadingFunction, SetErrorFunction, SetSuccessMessageFunction } from '../types.ts';

type AttackType = 'dictionary' | 'bruteforce' | 'ai' | 'rainbow';
type CrackerResult = {
  status: 'found' | 'not_found' | 'aborted' | 'error';
  value: string | null;
};
type AIStatus = 'idle' | 'generating' | 'cracking';


interface MD5CrackerModeProps {
  setLoading: SetLoadingFunction;
  setError: SetErrorFunction;
  setSuccessMessage: SetSuccessMessageFunction;
  isLoading: boolean;
}

const BRUTE_FORCE_MAX_COMBINATIONS = 50_000_000;

const MD5CrackerMode: React.FC<MD5CrackerModeProps> = ({ setLoading, setError, setSuccessMessage, isLoading }) => {
  const [targetHash, setTargetHash] = useState<string>('');
  const [attackType, setAttackType] = useState<AttackType>('dictionary');
  
  // Dictionary state
  const [wordlistFile, setWordlistFile] = useState<File | null>(null);

  // Brute-force state
  const [bfCharsetLower, setBfCharsetLower] = useState(true);
  const [bfCharsetUpper, setBfCharsetUpper] = useState(false);
  const [bfCharsetNums, setBfCharsetNums] = useState(false);
  const [bfCharsetSymbols, setBfCharsetSymbols] = useState(false);
  const [bfCustomCharset, setBfCustomCharset] = useState('');
  const [bfMaxLength, setBfMaxLength] = useState(6);
  
  // AI state
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');


  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const [result, setResult] = useState<CrackerResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const bfFullCharset = useMemo(() => {
    let charset = '';
    if (bfCharsetLower) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (bfCharsetUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (bfCharsetNums) charset += '0123456789';
    if (bfCharsetSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if(bfCustomCharset) charset += bfCustomCharset.split('').filter((c, i, a) => a.indexOf(c) === i).join(''); // unique chars
    return charset;
  }, [bfCharsetLower, bfCharsetUpper, bfCharsetNums, bfCharsetSymbols, bfCustomCharset]);

  const bfTotalCombinations = useMemo(() => {
      return calculateBruteForceCombinations(bfFullCharset, bfMaxLength);
  }, [bfFullCharset, bfMaxLength]);
  
  // Auto-adjust bfMaxLength if combinations are too high
  useEffect(() => {
    if (attackType !== 'bruteforce' || !bfFullCharset || bfMaxLength === 0) return;

    if (calculateBruteForceCombinations(bfFullCharset, bfMaxLength) > BRUTE_FORCE_MAX_COMBINATIONS) {
      let newMaxLength = bfMaxLength;
      // Start from the current (too high) length and decrease until it's valid
      while (calculateBruteForceCombinations(bfFullCharset, newMaxLength) > BRUTE_FORCE_MAX_COMBINATIONS && newMaxLength > 0) {
        newMaxLength--;
      }
      
      if (bfMaxLength !== newMaxLength) {
        setBfMaxLength(newMaxLength);
      }
    }
  }, [bfFullCharset, bfMaxLength, attackType]);


  const handleFileSelect = useCallback((file: File) => {
    setWordlistFile(file);
    resetAll();
  }, []);

  const resetAll = useCallback(() => {
    setResult(null);
    setProgress({ checked: 0, total: 0 });
    setAiStatus('idle');
    setError(null);
    setSuccessMessage(null);
  },[setError, setSuccessMessage]);

  const switchAttackType = useCallback((type: AttackType) => {
    setAttackType(type);
    resetAll();
  }, [resetAll]);

  const handleStartCracking = async () => {
    setLoading(true);
    resetAll();
    abortControllerRef.current = new AbortController();
    const lcTargetHash = targetHash.toLowerCase();
    let foundPassword = null;

    try {
      if (attackType === 'dictionary') {
          if (!wordlistFile) throw new Error('Please upload a wordlist file (.txt).');
          const wordlistText = await wordlistFile.text();
          foundPassword = await crackMD5(lcTargetHash, wordlistText, {
              onProgress: (p) => setProgress(p),
              signal: abortControllerRef.current.signal,
          });

      } else if (attackType === 'bruteforce') {
          if (!bfFullCharset) throw new Error('Brute-force requires at least one character set to be selected.');
          if (bfTotalCombinations > BRUTE_FORCE_MAX_COMBINATIONS) throw new Error(`Attack complexity is too high (${bfTotalCombinations.toLocaleString()} combinations). Please reduce length or character set.`);
          foundPassword = await bruteForceMD5(lcTargetHash, bfFullCharset, bfMaxLength, {
              onProgress: (p) => setProgress(p),
              signal: abortControllerRef.current.signal,
          });
      
      } else if (attackType === 'ai') {
          setAiStatus('generating');
          const aiGuesses = await getAIPasswordGuesses(lcTargetHash, { signal: abortControllerRef.current.signal });
          
          if (abortControllerRef.current.signal.aborted) throw new DOMException('Aborted by user.', 'AbortError');
          
          setAiStatus('cracking');
          const aiWordlist = aiGuesses.join('\n');
          foundPassword = await crackMD5(lcTargetHash, aiWordlist, {
              onProgress: (p) => setProgress(p),
              signal: abortControllerRef.current.signal
          });
      }

      if (foundPassword !== null) {
        setResult({ status: 'found', value: foundPassword });
        setSuccessMessage(`Password found: "${foundPassword}"`);
      } else {
        setResult({ status: 'not_found', value: null });
        setError('Password not found using the selected method.');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setResult({ status: 'aborted', value: null });
        setError('Cracking process aborted by the user.');
      } else {
        setResult({ status: 'error', value: e.message });
        setError(e.message || 'An unexpected error occurred during cracking.');
      }
    } finally {
      setLoading(false);
      setAiStatus('idle');
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  
  const isHashInvalid = useMemo(() => {
    return !/^[a-f0-9]{32}$/i.test(targetHash);
  }, [targetHash]);

  const isStartButtonDisabled = useMemo(() => {
    if (isLoading || isHashInvalid) return true;
    if (attackType === 'dictionary') return !wordlistFile;
    if (attackType === 'bruteforce') return bfTotalCombinations > BRUTE_FORCE_MAX_COMBINATIONS || !bfFullCharset;
    if (attackType === 'rainbow') return true;
    // For AI attack
    return false;
  }, [isLoading, isHashInvalid, attackType, wordlistFile, bfTotalCombinations, bfFullCharset]);

  const progressPercent = progress.total > 0 ? (progress.checked / progress.total) * 100 : 0;
  
  const getLoadingMessage = () => {
      if (attackType === 'ai') {
          if (aiStatus === 'generating') return 'AI is generating a password list...';
          if (aiStatus === 'cracking') return 'Checking AI-generated list...';
      }
      return 'Cracking in progress...';
  }

  return (
    <div className="p-4 md:p-6 bg-white/70 backdrop-blur-md shadow-lg rounded-xl border border-secondary-200">
      <div className="mb-6 pb-6 border-b border-secondary-200">
        <h2 className="text-2xl font-semibold text-secondary-800 flex items-center">
          <FileKey className="w-7 h-7 mr-3 text-primary-600" />
          <span>
              MD5 Hash Attack Simulator
              <p className="text-sm font-normal text-secondary-500 mt-1">An educational tool to demonstrate password cracking techniques.</p>
          </span>
        </h2>
      </div>

      <div className="mb-6">
          <InputModeToggle
              options={[
                  { value: 'dictionary', label: 'Dictionary', icon: <BookOpen className="w-4 h-4 mr-2" /> },
                  { value: 'bruteforce', label: 'Brute-force', icon: <Target className="w-4 h-4 mr-2" /> },
                  { value: 'ai', label: 'AI Attack', icon: <Sparkles className="w-4 h-4 mr-2" /> },
                  { value: 'rainbow', label: 'Rainbow Table', icon: <Database className="w-4 h-4 mr-2" /> },
              ]}
              currentValue={attackType}
              onSwitch={(v) => switchAttackType(v as AttackType)}
          />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-4">
          <div>
            <label htmlFor="md5TargetHash" className="block text-sm font-medium text-secondary-700 mb-1">
              1. Enter Target MD5 Hash
            </label>
            <input
              id="md5TargetHash" type="text"
              className={`w-full p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white ${targetHash && isHashInvalid ? 'border-red-500' : 'border-secondary-300'}`}
              placeholder="e.g., 1f3870be274f6c49b3e31a0c6728957f"
              value={targetHash}
              onChange={(e) => { setTargetHash(e.target.value.trim()); resetAll(); }}
              maxLength={32}
            />
          </div>

          {/* Dictionary Attack Options */}
          {attackType === 'dictionary' && (
             <div>
                <label htmlFor="wordlistUpload" className="block text-sm font-medium text-secondary-700 mb-1">2. Upload Wordlist File</label>
                <FileUploader id="wordlistUpload" onFileSelect={handleFileSelect} accept="text/plain" fileTypeDescription="Wordlist must be a .txt file" />
                {wordlistFile && (<p className="mt-2 text-sm text-secondary-600">Selected file: <span className="font-semibold">{wordlistFile.name}</span></p>)}
             </div>
          )}
          
          {/* Brute-force Attack Options */}
          {attackType === 'bruteforce' && (
              <fieldset className="space-y-3 p-4 border rounded-lg bg-secondary-50/50">
                <legend className="text-sm font-medium text-secondary-700 px-2">2. Configure Brute-force Attack</legend>
                <div className="space-y-2">
                    <p className="text-xs font-medium text-secondary-600">Character Sets:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <label className="flex items-center text-sm"><input type="checkbox" checked={bfCharsetLower} onChange={(e) => setBfCharsetLower(e.target.checked)} className="mr-2 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"/>a-z</label>
                        <label className="flex items-center text-sm"><input type="checkbox" checked={bfCharsetUpper} onChange={(e) => setBfCharsetUpper(e.target.checked)} className="mr-2 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"/>A-Z</label>
                        <label className="flex items-center text-sm"><input type="checkbox" checked={bfCharsetNums} onChange={(e) => setBfCharsetNums(e.target.checked)} className="mr-2 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"/>0-9</label>
                        <label className="flex items-center text-sm"><input type="checkbox" checked={bfCharsetSymbols} onChange={(e) => setBfCharsetSymbols(e.target.checked)} className="mr-2 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"/>Symbols</label>
                    </div>
                     <input type="text" placeholder="Add custom characters..." value={bfCustomCharset} onChange={(e) => setBfCustomCharset(e.target.value)} className="w-full mt-2 p-2 border border-secondary-300 rounded-md text-sm bg-white" />
                </div>
                <div>
                   <label htmlFor="bfMaxLength" className="block text-xs font-medium text-secondary-600">Max Length:</label>
                    <input id="bfMaxLength" type="number" min="1" max="12" value={bfMaxLength} onChange={e => setBfMaxLength(parseInt(e.target.value, 10) || 0)} className="w-24 p-2 border border-secondary-300 rounded-md text-sm bg-white"/>
                </div>
                <div className={`text-xs p-2 rounded ${bfTotalCombinations > BRUTE_FORCE_MAX_COMBINATIONS ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    <strong>Total Combinations:</strong> {bfTotalCombinations.toLocaleString()}
                    {bfTotalCombinations > BRUTE_FORCE_MAX_COMBINATIONS && <span className="font-bold block"> (Too high! Attack will be disabled.)</span>}
                </div>
              </fieldset>
          )}

          {/* AI / Rainbow Info */}
          {attackType === 'ai' && <div className="p-3 border rounded-lg bg-secondary-50/50 text-sm text-secondary-700">This will use the Gemini AI to generate a targeted list of likely passwords, then attempt to crack the hash with that list.</div>}
          {attackType === 'rainbow' && <div className="p-3 border rounded-lg bg-secondary-50/50 text-sm text-secondary-700"><strong>Rainbow tables</strong> are precomputed lookup tables. A true attack is not feasible in a browser due to their massive size (GBs or TBs), but they represent a powerful offline cracking method.</div>}
          
          {!isLoading ? (
            <button
              onClick={handleStartCracking}
              disabled={isStartButtonDisabled}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="w-5 h-5 mr-2" /> Start {attackType.charAt(0).toUpperCase() + attackType.slice(1)} Attack
            </button>
          ) : (
             <button onClick={handleAbort} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
              <Ban className="w-5 h-5 mr-2" /> Abort Process
            </button>
          )}
        </div>

        {/* Right Column: Progress & Result */}
        <div className="space-y-4">
           <h3 className="text-lg font-medium text-secondary-700">3. Attack Status</h3>
           <div className="p-4 border rounded-lg bg-secondary-50/50 h-full flex flex-col justify-center min-h-[16rem]">
                {isLoading && (
                    <div className="space-y-3">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-primary-700">{getLoadingMessage()}</span>
                           {aiStatus !== 'generating' && <span className="text-sm font-medium text-primary-700">{Math.round(progressPercent)}%</span>}
                        </div>
                        {aiStatus !== 'generating' ? (
                            <>
                            <div className="w-full bg-secondary-200 rounded-full h-2.5">
                                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-sm text-secondary-500 text-center">{progress.checked.toLocaleString()} / {progress.total.toLocaleString()} combinations checked</p>
                            </>
                        ) : (
                            <div className="flex justify-center items-center h-20">
                                <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                        )}
                    </div>
                )}
                
                {result?.status === 'found' && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3"/>
                        <p className="text-lg font-semibold text-green-700">Password Found!</p>
                        <p className="mt-2 p-3 bg-green-100 rounded-md font-mono text-xl text-green-800 break-all">{result.value}</p>
                    </div>
                )}
                {result?.status === 'not_found' && (
                     <div className="text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3"/>
                        <p className="text-lg font-semibold text-red-700">Password Not Found</p>
                        <p className="mt-2 text-secondary-600">The hash could not be cracked with the selected method.</p>
                    </div>
                )}
                 {result?.status === 'aborted' && (
                     <div className="text-center">
                        <Ban className="w-16 h-16 text-yellow-500 mx-auto mb-3"/>
                        <p className="text-lg font-semibold text-yellow-700">Process Aborted</p>

                        <p className="mt-2 text-secondary-600">The cracking process was stopped by the user.</p>
                    </div>
                )}
                {!isLoading && !result && (
                     <div className="text-center text-secondary-500">
                        <Hourglass className="w-12 h-12 mx-auto mb-3"/>
                        <p>Awaiting instructions. Results will appear here.</p>
                    </div>
                )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default MD5CrackerMode;
