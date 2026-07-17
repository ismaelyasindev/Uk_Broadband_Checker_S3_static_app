resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "broadband-checker"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "CloudFront — Requests & Error Rates"
          region = "us-east-1"
          period = 300
          stat   = "Sum"
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", var.cloudfront_distribution_id],
            ["AWS/CloudFront", "4xxErrorRate", "DistributionId", var.cloudfront_distribution_id, { stat = "Average", yAxis = "right" }],
            ["AWS/CloudFront", "5xxErrorRate", "DistributionId", var.cloudfront_distribution_id, { stat = "Average", yAxis = "right" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "WAF — Blocked Requests"
          region = "us-east-1"
          period = 300
          stat   = "Sum"
          metrics = [
            ["AWS/WAFV2", "BlockedRequests", "WebACL", var.waf_web_acl_name, "Rule", "ALL", "Region", "CloudFront"],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Lambda — Invocations & Errors"
          region = "eu-west-2"
          period = 60
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { stat = "Sum" }],
            ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", color = "#d62728" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Lambda — Duration (p50 / p95 / p99)"
          region = "eu-west-2"
          period = 300
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p50", label = "p50" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p95", label = "p95" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p99", label = "p99" }],
          ]
          annotations = {
            horizontal = [{ label = "Alarm threshold 3000 ms", value = 3000, color = "#ff6961" }]
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Lambda — Throttles & Concurrent Executions"
          region = "eu-west-2"
          period = 60
          metrics = [
            ["AWS/Lambda", "Throttles", "FunctionName", var.lambda_function_name, { stat = "Sum" }],
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", var.lambda_function_name, { stat = "Maximum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 8
        height = 6
        properties = {
          title  = "DynamoDB — Throttles"
          region = "eu-west-2"
          period = 300
          stat   = "Sum"
          metrics = [
            ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", var.dynamodb_table_name],
            ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", var.dynamodb_table_name],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 12
        width  = 8
        height = 6
        properties = {
          title  = "API Gateway — Latency & Errors"
          region = "eu-west-2"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, "Stage", "$default", { stat = "p95" }],
            ["AWS/ApiGateway", "4xx", "ApiId", var.api_gateway_id, "Stage", "$default", { stat = "Sum" }],
            ["AWS/ApiGateway", "5xx", "ApiId", var.api_gateway_id, "Stage", "$default", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "alarm"
        x      = 16
        y      = 12
        width  = 8
        height = 6
        properties = {
          title = "Active Alarms"
          alarms = [
            aws_cloudwatch_metric_alarm.cf_4xx.arn,
            aws_cloudwatch_metric_alarm.cf_5xx.arn,
            aws_cloudwatch_metric_alarm.waf_blocked.arn,
            aws_cloudwatch_metric_alarm.lambda_errors.arn,
            aws_cloudwatch_metric_alarm.lambda_duration.arn,
            aws_cloudwatch_metric_alarm.lambda_throttles.arn,
            aws_cloudwatch_metric_alarm.dynamodb_read_throttles.arn,
          ]
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 18
        width  = 8
        height = 6
        properties = {
          title  = "Cache hit ratio (from Lambda logs)"
          region = "eu-west-2"
          view   = "pie"
          query  = "SOURCE '/aws/lambda/broadband-checker' | fields source | stats count(*) as requests by source"
        }
      }
    ]
  })
}
