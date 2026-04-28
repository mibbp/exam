param(
  [Parameter(Mandatory = $true)] [string]$ServerHost,
  [Parameter(Mandatory = $true)] [string]$User,
  [Parameter(Mandatory = $true)] [string]$Password,
  [string]$ReleaseRoot = "/mnt/ai-workspace/exam_releases",
  [int]$KeepBackups = 10,
  [int]$KeepLogs = 20,
  [int]$KeepUploads = 10,
  [int]$KeepDbBackups = 10,
  [switch]$Apply
)

$args = @(
  "$PSScriptRoot/cleanup_server.py",
  "--host", $ServerHost,
  "--user", $User,
  "--password", $Password,
  "--release-root", $ReleaseRoot,
  "--keep-backups", $KeepBackups,
  "--keep-logs", $KeepLogs,
  "--keep-uploads", $KeepUploads,
  "--keep-db-backups", $KeepDbBackups
)

if ($Apply) {
  $args += "--apply"
}

python @args
