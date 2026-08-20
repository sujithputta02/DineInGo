/**
 * Two-Factor Authentication Settings Component
 *
 * Allows an admin to:
 *  - View current 2FA status
 *  - Set up 2FA (QR code + TOTP confirmation + backup codes)
 *  - Disable 2FA (requires current TOTP)
 *  - Regenerate backup codes (requires current TOTP)
 *  - Revoke all active sessions (bump tokenVersion)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Unlock, Smartphone,
  Key, RefreshCw, AlertTriangle, CheckCircle, Copy, LogOut
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  get2FAStatus, setup2FA, confirm2FASetup, disable2FA,
  regenerateBackupCodes, revokeAllSessions
} from '../utils/adminApi';

type Flow = 'idle' | 'setup' | 'confirm' | 'disable' | 'regenerate' | 'revoke';

function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [backupCount, setBackupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<Flow>('idle');
  const [actionLoading, setActionLoading] = useState(false);

  // Setup state
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Disable / regenerate state
  const [verifyCode, setVerifyCode] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await get2FAStatus();
      if (data.success) {
        setEnabled(data.twoFactorEnabled);
        setBackupCount(data.backupCodesRemaining || 0);
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Setup flow ──
  const startSetup = async () => {
    setActionLoading(true);
    setFlow('setup');
    try {
      const data = await setup2FA();
      if (data.success) {
        setQrCode(data.qrCode);
        setManualKey(data.manualEntryKey);
        setFlow('confirm');
        toast.info('Scan the QR code, then enter a 6-digit code to confirm.');
      } else {
        toast.error(data.message);
        setFlow('idle');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start 2FA setup');
      setFlow('idle');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (confirmCode.length !== 6) {
      toast.error('Enter a 6-digit code from your authenticator app');
      return;
    }
    setActionLoading(true);
    try {
      const data = await confirm2FASetup(confirmCode);
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setEnabled(true);
        setBackupCount(data.backupCodes.length);
        setConfirmCode('');
        setQrCode('');
        setManualKey('');
        toast.success('2FA enabled! Save your backup codes.');
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Disable flow ──
  const handleDisable = async () => {
    if (verifyCode.length < 4) {
      toast.error('Enter your current 6-digit code or a backup code');
      return;
    }
    setActionLoading(true);
    try {
      const data = await disable2FA(verifyCode);
      if (data.success) {
        setEnabled(false);
        setBackupCount(0);
        setVerifyCode('');
        setFlow('idle');
        toast.success('Two-factor authentication disabled.');
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Regenerate backup codes ──
  const handleRegenerate = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Enter your current 6-digit authenticator code');
      return;
    }
    setActionLoading(true);
    try {
      const data = await regenerateBackupCodes(verifyCode);
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setBackupCount(data.backupCodes.length);
        setVerifyCode('');
        toast.success('New backup codes generated!');
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate backup codes');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Revoke all sessions ──
  const handleRevokeSessions = async () => {
    setActionLoading(true);
    try {
      const data = await revokeAllSessions();
      if (data.success) {
        toast.success('All sessions revoked. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminRole');
          localStorage.removeItem('adminLoginTime');
          window.location.href = '/portal-secure-dino-x7b8w9v2q4m1n5p8r3t6y9';
        }, 1500);
      } else {
        toast.error(data.message);
        setActionLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke sessions');
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-5 border-b ${enabled ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        <div className="flex items-center gap-3">
          {enabled ? <ShieldCheck className="text-emerald-600" size={24} /> : <ShieldAlert className="text-amber-600" size={24} />}
          <div>
            <h3 className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
            <p className="text-sm text-slate-500">
              {enabled
                ? `Enabled — ${backupCount} backup code${backupCount !== 1 ? 's' : ''} remaining`
                : 'Not enabled — add an extra layer of security to your admin account'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Backup codes display (after setup or regenerate) */}
        <AnimatePresence>
          {showBackupCodes && backupCodes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-900 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Key className="text-amber-400" size={18} />
                <h4 className="text-white font-bold">Your Backup Codes</h4>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Save these in a secure password manager. Each code can be used once when you don't have your phone.
                They won't be shown again.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg px-3 py-2 text-center">
                    <code className="text-amber-400 font-mono font-bold text-sm">{code}</code>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <Copy size={14} /> Copy all codes
                </button>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="ml-auto text-xs text-slate-400 hover:text-white transition-colors"
                >
                  I've saved them →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Setup flow: QR code */}
        <AnimatePresence>
          {flow === 'confirm' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {qrCode && (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <details className="w-full">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      Can't scan? Enter this key manually
                    </summary>
                    <div className="mt-2 bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                      <code className="text-xs font-mono text-slate-700 flex-1 break-all">{manualKey}</code>
                      <button onClick={() => copyToClipboard(manualKey)} className="text-slate-400 hover:text-slate-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </details>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Lock size={16} className="inline mr-2" />
                  Enter 6-Digit Code from Your Authenticator App
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-center text-xl font-mono tracking-widest focus:border-red-500 focus:outline-none"
                  placeholder="••••••"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  disabled={actionLoading}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmSetup}
                  disabled={actionLoading || confirmCode.length !== 6}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <CheckCircle size={18} />}
                  Confirm & Enable 2FA
                </button>
                <button
                  onClick={() => { setFlow('idle'); setQrCode(''); setManualKey(''); setConfirmCode(''); }}
                  className="px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disable / Regenerate flow: code input */}
        <AnimatePresence>
          {(flow === 'disable' || flow === 'regenerate') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className={`rounded-xl p-4 ${flow === 'disable' ? 'bg-red-50' : 'bg-blue-50'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={flow === 'disable' ? 'text-red-600' : 'text-blue-600'} size={18} />
                  <p className={`text-sm font-semibold ${flow === 'disable' ? 'text-red-700' : 'text-blue-700'}`}>
                    {flow === 'disable'
                      ? 'Enter your current 6-digit authenticator code to disable 2FA.'
                      : 'Enter your current 6-digit authenticator code to generate new backup codes.'}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-center text-xl font-mono tracking-widest focus:border-red-500 focus:outline-none"
                placeholder="••••••"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                disabled={actionLoading}
              />
              <div className="flex gap-2">
                <button
                  onClick={flow === 'disable' ? handleDisable : handleRegenerate}
                  disabled={actionLoading || verifyCode.length !== 6}
                  className={`flex-1 py-3 text-white rounded-xl font-bold disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2 ${
                    flow === 'disable' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {actionLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : null}
                  {flow === 'disable' ? 'Disable 2FA' : 'Generate New Codes'}
                </button>
                <button
                  onClick={() => { setFlow('idle'); setVerifyCode(''); }}
                  className="px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons (idle state) */}
        {flow === 'idle' && (
          <div className="space-y-3">
            {!enabled ? (
              <button
                onClick={startSetup}
                disabled={actionLoading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone size={18} />
                Set Up Two-Factor Authentication
              </button>
            ) : (
              <>
                <button
                  onClick={() => setFlow('regenerate')}
                  disabled={actionLoading}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Regenerate Backup Codes ({backupCount} remaining)
                </button>
                <button
                  onClick={() => setFlow('disable')}
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-50 text-red-700 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
                >
                  <Unlock size={16} />
                  Disable 2FA
                </button>
              </>
            )}

            {/* Revoke all sessions */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleRevokeSessions}
                disabled={actionLoading}
                className="w-full py-3 text-amber-700 bg-amber-50 rounded-xl font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 border border-amber-200"
              >
                <LogOut size={16} />
                Revoke All Active Sessions
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Signs you out from all devices. Useful if you suspect unauthorized access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TwoFactorSettings;
