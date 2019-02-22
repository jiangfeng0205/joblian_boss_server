# joblian_boss_server
joblian的boss服务端，基于nodejs+express

nginx配置
```
# upstream 配置
upstream nodejs {
    server 127.0.0.1:8090;  # 端口需要和nodejs监听的端口保持一致
}

# 服务端配置
server
    {
        listen 80;
        server_name ceshi.joblian.cn;
        # root    "/home/wwwroot/boss/server";

         location / {
            proxy_pass http://nodejs;
         }
        access_log  /home/wwwlogs/boss.log;
        error_log  /home/wwwlogs/boss.log;
    }

# web端配置
server {
    listen       80;

    server_name weixin.joblian.cn;
    # server_name dd.feixingshenqi.com;
    index index.html index.htm index.php default.html default.htm default.php;
    root    "/home/wwwroot/boss/web";

    location /apis/ {
        # rewrite ^/(.*)$  /$1  last;
        proxy_pass http://ceshi.joblian.cn/; # 当访问apis的时候默认转发到 8090端口
    }

    location / {
        try_files $uri $uri/ /index.html;

    }


}

```