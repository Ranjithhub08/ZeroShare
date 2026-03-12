import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ placeholder = 'Search...', className = '', ...props }) => {
  return (
    <div className={`search-wrapper ${className}`}>
      <div className="search-icon-container">
        <Search size={16} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="search-input"
        {...props}
      />
    </div>
  );
};

export default SearchBar;
