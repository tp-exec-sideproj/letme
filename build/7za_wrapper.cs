using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class Program {
    static int Main(string[] args) {
        string dir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
        string real7za = Path.Combine(dir, "7za_real.exe");
        StringBuilder sb = new StringBuilder();
        foreach (string arg in args) {
            if (arg.Contains(" ")) sb.Append("\"" + arg + "\" ");
            else sb.Append(arg + " ");
        }
        var psi = new ProcessStartInfo(real7za, sb.ToString().Trim()) {
            UseShellExecute = false
        };
        var proc = Process.Start(psi);
        proc.WaitForExit();
        int code = proc.ExitCode;
        return code == 2 ? 0 : code;
    }
}
