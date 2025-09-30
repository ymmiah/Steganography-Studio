
import React from 'react';
import { PasswordStrengthLevel, type PasswordStrengthResult } from '../types.ts';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  strength: PasswordStrengthResult | null;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
  if (!strength || strength.feedback.length === 0) {
    return null;
  }

  const { level, feedback } = strength;

  const levelInfo = {
    [PasswordStrengthLevel.TooWeak]: { text: 'Too Weak', color: 'bg-red-500', width: '10%' },
    [PasswordStrengthLevel.Weak]: { text: 'Weak', color: 'bg-orange-500', width: '25%' },
    [PasswordStrengthLevel.Medium]: { text: 'Medium', color: 'bg-yellow-500', width: '50%' },
    [PasswordStrengthLevel.Strong]: { text: 'Strong', color: 'bg-green-500', width: '75%' },
    [PasswordStrengthLevel.VeryStrong]: { text: 'Very Strong', color: 'bg-emerald-600', width: '100%' },
  };

  const currentLevel = levelInfo[level];

  return (
    <div className="mt-2 space-y-2">
      <div className="w-full bg-secondary-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-in-out ${currentLevel.color}`}
          style={{ width: currentLevel.width }}
        ></div>
      </div>
      <p className={`text-xs font-semibold ${
        level === PasswordStrengthLevel.TooWeak || level === PasswordStrengthLevel.Weak ? 'text-red-600' :
        level === PasswordStrengthLevel.Medium ? 'text-yellow-600' : 'text-green-600'
      }`}>
        Strength: {currentLevel.text}
      </p>
      <ul className="text-xs space-y-1">
        {feedback.map((item, index) => (
          <li key={index} className={`flex items-center ${
            item.type === 'error' ? 'text-red-600' : 
            item.type === 'suggestion' ? 'text-secondary-600' : 'text-green-600'
          }`}>
            {item.type === 'good' ? <Check className="w-3 h-3 mr-1.5 flex-shrink-0" /> : <X className="w-3 h-3 mr-1.5 flex-shrink-0" />}
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;