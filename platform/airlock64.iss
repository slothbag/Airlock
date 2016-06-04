[Setup]
AppName=Airlock
AppVersion=0.6
DefaultDirName={pf}\Airlock
DefaultGroupName=Airlock
UninstallDisplayIcon={app}\Airlock.exe
Compression=lzma2
SolidCompression=yes
OutputDir=build

[Files]
Source: "..\build\win64\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Airlock"; Filename: "{app}\airlock.exe"; IconFilename: "{app}\resources\app\images\airlock_icon.ico"; WorkingDir: "{app}"
