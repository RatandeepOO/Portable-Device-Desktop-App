# Setting Up Internet Connectivity (Ngrok)

To make your system work over the internet, follow these steps to create a public tunnel for your local server.

## 1. Install Ngrok
If you haven't already, download and install Ngrok from [ngrok.com](https://ngrok.com/download).

## 2. Authenticate
Run the following command in your terminal (get your token from your Ngrok dashboard):
```bash
ngrok config add-authtoken <YOUR_AUTH_TOKEN>
```

## 3. Start the Tunnel
Locate your server port (default is 8000). Start the tunnel by running:
```bash
ngrok http 8000
```

## 4. Update Your Configuration
Once Ngrok starts, it will provide a **Forwarding URL** (e.g., `https://a1b2-c3d4.ngrok-free.app`).

1.  **Update .env**: Paste this URL into the `PUBLIC_SERVER_URL` field in your root `.env` file.
2.  **Mobile App**: When you start the Flet app, use this same URL in the login screen.

## 5. Running the Flet App
You can run the Flet app locally for testing:
```bash
cd mobile-app-flet
python main.py
```

### To build for Android:
If you have the Android SDK installed, you can build an APK:
```bash
flet build apk
```
The APK will be generated in the `build/apk` folder.
