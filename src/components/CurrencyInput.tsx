import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils";

export const CurrencyInput = ({
  label,
  id,
  value,
  onChange,
  required,
  className,
  inputClassName,
}: {
  label?: string;
  id?: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
  className?: string;
  inputClassName?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(
    value ? value.toString().replace(".", ",") : ""
  );

  useEffect(() => {
    const currentNum = parseFloat(displayValue.replace(/\./g, "").replace(",", ".")) || 0;
    if (Math.abs(currentNum - value) > 0.001) {
      setDisplayValue(value ? value.toString().replace(".", ",") : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // allow digits and commas
    val = val.replace(/[^0-9,]/g, "");
    
    // ensure only one comma
    const parts = val.split(",");
    if (parts.length > 2) {
      val = parts[0] + "," + parts.slice(1).join("");
    }
    
    setDisplayValue(val);
    const numericValue = parseFloat(val.replace(",", ".")) || 0;
    onChange(numericValue);
  };

  const handleBlur = () => {
    const numericValue = parseFloat(displayValue.replace(",", ".")) || 0;
    setDisplayValue(
      numericValue > 0 
        ? numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\./g, "") 
        : ""
    );
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono"
        >
          {label}
          {required && (
            <span className="text-rose-500 ml-1" title="Campo obrigatório">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-slate-400 pointer-events-none">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          placeholder="0,00"
          className={cn("w-full bg-slate-50 text-slate-900 rounded-lg pl-8 pr-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono", inputClassName)}
        />
      </div>
    </div>
  );
};
