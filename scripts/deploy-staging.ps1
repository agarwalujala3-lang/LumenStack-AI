param(
  [string]$Region = "us-east-1",
  [string]$InstanceType = "t3.small"
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $scriptRoot "deploy-ec2.ps1") `
  -Region $Region `
  -InstanceType $InstanceType `
  -AppName "lumina-learn-ai-staging"
