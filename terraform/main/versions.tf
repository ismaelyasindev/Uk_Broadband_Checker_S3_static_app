terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket         = "bbc-tfstate-prod-206868134740"
    key            = "broadband-checker/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "bbc-tf-lock"
    encrypt        = true
  }
}
