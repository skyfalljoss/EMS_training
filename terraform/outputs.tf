output "cloudfront_url" {
    description = "Frontend URL - opened in browser to access the application"
    # value       = aws_cloudfront_distribution.frontend.domain_name
    value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "api_url" {
    description = "API gateway URL - opened in browser to access the application -- Set as VITE_API_URL in frontend/.env file"
    value = aws_apigatewayv2_stage.default.invoke_url
}

output "s3_bucket" {
    description = "s3 bucket name - used when syncing the frontend build"
    value = aws_s3_bucket.frontend.bucket
}

output "lambda_function-name" {
    description = "Lambda function name - used to upload backend zip file"
    value = aws_lambda_function.api.function_name
}

output "cloudfront_distribution_id" {
    description = "CloudFront distribution ID - used to invalidate cache after frontend deployment"
    value = aws_cloudfront_distribution.cdn.id
}

output "mongo_public_ip" {
    description = "MongoDB EC2 public IP use this to SSH into the instance and setup MongoDB. - use with ssh -i <pem_file> ec2-user@<mongo_public_ip>"
    value = aws_instance.mongodb.public_ip
}

output "mongo_private_ip" {
    description = "MongoDB EC2 private IP - used for internal communication within the VPC - used by lambda function to connect to MongoDB securely within the VPC"
    value = aws_instance.mongodb.private_ip
}

output "mongo_ssh_key_path" {
    description = "Local path to the generated MongoDB SSH private key (.pem). Use with ssh -i <path> ubuntu@<mongo_public_ip>."
    value = local_file.private_key.filename
}