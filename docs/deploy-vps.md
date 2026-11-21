# Deploy SpaSystem lên một VPS Ubuntu bằng Docker Compose

Hướng dẫn viết theo mã nguồn trong workspace ngày 18/11/2026. Các khối lệnh là mẫu để bạn thực hiện; việc tạo tài liệu này chưa triển khai lên VPS, chưa chạy migration và chưa sửa mã ứng dụng.

## 1. Mô hình triển khai và những điểm riêng của dự án

```text
Trình duyệt / ứng dụng mobile
             |
    https://spa.example.com
             |
        Caddy :80/:443          Tự cấp và gia hạn chứng chỉ TLS
         /         \
 /api/*, /hubs/*,  Các đường dẫn giao diện
 /health/*              |
       |             web:80     Nginx phục vụ bản build React/Vite
    api:8080
       |
    db:5432                     PostgreSQL 17, không publish port
       |
  Docker named volume          Dữ liệu tồn tại qua lần tạo lại container
```

Các container `db`, `api`, `web`, `caddy` chạy trên cùng VPS. Một container công cụ `migrate` chỉ chạy khi tạo SQL migration. Không cần Kubernetes ở quy mô này. Expo/Metro không phải dịch vụ production trên VPS.

| Thành phần | Hiện trạng repo | Cách dùng trong hướng dẫn |
| --- | --- | --- |
| Backend | ASP.NET Core, `net9.0`, EF Core/Npgsql 9 | Build bằng `backend/Dockerfile` |
| Web | React/Vite, npm workspaces, Node 22 | Build bằng `apps/web/Dockerfile` |
| Database | PostgreSQL 17 | `postgres:17-alpine`, volume riêng |
| Web server | `apps/web/nginx.conf` đã có SPA fallback | Giữ cấu hình này, Caddy đứng phía trước |
| Realtime | `/hubs/notifications` | Caddy proxy cả `/hubs/*`, hỗ trợ WebSocket |
| Login | JWT và refresh cookie `HttpOnly`, `Secure`, `SameSite=Strict` | Web và API dùng cùng origin HTTPS |
| Ảnh upload | Cloudinary | Khóa đặt ở backend, ảnh không nằm trong container |
| OTP | SMTP qua MailKit | Cấu hình mail và kiểm tra outbound SMTP |
| Thanh toán | VNPay, mặc định sandbox | Cấu hình public callback và IPN |
| AI | Gemini | API key backend; cấu hình model phù hợp tài khoản |
| Background jobs | Hết hạn đơn và nhắc lịch hẹn | Khởi đầu bằng một replica API |

**Trạng thái .NET:** .NET 9 hết hỗ trợ ngày 10/11/2026. Hướng dẫn giữ phiên bản hiện tại để khớp repo; trước khi vận hành lâu dài với dữ liệu thật, nên nâng lên .NET 10 LTS và kiểm tra lại. Việc nâng gồm `backend/Directory.Build.props`, `global.json`, image SDK/runtime trong Dockerfile, công cụ EF, package EF/Npgsql/ASP.NET cùng các package tương thích; không chỉ đổi tag Docker. Nguồn: [chính sách hỗ trợ .NET](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).

**Không chạy nguyên Compose local ngoài Internet:** `docker-compose.yml` hiện publish `5432`, `5000`, `8080`, có mật khẩu DB mặc định và URL localhost. API hiện không tự áp migration khi startup. README còn một số mô tả foundation cũ; hướng dẫn này dựa trên code và cấu hình thực tế.

## 2. Chuẩn bị VPS, domain và các giá trị thay thế

Ước lượng khởi đầu cho ứng dụng nhỏ, chưa phải kết quả đo tải:

| Nhu cầu | Cấu hình tham khảo |
| --- | --- |
| Demo ít người | 2 vCPU, 4 GB RAM, SSD 40–60 GB |
| Spa nhỏ, build ngay trên VPS | 4 vCPU, 8 GB RAM, SSD 80 GB trở lên |
| VPS chỉ có 2 GB RAM | Nên build image ở CI rồi pull về; build .NET và Vite ngay trên VPS có thể thiếu RAM |

Chọn **Ubuntu Server 24.04 LTS x86_64**, IPv4 public, SSH, khả năng tạo snapshot. Vùng Singapore hoặc Việt Nam thường thuận tiện cho người dùng ở Việt Nam; cần đo latency thực tế. Sizing còn phụ thuộc lượng truy cập, dữ liệu, job và ngân sách. Dành chỗ cho image build, logs, DB và backup. Một VPS là một điểm lỗi chung; backup phải có bản ở nơi khác.

Ví dụ xuyên suốt:

| Giá trị | Ví dụ, cần thay |
| --- | --- |
| IP VPS | `203.0.113.10` — IP tài liệu, không dùng thật |
| Domain | `spa.example.com` — thay bằng domain bạn sở hữu |
| User Linux | `deploy` |
| Git repository | `git@github.com:YOUR_ACCOUNT/SpaSystem.git` |
| Nhánh phát hành | `main` — đổi nếu repo dùng tên khác |
| Source trên VPS | `/srv/spa/app` |
| Secrets, SQL sinh ra | `/srv/spa/shared` |
| Backup | `/srv/spa/backups` |

**Phân biệt terminal:** các khối `powershell` chạy trên Windows của bạn. Các khối `bash` chạy trong phiên SSH Ubuntu, trừ khi nói khác. Không chạy lệnh `apt`, `sudo`, `ufw` trong PowerShell local.

## 3. Chuẩn bị Git trên máy Windows

VPS chỉ nhận được những file đã commit và push. Workspace hiện có nhiều file đã sửa và file mới, trong đó có banner trang chủ và ảnh mới. Kiểm tra cả code lẫn ảnh; thiếu file ảnh được import có thể khiến build Linux thất bại.

```powershell
cd E:\UTE\HK126\Code\SpaSystem
git status --short
git branch --show-current
git remote -v
git diff --stat
```

Nếu chưa có remote, tạo private repository trên GitHub rồi thêm remote, chỉ thực hiện khi repo chưa có `origin`:

```powershell
git remote add origin git@github.com:YOUR_ACCOUNT/SpaSystem.git
```

Kiểm tra ignore secrets:

```powershell
git check-ignore .env backend/src/API/.env apps/web/.env apps/mobile/.env
git ls-files -- .env backend/src/API/.env apps/web/.env apps/mobile/.env
```

Lệnh `git ls-files` trên phải không liệt kê file secret. Nếu secret từng được commit, xóa khỏi tracking và **đổi khóa/mật khẩu đã lộ**; thêm `.gitignore` không xóa secret khỏi lịch sử.

Các kiểm tra phù hợp trước phát hành, chạy tại root với Node/npm và .NET SDK đã cài:

```powershell
npm ci
npm run lint
npm run typecheck
npm run web:test
npm run web:build
dotnet restore backend/NhuNguyetSpa.sln
dotnet test backend/NhuNguyetSpa.sln -c Release
```

Nếu integration tests yêu cầu Docker thì cần Docker Desktop chạy; xử lý lỗi trước khi phát hành. Đây là các lệnh đề xuất, không phải tuyên bố đã chạy thành công trên workspace hiện tại.

Sau khi thêm các file triển khai và thay đổi `Program.cs` ở các mục sau, chọn file cần phát hành rồi commit/push. Có thể dùng `git add -p` cho thay đổi đã tracked; file mới và ảnh cần `git add` theo đường dẫn cụ thể. Tránh `git add .` khi chưa kiểm tra thư mục `artifacts/` và các dữ liệu khác.

```powershell
git diff --cached --stat
git diff --cached
git commit -m "Prepare VPS deployment"
git push origin main
```

Không push nếu bản staged chưa đúng. Không tạo `.env` chứa mật khẩu trong Git. Các file triển khai mẫu bên dưới nên được tạo local rồi commit để VPS và local có cùng cấu hình.

## 4. SSH vào VPS và tạo user deploy

Trên Windows, tạo key riêng nếu chưa có key phù hợp:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE/.ssh/spa_vps" -C "spa-vps-admin"
Get-Content "$env:USERPROFILE/.ssh/spa_vps.pub"
ssh root@203.0.113.10
```

Đặt passphrase cho private key. Nếu nhà cung cấp dùng user `ubuntu` hoặc user khác, đăng nhập bằng user đó và dùng `sudo` ở các lệnh quản trị. Kiểm tra fingerprint SSH của VPS với thông tin nhà cung cấp nếu có.

Trong VPS, ví dụ phiên root:

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl git ufw nano openssl dnsutils ripgrep
timedatectl set-timezone Asia/Ho_Chi_Minh
timedatectl set-ntp true
timedatectl status
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
```

Dán **public key** `spa_vps.pub`, mỗi key một dòng, lưu bằng `Ctrl+O`, Enter, thoát `Ctrl+X`. Không đưa private key lên VPS.

```bash
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

Giữ phiên root đang mở, mở terminal PowerShell thứ hai để thử:

```powershell
ssh -i "$env:USERPROFILE/.ssh/spa_vps" deploy@203.0.113.10
```

Trong phiên deploy, thử `sudo -v`. Chỉ sau khi SSH bằng key và sudo đã hoạt động, cấu hình:

```bash
sudo nano /etc/ssh/sshd_config.d/00-spa-hardening.conf
```

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
```

```bash
sudo sshd -t
sudo sshd -T | rg 'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication'
```

Gói `ripgrep` ở bước cài đặt cung cấp lệnh `rg`; cũng có thể dùng `sudo sshd -T` để xem toàn bộ. Chỉ reload nếu kiểm tra cú pháp thành công và các giá trị thực tế đúng:

```bash
sudo systemctl reload ssh
```

Mở thêm một phiên SSH mới xác nhận trước khi đóng phiên quản trị cũ. Nếu VPS có `Match` hoặc cấu hình cloud riêng, kiểm tra cả chính sách áp dụng cho user thực tế; không chỉ dựa vào nội dung file mới.

## 5. Firewall và DNS

Trên VPS, nếu SSH dùng cổng 22:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Nếu SSH dùng cổng khác, cho phép cổng đó **trước khi enable UFW**. Firewall/security group của nhà cung cấp cũng phải cho phép SSH và TCP 80/443. Nếu có IP quản trị cố định, có thể giới hạn cổng SSH theo IP đó.

Không mở public `5432`, `5000`, `8080`, `5173`, `8081`. Docker có thể đưa lưu lượng published port qua đường không chịu bộ lọc UFW thông thường, vì vậy Compose production bên dưới chỉ publish cổng Caddy. Nguồn: [Docker và firewall](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

Ở nơi quản lý DNS, thêm:

| Type | Name | Value |
| --- | --- | --- |
| A | `spa` | IPv4 public của VPS |

Ví dụ domain chính là `example.com`, bản ghi này tạo `spa.example.com`. Nếu dùng domain gốc, tên bản ghi thường là `@`. Không tạo AAAA trỏ IPv6 sai. Khi dùng Cloudflare, nên để DNS only trong lần thiết lập đầu; bật proxy sau cần kiểm tra thêm HTTPS, IP khách hàng và callback thanh toán.

```bash
dig +short A spa.example.com
dig +short AAAA spa.example.com
```

Domain phải trỏ đúng VPS và cổng 80/443 phải tới được Caddy. Caddy tự cấp/gia hạn chứng chỉ và chuyển HTTP sang HTTPS; cần giữ volume `/data` qua lần tạo lại container. Nguồn: [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## 6. Cài Docker Engine và Compose plugin

Các lệnh sau dành cho Ubuntu 24.04 sạch. Nếu đã có Docker từ nguồn khác, kiểm tra và xử lý các package xung đột theo tài liệu chính thức; không gỡ bừa trên máy đang chạy dịch vụ khác.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker deploy
```

Đăng xuất và SSH lại bằng `deploy` để nhận group mới:

```bash
docker version
docker compose version
docker run --rm hello-world
```

Hướng dẫn này dùng `docker compose`, không dùng chương trình `docker-compose` đời cũ. User thuộc group Docker có quyền quản trị tương đương root đối với host; chỉ cấp cho người quản trị. VPS không cần cài Node hoặc .NET trực tiếp vì các bước build chạy trong Docker.

Nguồn cài đặt: [Docker Engine trên Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

Nếu VPS nhỏ và có hiện tượng OOM, ưu tiên build image ở CI. Swap 2 GB là phương án hỗ trợ trên VPS mới chưa có swap; kiểm tra `swapon --show`, dung lượng đĩa và `/etc/fstab` trước:

```bash
free -h
swapon --show
df -h /
```

Chỉ thực hiện khi `/swapfile` chưa tồn tại và bạn muốn thêm swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Không lặp dòng `/etc/fstab`. Swap không thay thế RAM khi tải thật tăng.

## 7. Cho VPS đọc repository bằng deploy key

Trong SSH dưới user `deploy`, tạo key khác với key Windows → VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/spa_github -C spa-vps-readonly
cat ~/.ssh/spa_github.pub
```

Với pull thủ công có thể dùng passphrase và `ssh-agent`. Nếu để trống passphrase nhằm tự động hóa, giữ private key chỉ user deploy đọc được. Trên GitHub vào repository → Settings → Deploy keys → Add deploy key, dán public key; **không bật Allow write access**.

```bash
nano ~/.ssh/config
```

```sshconfig
Host github-spa
    HostName github.com
    User git
    IdentityFile ~/.ssh/spa_github
    IdentitiesOnly yes
```

```bash
chmod 600 ~/.ssh/config ~/.ssh/spa_github
ssh -T git@github-spa
```

Lần đầu kết nối, đối chiếu fingerprint với [fingerprint chính thức của GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints). Không dùng `StrictHostKeyChecking=no`. GitHub có thể thông báo xác thực thành công nhưng không cung cấp shell; đó là hành vi bình thường.

```bash
sudo install -d -m 750 -o deploy -g deploy /srv/spa
install -d -m 700 /srv/spa/shared /srv/spa/shared/migrations /srv/spa/backups
git clone git@github-spa:YOUR_ACCOUNT/SpaSystem.git /srv/spa/app
cd /srv/spa/app
git status --short
git log -1 --oneline
```

Nếu repository public vẫn nên quản lý cách xác thực rõ ràng. Không chép token GitHub vào URL remote. Nguồn: [GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).

## 8. Bổ sung forwarded headers vào backend trước khi build

Code hiện tại đọc `HttpContext.Connection.RemoteIpAddress` để giới hạn login/AI và tạo thanh toán VNPay nhưng chưa gọi `UseForwardedHeaders()`. Sau reverse proxy, địa chỉ nhìn thấy sẽ là Caddy nếu không bổ sung xử lý.

Thực hiện thay đổi này **local**, kiểm tra rồi commit/push. Trong `backend/src/API/Program.cs`, thêm using:

```csharp
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
```

Sau `EnvLoader.Load(builder);`, trước `builder.Build()`, thêm:

```csharp
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;

    // Chỉ tin proxy được cấu hình. Compose bên dưới gán IP này cho Caddy.
    var proxyAddress = builder.Configuration["ReverseProxy:KnownProxy"];
    if (!string.IsNullOrWhiteSpace(proxyAddress))
    {
        var proxy = IPAddress.Parse(proxyAddress);
        options.KnownProxies.Add(proxy);
        options.KnownProxies.Add(proxy.MapToIPv6());
    }
});
```

Thêm dòng này **ngay trước** `app.UseSerilogRequestLogging();`, sau các nhánh seed:

```csharp
app.UseForwardedHeaders();
```

Không xóa cả `KnownNetworks` lẫn `KnownProxies` để tin mọi nguồn. Caddy bên dưới có địa chỉ cố định `172.30.50.2`; nếu đổi subnet/IP, cập nhật `ReverseProxy__KnownProxy` tương ứng. Kiểm tra `ip route` và `docker network ls` để chọn subnet không trùng mạng VPS/VPN/Docker hiện có. Mẫu này giả định Caddy nhận kết nối trực tiếp từ Internet; thêm Cloudflare/load balancer cần cấu hình chuỗi proxy tin cậy riêng.

Không cần bật HTTPS bên trong API: Caddy xử lý TLS, nội bộ gọi HTTP `api:8080`. Giữ production cookie `Secure=true`. Không thêm certificate localhost vào container production.

Nguồn: [ASP.NET Core sau reverse proxy](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-9.0).

## 9. Tạo cấu hình Docker production trong Git

Tạo **ba file** dưới đây ở root/source local, rồi commit và push. Trên VPS lấy về bằng `git pull --ff-only origin main` trước khi triển khai. Những file này không có secret.

### 9.1. `deploy/Dockerfile.migrations`

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /src
COPY global.json ./
COPY .config/dotnet-tools.json ./.config/dotnet-tools.json
COPY backend/ ./backend/
RUN dotnet tool restore
RUN dotnet restore backend/src/API/NhuNguyetSpa.API.csproj
ENTRYPOINT ["dotnet", "ef"]
```

Image này chứa SDK để sinh SQL; không dùng image runtime API để chạy `dotnet ef`. Khi nâng .NET, cập nhật cả Dockerfile này.

### 9.2. `deploy/Caddyfile`

```caddyfile
{$SPA_DOMAIN} {
    encode zstd gzip

    @backend path /api /api/* /hubs /hubs/* /health /health/*
    handle @backend {
        reverse_proxy api:8080
    }

    handle {
        reverse_proxy web:80
    }
}
```

`handle` giữ nguyên `/api/v1/...`; không dùng `handle_path /api/*` vì nó cắt prefix `/api`. `/hubs/*` phải tới API để realtime hoạt động. Caddy xử lý WebSocket qua `reverse_proxy`; không thêm một Nginx proxy API nữa trong mô hình này. Không bật access log chứa query string một cách tùy tiện vì SignalR có thể truyền access token trong query.

### 9.3. `compose.production.yml`

```yaml
name: spa-prod

x-logging: &logging
  driver: json-file
  options:
    max-size: '10m'
    max-file: '3'

services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: nhunguyetspa
      POSTGRES_USER: spa_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}
      POSTGRES_APP_PASSWORD: ${POSTGRES_APP_PASSWORD:?Set POSTGRES_APP_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U spa_admin -d nhunguyetspa']
      interval: 5s
      timeout: 3s
      retries: 20
    logging: *logging

  api:
    image: spa-api:${APP_VERSION:?Set APP_VERSION}
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    env_file:
      - /srv/spa/shared/api.env
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_HTTP_PORTS: '8080'
      CONNECTION_STRING: Host=db;Port=5432;Database=nhunguyetspa;Username=spa_app;Password=${POSTGRES_APP_PASSWORD:?Set POSTGRES_APP_PASSWORD}
      Cors__AllowedOrigins__0: https://${SPA_DOMAIN:?Set SPA_DOMAIN}
      AllowedHosts: ${SPA_DOMAIN:?Set SPA_DOMAIN}
      AuthCookie__Secure: 'true'
      Swagger__Enabled: 'false'
      ReverseProxy__KnownProxy: '172.30.50.2'
    depends_on:
      db:
        condition: service_healthy
    logging: *logging

  web:
    image: spa-web:${APP_VERSION:?Set APP_VERSION}
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_BASE_URL: https://${SPA_DOMAIN:?Set SPA_DOMAIN}
    restart: unless-stopped
    logging: *logging

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    environment:
      SPA_DOMAIN: ${SPA_DOMAIN:?Set SPA_DOMAIN}
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      default:
        ipv4_address: 172.30.50.2
    depends_on:
      - api
      - web
    logging: *logging

  migrate:
    profiles: ['tools']
    build:
      context: .
      dockerfile: deploy/Dockerfile.migrations
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      CONNECTION_STRING: Host=db;Port=5432;Database=nhunguyetspa;Username=spa_admin;Password=${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}
    volumes:
      - /srv/spa/shared/migrations:/out
    command:
      - migrations
      - script
      - --idempotent
      - --project
      - backend/src/Infrastructure
      - --startup-project
      - backend/src/API
      - --configuration
      - Release
      - --output
      - /out/migrations.sql
    logging: *logging

volumes:
  db-data:
  caddy-data:
  caddy-config:

networks:
  default:
    ipam:
      config:
        - subnet: 172.30.50.0/24
          ip_range: 172.30.50.128/25
```

Lưu ý cấu hình:

- `db` không có `ports`; `api` và `web` cũng không có `ports`. Chỉ Caddy công khai 80/443.
- `db-data` là volume PostgreSQL 17, không đổi sang PostgreSQL major mới rồi mount thẳng dữ liệu cũ.
- `spa_admin` là tài khoản quản trị khởi tạo DB, dùng migration/backup. API dùng `spa_app` chỉ có quyền dữ liệu, được tạo ở mục 11.
- `POSTGRES_APP_PASSWORD` được thêm vào môi trường container DB để lệnh cấp role dùng `\getenv`; nó không phải biến khởi tạo tự động của image PostgreSQL.
- `${...:?message}` giúp dừng sớm nếu thiếu biến bắt buộc.
- `APP_VERSION` nên là Git commit SHA để giữ image cũ cho rollback.
- `depends_on` ở Caddy không chứng minh API đã sẵn sàng; kiểm tra health sau triển khai.
- Không đặt healthcheck API bằng `curl` nếu image API chưa có curl. Image hiện tại không bảo đảm có curl/wget.
- Tag major `postgres:17-alpine`, `caddy:2-alpine` thuận tiện để bắt đầu. Sau khi kiểm thử, có thể pin digest để tái tạo chính xác và lên lịch cập nhật bản vá. Không để image/runtime cũ mãi.
- Các container dùng network bridge nội bộ nhưng vẫn cần outbound Internet cho SMTP, Cloudinary, VNPay, Gemini và cấp TLS.
- Dải cấp IP động là `172.30.50.128/25`, tách khỏi IP Caddy `172.30.50.2` để tránh DB hoặc container khác nhận nhầm địa chỉ đó khi khởi động trước.

## 10. Tạo secrets trên VPS

Không dùng `.env` local hiện tại làm cấu hình production. Hai file đặt ngoài source giúp tránh bị Git pull tác động:

- `/srv/spa/shared/compose.env`: biến Docker Compose dùng để nội suy YAML.
- `/srv/spa/shared/api.env`: biến backend nhận trong container.

Compose `--env-file` không tự đưa mọi biến vào container; `env_file` trong service mới có vai trò đó. `environment` ghi đè `env_file` nếu trùng tên. Nguồn: [quy tắc ưu tiên biến môi trường Compose](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/).

Tạo mật khẩu và JWT key bằng ba lần gọi độc lập:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 48
umask 077
nano /srv/spa/shared/compose.env
```

Nội dung, thay placeholder bằng giá trị thật:

```dotenv
SPA_DOMAIN=spa.example.com
APP_VERSION=initial
POSTGRES_PASSWORD=THAY_MAT_KHAU_ADMIN_HEX
POSTGRES_APP_PASSWORD=THAY_MAT_KHAU_APP_HEX_KHAC
```

Không thêm `https://` hoặc `/` vào `SPA_DOMAIN`. Dùng password hex cho DB giúp tránh vấn đề `;`, `$`, `#` khi đi qua connection string và Compose.

```bash
nano /srv/spa/shared/api.env
```

```dotenv
JWT_KEY=THAY_JWT_KEY_HEX_96_KY_TU
JWT_ISSUER=NhuNguyetSpa.API
JWT_AUDIENCE=NhuNguyetSpa.Clients

MAIL_SETTINGS_MAIL=your-sender@gmail.com
MAIL_SETTINGS_DISPLAY_NAME="Spa Như Nguyệt"
MAIL_SETTINGS_PASSWORD=THAY_SMTP_APP_PASSWORD
MAIL_SETTINGS_HOST=smtp.gmail.com
MAIL_SETTINGS_PORT=587

CLOUDINARY_CLOUD_NAME=THAY_CLOUD_NAME
CLOUDINARY_API_KEY=THAY_API_KEY
CLOUDINARY_API_SECRET=THAY_API_SECRET

VNPAY_TMN_CODE=THAY_TMN_CODE
VNPAY_HASH_SECRET=THAY_HASH_SECRET
PAYMENT_PUBLIC_API_BASE_URL=https://spa.example.com
PAYMENT_WEB_RETURN_URL=https://spa.example.com/payment/result
PAYMENT_MOBILE_RETURN_URL=nhunguyetspa://payment/result
Vnpay__PaymentUrl=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
Vnpay__ProcessReturnUrl=false

GEMINI_API_KEY=THAY_GEMINI_API_KEY
```

Các giá trị `THAY_...` phải được thay thật; nếu chưa dùng tính năng tích hợp, để trống khóa tương ứng. Theo code hiện tại API vẫn có thể chạy khi thiếu các khóa dịch vụ ngoài, nhưng endpoint OTP/upload/payment/AI liên quan sẽ trả lỗi, thường là 503. JWT key phải được tạo thật để login hoạt động. Model AI nằm trong `appsettings.json`; kiểm tra model được nhà cung cấp hỗ trợ và quyền truy cập của tài khoản, có thể ghi đè bằng `Ai__Model` trong file backend.

`PAYMENT_MOBILE_RETURN_URL` ở trên chỉ dùng khi native app đã đăng ký scheme tương ứng. Nếu chưa phát hành mobile, có thể để trống; nếu dùng Expo Go thì dùng deep link đúng của phiên Expo, không coi địa chỉ LAN cũ là cấu hình production.

```bash
chmod 600 /srv/spa/shared/compose.env /srv/spa/shared/api.env
```

Không đưa secret vào `VITE_*` hoặc `EXPO_PUBLIC_*`: các biến đó xuất hiện trong bundle công khai. Không gửi output `docker inspect` hay `docker compose config` đầy đủ lên chat vì có thể chứa secret. Dùng `config --quiet` để kiểm tra.

### Cấu hình dịch vụ bên ngoài

**SMTP:** dùng thông tin SMTP từ nhà cung cấp. Nếu dùng Gmail, làm theo [hướng dẫn App Password chính thức](https://support.google.com/accounts/answer/185833), không điền mật khẩu đăng nhập Google thông thường. VPS phải được phép outbound TCP 587 hoặc cổng SMTP phù hợp. Khi dùng domain mail riêng, cấu hình SPF/DKIM/DMARC theo nhà cung cấp. Luôn thử OTP thực tế, kiểm tra spam và quota gửi mail.

**Cloudinary:** lấy cloud name/API key/API secret đúng môi trường. Thử upload bằng màn hình quản trị. Volume PostgreSQL không backup ảnh Cloudinary; quản lý tài khoản và khả năng khôi phục tài sản ảnh riêng.

**VNPay:** hiện appsettings dùng sandbox. Deploy website thật không đồng nghĩa đã chuyển VNPay sang giao dịch thật. Dùng đúng merchant credentials và payment endpoint được VNPay cấp cho môi trường của bạn. Đăng ký IPN public:

```text
https://spa.example.com/api/v1/payments/vnpay/ipn
```

Các URL quay về browser:

```text
https://spa.example.com/api/v1/payments/vnpay/return/web
https://spa.example.com/api/v1/payments/vnpay/return/mobile
```

Production hiện đặt `ProcessReturnUrl=false`: browser return không tự chốt thanh toán như Development. Cần IPN hợp lệ để cập nhật kết quả. Đảm bảo cổng callback không bị WAF, basic auth hoặc trang đăng nhập chặn; giữ kiểm tra chữ ký trong backend. Không dựa vào query trên trang kết quả để xác nhận đã nhận tiền.

**Gemini:** lấy API key backend, kiểm tra model, quota và billing theo tài khoản. Nâng quota hoặc đổi model là cấu hình dịch vụ riêng, không giải quyết bằng tăng RAM VPS.

## 11. Build, khởi tạo PostgreSQL và áp migration

Từ SSH user deploy:

```bash
cd /srv/spa/app
git pull --ff-only origin main
```

Định nghĩa hàm tiện dụng trong Bash. Mỗi phiên SSH mới cần khai báo lại hoặc lưu vào `~/.bashrc`:

```bash
dc() {
  docker compose \
    --env-file /srv/spa/shared/compose.env \
    -f /srv/spa/app/compose.production.yml "$@"
}
```

Luôn dùng Compose production này. Không chạy `docker compose up` trần tại root vì nó sẽ chọn file local khác và có thể publish cổng không mong muốn.

Gán tag theo commit đang triển khai; không export password trong shell:

```bash
export APP_VERSION="$(git rev-parse --short=12 HEAD)"
sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" /srv/spa/shared/compose.env
dc config --quiet
dc pull db caddy
dc build api web migrate
```

Nếu build bị kill/OOM, thử `COMPOSE_PARALLEL_LIMIT=1 dc build api web migrate` hoặc build lần lượt. Không chạy API trước khi DB có schema.

Khởi động DB:

```bash
dc up -d db
dc ps
dc logs --tail=80 db
dc exec -T db pg_isready -U spa_admin -d nhunguyetspa
```

Chờ DB sẵn sàng. Volume ban đầu sẽ tạo database `nhunguyetspa` và user `spa_admin`. Các biến `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` chỉ khởi tạo cluster khi volume rỗng. Đổi file env không tự đổi password trong database có sẵn.

### 11.1. Sinh SQL migration để review

```bash
dc --profile tools run --rm --no-deps migrate
less /srv/spa/shared/migrations/migrations.sql
```

SQL chứa migration idempotent dựa vào lịch sử EF. Trước mỗi lần áp dụng phải xem các thay đổi xóa bảng/cột, chuyển kiểu dữ liệu, ràng buộc và cập nhật dữ liệu. Idempotent không có nghĩa mọi migration đều an toàn hoặc tương thích với mọi phiên bản app.

### 11.2. Áp SQL sau khi kiểm tra

```bash
dc exec -T db psql \
  -U spa_admin -d nhunguyetspa \
  -v ON_ERROR_STOP=1 \
  < /srv/spa/shared/migrations/migrations.sql
```

Nếu lỗi, dừng và xử lý; không tiếp tục launch rồi bỏ qua. PostgreSQL cần các extension của dự án như `citext`, `btree_gist`, `unaccent`, `pg_trgm`; migration thực hiện phần này qua tài khoản admin. Không import file `docs/export/NhuNguyetSpa_CSDL_TiengViet.sql` thay cho migrations EF của ứng dụng.

```bash
dc exec -T db psql -U spa_admin -d nhunguyetspa \
  -c 'SELECT * FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'
dc exec -T db psql -U spa_admin -d nhunguyetspa -c '\dt'
```

Readiness chỉ kiểm tra kết nối DB, không chứng minh mọi bảng/migration đã sẵn sàng. Nguồn triển khai schema: [EF Core applying migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying).

### 11.3. Tạo user database cho API, tách khỏi admin

Chạy khối SQL dưới đây sau migration đầu tiên. Có thể chạy lại để đồng bộ mật khẩu app từ env và cấp quyền bảng mới:

```bash
dc exec -T db psql -U spa_admin -d nhunguyetspa -v ON_ERROR_STOP=1 <<'SQL'
\getenv app_password POSTGRES_APP_PASSWORD
SELECT 'CREATE ROLE spa_app LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'spa_app')
\gexec
ALTER ROLE spa_app WITH PASSWORD :'app_password';
GRANT CONNECT ON DATABASE nhunguyetspa TO spa_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO spa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO spa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO spa_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO spa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE spa_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO spa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE spa_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO spa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE spa_admin IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO spa_app;
SQL
```

Đây là quyền đọc/ghi chung cho các bảng nghiệp vụ, không phải superuser hay quyền thay đổi schema. Nếu sau này tách schema/role hoặc có bảng nhạy cảm cần hạn chế thêm, điều chỉnh grants theo nhu cầu. Migrations phải tiếp tục chạy bằng admin/chủ sở hữu schema, không chạy bằng role runtime.

## 12. Tạo tài khoản chủ spa đầu tiên

Repo chưa có lệnh bootstrap production riêng. `--seed-dev` chỉ tạo owner và chỉ chạy khi môi trường là Development. Phương án dùng được với code hiện tại là chạy **một container một lần, không publish port, chạy seed rồi thoát**; dịch vụ API thật vẫn là Production.

Chỉ thực hiện trên DB mới hoặc khi đã xác định cần tạo owner đầu tiên. Không dùng email đã đăng ký dưới vai trò customer; seeder gặp email tồn tại sẽ bỏ qua và không nâng role.

Trong Bash:

```bash
read -rp 'Owner email: ' SEED_OWNER_EMAIL
read -rp 'Owner phone: ' SEED_OWNER_PHONE
read -rs -p 'Owner password (strong, at least 8 characters): ' SEED_OWNER_PASSWORD
echo
export SEED_OWNER_EMAIL SEED_OWNER_PHONE SEED_OWNER_PASSWORD
dc run --rm --no-deps \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e SEED_OWNER_EMAIL \
  -e SEED_OWNER_PHONE \
  -e SEED_OWNER_PASSWORD \
  api --seed-dev
unset SEED_OWNER_EMAIL SEED_OWNER_PHONE SEED_OWNER_PASSWORD
```

Xác nhận lệnh báo tạo owner thành công. `docker compose run` mặc định không publish cổng service; code xử lý seed trước khi chạy web server. Không thêm `--service-ports`. Password được nhập ẩn, không đặt trực tiếp trong command history.

**Không chạy `--seed-full`, `--seed-demo`, `--seed-catalog`, `db:seed:full` hoặc `db:seed:demo` trên dữ liệu thật. `--seed-full` hiện có hành vi xóa dữ liệu và tạo tài khoản mẫu.** Nếu chỉ cần demo đầy đủ, dùng project/volume riêng tách khỏi production.

Về lâu dài, nên bổ sung lệnh bootstrap owner riêng có kiểm tra DB/owner hiện hữu và cho phép chạy trong Production, thay vì tiếp tục dùng seeder Development.

Nếu bạn chọn chuyển nguyên DB local sang VPS ở mục 16, giữ owner đã có trong dữ liệu và bỏ qua bootstrap này.

## 13. Khởi chạy API, web và HTTPS

```bash
dc run --rm --no-deps caddy \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
dc up -d api web caddy
dc ps
dc logs --tail=100 api
dc logs --tail=100 caddy
```

Caddy cần DNS đúng và 80/443 public để xin chứng chỉ. Đợi cấp TLS xong, kiểm tra:

```bash
curl -I http://spa.example.com
curl -I https://spa.example.com
curl -fsS https://spa.example.com/health/live
curl -fsS https://spa.example.com/health/ready
curl -fsS https://spa.example.com/api/v1/system/ping
```

HTTP phải chuyển về HTTPS. Health phải trả JSON, ví dụ `{"status":"Healthy"}`. Nếu `/health/ready` trả HTML trang React, Caddy route bị sai. Không dùng `curl -k` để bỏ qua lỗi certificate trong bước xác nhận production.

Nếu chưa có domain, chỉ có thể thử nội bộ hoặc HTTP tạm theo cấu hình riêng; refresh cookie production là Secure nên kiểm tra login qua HTTP public sẽ không tương đương cấu hình cuối cùng. Nên hoàn tất domain/HTTPS trước khi nghiệm thu đăng nhập.

### Kiểm tra nghiệp vụ trước khi dùng dữ liệu thật

1. Mở trang chủ và ảnh banner; thử F5 ở một route sâu như `/services`.
2. Đăng nhập owner, tải lại trang, đóng/mở tab, kiểm tra refresh session và logout.
3. Trong DevTools, request phải đi tới `https://spa.example.com/api/...`, không tới localhost hoặc `http://api:8080`.
4. Cookie `spa_refresh_token` có `Secure`, `HttpOnly`, `SameSite=Strict`, path `/api/v1/auth`.
5. Đăng ký tài khoản test, nhận OTP qua SMTP thật; kiểm tra quên mật khẩu.
6. Tạo danh mục/dịch vụ và thử upload Cloudinary bằng role phù hợp.
7. Thử đặt lịch và kiểm tra chống trùng lịch; dùng dữ liệu test rõ ràng.
8. Thử VNPay sandbox đủ cả tạo thanh toán, browser return và IPN; xác nhận trạng thái đơn trong DB/UI. Chỉ chuyển live khi đã có merchant live và kiểm thử theo yêu cầu nhà cung cấp.
9. Kiểm tra kết nối `/hubs/notifications`, nhận thông báo và reconnect sau refresh token.
10. Thử AI, xem lỗi quota/model nếu có; không nhầm lỗi provider với lỗi Docker.
11. Kiểm tra job nhắc lịch/hết hạn đơn theo cấu hình, đồng hồ hệ thống đã đồng bộ.
12. Tạo backup và restore thử trước khi đưa vào vận hành.

## 14. Backup tự động, offsite và restore

Volume giúp giữ dữ liệu qua restart/recreate; nó không bảo vệ khi xóa volume, lỗi đĩa, mất VPS hoặc migration sai. Cần backup DB, cấu hình secrets và tài nguyên ảnh bên ngoài. Ước lượng mục tiêu: backup hằng ngày có thể mất gần 24 giờ dữ liệu; nếu không chấp nhận được, cần backup thường xuyên hơn hoặc PITR/WAL/managed database.

### 14.1. Script backup PostgreSQL

Tạo trên VPS:

```bash
mkdir -p /srv/spa/bin
nano /srv/spa/bin/backup-db.sh
```

Nội dung:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

backup_dir=/srv/spa/backups
mkdir -p "$backup_dir"
exec 9>"$backup_dir/.backup.lock"
flock -n 9 || exit 0

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/spa-$stamp.dump"
temporary_file="$backup_file.partial"
trap 'rm -f -- "$temporary_file"' EXIT

docker compose \
  --env-file /srv/spa/shared/compose.env \
  -f /srv/spa/app/compose.production.yml \
  exec -T db pg_dump -U spa_admin -d nhunguyetspa \
  --format=custom --no-owner --no-acl > "$temporary_file"

test -s "$temporary_file"
mv -- "$temporary_file" "$backup_file"
sha256sum "$backup_file" > "$backup_file.sha256"
echo "Created $backup_file"
```

```bash
chmod 700 /srv/spa/bin/backup-db.sh
/srv/spa/bin/backup-db.sh
ls -lh /srv/spa/backups
crontab -e
```

Thêm lịch user `deploy`:

```cron
15 2 * * * /srv/spa/bin/backup-db.sh >> /srv/spa/backups/backup.log 2>&1
```

Cron dùng timezone host; theo cấu hình ở trên chạy 02:15 giờ Việt Nam. File dump dùng timestamp UTC có hậu tố `Z`. Kiểm tra dịch vụ cron có hoạt động, theo dõi `backup.log` và cấu hình cảnh báo khi job thất bại hoặc không có backup mới. File log cron cũng cần rotation nếu chạy lâu dài.

Script chỉ tạo backup local, **chưa tạo backup offsite**. Sau mỗi lần backup, sao chép mã hóa sang một nơi khác như object storage hoặc máy backup. Có thể dùng rclone/restic theo dịch vụ đã chọn. Không để credential storage công khai trong script. Chỉ thiết lập retention, ví dụ 14 bản ngày và 8 bản tuần, sau khi xác nhận offsite và restore hoạt động. Theo dõi dung lượng để backup không làm đầy ổ.

`pg_dump` tạo snapshot logic nhất quán của một database trong khi ứng dụng đang chạy, nhưng không chứa toàn bộ role cluster và không chứa ảnh Cloudinary. Hướng dẫn đã dùng `--no-owner --no-acl`, do đó restore phải cấp quyền lại. Nguồn: [PostgreSQL SQL dump](https://www.postgresql.org/docs/17/backup-dump.html).

### 14.2. Restore thử vào database riêng

Chọn đúng đường dẫn file dump thực tế, không dùng wildcard nếu có nhiều bản:

```bash
dc exec -T db createdb -U spa_admin spa_restore_test
dc exec -T db pg_restore \
  -U spa_admin -d spa_restore_test \
  --no-owner --no-acl --exit-on-error \
  < /srv/spa/backups/spa-YYYYMMDDTHHMMSSZ.dump
dc exec -T db psql -U spa_admin -d spa_restore_test -c '\dt'
dc exec -T db psql -U spa_admin -d spa_restore_test \
  -c 'SELECT count(*) FROM users;'
```

Tên `spa_restore_test` là DB test mới. Nếu đã có, chọn tên test khác. Xác minh số liệu, ràng buộc, lịch sử migration và khi cần chạy bản app cô lập để kiểm tra nghiệp vụ. Chỉ liệt kê file dump hoặc chạy `pg_restore --list` chưa chứng minh phục hồi thành công.

### 14.3. Khi cần phục hồi production

Không tự ghi đè DB đang nhận giao dịch. Cần maintenance window, backup hiện trạng, ngăn request mới và dừng API/job. Restore vào DB mới, kiểm tra, cấp lại role/quyền như mục 11.3 rồi chuyển connection string sang DB đó; nếu đổi tên DB, cập nhật các chỗ `POSTGRES_DB`, healthcheck, script backup và lệnh quản trị tương ứng.

Khôi phục bản cũ làm mất các thay đổi sau thời điểm backup; cân nhắc đối soát thanh toán VNPay và các giao dịch ngoài hệ thống. Lưu bản mã hóa của `compose.env`, `api.env`, key cần thiết và quy trình tạo lại VPS ở nơi an toàn. Snapshot VPS bổ sung cho backup DB, không thay thế kiểm thử restore.

## 15. Quy trình cập nhật qua Git và rollback

Mỗi bản phát hành phải được kiểm tra local/CI, commit và push trước. Tránh sửa code trực tiếp trên VPS rồi để lệch Git.

Trên VPS:

```bash
cd /srv/spa/app
git status --short
old_commit=$(git rev-parse HEAD)
old_version=$(git rev-parse --short=12 HEAD)
git fetch origin
git log --oneline HEAD..origin/main
git pull --ff-only origin main
export APP_VERSION="$(git rev-parse --short=12 HEAD)"
sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" /srv/spa/shared/compose.env
dc config --quiet
dc build api web migrate
/srv/spa/bin/backup-db.sh
dc --profile tools run --rm --no-deps migrate
less /srv/spa/shared/migrations/migrations.sql
```

Dừng nếu build/backup/sinh SQL lỗi. Với schema cần khóa ghi hoặc không tương thích bản API cũ, tổ chức maintenance window và chặn request mới trong lúc chuyển. Với mô hình VPS đơn giản, có thể dừng Caddy và API trước khi áp schema; người dùng sẽ bị gián đoạn, callback VNPay cũng có thể bị ảnh hưởng nên chọn thời điểm thích hợp:

```bash
dc stop caddy api
dc exec -T db psql -U spa_admin -d nhunguyetspa \
  -v ON_ERROR_STOP=1 < /srv/spa/shared/migrations/migrations.sql
```

Nếu áp schema thất bại, giữ dịch vụ dừng, xác định trạng thái DB trước khi tiếp tục. Không tự chạy API cũ trên schema không tương thích. Nếu thêm bảng/schema hoặc đổi object owner, kiểm tra lại grants. Các bảng mới do `spa_admin` tạo trong `public` sẽ nhận default privileges đã cấu hình.

```bash
dc up -d api web caddy
dc ps
curl -fsS https://spa.example.com/health/ready
dc logs --tail=100 api caddy
```

Kiểm tra lại đăng nhập/refresh session, route sâu và tính năng vừa đổi. Ghi lại commit, tag image, thời điểm triển khai và file backup tương ứng. Giữ image cũ cho tới khi bản mới được xác nhận ổn định.

**Đổi secret backend:** sửa `api.env` rồi `dc up -d --force-recreate api`. Chỉ `dc restart api` không cập nhật môi trường container. Đổi JWT key khiến access token đang dùng không còn xác thực bằng key cũ; lên kế hoạch cho phiên đăng nhập.

**Đổi domain/API URL của Vite:** cần rebuild web vì `VITE_API_BASE_URL` là biến build-time. Sửa runtime env Nginx không đổi URL đã nằm trong JS bundle.

**Đổi mật khẩu DB:** sửa `compose.env` không thay password trong PostgreSQL đã khởi tạo. Cần `ALTER ROLE` bằng admin, đồng bộ secret và recreate container liên quan. Không xóa volume để đổi password.

### Rollback code khi schema còn tương thích

Các biến `old_commit`, `old_version` chỉ còn trong shell hiện tại; hãy lưu chúng vào nhật ký phát hành. Nếu schema mới tương thích với app cũ và image cũ còn tồn tại:

```bash
git switch --detach "$old_commit"
export APP_VERSION="$old_version"
sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" /srv/spa/shared/compose.env
dc up -d --no-build --pull never api web caddy
curl -fsS https://spa.example.com/health/ready
```

Không chỉ đổi tag image nếu Caddyfile/Compose cũ cũng cần khôi phục. Nếu migration đã xóa/đổi dữ liệu, rollback code có thể không đủ. Xem migration, viết bản sửa tiến hoặc phục hồi DB theo kế hoạch; không tự động chạy Down migration và giả định lấy lại được dữ liệu đã xóa.

Khi tiếp tục triển khai nhánh chính sau rollback, chuyển về `main` và pull bản đã kiểm tra. Không dùng `git reset --hard` nếu chưa xem các thay đổi trên server.

## 16. Chuyển dữ liệu local hiện có lên VPS

Chọn một trong hai cách: database production mới và bootstrap owner theo các bước trên; hoặc mang database local đã chọn lên. Không trộn tùy tiện hai quy trình. Dữ liệu demo/tài khoản mẫu không nên đi vào môi trường vận hành thật.

### 16.1. Dump từ PostgreSQL Docker local trên Windows

Không mặc định redirect dump nhị phân bằng PowerShell cũ vì có thể làm hỏng dữ liệu. Dump vào file trong container rồi `docker cp` ra ngoài:

```powershell
cd E:\UTE\HK126\Code\SpaSystem
docker compose exec -T db pg_dump -U spa -d nhunguyetspa -Fc --no-owner --no-acl -f /tmp/spa-transfer.dump
$dbContainerId = docker compose ps -q db
docker cp "${dbContainerId}:/tmp/spa-transfer.dump" "$env:TEMP/spa-transfer.dump"
scp -i "$env:USERPROFILE/.ssh/spa_vps" "$env:TEMP/spa-transfer.dump" deploy@203.0.113.10:/srv/spa/shared/spa-transfer.dump
```

Nếu local DB không nằm trong Compose mặc định, sửa theo container/connection thực tế. Việc lấy dump không truyền các thay đổi phát sinh sau thời điểm dump; nếu cần chuyển dịch vụ đang dùng, lên kế hoạch ngừng ghi cuối cùng.

### 16.2. Restore trên VPS trước khi khởi chạy API lần đầu

Thực hiện sau `dc up -d db`, **trước khi áp migrations/seed vào DB đích**. DB `nhunguyetspa` phải chưa có schema nghiệp vụ; kiểm tra `\dt`. Nếu đã có bảng, dừng và chọn database mới hoặc kế hoạch chuyển rõ ràng, không dùng `--clean` tùy tiện.

```bash
chmod 600 /srv/spa/shared/spa-transfer.dump
dc exec -T db pg_restore \
  -U spa_admin -d nhunguyetspa \
  --no-owner --no-acl --exit-on-error \
  < /srv/spa/shared/spa-transfer.dump
```

Sau đó sinh/áp migrations còn thiếu ở mục 11, cấp role `spa_app` và grants, bỏ qua seed nếu owner đã tồn tại. Kiểm tra quyền role/tài khoản mẫu, thay password cần thiết, dữ liệu demo, ảnh external, URL localhost trong dữ liệu và phiên đăng nhập cũ. Giữ cùng major PostgreSQL 17 trong quy trình chuyển này.

Dump chứa dữ liệu người dùng nên giữ quyền file chặt chẽ và có lịch xóa file chuyển tạm sau khi xác nhận backup an toàn. Không commit dump vào Git.

## 17. Quản trị PostgreSQL bằng DBeaver/pgAdmin qua SSH

Không publish PostgreSQL ra Internet. Nếu cần GUI từ máy Windows, tạo file override riêng `compose.db-access.yml`:

```yaml
services:
  db:
    ports:
      - '127.0.0.1:5432:5432'
```

Trên VPS, áp cùng hai file vào **cùng project `spa-prod`**:

```bash
docker compose --env-file /srv/spa/shared/compose.env \
  -f /srv/spa/app/compose.production.yml \
  -f /srv/spa/app/compose.db-access.yml up -d db
```

Mở tunnel từ Windows:

```powershell
ssh -i "$env:USERPROFILE/.ssh/spa_vps" -N -L 15432:127.0.0.1:5432 deploy@203.0.113.10
```

Giữ terminal tunnel mở; cấu hình DBeaver host `127.0.0.1`, port `15432`, database `nhunguyetspa`, user có quyền phù hợp. Chỉ dùng admin khi cần quản trị. Port 15432 là local trên Windows; 5432 chỉ bind loopback VPS.

Khi xong, đóng tunnel và chạy `dc up -d db` với file production gốc để bỏ publish tạm, xác nhận bằng `dc ps` và `docker ps`. Trong thời gian dùng override, đừng vô tình mở `0.0.0.0:5432`.

## 18. Mobile sau khi API đã public

Đặt local `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://spa.example.com
```

Khởi động lại Expo/Metro hoặc tạo bản build app mới để bundle nhận biến. Điện thoại không còn cần cùng Wi-Fi với máy backend khi dùng API public. `localhost`, `10.0.2.2` và IP LAN không dùng cho bản app phát hành.

Deploy backend/web không tạo APK/AAB và không phát hành lên store. Cần quy trình build mobile riêng, cấu hình scheme/deep link, signing và thông tin môi trường. URL return VNPay mobile phải khớp app đang cài.

## 19. Theo dõi vận hành và xử lý lỗi

Các lệnh thường dùng trong SSH, sau khi định nghĩa `dc`:

```bash
dc ps
dc logs --tail=100 api
dc logs --tail=100 db
dc logs --tail=100 caddy
docker stats --no-stream
docker system df
df -h
free -h
sudo journalctl -u docker -n 100 --no-pager
```

Không gửi logs chứa thông tin khách hàng, query token, payment signature hay secret lên nơi công khai. Compose đã giới hạn log container; backup và log cron cần được theo dõi riêng.

| Triệu chứng | Kiểm tra và cách xử lý |
| --- | --- |
| Caddy 502 | API có chạy và listen 8080 không; DNS service `api`; `dc logs api`; migration đã áp chưa |
| Domain không mở | DNS A/AAAA, security group nhà cung cấp, UFW, Caddy có giữ 80/443 không |
| TLS không cấp | Domain sai, AAAA sai, 80/443 bị chặn, DNS proxy/CAA, log Caddy; không restart liên tục để tránh rate limit CA |
| API trả HTML | `/api/*` hoặc `/health/*` đang đi vào web SPA; sửa Caddy route |
| F5 route sâu bị 404 | Kiểm tra `try_files ... /index.html` trong Nginx; image web có config đúng không |
| Frontend gọi localhost | Vite build đang dùng URL local; sửa build arg và rebuild web |
| Reload mất login | Origin web/API, HTTPS, cookie flags/path, refresh request, giữ nguyên domain; không mở lẫn www và non-www |
| CORS | Origin chính xác có scheme, không dấu `/` cuối, không dùng wildcard với credential |
| Nhiều người bị 429 cùng lúc | Forwarded headers chưa chạy hoặc IP Caddy khác `KnownProxy`; đừng tắt rate limit để che lỗi |
| VNPay có IP container | Kiểm tra `UseForwardedHeaders` và proxy tin cậy trước request tạo thanh toán |
| Thanh toán return nhưng đơn chưa paid | Xác nhận IPN được gọi và chữ ký hợp lệ; Production mặc định không xử lý return như Development |
| OTP 503 | SMTP credentials, quota, outbound port 587/465, TLS, spam; kiểm tra log backend |
| Upload 503 | Cloudinary credentials, quota và quyền tài khoản |
| AI 503/429 | API key, model, quota provider và rate limit ứng dụng |
| Không có realtime | `/hubs/*` chưa proxy vào API, WebSocket/token hết hạn, kiểm tra Network WS |
| `relation ... does not exist` | Chưa áp đủ migration hoặc đang dùng sai DB/schema |
| DB password sai sau sửa env | Volume cũ giữ password cũ; cần ALTER ROLE và đồng bộ container |
| `permission denied for table` | Grants của `spa_app`, object owner và default privileges |
| Build Linux báo thiếu file ảnh | File mới chưa commit hoặc chữ hoa/thường trong import không khớp tên file |
| Build bị kill/exit 137 | RAM, OOM kernel, dung lượng; build tuần tự/CI, tăng RAM hoặc swap phù hợp |
| Sửa env mà app không đổi | Recreate API; riêng biến Vite phải rebuild web |

Giám sát tối thiểu: uptime HTTPS và readiness từ bên ngoài, dung lượng đĩa, RAM/CPU, restart container, lỗi API tăng, tuổi backup mới nhất và kết quả restore test. Health check không thay thế kiểm tra nghiệp vụ hoặc cảnh báo. `restart: unless-stopped` giúp container chạy lại sau reboot nếu không bị stop chủ động; không tự sửa lỗi app logic hay tự restart chỉ vì health trạng thái unhealthy.

Với cửa sổ bảo trì đã thống nhất, thử reboot VPS sau khi backup và xác nhận Docker/container tự lên. Không dùng reboot để chữa lỗi chưa rõ nguyên nhân khi còn giao dịch đang chạy.

### Những lệnh cần tránh nhầm

- `dc down` dừng/xóa container và network, thường giữ named volume; gây downtime.
- **`dc down -v` xóa cả volume, có thể mất DB và dữ liệu chứng chỉ.**
- **`docker system prune --volumes` và xóa volume thủ công có thể xóa dữ liệu.**
- `docker compose up` không có `-f` trong repo có thể chạy cấu hình local.
- Không chạy seeder full/demo trên DB thật.
- Không nâng PostgreSQL major bằng đổi image tag rồi mount volume dữ liệu cũ.

## 20. Khi nào thêm CI/CD

Sau khi deploy thủ công và restore đã ổn, có thể thêm GitHub Actions:

1. Pull request chạy lint/typecheck/test và build.
2. Bản phát hành build image API/web gắn commit SHA, đẩy lên registry riêng như GHCR.
3. VPS dùng credential chỉ có quyền pull image cần thiết.
4. Pipeline triển khai có khóa ngăn hai đợt chạy đồng thời, tạo backup, review/apply migration rồi cập nhật container.
5. Kiểm tra readiness và smoke test; giữ artifact/image cũ và quy trình rollback tương thích DB.

Khi chuyển sang pull image từ registry, đổi trường `image` sang registry tương ứng và dùng `pull`, thay cho build source trên VPS. Secrets production nằm ở VPS/secret manager, không bake vào image. Tách quyền GitHub → VPS, VPS → GitHub và VPS → registry. Không tự động deploy mỗi push khi migration còn có thể xóa dữ liệu mà chưa được kiểm tra.

## 21. Checklist hoàn tất

- [ ] Source và ảnh được commit/push đúng, không có secret trong Git.
- [ ] Đã quyết định/kế hoạch nâng .NET lên bản còn hỗ trợ.
- [ ] SSH key và sudo hoạt động, có đường khôi phục qua console nhà cung cấp.
- [ ] Chỉ public các cổng cần thiết; DB/API không expose Internet.
- [ ] Domain/HTTPS đúng, Caddy data được lưu volume.
- [ ] API chạy Production, Swagger tắt, forwarded headers chỉ tin proxy phù hợp.
- [ ] Web gọi cùng origin HTTPS, refresh cookie hoạt động sau F5.
- [ ] SQL migrations được review/áp thành công; API dùng role DB giới hạn quyền.
- [ ] Owner thật được tạo, không có seed demo làm lộ tài khoản mặc định.
- [ ] OTP, upload, booking, notifications, AI và thanh toán được thử theo phạm vi sử dụng.
- [ ] IPN VNPay hoạt động với credentials/endpoint đúng môi trường.
- [ ] Backup tự động, bản offsite mã hóa và restore test đã được xác nhận.
- [ ] Có cảnh báo uptime/disk/backup và quy trình cập nhật/rollback.

