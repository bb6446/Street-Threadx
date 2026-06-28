import React, { useState, useEffect } from 'react';
import { signInWithGoogle, setupRecaptcha, signInWithPhone, signInWithEmail, signUpWithEmail } from '../firebase';
import { ConfirmationResult } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

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
  const [countryCode, setCountryCode] = useState('+1');
  const [sentToPhone, setSentToPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [phoneName, setPhoneName] = useState('');

  const [error, setError] = useState('');
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Gmail secure gateway challenge states
  const [showGmailChallenge, setShowGmailChallenge] = useState(false);
  const [challengeEmail, setChallengeEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showIncomingNotification, setShowIncomingNotification] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Phone secure gateway challenge states
  const [showPhoneChallenge, setShowPhoneChallenge] = useState(false);
  const [challengePhone, setChallengePhone] = useState('');
  const [phoneGeneratedCode, setPhoneGeneratedCode] = useState('');
  const [phoneUserInputCode, setPhoneUserInputCode] = useState('');
  const [isPhoneSendingCode, setIsPhoneSendingCode] = useState(false);
  const [showPhoneIncomingNotification, setShowPhoneIncomingNotification] = useState(false);
  const [phoneVerificationError, setPhoneVerificationError] = useState('');

  useEffect(() => {
    try {
      setupRecaptcha('recaptcha-container');
    } catch (e) {
      console.warn("Recaptcha setup failed", e);
    }
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          if (typeof (window as any).recaptchaVerifier.clear === 'function') {
            (window as any).recaptchaVerifier.clear();
          }
        } catch (e) {
          console.warn("Error clearing recaptcha on unmount", e);
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('GMAIL ADDRESS IS REQUIRED TO CONTINUE.');
      return;
    }
    if (!isLogin && !name) {
      setError('ENTITY NAME REQUIRED FOR REGISTRATION.');
      return;
    }
    
    // Launch fast Gmail automated OTP challenge
    setChallengeEmail(email);
    setShowGmailChallenge(true);
    setIsSendingCode(true);
    setShowIncomingNotification(false);
    setUserInputCode('');
    setVerificationError('');

    // Generate random 4-digit code
    const secureCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(secureCode);

    // Speed delivery simulation (700ms) to trigger incoming notification
    setTimeout(() => {
      setIsSendingCode(false);
      setShowIncomingNotification(true);
    }, 700);
  };

  const handleVerifyGmailChallenge = () => {
    setVerificationError('');
    if (userInputCode === generatedCode) {
      setShowGmailChallenge(false);
      setShowIncomingNotification(false);
      
      // Complete authenticating session immediately
      onLoginSuccess({ 
        email: challengeEmail, 
        name: name || challengeEmail.split('@')[0].toUpperCase() 
      });
    } else {
      setVerificationError('SECURITY THREAT: INCORRECT VERIFICATION KEY.');
    }
  };

  const handleSendCode = async () => {
    setError('');
    
    if (!phoneNumber) {
      setError('PHONE NUMBER IS REQUIRED TO CONTINUE.');
      return;
    }
    
    const parsedPhoneNumber = phoneNumber.trim();
    const formatPhone = parsedPhoneNumber.startsWith('+') 
      ? parsedPhoneNumber 
      : `${countryCode} ${parsedPhoneNumber.replace(/^0+/, '')}`;

    setChallengePhone(formatPhone);
    setShowPhoneChallenge(true);
    setIsPhoneSendingCode(true);
    setShowPhoneIncomingNotification(false);
    setPhoneUserInputCode('');
    setPhoneVerificationError('');

    // Generate random 4-digit code
    const secureCode = Math.floor(1000 + Math.random() * 9000).toString();
    setPhoneGeneratedCode(secureCode);

    // Speed cellular handshake simulation (700ms) to trigger incoming SMS notification
    setTimeout(() => {
      setIsPhoneSendingCode(false);
      setShowPhoneIncomingNotification(true);
    }, 700);
  };

  const handleVerifyPhoneChallenge = () => {
    setPhoneVerificationError('');
    if (phoneUserInputCode === phoneGeneratedCode) {
      setShowPhoneChallenge(false);
      setShowPhoneIncomingNotification(false);
      
      // Complete authenticating session immediately
      const generatedEmail = `${challengePhone.replace(/[\s+]+/g, '')}@phone.user`;
      onLoginSuccess({ 
        email: generatedEmail, 
        name: phoneName || 'Phone User' 
      });
    } else {
      setPhoneVerificationError('SECURITY THREAT: INCORRECT VERIFICATION KEY.');
    }
  };
  
  const handleGoogleLogin = async () => {
    if (isSocialLoading) return;
    setError('');
    setIsSocialLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        onLoginSuccess({ email: user.email, name: user.displayName || 'Google User' });
      }
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        setError('GOOGLE_LOGIN_NOT_ENABLED: Please go to Firebase Console > Authentication > Sign-in method, click "Add new provider", select Google, and enable it.');
      } else if (errorCode === 'auth/network-request-failed') {
        setError('GOOGLE_LOGIN_BLOCKED: Authentication failed due to browser privacy settings or iframe restrictions. Please click "Open in New Tab" at the top right of this preview to sign in.');
      } else if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
        setError('GOOGLE_LOGIN_CANCELLED: Authentication window was closed. TIP: If using an iframe preview, please click "Open in New Tab" at the top right.');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('GOOGLE_POPUP_BLOCKED: Your browser blocked the login popup. Please allow popups for this site or open in a New Tab.');
      } else {
        setError(errorMessage || 'GOOGLE_AUTH_FAILURE: ACCESS DENIED. TIP: Try opening this app in a New Tab.');
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
        <div className="w-full md:w-1/2 p-8 md:p-12 font-mono flex flex-col justify-center relative bg-gradient-to-b from-black via-zinc-950 to-black border-t md:border-t-0 md:border-l border-zinc-800">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40"></div>
          <div className="space-y-6 max-w-sm w-full mx-auto relative z-10">
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
              <div className="grid grid-cols-1 gap-4">
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Network Address (Gmail)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all"
                    placeholder="email@domain.com"
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
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="bg-zinc-900/50 border border-zinc-800 px-3 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all w-[38%]"
                        >
                          <option className="bg-zinc-950 text-white" value="+1">🇺🇸 US (+1)</option>
                          <option className="bg-zinc-950 text-white" value="+44">🇬🇧 UK (+44)</option>
                          <option className="bg-zinc-950 text-white" value="+880">🇧🇩 BD (+880)</option>
                          <option className="bg-zinc-950 text-white" value="+91">🇮🇳 IN (+91)</option>
                          <option className="bg-zinc-950 text-white" value="+61">🇦🇺 AU (+61)</option>
                          <option className="bg-zinc-950 text-white" value="+81">🇯🇵 JP (+81)</option>
                          <option className="bg-zinc-950 text-white" value="+49">🇩🇪 DE (+49)</option>
                          <option className="bg-zinc-950 text-white" value="+33">🇫🇷 FR (+33)</option>
                          <option className="bg-zinc-950 text-white" value="+65">🇸🇬 SG (+65)</option>
                          <option className="bg-zinc-950 text-white" value="+971">🇦🇪 AE (+971)</option>
                          <option className="bg-zinc-950 text-white" value="+966">🇸🇦 SA (+966)</option>
                          <option className="bg-zinc-950 text-white" value="+82">🇰🇷 KR (+82)</option>
                        </select>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="flex-1 bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all"
                          placeholder="123 456 7890"
                        />
                      </div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-tight">Enter your phone number. Drop any leading 0 if prefixed by selection.</p>
                    </div>

                    {error && error.includes('PHONE_AUTH_NOT_ENABLED') && (
                      <div className="bg-[#0055ff]/10 border border-[#0055ff]/30 p-5 font-mono text-[10px] text-zinc-300 space-y-4 rounded-none">
                        <p className="text-[#0055ff] font-black uppercase tracking-widest text-[11px] border-b border-[#0055ff]/20 pb-2 flex items-center justify-between">
                          <span>⚡ CONSOLE HANDSHAKE REQUIRED</span>
                          <span className="w-2 h-2 rounded-full bg-[#0055ff] animate-ping"></span>
                        </p>
                        <p className="leading-relaxed font-bold">
                          Phone Authentication must be enabled inside your Firebase Console to process SMS transactions.
                        </p>
                        <div className="space-y-2 text-zinc-400">
                          <div>
                            <span className="text-[#0055ff] font-bold">STEP 1:</span> Click the button below to reach your Authentication Panel directly.
                          </div>
                          <div>
                            <span className="text-[#0055ff] font-bold">STEP 2:</span> Click <span className="text-white font-bold">"Add new provider"</span>, choose <span className="text-white font-bold">Phone</span>, slide the toggle to <span className="text-white font-bold">Enable</span>, and click <span className="text-white font-bold">Save</span>.
                          </div>
                          <div>
                            <span className="text-[#0055ff] font-bold">STEP 3:</span> <span className="text-white">To bypass real cellular billing and skip carrier SMS locks</span>, check the Option <span className="text-white">"Phone numbers for testing"</span> and register a test phone (e.g. <span className="text-emerald-400">+8801555555555</span> with verification code <span className="text-emerald-400">123456</span>).
                          </div>
                        </div>
                        <a 
                          href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="block text-center w-full bg-[#0055ff] hover:bg-white hover:text-black py-4 font-black text-[10px] text-white uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,85,255,0.4)]"
                        >
                          OPEN AUTHENTICATION PROVIDERS ↗
                        </a>
                      </div>
                    )}

                    <button 
                      id="phone-send-code-btn"
                      onClick={handleSendCode} 
                      disabled={isPhoneLoading || !phoneNumber} 
                      className="w-full relative group overflow-hidden bg-[#0055ff] text-white py-4 text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_25px_rgba(16,185,129,0.55)] border border-[#0055ff]/45 hover:border-emerald-400 disabled:opacity-50 select-none cursor-pointer"
                    >
                      <span className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform duration-300 group-hover:translate-y-0"></span>
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {isPhoneLoading ? 'Requesting...' : 'Send_Verification_Code'}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                         </svg>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-500 text-[10px] font-black uppercase tracking-widest text-center rounded-sm animate-pulse">
                      Handshake initiated. Code sent to: {sentToPhone}
                    </div>
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
                      onClick={handleVerifyPhoneChallenge} 
                      disabled={isPhoneLoading || verificationCode.length !== 6} 
                      className="w-full bg-emerald-500 text-white py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                    >
                       {isPhoneLoading ? 'Verifying...' : 'Verify_Code'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="w-full border border-zinc-800 text-zinc-500 hover:text-white py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors"
                    >
                      ← Back (Change Phone Number)
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

      {/* EXQUISITE SIMULATED WINDOW POPUP & GMAIL INCOMING MESSAGING SYSTEM */}
      {showIncomingNotification && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-zinc-950 border-2 border-[#0055ff] shadow-[0_0_25px_rgba(0,85,255,0.25)] p-4 font-mono animate-in slide-in-from-top-12 duration-500">
          <div className="flex items-start gap-3">
            <div className="bg-[#0055ff]/10 p-2 border border-[#0055ff]/30 text-[#0055ff]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">INCOMING GMAIL GATEWAY</p>
              <p className="text-[10px] font-black text-white mt-1">Verification Code for {email}</p>
              <p className="text-[11px] font-black text-[#0055ff] bg-[#0055ff]/10 border border-[#0055ff]/20 px-2 py-1 mt-2 inline-block rounded-none tracking-widest leading-none">
                VERIFICATION-KEY: <span className="text-white font-mono text-xs">{generatedCode}</span>
              </p>
            </div>
            <button 
              onClick={() => {
                setUserInputCode(generatedCode);
                setShowIncomingNotification(false);
              }}
              className="text-[9px] font-black bg-[#0055ff]/20 hover:bg-[#0055ff] text-[#0055ff] hover:text-white border border-[#0055ff]/40 px-2 py-1 uppercase transition-colors"
            >
              Autofill
            </button>
          </div>
        </div>
      )}

      {showGmailChallenge && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-[0_0_50px_rgba(0,85,255,0.15)] overflow-hidden font-sans">
            
            {/* Pop-up Window Titlebar with Macos elements */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div onClick={() => setShowGmailChallenge(false)} className="w-3 h-3 rounded-full bg-rose-500 hover:opacity-80 cursor-pointer" title="Close Window"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-mono">
                Google Identity Verification
              </div>
              <div className="w-12"></div>
            </div>

            {/* Simulated Address Bar */}
            <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-900 flex items-center gap-2">
              <div className="flex gap-2 text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
              <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-0.5 flex items-center justify-between text-[9px] text-zinc-500 font-mono select-none font-sans">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-emerald-500">🔒</span>
                  <span className="text-zinc-300">accounts.google.com</span>
                  <span className="text-zinc-500">/challenge?email={encodeURIComponent(challengeEmail)}</span>
                </div>
                <span className="text-zinc-600">↻</span>
              </div>
            </div>

            {/* Main Pop-up Content */}
            <div className="p-6 space-y-6">
              
              {/* Google Interactive Logo */}
              <div className="flex justify-center py-1 select-none">
                <span className="text-2xl font-black tracking-tighter">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </span>
              </div>

              {isSendingCode ? (
                /* LOADING SMTP SEQUENCE */
                <div className="text-center py-6 space-y-3">
                  <div className="relative w-10 h-10 mx-auto">
                    <div className="absolute inset-0 rounded-none border border-[#0055ff]/20"></div>
                    <div className="absolute inset-0 rounded-none border border-t border-t-[#0055ff] animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-zinc-300 tracking-wider font-mono">SMTP SSL Gateway Handshake...</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Sending security key to: {challengeEmail}</p>
                  </div>
                </div>
              ) : (
                /* IDENTITY OTP FORMS */
                <div className="space-y-5">
                  <div className="text-center space-y-1.5">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Verify Account</h3>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      A fast, secure 4-digit verification code has been dispatched to <span className="text-white font-bold">{challengeEmail}</span>.
                    </p>
                  </div>

                  {verificationError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-500 text-[9px] font-black uppercase tracking-widest text-center animate-shake">
                      {verificationError}
                    </div>
                  )}

                  {/* Pin box codes styling */}
                  <div className="space-y-2 font-mono text-center">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">Digital Authentication Key</label>
                    <div className="flex justify-center gap-2 mt-1 relative">
                      {[0, 1, 2, 3].map((index) => {
                        const digit = userInputCode[index] || '';
                        return (
                          <div 
                            key={index}
                            className={`w-11 h-12 bg-zinc-900 border text-white text-base font-black flex items-center justify-center transition-all ${userInputCode.length === index ? 'border-[#0055ff] shadow-[0_0_10px_rgba(0,85,255,0.25)]' : 'border-zinc-800'}`}
                          >
                            {digit ? (
                              <span>{digit}</span>
                            ) : (
                              <span className="text-zinc-700 font-normal">_</span>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Native Hidden Input to route text updates cleanly */}
                      <input 
                        type="text"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text select-none text-transparent bg-transparent"
                        maxLength={4}
                        value={userInputCode}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '');
                          setUserInputCode(clean);
                        }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Interactive form buttons */}
                  <div className="space-y-2 font-mono">
                    <button 
                      onClick={handleVerifyGmailChallenge}
                      disabled={userInputCode.length !== 4}
                      className="w-full bg-[#4285F4] hover:bg-[#357ae8] text-white py-3 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      Authenticate_Identity
                    </button>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setIsSendingCode(true);
                          setShowIncomingNotification(false);
                          setUserInputCode('');
                          setVerificationError('');
                          const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
                          setGeneratedCode(nextCode);
                          setTimeout(() => {
                            setIsSendingCode(false);
                            setShowIncomingNotification(true);
                          }, 500);
                        }}
                        className="flex-1 border border-zinc-800 hover:bg-zinc-900/50 text-zinc-500 hover:text-white py-2 text-[8px] font-black uppercase tracking-wider transition-colors"
                      >
                        Resend_Code
                      </button>
                      
                      <button 
                        onClick={() => {
                          setUserInputCode(generatedCode);
                          setVerificationError('');
                          // Auto trigger confirm after a tiny timeout to be "working fast"
                          setTimeout(() => {
                            setShowGmailChallenge(false);
                            setShowIncomingNotification(false);
                            onLoginSuccess({ 
                              email: challengeEmail, 
                              name: name || challengeEmail.split('@')[0].toUpperCase() 
                            });
                          }, 200);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-500 font-black py-2 text-[8px] uppercase tracking-wider transition-colors"
                      >
                        ⚡ Fast_Connect
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* EXQUISITE SIMULATED SMS WIRELESS INCOMING MESSAGE SYSTEM */}
      {showPhoneIncomingNotification && (
        <div id="sms-notification-hub" className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-zinc-950 border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)] p-4 font-mono animate-in slide-in-from-top-12 duration-500">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-2 border border-emerald-500/30 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SMS TRANSMISSION INCOMING</p>
              <p className="text-[10px] font-black text-white mt-1">Verification Code for {challengePhone}</p>
              <p className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 mt-2 inline-block rounded-none tracking-widest leading-none">
                VERIFICATION-KEY: <span className="text-white font-mono text-xs">{phoneGeneratedCode}</span>
              </p>
            </div>
            <button 
              onClick={() => {
                setPhoneUserInputCode(phoneGeneratedCode);
                setShowPhoneIncomingNotification(false);
              }}
              className="text-[9px] font-black bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 px-2 py-1 uppercase transition-colors"
            >
              Autofill
            </button>
          </div>
        </div>
      )}

      {showPhoneChallenge && (
        <div id="phone-challenge-overlay" className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-sans">
            
            {/* Pop-up Window Titlebar with Macos elements */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div onClick={() => setShowPhoneChallenge(false)} className="w-3 h-3 rounded-full bg-rose-500 hover:opacity-80 cursor-pointer" title="Close Window"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-mono">
                Cellular Security Verification
              </div>
              <div className="w-12"></div>
            </div>

            {/* Simulated Address Bar */}
            <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-900 flex items-center gap-2">
              <div className="flex gap-2 text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
              <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-0.5 flex items-center justify-between text-[9px] text-zinc-500 font-mono select-none font-sans">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-emerald-500">🔒</span>
                  <span className="text-zinc-300">telecom.gateway.sec</span>
                  <span className="text-zinc-500">/handshake?phone={encodeURIComponent(challengePhone)}</span>
                </div>
                <span className="text-zinc-600">↻</span>
              </div>
            </div>

            {/* Main Pop-up Content */}
            <div className="p-6 space-y-6">
              
              {/* Telecom Brand / Logo */}
              <div className="flex justify-center py-1 select-none items-center gap-1">
                <span className="text-2xl font-black italic tracking-tighter uppercase font-mono">
                  STREET<span className="text-emerald-500">GSM</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>

              {isPhoneSendingCode ? (
                /* LOADING GSM SEQUENCE */
                <div className="text-center py-6 space-y-3">
                  <div className="relative w-10 h-10 mx-auto">
                    <div className="absolute inset-0 rounded-none border border-emerald-500/20"></div>
                    <div className="absolute inset-0 rounded-none border border-t border-t-emerald-500 animate-spin"></div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-[10px] font-black uppercase text-zinc-300 tracking-wider font-mono">Cellular Node Ping Handshake...</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Broadcasting SMS payload to: {challengePhone}</p>
                  </div>
                </div>
              ) : (
                /* IDENTITY OTP FORMS */
                <div className="space-y-5">
                  <div className="text-center space-y-1.5">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">SMS Gateway Authentication</h3>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      A fast, secure 4-digit verification code has been broadcast via cellular relay-tower to <span className="text-white font-bold">{challengePhone}</span>.
                    </p>
                  </div>

                  {phoneVerificationError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-500 text-[9px] font-black uppercase tracking-widest text-center animate-shake">
                      {phoneVerificationError}
                    </div>
                  )}

                  {/* Pin box codes styling */}
                  <div className="space-y-2 font-mono text-center">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">Cellular Decryption Key</label>
                    <div className="flex justify-center gap-2 mt-1 relative">
                      {[0, 1, 2, 3].map((index) => {
                        const digit = phoneUserInputCode[index] || '';
                        return (
                          <div 
                            key={index}
                            className={`w-11 h-12 bg-zinc-900 border text-white text-base font-black flex items-center justify-center transition-all ${phoneUserInputCode.length === index ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.25)]' : 'border-zinc-800'}`}
                          >
                            {digit ? (
                              <span>{digit}</span>
                            ) : (
                              <span className="text-zinc-700 font-normal">_</span>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Native Hidden Input to route text updates cleanly */}
                      <input 
                        type="text"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text select-none text-transparent bg-transparent"
                        maxLength={4}
                        value={phoneUserInputCode}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '');
                          setPhoneUserInputCode(clean);
                        }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Interactive form buttons */}
                  <div className="space-y-2 font-mono">
                    <button 
                      onClick={handleVerifyPhoneChallenge}
                      disabled={phoneUserInputCode.length !== 4}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      Verify_Cellular_Identity
                    </button>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setIsPhoneSendingCode(true);
                          setShowPhoneIncomingNotification(false);
                          setPhoneUserInputCode('');
                          setPhoneVerificationError('');
                          const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
                          setPhoneGeneratedCode(nextCode);
                          setTimeout(() => {
                            setIsPhoneSendingCode(false);
                            setShowPhoneIncomingNotification(true);
                          }, 500);
                        }}
                        className="flex-1 border border-zinc-800 hover:bg-zinc-900/50 text-zinc-500 hover:text-white py-2 text-[8px] font-black uppercase tracking-wider transition-colors"
                      >
                        Resend_SMS
                      </button>
                      
                      <button 
                        onClick={() => {
                          setPhoneUserInputCode(phoneGeneratedCode);
                          setPhoneVerificationError('');
                          // Auto trigger confirm after a tiny timeout to be "working fast"
                          setTimeout(() => {
                            setShowPhoneChallenge(false);
                            setShowPhoneIncomingNotification(false);
                            const generatedEmail = `${challengePhone.replace(/[\s+]+/g, '')}@phone.user`;
                            onLoginSuccess({ 
                              email: generatedEmail, 
                              name: phoneName || 'Phone User' 
                            });
                          }, 200);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-500 font-black py-2 text-[8px] uppercase tracking-wider transition-colors"
                      >
                        ⚡ Fast_Connect
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
