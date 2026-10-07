import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if ((this.state as State).hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2 text-white">
              Recuperación del Sistema SMAE
            </h2>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Ocurrió un evento inesperado en la interfaz. La aplicación protegió sus datos para evitar pantallas en blanco.
            </p>
            {(this.state as State).error && (
              <div className="text-3xs text-left bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-rose-300 font-mono mb-6 max-h-28 overflow-y-auto break-words">
                {(this.state as State).error?.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar Pantalla</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
