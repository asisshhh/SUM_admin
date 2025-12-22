import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

/**
 * SearchableDropdown - A reusable dropdown component with search functionality
 * @param {Object} props
 * @param {string} value - Selected value
 * @param {Array} options - Array of {value, label} objects
 * @param {Function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {string|ReactNode} label - Label text or React node
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Whether dropdown is disabled
 * @param {number} maxHeight - Max height for dropdown list (default: 200px)
 * @param {Function} onBlur - Optional blur handler
 */
export default function SearchableDropdown({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  label,
  className = "",
  disabled = false,
  maxHeight = 200,
  onBlur
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find selected option (handle both string and number comparisons)
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  // Filter options based on search term
  const filteredOptions = options.filter((opt) =>
    opt.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
        // Call onBlur if provided
        if (onBlur) {
          onBlur();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onBlur]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm("");
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="text-sm text-slate-600 mb-1 block">{label}</div>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 text-left bg-white border border-slate-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between
          ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
        `}>
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded">
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                {searchTerm ? "No results found" : "No options available"}
              </div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full px-4 py-2 text-left text-sm hover:bg-blue-50
                        transition-colors
                        ${
                          String(value) === String(option.value)
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700"
                        }
                      `}>
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
