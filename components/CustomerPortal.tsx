import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithFacebook, setupRecaptcha, signInWithPhone } from '../firebase';
import { ConfirmationResult } from 'firebase/auth';

const CustomerPortal: React.FC<{
  onLoginSuccess: (user: {email: string, name: string}) => void;
}> = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [isLogin, setIsLogin] = useState(true);
  
  // Email states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Phone states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [phoneName, setPhoneName] = useState('');

  const [error, setError] = useState('');
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  useEffect(() => {
    try {
      setupRecaptcha('recaptcha-container');
    } catch (e) {
      console.warn("Recaptcha setup failed", e);
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('IDENTIFICATION & SECURITY KEY REQUIRED.');
      return;
    }
    if (!isLogin && !name) {
      setError('ENTITY NAME REQUIRED FOR REGISTRATION.');
      return;
    }
    // Mock successful authentication for now
    onLoginSuccess({ email, name: isLogin ? 'User' : name });
  };

  const handleSendCode = async () => {
    setError('');
    setIsPhoneLoading(true);
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      const formatPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const confirmation = await signInWithPhone(formatPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error("Phone Code Send Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('PHONE_AUTH_NOT_ENABLED: Please enable Phone Authentication in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('INVALID_PHONE_NUMBER: Please enter a valid international phone number.');
      } else {
        setError(err.message || 'PHONE_VERIFICATION_FAILURE: ACCESS DENIED');
      }

      // Fix for "reset is not a function"
      if ((window as any).recaptchaVerifier && typeof (window as any).recaptchaVerifier.clear === 'function') {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
          setupRecaptcha('recaptcha-container');
        } catch (clearErr) {
          console.warn("Recaptcha clear/reset failed", clearErr);
        }
      }
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setIsPhoneLoading(true);
    try {
      if (confirmationResult) {
        const result = await confirmationResult.confirm(verificationCode);
        if (result.user) {
           const generatedEmail = result.user.phoneNumber ? `${result.user.phoneNumber}@phone.user` : 'unknown@phone.user';
           onLoginSuccess({ email: result.user.email || generatedEmail, name: isLogin ? 'Phone User' : phoneName || 'Phone User' });
        }
      }
    } catch (err: any) {
       setError(err.message || 'CODE_VERIFICATION_FAILURE: INVALID CODE');
    } finally {
      setIsPhoneLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setError('');
    setIsSocialLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        onLoginSuccess({ email: user.email, name: user.displayName || 'Google User' });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('GOOGLE_LOGIN_NOT_ENABLED: Please enable Google Sign-In in your Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('GOOGLE_LOGIN_CANCELLED: Authentication window was closed.');
      } else {
        setError(err.message || 'GOOGLE_AUTH_FAILURE: ACCESS DENIED');
      }
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    setIsSocialLoading(true);
    try {
      const user = await signInWithFacebook();
      if (user && user.email) {
        onLoginSuccess({ email: user.email, name: user.displayName || 'Facebook User' });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('FACEBOOK_LOGIN_NOT_ENABLED: Please enable Facebook Sign-In in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('FACEBOOK_LOGIN_CANCELLED: Authentication window was closed.');
      } else {
        setError(err.message || 'FACEBOOK_AUTH_FAILURE: ACCESS DENIED');
      }
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-20 animate-in fade-in duration-700">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-0 border border-zinc-800 bg-black overflow-hidden relative">
        <div className="absolute top-0 w-full h-1 bg-[#0055ff] z-10"></div>
        
        {/* Visual/Branding Side */}
        <div className="hidden md:flex md:w-1/2 bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
          <div className="relative z-10 space-y-4">
            <h1 className="text-5xl font-black heading-font italic uppercase tracking-tighter">
              URBAN<br />
              <span className="text-[#0055ff]">IDENTITY</span>
            </h1>
            <p className="text-zinc-500 font-mono text-xs max-w-sm leading-relaxed">
              Global streetwear infrastructure. Authenticate to access exclusive drops, manage orders, and track your international shipments.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 text-[9px] font-black uppercase text-zinc-600 font-mono">
            <div className="border-t border-zinc-800 pt-2">Secure Protocol: Active</div>
            <div className="border-t border-zinc-800 pt-2">Global Shipping: Ready</div>
            <div className="border-t border-zinc-800 pt-2">Member Pricing: Verified</div>
            <div className="border-t border-zinc-800 pt-2">Early Access: Enable</div>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 md:p-12 font-mono flex flex-col justify-center">
          <div className="space-y-6 max-w-sm w-full mx-auto">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black uppercase tracking-widest text-[#0055ff]">
                {isLogin ? 'SYSTEM_LOGIN' : 'CLIENT_REGISTRATION'}
              </h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                {isLogin ? 'Enter credentials to proceed' : 'Establish new identity'}
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button" 
                  onClick={handleGoogleLogin} 
                  disabled={isSocialLoading}
                  className="bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  title="Sign in with Google"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
                <button 
                  type="button" 
                  onClick={handleFacebookLogin} 
                  disabled={isSocialLoading}
                  className="bg-[#1877F2] text-white py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#1877F2]/80 transition-colors disabled:opacity-50"
                  title="Sign in with Facebook"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
              </div>

              <div className="relative pt-4 pb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  <span className="bg-black px-4">OR_MANUAL_ENTRY</span>
                </div>
              </div>
            </div>

            <div className="flex border-b border-zinc-800 mb-6">
              <button 
                className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-colors ${authMethod === 'EMAIL' ? 'text-[#0055ff] border-b-2 border-[#0055ff]' : 'text-zinc-500 hover:text-white'}`}
                onClick={() => { setAuthMethod('EMAIL'); setError(''); setConfirmationResult(null); }}
              >
                EMAIL
              </button>
              <button 
                className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-colors ${authMethod === 'PHONE' ? 'text-[#0055ff] border-b-2 border-[#0055ff]' : 'text-zinc-500 hover:text-white'}`}
                onClick={() => { setAuthMethod('PHONE'); setError(''); }}
              >
                PHONE
              </button>
            </div>

            <div id="recaptcha-container"></div>

            {authMethod === 'EMAIL' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Legal Entity Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all"
                      placeholder="FULL NAME"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Network Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all"
                    placeholder="EMAIL@DOMAIN.COM"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security Key</label>
                    {isLogin && <button type="button" className="text-[9px] text-zinc-600 hover:text-[#0055ff] transition-colors leading-none uppercase">Forgot_Key?</button>}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff] tracking-[0.2em] transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="w-full bg-[#0055ff] text-white py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors">
                  {isLogin ? 'Process_Authentication' : 'Initialize_Registration'}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                {!isLogin && !confirmationResult && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entity Name</label>
                    <input
                      type="text"
                      value={phoneName}
                      onChange={(e) => setPhoneName(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all"
                      placeholder="FULL NAME"
                    />
                  </div>
                )}
                {!confirmationResult ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all"
                        placeholder="+1234567890"
                      />
                    </div>
                    <button 
                      onClick={handleSendCode} 
                      disabled={isPhoneLoading || !phoneNumber} 
                      className="w-full bg-[#0055ff] text-white py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                    >
                       {isPhoneLoading ? 'Requesting...' : 'Send_Verification_Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Verification Code</label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] tracking-[0.5em] text-center transition-all"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                    <button 
                      onClick={handleVerifyCode} 
                      disabled={isPhoneLoading || verificationCode.length !== 6} 
                      className="w-full bg-emerald-500 text-white py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                    >
                       {isPhoneLoading ? 'Verifying...' : 'Verify_Code'}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="text-center pt-2">
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); setConfirmationResult(null); }}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                type="button"
              >
                {isLogin ? 'Require an account? [REGISTER]' : 'Already established? [LOGIN]'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
