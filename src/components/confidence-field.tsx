"use client";

interface ConfidenceFieldProps {
  label: string;
  confidence?: number;
  required?: boolean;
  children: React.ReactNode;
}

export function ConfidenceField({
  label,
  confidence,
  required,
  children,
}: ConfidenceFieldProps) {
  const isLowConfidence = confidence !== undefined && confidence < 85;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {confidence !== undefined && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              isLowConfidence
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {confidence}%
          </span>
        )}
      </div>
      <div
        className={
          isLowConfidence
            ? "ring-2 ring-yellow-400 rounded-md"
            : ""
        }
      >
        {children}
      </div>
    </div>
  );
}
