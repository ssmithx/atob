To deploy a Docker container on a VPS and ensure it **auto-starts** and runs continuously, follow these steps:

### 1. **Install Docker on Your VPS**
If Docker isn't installed yet, install it using:
```bash
sudo apt update
sudo apt install docker.io -y
```
Then, enable and start the Docker service:
```bash
sudo systemctl enable docker
sudo systemctl start docker
```
### 2. **build the image**
```bash
sudo docker  build --pull -t nostr-rs-relay .
```

### 3. **Run Your Container with a Restart Policy**
Use the `--restart` flag when running your container:
```bash
sudo docker run -d --restart=always -it -p 8008:8080 --mount src=$(pwd)/config.toml,target=/usr/src/app/config.toml,type=bind --mount src=$(pwd)/data,target=/usr/src/app/db,type=bind nostr-rs-relay
```
- `always`: Restarts the container **whenever** it stops.
- `unless-stopped`: Restarts unless manually stopped.

### 4. **Using Docker Compose (Optional)**
If using **Docker Compose**, add this to your `docker-compose.yml`:
```yaml
version: '3'
services:
  my_service:
    image: my_image
    restart: always
```
Then, start it with:
```bash
docker-compose up -d
```

### 5. **Using Systemd for Extra Reliability**
Create a **Systemd service** to ensure Docker starts on boot:
```bash
sudo nano /etc/systemd/system/my_container.service
```
Add:
```ini
[Unit]
Description=My Docker Container
Requires=docker.service
After=docker.service

[Service]
Restart=always
ExecStart=/usr/bin/docker start -a my_container
ExecStop=/usr/bin/docker stop -t 2 my_container

[Install]
WantedBy=default.target
```
Then, enable it:
```bash
sudo systemctl enable my_container.service
sudo systemctl start my_container.service
```

This ensures your container **automatically starts** even after a system reboot.

Would you like help troubleshooting any issues with deployment?
