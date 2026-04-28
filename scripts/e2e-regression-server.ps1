param(
  [Parameter(Mandatory = $true)] [string]$ServerHost,
  [Parameter(Mandatory = $true)] [string]$User,
  [Parameter(Mandatory = $true)] [string]$Password,
  [string]$BaseUrl = "http://127.0.0.1:18080"
)

python "$PSScriptRoot/e2e_regression.py" `
  --host $ServerHost `
  --user $User `
  --password $Password `
  --base-url $BaseUrl
