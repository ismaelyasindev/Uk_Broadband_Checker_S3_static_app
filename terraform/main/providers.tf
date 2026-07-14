provider "aws" {
  region = "eu-west-2"

  default_tags {
    tags = {
      Project   = "broadband-checker"
      ManagedBy = "terraform"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "broadband-checker"
      ManagedBy = "terraform"
    }
  }
}
