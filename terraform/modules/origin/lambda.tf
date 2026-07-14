data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda/src"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "broadband_checker" {
  function_name    = "broadband-checker"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  memory_size      = 256
  timeout          = 10

  environment {
    variables = {
      DYNAMODB_TABLE       = aws_dynamodb_table.cache.name
      SSM_PARAM_PATH       = aws_ssm_parameter.ofcom_key.name
      ORIGIN_VERIFY_SECRET = var.origin_verify_secret
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.lambda,
  ]
}
