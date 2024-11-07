import json
import subprocess

def print_json_posts(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            # Load the whole JSON object from the file
            data = json.load(f)
            
            # Extract and print each post from the 'posts' array
            if 'posts' in data:
                posts = data['posts']
                for post in posts:
                    post['altitude'] = 0
                    post['text'] = post['text'].replace("'", "")
                    post_json = json.dumps(post)
                    command = f"npx convex run posts:createPost '{post_json}'"
                    process = subprocess.run(command, shell=True, capture_output=True, text=True)
      
                    if process.returncode == 0:
                        print(f"Successfully created post: {post}")
                    else:
                        print(f"Error creating post: {process.stderr} {post}")
            else:
                print("No 'posts' key found in the JSON file.")
        except json.JSONDecodeError as e:
            print(f"Error parsing file: {e}")

# Example usage
file_path = 'posts.json'
print_json_posts(file_path)