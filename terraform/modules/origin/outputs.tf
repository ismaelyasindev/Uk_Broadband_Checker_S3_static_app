output "cache_table_name" {
  value = aws_dynamodb_table.cache.name
}

output "cache_table_arn" {
  value = aws_dynamodb_table.cache.arn
}

output "ofcom_key_param_name" {
  value = aws_ssm_parameter.ofcom_key.name
}

output "ofcom_key_param_arn" {
  value = aws_ssm_parameter.ofcom_key.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda.arn
}

output "lambda_role_name" {
  value = aws_iam_role.lambda.name
}

output "lambda_function_name" {
  value = aws_lambda_function.broadband_checker.function_name
}

output "lambda_invoke_arn" {
  value = aws_lambda_function.broadband_checker.invoke_arn
}

output "api_id" {
  value = aws_apigatewayv2_api.broadband.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.broadband.api_endpoint
}

output "api_execution_arn" {
  value = aws_apigatewayv2_api.broadband.execution_arn
}

output "logs_bucket_name" {
  value = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  value = aws_s3_bucket.logs.arn
}

output "static_bucket_name" {
  value = aws_s3_bucket.static.id
}

output "static_bucket_arn" {
  value = aws_s3_bucket.static.arn
}

output "static_bucket_regional_domain_name" {
  value = aws_s3_bucket.static.bucket_regional_domain_name
}
