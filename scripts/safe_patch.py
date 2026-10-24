import sys, os

def patch_file(file_path, old_text, new_text):
    with open(file_path, 'rb') as f:
        data = f.read()
    
    # Detect line endings
    is_crlf = b'\r\n' in data
    
    # Convert old_text and new_text to match
    old_bytes = old_text.replace('\r\n', '\n').encode('utf-8')
    new_bytes = new_text.replace('\r\n', '\n').encode('utf-8')
    data_norm = data.replace(b'\r\n', b'\n')
    
    if old_bytes not in data_norm:
        print(f"ERROR: old_text not found in {file_path}")
        return False
        
    count = data_norm.count(old_bytes)
    data_replaced = data_norm.replace(old_bytes, new_bytes)
    
    if is_crlf:
        data_final = data_replaced.replace(b'\n', b'\r\n')
    else:
        data_final = data_replaced
        
    with open(file_path, 'wb') as f:
        f.write(data_final)
        
    print(f"SUCCESS: Replaced {count} occurrence(s) in {file_path}")
    return True

if __name__ == '__main__':
    # Can be imported or called
    pass
