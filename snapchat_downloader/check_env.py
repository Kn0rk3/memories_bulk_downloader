import os
from dotenv import load_dotenv

def check_env_variables():
    load_dotenv()
    
    required_vars = [
        'APP_TITLE',
        'SECRET_KEY',
        'ALLOWED_HOSTS',
        'DEBUG',
        'MAX_UPLOAD_SIZE',
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        return False
    
    print("✅ All required environment variables are set:")
    for var in required_vars:
        print(f"  - {var}: {os.environ.get(var)}")
    return True

if __name__ == "__main__":
    check_env_variables()