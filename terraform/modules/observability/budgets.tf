resource "aws_budgets_budget" "project" {
  name         = "bbc-budget"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$broadband-checker"]
  }

  dynamic "notification" {
    for_each = [20, 40, 80]
    content {
      comparison_operator       = "GREATER_THAN"
      threshold                 = notification.value
      threshold_type            = "PERCENTAGE"
      notification_type         = "FORECASTED"
      subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
    }
  }
}
