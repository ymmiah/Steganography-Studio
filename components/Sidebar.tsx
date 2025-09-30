
import React from 'react';
import { HubMode } from '../types.ts';
import { ScanSearch, Lock, Hash, FileKey, Wrench, ShieldQuestion } from 'lucide-react';

interface SidebarProps {
  currentMode: HubMode;
  setMode: (mode: HubMode) => void;
}

const MODES = [
  { id: HubMode.AutoDecode, label: 'Universal Decoder', icon: ScanSearch, group: 'Analysis' },
  { id: HubMode.LSB, label: 'LSB', icon: Lock, group: 'Steganography' },
  { id: HubMode.PatternLSB, label: 'Pattern LSB', icon: Lock, group: 'Steganography' },
  { id: HubMode.MD5Pattern, label: 'MD5 Pattern', icon: Lock, group: 'Steganography' },
  { id: HubMode.RD, label: 'RD Pattern', icon: Lock, group: 'Steganography' },
  { id: HubMode.Morse, label: 'Morse Pattern', icon: Lock, group: 'Steganography' },
  { id: HubMode.HashingTools, label: 'Hashing Tools', icon: Hash, group: 'Crypto Tools' },
  { id: HubMode.MD5Cracker, label: 'MD5 Cracker', icon: FileKey, group: 'Crypto Tools' },
  { id: HubMode.Utilities, label: 'Utilities', icon: Wrench, group: 'Crypto Tools' },
];

const GROUP_ORDER = ['Analysis', 'Steganography', 'Crypto Tools'];

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  
  const groupedModes = GROUP_ORDER.map(group => ({
    name: group,
    items: MODES.filter(mode => mode.group === group)
  }));

  return (
    <nav className="w-64 bg-secondary-900 text-secondary-100 flex flex-col flex-shrink-0 h-screen">
      <div className="px-6 py-5 flex items-center border-b border-secondary-700">
        <ShieldQuestion className="w-8 h-8 mr-3 text-primary-400" />
        <h1 className="text-xl font-bold text-white">
          Steganography Studio
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="py-4">
          {groupedModes.map(group => (
            <li key={group.name} className="px-6 py-2">
              <h2 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">{group.name}</h2>
              <ul>
                {group.items.map(mode => (
                  <li key={mode.id}>
                    <button
                      onClick={() => setMode(mode.id)}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors my-1 ${
                        currentMode === mode.id
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'text-secondary-200 hover:bg-secondary-700 hover:text-white'
                      }`}
                    >
                      <mode.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{mode.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
