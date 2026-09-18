param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('attach','detach')]
  [string]$Mode,

  [Parameter(Mandatory=$true)]
  [string]$Hwnd
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class WorkerWBridge {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr childAfter, string className, string windowTitle);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr child, IntPtr newParent);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        IntPtr wParam,
        IntPtr lParam,
        uint fuFlags,
        uint uTimeout,
        out IntPtr lpdwResult
    );

    public static IntPtr FindWorkerW() {
        var progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return IntPtr.Zero;

        IntPtr result;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out result);

        IntPtr worker = IntPtr.Zero;
        EnumWindows((top, param) => {
            var defView = FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (defView != IntPtr.Zero) {
                worker = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
            }
            return worker == IntPtr.Zero;
        }, IntPtr.Zero);

        if (worker == IntPtr.Zero) {
            worker = FindWindowEx(IntPtr.Zero, IntPtr.Zero, "WorkerW", null);
        }
        return worker;
    }
}
"@

try {
    $handleValue = [UInt64]::Parse($Hwnd)
    $child = [IntPtr]([Int64]$handleValue)

    if ($Mode -eq 'detach') {
        [void][WorkerWBridge]::SetParent($child, [IntPtr]::Zero)
        Write-Output '{"ok":true,"mode":"detach"}'
        exit 0
    }

    $worker = [WorkerWBridge]::FindWorkerW()
    if ($worker -eq [IntPtr]::Zero) {
        Write-Output '{"ok":false,"error":"WORKERW_NOT_FOUND"}'
        exit 2
    }

    $previous = [WorkerWBridge]::SetParent($child, $worker)
    $lastError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()

    if ($previous -eq [IntPtr]::Zero -and $lastError -ne 0) {
        Write-Output ('{"ok":false,"error":"SETPARENT_FAILED","code":' + $lastError + '}')
        exit 3
    }

    Write-Output ('{"ok":true,"mode":"attach","worker":"' + $worker.ToInt64() + '"}')
    exit 0
}
catch {
    $safe = $_.Exception.Message.Replace('"','\"')
    Write-Output ('{"ok":false,"error":"EXCEPTION","message":"' + $safe + '"}')
    exit 4
}
