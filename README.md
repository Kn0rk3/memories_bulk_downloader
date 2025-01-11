# Bulk Memories Downloader

A privacy-focused web application that helps you download your Snapchat Memories efficiently and securely. This tool processes your Snapchat Memories export file (`memories_history.html`) directly in your browser, ensuring your personal data never leaves your device.

## 🔑 Key Features

- 🔒 **Privacy First**: All processing happens in your browser - no data is stored on servers
- 📦 **Bulk Downloads**: Download multiple months or years of memories at once
- 🚀 **Parallel Downloads**: Configurable concurrent downloads for faster processing
- 📱 **Mobile Friendly**: Fully responsive design that works on all devices
- 🌐 **Browser Compatible**: Tested with Firefox and Microsoft Edge

## ⚡ Quick Start

1. Export your Snapchat Memories data from your Snapchat account
2. Upload the `memories_history.html` file to the application
3. Select the months/years you want to download
4. Start downloading your memories directly to your device

## 🛠️ Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Virtual environment (recommended)

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/snapchat-memories-downloader.git
cd snapchat-memories-downloader
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` file with your settings:
```env
APP_TITLE="Memories Bulk Downloader"
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
MAX_UPLOAD_SIZE=31457280  # 30MB in bytes
GITHUB_URL=https://github.com/yourusername/your-repo
COFFEE_URL=https://www.buymeacoffee.com/yourusername
```

5. Run migrations:
```bash
python manage.py makemigrations downloader
python manage.py migrate
```

6. Start the development server:
```bash
python manage.py runserver
```

Visit `http://localhost:8000` to access the application.

## 🚀 Deployment

### Azure Deployment

1. Create an Azure App Service:
   - Runtime stack: Python 3.8 or higher
   - Operating System: Linux
   - Publish: Code

2. Configure deployment settings:
   - Set up GitHub Actions for CI/CD (workflow file included in `.github/workflows`)
   - Or use Azure CLI for manual deployment

3. Configure environment variables in Azure:
   - Go to Configuration > Application settings
   - Add the following settings:
     ```
     DEBUG=False
     SECRET_KEY=your-secure-secret-key
     ALLOWED_HOSTS=your-azure-domain.azurewebsites.net
     GITHUB_URL=your-github-url
     COFFEE_URL=your-coffee-url
     ```

4. Enable HTTPS and configure custom domain (optional)

### Manual Deployment

For other hosting platforms or manual deployment:

1. Collect static files:
```bash
python manage.py collectstatic
```

2. Configure your web server (nginx/Apache) to serve the application
3. Set up SSL certificate
4. Configure environment variables

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DEBUG | Debug mode | False |
| SECRET_KEY | Django secret key | None |
| ALLOWED_HOSTS | Allowed hosts for the application | [] |
| GITHUB_URL | GitHub repository URL | None |
| COFFEE_URL | Buy Me a Coffee URL | None |

### Application Settings

- Maximum file size: 30MB
- Supported file type: HTML
- Maximum concurrent downloads: 6

## 📝 License

This project is licensed under the MIT License.

## ⚠️ Important Note

This is an unofficial tool and is not affiliated with, endorsed by, or sponsored by Snapchat. The tool is designed to help users download their own data that Snapchat provides through their official export feature.

## 🙏 Acknowledgments

- Built with Django and Bootstrap
- Icons by Bootstrap Icons

## 📧 Support

- Open an issue for bug reports or feature requests
- Star the repository if you find it useful
- Consider supporting the development via Buy Me a Coffee