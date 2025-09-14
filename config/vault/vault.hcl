storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address = "0.0.0.0:8203"
  tls_disable = true
}

api_addr = "http://localhost:8203"
ui = true
ui = true