resource "aws_cloudwatch_metric_alarm" "cf_4xx" {
  provider            = aws.us_east_1
  alarm_name          = "bbc-cf-4xx-rate"
  alarm_description   = "CloudFront 4xx error rate exceeds 5%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 5
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts_use1.arn]
  ok_actions          = [aws_sns_topic.alerts_use1.arn]
  namespace           = "AWS/CloudFront"
  metric_name         = "4xxErrorRate"
  period              = 300
  statistic           = "Average"
  dimensions = {
    DistributionId = var.cloudfront_distribution_id
  }
}

resource "aws_cloudwatch_metric_alarm" "cf_5xx" {
  provider            = aws.us_east_1
  alarm_name          = "bbc-cf-5xx-rate"
  alarm_description   = "CloudFront 5xx error rate exceeds 1%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts_use1.arn]
  ok_actions          = [aws_sns_topic.alerts_use1.arn]
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  period              = 300
  statistic           = "Average"
  dimensions = {
    DistributionId = var.cloudfront_distribution_id
  }
}

resource "aws_cloudwatch_metric_alarm" "waf_blocked" {
  provider            = aws.us_east_1
  alarm_name          = "bbc-waf-blocked-spike"
  alarm_description   = "WAF blocked more than 100 requests in 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 100
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts_use1.arn]
  namespace           = "AWS/WAFV2"
  metric_name         = "BlockedRequests"
  period              = 300
  statistic           = "Sum"
  dimensions = {
    WebACL = var.waf_web_acl_name
    Rule   = "ALL"
    Region = "CloudFront"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "bbc-lambda-errors"
  alarm_description   = "Lambda threw an unhandled error"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  period              = 60
  statistic           = "Sum"
  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "bbc-lambda-duration-p95"
  alarm_description   = "Lambda p95 duration exceeds 3000 ms"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 3000
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  period              = 300
  extended_statistic  = "p95"
  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "bbc-lambda-throttles"
  alarm_description   = "Lambda was throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  period              = 300
  statistic           = "Sum"
  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttles" {
  alarm_name          = "bbc-dynamodb-read-throttles"
  alarm_description   = "DynamoDB read throttles detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  namespace           = "AWS/DynamoDB"
  metric_name         = "ReadThrottleEvents"
  period              = 300
  statistic           = "Sum"
  dimensions = {
    TableName = var.dynamodb_table_name
  }
}
