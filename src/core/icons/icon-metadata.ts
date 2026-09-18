export interface StencilMetadata {
  name: string
  category: string
  tags: string[]
}

export const KNOWN_STENCILS: Record<string, StencilMetadata> = {
  "generic/server": {
    "name": "Server / Host",
    "category": "compute",
    "tags": [
      "server",
      "compute",
      "host",
      "machine",
      "backend"
    ]
  },
  "generic/database": {
    "name": "Database",
    "category": "storage",
    "tags": [
      "database",
      "db",
      "sql",
      "storage",
      "data"
    ]
  },
  "generic/cache": {
    "name": "Cache / In-Memory",
    "category": "storage",
    "tags": [
      "cache",
      "redis",
      "memcached",
      "memory",
      "fast"
    ]
  },
  "generic/queue": {
    "name": "Message Queue",
    "category": "integration",
    "tags": [
      "queue",
      "mq",
      "kafka",
      "rabbitmq",
      "async",
      "buffer"
    ]
  },
  "generic/load-balancer": {
    "name": "Load Balancer",
    "category": "network",
    "tags": [
      "load balancer",
      "lb",
      "traffic",
      "proxy",
      "reverse proxy"
    ]
  },
  "generic/firewall": {
    "name": "Firewall / Security",
    "category": "security",
    "tags": [
      "firewall",
      "security",
      "shield",
      "protect",
      "waf"
    ]
  },
  "generic/cloud": {
    "name": "Cloud Provider",
    "category": "network",
    "tags": [
      "cloud",
      "internet",
      "wan",
      "provider"
    ]
  },
  "generic/client": {
    "name": "Client Device",
    "category": "edge",
    "tags": [
      "client",
      "device",
      "laptop",
      "browser",
      "frontend",
      "pc"
    ]
  },
  "generic/mobile": {
    "name": "Mobile Phone",
    "category": "edge",
    "tags": [
      "mobile",
      "phone",
      "ios",
      "android",
      "app"
    ]
  },
  "generic/storage-bucket": {
    "name": "Object Storage Bucket",
    "category": "storage",
    "tags": [
      "storage",
      "disk",
      "bucket",
      "files",
      "san",
      "nas"
    ]
  },
  "generic/user": {
    "name": "User / Actor",
    "category": "edge",
    "tags": [
      "user",
      "person",
      "actor",
      "customer",
      "admin"
    ]
  },
  "generic/event-bus": {
    "name": "Event Bus",
    "category": "integration",
    "tags": [
      "event bus",
      "events",
      "pubsub",
      "kafka",
      "messaging"
    ]
  },
  "generic/gateway": {
    "name": "API Gateway",
    "category": "network",
    "tags": [
      "gateway",
      "api gateway",
      "reverse proxy",
      "routing",
      "ingress"
    ]
  },
  "generic/redis": { "name": "Redis", "category": "database", "tags": ["redis", "cache", "in-memory", "key-value"] },
  "generic/postgresql": { "name": "PostgreSQL", "category": "database", "tags": ["postgresql", "postgres", "rdbms", "sql", "database"] },
  "generic/mysql": { "name": "MySQL", "category": "database", "tags": ["mysql", "rdbms", "sql", "database"] },
  "generic/mongodb": { "name": "MongoDB", "category": "database", "tags": ["mongodb", "mongo", "document", "nosql", "database"] },
  "generic/elasticsearch": { "name": "Elasticsearch", "category": "database", "tags": ["elasticsearch", "elastic", "search", "logs", "database"] },
  "generic/cassandra": { "name": "Apache Cassandra", "category": "database", "tags": ["cassandra", "wide-column", "nosql", "database"] },
  "generic/cockroachdb": { "name": "CockroachDB", "category": "database", "tags": ["cockroachdb", "sql", "distributed", "database"] },
  "generic/kafka": { "name": "Apache Kafka", "category": "integration", "tags": ["kafka", "streaming", "event bus", "messaging"] },
  "generic/rabbitmq": { "name": "RabbitMQ", "category": "integration", "tags": ["rabbitmq", "amqp", "queue", "messaging"] },
  "generic/nats": { "name": "NATS", "category": "integration", "tags": ["nats", "messaging", "pubsub", "queue"] },
  "generic/pulsar": { "name": "Apache Pulsar", "category": "integration", "tags": ["pulsar", "streaming", "messaging", "pubsub"] },
  "generic/docker": { "name": "Docker", "category": "containers", "tags": ["docker", "container", "images", "runtime"] },
  "generic/nginx": { "name": "NGINX", "category": "networking", "tags": ["nginx", "web server", "reverse proxy", "load balancer"] },
  "generic/traefik": { "name": "Traefik", "category": "networking", "tags": ["traefik", "reverse proxy", "ingress", "load balancer"] },
  "generic/vault": { "name": "HashiCorp Vault", "category": "security", "tags": ["vault", "secrets", "keys", "credentials"] },
  "generic/prometheus": { "name": "Prometheus", "category": "observability", "tags": ["prometheus", "metrics", "monitoring", "observability"] },
  "generic/grafana": { "name": "Grafana", "category": "observability", "tags": ["grafana", "dashboards", "metrics", "observability"] },
  "generic/jaeger": { "name": "Jaeger", "category": "observability", "tags": ["jaeger", "tracing", "traces", "observability"] },
  "generic/opentelemetry": { "name": "OpenTelemetry", "category": "observability", "tags": ["opentelemetry", "otel", "traces", "metrics", "logs"] },
  "generic/elastic": { "name": "Elastic", "category": "observability", "tags": ["elastic", "elasticsearch", "logs", "observability"] },
  "generic/terraform": { "name": "Terraform", "category": "devops", "tags": ["terraform", "iac", "infrastructure as code", "devops"] },
  "generic/ansible": { "name": "Ansible", "category": "devops", "tags": ["ansible", "automation", "configuration management", "devops"] },
  "generic/jenkins": { "name": "Jenkins", "category": "devops", "tags": ["jenkins", "ci", "cd", "pipeline"] },
  "generic/github-actions": { "name": "GitHub Actions", "category": "devops", "tags": ["github actions", "ci", "cd", "pipeline"] },
  "generic/gitlab": { "name": "GitLab", "category": "devops", "tags": ["gitlab", "ci", "cd", "repository"] },
  "generic/minio": { "name": "MinIO", "category": "storage", "tags": ["minio", "object storage", "s3", "bucket"] },
  "generic/airflow": { "name": "Apache Airflow", "category": "devops", "tags": ["airflow", "workflow", "orchestration", "pipelines"] },
  "generic/envoy": { "name": "Envoy", "category": "networking", "tags": ["envoy", "proxy", "service mesh", "load balancer"] },
  "aws/ec2": {
    "name": "Amazon EC2",
    "category": "compute",
    "tags": [
      "aws",
      "compute",
      "ec2",
      "virtual machine",
      "server",
      "instance"
    ]
  },
  "aws/lambda": {
    "name": "AWS Lambda",
    "category": "compute",
    "tags": [
      "aws",
      "compute",
      "lambda",
      "serverless",
      "function",
      "faas"
    ]
  },
  "aws/ecs": {
    "name": "Amazon ECS",
    "category": "containers",
    "tags": [
      "aws",
      "containers",
      "ecs",
      "docker",
      "orchestration"
    ]
  },
  "aws/eks": {
    "name": "Amazon EKS",
    "category": "containers",
    "tags": [
      "aws",
      "containers",
      "eks",
      "kubernetes",
      "k8s"
    ]
  },
  "aws/fargate": {
    "name": "AWS Fargate",
    "category": "containers",
    "tags": [
      "aws",
      "containers",
      "fargate",
      "serverless",
      "docker"
    ]
  },
  "aws/ecr": {
    "name": "Amazon ECR",
    "category": "containers",
    "tags": [
      "aws",
      "containers",
      "ecr",
      "registry",
      "images"
    ]
  },
  "aws/s3": {
    "name": "Amazon S3",
    "category": "storage",
    "tags": [
      "aws",
      "storage",
      "s3",
      "bucket",
      "object",
      "blob"
    ]
  },
  "aws/s3-glacier": {
    "name": "Amazon S3 Glacier",
    "category": "storage",
    "tags": [
      "aws",
      "storage",
      "glacier",
      "archive",
      "backup"
    ]
  },
  "aws/ebs": {
    "name": "Amazon EBS",
    "category": "storage",
    "tags": [
      "aws",
      "storage",
      "ebs",
      "block",
      "volume",
      "disk"
    ]
  },
  "aws/efs": {
    "name": "Amazon EFS",
    "category": "storage",
    "tags": [
      "aws",
      "storage",
      "efs",
      "nfs",
      "file system",
      "shared"
    ]
  },
  "aws/rds": {
    "name": "Amazon RDS",
    "category": "database",
    "tags": [
      "aws",
      "database",
      "rds",
      "relational",
      "sql",
      "postgres",
      "mysql"
    ]
  },
  "aws/aurora": {
    "name": "Amazon Aurora",
    "category": "database",
    "tags": [
      "aws",
      "database",
      "aurora",
      "postgres",
      "mysql",
      "serverless db"
    ]
  },
  "aws/dynamodb": {
    "name": "Amazon DynamoDB",
    "category": "database",
    "tags": [
      "aws",
      "database",
      "dynamodb",
      "nosql",
      "key-value",
      "document"
    ]
  },
  "aws/elasticache": {
    "name": "Amazon ElastiCache",
    "category": "database",
    "tags": [
      "aws",
      "database",
      "cache",
      "elasticache",
      "redis",
      "memcached"
    ]
  },
  "aws/redshift": {
    "name": "Amazon Redshift",
    "category": "database",
    "tags": [
      "aws",
      "database",
      "redshift",
      "data warehouse",
      "olap",
      "analytics"
    ]
  },
  "aws/cloudfront": {
    "name": "Amazon CloudFront",
    "category": "networking",
    "tags": [
      "aws",
      "networking",
      "cloudfront",
      "cdn",
      "edge",
      "cache"
    ]
  },
  "aws/api-gateway": {
    "name": "Amazon API Gateway",
    "category": "networking",
    "tags": [
      "aws",
      "networking",
      "api gateway",
      "rest",
      "http",
      "websocket"
    ]
  },
  "aws/route-53": {
    "name": "Amazon Route 53",
    "category": "networking",
    "tags": [
      "aws",
      "networking",
      "route53",
      "dns",
      "domain",
      "routing"
    ]
  },
  "aws/vpc": {
    "name": "Amazon VPC",
    "category": "networking",
    "tags": [
      "aws",
      "networking",
      "vpc",
      "virtual network",
      "subnet",
      "cidr"
    ]
  },
  "aws/elastic-load-balancing": {
    "name": "Elastic Load Balancing",
    "category": "networking",
    "tags": [
      "aws",
      "networking",
      "alb",
      "nlb",
      "load balancer",
      "traffic"
    ]
  },
  "aws/sqs": {
    "name": "Amazon SQS",
    "category": "integration",
    "tags": [
      "aws",
      "messaging",
      "queue",
      "sqs",
      "fifo",
      "async"
    ]
  },
  "aws/sns": {
    "name": "Amazon SNS",
    "category": "integration",
    "tags": [
      "aws",
      "messaging",
      "sns",
      "pubsub",
      "notifications",
      "topics"
    ]
  },
  "aws/eventbridge": {
    "name": "Amazon EventBridge",
    "category": "integration",
    "tags": [
      "aws",
      "messaging",
      "eventbridge",
      "event bus",
      "events",
      "eda"
    ]
  },
  "aws/step-functions": {
    "name": "AWS Step Functions",
    "category": "integration",
    "tags": [
      "aws",
      "integration",
      "step functions",
      "workflow",
      "orchestration",
      "state machine"
    ]
  },
  "aws/iam": {
    "name": "AWS IAM",
    "category": "security",
    "tags": [
      "aws",
      "security",
      "iam",
      "roles",
      "permissions",
      "auth"
    ]
  },
  "aws/secrets-manager": {
    "name": "AWS Secrets Manager",
    "category": "security",
    "tags": [
      "aws",
      "security",
      "secrets",
      "passwords",
      "rotation"
    ]
  },
  "aws/kms": {
    "name": "AWS KMS",
    "category": "security",
    "tags": [
      "aws",
      "security",
      "kms",
      "encryption",
      "keys",
      "cryptography"
    ]
  },
  "aws/cognito": {
    "name": "Amazon Cognito",
    "category": "security",
    "tags": [
      "aws",
      "security",
      "cognito",
      "auth",
      "user pools",
      "jwt"
    ]
  },
  "aws/waf": {
    "name": "AWS WAF",
    "category": "security",
    "tags": [
      "aws",
      "security",
      "waf",
      "firewall",
      "shield",
      "ddos"
    ]
  },
  "aws/sagemaker": {
    "name": "Amazon SageMaker",
    "category": "ai",
    "tags": [
      "aws",
      "ai",
      "sagemaker",
      "machine learning",
      "ml",
      "models"
    ]
  },
  "aws/bedrock": {
    "name": "Amazon Bedrock",
    "category": "ai",
    "tags": [
      "aws",
      "ai",
      "bedrock",
      "genai",
      "llm",
      "foundational models"
    ]
  },
  "aws/kinesis": {
    "name": "Amazon Kinesis",
    "category": "analytics",
    "tags": [
      "aws",
      "analytics",
      "kinesis",
      "streaming",
      "real-time",
      "events"
    ]
  },
  "aws/opensearch": {
    "name": "Amazon OpenSearch",
    "category": "analytics",
    "tags": [
      "aws",
      "analytics",
      "opensearch",
      "elasticsearch",
      "search",
      "logs"
    ]
  },
  "azure/vm": {
    "name": "Azure Virtual Machine",
    "category": "compute",
    "tags": [
      "azure",
      "compute",
      "vm",
      "iaas",
      "server",
      "linux",
      "windows"
    ]
  },
  "azure/functions": {
    "name": "Azure Functions",
    "category": "compute",
    "tags": [
      "azure",
      "compute",
      "functions",
      "serverless",
      "faas",
      "event-driven"
    ]
  },
  "azure/app-services": {
    "name": "Azure App Service",
    "category": "compute",
    "tags": [
      "azure",
      "compute",
      "app service",
      "web app",
      "paas",
      "hosting"
    ]
  },
  "azure/vm-scale-sets": {
    "name": "Azure VM Scale Sets",
    "category": "compute",
    "tags": [
      "azure",
      "compute",
      "vmss",
      "scale set",
      "autoscaling"
    ]
  },
  "azure/aks": {
    "name": "Azure Kubernetes Service (AKS)",
    "category": "containers",
    "tags": [
      "azure",
      "containers",
      "aks",
      "kubernetes",
      "k8s",
      "orchestration"
    ]
  },
  "azure/container-instances": {
    "name": "Azure Container Instances",
    "category": "containers",
    "tags": [
      "azure",
      "containers",
      "aci",
      "serverless container"
    ]
  },
  "azure/container-registries": {
    "name": "Azure Container Registry",
    "category": "containers",
    "tags": [
      "azure",
      "containers",
      "acr",
      "docker registry",
      "images"
    ]
  },
  "azure/blob": {
    "name": "Azure Blob Storage",
    "category": "storage",
    "tags": [
      "azure",
      "storage",
      "blob",
      "storage account",
      "object storage"
    ]
  },
  "azure/files": {
    "name": "Azure Files",
    "category": "storage",
    "tags": [
      "azure",
      "storage",
      "files",
      "smb",
      "nfs"
    ]
  },
  "azure/cosmos": {
    "name": "Azure Cosmos DB",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "cosmos",
      "nosql",
      "multimodel",
      "global"
    ]
  },
  "azure/sql": {
    "name": "Azure SQL Database",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "sql",
      "azure sql",
      "relational",
      "rdbms"
    ]
  },
  "azure/postgresql": {
    "name": "Azure Database for PostgreSQL",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "postgres",
      "postgresql",
      "rdbms"
    ]
  },
  "azure/mysql": {
    "name": "Azure Database for MySQL",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "mysql",
      "rdbms"
    ]
  },
  "azure/synapse": {
    "name": "Azure Synapse Analytics",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "synapse",
      "data warehouse",
      "analytics"
    ]
  },
  "azure/redis": {
    "name": "Azure Cache for Redis",
    "category": "database",
    "tags": [
      "azure",
      "database",
      "redis",
      "cache",
      "in-memory"
    ]
  },
  "azure/vnet": {
    "name": "Azure Virtual Network (VNet)",
    "category": "networking",
    "tags": [
      "azure",
      "networking",
      "vnet",
      "virtual network",
      "subnet"
    ]
  },
  "azure/application-gateways": {
    "name": "Azure Application Gateway",
    "category": "networking",
    "tags": [
      "azure",
      "networking",
      "app gateway",
      "waf",
      "l7 load balancer"
    ]
  },
  "azure/load-balancers": {
    "name": "Azure Load Balancer",
    "category": "networking",
    "tags": [
      "azure",
      "networking",
      "load balancer",
      "l4"
    ]
  },
  "azure/dns": {
    "name": "Azure DNS Zones",
    "category": "networking",
    "tags": [
      "azure",
      "networking",
      "dns",
      "domains"
    ]
  },
  "azure/front-door": {
    "name": "Azure Front Door & CDN",
    "category": "networking",
    "tags": [
      "azure",
      "networking",
      "front door",
      "cdn",
      "edge"
    ]
  },
  "azure/event-hubs": {
    "name": "Azure Event Hubs",
    "category": "integration",
    "tags": [
      "azure",
      "messaging",
      "event hubs",
      "kafka",
      "streaming"
    ]
  },
  "azure/service-bus": {
    "name": "Azure Service Bus",
    "category": "integration",
    "tags": [
      "azure",
      "messaging",
      "service bus",
      "queue",
      "topics",
      "enterprise"
    ]
  },
  "azure/event-grid": {
    "name": "Azure Event Grid",
    "category": "integration",
    "tags": [
      "azure",
      "messaging",
      "event grid",
      "pubsub",
      "eda"
    ]
  },
  "azure/logic-apps": {
    "name": "Azure Logic Apps",
    "category": "integration",
    "tags": [
      "azure",
      "integration",
      "logic apps",
      "workflow",
      "orchestration"
    ]
  },
  "azure/key-vault": {
    "name": "Azure Key Vault",
    "category": "security",
    "tags": [
      "azure",
      "security",
      "key vault",
      "secrets",
      "keys",
      "certificates"
    ]
  },
  "azure/openai": {
    "name": "Azure OpenAI Service",
    "category": "ai",
    "tags": [
      "azure",
      "ai",
      "openai",
      "gpt",
      "chatgpt",
      "genai",
      "llm"
    ]
  },
  "azure/cognitive-services": {
    "name": "Azure Cognitive Services",
    "category": "ai",
    "tags": [
      "azure",
      "ai",
      "vision",
      "speech",
      "language"
    ]
  },
  "azure/monitor": {
    "name": "Azure Monitor",
    "category": "monitor",
    "tags": [
      "azure",
      "monitoring",
      "monitor",
      "metrics",
      "logs",
      "observability"
    ]
  },
  "azure/log-analytics": {
    "name": "Log Analytics Workspace",
    "category": "monitor",
    "tags": [
      "azure",
      "monitoring",
      "log analytics",
      "kusto",
      "queries"
    ]
  },
  "azure/application-insights": {
    "name": "Application Insights",
    "category": "monitor",
    "tags": [
      "azure",
      "monitoring",
      "app insights",
      "apm",
      "telemetry"
    ]
  },
  "gcp/compute-engine": {
    "name": "Google Compute Engine",
    "category": "compute",
    "tags": [
      "gcp",
      "google cloud",
      "compute",
      "vm",
      "instance"
    ]
  },
  "gcp/gke": {
    "name": "Google Kubernetes Engine (GKE)",
    "category": "containers",
    "tags": [
      "gcp",
      "google cloud",
      "containers",
      "gke",
      "kubernetes",
      "k8s"
    ]
  },
  "gcp/cloud-run": {
    "name": "Google Cloud Run",
    "category": "containers",
    "tags": [
      "gcp",
      "google cloud",
      "containers",
      "cloud run",
      "serverless",
      "docker"
    ]
  },
  "gcp/cloud-storage": {
    "name": "Google Cloud Storage (GCS)",
    "category": "storage",
    "tags": [
      "gcp",
      "google cloud",
      "storage",
      "gcs",
      "bucket",
      "blob"
    ]
  },
  "gcp/gcs": {
    "name": "Google Cloud Storage (GCS)",
    "category": "storage",
    "tags": [
      "gcp",
      "google cloud",
      "storage",
      "gcs",
      "bucket",
      "blob"
    ]
  },
  "gcp/cloud-sql": {
    "name": "Google Cloud SQL",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "cloud sql",
      "postgres",
      "mysql",
      "sql server"
    ]
  },
  "gcp/spanner": {
    "name": "Google Cloud Spanner",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "spanner",
      "globally distributed",
      "sql"
    ]
  },
  "gcp/bigquery": {
    "name": "Google Cloud BigQuery",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "bigquery",
      "data warehouse",
      "analytics"
    ]
  },
  "gcp/alloydb": {
    "name": "Google AlloyDB for PostgreSQL",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "alloydb",
      "postgres"
    ]
  },
  "gcp/vertex-ai": {
    "name": "Google Vertex AI",
    "category": "ai",
    "tags": [
      "gcp",
      "google cloud",
      "ai",
      "vertex",
      "machine learning",
      "ml",
      "genai",
      "gemini"
    ]
  },
  "gcp/ai-hypercomputer": {
    "name": "AI Hypercomputer",
    "category": "ai",
    "tags": [
      "gcp",
      "google cloud",
      "ai",
      "tpu",
      "gpu",
      "supercomputing"
    ]
  },
  "gcp/apigee": {
    "name": "Google Apigee API Management",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "apigee",
      "api gateway",
      "apis"
    ]
  },
  "gcp/security-command-center": {
    "name": "Security Command Center",
    "category": "security",
    "tags": [
      "gcp",
      "google cloud",
      "security",
      "scc",
      "compliance"
    ]
  },
  "gcp/secops": {
    "name": "Google Security Operations",
    "category": "security",
    "tags": [
      "gcp",
      "google cloud",
      "security",
      "secops",
      "siem",
      "soar"
    ]
  },
  "gcp/looker": {
    "name": "Google Looker",
    "category": "analytics",
    "tags": [
      "gcp",
      "google cloud",
      "analytics",
      "looker",
      "bi",
      "dashboards"
    ]
  },
  "gcp/cloud-functions": {
    "name": "Google Cloud Functions",
    "category": "compute",
    "tags": [
      "gcp",
      "google cloud",
      "compute",
      "cloud functions",
      "serverless",
      "faas"
    ]
  },
  "gcp/app-engine": {
    "name": "Google App Engine",
    "category": "compute",
    "tags": [
      "gcp",
      "google cloud",
      "compute",
      "app engine",
      "paas"
    ]
  },
  "gcp/firestore": {
    "name": "Google Cloud Firestore",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "firestore",
      "nosql",
      "document db"
    ]
  },
  "gcp/memorystore": {
    "name": "Google Memorystore",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "memorystore",
      "redis",
      "cache"
    ]
  },
  "gcp/bigtable": {
    "name": "Google Cloud Bigtable",
    "category": "database",
    "tags": [
      "gcp",
      "google cloud",
      "database",
      "bigtable",
      "nosql",
      "wide-column"
    ]
  },
  "gcp/pubsub": {
    "name": "Google Cloud Pub/Sub",
    "category": "integration",
    "tags": [
      "gcp",
      "google cloud",
      "messaging",
      "pubsub",
      "streaming",
      "topics"
    ]
  },
  "gcp/cloud-load-balancing": {
    "name": "Cloud Load Balancing",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "load balancing",
      "traffic",
      "http proxy"
    ]
  },
  "gcp/cloud-cdn": {
    "name": "Google Cloud CDN",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "cdn",
      "cache",
      "edge"
    ]
  },
  "gcp/cloud-dns": {
    "name": "Google Cloud DNS",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "dns",
      "domains"
    ]
  },
  "gcp/cloud-armor": {
    "name": "Google Cloud Armor",
    "category": "security",
    "tags": [
      "gcp",
      "google cloud",
      "security",
      "armor",
      "waf",
      "ddos"
    ]
  },
  "gcp/cloud-nat": {
    "name": "Google Cloud NAT",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "nat",
      "gateway"
    ]
  },
  "gcp/vpc": {
    "name": "Google Virtual Private Cloud",
    "category": "networking",
    "tags": [
      "gcp",
      "google cloud",
      "networking",
      "vpc",
      "subnets",
      "firewall"
    ]
  },
  "gcp/cloud-iam": {
    "name": "Google Cloud IAM",
    "category": "security",
    "tags": [
      "gcp",
      "google cloud",
      "security",
      "iam",
      "roles",
      "permissions"
    ]
  },
  "gcp/secret-manager": {
    "name": "Google Secret Manager",
    "category": "security",
    "tags": [
      "gcp",
      "google cloud",
      "security",
      "secret manager",
      "passwords"
    ]
  },
  "gcp/cloud-build": {
    "name": "Google Cloud Build",
    "category": "devops",
    "tags": [
      "gcp",
      "google cloud",
      "devops",
      "cloud build",
      "ci/cd",
      "pipelines"
    ]
  },
  "gcp/artifact-registry": {
    "name": "Google Artifact Registry",
    "category": "devops",
    "tags": [
      "gcp",
      "google cloud",
      "devops",
      "artifact registry",
      "docker",
      "npm",
      "maven"
    ]
  },
  "gcp/workflows": {
    "name": "Google Cloud Workflows",
    "category": "integration",
    "tags": [
      "gcp",
      "google cloud",
      "integration",
      "workflows",
      "orchestration"
    ]
  },
  "gcp/cloud-logging": {
    "name": "Google Cloud Logging",
    "category": "monitor",
    "tags": [
      "gcp",
      "google cloud",
      "monitor",
      "logging",
      "logs",
      "stackdriver"
    ]
  },
  "gcp/cloud-monitoring": {
    "name": "Google Cloud Monitoring",
    "category": "monitor",
    "tags": [
      "gcp",
      "google cloud",
      "monitor",
      "metrics",
      "stackdriver",
      "dashboards"
    ]
  },
  "kubernetes/pod": {
    "name": "Kubernetes Pod",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "pod",
      "container",
      "workload"
    ]
  },
  "kubernetes/deployment": {
    "name": "Kubernetes Deployment",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "deployment",
      "deploy",
      "stateless",
      "replicaset"
    ]
  },
  "kubernetes/service": {
    "name": "Kubernetes Service",
    "category": "networking",
    "tags": [
      "kubernetes",
      "k8s",
      "service",
      "svc",
      "clusterip",
      "nodeport",
      "loadbalancer"
    ]
  },
  "kubernetes/ingress": {
    "name": "Kubernetes Ingress",
    "category": "networking",
    "tags": [
      "kubernetes",
      "k8s",
      "ingress",
      "alb",
      "routing",
      "tls",
      "gateway"
    ]
  },
  "kubernetes/configmap": {
    "name": "Kubernetes ConfigMap",
    "category": "configuration",
    "tags": [
      "kubernetes",
      "k8s",
      "configmap",
      "cm",
      "configuration",
      "env"
    ]
  },
  "kubernetes/secret": {
    "name": "Kubernetes Secret",
    "category": "configuration",
    "tags": [
      "kubernetes",
      "k8s",
      "secret",
      "credentials",
      "tls",
      "security"
    ]
  },
  "kubernetes/statefulset": {
    "name": "Kubernetes StatefulSet",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "statefulset",
      "sts",
      "stateful",
      "database"
    ]
  },
  "kubernetes/daemonset": {
    "name": "Kubernetes DaemonSet",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "daemonset",
      "ds",
      "agent",
      "logging",
      "node-agent"
    ]
  },
  "kubernetes/job": {
    "name": "Kubernetes Job",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "job",
      "batch",
      "task",
      "cron"
    ]
  },
  "kubernetes/cronjob": {
    "name": "Kubernetes CronJob",
    "category": "workloads",
    "tags": [
      "kubernetes",
      "k8s",
      "cronjob",
      "scheduled",
      "cron",
      "timer"
    ]
  },
  "kubernetes/pv": {
    "name": "PersistentVolume (PV)",
    "category": "storage",
    "tags": [
      "kubernetes",
      "k8s",
      "pv",
      "persistent volume",
      "storage",
      "disk"
    ]
  },
  "kubernetes/pvc": {
    "name": "PersistentVolumeClaim (PVC)",
    "category": "storage",
    "tags": [
      "kubernetes",
      "k8s",
      "pvc",
      "claim",
      "storage",
      "volume"
    ]
  },
  "kubernetes/storageclass": {
    "name": "Kubernetes StorageClass",
    "category": "storage",
    "tags": [
      "kubernetes",
      "k8s",
      "sc",
      "storage class",
      "provisioner"
    ]
  },
  "kubernetes/namespace": {
    "name": "Kubernetes Namespace",
    "category": "cluster",
    "tags": [
      "kubernetes",
      "k8s",
      "namespace",
      "ns",
      "multi-tenancy",
      "isolation"
    ]
  },
  "kubernetes/network-policy": {
    "name": "Kubernetes NetworkPolicy",
    "category": "networking",
    "tags": [
      "kubernetes",
      "k8s",
      "netpol",
      "network policy",
      "security",
      "firewall"
    ]
  },
  "kubernetes/hpa": {
    "name": "Horizontal Pod Autoscaler (HPA)",
    "category": "cluster",
    "tags": [
      "kubernetes",
      "k8s",
      "hpa",
      "autoscaler",
      "scaling",
      "metrics"
    ]
  },
  "kubernetes/crd": {
    "name": "CustomResourceDefinition (CRD)",
    "category": "cluster",
    "tags": [
      "kubernetes",
      "k8s",
      "crd",
      "custom resource",
      "operator"
    ]
  },
  "kubernetes/service-account": {
    "name": "Kubernetes ServiceAccount",
    "category": "security",
    "tags": [
      "kubernetes",
      "k8s",
      "sa",
      "service account",
      "rbac",
      "identity"
    ]
  },
  "kubernetes/role": {
    "name": "Kubernetes Role",
    "category": "security",
    "tags": [
      "kubernetes",
      "k8s",
      "role",
      "rbac",
      "permissions"
    ]
  },
  "kubernetes/cluster-role": {
    "name": "Kubernetes ClusterRole",
    "category": "security",
    "tags": [
      "kubernetes",
      "k8s",
      "cluster role",
      "c-role",
      "rbac"
    ]
  },
  "kubernetes/node": {
    "name": "Kubernetes Worker Node",
    "category": "infrastructure",
    "tags": [
      "kubernetes",
      "k8s",
      "node",
      "worker",
      "host",
      "vm",
      "server"
    ]
  },
  "kubernetes/control-plane": {
    "name": "Kubernetes Control Plane",
    "category": "infrastructure",
    "tags": [
      "kubernetes",
      "k8s",
      "control plane",
      "master",
      "api-server"
    ]
  },
  "kubernetes/etcd": {
    "name": "Kubernetes etcd Cluster",
    "category": "infrastructure",
    "tags": [
      "kubernetes",
      "k8s",
      "etcd",
      "datastore",
      "raft",
      "key-value"
    ]
  }
}
