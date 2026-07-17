variable "domain_name" {
  type        = string
  description = "Custom domain for CloudFront. Replace before applying the edge module."
  default     = "ismaelbroadband.online"
}

variable "alert_email" {
  type        = string
  description = "Email address for SNS alarm notifications"
  default     = "ismaelsusuyman@gmail.com"
}

variable "ofcom_api_key" {
  type        = string
  sensitive   = true
  description = "Ofcom API key — override via terraform.tfvars or -var before origin apply"
  default     = "placeholder"
}

variable "github_org" {
  type    = string
  default = "ismaelyasindev"
}

variable "github_repo" {
  type    = string
  default = "Uk_Broadband_Checker_S3_static_app"
}
