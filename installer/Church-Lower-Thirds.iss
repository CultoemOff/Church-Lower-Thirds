#define MyAppName "Church Lower Thirds"
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
; Every Culto em Off program lives in its own subfolder of Program Files\Culto em Off.
DefaultDirName={autopf}\Culto em Off\Church Lower Thirds
DefaultGroupName=Culto em Off
; Program Files needs administrator rights. The program itself is shared by every account
; of the computer; each account keeps its own settings and files.
PrivilegesRequired=admin
; Always this folder, next to the other Culto em Off programs.
DisableDirPage=yes
UsePreviousAppDir=no
OutputDir=output
OutputBaseFilename=Church-Lower-Thirds-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}
SetupIconFile=..\assets\church-lower-thirds.ico
UninstallDisplayIcon={app}\church-lower-thirds.ico
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
ShowLanguageDialog=auto
; The installer stops the running program by itself (stop-server.ps1, see [Code]), by the
; path of its node.exe. Windows' Restart Manager is left out: it asks console programs to
; close with Ctrl+C, which reaches every program sharing that console.
CloseApplications=no

[Languages]
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "ptpt"; MessagesFile: "compiler:Languages\Portuguese.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"

[CustomMessages]
ptbr.FolderTitle=Pasta dos seus arquivos
ptbr.FolderSub=Onde ficam as configurações e os arquivos para o OBS Studio?
ptbr.FolderHelp=O Church Lower Thirds guarda nesta pasta as suas configurações, os nomes, as imagens e os arquivos que você adiciona como fonte no OBS Studio.%n%nO ideal é escolher um lugar fácil de achar na hora de apontar no OBS e que entre no seu backup, como Documentos ou uma pasta sincronizada (OneDrive, Google Drive).%n%nCada usuário do Windows tem a sua própria pasta e as suas próprias configurações: um não altera o que é do outro.
ptbr.Shortcuts=Atalhos:
ptbr.DesktopIcon=Criar atalho na área de trabalho
ptbr.OpenSettings=Abrir o Church Lower Thirds (com o passo a passo do OBS)
ptpt.FolderTitle=Pasta dos seus ficheiros
ptpt.FolderSub=Onde ficam as definições e os ficheiros para o OBS Studio?
ptpt.FolderHelp=O Church Lower Thirds guarda nesta pasta as suas definições, os nomes, as imagens e os ficheiros que adiciona como fonte no OBS Studio.%n%nO ideal é escolher um local fácil de encontrar quando o indicar no OBS e que faça parte da sua cópia de segurança, como Documentos ou uma pasta sincronizada (OneDrive, Google Drive).%n%nCada utilizador do Windows tem a sua própria pasta e as suas próprias definições: um não altera o que é do outro.
ptpt.Shortcuts=Atalhos:
ptpt.DesktopIcon=Criar atalho no ambiente de trabalho
ptpt.OpenSettings=Abrir o Church Lower Thirds (com o passo a passo do OBS)
es.FolderTitle=Carpeta de sus archivos
es.FolderSub=¿Dónde se guardan los ajustes y los archivos para OBS Studio?
es.FolderHelp=Church Lower Thirds guarda en esta carpeta sus ajustes, los nombres, las imágenes y los archivos que se añaden como fuente en OBS Studio.%n%nLo ideal es elegir un lugar fácil de encontrar al indicarlo en OBS y que entre en su copia de seguridad, como Documentos o una carpeta sincronizada (OneDrive, Google Drive).%n%nCada usuario de Windows tiene su propia carpeta y sus propios ajustes: uno no cambia lo del otro.
es.Shortcuts=Accesos directos:
es.DesktopIcon=Crear acceso directo en el escritorio
es.OpenSettings=Abrir Church Lower Thirds (con el paso a paso de OBS)
en.FolderTitle=Folder for your files
en.FolderSub=Where should the settings and the files for OBS Studio be kept?
en.FolderHelp=Church Lower Thirds keeps your settings, names, images and the files you add as sources in OBS Studio in this folder.%n%nIdeally choose a place that is easy to find when you point OBS at it and that is part of your backups, such as Documents or a synced folder (OneDrive, Google Drive).%n%nEach Windows user has their own folder and their own settings: one never changes another's.
en.Shortcuts=Shortcuts:
en.DesktopIcon=Create a desktop shortcut
en.OpenSettings=Open Church Lower Thirds (with the OBS step by step)
it.FolderTitle=Cartella dei tuoi file
it.FolderSub=Dove tenere le impostazioni e i file per OBS Studio?
it.FolderHelp=Church Lower Thirds conserva in questa cartella le impostazioni, i nomi, le immagini e i file da aggiungere come sorgente in OBS Studio.%n%nL'ideale è scegliere un posto facile da trovare quando lo si indica in OBS e incluso nel backup, come Documenti o una cartella sincronizzata (OneDrive, Google Drive).%n%nOgni utente di Windows ha la propria cartella e le proprie impostazioni: uno non modifica quelle dell'altro.
it.Shortcuts=Collegamenti:
it.DesktopIcon=Crea un collegamento sul desktop
it.OpenSettings=Apri Church Lower Thirds (con la guida passo passo per OBS)
de.FolderTitle=Ordner für Ihre Dateien
de.FolderSub=Wo sollen die Einstellungen und die Dateien für OBS Studio liegen?
de.FolderHelp=Church Lower Thirds legt in diesem Ordner Ihre Einstellungen, die Namen, die Bilder und die Dateien ab, die in OBS Studio als Quelle hinzugefügt werden.%n%nAm besten einen Ort wählen, der in OBS leicht zu finden ist und zur Datensicherung gehört, etwa Dokumente oder ein synchronisierter Ordner (OneDrive, Google Drive).%n%nJeder Windows-Benutzer hat seinen eigenen Ordner und seine eigenen Einstellungen: Keiner ändert die eines anderen.
de.Shortcuts=Verknüpfungen:
de.DesktopIcon=Desktop-Verknüpfung erstellen
de.OpenSettings=Church Lower Thirds öffnen (mit der Schritt-für-Schritt-Anleitung für OBS)

[Files]
Source: "..\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\church-lower-thirds.ico"; DestDir: "{app}"; Flags: ignoreversion
; Used by PrepareToInstall to stop a running server before files are replaced.
Source: "..\package\stop-server.ps1"; Flags: dontcopy

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:Shortcuts}"

[Icons]
Name: "{autodesktop}\Church Lower Thirds"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\church-lower-thirds.ico"; Tasks: desktopicon
Name: "{group}\Church Lower Thirds"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\church-lower-thirds.ico"

[Registry]
; Starts with Windows for whoever logs in, hidden, so the OBS dock and the browser sources
; always find it. Each account runs its own copy with its own settings.
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Church Lower Thirds"; ValueData: """{sys}\wscript.exe"" ""{app}\start-server.vbs"""; Flags: uninsdeletevalue

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-server.ps1"" -AppDir ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "StopLowerThirdServer"

[Run]
; Always start the server (silent installs too); opening the page is optional.
; runasoriginaluser: started as the person at the computer, not as the administrator whose
; password was typed, so the settings land in the right account.
Filename: "{sys}\wscript.exe"; Parameters: """{app}\start-server.vbs"" ""{code:FilesFolderArg}"""; Flags: nowait runasoriginaluser
Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; Flags: nowait postinstall skipifsilent runasoriginaluser; Description: "{cm:OpenSettings}"

[Code]
var
  FilesPage: TInputDirWizardPage;

function FromCodes(S: String): String;
var
  P: Integer;
begin
  Result := '';
  S := Trim(S) + ' ';
  while S <> '' do
  begin
    P := Pos(' ', S);
    if P > 1 then Result := Result + Chr(StrToIntDef(Copy(S, 1, P - 1), 63));
    Delete(S, 1, P);
  end;
end;

{ Setup runs elevated, maybe with another person's administrator password, so "my
  Documents" here could be the administrator's. What belongs to the person at the computer
  (their Documents, the folder they already use) is asked from a process started as that
  person. The answer comes back as character codes, so accents survive any code page. }
procedure AskOriginalUser(var Docs, Current: String);
var
  OutFile, Cmd: String;
  Lines: TArrayOfString;
  Code: Integer;
begin
  Docs := ExpandConstant('{userdocs}');
  Current := '';
  OutFile := ExpandConstant('{commondocs}\church-lower-thirds-setup.txt');
  DeleteFile(OutFile);
  Cmd := '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$codes = { param($t) (([string]$t).ToCharArray() | ForEach-Object { [int]$_ }) -join '' '' }; ' +
    '$c = ''''; try { $c = (Get-Content -Raw -Encoding UTF8 (Join-Path $env:APPDATA ''Church Lower Thirds\location.json'') | ConvertFrom-Json).folder } catch {}; ' +
    'Set-Content -Encoding ASCII -Path ''' + OutFile + ''' -Value @((& $codes ([Environment]::GetFolderPath(''MyDocuments''))), (& $codes $c))"';
  if ExecAsOriginalUser('powershell.exe', Cmd, '', SW_HIDE, ewWaitUntilTerminated, Code) and
    LoadStringsFromFile(OutFile, Lines) then
  begin
    if (GetArrayLength(Lines) > 0) and (FromCodes(Lines[0]) <> '') then Docs := FromCodes(Lines[0]);
    if GetArrayLength(Lines) > 1 then Current := FromCodes(Lines[1]);
  end;
  DeleteFile(OutFile);
end;

{ The person's own folder: settings, names, images and the OBS source files. Each Windows
  account has its own; the page starts on the folder this account already uses.
  Uninstalling never removes it. }
procedure InitializeWizard;
var
  Docs, Current: String;
begin
  FilesPage := CreateInputDirPage(wpSelectDir,
    ExpandConstant('{cm:FolderTitle}'), ExpandConstant('{cm:FolderSub}'),
    ExpandConstant('{cm:FolderHelp}'), False, 'Church Lower Thirds');
  FilesPage.Add('');
  AskOriginalUser(Docs, Current);
  if Current = '' then Current := AddBackslash(Docs) + 'Church Lower Thirds';
  { /FILES="D:\Folder" on the command line, for unattended installs. }
  if ExpandConstant('{param:FILES}') <> '' then Current := ExpandConstant('{param:FILES}');
  FilesPage.Values[0] := Current;
end;

{ Handed to the server started for the person at the computer (see [Run]). No trailing
  backslash: it would swallow the closing quote of the argument. }
function FilesFolderArg(Param: String): String;
begin
  Result := RemoveBackslashUnlessRoot(FilesPage.Values[0]);
  if (Result <> '') and (Result[Length(Result)] = '\') then Result := Result + '.';
end;

function LanguageCode: String;
begin
  Result := ActiveLanguage;
  if Result = 'ptbr' then Result := 'pt-BR'
  else if Result = 'ptpt' then Result := 'pt-PT';
end;

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

{ Machine-wide note, readable by every account: the language chosen here, used for the
  sample texts of a first run. The files folder is created by the program itself, running
  as the person at the computer, so it belongs to them. }
procedure CurStepChanged(CurStep: TSetupStep);
var
  Dir: String;
begin
  if CurStep <> ssInstall then Exit;
  Dir := ExpandConstant('{commonappdata}\Culto em Off\Church Lower Thirds');
  ForceDirectories(Dir);
  SaveStringsToUTF8File(Dir + '\install.json', ['{"language": "' + LanguageCode + '"}'], False);
end;
