# CloudFront Website Architecture

CloudFront 是 AWS 的內容分發網絡（CDN）服務，可以將網站內容緩存到全球各地的邊緣位置，從而提高網站的性能和可用性。

本網站也是通過CloudFront來進行分發的，下面是部署過程。

## 部署資源

### S3 Bucket
- aws_s3_bucket: This resource provides functionality for managing S3 general purpose buckets in an AWS Partition.
- aws_s3_bucket_versioning: This resource provides a resource for controlling versioning on an S3 bucket.
- aws_iam_policy_document: This data provides a resource for generating an IAM policy document.
- aws_s3_bucket_policy: This resource provides a resource for managing S3 bucket policies.

為什麼需要policy
- 因為S3 bucket可以保持私有，避免內容被直接訪問。
- 緩存控制，強制流量通過CloudFront，從而獲得更好的性能和安全性。
- 成本，直接訪問S3比CloudFront昂貴，且CloudFront具有HTTPS、geo-restriction等功能。

### CloudFront Distribution
- aws_cloudfront_origin_access_control: Manages an AWS CloudFront Origin Access Control, which is used by CloudFront Distributions with an Amazon S3 bucket as the origin.

- aws_cloudfront_distribution: Creates an Amazon CloudFront web distribution.

為什麼使用cloudfront oac
- S3 bucket預設是私有的，但是CloudFront需要讀取裡面的檔案，OAC的作用是讓CloudFront能夠以自己的身分（而不是公開的URL）去向S3發送帶有AWS SigV4簽名的請求，這樣S3 bucket可以設定Bucket policy只允許來自特定CloudFront Distribution的請求

### ACM
- aws_acm_certificate: The ACM certificate resource allows requesting and management of certificates from the Amazon Certificate Manager.

### CloudFlare
- Domain Name


## S3詳細配置
```hcl
data "aws_iam_policy_document" "s3_iam" {
    statement {
        sid = "AllowCloudFrontServicePrincipalReadWrite"
        effect = "Allow"

        principals {
            type = "Service"
            identifiers = ["cloudfront.amazonaws.com"]
        }

        actions = [
            "s3:GetObject",
            "s3:PutObject"
        ]

        resources = [
            "${aws_s3_bucket.qsy.arn}/*"
        ]

        condition {
            test = "StringEquals"
            variable = "AWS:SourceArn"
            values = [var.cloudfront_arn]
        }
    }
}
```

這是Terraform提供的一個data source，並不是resource，作用是通過HCL語法產生AWS IAM Policy的JSON格式字符串，最後通過.json屬性輸出，再給實際需要policy的資源，例如aws_s3_bucket_policy。

例如:
``` hcl
resource "aws_s3_bucket_policy" "s3_policy" {
    bucket = aws_s3_bucket.qsy.id
    policy = data.aws_iam_policy_document.s3_iam.json
}
```

比直接寫jsonencode({})有更好的易讀性，有語法癌症，可組成多個statement。

### statement block 一條權限規則
- sid: Statement ID，自取名稱，識別用途，可省略
- effect: 只能是Allow或者Deny
  
### principals bloc ——誰有權限
- type: 主題類型，可以有"AWS" "Service" "Federated"
- identifiers: AWS服務，如cloudfront.amazonaws.com

### actions ——允許的操作
- "s3:GetObject": 允許讀取S3對象
- "s3:PutObject": 允許寫入S3對象
- "s3:*": 允許所有S3操作
- "*": 允許所有操作
  
### resources ——作用對象
- `${aws_s3_bucket.qsy.arn}/*` : 允許對指定bucket下的所有對象進行操作
- arn:aws:s3:::mybucket : 允許對指定bucket本身進行操作
- arn:aws:s3:::mybucket/* : 允許對指定bucket下的特定對象進行操作

### condition block ——條件限制
- test: 條件測試類型，如StringEquals、IpAddress等
- variable: 條件變量，如AWS:SourceArn、AWS:SourceIp等
- values: 條件值，如var.cloudfront_arn

## CloudFront 詳細配置

### aws_cloudfront_origin_access_control
```hcl
resource "aws_cloudfront_origin_access_control" "control" {
    name = "${var.project}-cloudfront-origin-access-control"
    origin_access_control_origin_type = "s3"
    signing_behavior = "always"
    signing_protocol = "sigv4"
}
```

#### origin_access_control_origin_type
- 指定為"s3",來源類型，目前只支持S3
  
#### signing_behavior
- 對請求加簽名的行為，"always"表示始終對請求加簽名，"never"表示從不對請求加簽名，"no-override"表示如果來源已經有簽名則使用來源的簽名，否則根據CloudFront分配的OAC進行簽名。

#### signing_protocol
- AWS標準簽名協議，目前唯一選項

### aws_cloudfront_distribution
```hcl
esource "aws_cloudfront_distribution" "qsy_distribution" {
    origin {
        domain_name = var.regional_domain_name
        origin_access_control_id = aws_cloudfront_origin_access_control.control.id
        origin_id = "qsy"
    }

    enabled = true
    is_ipv6_enabled = true
    comment = "some comment"
    default_root_object = "index.html"

    aliases = ["qingshiyuu.com", "www.qingshiyuu.com"]

    default_cache_behavior {
        allowed_methods = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
        cached_methods = ["GET", "HEAD"]
        target_origin_id = "qsy"

        forwarded_values {
            query_string = false

            cookies {
                forward = "none"
            }
        }

        viewer_protocol_policy = "allow-all"
        min_ttl = 0
        default_ttl = 3600
        max_ttl = 86400
    }


    ordered_cache_behavior {
        path_pattern     = "/content/immutable/*"
        allowed_methods  = ["GET", "HEAD", "OPTIONS"]
        cached_methods   = ["GET", "HEAD", "OPTIONS"]
        target_origin_id = "qsy"

        forwarded_values {
            query_string = false
            headers      = ["Origin"]
            cookies {
                forward = "none"
            }
    }

        min_ttl                = 0
        default_ttl            = 86400
        max_ttl                = 31536000
        compress               = true
        viewer_protocol_policy = "redirect-to-https"
    }

  # Cache behavior with precedence 1
    ordered_cache_behavior {
        path_pattern     = "/content/*"
        allowed_methods  = ["GET", "HEAD", "OPTIONS"]
        cached_methods   = ["GET", "HEAD"]
        target_origin_id = "qsy"
        forwarded_values {
            query_string = false
            cookies {
                forward = "none"
      }
    }

        min_ttl                = 0
        default_ttl            = 3600
        max_ttl                = 86400
        compress               = true
        viewer_protocol_policy = "redirect-to-https"
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "production"
  }

  viewer_certificate {
    acm_certificate_arn = var.acm_certificate_arn
    ssl_support_method  = "sni-only"
  }

}
```

#### domain_name
- S3 bucket的regional domain（例如xxx.s3.us-east-1.amazonaws.com）

#### origin_access_control_id
- 綁定上面的OAC，讓CloudFront能夠以自己的身分去訪問私有S3 bucket

#### origin_id 
- 來源的別稱，在cache behavior中用target_origin_id引用

#### enabled
- 是否啟用此distribution

#### is_ipv6_enabled
- 是否啟用IPv6支持

#### comment 
- 分配的註釋，沒有特定功能

#### default_root_object
- 當訪問根URL時返回的默認對象，這裡是index.html

#### aliases
- 自定義域名，需配合ACM使用

#### price_class
- 決定使用哪些Edge Location， PriceClass_200包含北美、歐洲以及亞洲部分節點，比All便宜

#### default_cache_behavior
- allowed_methods: CloudFront接受並轉發給origin的HTTP方法
- cached_methods: 實際會被快取的方法(通常是GET/HEAD)
- target_origin_id: 指定此cache behavior對應的origin，這裡是上面定義的"qsy"
- forwarded_values: false=不把query string傳給origin，也不納入快取key
- cookies.forward: "none"=不轉發cookie，提升效率
- viewer_protocol_policy: "allow-all"=允許HTTP和HTTPS訪問，"redirect-to-https"=將HTTP請求重定向到HTTPS，"https-only"=只允許HTTPS訪問
- min_ttl/default_ttl/max_ttl: 分別是最小、默認和最大快取時間，單位是秒

#### ordered_cahce_behavior
按照宣告順序比對路徑，比default優先

#### restrictions.geo_restriction
- restriction_type: "none"=不限制，"blacklist"=禁止訪問，"whitelist"=只允許訪問

#### viewer_certificate
- acm_certificate_arn: ACM證書的ARN，必須要在us-east-1申請，以支持自定域名HTTPS
- ssl_support_method: "sni-only"=使用SNI，節省成本，另一個"vip"需要額外付費


## ACM 配置
由於我是在CloudFlare註冊的域名，所以部署過程中需要手動操作+自動化操作


### 第一步
ACM要驗證我真的擁有qingshiyuu.com域名，流程是
- 在AWS Console手動申請qingshiyuu.com的ACM證書，必須在us-east-1區域申請，因為CloudFront只認us-east-1的證書
- AWS ACM給我一條CNAME記錄，格式類似: _abc123.qingshiyuu.com  →  _xyz789.acm-validations.aws
- 在我的CloudFlare DNS管理界面添加這條CNAME記錄，完成域名所有權驗證
- AWS偵測到CNAME後，憑證變成ISSUED

### 第二步
```hcl
data "aws_acm_certificate" "qsy_cert" {
    domain = "qingshiyuu.com"
    statuses = ["ISSUED"]
}
```
- 在Terraform中使用data source aws_acm_certificate來查詢已經發行的ACM證書。
- 通過output輸出到 cloudfront module中的cloudfront_distribution的viewer_certificate.acm_certificate_arn屬性，讓CloudFront使用這個證書來支持HTTPS。
- CloudFront會給我一個distribution domain，例如d1234abcd.cloudfront.net。我需要在CloudFlare中加入一條CNAME記錄，讓qingshiyuu.com指向d1234abcd.cloudfront.net，這樣訪問qingshiyuu.com就會通過CloudFront分發內容了。⋯⋯


## 參考文檔
- [AWS 官方文檔](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate)

- [Hosting a Static Website on Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)