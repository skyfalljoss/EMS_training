variable "student_name"{
    description = "The name of the student in lowercase with hyphens. Must be used to name all resources created: student-phong-nguyen"
    type        = string
    validation {
      condition = can(regex("^[a-z0-9-]+$", var.student_name))
      error_message = " The student_name must be in lowercase, number and hyphens only"
    }
}

variable "project_name" {
    description = "Project name. - combined with student_name to form resource names."
    default = "ems"
}

variable "aws-region" {
    description = "AWS region to deploy recources in"
    type = string
    default = "us-east-1"
  
}

variable "cohort" {
    description = "cohort identifier tagged on every resources"
    type = string
    default = "fullstack-aws"
  
}

variable "jwt_secret_key" {
    description = "JWT secret key for authentication"
    type = string
    sensitive = true
    default = "jwt-secret-key"
}

variable "ec2_key_name" {
    description = "Name of an existing EC2 key pair in the target region used to SSH into the MongoDB instance."
    type = string
}