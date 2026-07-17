data "aws_caller_identity" "current" {}

resource "aws_sns_topic" "alerts" {
  name = "bbc-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic" "alerts_use1" {
  provider = aws.us_east_1
  name     = "bbc-alerts-use1"
}

resource "aws_sns_topic_subscription" "email_use1" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.alerts_use1.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_policy" "alerts_budgets" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAccountOwner"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "SNS:*"
        Resource  = aws_sns_topic.alerts.arn
      },
      {
        Sid       = "AllowBudgetsPublish"
        Effect    = "Allow"
        Principal = { Service = "budgets.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}
