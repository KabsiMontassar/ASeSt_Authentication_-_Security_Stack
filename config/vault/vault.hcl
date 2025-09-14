storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address = "0.0.0.0:8202"
  tls_disable = true
}

api_addr = "http://localhost:8202"
ui = true