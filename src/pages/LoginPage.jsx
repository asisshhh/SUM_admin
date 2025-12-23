import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Mail, Phone, LogIn } from "lucide-react";
import logo from "../assets/logo.webp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasNavigated = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user?.id && !hasNavigated.current) {
      hasNavigated.current = true;
      if (user.role === "DOCTOR") {
        navigate("/doctor-dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } else if (!user?.id) {
      // Reset ref when user logs out
      hasNavigated.current = false;
    }
  }, [user?.id, user?.role, navigate]);

  const isEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const isPhone = (value) => {
    return /^[0-9]{10}$/.test(value);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!identifier.trim()) {
      setError("Please enter your email or phone number");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password");
      setIsLoading(false);
      return;
    }

    try {
      const loginData = { password };

      if (isEmail(identifier)) {
        loginData.email = identifier.trim().toLowerCase();
      } else if (isPhone(identifier)) {
        loginData.phone = identifier.trim();
      } else {
        setError("Please enter a valid email or 10-digit phone number");
        setIsLoading(false);
        return;
      }

      const result = await login(loginData);

      // Redirect based on role
      if (result.user.role === "DOCTOR") {
        navigate("/doctor-dashboard");
      } else {
        navigate("/");
      }
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="SUM Ultimate Medicare"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-600">
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <form onSubmit={submit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span className="text-red-500">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email/Phone Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {isEmail(identifier) ? (
                    <Mail className="text-slate-400" size={20} />
                  ) : (
                    <Phone className="text-slate-400" size={20} />
                  )}
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or phone number"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-800"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-800"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isLoading}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500 mb-2">
              Secure access to SUM Ultimate Medicare Admin Panel
            </p>
            <div className="flex items-center justify-center gap-3 text-xs">
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="/terms-of-use"
                className="text-purple-600 hover:text-purple-700 hover:underline transition-colors">
                Terms of Use
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="/refund-policy"
                className="text-orange-600 hover:text-orange-700 hover:underline transition-colors">
                Refund Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
