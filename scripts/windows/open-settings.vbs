' Desktop shortcut: makes sure the server runs (a second start exits by itself), then opens
' the settings page in the default browser. The port is 8795, or the one this account's
' server wrote down when another account of the computer was already using it.
Option Explicit
Dim shell, fso, appDir, note, text, re, found, port
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run """" & fso.BuildPath(shell.ExpandEnvironmentStrings("%SystemRoot%"), "System32\wscript.exe") & """ """ & fso.BuildPath(appDir, "start-server.vbs") & """", 0, False
WScript.Sleep 1500
port = "8795"
note = shell.ExpandEnvironmentStrings("%APPDATA%") & "\Church Lower Thirds\location.json"
On Error Resume Next
If fso.FileExists(note) Then
  text = fso.OpenTextFile(note, 1).ReadAll
  Set re = New RegExp
  re.Pattern = """port""\s*:\s*(\d+)"
  Set found = re.Execute(text)
  If found.Count > 0 Then port = found(0).SubMatches(0)
End If
On Error GoTo 0
shell.Run "http://127.0.0.1:" & port & "/settings", 1, False
