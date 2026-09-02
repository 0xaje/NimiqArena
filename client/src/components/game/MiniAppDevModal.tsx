import { useState, useEffect } from "react";
import {
  initializeNimiqMiniApp,
  runNimiqThreeRequests,
  getDeviceIdentifier,
  getHostLanguage,
  getNimiqProvider,
} from "@/lib/nimiq-miniapp";
import {
  X,
  Smartphone,
  Globe,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Key,
  Layers,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface MiniAppDevModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiniAppDevModal({ isOpen, onClose }: MiniAppDevModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isInsideApp, setIsInsideApp] = useState(false);
  const [hostLanguage, setHostLanguage] = useState<string>("en");
  const [benchmarkResult, setBenchmarkResult] = useState<{
    accounts?: string[];
    consensus?: boolean;
    blockNumber?: number;
    deviceId?: string;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [signMessageInput, setSignMessageInput] = useState("Nimiq Arena Match Verification");
  const [signResult, setSignResult] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    setHostLanguage(getHostLanguage() || navigator.language?.split("-")[0] || "en");
    setIsInsideApp(typeof window !== "undefined" && Boolean(window.nimiqPay || window.nimiq));

    // Initialize provider
    initializeNimiqMiniApp().then(res => {
      setIsInsideApp(res.isInsideNimiqPay);
      if (res.isInsideNimiqPay) {
        addLog("Connected to native Nimiq Pay provider.");
      } else {
        addLog("Running in standard browser. Nimiq Pay host provider is not injected.");
      }
    });
  }, [isOpen]);

  function addLog(msg: string) {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 30)]);
  }

  async function handleRunThreeRequests() {
    setIsRunning(true);
    addLog("Executing official Nimiq benchmark (listAccounts, isConsensusEstablished, getBlockNumber)...");
    try {
      const provider = getNimiqProvider();
      if (!provider) throw new Error("No provider ready");
      const res = await runNimiqThreeRequests(provider);
      setBenchmarkResult(prev => ({
        ...prev,
        accounts: res.accounts,
        consensus: res.consensus,
        blockNumber: res.blockNumber,
      }));
      addLog(`Accounts: ${JSON.stringify(res.accounts)}`);
      addLog(`Consensus Established: ${res.consensus}`);
      addLog(`Current Block Height: #${res.blockNumber.toLocaleString()}`);
      toast.success("Benchmark completed successfully");
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      toast.error("Benchmark failed", { description: err.message });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRequestDeviceId() {
    setIsRunning(true);
    addLog("Requesting pseudonymous device identifier from Nimiq Pay...");
    try {
      const id = await getDeviceIdentifier("Verify player device for tournament anti-sybil rating");
      setBenchmarkResult(prev => ({ ...prev, deviceId: id }));
      addLog(`Device Identifier: ${id}`);
      toast.success("Device identifier retrieved");
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      toast.error("Failed to get device ID", { description: err.message });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSignMessage() {
    setIsRunning(true);
    addLog(`Signing message: "${signMessageInput}"...`);
    try {
      const provider = getNimiqProvider() as any;
      if (!provider || typeof provider.sign !== "function") {
        throw new Error("sign method not supported on current provider");
      }
      const res = await provider.sign(signMessageInput);
      setSignResult(res);
      addLog(`Signature generated: ${res.signature?.slice(0, 24)}…`);
      toast.success("Message signed successfully");
    } catch (err: any) {
      addLog(`Sign Error: ${err.message}`);
      toast.error("Sign failed", { description: err.message });
    } finally {
      setIsRunning(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Nimiq Mini App SDK Inspector
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                  isInsideApp
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}>
                  {isInsideApp ? "Inside Nimiq Pay" : "Standard Web Browser"}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Authoritative Nimiq Mini App Provider & Host Inspector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Environment Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isInsideApp
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200"
              : "bg-amber-950/20 border-amber-800/40 text-amber-200"
          }`}>
            {isInsideApp ? (
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-sm">
                {isInsideApp
                  ? "Connected to Native Nimiq Pay Provider"
                  : "Standard Browser Environment (No Nimiq Pay Host)"}
              </div>
              <p className="text-neutral-300">
                {isInsideApp
                  ? `Host language: ${hostLanguage.toUpperCase()}. window.nimiq and window.nimiqPay are injected directly by Nimiq Pay.`
                  : "Nimiq Pay host is not present in standard desktop browsers. To test real wallet signing and transactions, open this app inside Nimiq Pay via your local IP (e.g. http://<lan-ip>:3000) using the Nimiq Pay Developer Menu."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleRunThreeRequests}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black transition shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              Run 3 Benchmark Requests
            </button>

            <button
              onClick={handleRequestDeviceId}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition disabled:opacity-50"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              Get Device Identifier
            </button>

            <button
              onClick={handleSignMessage}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition disabled:opacity-50"
            >
              <Key className="w-4 h-4 text-emerald-400" />
              Sign Message
            </button>
          </div>

          {/* Live Benchmark Cards */}
          {benchmarkResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Consensus</span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  {benchmarkResult.consensus ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Established</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400">Syncing</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Block Height</span>
                <div className="text-sm font-bold text-white font-mono">
                  #{benchmarkResult.blockNumber?.toLocaleString() ?? "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Account</span>
                <div className="text-xs font-mono text-neutral-300 truncate" title={benchmarkResult.accounts?.[0]}>
                  {benchmarkResult.accounts?.[0]
                    ? `${benchmarkResult.accounts[0].slice(0, 9)}…${benchmarkResult.accounts[0].slice(-5)}`
                    : "None"}
                </div>
              </div>
            </div>
          )}

          {/* Device ID Display */}
          {benchmarkResult?.deviceId && (
            <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-mono uppercase">Device Identifier (SHA-256)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(benchmarkResult.deviceId!);
                    toast.success("Device ID copied to clipboard");
                  }}
                  className="hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="text-xs font-mono text-amber-300/90 break-all select-all">
                {benchmarkResult.deviceId}
              </div>
            </div>
          )}

          {/* Sign Result Display */}
          {signResult && (
            <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="text-[11px] text-neutral-400 font-mono uppercase">Cryptographic Signature</div>
              <div className="text-xs font-mono text-emerald-300/90 break-all select-all">
                {signResult.signature}
              </div>
            </div>
          )}

          {/* Console Log Stream */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">SDK Output Log</div>
            <div className="bg-black/90 rounded-xl p-3 font-mono text-[11px] text-neutral-300 space-y-1 border border-neutral-800 h-36 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-neutral-500 italic">No output yet. Click any button above to test the SDK.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div>
            Dev URL: <code className="text-amber-400 font-mono">http://localhost:3000</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
