' Starts the Church Lower Thirds server, hidden, for the person logged in. Each Windows account
' runs its own copy with its own settings. The installer passes the folder chosen for the
' person's files as the first argument.
Option Explicit
Dim shell, fso, appDir, nodeExe, serverJs, extra
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = fso.BuildPath(appDir, "runtime\node.exe")
serverJs = fso.BuildPath(appDir, "app\dist\server\index.js")
extra = ""
If WScript.Arguments.Count > 0 Then
  If Len(WScript.Arguments(0)) > 0 Then extra = " --folder """ & WScript.Arguments(0) & """"
End If
shell.CurrentDirectory = fso.BuildPath(appDir, "app")
shell.Run """" & nodeExe & """ """ & serverJs & """" & extra, 0, False
