import React from 'react';
import PulseLogo from './PulseLogo';
import { RefreshCw, Copy, Check, ChevronDown, ChevronUp, LogOut } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PULSE ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  handleFullReset = () => {
    try {
      localStorage.removeItem('pulse_session_user');
      localStorage.removeItem('pulse_session');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  handleCopyError = () => {
    const errorText = this.state.error?.stack || this.state.error?.message || String(this.state.error);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error || 'Unknown Error');

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-4 shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <PulseLogo size={48} />
          </div>
          <h1 className="text-lg font-bold font-mono tracking-wider mb-2">PULSE PROTOCOL</h1>
          <p className="text-xs text-neutral-400 max-w-xs mb-4 leading-relaxed">
            حدث خطأ أثناء تحميل الواجهة. تم تأمين بياناتك بالكامل.
            <br />
            <span className="text-[10px] text-neutral-500 font-mono">
              An unexpected interface error was contained safely.
            </span>
          </p>

          {/* Technical Diagnostics Box */}
          <div className="w-full max-w-md mb-6 bg-[#0E0E10] border border-white/10 rounded-2xl p-3 text-left">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span className="text-rose-400 font-semibold truncate max-w-[200px]">{errorMessage}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={this.handleCopyError}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 flex items-center gap-1 text-[10px]"
                  title="نسخ تفاصيل الخطأ"
                >
                  {this.state.copied ? <Check size={11} className="text-white" /> : <Copy size={11} />}
                  <span>{this.state.copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300"
                >
                  {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {this.state.showDetails && (
              <pre className="mt-2 text-[10px] font-mono text-neutral-400 overflow-x-auto whitespace-pre-wrap max-h-36 p-2 bg-black/60 rounded-xl border border-white/5">
                {this.state.error?.stack || errorMessage}
              </pre>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-all shadow-lg"
            >
              <RefreshCw size={14} />
              <span>إعادة التحميل والمتابعة</span>
            </button>
            <button
              onClick={this.handleFullReset}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-white font-medium text-xs tap-press transition-all"
            >
              <LogOut size={13} />
              <span>تسجيل الخروج والبدء من جديد</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
