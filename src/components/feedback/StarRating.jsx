import React from "react";

export default function StarRating({ value, onChange, size = 22 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          onClick={() => onChange && onChange(star)}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={value >= star ? "orange" : "lightgray"}
          className="cursor-pointer"
          width={size}
          height={size}>
          <path d="M9.049.927L6.03 6.63.64 7.36c-.86.12-1.2 1.18-.58 1.78l4.17 4.06L3.96 18.7c-.15.86.75 1.5 1.47 1.1l5.28-2.78 5.28 2.78c.72.38 1.62-.24 1.47-1.1l-.27-1.51-.65-3.5 4.17-4.06c.63-.6.28-1.66-.58-1.78l-5.39-.73-3.02-5.7C10.3-.3 9.46-.3 9.05.93z" />
        </svg>
      ))}
    </div>
  );
}
