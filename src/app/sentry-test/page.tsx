"use client";

import { useState } from "react";

export default function SentryTestPage() {
  const [error, setError] = useState<string | null>(null);

  const triggerClientError = () => {
    // This will throw an error and be caught by Sentry
    throw new Error("Sentry client-side test error - integration is working!");
  };

  const triggerAsyncError = async () => {
    try {
      // Simulate an async error
      await Promise.reject(new Error("Sentry async error test"));
    } catch (err) {
      setError("Async error triggered - check Sentry dashboard");
      throw err;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Sentry Test Page</h1>

        <p className="text-gray-600 mb-6">
          Click the buttons below to trigger test errors and verify Sentry is capturing them.
        </p>

        <div className="space-y-4">
          <button
            onClick={triggerClientError}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Trigger Client Error
          </button>

          <button
            onClick={triggerAsyncError}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Trigger Async Error
          </button>

          <a
            href="/api/sentry-test"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition text-center"
          >
            Trigger Server Error
          </a>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
            {error}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            After triggering an error, check your Sentry dashboard at:{" "}
            <a
              href="https://luma-comply.sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              luma-comply.sentry.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
