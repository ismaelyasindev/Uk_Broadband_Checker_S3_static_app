resource "aws_ssm_parameter" "ofcom_key" {
  name        = "/broadband/ofcom-key"
  type        = "SecureString"
  value       = var.ofcom_api_key
  description = "Ofcom Broadband Coverage API key"
}
