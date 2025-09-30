
import React from 'react';
import { HubMode, type SteganographyMode as StegoModeEnum } from '../types.ts';
import SteganographyMode from './SteganographyMode.tsx';
import HashingMode from './HashingMode.tsx';
import MD5CrackerMode from './MD5CrackerMode.tsx';
import UtilityMode from './UtilityMode.tsx';
import UniversalDecoderMode from './UniversalDecoderMode.tsx';
import type { SetLoadingFunction, SetErrorFunction, SetSuccessMessageFunction } from '../types.ts';

interface UnifiedHubProps {
  mode: HubMode;
  isLoading: boolean;
  setLoading: SetLoadingFunction;
  setError: SetErrorFunction;
  setSuccessMessage: SetSuccessMessageFunction;
}

const UnifiedHub: React.FC<UnifiedHubProps> = ({ mode, isLoading, setLoading, setError, setSuccessMessage }) => {
  
  const isStegoMode = (currentMode: HubMode): currentMode is StegoModeEnum => {
      return [HubMode.LSB, HubMode.PatternLSB, HubMode.MD5Pattern, HubMode.RD, HubMode.Morse].includes(currentMode);
  }
  
  const renderContent = () => {
    if (isStegoMode(mode)) {
        return (
            <SteganographyMode
                mode={mode}
                isLoading={isLoading}
                setLoading={setLoading}
                setError={setError}
                setSuccessMessage={setSuccessMessage}
            />
        );
    }
    
    switch(mode) {
        case HubMode.AutoDecode:
            return (
                <UniversalDecoderMode
                    isLoading={isLoading}
                    setLoading={setLoading}
                    setError={setError}
                    setSuccessMessage={setSuccessMessage}
                />
            );
        case HubMode.HashingTools:
            return (
                 <HashingMode 
                    setSuccessMessage={setSuccessMessage}
                    setError={setError}
                />
            );
        case HubMode.MD5Cracker:
             return (
                <MD5CrackerMode 
                    isLoading={isLoading}
                    setLoading={setLoading}
                    setError={setError}
                    setSuccessMessage={setSuccessMessage}
                />
            );
        case HubMode.Utilities:
            return (
                <UtilityMode
                    setSuccessMessage={setSuccessMessage}
                    setError={setError}
                />
            );
        default:
            return <div>Select a mode</div>;
    }
  }

  return <div>{renderContent()}</div>;
};

export default UnifiedHub;
