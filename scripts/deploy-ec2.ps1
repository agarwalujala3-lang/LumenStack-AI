param(
  [string]$Region = "us-east-1",
  [string]$InstanceType = "t3.small",
  [string]$AppName = "lumina-learn-ai",
  [string]$OAuthBaseUrl = $env:LUMINA_OAUTH_BASE_URL,
  [string]$GoogleClientId = $env:LUMINA_GOOGLE_CLIENT_ID,
  [string]$GoogleClientSecret = $env:LUMINA_GOOGLE_CLIENT_SECRET,
  [string]$GitHubClientId = $env:LUMINA_GITHUB_CLIENT_ID,
  [string]$GitHubClientSecret = $env:LUMINA_GITHUB_CLIENT_SECRET,
  [string]$LinkedInClientId = $env:LUMINA_LINKEDIN_CLIENT_ID,
  [string]$LinkedInClientSecret = $env:LUMINA_LINKEDIN_CLIENT_SECRET
)

$ErrorActionPreference = "Stop"

function To-SystemdEnvironmentLine {
  param(
    [string]$Key,
    [string]$Value
  )

  $escaped = ($Value -replace '"', '\\"')
  return "Environment=""$Key=$escaped"""
}

$workspace = Split-Path -Parent $PSScriptRoot
$deployDir = Join-Path $workspace ".deploy"
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$randomSuffix = Get-Random -Minimum 100000 -Maximum 999999
$packagePath = Join-Path $deployDir "$AppName-$timestamp.tar.gz"
$userDataPath = Join-Path $deployDir "user-data-$timestamp.sh"
$manifestPath = Join-Path $deployDir "deployment-$timestamp.json"
$trustPolicyPath = Join-Path $deployDir "trust-policy-$timestamp.json"
$rolePolicyPath = Join-Path $deployDir "role-policy-$timestamp.json"
$objectKey = "releases/$AppName-$timestamp.tar.gz"
$bucketName = "$AppName-live-$timestamp-$randomSuffix".ToLower()
$sgName = "$AppName-sg-$timestamp"
$tableName = "$AppName-auth-store".ToLower()
$roleName = "$AppName-ec2-role".ToLower()
$instanceProfileName = "$AppName-ec2-profile".ToLower()
$policyName = "$AppName-persistence-access".ToLower()

$oauthEnvironmentLines = @()
if (-not [string]::IsNullOrWhiteSpace($OAuthBaseUrl)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_OAUTH_BASE_URL" -Value $OAuthBaseUrl)
}
if (-not [string]::IsNullOrWhiteSpace($GoogleClientId) -and -not [string]::IsNullOrWhiteSpace($GoogleClientSecret)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_GOOGLE_CLIENT_ID" -Value $GoogleClientId)
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_GOOGLE_CLIENT_SECRET" -Value $GoogleClientSecret)
  $oauthEnvironmentLines += "Environment=LUMINA_GOOGLE_OAUTH_ENABLED=true"
}
if (-not [string]::IsNullOrWhiteSpace($GitHubClientId) -and -not [string]::IsNullOrWhiteSpace($GitHubClientSecret)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_GITHUB_CLIENT_ID" -Value $GitHubClientId)
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_GITHUB_CLIENT_SECRET" -Value $GitHubClientSecret)
  $oauthEnvironmentLines += "Environment=LUMINA_GITHUB_OAUTH_ENABLED=true"
}
if (-not [string]::IsNullOrWhiteSpace($LinkedInClientId) -and -not [string]::IsNullOrWhiteSpace($LinkedInClientSecret)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_LINKEDIN_CLIENT_ID" -Value $LinkedInClientId)
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_LINKEDIN_CLIENT_SECRET" -Value $LinkedInClientSecret)
  $oauthEnvironmentLines += "Environment=LUMINA_LINKEDIN_OAUTH_ENABLED=true"
}
$oauthEnvironmentBlock = if ($oauthEnvironmentLines.Count) { $oauthEnvironmentLines -join "`n" } else { "" }

if (Test-Path $packagePath) {
  Remove-Item -LiteralPath $packagePath -Force
}

& tar.exe -czf $packagePath `
  -C $workspace `
  package.json `
  server.js `
  README.md `
  public `
  lib `
  data `
  scripts

$amiId = aws ssm get-parameter `
  --region $Region `
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 `
  --query Parameter.Value `
  --output text

if ($Region -eq "us-east-1") {
  aws s3api create-bucket --bucket $bucketName --region $Region | Out-Null
} else {
  aws s3api create-bucket `
    --bucket $bucketName `
    --region $Region `
    --create-bucket-configuration LocationConstraint=$Region | Out-Null
}

aws s3 cp $packagePath "s3://$bucketName/$objectKey" --region $Region | Out-Null
$presignedUrl = aws s3 presign "s3://$bucketName/$objectKey" --region $Region --expires-in 3600

$tableExists = aws dynamodb list-tables `
  --region $Region `
  --query "contains(TableNames, '$tableName')" `
  --output text
if ($tableExists -ne "True") {
  aws dynamodb create-table `
    --region $Region `
    --table-name $tableName `
    --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=recordId,AttributeType=S `
    --key-schema AttributeName=userId,KeyType=HASH AttributeName=recordId,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST | Out-Null

  aws dynamodb wait table-exists --region $Region --table-name $tableName
}

$trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@

[System.IO.File]::WriteAllText(
  $trustPolicyPath,
  ($trustPolicy -replace "`r`n", "`n"),
  [System.Text.UTF8Encoding]::new($false)
)

$accountId = aws sts get-caller-identity --query Account --output text
$tableArn = "arn:aws:dynamodb:${Region}:${accountId}:table/$tableName"

$rolePolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "$tableArn"
    }
  ]
}
"@

[System.IO.File]::WriteAllText(
  $rolePolicyPath,
  ($rolePolicy -replace "`r`n", "`n"),
  [System.Text.UTF8Encoding]::new($false)
)

$roleExists = aws iam list-roles `
  --query "contains(Roles[].RoleName, '$roleName')" `
  --output text
if ($roleExists -ne "True") {
  aws iam create-role `
    --role-name $roleName `
    --assume-role-policy-document "file://$trustPolicyPath" | Out-Null

  Start-Sleep -Seconds 8
}

aws iam put-role-policy `
  --role-name $roleName `
  --policy-name $policyName `
  --policy-document "file://$rolePolicyPath" | Out-Null

$instanceProfileExists = aws iam list-instance-profiles `
  --query "contains(InstanceProfiles[].InstanceProfileName, '$instanceProfileName')" `
  --output text
if ($instanceProfileExists -ne "True") {
  aws iam create-instance-profile `
    --instance-profile-name $instanceProfileName | Out-Null

  Start-Sleep -Seconds 8
}

$instanceProfile = aws iam get-instance-profile `
  --instance-profile-name $instanceProfileName `
  --output json | ConvertFrom-Json

$attachedRoles = @($instanceProfile.InstanceProfile.Roles | ForEach-Object { $_.RoleName })
if ($attachedRoles -notcontains $roleName) {
  aws iam add-role-to-instance-profile `
    --instance-profile-name $instanceProfileName `
    --role-name $roleName | Out-Null

  Start-Sleep -Seconds 12
}

$vpcId = aws ec2 describe-vpcs `
  --region $Region `
  --filters Name=isDefault,Values=true `
  --query "Vpcs[0].VpcId" `
  --output text

$securityGroupId = aws ec2 create-security-group `
  --region $Region `
  --group-name $sgName `
  --description "Security group for $AppName live deployment" `
  --vpc-id $vpcId `
  --query GroupId `
  --output text

aws ec2 authorize-security-group-ingress `
  --region $Region `
  --group-id $securityGroupId `
  --ip-permissions "[{`"IpProtocol`":`"tcp`",`"FromPort`":80,`"ToPort`":80,`"IpRanges`":[{`"CidrIp`":`"0.0.0.0/0`",`"Description`":`"Public HTTP`"}]}]" | Out-Null

$userData = @"
#!/bin/bash
set -euxo pipefail

dnf update -y
dnf install -y nodejs awscli

mkdir -p /opt/$AppName
cd /opt/$AppName
curl -L "$presignedUrl" -o app.tar.gz
tar -xzf app.tar.gz
rm -f app.tar.gz
node -v
aws --version

cat >/etc/systemd/system/$AppName.service <<'SERVICE'
[Unit]
Description=$AppName service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/$AppName
Environment=PORT=80
Environment=APP_ENV=staging
Environment=AWS_REGION=$Region
Environment=NEXUS_STORAGE_BACKEND=dynamodb
Environment=NEXUS_DYNAMODB_TABLE=$tableName
$oauthEnvironmentBlock
ExecStart=/usr/bin/node /opt/$AppName/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable $AppName.service
systemctl restart $AppName.service
systemctl status --no-pager $AppName.service
"@

[string]$normalizedUserData = $userData -replace "`r`n", "`n"
[System.IO.File]::WriteAllText(
  $userDataPath,
  $normalizedUserData,
  [System.Text.UTF8Encoding]::new($false)
)

$instanceId = aws ec2 run-instances `
  --region $Region `
  --image-id $amiId `
  --instance-type $InstanceType `
  --security-group-ids $securityGroupId `
  --associate-public-ip-address `
  --iam-instance-profile Name=$instanceProfileName `
  --user-data "file://$userDataPath" `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$AppName-live},{Key=Project,Value=$AppName}]" `
  --query "Instances[0].InstanceId" `
  --output text

aws ec2 wait instance-running --region $Region --instance-ids $instanceId
aws ec2 wait instance-status-ok --region $Region --instance-ids $instanceId

$allocationId = $null

try {
  $allocationRaw = aws ec2 allocate-address --region $Region --domain vpc --output json 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($allocationRaw)) {
    throw "Elastic IP allocation unavailable"
  }

  $allocationJson = $allocationRaw | ConvertFrom-Json
  aws ec2 associate-address `
    --region $Region `
    --instance-id $instanceId `
    --allocation-id $allocationJson.AllocationId | Out-Null

  $allocationId = $allocationJson.AllocationId
  $publicIp = $allocationJson.PublicIp
} catch {
  Write-Warning "Elastic IP allocation failed. Falling back to the instance public IP."
  for ($attempt = 0; $attempt -lt 10; $attempt++) {
    $publicIp = aws ec2 describe-instances `
      --region $Region `
      --instance-ids $instanceId `
      --query "Reservations[0].Instances[0].PublicIpAddress" `
      --output text

    if (-not [string]::IsNullOrWhiteSpace($publicIp) -and $publicIp -ne "None" -and $publicIp -ne "null") {
      break
    }

    Start-Sleep -Seconds 3
  }

  if ([string]::IsNullOrWhiteSpace($publicIp) -or $publicIp -eq "None" -or $publicIp -eq "null") {
    throw "Could not resolve a usable public IP for the instance."
  }
}

$publicUrl = "http://$publicIp"

$manifest = [ordered]@{
  appName = $AppName
  region = $Region
  bucketName = $bucketName
  objectKey = $objectKey
  securityGroupId = $securityGroupId
  instanceId = $instanceId
  allocationId = $allocationId
  publicIp = $publicIp
  publicUrl = $publicUrl
  managedPersistenceTable = $tableName
  iamRoleName = $roleName
  instanceProfileName = $instanceProfileName
  deployedAt = (Get-Date).ToString("o")
}

$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath
$manifest | ConvertTo-Json
