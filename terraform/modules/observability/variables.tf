variable "alert_email" {
  type = string
}

variable "cloudfront_distribution_id" {
  type = string
}

variable "api_gateway_id" {
  type = string
}

variable "lambda_function_name" {
  type    = string
  default = "broadband-checker"
}

variable "dynamodb_table_name" {
  type    = string
  default = "broadband-cache"
}

variable "waf_web_acl_name" {
  type    = string
  default = "bbc-waf"
}
