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
ShowLanguageDialog=auto

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
ptbr.FolderHelp=O Lower Third Web guarda nesta pasta as suas configurações, os nomes, as imagens e os arquivos que você adiciona como fonte no OBS Studio.%n%nO ideal é escolher um lugar fácil de achar na hora de apontar no OBS e que entre no seu backup, como Documentos ou uma pasta sincronizada (OneDrive, Google Drive).
ptbr.Shortcuts=Atalhos:
ptbr.DesktopIcon=Criar atalho na área de trabalho
ptbr.OpenSettings=Abrir o Lower Third Web (com o passo a passo do OBS)
ptpt.FolderTitle=Pasta dos seus ficheiros
ptpt.FolderSub=Onde ficam as definições e os ficheiros para o OBS Studio?
ptpt.FolderHelp=O Lower Third Web guarda nesta pasta as suas definições, os nomes, as imagens e os ficheiros que adiciona como fonte no OBS Studio.%n%nO ideal é escolher um local fácil de encontrar quando o indicar no OBS e que faça parte da sua cópia de segurança, como Documentos ou uma pasta sincronizada (OneDrive, Google Drive).
ptpt.Shortcuts=Atalhos:
ptpt.DesktopIcon=Criar atalho no ambiente de trabalho
ptpt.OpenSettings=Abrir o Lower Third Web (com o passo a passo do OBS)
es.FolderTitle=Carpeta de sus archivos
es.FolderSub=¿Dónde se guardan los ajustes y los archivos para OBS Studio?
es.FolderHelp=Lower Third Web guarda en esta carpeta sus ajustes, los nombres, las imágenes y los archivos que se añaden como fuente en OBS Studio.%n%nLo ideal es elegir un lugar fácil de encontrar al indicarlo en OBS y que entre en su copia de seguridad, como Documentos o una carpeta sincronizada (OneDrive, Google Drive).
es.Shortcuts=Accesos directos:
es.DesktopIcon=Crear acceso directo en el escritorio
es.OpenSettings=Abrir Lower Third Web (con el paso a paso de OBS)
en.FolderTitle=Folder for your files
en.FolderSub=Where should the settings and the files for OBS Studio be kept?
en.FolderHelp=Lower Third Web keeps your settings, names, images and the files you add as sources in OBS Studio in this folder.%n%nIdeally choose a place that is easy to find when you point OBS at it and that is part of your backups, such as Documents or a synced folder (OneDrive, Google Drive).
en.Shortcuts=Shortcuts:
en.DesktopIcon=Create a desktop shortcut
en.OpenSettings=Open Lower Third Web (with the OBS step by step)
it.FolderTitle=Cartella dei tuoi file
it.FolderSub=Dove tenere le impostazioni e i file per OBS Studio?
it.FolderHelp=Lower Third Web conserva in questa cartella le impostazioni, i nomi, le immagini e i file da aggiungere come sorgente in OBS Studio.%n%nL'ideale è scegliere un posto facile da trovare quando lo si indica in OBS e incluso nel backup, come Documenti o una cartella sincronizzata (OneDrive, Google Drive).
it.Shortcuts=Collegamenti:
it.DesktopIcon=Crea un collegamento sul desktop
it.OpenSettings=Apri Lower Third Web (con la guida passo passo per OBS)
de.FolderTitle=Ordner für Ihre Dateien
de.FolderSub=Wo sollen die Einstellungen und die Dateien für OBS Studio liegen?
de.FolderHelp=Lower Third Web legt in diesem Ordner Ihre Einstellungen, die Namen, die Bilder und die Dateien ab, die in OBS Studio als Quelle hinzugefügt werden.%n%nAm besten einen Ort wählen, der in OBS leicht zu finden ist und zur Datensicherung gehört, etwa Dokumente oder ein synchronisierter Ordner (OneDrive, Google Drive).
de.Shortcuts=Verknüpfungen:
de.DesktopIcon=Desktop-Verknüpfung erstellen
de.OpenSettings=Lower Third Web öffnen (mit der Schritt-für-Schritt-Anleitung für OBS)

[Files]
Source: "..\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\lower-third-web.ico"; DestDir: "{app}"; Flags: ignoreversion
; Used by PrepareToInstall to stop a running server before files are replaced.
Source: "..\package\stop-server.ps1"; Flags: dontcopy

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:Shortcuts}"

[Icons]
Name: "{autodesktop}\Lower Third Web"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\lower-third-web.ico"; Tasks: desktopicon
Name: "{group}\Lower Third Web"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\lower-third-web.ico"

[Registry]
; Starts with Windows, hidden, so the OBS dock and the browser sources always find it.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Lower Third Web"; ValueData: """{sys}\wscript.exe"" ""{app}\start-server.vbs"""; Flags: uninsdeletevalue

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-server.ps1"" -AppDir ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "StopLowerThirdServer"

[Run]
; Always start the server (silent installs too); opening the page is optional.
Filename: "{sys}\wscript.exe"; Parameters: """{app}\start-server.vbs"""; Flags: nowait
Filename: "{sys}\wscript.exe"; Parameters: """{app}\open-settings.vbs"""; Flags: nowait postinstall skipifsilent; Description: "{cm:OpenSettings}"

[Code]
var
  FilesPage: TInputDirWizardPage;

{ The person's own folder: settings, names, images and the OBS source files. Asked once and
  remembered on upgrades. Uninstalling never removes it. }
procedure InitializeWizard;
begin
  FilesPage := CreateInputDirPage(wpSelectDir,
    ExpandConstant('{cm:FolderTitle}'), ExpandConstant('{cm:FolderSub}'),
    ExpandConstant('{cm:FolderHelp}'), False, 'Lower Third Web');
  FilesPage.Add('');
  FilesPage.Values[0] := GetPreviousData('FilesDir', ExpandConstant('{userdocs}\Lower Third Web'));
end;

procedure RegisterPreviousData(PreviousDataKey: Integer);
begin
  SetPreviousData(PreviousDataKey, 'FilesDir', FilesPage.Values[0]);
end;

function LanguageCode: String;
begin
  Result := ActiveLanguage;
  if Result = 'ptbr' then Result := 'pt-BR'
  else if Result = 'ptpt' then Result := 'pt-PT';
end;

function JsonText(const S: String): String;
begin
  Result := S;
  StringChangeEx(Result, '\', '\\', True);
  StringChangeEx(Result, '"', '\"', True);
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

{ The program reads install.json when it starts: where the files go and the language
  chosen here (used for the sample texts of a first installation). }
procedure CurStepChanged(CurStep: TSetupStep);
var
  Dir: String;
begin
  if CurStep <> ssInstall then Exit;
  ForceDirectories(FilesPage.Values[0]);
  Dir := ExpandConstant('{userappdata}\Lower Third Web');
  ForceDirectories(Dir);
  { UTF-8, so folders with accents ("Usuário", "Área de Trabalho") survive. }
  SaveStringsToUTF8File(Dir + '\install.json',
    ['{"folder": "' + JsonText(FilesPage.Values[0]) + '", "language": "' + LanguageCode + '"}'], False);
end;
