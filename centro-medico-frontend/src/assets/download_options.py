import urllib.request
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

# Option 1: Female Doctor with Phone (Pexels)
# https://images.pexels.com/photos/1181622/pexels-photo-1181622.jpeg
url1 = "https://images.pexels.com/photos/1181622/pexels-photo-1181622.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
dest1 = r"c:\Users\guty_\OneDrive\Documentos\centro_medico_con_fastapi\centro-medico-frontend\src\assets\banner-option-1.jpg"

# Option 2: Digital Health/Telemedicine (Close up of tech)
# https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg
url2 = "https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
dest2 = r"c:\Users\guty_\OneDrive\Documentos\centro_medico_con_fastapi\centro-medico-frontend\src\assets\banner-option-2.jpg"

# Option 3: Medical Team (Friendly, consulting)
# https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg
url3 = "https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
dest3 = r"c:\Users\guty_\OneDrive\Documentos\centro_medico_con_fastapi\centro-medico-frontend\src\assets\banner-option-3.jpg"

def download(url, dest):
    print(f"Downloading {url} to {dest}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Success: {dest}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

download(url1, dest1)
download(url2, dest2)
download(url3, dest3)
