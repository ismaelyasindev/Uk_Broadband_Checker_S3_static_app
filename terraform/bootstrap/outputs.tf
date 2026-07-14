output "tfstate_bucket_name" {
  value = aws_s3_bucket.tfstate.id
}

output "tflock_table_name" {
  value = aws_dynamodb_table.tflock.name
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}

output "github_plan_role_arn" {
  value = aws_iam_role.github_plan.arn
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
