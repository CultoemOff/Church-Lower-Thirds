' Desktop shortcut: makes sure the server runs (a second start exits by itself, the port
' is taken), then opens the settings page in the default browser.
Option Explicit
Dim shell, fso, appDir
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run """" & fso.BuildPath(shell.ExpandEnvironmentStrings("%SystemRoot%"), "System32\wscript.exe") & """ """ & fso.BuildPath(appDir, "start-server.vbs") & """", 0, False
WScript.Sleep 1500
shell.Run "http://127.0.0.1:8795/settings", 1, False
