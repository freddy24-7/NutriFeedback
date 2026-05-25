// E2E-only mock — replaces html5-qrcode when VITE_E2E_TEST_MODE=true.
// Tests can trigger a simulated scan by calling window.__e2e_triggerScan(barcode).

type OnSuccessCallback = (text: string) => void;

export class Html5Qrcode {
  constructor(_id: string, _opts?: unknown) {}

  start(_constraint: unknown, _config: unknown, onSuccess: OnSuccessCallback): Promise<void> {
    (window as unknown as Record<string, unknown>)['__e2e_triggerScan'] = onSuccess;
    return Promise.resolve();
  }

  stop(): Promise<void> {
    return Promise.resolve();
  }

  get isScanning(): boolean {
    return true;
  }
}
