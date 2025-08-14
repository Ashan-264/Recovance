"use client";

import React, { useState } from "react";

interface UploadResult {
  success: boolean;
  message: string;
  records?: number;
}

export default function SleepDataUpload() {
  const [sleepFile, setSleepFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const parseCSV = (content: string): string[][] => {
    const lines = content.trim().split("\n");
    return lines
      .slice(1)
      .map((line) => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }

        result.push(current.trim());
        return result;
      })
      .filter((row) => row.length > 1 && row[0] !== "");
  };

  const handleUpload = async () => {
    if (!sleepFile) return;

    setUploading(true);
    setResult(null);

    try {
      const content = await sleepFile.text();
      const csvData = parseCSV(content);

      console.log("Parsed sleep CSV data:", csvData);

      const response = await fetch("/api/garmin/upload-sleep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvData }),
      });

      const responseData = await response.json();

      setResult({
        success: response.ok,
        message: responseData.message || responseData.error,
        records: responseData.records,
      });
    } catch (error) {
      console.error("Error uploading sleep data:", error);
      setResult({
        success: false,
        message: "Failed to upload sleep data",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        Upload Garmin Sleep Data
      </h3>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setSleepFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0cf2d0] file:text-[#111817] hover:file:bg-[#0ad4b8] file:cursor-pointer"
          />
          <p className="text-xs text-gray-400 mt-1">
            CSV format: Date, Avg Duration, Avg Bedtime, Avg Wake Time
          </p>
        </div>
        <button
          onClick={handleUpload}
          disabled={!sleepFile || uploading}
          className="px-4 py-2 bg-[#283937] text-white rounded-lg hover:bg-[#36514e] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            result.success
              ? "bg-green-900/20 border border-green-600/30 text-green-400"
              : "bg-red-900/20 border border-red-600/30 text-red-400"
          }`}
        >
          {result.message}
          {result.records && (
            <span className="ml-2">({result.records} records uploaded)</span>
          )}
        </div>
      )}
    </div>
  );
}
