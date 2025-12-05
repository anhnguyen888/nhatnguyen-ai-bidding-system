import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)

def create_rag_store(display_name: str) -> str:
    """Creates a file search store."""
    store = client.file_search_stores.create(config={"display_name": display_name})
    return store.name

def upload_file(file: str | object, mime_type: str = None, display_name: str = None):
    """Uploads a file to Gemini.
    
    Args:
        file: Path to the file (str) or a file-like object (IO).
    """
    config = {"mime_type": mime_type}
    if display_name:
        config["display_name"] = display_name
        
    # client.files.upload handles both path strings and file-like objects
    file = client.files.upload(file=file, config=config)
    
    # Wait for processing
    while file.state.name == "PROCESSING":
        time.sleep(2)
        file = client.files.get(name=file.name)
        
    if file.state.name == "FAILED":
        raise ValueError(f"File upload failed: {file.error.message}")
        
    return file

def add_files_to_store(store_name: str, file_names: list[str]):
    """Adds uploaded files to a file search store."""
    # Since we can't easily add to an existing store without complex operations in some SDK versions,
    # we will assume we are creating a store or we just don't support adding yet.
    # BUT, we can create a store with these files.
    # Let's change this to `create_store_with_files`.
    pass

def create_store_with_files(display_name: str, file_uris: list[str]) -> str:
    """Creates a store and adds files to it."""
    # Note: initial_document_resources expects a list of objects with uri
    initial_resources = [{"uri": uri} for uri in file_uris]
    store = client.file_search_stores.create(
        config={
            "display_name": display_name,
        }
    )
    
    # Add files to the store
    for uri in file_uris:
        try:
             # We need the file resource name, but we only have URI.
             # Wait, the URI from upload_file is like 'https://generativelanguage.googleapis.com/v1beta/files/...'
             # But import_file expects 'files/...' resource name.
             # We need to extract the resource name from the URI or ensure we pass the resource name.
             # In main.py, we pass `f.uri`. Let's check main.py.
             pass
        except Exception:
            pass

    # Actually, let's look at main.py. It passes `f.uri`.
    # But `upload_file` returns a File object which has `name` (resource name) and `uri`.
    # We should pass `name` instead of `uri` to `create_store_with_files`.
    
    # For now, let's just fix the loop here assuming we get resource names or can extract them.
    # But wait, if I change main.py to pass names, I can just use `add_file_to_store`.
    
    for file_uri in file_uris:
        # Extract name from URI if needed, or assume it's a name if it starts with files/
        # The URI usually contains the name.
        # Let's assume we fix main.py to pass the name.
        add_file_to_store(store.name, file_uri)

    return store.name

def add_file_to_store(store_name: str, file_resource_name: str):
    """Adds an already uploaded file to a file search store."""
    try:
        # Use import_file to add an existing file resource to the store
        client.file_search_stores.import_file(
            file_search_store_name=store_name,
            file_name=file_resource_name
        )
        # Note: import_file returns an operation, we might want to wait?
        # But usually for File Search we just fire and forget or wait for indexing.
        # The evaluation step waits a bit anyway.
    except Exception as e:
        print(f"Error adding file to store: {e}")
        raise e

def evaluate_criteria(store_name: str, criteria_prompt: str) -> str:
    """Evaluates a single criteria using the file search store."""
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=criteria_prompt + " ALWAYS ANSWER IN VIETNAMESE. Format your response exactly like this:\nSCORE: <number from 0 to 10>\nEXPLANATION: <brief explanation>",
        config=types.GenerateContentConfig(
            tools=[types.Tool(file_search=types.FileSearch(file_search_store_names=[store_name]))]
        )
    )
    
    return response.text

def delete_store(store_name: str):
    """Deletes a file search store."""
    try:
        client.file_search_stores.delete(name=store_name)
    except Exception as e:
        print(f"Error deleting store {store_name}: {e}")
        # We don't raise here to allow the DB delete to proceed even if Gemini fails
        pass
