
import React from 'react';

interface ToggleOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface InputModeToggleProps {
  options: ToggleOption[];
  currentValue: string;
  onSwitch: (value: string) => void;
  size?: 'sm' | 'md';
}

const InputModeToggle: React.FC<InputModeToggleProps> = ({ options, currentValue, onSwitch, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  };
  
  return (
    <div className="flex flex-wrap justify-start p-1 space-x-1 bg-secondary-200/70 rounded-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSwitch(opt.value)}
          aria-pressed={currentValue === opt.value}
          className={`font-medium rounded-md flex items-center justify-center transition-all duration-200 ${sizeClasses[size]} ${
            currentValue === opt.value
              ? 'bg-white text-primary-600 shadow-sm'
              : 'bg-transparent text-secondary-600 hover:bg-secondary-200/50'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
};

export default InputModeToggle;
