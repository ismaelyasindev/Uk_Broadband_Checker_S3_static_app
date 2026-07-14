variable "origin_verify_secret" {
  type      = string
  sensitive = true
}

variable "ofcom_api_key" {
  type      = string
  sensitive = true
}

variable "cloudfront_domain" {
  type        = string
  description = "HTTPS origin allowed in API Gateway CORS."
  default     = "https://placeholder.cloudfront.net"
}
