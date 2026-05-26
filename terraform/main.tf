terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.45.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.5.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  # Configuration options
  region = var.aws-region
  default_tags {
    tags = {
      student = var.student_name
      cohort  = var.cohort
      project = var.project_name
    }
  }
}

# data source to get default VPC
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id] # get subnets in the default VPC
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  owners = ["099720109477"] # Canonical
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  #All resources follow : student-<name>-<project>-<random-hex>
  # Example: student-phong-ems-a1b2c4e2
  name = "${var.student_name}-${var.project_name}-${random_id.suffix.hex}"
}

# s3 bucket to host frontend build - not publicly accessible, and cloudfront will be used to serve the content securely
resource "aws_s3_bucket" "frontend" {
  bucket = local.name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
}

# cloudfront distribution to serve frontend content securely with s3 origin and WAF for security
# cloudfront OAC to securely access s3 bucket without making it public
# to stop 403 errors, make sure to deploy cloudfront after s3 bucket and OAC are created, and set the OAC id in the cloudfront distribution origin configuration

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name}-oac"
  description                       = "Origin Access Control for ${local.name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"

}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id

  }
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# s3 bucket policy to allow cloudfront OAC to access the bucket securely without making it public
# Users distribution ARN and not OAC ARN
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# IAM role for lambda function with basic execution role and VPC access to connect to MongoDB securely within the VPC
# AWSLAMBDAVPCAccessExecutionRole managed policy provides necessary permissions for Lambda to work with VPC, including ENI management and CloudWatch logging
# AWSLAMDAVPCExecutionRole managed policy provides necessary permissions for Lambda to execute within a VPC, including ENI management and CloudWatch logging
resource "aws_iam_role" "lambda" {
  name = "${var.student_name}-${var.project_name}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Security groups: 2 groups are needed
# 1. mongo-sg: for MongoDB EC2 instance, allow inbound traffic on port 22 for  SSH, and port 27017 for MongoDB access from lambda function, and allow all outbound traffic
# 2. lambda-sg: for lambda function, allow outbound traffic to mongo-sg on port 27017 to connect to MongoDB securely within the VPC, and allow all outbound traffic for other needs


resource "aws_security_group" "lambda_sg" {
  name        = "${local.name}-lambda-sg"
  description = "Security group for Lambda function"
  vpc_id      = data.aws_vpc.default.id

  # egress {
  #   from_port   = 27017
  #   to_port     = 27017
  #   protocol    = "tcp"
  #   security_groups = [aws_security_group.mongo_sg.id]
  # }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_security_group" "mongo_sg" {
  name        = "${local.name}-mongo-sg"
  description = "Security group for MongoDB EC2 instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Allow SSH access from anywhere - for setup and debugging purpose, can be restricted to specific IPs for better security"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "Allow MongoDB access from Lambda function securely within the VPC"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  egress {
    description = "restrict all outbound traffic from MongoDB instance for better security, can be adjusted based on specific needs, currently allowing all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


# EC2 instance to host MongoDB, placed in private subnet for better security, and only accessible from lambda function within the VPC

resource "tls_private_key" "ssh_key"{
  algorithm = "RSA"
  rsa_bits = 4096
}

resource "aws_key_pair" "ssh_key"{
  key_name= "${var.student_name}-${var.project_name}-key"
  public_key = tls_private_key.ssh_key.public_key_openssh
}

resource "local_file" "private_key" {
  content  = tls_private_key.ssh_key.private_key_pem
  filename = "${var.student_name}-${var.project_name}-key.pem"
  file_permission = "0400"
}



resource "aws_instance" "mongodb" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0] # get the first subnet in the default VPC, can be improved by selecting based on availability zone or other criteria
  security_groups             = [aws_security_group.mongo_sg.id]
  key_name                    = aws_key_pair.ssh_key.key_name
  associate_public_ip_address = true
  user_data = <<-EOF
              #!/bin/bash
              set -e
              apt-get update -y
              apt-get install -y gnupg curl
              curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
              echo "deb [signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
              apt-get update -y
              apt-get install -y mongodb-org
              sed -i "s/^  bindIp: .*/  bindIp: 0.0.0.0/" /etc/mongod.conf
              systemctl enable mongod
              systemctl restart mongod
            EOF     
  tags = {
    Name = "${local.name}-mongodb"
  }

}

# lamda function to host backend code, with VPC configuration to connect to MongoDB securely within the VPC, and environment variable for JWT secret key
resource "aws_lambda_function" "api" {
  function_name = "${var.student_name}-${var.project_name}-api"
  role          = aws_iam_role.lambda.arn
  handler       = "app.main.handler" #match backend code entry point, can be adjusted based on actual code structure
  runtime       = "python3.11"
  filename = "backend.zip" # the backend code needs to be zipped and uploaded to the same directory as terraform files before deployment, can be automated with CI/CD pipeline in the future
  source_code_hash = filebase64sha256("${path.module}/backend.zip")
  timeout       = 30
  memory_size   = 512
  vpc_config {
    security_group_ids = [aws_security_group.lambda_sg.id]
    subnet_ids         = [data.aws_subnets.default.ids[0]] # get the first subnet in the default VPC, can be improved by selecting based on availability zone or other criteria
  }
  environment {
    variables = {

      # Database configuration
      DB_NAME = "ems_db"
      # DB_TEST = "ems_test_db"
      MONGO_URL = "mongodb://${aws_instance.mongodb.private_ip}:27017" # use private IP to connect to MongoDB securely within the VPC
          
      # Security
      JWT_SECRET_KEY = var.jwt_secret_key
      JWT_ALGORITHM="HS256"
      JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
      BCRYPT_WORK_FACTOR=12
      ALLOWED_ORIGINS = "https://${aws_cloudfront_distribution.cdn.domain_name}" # allow only the cloudfront distribution domain to access the API for better security
    }
  }

} 


# API Gateway to expose lambda function as HTTP API, with CORS configuration to allow requests from cloudfront distribution domain

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.student_name}-${var.project_name}-api-gateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://${aws_cloudfront_distribution.cdn.domain_name}"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age = 300 # cache CORS preflight response for 5 minutes
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  # integration_uri = aws_lambda_function.api.arn
  integration_uri = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  
}

resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.api.id
  name   = "$default"
  auto_deploy = true

  depends_on = [aws_apigatewayv2_route.proxy]
}

resource "aws_lambda_permission" "apigw_lambda" {
  # statement_id = "AllowAPIGatewayInvoke"
  statement_id  = "AllowExecutionFromAPIGateway"

  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
  
  depends_on    = [aws_apigatewayv2_stage.default]  
}