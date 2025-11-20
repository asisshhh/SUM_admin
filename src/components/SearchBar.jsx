import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search..."
}) {
  return (
    <div className="flex items-center border rounded-lg px-3 py-2 bg-white w-full">
      <Search size={18} className="text-slate-500" />
      <input
        type="text"
        className="ml-2 flex-1 outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
