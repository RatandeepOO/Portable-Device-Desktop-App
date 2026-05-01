import urllib.request
import os

url = "https://dl.google.com/android/repository/android-ndk-r26b-windows.zip"
file_path = "C:\\Users\\arora\\ndk.zip"

def download_file(url, file_path):
    print(f"Downloading {url} to {file_path}...")
    try:
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-agent', 'Mozilla/5.0')]
        urllib.request.install_opener(opener)
        urllib.request.urlretrieve(url, file_path)
        print("Download complete!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    download_file(url, file_path)
