import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function Home() {
  const session = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Yggdrasil</h1>
          <nav>
            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  Welcome, {session.user.name}
                </span>
                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/signin"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            Build Your Family Tree
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover your heritage, preserve your family history, and connect
            with your roots using Yggdrasil - the modern family tree builder.
          </p>

          {session ? (
            <Link
              href="/dashboard"
              className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex justify-center gap-4">
              <Link
                href="/auth/signin"
                className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="#features"
                className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors border-2 border-green-600"
              >
                Learn More
              </Link>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🌳</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Interactive Trees
            </h3>
            <p className="text-gray-600">
              Build beautiful, interactive family trees with an intuitive
              drag-and-drop interface.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Rich Profiles
            </h3>
            <p className="text-gray-600">
              Add photos, biographies, and important dates to preserve family
              stories for generations.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Private & Secure
            </h3>
            <p className="text-gray-600">
              Your family data is encrypted and stored securely on AWS with
              enterprise-grade protection.
            </p>
          </div>
        </div>

        {/* Demo Info */}
        {!session && (
          <div className="mt-16 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Try the Demo
            </h3>
            <p className="text-blue-700 mb-4">
              Sign in with demo credentials to explore a sample family tree:
            </p>
            <div className="bg-white rounded-lg p-4 inline-block">
              <p className="text-sm font-mono text-gray-700">
                Email: demo@yggdrasil.local
              </p>
              <p className="text-sm font-mono text-gray-700">
                Password: demo123
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-32 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>
            Built with Next.js, React, and AWS DynamoDB for the AWS Immersion
            Day
          </p>
        </div>
      </footer>
    </div>
  );
}
