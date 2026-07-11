# 🚀 Deployment Guide

Complete guide for deploying the AI-Powered Code Review Platform to production.

## 📋 Pre-Deployment Checklist

- [ ] Anthropic API key obtained
- [ ] Domain name registered (if applicable)
- [ ] SSL certificate ready (Let's Encrypt recommended)
- [ ] Server/VPS provisioned (minimum 2GB RAM, 2 CPU cores)
- [ ] MongoDB instance ready (Atlas or self-hosted)
- [ ] Environment variables configured
- [ ] Secret keys generated

## 🌐 Deployment Options

### Option 1: Docker Compose (Recommended)

#### Step 1: Server Setup

1. **Install Docker and Docker Compose**
   ```bash
   # Update packages
   sudo apt update
   sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Install Docker Compose
   sudo apt install docker-compose -y

   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd code-review-platform
   ```

#### Step 2: Configure Environment

1. **Create production environment file**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Edit backend/.env**
   ```env
   MONGODB_URL=mongodb://mongodb:27017
   DATABASE_NAME=code_review_db
   SECRET_KEY=<generate-a-strong-secret-key-min-32-chars>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   
   ANTHROPIC_API_KEY=<your-anthropic-api-key>
   
   GITHUB_CLIENT_ID=<optional>
   GITHUB_CLIENT_SECRET=<optional>
   
   CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
   ENVIRONMENT=production
   ```

3. **Generate a secure secret key**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

#### Step 3: Deploy

1. **Build and start containers**
   ```bash
   docker-compose up -d --build
   ```

2. **Check container status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

3. **Verify deployment**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:3000
   ```

#### Step 4: Configure Nginx (Reverse Proxy)

1. **Install Nginx**
   ```bash
   sudo apt install nginx -y
   ```

2. **Create Nginx configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/code-review
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/code-review /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

#### Step 5: SSL Certificate (Let's Encrypt)

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo certbot renew --dry-run
   ```

### Option 2: Manual Deployment

#### Backend Deployment

1. **Set up Python environment**
   ```bash
   sudo apt install python3.11 python3.11-venv -y
   cd backend
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure systemd service**
   ```bash
   sudo nano /etc/systemd/system/code-review-backend.service
   ```

   Add:
   ```ini
   [Unit]
   Description=Code Review Backend
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/code-review-platform/backend
   Environment="PATH=/path/to/code-review-platform/backend/venv/bin"
   ExecStart=/path/to/code-review-platform/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Start service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable code-review-backend
   sudo systemctl start code-review-backend
   sudo systemctl status code-review-backend
   ```

#### Frontend Deployment

1. **Build the frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Configure Nginx to serve frontend**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/code-review-platform/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:8000;
       }
   }
   ```

### Option 3: Cloud Platform Deployment

#### AWS Deployment

1. **EC2 Instance**
   - Launch t2.medium or larger
   - Open ports: 80, 443, 8000
   - Follow Docker Compose steps above

2. **MongoDB Atlas**
   - Create cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string
   - Update MONGODB_URL in .env

3. **S3 for static files** (optional)

#### DigitalOcean Deployment

1. **Create Droplet**
   - Choose Ubuntu 22.04
   - Minimum 2GB RAM
   - Follow Docker Compose steps

2. **Managed MongoDB** (optional)
   - Create database cluster
   - Update connection string

#### Heroku Deployment

1. **Backend on Heroku**
   ```bash
   cd backend
   heroku create code-review-backend
   heroku addons:create mongolab
   heroku config:set ANTHROPIC_API_KEY=your_key
   git push heroku main
   ```

2. **Frontend on Vercel/Netlify**
   - Connect GitHub repo
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variable: `VITE_API_URL`

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use strong secret keys
   - Rotate keys regularly

2. **Firewall Configuration**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

3. **MongoDB Security**
   - Enable authentication
   - Use strong passwords
   - Limit network access
   - Regular backups

4. **SSL/TLS**
   - Always use HTTPS in production
   - Keep certificates updated
   - Use strong cipher suites

5. **Rate Limiting**
   - Configure Nginx rate limiting
   - Implement API rate limiting
   - Monitor for abuse

## 📊 Monitoring

### Application Monitoring

1. **Docker stats**
   ```bash
   docker stats
   ```

2. **Container logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

### System Monitoring

1. **Install monitoring tools**
   ```bash
   sudo apt install htop nethogs -y
   ```

2. **Monitor resources**
   ```bash
   htop
   df -h
   free -m
   ```

### Log Management

1. **Configure log rotation**
   ```bash
   sudo nano /etc/logrotate.d/code-review
   ```

   Add:
   ```
   /var/log/code-review/*.log {
       daily
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 www-data www-data
   }
   ```

## 🔄 Maintenance

### Backup Strategy

1. **MongoDB Backup**
   ```bash
   docker exec mongodb mongodump --out /backup
   ```

2. **Automated backups**
   ```bash
   # Add to crontab
   0 2 * * * docker exec mongodb mongodump --out /backup/$(date +\%Y-\%m-\%d)
   ```

### Updates

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Rebuild containers**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Update dependencies**
   ```bash
   # Backend
   pip install -r requirements.txt --upgrade
   
   # Frontend
   npm update
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs <service-name>
   docker-compose down
   docker-compose up -d
   ```

2. **MongoDB connection failed**
   - Check if MongoDB is running
   - Verify connection string
   - Check firewall rules

3. **API requests failing**
   - Check CORS settings
   - Verify API URL in frontend
   - Check Nginx configuration

4. **High memory usage**
   - Increase server resources
   - Optimize queries
   - Add caching

## 📱 Health Checks

1. **Backend health**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Frontend health**
   ```bash
   curl http://localhost:3000
   ```

3. **MongoDB health**
   ```bash
   docker exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

## 🎯 Performance Optimization

1. **Enable caching**
   - Configure Nginx caching
   - Use Redis for session storage
   - Implement CDN for static files

2. **Database optimization**
   - Add indexes
   - Optimize queries
   - Regular maintenance

3. **Frontend optimization**
   - Code splitting
   - Lazy loading
   - Image optimization

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Review Nginx configuration
4. Check firewall rules
5. Monitor system resources

---

**Happy Deploying! 🚀**
