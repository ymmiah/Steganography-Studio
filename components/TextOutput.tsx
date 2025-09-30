
import React from 'react';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadTextFile } from '../utils.ts';

interface TextOutputProps {
  label: string;
  icon: React.ReactNode;
  text: string | null;
  fileName: string;
  onCopySuccess: (message: string) => void;
  onCopyError: (message: string) => void;
  onDownloadSuccess: (message: string) => void;
  textAreaRows?: number;
}

const TextOutput: React.FC<TextOutputProps> = ({
  label,
  icon,
  text,
  fileName,
  onCopySuccess,
  onCopyError,
  onDownloadSuccess,
  textAreaRows = 5,
}) => {
  if (!text) {
    return null;
  }

  const handleCopy = async () => {
    if (text) {
      const success = await copyToClipboard(text);
      if (success) {
        onCopySuccess(`${label} copied to clipboard!`);
      } else {
        onCopyError(`Failed to copy ${label.toLowerCase()}.`);
      }
    }
  };

  const handleDownload = () => {
    if (text) {
      downloadTextFile(text, fileName);
      onDownloadSuccess(`${label} download started.`);
    }
  };

  return (
    <div className="p-3 border rounded-lg bg-blue-50/70 border-blue-200 space-y-2">
      <h4 className="text-sm font-medium text-blue-800 mb-1 flex items-center">
        {icon} {label}:
      </h4>
      <textarea
        readOnly
        value={text}
        rows={textAreaRows}
        className="w-full p-2 text-xs border border-secondary-300 rounded-md bg-white text-secondary-700 focus:outline-none font-mono"
        aria-label={label}
      />
      <div className="flex space-x-2">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
          title={`Copy ${label.toLowerCase()}`}
        >
          <Copy className="w-3 h-3 mr-1.5" /> Copy
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400"
          title={`Download ${label.toLowerCase()} as TXT`}
        >
          <Download className="w-3 h-3 mr-1.5" /> Download
        </button>
      </div>
    </div>
  );
};

export default TextOutput;
