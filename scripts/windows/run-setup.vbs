' Runs the installer the program downloaded for an update (the "Update now" button).
'
' The program works hidden in the background, and Windows shows a permission request made
' from the background minimized, blinking on the taskbar, where it goes unnoticed. So this
' script first shows a small window on top of everything: the click on it puts the update
' in front, and the permission request of Windows then opens in front too, as it does
' after a double click on the installer.
'
' In:  CLT_RUN (installer), CLT_RUN_ARGS (its arguments), CLT_NOTE (text of the window),
'      CLT_ASK=0 (no window: automated tests), CLT_OUT (file for the reason of a failure).
' Out: 0 = installer started; 2 = the person cancelled; 1 = Windows did not start it.
Option Explicit
Dim shell, env, setup, args, note, why
Set shell = CreateObject("WScript.Shell")
Set env = shell.Environment("PROCESS")
setup = env("CLT_RUN")
args = env("CLT_RUN_ARGS")
note = env("CLT_NOTE")
If Len(setup) = 0 Then WScript.Quit 1
If Len(note) = 0 Then note = "The new version of Church Lower Thirds is ready to install. Click OK and then allow the installation when Windows asks."
If env("CLT_ASK") <> "0" Then
  If MsgBox(note, vbOKCancel + vbInformation + vbSystemModal, "Church Lower Thirds") <> vbOK Then WScript.Quit 2
End If

On Error Resume Next
' As a double click does: the installer starts as the person at the computer and asks
' Windows for administrator rights by itself.
shell.Run """" & setup & """ " & args, 1, False
If Err.Number = 0 Then WScript.Quit 0
why = Err.Description
Err.Clear
' Refused that way (some computers only run programs from here with administrator
' rights): ask Windows for the rights first.
CreateObject("Shell.Application").ShellExecute setup, args, "", "runas", 1
If Err.Number = 0 Then WScript.Quit 0
why = why & " / " & Err.Description
Err.Clear
If Len(env("CLT_OUT")) > 0 Then
  CreateObject("Scripting.FileSystemObject").CreateTextFile(env("CLT_OUT"), True, True).Write why
End If
WScript.Quit 1
