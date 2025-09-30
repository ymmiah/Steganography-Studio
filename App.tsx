
import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import UnifiedHub from './components/UnifiedHub.tsx';
import Sidebar from './components/Sidebar.tsx';
import { HubMode } from './types.ts';

const App: React.FC = () => {
  const [hubMode, setHubMode] = useState<HubMode>(HubMode.AutoDecode);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(true);

  const handleSetLoading = useCallback((loadingState: boolean | ((prevState: boolean) => boolean)) => {
    setIsLoading(loadingState);
  }, []);

  const handleSetError = useCallback((errorState: string | null | ((prevState: string | null) => string | null)) => {
    setError(errorState);
    if (errorState) setSuccessMessage(null);
  }, []);

  const handleSetSuccessMessage = useCallback((successState: string | null | ((prevState: string | null) => string | null)) => {
    setSuccessMessage(successState);
    if (successState) setError(null);
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-secondary-100 via-primary-50 to-secondary-100 text-secondary-800">
      <Sidebar currentMode={hubMode} setMode={setHubMode} />
      
      <div className="flex-1 flex flex-col h-screen">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {showIntro && (
            <div className="bg-primary-100/80 backdrop-blur-sm border border-primary-200 text-primary-800 p-4 mb-6 rounded-lg shadow-md relative">
              <button 
                onClick={() => setShowIntro(false)}
                className="absolute top-2 right-2 text-primary-500 hover:text-primary-700"
                aria-label="Dismiss intro"
              >
                <X className="w-5 h-5"/>
              </button>
              <div className="flex">
                <div className="py-1"><Info className="h-6 w-6 text-primary-500 mr-4 flex-shrink-0"/></div>
                <div>
                  <p className="font-bold">Welcome to the Steganography Studio!</p>
                  <p className="text-sm mt-1">
                    Select a tool from the sidebar to begin. For first-time users, the <strong>Universal Decoder</strong> is a great place to start. It uses AI to perform a forensic check on images and attempts to decode them using all available methods.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow flex items-center justify-between" role="alert">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-3" />
                <span><strong>Error:</strong> <span dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, '<br />') }} /></span>
              </div>
              <button onClick={() => setError(null)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-200">
                <X className="w-5 h-5"/>
              </button>
            </div>
          )}
          {successMessage && (
            <div className="p-4 mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md shadow flex items-center justify-between" role="status">
               <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3" />
                <span>{successMessage}</span>
              </div>
               <button onClick={() => setSuccessMessage(null)} className="p-1 text-green-500 hover:text-green-700 rounded-full hover:bg-green-200">
                <X className="w-5 h-5"/>
              </button>
            </div>
          )}

          <main>
            <UnifiedHub
                mode={hubMode}
                isLoading={isLoading}
                setLoading={handleSetLoading}
                setError={handleSetError}
                setSuccessMessage={handleSetSuccessMessage}
              />
          </main>
        </div>
        
        <footer className="text-center p-4 border-t border-secondary-200 bg-white/50 backdrop-blur-sm">
          <p className="text-sm text-secondary-500">
            © {currentYear} Steganography Studio - For educational purposes. Created by Yasin Mohammed Miah.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
