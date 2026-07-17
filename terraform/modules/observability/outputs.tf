output "dashboard_name" {
  value = aws_cloudwatch_dashboard.main.dashboard_name
}

output "sns_alerts_arn" {
  value = aws_sns_topic.alerts.arn
}

output "sns_alerts_use1_arn" {
  value = aws_sns_topic.alerts_use1.arn
}

output "budget_name" {
  value = aws_budgets_budget.project.name
}
