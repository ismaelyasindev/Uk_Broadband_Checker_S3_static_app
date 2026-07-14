output "certificate_arn" {
  value = aws_acm_certificate.cert.arn
}

output "hosted_zone_id" {
  value = data.aws_route53_zone.main.zone_id
}

output "waf_web_acl_arn" {
  value = aws_wafv2_web_acl.main.arn
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_distribution_arn" {
  value = aws_cloudfront_distribution.cdn.arn
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}
