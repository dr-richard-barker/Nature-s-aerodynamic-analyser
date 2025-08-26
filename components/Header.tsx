
import React from 'react';
import { WindIcon } from './icons/WindIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-base-200 shadow-md p-4 flex items-center space-x-4 h-[80px]">
      <div className="text-primary">
        <WindIcon className="w-10 h-10" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wider">Nature's Aerodynamics</h1>
        <p className="text-sm text-base-content">A User-Friendly CFD Modeling GUI</p>
      </div>
    </header>
  );
};

export default Header;
