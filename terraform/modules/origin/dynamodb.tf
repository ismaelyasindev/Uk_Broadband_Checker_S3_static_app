resource "aws_dynamodb_table" "cache" {
  name         = "broadband-cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "postcode"

  attribute {
    name = "postcode"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
