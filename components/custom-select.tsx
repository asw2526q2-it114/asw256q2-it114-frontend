"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  color?: string; // Hex color for the dot next to label
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select option",
  disabled = false,
  compact = false,
  className = "",
  ariaDescribedBy,
  ariaInvalid,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${compact ? "compact" : ""} ${
        isOpen ? "open" : ""
      } ${className}`}
    >
      <button
        id={id}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={`custom-select-trigger ${compact ? "compact" : ""}`}
      >
        <span className="custom-select-trigger-content">
          {selectedOption ? (
            <>
              {selectedOption.color && (
                <span
                  className="custom-select-dot"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="muted">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={compact ? 12 : 16} className="custom-select-chevron" />
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`custom-select-option ${compact ? "compact" : ""} ${
                  isSelected ? "selected" : ""
                }`}
              >
                {option.color && (
                  <span
                    className="custom-select-dot"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
