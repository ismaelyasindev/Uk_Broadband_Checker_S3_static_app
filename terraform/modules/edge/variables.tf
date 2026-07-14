variable "domain_name" {
  type = string
}

variable "origin_verify_secret" {
  type      = string
  sensitive = true
}

variable "api_gateway_endpoint" {
  type = string
}

variable "s3_bucket_regional_domain_name" {
  type = string
}

variable "static_bucket_arn" {
  type = string
}

variable "static_bucket_name" {
  type = string
}

variable "logs_bucket_arn" {
  type = string
}
