import urllib.request
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

# Target specific Pexels image of male doctor to match user request
# https://www.pexels.com/photo/man-in-white-lab-coat-2182979/
req = urllib.request.Request(
    "https://images.pexels.com/photos/2182979/pexels-photo-2182979.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    headers={'User-Agent': 'Mozilla/5.0'}
)
# Use .jpg extension as per previous setup
dest = r"c:\Users\guty_\OneDrive\Documentos\centro_medico_con_fastapi\centro-medico-frontend\src\assets\doctor-bg.jpg"

print(f"Downloading male doctor image to {dest}...")

try:
    with urllib.request.urlopen(req) as response, open(dest, 'wb') as out_file:
        data = response.read()
        out_file.write(data)
    
    print("Download complete.")
    size = os.path.getsize(dest)
    print(f"File size: {size} bytes")
    
    with open(dest, 'rb') as f:
        header = f.read(6)
        print(f"File header: {header}")
        if header.startswith(b'\xff\xd8'):
             print("SUCCESS: Valid JPEG header found.")
        else:
             print(f"WARNING: Unexpected header: {header}")

except Exception as e:
    print(f"Error downloading: {e}")
