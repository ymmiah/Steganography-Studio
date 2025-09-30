
import React, { useState, useCallback, useRef } from 'react';
import FileUploader from './ImageUploader.tsx';
import PasswordStrengthMeter from './PasswordStrengthMeter.tsx';
import InputModeToggle from './InputModeToggle.tsx';
import { ScanSearch, KeyRound, CheckCircle, Hourglass, HelpCircle, ImageIcon, FileText, Bot, File as FileIcon, ListChecks, ChevronDown, ChevronRight, AlertCircle, Sparkles, Ban } from 'lucide-react';
import { calculatePasswordStrength, base64ToArrayBuffer, arrayBufferToString, hexToArrayBuffer, binaryToText } from '../utils.ts';
import * as analysisService from '../services/analysisService.ts';
import * as LsbService from '../services/steganographyService.ts';
import * as PatternLsbService from '../services/steganographyPatternLSBService.ts';
import * as Md5PatternService from '../services/steganographyMD5PatternService.ts';
import * as RdService from '../services/steganographyRDService.ts';
import * as MorseService from '../services/steganographyMorseService.ts';
import * as CryptoService from '../services/cryptoService.ts';
import type { SetLoadingFunction, SetErrorFunction, SetSuccessMessageFunction, PasswordStrengthResult, AnalysisReport } from '../types.ts';

interface UniversalDecoderModeProps {
  isLoading: boolean;
  setLoading: SetLoadingFunction;
  setError: SetErrorFunction;
  setSuccessMessage: SetSuccessMessageFunction;
}

type InputType = 'image' | 'text';

const DECODING_METHODS = [
  { id: 'lsb', name: 'LSB', func: LsbService.decodeMessage, requiresKey: false },
  { id: 'rd', name: 'RD Pattern', func: RdService.decodeRDMessage, requiresKey: false },
  { id: 'morse', name: 'Morse Pattern', func: MorseService.decodeMorseMessage, requiresKey: false },
  { id: 'pattern_lsb', name: 'Pattern LSB', func: PatternLsbService.decodeMessagePatternLSB, requiresKey: true },
  { id: 'md5_pattern', name: 'MD5 Pattern', func: Md5PatternService.decodeMessageMD5Pattern, requiresKey: true },
];

const ReportSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean, badge?: React.ReactNode }> = ({ title, icon, children, defaultOpen = false, badge }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-secondary-200 last:border-b-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left font-semibold text-secondary-800 hover:bg-secondary-100 transition-colors rounded-t-lg">
                <span className="flex items-center">{icon}<span className="ml-2">{title}</span></span>
                <span className="flex items-center">
                    {badge}
                    {isOpen ? <ChevronDown className="w-5 h-5 ml-2" /> : <ChevronRight className="w-5 h-5 ml-2" />}
                </span>
            </button>
            {isOpen && <div className="p-4 bg-secondary-50/70 text-sm text-secondary-700">{children}</div>}
        </div>
    );
};

const UniversalDecoderMode: React.FC<UniversalDecoderModeProps> = ({ isLoading, setLoading, setError, setSuccessMessage }) => {
  const [inputType, setInputType] = useState<InputType>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [textPayload, setTextPayload] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [stegoKey, setStegoKey] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setAnalysisReport(null);
    setCurrentStep(null);
    setError(null);
    setSuccessMessage(null);
  }, [setError, setSuccessMessage]);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };
  
  const handleFileSelect = (file: File) => {
    setImageFile(file);
    resetState();
  }
  
  const handleRunAnalysis = async () => {
    resetState();
    setLoading(true);
    abortControllerRef.current = new AbortController();

    const newReport: AnalysisReport = {
        fileProperties: null,
        aiAnalysis: null,
        decodingLog: [],
        finalResult: null,
        detectedMethod: null,
    };

    try {
      if (inputType === 'image' && imageFile) {
        await runImageAnalysis(newReport, imageFile);
      } else if (inputType === 'text' && textPayload) {
        await runTextAnalysis(newReport, textPayload);
      } else {
        throw new Error("No input provided.");
      }
      
      if (newReport.finalResult) {
        setSuccessMessage(`Success! Message found using the ${newReport.detectedMethod} method.`);
      } else {
        setError(inputType === 'image' ? "Analysis complete. No hidden message found with the provided credentials." : "Decoding failed for the provided text.");
      }

    } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message || "An unexpected error occurred during analysis.");
        } else {
          setError("Analysis aborted by user.");
        }
        setAnalysisReport(newReport); // Show partial report on error
    } finally {
        setCurrentStep(null);
        setLoading(false);
    }
  };
  
  const runImageAnalysis = async (report: AnalysisReport, file: File) => {
      report.fileProperties = { name: file.name, size: file.size, type: file.type };
      setAnalysisReport({ ...report });

      // AI Analysis
      setCurrentStep('Performing AI forensic analysis...');
      try {
        const aiResult = await analysisService.analyzeImageWithAI(file, { signal: abortControllerRef.current.signal });
        report.aiAnalysis = aiResult;
      } catch (e: any) {
         report.aiAnalysis = { confidence: -1, reasoning: `AI analysis failed: ${e.message}`, visual_anomalies: [] };
      }
      setAnalysisReport({ ...report });
      if (abortControllerRef.current?.signal.aborted) throw new DOMException('Aborted');

      // Decoding attempts
      for (const method of DECODING_METHODS) {
        setCurrentStep(`Trying ${method.name} method...`);
        if (method.requiresKey && !stegoKey) {
            report.decodingLog.push({ method: method.name, result: 'Skipped', details: 'Stego Key not provided.' });
            setAnalysisReport({ ...report });
            continue;
        }
        try {
            const decodeFn = method.func as (file: File, keyOrPass: string, pass?: string) => Promise<string>;
            const decodedMessage = method.requiresKey ? await decodeFn(file, stegoKey, password) : await decodeFn(file, password);

            report.decodingLog.push({ method: method.name, result: 'Success', details: 'Message decrypted successfully.' });
            report.finalResult = decodedMessage;
            report.detectedMethod = method.name;
            setAnalysisReport({ ...report });
            return; // Found it!
        } catch (e: any) {
            report.decodingLog.push({ method: method.name, result: 'Failed', details: e.message.substring(0, 150) });
            setAnalysisReport({ ...report });
            console.log(`Auto-detect: ${method.name} failed.`, e);
        }
         if (abortControllerRef.current?.signal.aborted) throw new DOMException('Aborted');
      }
  };
  
  const runTextAnalysis = async (report: AnalysisReport, text: string) => {
      // 1. Try AES Decryption if password is provided
      if (password) {
          setCurrentStep('Attempting AES-GCM decryption...');
          try {
              const message = await CryptoService.decryptMessage(text, password);
              report.decodingLog.push({ method: 'AES-GCM Decryption', result: 'Success', details: 'Payload decrypted successfully.' });
              report.finalResult = message;
              report.detectedMethod = 'AES-GCM Encrypted Payload';
              setAnalysisReport({ ...report });
              return;
          } catch (e: any) {
               report.decodingLog.push({ method: 'AES-GCM Decryption', result: 'Failed', details: e.message });
               setAnalysisReport({ ...report });
          }
      } else {
           report.decodingLog.push({ method: 'AES-GCM Decryption', result: 'Skipped', details: 'No password provided.' });
           setAnalysisReport({ ...report });
      }

      const formats: {name: 'Base64' | 'Hex' | 'Binary', decodeFn: (input: string) => string}[] = [
          { name: 'Base64', decodeFn: (t) => arrayBufferToString(base64ToArrayBuffer(t)) },
          { name: 'Hex', decodeFn: (t) => arrayBufferToString(hexToArrayBuffer(t)) },
          { name: 'Binary', decodeFn: binaryToText },
      ];
      
      for(const format of formats) {
          setCurrentStep(`Checking for ${format.name} format...`);
          try {
              const decoded = format.decodeFn(text);
              if (decoded && decoded.length > 0 && decoded.trim() !== '') {
                  report.decodingLog.push({ method: format.name, result: 'Success', details: 'Text decoded successfully.'});
                  report.finalResult = decoded;
                  report.detectedMethod = format.name;
                  setAnalysisReport({ ...report });
                  return;
              } else {
                  throw new Error("Decoding resulted in empty content.");
              }
          } catch (e: any) {
              report.decodingLog.push({ method: format.name, result: 'Failed', details: `Not valid ${format.name}.`});
              setAnalysisReport({ ...report });
          }
      }
  };

  const isProcessButtonDisabled = isLoading || (inputType === 'image' && !imageFile) || (inputType === 'text' && !textPayload);
  
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white/70 backdrop-blur-md shadow-lg rounded-xl border border-secondary-200">
      <div className="mb-6 pb-6 border-b border-secondary-200">
        <h2 className="text-2xl font-semibold text-secondary-800 flex items-center">
          <ScanSearch className="w-7 h-7 mr-3 text-primary-600" />
          <span>
            Universal Decoder
            <p className="text-sm font-normal text-secondary-500 mt-1">AI-powered forensic analysis and multi-method decoding.</p>
          </span>
        </h2>
      </div>
      
      <div className="mb-6">
          <InputModeToggle 
            options={[
              { value: 'image', label: 'From Image', icon: <ImageIcon className="w-4 h-4 mr-2" /> },
              { value: 'text', label: 'From Text', icon: <FileText className="w-4 h-4 mr-2" /> }
            ]}
            currentValue={inputType}
            onSwitch={(v) => {
              setInputType(v as InputType);
              resetState();
            }}
          />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-4">
          {inputType === 'image' ? (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Upload Image for Analysis</label>
                <FileUploader id="universal-decode-upload" onFileSelect={handleFileSelect} />
              </div>
          ) : (
             <div>
                <label htmlFor="text-payload-input" className="block text-sm font-medium text-secondary-700 mb-1">Text Payload</label>
                <textarea id="text-payload-input" rows={6} value={textPayload} onChange={e => setTextPayload(e.target.value)} className="w-full p-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow font-mono text-xs bg-white" placeholder="Paste encrypted payload, Base64, Hex, or Binary..."/>
            </div>
          )}

          <div>
            <label htmlFor="universal-password" className="block text-sm font-medium text-secondary-700 mb-1">
              Password
              {inputType === 'text' && <span className="text-xs text-secondary-500 ml-2">(Optional for non-encrypted text)</span>}
            </label>
            <input id="universal-password" type="password" value={password} onChange={e => handlePasswordChange(e.target.value)} className="w-full p-3 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white" placeholder="Needed for encrypted content"/>
            {password && <PasswordStrengthMeter strength={passwordStrength} />}
          </div>
          
          {inputType === 'image' && (
            <div>
              <label htmlFor="universal-stego-key" className="block text-sm font-medium text-secondary-700 mb-1">Stego Key (Optional)</label>
              <input id="universal-stego-key" type="password" value={stegoKey} onChange={e => setStegoKey(e.target.value)} className="w-full p-3 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow bg-white" placeholder="Needed for Pattern LSB methods"/>
            </div>
          )}
          
          {!isLoading ? (
             <button onClick={handleRunAnalysis} disabled={isProcessButtonDisabled} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors">
               <ScanSearch className="w-5 h-5 mr-2"/> Run Full Analysis
             </button>
          ) : (
             <button onClick={handleAbort} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
               <Ban className="w-5 h-5 mr-2"/> Abort Analysis
             </button>
          )}

        </div>

        {/* Right Column: Outputs */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-700">Analysis Report</h3>
          <div className="border border-secondary-200 rounded-lg bg-white min-h-[20rem]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-secondary-500 p-4">
                  <Hourglass className="w-12 h-12 mx-auto mb-3 animate-spin text-primary-500"/>
                  <p className="font-semibold text-primary-700">{currentStep || 'Preparing for analysis...'}</p>
              </div>
            )}
             {!isLoading && !analysisReport && (
                <div className="flex flex-col items-center justify-center h-full text-secondary-500 p-4 text-center">
                    <HelpCircle className="w-12 h-12 mx-auto mb-3"/>
                    <p>Provide input and run analysis to see the report.</p>
                </div>
            )}
            
            {analysisReport && (
                <div>
                   {analysisReport.fileProperties && (
                        <ReportSection title="File Properties" icon={<FileIcon className="w-4 h-4"/>}>
                           <ul className="space-y-1">
                                <li><strong>Name:</strong> {analysisReport.fileProperties.name}</li>
                                <li><strong>Size:</strong> {(analysisReport.fileProperties.size / 1024).toFixed(2)} KB</li>
                                <li><strong>Type:</strong> {analysisReport.fileProperties.type}</li>
                           </ul>
                        </ReportSection>
                    )}
                     {analysisReport.aiAnalysis && (
                        <ReportSection 
                            title="AI Forensic Analysis" 
                            icon={<Sparkles className="w-4 h-4"/>}
                            badge={
                                analysisReport.aiAnalysis.confidence >= 0 ? 
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${analysisReport.aiAnalysis.confidence > 6 ? 'bg-red-200 text-red-800' : analysisReport.aiAnalysis.confidence > 3 ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                    Confidence: {analysisReport.aiAnalysis.confidence}/10
                                </span> : <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-secondary-200 text-secondary-600">Failed</span>
                            }
                        >
                           <div className="space-y-2">
                            <p><strong>Reasoning:</strong> {analysisReport.aiAnalysis.reasoning}</p>
                            {analysisReport.aiAnalysis.visual_anomalies.length > 0 && (
                                <div>
                                    <strong>Detected Anomalies:</strong>
                                    <ul className="list-disc list-inside mt-1">
                                        {analysisReport.aiAnalysis.visual_anomalies.map((a, i) => <li key={i}>{a}</li>)}
                                    </ul>
                                </div>
                            )}
                           </div>
                        </ReportSection>
                    )}
                    <ReportSection title="Decoding Log" icon={<ListChecks className="w-4 h-4"/>} defaultOpen={!analysisReport.finalResult}>
                       <ul className="space-y-2">
                           {analysisReport.decodingLog.map((log, i) => (
                               <li key={i} className="flex items-start">
                                   <div className="mr-2 mt-1">
                                       {log.result === 'Success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>}
                                       {log.result === 'Failed' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>}
                                       {log.result === 'Skipped' && <HelpCircle className="w-4 h-4 text-secondary-400 flex-shrink-0"/>}
                                   </div>
                                   <div>
                                       <span className="font-semibold">{log.method}:</span> <span className={`font-bold ${log.result==='Success'?'text-green-600':log.result==='Failed'?'text-red-600':'text-secondary-500'}`}>{log.result}</span>
                                       <p className="text-xs text-secondary-500 pl-1">{log.details}</p>
                                   </div>
                               </li>
                           ))}
                       </ul>
                    </ReportSection>
                     {analysisReport.finalResult && (
                        <ReportSection title="Final Result" icon={<CheckCircle className="w-4 h-4 text-green-600"/>} defaultOpen>
                           <p className="text-xs text-green-700 mb-2">Detected Method: <strong>{analysisReport.detectedMethod}</strong></p>
                           <textarea readOnly value={analysisReport.finalResult} rows={8} className="w-full p-3 border border-secondary-300 rounded-md bg-white text-secondary-700 focus:outline-none" />
                        </ReportSection>
                    )}
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalDecoderMode;
