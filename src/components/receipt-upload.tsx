"use client";

import { useRef, useState } from "react";

interface ReceiptUploadProps {
  onFileSelected: (file: File) => void;
  loading?: boolean;
}

export function ReceiptUpload({ onFileSelected, loading }: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert("Datei ist zu groß. Maximal 20 MB.");
      return;
    }

    setSelectedFile(file);

    if (file.type === "application/pdf") {
      setIsPdf(true);
      setPreview("pdf");
    } else if (file.type.startsWith("image/")) {
      setIsPdf(false);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setIsPdf(false);
      setPreview(null);
    }
  }

  function handleUpload() {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  }

  return (
    <div className="space-y-4">
      {!preview ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <CameraIcon className="mb-3 h-10 w-10 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            Beleg fotografieren oder hochladen
          </span>
          <span className="mt-1 text-xs text-gray-500">
            JPG, PNG, HEIC oder PDF (max. 20 MB)
          </span>
        </button>
      ) : (
        <div className="relative">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
              <PdfIcon className="mb-3 h-12 w-12 text-red-500" />
              <p className="text-sm font-medium text-gray-700">
                {selectedFile?.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <img
              src={preview}
              alt="Beleg-Vorschau"
              className="w-full rounded-lg border border-gray-200 object-contain max-h-80"
            />
          )}
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setSelectedFile(null);
              setIsPdf(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-md hover:bg-gray-100"
          >
            <XIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Wird hochgeladen und analysiert...
            </span>
          ) : (
            "Beleg analysieren"
          )}
        </button>
      )}
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
