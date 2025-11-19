/**
 * Sign In Page
 *
 * Custom authentication page for Yggdrasil.
 * Replaces NextAuth's default sign-in page with our branded UI.
 *
 * Features:
 * - Email/password authentication (local)
 * - AWS Cognito authentication (production)
 * - Error handling and display
 * - Redirect after sign in
 * - "Remember me" functionality
 */

"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get callback URL (where to redirect after sign in)
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Get error from URL (if redirected from error page)
  const urlError = searchParams.get("error");

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Attempt sign in with credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // Don't redirect automatically
        callbackUrl,
      });

      if (result?.error) {
        // Sign in failed
        setError("Invalid email or password");
        setIsLoading(false);
      } else if (result?.ok) {
        // Sign in successful - redirect to callback URL
        router.push(callbackUrl);
        router.refresh(); // Refresh to update session
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  /**
   * Handle Cognito sign in
   */
  const handleCognitoSignIn = async () => {
    setIsLoading(true);
    await signIn("cognito", { callbackUrl });
  };

  /**
   * Get error message from URL error code
   */
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "CredentialsSignin":
        return "Invalid email or password";
      case "OAuthSignin":
        return "Error signing in with OAuth provider";
      case "OAuthCallback":
        return "Error processing OAuth callback";
      case "OAuthCreateAccount":
        return "Could not create account with OAuth provider";
      case "EmailCreateAccount":
        return "Could not create account with email";
      case "Callback":
        return "Error in callback";
      case "OAuthAccountNotLinked":
        return "This email is already registered with a different provider";
      case "EmailSignin":
        return "Check your email for the sign in link";
      case "SessionRequired":
        return "Please sign in to access this page";
      default:
        return null;
    }
  };

  const errorMessage = error || getErrorMessage(urlError);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Logo and title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Yggdrasil</h1>
          <p className="text-gray-600">Family Tree Builder</p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Demo credentials notice */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-semibold mb-1">Demo Credentials:</p>
          <p>Email: demo@yggdrasil.local</p>
          <p>Password: demo123</p>
        </div>

        {/* Sign in form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {/* Password input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* OAuth providers */}
        <div className="space-y-3">
          {/* Cognito button (only show if configured) */}
          {process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID && (
            <button
              onClick={handleCognitoSignIn}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Sign in with AWS Cognito
            </button>
          )}
        </div>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Sign up
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
