param(
  [Parameter(Mandatory = $true)] [string]$ServerHost,
  [Parameter(Mandatory = $true)] [string]$User,
  [Parameter(Mandatory = $true)] [string]$Password,
  [string]$DbHost = "127.0.0.1",
  [string]$DbPort = "13306",
  [string]$DbName = "exam_db",
  [string]$DbUser = "exam_user",
  [string]$DbPassword = "exam_pass",
  [string]$BackupDir = "/mnt/ai-workspace/exam_releases/db_backups"
)

python "$PSScriptRoot/db_backup.py" `
  --host $ServerHost `
  --user $User `
  --password $Password `
  --db-host $DbHost `
  --db-port $DbPort `
  --db-name $DbName `
  --db-user $DbUser `
  --db-password $DbPassword `
  --backup-dir $BackupDir
