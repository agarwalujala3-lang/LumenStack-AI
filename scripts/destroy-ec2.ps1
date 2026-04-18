param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,
  [switch]$DeletePersistentStore,
  [switch]$DeleteIdentityResources
)

$ErrorActionPreference = "Stop"
$manifest = Get-Content -LiteralPath $ManifestPath | ConvertFrom-Json

aws ec2 terminate-instances --region $manifest.region --instance-ids $manifest.instanceId | Out-Null
aws ec2 wait instance-terminated --region $manifest.region --instance-ids $manifest.instanceId

if ($manifest.allocationId) {
  aws ec2 release-address --region $manifest.region --allocation-id $manifest.allocationId | Out-Null
}

aws ec2 delete-security-group --region $manifest.region --group-id $manifest.securityGroupId | Out-Null
aws s3 rm "s3://$($manifest.bucketName)/$($manifest.objectKey)" --region $manifest.region | Out-Null
aws s3api delete-bucket --bucket $manifest.bucketName --region $manifest.region | Out-Null

if ($DeletePersistentStore -and $manifest.managedPersistenceTable) {
  aws dynamodb delete-table `
    --region $manifest.region `
    --table-name $manifest.managedPersistenceTable | Out-Null
}

if ($DeleteIdentityResources -and $manifest.instanceProfileName -and $manifest.iamRoleName) {
  try {
    aws iam remove-role-from-instance-profile `
      --instance-profile-name $manifest.instanceProfileName `
      --role-name $manifest.iamRoleName | Out-Null
  } catch {
    Write-Warning "Could not remove role from instance profile. It may already be detached."
  }

  try {
    aws iam delete-instance-profile `
      --instance-profile-name $manifest.instanceProfileName | Out-Null
  } catch {
    Write-Warning "Could not delete instance profile. It may already be removed."
  }

  try {
    aws iam delete-role-policy `
      --role-name $manifest.iamRoleName `
      --policy-name "$($manifest.appName)-persistence-access".ToLower() | Out-Null
  } catch {
    Write-Warning "Could not delete the inline role policy. It may already be removed."
  }

  try {
    aws iam delete-role `
      --role-name $manifest.iamRoleName | Out-Null
  } catch {
    Write-Warning "Could not delete the IAM role. It may still be in use."
  }
}

Write-Output "Destroyed compute resources for $($manifest.appName). Shared persistence resources were preserved unless explicit delete switches were used."
