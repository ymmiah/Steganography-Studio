
import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  id: string;
  accept?: string;
  fileTypeDescription?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  id,
  accept = "image/*",
  fileTypeDescription = "PNG, JPG, GIF (will be converted to PNG)",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center w-full h-48 border-2 border-primary-300 border-dashed rounded-lg cursor-pointer bg-primary-50 hover:bg-primary-100 transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className="w-10 h-10 mb-3 text-primary-500" />
          <p className="mb-2 text-sm text-primary-700"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-primary-600">{fileTypeDescription}</p>
        </div>
        <input
          id={id}
          type="file"
          className="hidden"
          accept={accept}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default FileUploader;