import os
import sys
import shutil
import subprocess
from PIL import Image

# --- CONFIGURATION ---
# We now support videos too!
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.mkv', '.avi'}

# Settings
MAX_WIDTH = 1920 
IMAGE_QUALITY = 80

# Video Settings (FFmpeg)
# CRF 23 is standard balance. Lower = better quality/bigger size. Higher = worse quality/small size.
VIDEO_CRF = 23 
VIDEO_PRESET = 'medium' # 'slow' = smaller file but takes longer to process. 'fast' = opposite.

# --- GLOBALS ---
pending_changes = [] 

def get_size(path):
    return os.path.getsize(path)

def format_bytes(size):
    power = 2**20
    n = size / power
    return f"{n:.2f} MB"

def compress_video_ffmpeg(input_path, output_path):
    """
    Uses FFmpeg to compress video.
    Converts to H.264 AAC which is the most compatible format.
    """
    try:
        cmd = [
            'ffmpeg', 
            '-y',                 # Overwrite output without asking
            '-i', input_path,     # Input
            '-vcodec', 'libx264', # Video Codec
            '-crf', str(VIDEO_CRF), # Quality Factor
            '-preset', VIDEO_PRESET,
            '-acodec', 'aac',     # Audio Codec
            '-b:a', '128k',       # Audio Bitrate
            '-movflags', '+faststart', # Optimized for web streaming
            output_path
        ]
        # Run silent
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception as e:
        return False

def compress_image_external(input_path):
    """
    Uses the 'optimize-images' CLI library on the file in-place.
    """
    try:
        # Construct command for the CLI tool
        cmd = [
            'optimize-images',
            input_path,
            '-mw', str(MAX_WIDTH),
            '-q', str(IMAGE_QUALITY),
            '--no-interactive' # Don't ask for y/n confirmation
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except FileNotFoundError:
        return False # Tool not installed
    except Exception:
        return False

def compress_image_fallback(input_path, ext):
    """
    Fallback: Uses internal Pillow if 'optimize-images' isn't installed.
    """
    try:
        with Image.open(input_path) as img:
            if ext in ['.jpg', '.jpeg'] and img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            if MAX_WIDTH and img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / float(img.width)
                new_height = int((float(img.height) * float(ratio)))
                img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)

            if ext == '.png':
                img = img.quantize(colors=256, method=2)
                img.save(input_path, optimize=True)
            elif ext in ['.jpg', '.jpeg']:
                img.save(input_path, optimize=True, quality=IMAGE_QUALITY, subsampling=0)
            else:
                img.save(input_path, optimize=True, quality=IMAGE_QUALITY)
        return True
    except Exception:
        return False

def process_file(file_path):
    file_dir, file_name = os.path.split(file_path)
    name, ext = os.path.splitext(file_name)
    ext = ext.lower()

    is_video = ext in VIDEO_EXTENSIONS
    is_image = ext in IMAGE_EXTENSIONS

    # Skip non-media or already temp/old files
    if (not is_video and not is_image) or name.endswith('_old') or name.endswith('_temp'):
        return

    # Create Temp File (Work on the copy)
    temp_path = os.path.join(file_dir, f"{name}_temp{ext}")
    
    # Clean up any previous failed temp file
    if os.path.exists(temp_path):
        os.remove(temp_path)

    # For images, we copy first then process in-place. 
    # For videos, ffmpeg reads src and writes to dest.
    if is_image:
        shutil.copy2(file_path, temp_path)
    
    original_size = get_size(file_path)
    success = False

    try:
        if is_video:
            success = compress_video_ffmpeg(file_path, temp_path)
        elif is_image:
            # Try external library first
            if not compress_image_external(temp_path):
                # If that fails (or not installed), use internal Python
                success = compress_image_fallback(temp_path, ext)
            else:
                success = True

        if success and os.path.exists(temp_path):
            new_size = get_size(temp_path)
            
            # LOGIC: Only keep if we actually saved space (and file isn't 0 bytes)
            if new_size > 0 and new_size < original_size:
                pending_changes.append({
                    'original': file_path,
                    'temp': temp_path,
                    'old_size': original_size,
                    'new_size': new_size,
                    'name': file_name,
                    'type': 'VIDEO' if is_video else 'IMAGE'
                })
            else:
                os.remove(temp_path) # No gain, delete temp
        else:
            if os.path.exists(temp_path): os.remove(temp_path)

    except Exception as e:
        print(f"\n❌ Error on {file_name}: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)

def apply_changes(mode):
    print(f"\n⚡ Executing: {mode}...")
    count = 0
    for item in pending_changes:
        og_path = item['original']
        temp_path = item['temp']
        
        dir_name, file_name = os.path.split(og_path)
        name, ext = os.path.splitext(file_name)
        old_backup_path = os.path.join(dir_name, f"{name}_old{ext}")

        try:
            if mode == 'discard':
                if os.path.exists(temp_path): os.remove(temp_path)
            
            elif mode == 'replace_save_old':
                if os.path.exists(old_backup_path): os.remove(old_backup_path)
                os.rename(og_path, old_backup_path)
                os.rename(temp_path, og_path)
                count += 1

            elif mode == 'replace_delete_old':
                os.remove(og_path)
                os.rename(temp_path, og_path)
                count += 1

        except Exception as e:
            print(f"Error on {file_name}: {e}")

    print(f"✅ Operation complete. Processed {count} files.")

def main():
    target_dir = os.path.join(os.getcwd(), 'assets')
    
    if not os.path.exists(target_dir):
        print("❌ 'assets' folder not found.")
        return

    print(f"🔍 Scanning {target_dir}...")
    
    all_candidates = []
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IMAGE_EXTENSIONS or ext in VIDEO_EXTENSIONS:
                all_candidates.append(os.path.join(root, file))

    total_files = len(all_candidates)
    print(f"Found {total_files} media files. Creating optimized previews...\n")

    for index, full_path in enumerate(all_candidates):
        process_file(full_path)
        sys.stdout.write(f"\r⏳ Analyzing: {index+1}/{total_files}...")
        sys.stdout.flush()

    if not pending_changes:
        print("\n\n✅ No files could be optimized further.")
        return

    total_og = sum(x['old_size'] for x in pending_changes)
    total_new = sum(x['new_size'] for x in pending_changes)
    saved = total_og - total_new
    percent = (saved / total_og) * 100

    # Summary Table
    print("\n\n" + "="*50)
    print(f"       OPTIMIZATION PREVIEW ({len(pending_changes)} files)")
    print("="*50)
    print(f"{'Filename':<30} | {'Type':<5} | {'Saving'}")
    print("-" * 50)
    for item in pending_changes[:5]: # Show first 5 as example
        save_mb = format_bytes(item['old_size'] - item['new_size'])
        print(f"{item['name'][:29]:<30} | {item['type']:<5} | -{save_mb}")
    if len(pending_changes) > 5:
        print(f"... and {len(pending_changes)-5} more.")
    
    print("-" * 50)
    print(f"TOTAL Old Size:    {format_bytes(total_og)}")
    print(f"TOTAL New Size:    {format_bytes(total_new)}")
    print(f"TOTAL SAVED:       {format_bytes(saved)} ({percent:.2f}%)")
    print("="*50)

    print("\nOptions:")
    print(" [1] Apply & KEEP Old (renamed to *_old)")
    print(" [2] Apply & DELETE Old")
    print(" [3] Discard All")
    
    while True:
        choice = input("\nEnter choice (1/2/3): ").strip()
        if choice == '1':
            apply_changes('replace_save_old')
            break
        elif choice == '2':
            if input("⚠️ Confirm delete? (y/n): ").lower() == 'y':
                apply_changes('replace_delete_old')
                break
        elif choice == '3':
            apply_changes('discard')
            print("❌ Cancelled.")
            break

if __name__ == "__main__":
    main()