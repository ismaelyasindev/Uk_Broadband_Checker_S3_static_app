provider "aws" {
  region = "eu-west-2"

  default_tags {
    tags = {
      Project   = "broadband-checker"
      ManagedBy = "terraform"
      Layer     = "bootstrap"
    }
  }
}
