
import React, { useState, useEffect } from 'react';

interface ImagePreviewProps {
  file?: File | null;
  dataUrl?: string | null;
  altText: string;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file, dataUrl, altText, className = "w-full h-auto rounded-md object-contain max-h-96" }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (dataUrl) {
      setPreviewUrl(dataUrl);
      return; // Data URL is directly usable
    }

    if (file) {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }
    
    // Cleanup function for when the component unmounts or file/dataUrl changes
    return () => {
      if (objectUrl) { // Only revoke if we created an object URL
         URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, dataUrl]);


  if (!previewUrl) {
    return <div className={`flex items-center justify-center bg-secondary-200 rounded-md ${className || 'h-48'}`}>
        <p className="text-secondary-500">No image selected</p>
      </div>;
  }

  return (
    <img
      src={previewUrl}
      alt={altText}
      className={className}
    />
  );
};

export default ImagePreview;