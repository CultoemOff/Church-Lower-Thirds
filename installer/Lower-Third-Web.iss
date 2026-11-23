#define MyAppName "Lower Third Web"
; Version comes from package.json via ISCC /DMyAppVersion=... (see the workflow).
#ifndef MyAppVersion
  #define MyAppVersion "0.0.0-dev"
#endif
#define MyAppPublisher "Culto em Off"

[Setup]
AppId={{13D055BB-63D1-484E-820B-004089D86007}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Lower Third Web
DefaultGroupName=Lower Third Web
; Per-user install: no administrator password needed.
PrivilegesRequired=lowest
OutputDir=output
OutputBaseFilename=Lower-Third-Web-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}
SetupIconFile=..\assets\lower-third-web.ico
UninstallDisplayIcon={app}\lower-third-web.ico
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "..\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\lower-third-web.ico"; DestDir: "{app}"; Flags: ignoreversion
; Used by PrepareToInstall to stop a running server before files are replaced.
Source: "..\package\stop-server.ps1"; Flags: dontcopy

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Atalhos:"

[Icons]
Name: "{autodesktop}\Lower Third Web"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\lower-third-web.ico"; Tasks: desktopicon
Name: "{group}\Lower Third Web"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\lower-third-web.ico"

[Registry]
; Starts with Windows, hidden, so the OBS dock and the browser source always find it.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Lower Third Web"; ValueData: """{sys}\wscript.exe"" ""{app}\start-server.vbs"""; Flags: uninsdeletevalue

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-server.ps1"" -AppDir ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "StopLowerThirdServer"

[Run]
; Always start the server (silent installs too); opening the page is optional.
Filename: "{sys}\wscript.exe"; Parameters: """{app}\start-server.vbs"""; Flags: nowait
Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; Flags: nowait postinstall skipifsilent; Description: "Abrir as configurações do Lower Third Web (com o passo a passo do OBS)"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Result := '';
  ExtractTemporaryFile('stop-server.ps1');
  Exec('powershell.exe',
    '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{tmp}\stop-server.ps1') + '" -AppDir "' + ExpandConstant('{app}') + '"',
    '', SW_HIDE, ewWaitUntilTerminated, Code);
end;
