resource "random_password" "origin_verify" {
  length  = 32
  special = false
}

module "origin" {
  source = "../modules/origin"

  origin_verify_secret = random_password.origin_verify.result
  ofcom_api_key        = var.ofcom_api_key
  cloudfront_domain    = "https://${var.domain_name}"
}

module "edge" {
  source = "../modules/edge"

  domain_name                    = var.domain_name
  origin_verify_secret           = random_password.origin_verify.result
  api_gateway_endpoint           = module.origin.api_endpoint
  s3_bucket_regional_domain_name = module.origin.static_bucket_regional_domain_name
  static_bucket_arn              = module.origin.static_bucket_arn
  static_bucket_name             = module.origin.static_bucket_name
  logs_bucket_arn                = module.origin.logs_bucket_arn

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "observability" {
  source = "../modules/observability"

  alert_email                = var.alert_email
  cloudfront_distribution_id = module.edge.cloudfront_distribution_id
  api_gateway_id             = module.origin.api_id
  lambda_function_name       = module.origin.lambda_function_name
  dynamodb_table_name        = module.origin.cache_table_name

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}
