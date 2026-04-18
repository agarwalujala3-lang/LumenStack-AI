param(
  [string]$Region = "us-east-1",
  [string]$AppName = "lumina-learn-ai-prod",
  [string]$InstanceType = "t3.small",
  [int]$DesiredCapacity = 2,
  [int]$MinSize = 2,
  [int]$MaxSize = 4,
  [string]$OAuthBaseUrl = $env:LUMINA_OAUTH_BASE_URL,
  [string]$PhoneOtpSmsEnabled = $env:LUMINA_PHONE_OTP_SMS_ENABLED,
  [string]$PhoneOtpTestMode = $env:LUMINA_PHONE_OTP_TEST_MODE,
  [string]$PhoneOtpSenderId = $env:LUMINA_PHONE_OTP_SENDER_ID,
  [string]$PhoneOtpTemplate = $env:LUMINA_PHONE_OTP_TEMPLATE,
  [string]$PhoneOtpSmsType = $env:LUMINA_PHONE_OTP_SMS_TYPE,
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
$suffix = Get-Random -Minimum 100000 -Maximum 999999
$packagePath = Join-Path $deployDir "$AppName-$timestamp.tar.gz"
$launchTemplateDataPath = Join-Path $deployDir "launch-template-data-$timestamp.json"
$manifestPath = Join-Path $deployDir "production-deployment-$timestamp.json"
$trustPolicyPath = Join-Path $deployDir "trust-policy-$timestamp.json"
$rolePolicyPath = Join-Path $deployDir "role-policy-$timestamp.json"
$objectKey = "releases/$AppName-$timestamp.tar.gz"
$bucketName = "$AppName-live-$timestamp-$suffix".ToLower()
$albName = ("{0}-alb-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$targetGroupName = ("{0}-tg-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$launchTemplateName = ("{0}-lt-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$asgName = ("{0}-asg-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$albSgName = ("{0}-alb-sg-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$appSgName = ("{0}-app-sg-{1}" -f $AppName, $timestamp.Substring($timestamp.Length - 6)).ToLower()
$tableName = "$AppName-auth-store".ToLower()
$roleName = "$AppName-ec2-role".ToLower()
$instanceProfileName = "$AppName-ec2-profile".ToLower()
$policyName = "$AppName-persistence-access".ToLower()

$oauthEnvironmentLines = @()
if (-not [string]::IsNullOrWhiteSpace($OAuthBaseUrl)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_OAUTH_BASE_URL" -Value $OAuthBaseUrl)
}
if (-not [string]::IsNullOrWhiteSpace($PhoneOtpSmsEnabled)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_PHONE_OTP_SMS_ENABLED" -Value $PhoneOtpSmsEnabled)
}
if (-not [string]::IsNullOrWhiteSpace($PhoneOtpTestMode)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_PHONE_OTP_TEST_MODE" -Value $PhoneOtpTestMode)
}
if (-not [string]::IsNullOrWhiteSpace($PhoneOtpSenderId)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_PHONE_OTP_SENDER_ID" -Value $PhoneOtpSenderId)
}
if (-not [string]::IsNullOrWhiteSpace($PhoneOtpTemplate)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_PHONE_OTP_TEMPLATE" -Value $PhoneOtpTemplate)
}
if (-not [string]::IsNullOrWhiteSpace($PhoneOtpSmsType)) {
  $oauthEnvironmentLines += (To-SystemdEnvironmentLine -Key "LUMINA_PHONE_OTP_SMS_TYPE" -Value $PhoneOtpSmsType)
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
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
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

$subnetIdsRaw = aws ec2 describe-subnets `
  --region $Region `
  --filters Name=vpc-id,Values=$vpcId Name=default-for-az,Values=true `
  --query "Subnets[0:2].SubnetId" `
  --output text
$subnetIds = $subnetIdsRaw -split "\s+" | Where-Object { $_ }

if ($subnetIds.Count -lt 2) {
  throw "At least 2 default subnets are required for ALB + ASG production deployment."
}

$albSecurityGroupId = aws ec2 create-security-group `
  --region $Region `
  --group-name $albSgName `
  --description "ALB security group for $AppName" `
  --vpc-id $vpcId `
  --query GroupId `
  --output text

$appSecurityGroupId = aws ec2 create-security-group `
  --region $Region `
  --group-name $appSgName `
  --description "App security group for $AppName" `
  --vpc-id $vpcId `
  --query GroupId `
  --output text

aws ec2 authorize-security-group-ingress `
  --region $Region `
  --group-id $albSecurityGroupId `
  --ip-permissions "[{`"IpProtocol`":`"tcp`",`"FromPort`":80,`"ToPort`":80,`"IpRanges`":[{`"CidrIp`":`"0.0.0.0/0`",`"Description`":`"Public HTTP`"}]}]" | Out-Null

aws ec2 authorize-security-group-ingress `
  --region $Region `
  --group-id $appSecurityGroupId `
  --ip-permissions "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=$albSecurityGroupId,Description=""ALB to app""}]" | Out-Null

$targetGroupArn = aws elbv2 create-target-group `
  --region $Region `
  --name $targetGroupName `
  --protocol HTTP `
  --port 3000 `
  --vpc-id $vpcId `
  --health-check-path /healthz `
  --target-type instance `
  --query "TargetGroups[0].TargetGroupArn" `
  --output text

$loadBalancerArn = aws elbv2 create-load-balancer `
  --region $Region `
  --name $albName `
  --subnets $subnetIds[0] $subnetIds[1] `
  --security-groups $albSecurityGroupId `
  --scheme internet-facing `
  --type application `
  --query "LoadBalancers[0].LoadBalancerArn" `
  --output text

aws elbv2 wait load-balancer-available --region $Region --load-balancer-arns $loadBalancerArn

$listenerArn = aws elbv2 create-listener `
  --region $Region `
  --load-balancer-arn $loadBalancerArn `
  --protocol HTTP `
  --port 80 `
  --default-actions Type=forward,TargetGroupArn=$targetGroupArn `
  --query "Listeners[0].ListenerArn" `
  --output text

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
cat >/etc/systemd/system/$AppName.service <<'SERVICE'
[Unit]
Description=$AppName service
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/$AppName
Environment=PORT=3000
Environment=APP_ENV=production
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
"@

$launchTemplateData = [ordered]@{
  ImageId = $amiId
  InstanceType = $InstanceType
  SecurityGroupIds = @($appSecurityGroupId)
  IamInstanceProfile = @{
    Name = $instanceProfileName
  }
  UserData = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))
  TagSpecifications = @(
    @{
      ResourceType = "instance"
      Tags = @(
        @{ Key = "Name"; Value = "$AppName-app" },
        @{ Key = "Project"; Value = $AppName }
      )
    }
  )
}

$launchTemplateData | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $launchTemplateDataPath

aws ec2 create-launch-template `
  --region $Region `
  --launch-template-name $launchTemplateName `
  --launch-template-data "file://$launchTemplateDataPath" | Out-Null

aws autoscaling create-auto-scaling-group `
  --region $Region `
  --auto-scaling-group-name $asgName `
  --launch-template "LaunchTemplateName=$launchTemplateName,Version=`$Latest" `
  --min-size $MinSize `
  --max-size $MaxSize `
  --desired-capacity $DesiredCapacity `
  --vpc-zone-identifier "$($subnetIds[0]),$($subnetIds[1])" `
  --target-group-arns $targetGroupArn `
  --health-check-type ELB `
  --health-check-grace-period 120

$policyArn = aws autoscaling put-scaling-policy `
  --region $Region `
  --auto-scaling-group-name $asgName `
  --policy-name "$AppName-cpu-target" `
  --policy-type TargetTrackingScaling `
  --target-tracking-configuration "PredefinedMetricSpecification={PredefinedMetricType=ASGAverageCPUUtilization},TargetValue=55.0" `
  --query PolicyARN `
  --output text

$targetGroupDimension = ($targetGroupArn -split "targetgroup/")[1]
$loadBalancerDimension = ($loadBalancerArn -split "loadbalancer/")[1]

aws cloudwatch put-metric-alarm `
  --region $Region `
  --alarm-name "$AppName-unhealthy-hosts" `
  --metric-name UnHealthyHostCount `
  --namespace AWS/ApplicationELB `
  --statistic Average `
  --period 60 `
  --evaluation-periods 2 `
  --threshold 1 `
  --comparison-operator GreaterThanOrEqualToThreshold `
  --dimensions Name=TargetGroup,Value=$targetGroupDimension Name=LoadBalancer,Value=$loadBalancerDimension `
  --treat-missing-data notBreaching | Out-Null

$dnsName = aws elbv2 describe-load-balancers `
  --region $Region `
  --load-balancer-arns $loadBalancerArn `
  --query "LoadBalancers[0].DNSName" `
  --output text

$manifest = [ordered]@{
  appName = $AppName
  region = $Region
  bucketName = $bucketName
  objectKey = $objectKey
  loadBalancerArn = $loadBalancerArn
  listenerArn = $listenerArn
  targetGroupArn = $targetGroupArn
  launchTemplateName = $launchTemplateName
  autoScalingGroupName = $asgName
  albSecurityGroupId = $albSecurityGroupId
  appSecurityGroupId = $appSecurityGroupId
  scalingPolicyArn = $policyArn
  managedPersistenceTable = $tableName
  iamRoleName = $roleName
  instanceProfileName = $instanceProfileName
  url = "http://$dnsName"
  deployedAt = (Get-Date).ToString("o")
}

$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath
$manifest | ConvertTo-Json
