import type { GenerateContentResponse as GenAIResponse } from '@google/genai';

export enum HubMode {
  LSB = 'lsb',
  PatternLSB = 'pattern_lsb',
  MD5Pattern = 'md5_pattern',
  RD = 'rd',
  Morse = 'morse',
  HashingTools = 'hashing_tools',
  MD5Cracker = 'md5_cracker',
  Utilities = 'utilities',
  AutoDecode = 'auto_decode',
}

export type SteganographyMode = HubMode.LSB | HubMode.PatternLSB | HubMode.MD5Pattern | HubMode.RD | HubMode.Morse;

export type Action = 'encrypt' | 'decrypt';


export interface ProcessResult {
  success: boolean;
  message?: string;
  dataUrl?: string;
}

export type SetLoadingFunction = (loading: boolean | ((prev: boolean) => boolean)) => void;
export type SetErrorFunction = (error: string | null | ((prev: string | null) => string | null)) => void;
export type SetSuccessMessageFunction = (message: string | null | ((prev: string | null) => string | null)) => void;


export enum PasswordStrengthLevel {
  TooWeak,
  Weak,
  Medium,
  Strong,
  VeryStrong
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  feedback: { message: string, type: 'error' | 'suggestion' | 'good' }[];
}

export interface AIForensicResult {
  confidence: number; // 0-10
  reasoning: string;
  visual_anomalies: string[];
}

export interface AnalysisReport {
  fileProperties: {
    name: string;
    size: number;
    type: string;
  } | null;
  aiAnalysis: AIForensicResult | null;
  decodingLog: { method: string; result: 'Success' | 'Failed' | 'Skipped'; details: string }[];
  finalResult: string | null;
  detectedMethod: string | null;
}

export type GenerateContentResponse = GenAIResponse;
