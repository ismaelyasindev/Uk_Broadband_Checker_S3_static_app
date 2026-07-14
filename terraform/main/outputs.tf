output "origin_verify_secret" {
  value     = random_password.origin_verify.result
  sensitive = true
}

output "cache_table_name" {
  value = module.origin.cache_table_name
}

output "api_endpoint" {
  value = module.origin.api_endpoint
}

output "s3_bucket" {
  value = module.origin.static_bucket_name
}

output "cloudfront_domain" {
  value = module.edge.cloudfront_domain
}
