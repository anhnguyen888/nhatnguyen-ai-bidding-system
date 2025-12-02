from google import genai
import inspect

try:
    client = genai.Client(api_key="TEST")
    print("Methods of client.file_search_stores:")
    for name, method in inspect.getmembers(client.file_search_stores):
        if not name.startswith("_"):
            print(name)
            
    # Check if create_file exists? No, usually it's separate resource or under stores?
    # Let's check if there is a way to add files.
except Exception as e:
    print(e)
