from google import genai
import inspect

try:
    client = genai.Client(api_key="TEST")
    print("create:", inspect.signature(client.file_search_stores.create))
    # print("upload_to_file_search_store:", inspect.signature(client.file_search_stores.upload_to_file_search_store)) # This might not exist on the class if it's dynamically generated or I need to check instance
    # Let's try to access it on the instance
    if hasattr(client.file_search_stores, 'upload_to_file_search_store'):
        print("upload_to_file_search_store:", inspect.signature(client.file_search_stores.upload_to_file_search_store))
    
    if hasattr(client.file_search_stores, 'import_file'):
         print("import_file:", inspect.signature(client.file_search_stores.import_file))
         
except Exception as e:
    print(e)
