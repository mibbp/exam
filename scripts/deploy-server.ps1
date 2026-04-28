param(
  [Parameter(Mandatory = $true)] [string]$ServerHost,
  [Parameter(Mandatory = $true)] [string]$User,
  [Parameter(Mandatory = $true)] [string]$Password,
  [string]$ProjectDir = "/mnt/ai-workspace/exam",
  [string]$ReleaseRoot = "/mnt/ai-workspace/exam_releases",
  [string]$ComposeCmd = "docker-compose",
  [string]$Services = "backend frontend"
)

python "$PSScriptRoot/server_release.py" `
  --host $ServerHost `
  --user $User `
  --password $Password `
  --project-dir $ProjectDir `
  --release-root $ReleaseRoot `
  --compose-cmd $ComposeCmd `
  --services $Services `
  deploy
