resource "aws_apigatewayv2_api" "broadband" {
  name                         = "broadband-checker"
  protocol_type                = "HTTP"
  disable_execute_api_endpoint = false

  cors_configuration {
    allow_origins = [var.cloudfront_domain]
    allow_methods = ["GET"]
    allow_headers = ["Content-Type"]
    max_age       = 86400
  }
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/aws/apigateway/broadband-checker"
  retention_in_days = 7
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.broadband.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw.arn
    format = jsonencode({
      requestId = "$context.requestId"
      routeKey  = "$context.routeKey"
      status    = "$context.status"
      latency   = "$context.responseLatency"
    })
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.broadband.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.broadband_checker.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "check" {
  api_id    = aws_apigatewayv2_api.broadband.id
  route_key = "GET /api/check"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.broadband.id
  route_key = "GET /api/health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.broadband_checker.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.broadband.execution_arn}/*/*"
}
