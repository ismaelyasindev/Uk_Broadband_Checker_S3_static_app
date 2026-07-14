resource "aws_cloudwatch_log_delivery_source" "cf" {
  provider     = aws.us_east_1
  name         = "bbc-cf-logs"
  log_type     = "ACCESS_LOGS"
  resource_arn = aws_cloudfront_distribution.cdn.arn
}

resource "aws_cloudwatch_log_delivery_destination" "cf_s3" {
  provider      = aws.us_east_1
  name          = "bbc-cf-logs-s3"
  output_format = "parquet"

  delivery_destination_configuration {
    destination_resource_arn = "${var.logs_bucket_arn}/cloudfront"
  }
}

resource "aws_cloudwatch_log_delivery" "cf" {
  provider                 = aws.us_east_1
  delivery_source_name     = aws_cloudwatch_log_delivery_source.cf.name
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.cf_s3.arn
}
